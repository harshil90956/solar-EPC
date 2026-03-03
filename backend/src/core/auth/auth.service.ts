import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { User, UserDocument } from './schemas/user.schema';
import { Tenant, TenantDocument } from '../../core/tenant/schemas/tenant.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
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

    const payload = {
      sub: String(user._id),
      role: user.role,
      tenantId: user.tenantId ? String(user.tenantId) : null,
      isSuperAdmin: Boolean(user.isSuperAdmin),
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
}
