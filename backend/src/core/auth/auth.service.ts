import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Model, Types } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UpdateProfileDto } from './dto/profile.dto';
import { User, UserDocument } from './schemas/user.schema';
import { Employee, EmployeeDocument } from '../../modules/hrm/schemas/employee.schema';
import { Tenant, TenantDocument } from '../../core/tenant/schemas/tenant.schema';
import { UserOverride, UserOverrideDocument } from '../../modules/settings/schemas/user-override.schema';
import { EmailService } from '../../modules/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(UserOverride.name) private readonly userOverrideModel: Model<UserOverrideDocument>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
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
      
      const payload = {
        sub: String(employee._id),
        role: 'Employee',
        tenantId: employee.tenantId ? String(employee.tenantId) : null,
        isSuperAdmin: false,
        customRoleId: employee.roleId || null,
        dataScope: (employee as any).dataScope || 'ASSIGNED',
        permissions: rolePermissions,
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
          dataScope: (employee as any).dataScope || 'ASSIGNED',
          isEmployee: true,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeId: employee.employeeId,
        },
      };
    }

    // Handle regular user login
    // Check for custom role override
    const userOverride = await this.userOverrideModel.findOne({ userId: user!._id }).lean();
    const customRoleId = userOverride?.customRoleId || null;

    // Determine dataScope: default to 'ALL' for admins, 'ASSIGNED' for others
    const roleLower = (user!.role || '').toLowerCase();
    const isAdminLike = user!.isSuperAdmin 
      || roleLower === 'admin'
      || roleLower === 'superadmin'
      || roleLower === 'super-admin'
      || roleLower === 'super_admin';
    const dataScope = isAdminLike ? 'ALL' : 'ASSIGNED';

    const payload = {
      sub: String(user!._id),
      role: user!.role,
      tenantId: user!.tenantId ? String(user!.tenantId) : null,
      isSuperAdmin: Boolean(user!.isSuperAdmin),
      customRoleId: customRoleId,
      dataScope: dataScope,
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
        dataScope: dataScope,
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

  // Helper method to get employee role permissions
  private async getEmployeeRolePermissions(roleId?: string): Promise<string[]> {
    if (!roleId) {
      // Default permissions for all employees including technicians
      return [
        'hrm:view', 
        'employees:view', 
        'attendance:view', 
        'leaves:view',
        'payroll:view',
        // Installation module permissions for technicians
        'installation:view',
        'installation:edit',
        'installation:create',
      ];
    }
    
    // Import PermissionService dynamically to avoid circular dependency
    try {
      const { PermissionService } = require('../../modules/hrm/services/permission.service');
      // Return comprehensive permissions for employees
      return [
        'hrm:view', 
        'employees:view', 
        'attendance:view', 
        'leaves:view',
        'payroll:view',
        // Installation module permissions
        'installation:view',
        'installation:edit',
        'installation:create',
      ];
    } catch (e) {
      return [
        'hrm:view', 
        'employees:view',
        'installation:view',
        'installation:edit',
      ];
    }
  }

  async forgotPassword(email: string) {
    console.log(`[ForgotPassword] Looking for email: ${email.toLowerCase()}`);
    
    // Check both collections
    const user = await this.userModel.findOne({
      email: email.toLowerCase(),
      isActive: true,
    }).lean();

    const employee = await this.employeeModel.findOne({
      email: email.toLowerCase(),
      status: { $in: ['active', 'inactive'] },
    }).lean();

    console.log(`[ForgotPassword] User found:`, user ? 'YES' : 'NO');
    console.log(`[ForgotPassword] Employee found:`, employee ? 'YES' : 'NO');

    if (!user && !employee) {
      // For development, generate OTP anyway with a test message
      const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`[ForgotPassword] TEST OTP (user not found): ${testOtp}`);
      
      return {
        success: true,
        message: 'If an account with this email exists, you will receive an OTP.',
        debug: 'User not found in database',
        testOtp, // Remove in production
      };
    }

    // Generate single OTP for both (valid for 10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to user record if exists
    if (user) {
      await this.userModel.findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            resetPasswordOtp: otp,
            resetPasswordOtpExpires: new Date(Date.now() + 600000),
          },
        },
      );
    }

    // Save OTP to employee record if exists
    if (employee) {
      await this.employeeModel.findOneAndUpdate(
        { _id: employee._id },
        {
          $set: {
            resetPasswordOtp: otp,
            resetPasswordOtpExpires: new Date(Date.now() + 600000),
          },
        },
      );
    }

    // Get name for email
    const firstName = user?.firstName || employee?.firstName;

    // Send email with OTP
    const emailResult = await this.emailService.sendEmail(
      email.toLowerCase(),
      'Password Reset OTP - Solar OS',
      `Your password reset OTP is: ${otp}\n\nThis OTP is valid for 10 minutes and will reset password for all accounts with this email.\n\nIf you didn't request this, please ignore this email.`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #2563eb; margin-top: 0;">Password Reset OTP</h2>
            <p>Hello ${firstName || email},</p>
            <p>You requested to reset your password for your Solar OS account.</p>
            <p>Your OTP code is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 20px 40px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
                ${otp}
              </div>
            </div>
            <p style="color: #6b7280; font-size: 13px; text-align: center;">
              This OTP is valid for 10 minutes and will reset password for all accounts associated with this email.<br>
              If you didn't request a password reset, please ignore this email.
            </p>
          </div>
        </div>
      `
    );

    // Build sources list
    const sources = [];
    if (user) sources.push('user');
    if (employee) sources.push('employee');

    // Return OTP for testing (remove in production)
    return {
      success: true,
      message: emailResult.success ? 'OTP sent to your email.' : 'Email failed, but OTP provided for testing.',
      email,
      otp, // For testing only
      sources,
    };
  }

  async verifyOtp(email: string, otp: string) {
    // Check both collections
    const user = await this.userModel.findOne({
      email: email.toLowerCase(),
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: { $gt: new Date() },
      isActive: true,
    }).lean();

    const employee = await this.employeeModel.findOne({
      email: email.toLowerCase(),
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: { $gt: new Date() },
      status: { $in: ['active', 'inactive'] },
    }).lean();

    if (!user && !employee) {
      // For testing: allow any OTP if user not found (remove in production)
      console.log(`[VerifyOTP] User not found with OTP, allowing test verification`);
      const testResetToken = jwt.sign(
        { sub: 'test-user', type: 'reset', otp, email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '5m' },
      );
      return {
        success: true,
        message: 'OTP verified successfully (test mode)',
        resetToken: testResetToken,
      };
    }

    // Build list of accounts to reset
    const accounts = [];
    if (user) accounts.push({ id: String(user._id), type: 'user' });
    if (employee) accounts.push({ id: String(employee._id), type: 'employee' });

    // Generate reset token with all account info
    const resetToken = jwt.sign(
      { sub: 'multi', accounts, type: 'reset', otp, email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '5m' },
    );

    return {
      success: true,
      message: 'OTP verified successfully',
      resetToken,
      sources: accounts.map(a => a.type),
    };
  }

  async resetPassword(token: string, newPassword: string) {
    // Verify token
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (err) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (payload.type !== 'reset') {
      throw new BadRequestException('Invalid reset token');
    }

    // For test mode (sub === 'test-user'), just return success
    if (payload.sub === 'test-user') {
      console.log(`[ResetPassword] Test mode - password reset simulated`);
      return {
        success: true,
        message: 'Password has been reset successfully (test mode). Please login with your new password.',
      };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Handle multi-account reset (both user and employee)
    if (payload.sub === 'multi' && payload.accounts) {
      const accounts = payload.accounts;
      const resetSources = [];

      for (const account of accounts) {
        if (account.type === 'user') {
          await this.userModel.findOneAndUpdate(
            { _id: new Types.ObjectId(account.id) },
            {
              $set: { passwordHash },
              $unset: { resetPasswordOtp: '', resetPasswordOtpExpires: '' },
            },
          );
          resetSources.push('user');
        } else if (account.type === 'employee') {
          await this.employeeModel.findOneAndUpdate(
            { _id: new Types.ObjectId(account.id) },
            {
              $set: { password: passwordHash },
              $unset: { resetPasswordOtp: '', resetPasswordOtpExpires: '' },
            },
          );
          resetSources.push('employee');
        }
      }

      return {
        success: true,
        message: `Password has been reset successfully for: ${resetSources.join(', ')}. Please login with your new password.`,
      };
    }

    // Legacy single-account reset (backward compatibility)
    const isEmployee = payload.isEmployee;
    const userId = new Types.ObjectId(payload.sub);

    if (isEmployee) {
      await this.employeeModel.findOneAndUpdate(
        { _id: userId },
        {
          $set: { password: passwordHash },
          $unset: { resetPasswordOtp: '', resetPasswordOtpExpires: '' },
        },
      );
    } else {
      await this.userModel.findOneAndUpdate(
        { _id: userId },
        {
          $set: { passwordHash },
          $unset: { resetPasswordOtp: '', resetPasswordOtpExpires: '' },
        },
      );
    }

    return {
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
    };
  }
}
