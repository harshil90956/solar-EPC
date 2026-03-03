import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../guards/permission.guard';

/**
 * Decorator to specify required module for a route
 */
export const RequiredModule = (moduleId: string) => 
  SetMetadata('requiredModule', moduleId);

/**
 * Decorator to specify required action for a route
 */
export const RequiredAction = (actionId: string) =>
  SetMetadata('requiredAction', actionId);

/**
 * Combined decorator to require specific permission
 * Usage: @RequirePermission('crm', 'create')
 */
export const RequirePermission = (moduleId: string, actionId: string) =>
  applyDecorators(
    RequiredModule(moduleId),
    RequiredAction(actionId),
    UseGuards(PermissionGuard),
  );

/**
 * Decorator to require module access (any action)
 */
export const RequireModuleAccess = (moduleId: string) =>
  applyDecorators(
    RequiredModule(moduleId),
    RequiredAction('view'),
    UseGuards(PermissionGuard),
  );
