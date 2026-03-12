import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { DepartmentService } from '../services/department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto/department.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/departments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateDepartmentDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    const data = await this.departmentService.create(createDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    const data = await this.departmentService.findAll(tenantId, req.user);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    const data = await this.departmentService.findOne(id, tenantId, req.user);
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDepartmentDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    const data = await this.departmentService.update(id, updateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
    await this.departmentService.delete(id, tenantId, req.user);
    return { success: true, message: 'Department deleted successfully' };
  }
}
