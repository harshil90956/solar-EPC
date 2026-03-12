import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { SalaryIncrementService } from '../services/salary-increment.service';
import { CreateIncrementDto, GetIncrementQueryDto, UpdateIncrementDto } from '../dto/salary-increment.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('hrm/increments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SalaryIncrementController {
  constructor(private readonly incrementService: SalaryIncrementService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateIncrementDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.incrementService.create(createDto, tenantId, req.user);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetIncrementQueryDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.incrementService.findAll(query.employeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.incrementService.findOne(id, tenantId, req.user);
    return { success: true, data };
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.incrementService.findByEmployeeId(employeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get('history/:employeeId')
  async getIncrementHistory(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.incrementService.getIncrementHistory(employeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Get('latest-salary/:employeeId')
  async getLatestSalary(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.incrementService.getLatestSalary(employeeId, tenantId, req.user);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateIncrementDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const data = await this.incrementService.update(id, updateDto, tenantId, req.user);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    await this.incrementService.delete(id, tenantId, req.user);
    return { success: true, message: 'Salary increment deleted successfully' };
  }
}
