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
  role?: any;
  tenantId?: any;
  isSuperAdmin?: boolean;
  dataScope?: string;
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
    this.logger.debug(`JWT Validate - payload: ${JSON.stringify(payload)}`);
    
    const userId = (payload.sub || (payload as any).id) as string | undefined;
    const tenantId = payload.tenantId as string | undefined;

    const tenantObjId = (tenantId && Types.ObjectId.isValid(tenantId))
      ? new Types.ObjectId(tenantId)
      : undefined;

    // NOTE:
    // - This strategy is used across modules, including HRM employee login.
    // - HRM JWT payload contains { id, role, tenantId } (no `sub`).
    // - Core auth JWT payload contains { sub, role, tenantId }.
    // So we must be resilient and never throw here, otherwise Passport will return 401.

    let override: any = null;
    if (userId && Types.ObjectId.isValid(userId)) {
      override = await this.userOverrideModel.findOne({
        userId: new Types.ObjectId(userId),
        ...(tenantObjId ? { tenantId: tenantObjId } : {}),
      }).select('customRoleId').lean();
    }

    const roleIdRaw = payload.role;
    const roleId = typeof roleIdRaw === 'string' ? roleIdRaw : (roleIdRaw?.roleId || roleIdRaw?._id || roleIdRaw);
    const roleIdString = typeof roleId === 'string' ? roleId : (roleId ? String(roleId) : null);

    const roleLower = (roleIdString || '').toLowerCase();
    const isAdminLike = Boolean(payload.isSuperAdmin)
      || roleLower === 'admin'
      || roleLower === 'superadmin'
      || roleLower === 'super-admin'
      || roleLower === 'super_admin';

    const roleIdAsCustom = roleIdString && roleIdString.toLowerCase().startsWith('custom_') ? roleIdString : null;
    const customRoleId = (override as any)?.customRoleId || roleIdAsCustom;

    const customRole = customRoleId
      ? await this.customRoleModel.findOne({
          roleId: customRoleId,
          ...(tenantObjId ? { tenantId: tenantObjId } : {}),
        }).select('dataScope').lean()
      : null;

    // Priority for dataScope resolution:
    // 1. CustomRole from database (explicit setting)
    // 2. JWT payload dataScope
    // 3. Default: ALL for admins AND custom-role users (they see all data unless explicitly set to ASSIGNED)
    const customRoleDataScope = (customRole as any)?.dataScope;
    const payloadDataScope = payload.dataScope;
    
    this.logger.debug(`JWT DataScope Resolution - customRoleDataScope: ${customRoleDataScope}, payloadDataScope: ${payloadDataScope}, isAdminLike: ${isAdminLike}`);
    
    let effectiveDataScope: string;
    if (customRoleDataScope) {
      // Explicit customRole setting takes highest priority
      effectiveDataScope = customRoleDataScope;
      this.logger.debug(`JWT DataScope - Using customRole.dataScope: ${effectiveDataScope}`);
    } else if (payloadDataScope) {
      // JWT payload dataScope second priority
      effectiveDataScope = payloadDataScope;
      this.logger.debug(`JWT DataScope - Using payload.dataScope: ${effectiveDataScope}`);
    } else {
      // Default: ALL for admins and custom-role users; ASSIGNED only for plain non-admin base roles
      effectiveDataScope = (isAdminLike || customRoleId) ? 'ALL' : 'ASSIGNED';
      this.logger.debug(`JWT DataScope - Using default: ${effectiveDataScope}`);
    }

    this.logger.debug(`JWT Validate - userId: ${userId}, dataScope: ${effectiveDataScope}, isAdminLike: ${isAdminLike}`);
    
    const dataScope: 'ALL' | 'ASSIGNED' = effectiveDataScope === 'ALL' ? 'ALL' : 'ASSIGNED';

    // Get permissions matrix from cache service (O(1) ready)
    let permissions: Record<string, Record<string, boolean>> = {};
    if (userId && roleIdString) {
      try {
        permissions = await this.permissionCacheService.getAllPermissions(
          tenantId,
          userId,
          roleIdString,
        );
        this.logger.debug(`JWT Validate - loaded permissions matrix for user ${userId}`);
      } catch (error: any) {
        this.logger.warn(`JWT Validate - failed to load permissions for user ${userId}: ${error?.message || error}`);
        // Continue without permissions - they'll be checked on-demand
      }
    }

    return {
      ...payload,
      id: userId,
      dataScope,
      permissions, // O(1) permission matrix included
      customRoleId: customRoleId || undefined,
    };
  }
}
