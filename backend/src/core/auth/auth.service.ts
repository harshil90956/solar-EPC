import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
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
}
