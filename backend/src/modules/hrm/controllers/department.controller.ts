import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { DepartmentService } from '../services/department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto/department.dto';

@Controller('hrm/departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateDepartmentDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.departmentService.create(createDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.departmentService.findAll(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.departmentService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDepartmentDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.departmentService.update(id, updateDto, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    await this.departmentService.delete(id, tenantId);
    return { success: true, message: 'Department deleted successfully' };
  }
}
