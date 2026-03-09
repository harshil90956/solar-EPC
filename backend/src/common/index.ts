// Common Module Exports
export { CommonModule } from './common.module';
export { PermissionCacheService, PermissionMatrix, CachedPermissions } from './services/permission-cache.service';
export {
  buildVisibilityFilter,
  applyVisibilityFilter,
  buildCompleteFilter,
  canAccessRecord,
  UserWithVisibility,
} from './utils/visibility-filter';
