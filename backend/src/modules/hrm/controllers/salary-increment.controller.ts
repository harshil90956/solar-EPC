import { Controller, Get, Post, Body, Param, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { SalaryIncrementService } from '../services/salary-increment.service';
import { CreateIncrementDto, GetIncrementQueryDto } from '../dto/salary-increment.dto';

@Controller('hrm/increments')
export class SalaryIncrementController {
  constructor(private readonly incrementService: SalaryIncrementService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateIncrementDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.incrementService.create(createDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: GetIncrementQueryDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.incrementService.findAll(query.employeeId, tenantId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.incrementService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.incrementService.findByEmployeeId(employeeId, tenantId);
    return { success: true, data };
  }

  @Get('history/:employeeId')
  async getIncrementHistory(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.incrementService.getIncrementHistory(employeeId, tenantId);
    return { success: true, data };
  }

  @Get('latest-salary/:employeeId')
  async getLatestSalary(@Param('employeeId') employeeId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.incrementService.getLatestSalary(employeeId, tenantId);
    return { success: true, data };
  }
}
