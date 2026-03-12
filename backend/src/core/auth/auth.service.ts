import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { User, UserDocument } from './schemas/user.schema';
import { Tenant, TenantDocument } from '../../core/tenant/schemas/tenant.schema';
import { UserOverride, UserOverrideDocument } from '../../modules/settings/schemas/user-override.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(UserOverride.name) private readonly userOverrideModel: Model<UserOverrideDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email, isActive: true }).lean();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check for custom role override
    const userOverride = await this.userOverrideModel.findOne({ userId: user._id }).lean();
    const customRoleId = userOverride?.customRoleId || null;

    const payload = {
      sub: String(user._id),
      role: user.role,
      tenantId: user.tenantId ? String(user.tenantId) : null,
      isSuperAdmin: Boolean(user.isSuperAdmin),
      customRoleId: customRoleId, // Add custom role to JWT payload
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        tenantId: user.tenantId ? String(user.tenantId) : null,
        isSuperAdmin: Boolean(user.isSuperAdmin),
        roleId: customRoleId, // Include roleId in response for frontend
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
}
