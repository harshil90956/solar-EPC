import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CustomRole, CustomRoleDocument } from '../../../modules/settings/schemas/custom-role.schema';
import { UserOverride, UserOverrideDocument } from '../../../modules/settings/schemas/user-override.schema';
import { PermissionCacheService } from '../../../common/services/permission-cache.service';

const jwtExtractor = (logger: Logger) =>
  ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    (req: any) => {
      const token = req?.headers?.['x-access-token'];
      if (typeof token === 'string' && token.trim() !== '') return token;
      return null;
    },
    (req: any) => {
      const token = req?.cookies?.accessToken;
      if (typeof token === 'string' && token.trim() !== '') return token;
      return null;
    },
    (req: any) => {
      // Minimal diagnostics for "random 401" reports
      // Only logs when request has no recognizable token.
      const auth = req?.headers?.authorization;
      const xToken = req?.headers?.['x-access-token'];
      const cToken = req?.cookies?.accessToken;
      if (!auth && !xToken && !cToken) {
        logger.debug('JWT Extract - no token found on request (authorization/x-access-token/cookie)');
      }
      return null;
    },
  ]);

export interface JwtPayload {
  sub?: string;
  id?: string;
  email?: string;
  role?: any;
  roleId?: any;
  customRoleId?: string;
  tenantId?: any;
  isSuperAdmin?: boolean;
  dataScope?: string;
  department?: string;
  isEmployee?: boolean;
  permissions?: string[];
  modulePermissions?: any;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CustomRole.name) private readonly customRoleModel: Model<CustomRoleDocument>,
    @InjectModel(UserOverride.name) private readonly userOverrideModel: Model<UserOverrideDocument>,
    private readonly permissionCacheService: PermissionCacheService,
  ) {
    super({
      jwtFromRequest: jwtExtractor(new Logger(JwtStrategy.name)),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const userId = (payload.sub || payload.id) as string | undefined;
    const tenantId = payload.tenantId as string | undefined;

    const tenantObjId = (tenantId && Types.ObjectId.isValid(tenantId))
      ? new Types.ObjectId(tenantId)
      : undefined;

    const role = payload.role;
    const isSuperAdmin = payload.isSuperAdmin === true;
    const isAdminLike = isSuperAdmin || (typeof role === 'string' && role.toLowerCase() === 'admin');

    const roleIdRaw = payload.customRoleId ?? payload.roleId ?? payload.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw?.roleId || roleIdRaw?._id || roleIdRaw);

    // DataScope logic: Payload takes priority for JWT-based auth
    const customRoleId = payload.customRoleId || (payload as any).roleId;
    
    let effectiveDataScope: string;
    const payloadDataScope = payload.dataScope;

    if (payloadDataScope) {
      effectiveDataScope = payloadDataScope;
    } else {
      // Default: ALL for admins and custom-role users; ASSIGNED only for plain non-admin base roles
      effectiveDataScope = (isAdminLike || customRoleId) ? 'ALL' : 'ASSIGNED';
    }

    const dataScope: 'ALL' | 'ASSIGNED' = effectiveDataScope === 'ALL' ? 'ALL' : 'ASSIGNED';

    // Permissions matrix logic - silent load
    if (userId) {
      try {
        const roleIdString = roleId ? String(roleId) : (typeof role === 'string' ? role : null);
        if (roleIdString && tenantId) {
          await this.permissionCacheService.getAllPermissions(
            userId,
            roleIdString,
            tenantId
          );
        }
      } catch (error: any) {
        // Only warn on actual errors
      }
    }

    return {
      id: userId,
      _id: userId,
      sub: userId,
      email: payload.email,
      role: role,
      roleId: roleId,
      customRoleId: customRoleId,
      tenantId: tenantId,
      isSuperAdmin: isSuperAdmin,
      dataScope: dataScope,
      department: payload.department,
      isEmployee: payload.isEmployee || false,
      permissions: payload.permissions || [],
      modulePermissions: (payload as any).modulePermissions || payload.modulePermissions || {},
    };
  }
}
