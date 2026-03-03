import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LeadsService } from '../services/leads.service';
import { CreateLeadDto, UpdateLeadDto, QueryLeadDto } from '../dto/lead.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';

@Controller('leads')
// @UseGuards(JwtAuthGuard, TenantGuard) // Temporarily disabled for testing
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() createLeadDto: CreateLeadDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.create(createLeadDto, tenantId);
  }

  @Get()
  findAll(@Query() query: QueryLeadDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.findAll(query, tenantId);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.getStats(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.findOne(id, tenantId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.update(id, updateLeadDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.remove(id, tenantId);
  }

  @Post(':id/activities')
  addActivity(@Param('id') id: string, @Body() activity: any, @Request() req: any) {
    const tenantId = req.tenant?.id;
    return this.leadsService.addActivity(id, activity, tenantId);
  }
}
