import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../settings/guards/permission.guard';
import { RequirePermission } from '../../settings/decorators/permissions.decorator';
import { CustomersService } from '../services/customers.service';
import { QueryCustomersDto } from '../dto/customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermission('crm', 'view')
  async findAll(@Query() query: QueryCustomersDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.customersService.findAll(query, tenantId, user);
  }

  @Get(':id')
  @RequirePermission('crm', 'view')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    const user = req.user;
    return this.customersService.findOne(id, tenantId, user);
  }
}
