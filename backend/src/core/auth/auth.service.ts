import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UpdateProfileDto } from './dto/profile.dto';
import { User, UserDocument } from './schemas/user.schema';
import { Employee, EmployeeDocument } from '../../modules/hrm/schemas/employee.schema';
import { Tenant, TenantDocument } from '../../core/tenant/schemas/tenant.schema';
import { UserOverride, UserOverrideDocument } from '../../modules/settings/schemas/user-override.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(UserOverride.name) private readonly userOverrideModel: Model<UserOverrideDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    console.log('[DEBUG AUTH] Login attempt for email:', email);
    
    // First try to find user in users collection (admins, superadmins)
    let user = await this.userModel.findOne({ email, isActive: true }).lean();
    console.log('[DEBUG AUTH] User found in users collection:', user ? 'YES' : 'NO');
    
    let isEmployee = false;
    let employee = null;

    // If not found in users, try employees collection
    if (!user) {
      console.log('[DEBUG AUTH] Checking employees collection...');
      employee = await this.employeeModel.findOne({ 
        email, 
        status: { $in: ['active', 'inactive'] } // not terminated/suspended
      }).lean();
      
      console.log('[DEBUG AUTH] Employee found:', employee ? 'YES' : 'NO');
      if (employee) {
        console.log('[DEBUG AUTH] Employee status:', employee.status);
        console.log('[DEBUG AUTH] Employee has password:', employee.password ? 'YES' : 'NO');
        isEmployee = true;
      }
    }

    // If neither user nor employee found
    if (!user && !employee) {
      console.log('[DEBUG AUTH] Neither user nor employee found');
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    let passwordValid = false;
    if (user) {
      console.log('[DEBUG AUTH] Verifying user password...');
      passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
      console.log('[DEBUG AUTH] User password valid:', passwordValid);
    } else if (employee) {
      console.log('[DEBUG AUTH] Verifying employee password...');
      console.log('[DEBUG AUTH] Employee password starts with $2:', employee.password?.startsWith('$2'));
      
      // Handle both bcrypt hashed and plaintext passwords
      if (employee.password?.startsWith('$2')) {
        // Password is bcrypt hashed
        passwordValid = await bcrypt.compare(dto.password, employee.password);
      } else {
        // Password might be plaintext or using different hashing
        passwordValid = dto.password === employee.password;
        console.log('[DEBUG AUTH] Plaintext password comparison');
      }
      
      console.log('[DEBUG AUTH] Employee password valid:', passwordValid);
    }

    if (!passwordValid) {
      console.log('[DEBUG AUTH] Password validation failed');
      throw new UnauthorizedException('Invalid email or password');
    }

    // Handle employee login
    if (isEmployee && employee) {
      // Get employee permissions from role
      const rolePermissions = await this.getEmployeeRolePermissions(employee.roleId);
      
      // Build dataScope object for all modules
      const dataScopeObj: Record<string, string> = {};
      const modules = ['employees', 'attendance', 'leaves', 'payroll', 'increments', 'departments'];
      for (const m of modules) {
        dataScopeObj[m] = 'OWN'; // Default to OWN for employees
      }
      
      const payload = {
        sub: String(employee._id),
        role: 'Employee',
        tenantId: employee.tenantId ? String(employee.tenantId) : null,
        isSuperAdmin: false,
        customRoleId: employee.roleId || null,
        permissions: rolePermissions,
        dataScope: dataScopeObj,
        isEmployee: true,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      return {
        accessToken,
        user: {
          id: String(employee._id),
          email: employee.email,
          role: 'Employee',
          tenantId: employee.tenantId ? String(employee.tenantId) : null,
          isSuperAdmin: false,
          roleId: employee.roleId || null,
          permissions: rolePermissions,
          dataScope: dataScopeObj,
          isEmployee: true,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId,
        },
      };
    }

    // Handle regular user login
    // Check for custom role override
    console.log('[AUTH DEBUG] ==========================================');
    console.log('[AUTH DEBUG] LOGIN START - User:', user!._id.toString(), 'Role:', user!.role);
    console.log('[AUTH DEBUG] ==========================================');
    const userOverride = await this.userOverrideModel.findOne({ userId: user!._id }).lean();
    console.log('[AUTH DEBUG] User override found:', userOverride ? 'YES' : 'NO');
    if (userOverride) {
      console.log('[AUTH DEBUG] User override details:', JSON.stringify(userOverride, null, 2));
    }
    const customRoleId = userOverride?.customRoleId || null;
    console.log('[AUTH DEBUG] Extracted customRoleId:', customRoleId);

    // Determine dataScope: default to 'ALL' for admins, 'ASSIGNED' for others
    const roleLower = (user!.role || '').toLowerCase();
    const isAdminLike = user!.isSuperAdmin 
      || roleLower === 'admin'
      || roleLower === 'superadmin'
      || roleLower === 'super-admin'
      || roleLower === 'super_admin';
    console.log('[AUTH DEBUG] isAdminLike:', isAdminLike, '(role:', user!.role, ', isSuperAdmin:', user!.isSuperAdmin, ')');
    const globalDataScope = isAdminLike ? 'ALL' : 'ASSIGNED';
    
    // Build permissions and dataScope objects
    const userPermissions: Record<string, Record<string, boolean>> = {};
    const dataScopeObj: Record<string, string> = {};
    
    // Get all available modules
    const allModules = ['dashboard', 'crm', 'survey', 'design', 'documents', 'procurement', 'inventory', 'project', 'logistics', 'installation', 'commissioning', 'finance', 'service', 'compliance', 'admin', 'settings', 'hrm', 'employees', 'attendance', 'leaves', 'payroll', 'increments', 'departments'];
    
    console.log('[AUTH DEBUG] Building base permissions...');
    
    for (const module of allModules) {
      // Default: admins get full access, others get minimal
      const isHrmModule = ['employees', 'attendance', 'leaves', 'payroll', 'increments', 'departments'].includes(module);
      if (isHrmModule) {
        // For HRM modules: if admin without custom role → full access, otherwise use role-based
        if (isAdminLike && !customRoleId) {
          userPermissions[module] = { view: true, create: true, edit: true, delete: true };
          console.log('[AUTH DEBUG] HRM Module', module, '-> FULL ACCESS (admin without custom role)');
        } else {
          userPermissions[module] = { view: false, create: false, edit: false, delete: false };
          console.log('[AUTH DEBUG] HRM Module', module, '-> NO ACCESS (has custom role or not admin)');
        }
        dataScopeObj[module] = isAdminLike ? 'ALL' : 'OWN';
      } else {
        // For other modules, base role permissions
        const basePerms = this.getBaseRolePermissions(user!.role, module);
        userPermissions[module] = basePerms;
        dataScopeObj[module] = isAdminLike ? 'ALL' : 'ASSIGNED';
      }
    }
    
    console.log('[AUTH DEBUG] Base permissions built:', JSON.stringify(userPermissions, null, 2));
    
    // Override HRM permissions with actual role permissions if roleId exists
    if (customRoleId) {
      try {
        const { PermissionService } = require('../../modules/hrm/services/permission.service');
        const permService = new PermissionService();
        const hrmModulePerms = await permService.getAllRoleModulePermissions(customRoleId);
        
        console.log('[AUTH DEBUG] Custom roleId:', customRoleId, 'Found permissions:', hrmModulePerms.length);
        
        for (const modPerm of hrmModulePerms) {
          const module = modPerm.module;
          if (!userPermissions[module]) userPermissions[module] = {};
          const actions = modPerm.actions || {};
          console.log('[AUTH DEBUG] Applying permissions for module:', module, 'actions:', actions);
          for (const [action, val] of Object.entries(actions)) {
            userPermissions[module][action] = val === true;
          }
          dataScopeObj[module] = modPerm.dataScope || 'OWN';
        }
        
        console.log('[AUTH DEBUG] Final userPermissions:', JSON.stringify(userPermissions, null, 2));
      } catch (e) {
        console.error('[AUTH DEBUG] Error fetching custom role permissions:', e);
        // Use defaults if HRM service fails
      }
    } else {
      console.log('[AUTH DEBUG] No customRoleId found for user');
    }

    const payload = {
      sub: String(user!._id),
      role: user!.role,
      tenantId: user!.tenantId ? String(user!.tenantId) : null,
      isSuperAdmin: Boolean(user!.isSuperAdmin),
      customRoleId: customRoleId,
      permissions: userPermissions,
      dataScope: dataScopeObj,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: String(user!._id),
        email: user!.email,
        role: user!.role,
        tenantId: user!.tenantId ? String(user!.tenantId) : null,
        isSuperAdmin: Boolean(user!.isSuperAdmin),
        roleId: customRoleId,
        permissions: userPermissions,
        dataScope: dataScopeObj,
      },
    };
  }

  async getUsersByTenantAndRole(tenantCode: string, role?: string) {
    const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }
    const tenantId = tenant._id.toString();

    const query: any = { tenantId, isActive: true };
    if (role) {
      query.role = role;
    }

    const users = await this.userModel.find(query).lean();
    return users.map(u => ({
      id: String(u._id),
      name: u.email.split('@')[0],
      email: u.email,
      role: u.role,
    }));
  }

  async createUser(tenantCode: string, createUserDto: CreateUserDto) {
    let tenantId: string;
    
    if (createUserDto.tenantId) {
      tenantId = createUserDto.tenantId;
    } else {
      const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
      if (!tenant) {
        // Fallback: check slug if code doesn't exist
        const tenantBySlug = await this.tenantModel.findOne({ slug: tenantCode }).lean();
        if (!tenantBySlug) {
          throw new NotFoundException(`Tenant ${tenantCode} not found`);
        }
        tenantId = tenantBySlug._id.toString();
      } else {
        tenantId = tenant._id.toString();
      }
    }

    const existingUser = await this.userModel.findOne({
      email: createUserDto.email.toLowerCase(),
      tenantId: new Types.ObjectId(tenantId),
    }).lean();

    if (existingUser) {
      throw new BadRequestException('User with this email already exists in this tenant');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = new this.userModel({
      email: createUserDto.email.toLowerCase(),
      passwordHash,
      role: createUserDto.role,
      tenantId: new Types.ObjectId(tenantId),
      isSuperAdmin: createUserDto.isSuperAdmin || false,
      isActive: true,
    });

    const savedUser = await user.save();
    return {
      id: String(savedUser._id),
      email: savedUser.email,
      role: savedUser.role,
      isActive: savedUser.isActive,
      isSuperAdmin: savedUser.isSuperAdmin,
    };
  }

  async findOne(tenantCode: string, userId: string) {
    const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }

    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      tenantId: tenant._id,
    }).lean();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      id: String(user._id),
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  async updateUser(tenantCode: string, userId: string, updateUserDto: UpdateUserDto) {
    const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }

    const updateData: any = {};
    if (updateUserDto.email) updateData.email = updateUserDto.email.toLowerCase();
    if (updateUserDto.role) updateData.role = updateUserDto.role;
    if (updateUserDto.isActive !== undefined) updateData.isActive = updateUserDto.isActive;
    if (updateUserDto.isSuperAdmin !== undefined) updateData.isSuperAdmin = updateUserDto.isSuperAdmin;
    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId), tenantId: tenant._id },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      id: String(user._id),
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  async deleteUser(tenantCode: string, userId: string) {
    const tenant = await this.tenantModel.findOne({ code: tenantCode }).lean();
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }

    const user = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId), tenantId: tenant._id },
      { $set: { isActive: false } },
      { new: true },
    ).lean();

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return { message: `User ${userId} deleted successfully` };
  }

  // Profile methods
  async getProfile(userId: string) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      isActive: true,
    }).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: String(user._id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.firstName || user.lastName
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : undefined,
      profileImage: user.profileImage,
      phone: user.phone,
      role: user.role,
      tenantId: user.tenantId ? String(user.tenantId) : undefined,
      isSuperAdmin: user.isSuperAdmin,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      isActive: true,
    }).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: any = {};

    // Update profile fields
    if (updateProfileDto.firstName !== undefined) updateData.firstName = updateProfileDto.firstName;
    if (updateProfileDto.lastName !== undefined) updateData.lastName = updateProfileDto.lastName;
    if (updateProfileDto.phone !== undefined) updateData.phone = updateProfileDto.phone;

    // Update email if provided and different
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      // Check if email already exists
      const existingUser = await this.userModel.findOne({
        email: updateProfileDto.email.toLowerCase(),
        _id: { $ne: new Types.ObjectId(userId) },
      }).lean();

      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }

      updateData.email = updateProfileDto.email.toLowerCase();
    }

    // Update password if provided
    if (updateProfileDto.newPassword) {
      if (!updateProfileDto.currentPassword) {
        throw new BadRequestException('Current password is required to change password');
      }

      // Verify current password
      const passwordValid = await bcrypt.compare(updateProfileDto.currentPassword, user.passwordHash);
      if (!passwordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      updateData.passwordHash = await bcrypt.hash(updateProfileDto.newPassword, 10);
    }

    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId) },
      { $set: updateData },
      { new: true },
    ).lean();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      id: String(updatedUser._id),
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      fullName: updatedUser.firstName || updatedUser.lastName
        ? `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim()
        : undefined,
      profileImage: updatedUser.profileImage,
      phone: updatedUser.phone,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId ? String(updatedUser.tenantId) : undefined,
      isSuperAdmin: updatedUser.isSuperAdmin,
    };
  }

  async updateProfileImage(userId: string, imageUrl: string | null) {
    const user = await this.userModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId) },
      { $set: { profileImage: imageUrl } },
      { new: true },
    ).lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: String(user._id),
      profileImage: user.profileImage,
    };
  }

  // Helper method to get employee role permissions - returns OBJECT format
  private async getEmployeeRolePermissions(roleId?: string): Promise<Record<string, Record<string, boolean>>> {
    const permissions: Record<string, Record<string, boolean>> = {};
    
    // Default modules structure
    const modules = ['employees', 'attendance', 'leaves', 'payroll', 'increments', 'departments'];
    modules.forEach(m => {
      permissions[m] = { view: false, create: false, edit: false, delete: false };
    });
    
    if (!roleId) {
      // Default for employees without role - minimal access
      permissions.employees.view = true;
      permissions.attendance.view = true;
      permissions.attendance.checkin = true;
      permissions.attendance.checkout = true;
      permissions.leaves.view = true;
      permissions.leaves.apply = true;
      permissions.payroll.view = true;
      return permissions;
    }
    
    // Import PermissionService to get actual permissions
    try {
      const { PermissionService } = require('../../modules/hrm/services/permission.service');
      const permService = new PermissionService();
      
      // Get module permissions for this role
      const modulePerms = await permService.getAllRoleModulePermissions(roleId);
      
      for (const modPerm of modulePerms) {
        const module = modPerm.module;
        if (!permissions[module]) {
          permissions[module] = {};
        }
        // Convert actions object to boolean map
        const actions = modPerm.actions || {};
        for (const [action, val] of Object.entries(actions)) {
          permissions[module][action] = val === true;
        }
      }
      
      return permissions;
    } catch (e) {
      // Fallback to basic permissions if service fails
      permissions.employees.view = true;
      permissions.attendance.view = true;
      permissions.attendance.checkin = true;
      permissions.attendance.checkout = true;
      permissions.leaves.view = true;
      permissions.leaves.apply = true;
      return permissions;
    }
  }

  // Get base role permissions for non-HRM modules
  private getBaseRolePermissions(role: string, module: string): Record<string, boolean> {
    const roleLower = (role || '').toLowerCase();
    const isAdmin = roleLower === 'admin' || roleLower === 'superadmin' || roleLower === 'super admin';
    
    // Default permissions object
    const defaultPerms = { view: false, create: false, edit: false, delete: false };
    
    // Admin gets all permissions
    if (isAdmin) {
      return { view: true, create: true, edit: true, delete: true };
    }
    
    // Define module access by role
    const roleModuleMap: Record<string, string[]> = {
      'admin': ['dashboard', 'crm', 'survey', 'design', 'documents', 'procurement', 'inventory', 'project', 'logistics', 'installation', 'commissioning', 'finance', 'service', 'compliance', 'admin', 'settings', 'hrm'],
      'manager': ['dashboard', 'crm', 'survey', 'design', 'procurement', 'inventory', 'project', 'logistics', 'installation', 'finance', 'service', 'hrm'],
      'sales': ['dashboard', 'crm', 'quotations', 'leads'],
      'technician': ['dashboard', 'installation', 'service'],
      'hr': ['dashboard', 'hrm', 'employees', 'attendance', 'leaves'],
      'employee': ['dashboard', 'hrm'],
    };
    
    // Check if role has access to this module
    const roleModules = roleModuleMap[roleLower] || roleModuleMap['employee'];
    const hasAccess = roleModules.includes(module);
    
    if (!hasAccess) {
      return defaultPerms;
    }
    
    // Non-admin roles with access get view + limited create/edit
    return {
      view: true,
      create: roleLower !== 'employee',
      edit: roleLower !== 'employee',
      delete: roleLower === 'manager' || roleLower === 'admin',
    };
  }

<<<<<<< HEAD
  // In-memory OTP store (use Redis in production)
  // Added attempts tracking for security (max 3 attempts)
  private otpStore: Map<string, { 
    otp: string; 
    expiresAt: Date; 
    userType: 'user' | 'employee';
    attempts: number;
    maxAttempts: number;
  }> = new Map();

  // Generate 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP email (mock - replace with actual email service)
  private async sendOtpEmail(email: string, otp: string, name?: string): Promise<void> {
    // TODO: Integrate with your email service (SendGrid, AWS SES, Nodemailer, etc.)
    console.log(`[OTP EMAIL] To: ${email}, OTP: ${otp}, Name: ${name || 'User'}`);
    
    // Example integration placeholder:
    // await this.emailService.send({
    //   to: email,
    //   subject: 'Password Reset OTP - Solar OS',
    //   template: 'otp-reset',
    //   data: { otp, name, expiresIn: '5 minutes' }
    // });
  }

  // Forgot Password - Send OTP
  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check in users collection first
    let user = await this.userModel.findOne({ email: normalizedEmail, isActive: true }).lean();
    let employee = null;
    let userType: 'user' | 'employee' = 'user';
    let name = '';

    // If not found in users, check employees
    if (!user) {
      employee = await this.employeeModel.findOne({ 
        email: normalizedEmail,
        status: { $in: ['active', 'inactive'] }
      }).lean();
      
      if (employee) {
        userType = 'employee';
        name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
      }
    } else {
      name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }

    // If neither found
    if (!user && !employee) {
      // Don't reveal if email exists (security best practice)
      // But for UX, we'll return success even if email not found
      // This prevents email enumeration attacks
      return {
        success: true,
        message: 'If an account exists with this email, an OTP has been sent.',
        email: normalizedEmail,
      };
    }

    // Generate OTP
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Store OTP with attempts tracking (max 3 attempts)
    this.otpStore.set(normalizedEmail, { 
      otp, 
      expiresAt, 
      userType,
      attempts: 0,
      maxAttempts: 3
    });

    // Send email
    await this.sendOtpEmail(normalizedEmail, otp, name);

    return {
      success: true,
      message: 'OTP sent successfully to your email',
      email: normalizedEmail,
      expiresIn: '5 minutes',
      // NEVER expose OTP in production - only in development for testing
      ...(process.env.NODE_ENV === 'development' && { otp }),
    };
  }

  // Verify OTP
  async verifyOtp(email: string, otp: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const stored = this.otpStore.get(normalizedEmail);

    if (!stored) {
      throw new BadRequestException('OTP not found or expired. Please request a new one.');
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(normalizedEmail);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Check max attempts (3 attempts allowed)
    if (stored.attempts >= stored.maxAttempts) {
      this.otpStore.delete(normalizedEmail);
      throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    if (stored.otp !== otp) {
      // Increment failed attempts
      stored.attempts++;
      const remainingAttempts = stored.maxAttempts - stored.attempts;
      
      if (stored.attempts >= stored.maxAttempts) {
        this.otpStore.delete(normalizedEmail);
        throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new OTP.');
      }
      
      throw new BadRequestException(`Invalid OTP. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`);
    }

    // OTP verified - don't delete yet, wait for password reset
    return {
      success: true,
      message: 'OTP verified successfully',
      email: normalizedEmail,
      verified: true,
    };
  }

  // Reset Password
  async resetPassword(email: string, otp: string, newPassword: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const stored = this.otpStore.get(normalizedEmail);

    if (!stored) {
      throw new BadRequestException('OTP not found or expired. Please request a new one.');
    }

    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(normalizedEmail);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Check max attempts (3 attempts allowed)
    if (stored.attempts >= stored.maxAttempts) {
      this.otpStore.delete(normalizedEmail);
      throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    if (stored.otp !== otp) {
      // Increment failed attempts
      stored.attempts++;
      const remainingAttempts = stored.maxAttempts - stored.attempts;
      
      if (stored.attempts >= stored.maxAttempts) {
        this.otpStore.delete(normalizedEmail);
        throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new OTP.');
      }
      
      throw new BadRequestException(`Invalid OTP. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`);
    }

    // Validate password
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password based on user type
    if (stored.userType === 'user') {
      const user = await this.userModel.findOneAndUpdate(
        { email: normalizedEmail, isActive: true },
        { $set: { passwordHash } },
        { new: true }
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }
    } else {
      const employee = await this.employeeModel.findOneAndUpdate(
        { email: normalizedEmail, status: { $in: ['active', 'inactive'] } },
        { $set: { password: passwordHash } },
        { new: true }
      );

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
    }

    // Clear OTP after successful reset
    this.otpStore.delete(normalizedEmail);

    return {
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    };
  }

  // Find user by email (for OTP service)
  async findUserByEmail(email: string): Promise<{ userType: 'user' | 'employee'; name: string } | null> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check users collection first
    const user = await this.userModel.findOne({ 
      email: normalizedEmail, 
      isActive: true 
    }).lean();

    if (user) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0];
      return { userType: 'user', name };
    }

    // Check employees collection
=======
  // Find user by email (used for password reset)
  async findUserByEmail(email: string): Promise<{ userType: 'user' | 'employee'; name: string } | null> {
    const normalizedEmail = email.toLowerCase().trim();
    
    // First check users collection
    const user = await this.userModel.findOne({ email: normalizedEmail, isActive: true }).lean();
    if (user) {
      return {
        userType: 'user',
        name: user.firstName || user.email.split('@')[0],
      };
    }
    
    // Then check employees collection
>>>>>>> 729537b (fixed)
    const employee = await this.employeeModel.findOne({ 
      email: normalizedEmail,
      status: { $in: ['active', 'inactive'] }
    }).lean();
<<<<<<< HEAD

    if (employee) {
      const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email.split('@')[0];
      return { userType: 'employee', name };
    }

    return null;
  }

  // Reset password by email (used after OTP verification)
  async resetPasswordByEmail(
    email: string, 
    newPassword: string,
    userType: 'user' | 'employee'
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (userType === 'user') {
      const user = await this.userModel.findOneAndUpdate(
=======
    if (employee) {
      return {
        userType: 'employee',
        name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email.split('@')[0],
      };
    }
    
    return null;
  }

  // Reset password by email
  async resetPasswordByEmail(email: string, newPassword: string, userType: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    if (userType === 'employee') {
      // Update employee password
      const result = await this.employeeModel.findOneAndUpdate(
        { email: normalizedEmail },
        { $set: { password: passwordHash } },
        { new: true }
      );
      if (!result) {
        throw new NotFoundException('Employee not found');
      }
    } else {
      // Update user password
      const result = await this.userModel.findOneAndUpdate(
>>>>>>> 729537b (fixed)
        { email: normalizedEmail, isActive: true },
        { $set: { passwordHash } },
        { new: true }
      );
<<<<<<< HEAD

      if (!user) {
        throw new NotFoundException('User not found');
      }
    } else {
      const employee = await this.employeeModel.findOneAndUpdate(
        { email: normalizedEmail, status: { $in: ['active', 'inactive'] } },
        { $set: { password: passwordHash } },
        { new: true }
      );

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
=======
      if (!result) {
        throw new NotFoundException('User not found');
      }
>>>>>>> 729537b (fixed)
    }
  }
}
