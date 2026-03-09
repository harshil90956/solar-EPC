import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PermissionCacheService } from './services/permission-cache.service';
import { RBACConfig, RBACConfigSchema } from '../modules/settings/schemas/rbac-config.schema';
import { CustomRole, CustomRoleSchema } from '../modules/settings/schemas/custom-role.schema';
import { UserOverride, UserOverrideSchema } from '../modules/settings/schemas/user-override.schema';
import { FeatureFlag, FeatureFlagSchema } from '../modules/settings/schemas/feature-flag.schema';

/**
 * CommonModule
 * 
 * Provides shared services and utilities used across the application.
 * - PermissionCacheService: O(1) permission checks with caching
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RBACConfig.name, schema: RBACConfigSchema },
      { name: CustomRole.name, schema: CustomRoleSchema },
      { name: UserOverride.name, schema: UserOverrideSchema },
      { name: FeatureFlag.name, schema: FeatureFlagSchema },
    ]),
  ],
  providers: [PermissionCacheService],
  exports: [PermissionCacheService],
})
export class CommonModule {}
