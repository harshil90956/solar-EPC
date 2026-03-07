import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

export interface RequiredPermission {
  moduleId: string;
  actionId: string;
}

/**
 * Decorator to specify required permission for a route handler
 * @param moduleId - The module identifier (e.g., 'leads', 'projects', 'tickets')
 * @param actionId - The action identifier (e.g., 'view', 'create', 'edit', 'delete')
 */
export const RequirePermission = (moduleId: string, actionId: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, { moduleId, actionId });
