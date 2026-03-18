import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../../core/auth/guards/admin.guard';
import { Permission } from '../schemas/permission.schema';
import { Role } from '../schemas/role.schema';
import { PermissionCacheService } from '../../../common/services/permission-cache.service';
import { PermissionEngineService } from '../../../common/services/permission-engine.service';

@Controller('hrm/permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly permissionCacheService: PermissionCacheService,
    private readonly permissionEngine: PermissionEngineService,
  ) {}

  @Get()
  @UseGuards(AdminGuard)
  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionService.findAllPermissions();
  }

  @Get('roles')
  async getAllRoles(): Promise<Role[]> {
    return this.permissionService.findAllRoles();
  }

  @Get('roles/:id')
  async getRoleById(@Param('id') id: string): Promise<Role | null> {
    return this.permissionService.findRoleById(id);
  }

  @Post('roles')
  @UseGuards(AdminGuard)
  async createRole(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('permissions') permissions: string[],
  ): Promise<Role> {
    return this.permissionService.createRole(name, description, permissions);
  }

  @Patch('roles/:id')
  @UseGuards(AdminGuard)
  async updateRole(
    @Param('id') id: string,
    @Body() updates: Partial<Role>,
    @Body('permissions') permissions?: string[],
  ): Promise<Role | null> {
    return this.permissionService.updateRole(id, updates, permissions);
  }

  @Delete('roles/:id')
  @UseGuards(AdminGuard)
  async deleteRole(@Param('id') id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await this.permissionService.deleteRole(id);
      return { success: result };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  @Get('roles/:id/permissions')
  async getRolePermissions(@Param('id') id: string): Promise<string[]> {
    return this.permissionService.getRolePermissions(id);
  }

  // Get role by name (for frontend lookups by role name like "Employee")
  @Get('role/:name')
  async getRoleByName(@Param('name') name: string): Promise<Role | null> {
    return this.permissionService.findRoleByName(name);
  }

  // ==================== COLUMN PERMISSION ENDPOINTS ====================

  @Get('modules/columns')
  async getAllModulesWithColumns(): Promise<Record<string, string[]>> {
    return this.permissionService.getAllModulesWithColumns();
  }

  @Get('modules/:module/columns')
  async getModuleColumns(@Param('module') module: string): Promise<string[]> {
    return this.permissionService.getModuleColumns(module);
  }

  @Get('roles/:id/column-permissions')
  async getRoleColumnPermissions(
    @Param('id') roleId: string,
    @Query('module') module?: string,
  ): Promise<any> {
    const permissions = await this.permissionService.getRoleColumnPermissions(roleId, module);
    return {
      roleId,
      module: module || 'all',
      columns: permissions.reduce((acc, perm) => {
        if (!acc[perm.module]) {
          acc[perm.module] = {};
        }
        acc[perm.module][perm.columnName] = perm.isVisible;
        return acc;
      }, {} as Record<string, Record<string, boolean>>),
    };
  }

  @Post('roles/:id/column-permissions')
  async updateColumnPermission(
    @Param('id') roleId: string,
    @Body('module') module: string,
    @Body('columnName') columnName: string,
    @Body('isVisible') isVisible: boolean,
  ): Promise<any> {
    const result = await this.permissionService.updateColumnPermission(roleId, module, columnName, isVisible);
    return {
      success: true,
      data: result,
    };
  }

  @Post('roles/:id/column-permissions/bulk')
  async updateMultipleColumnPermissions(
    @Param('id') roleId: string,
    @Body('module') module: string,
    @Body('columns') columns: Record<string, boolean>,
  ): Promise<any> {
    const results = await this.permissionService.updateMultipleColumnPermissions(roleId, module, columns);
    return {
      success: true,
      data: results,
    };
  }

  @Get('roles/:id/column-permissions/map')
  async getRoleColumnPermissionsMap(@Param('id') roleId: string): Promise<any> {
    const columns = await this.permissionService.getRoleColumnPermissionsMap(roleId);
    return {
      roleId,
      columns,
    };
  }

  @Post('roles/:targetId/column-permissions/copy')
  async copyColumnPermissions(
    @Param('targetId') targetRoleId: string,
    @Body('sourceRoleId') sourceRoleId: string,
  ): Promise<any> {
    await this.permissionService.copyColumnPermissions(sourceRoleId, targetRoleId);
    return {
      success: true,
      message: `Column permissions copied from ${sourceRoleId} to ${targetRoleId}`,
    };
  }

  // ==================== MODULE PERMISSIONS WITH DATA SCOPE ====================

  @Get('roles/:id/module-permissions')
  async getRoleModulePermissions(@Param('id') roleId: string, @Request() req: any, @Query('tenantId') tenantId?: string): Promise<any> {
    const tid = tenantId || req?.tenant?.id;
    const permissions = await this.permissionService.getAllRoleModulePermissions(roleId, tid);
    return {
      roleId,
      permissions: permissions.reduce((acc: Record<string, any>, perm) => {
        acc[perm.module] = {
          actions: perm.actions,
          dataScope: perm.dataScope,
        };
        return acc;
      }, {}),
    };
  }

  @Get('roles/:id/module-permissions/:module')
  async getRoleModulePermission(
    @Param('id') roleId: string,
    @Param('module') module: string,
    @Request() req: any,
    @Query('tenantId') tenantId?: string,
  ): Promise<any> {
    const tid = tenantId || req?.tenant?.id;
    const permission = await this.permissionService.getRoleModulePermission(roleId, module, tid);
    if (!permission) {
      return {
        roleId,
        module,
        actions: {
          view: false, create: false, edit: false, delete: false,
          export: false, assign: false, approve: false, reject: false,
          checkin: false, checkout: false, apply: false, generate: false,
        },
        dataScope: 'own',
      };
    }
    return {
      roleId,
      module,
      actions: permission.actions,
      dataScope: permission.dataScope,
    };
  }

  @Post('roles/:id/module-permissions/:module')
  async setRoleModulePermission(
    @Param('id') roleId: string,
    @Param('module') module: string,
    @Body() body: { actions: any; dataScope: string },
    @Request() req: any,
    @Query('tenantId') tenantId?: string,
  ): Promise<any> {
    const tid = tenantId || req?.tenant?.id;
    const permission = await this.permissionService.setRoleModulePermission(
      roleId,
      module,
      body.actions,
      body.dataScope as any,
      tid,
    );
    
    // Invalidate cache for this role to ensure fresh permissions
    this.permissionCacheService.invalidateRoleCache(roleId, tid);

    if (tid) {
      await this.permissionEngine.invalidateTenantPermissions(String(tid));
    }
    
    return {
      success: true,
      data: permission,
    };
  }

  @Post('roles/:id/module-permissions/bulk')
  async setBulkRoleModulePermissions(
    @Param('id') roleId: string,
    @Body() body: { permissions: Record<string, { actions: any; dataScope: string }> },
    @Request() req: any,
    @Query('tenantId') tenantId?: string,
  ): Promise<any> {
    const tid = tenantId || req?.tenant?.id;
    const results = [];
    for (const [module, config] of Object.entries(body.permissions)) {
      const permission = await this.permissionService.setRoleModulePermission(
        roleId,
        module,
        config.actions,
        config.dataScope as any,
        tid,
      );
      results.push(permission);
    }
    
    // Invalidate cache after bulk update
    this.permissionCacheService.invalidateRoleCache(roleId, tid);

    if (tid) {
      await this.permissionEngine.invalidateTenantPermissions(String(tid));
    }
    
    return {
      success: true,
      data: results,
    };
  }

  @Post('seed-module-permissions')
  async seedModulePermissions(@Query('tenantId') tenantId?: string): Promise<any> {
    await this.permissionService.seedDefaultModulePermissions(tenantId);
    return {
      success: true,
      message: 'Module permissions seeded successfully',
    };
  }

  // ==================== CACHE MANAGEMENT ====================

  @Get('cache/clear')
   @UseGuards(AdminGuard)
  async clearPermissionCache(
    @Query('userId') userId?: string,
    @Query('roleId') roleId?: string,
  ): Promise<any> {
    if (userId) {
      this.permissionCacheService.invalidateUserCache(userId);
      return {
        success: true,
        message: `Cache cleared for user ${userId}`,
      };
    }
    
    if (roleId) {
      this.permissionCacheService.invalidateRoleCache(roleId);
      return {
        success: true,
        message: `Cache cleared for role ${roleId}`,
      };
    }
    
    // Clear all cache
    this.permissionCacheService.clearCache();
    return {
      success: true,
      message: 'All permission cache cleared',
    };
  }
}
