import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { Permission } from '../schemas/permission.schema';
import { Role } from '../schemas/role.schema';

@Controller('hrm/permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
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
  async createRole(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('permissions') permissions: string[],
  ): Promise<Role> {
    return this.permissionService.createRole(name, description, permissions);
  }

  @Patch('roles/:id')
  async updateRole(
    @Param('id') id: string,
    @Body() updates: Partial<Role>,
    @Body('permissions') permissions?: string[],
  ): Promise<Role | null> {
    return this.permissionService.updateRole(id, updates, permissions);
  }

  @Delete('roles/:id')
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
}
