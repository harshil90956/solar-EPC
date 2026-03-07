import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from '../services/tickets.service';
import { AmcContractsService } from '../services/amc-contracts.service';
import { VisitsService } from '../services/visits.service';
import { CreateTicketDto, UpdateTicketDto, QueryTicketDto } from '../dto/ticket.dto';
import { CreateAmcContractDto, UpdateAmcContractDto, QueryAmcContractDto } from '../dto/amc-contract.dto';
import { CreateVisitDto, UpdateVisitDto, QueryVisitDto } from '../dto/visit.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionGuard } from '../../../modules/settings/guards/permission.guard';
import { RequirePermission } from '../../../modules/settings/decorators/permissions.decorator';

@Controller('service-amc')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
export class ServiceAmcController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly amcContractsService: AmcContractsService,
    private readonly visitsService: VisitsService,
  ) {}

  // ============ TICKETS ============

  @Get('tickets')
  @RequirePermission('tickets', 'view')
  findAllTickets(@Query() query: QueryTicketDto, @Request() req: any) {
    try {
      const user = req?.user;
      return this.ticketsService.findAll(query, undefined, user);
    } catch (error: any) {
      console.error('Error finding all tickets:', error.message, error.stack);
      throw error;
    }
  }

  @Get('tickets/stats')
  getTicketStats(@Request() req: any) {
    try {
      const user = req?.user;
      return this.ticketsService.getStats(undefined, user);
    } catch (error: any) {
      console.error('Error getting ticket stats:', error.message, error.stack);
      throw error;
    }
  }

  @Get('tickets/:id')
  findOneTicket(@Param('id') id: string) {
    try {
      return this.ticketsService.findOne(id);
    } catch (error: any) {
      console.error('Error finding one ticket:', error.message, error.stack);
      throw error;
    }
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('tickets', 'create')
  async createTicket(@Body() createDto: CreateTicketDto, @Request() req: any) {
    try {
      console.log('POST /tickets received:', createDto);
      const user = req?.user;
      const result = await this.ticketsService.create(createDto, undefined, user);
      console.log('Ticket created, returning:', result);
      return result;
    } catch (error: any) {
      console.error('Error creating ticket:', error.message, error.stack);
      throw error;
    }
  }

  @Patch('tickets/:id')
  @RequirePermission('tickets', 'edit')
  async updateTicket(@Param('id') id: string, @Body() updateDto: UpdateTicketDto) {
    try {
      console.log('PATCH /tickets/' + id, 'body:', updateDto);
      const result = await this.ticketsService.update(id, updateDto);
      console.log('PATCH success:', result);
      return result;
    } catch (error: any) {
      console.error('Error updating ticket:', error.message, error.stack);
      throw error;
    }
  }

  @Delete('tickets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('tickets', 'delete')
  removeTicket(@Param('id') id: string) {
    try {
      return this.ticketsService.remove(id);
    } catch (error: any) {
      console.error('Error removing ticket:', error.message, error.stack);
      throw error;
    }
  }

  @Get('engineers')
  getEngineers() {
    return this.ticketsService.getEngineers();
  }

  @Get('customers')
  getCustomersFromProjects() {
    return this.amcContractsService.getCustomersFromProjects();
  }

  // ============ AMC CONTRACTS ============

  @Get('contracts')
  findAllContracts(@Query() query: QueryAmcContractDto) {
    return this.amcContractsService.findAll(query);
  }

  @Get('contracts/stats')
  getContractStats() {
    return this.amcContractsService.getStats();
  }

  @Get('contracts/:id')
  findOneContract(@Param('id') id: string) {
    return this.amcContractsService.findOne(id);
  }

  @Post('contracts')
  @HttpCode(HttpStatus.CREATED)
  createContract(@Body() createDto: CreateAmcContractDto) {
    return this.amcContractsService.create(createDto, createDto.tenant_id);
  }

  @Patch('contracts/:id')
  async updateContract(@Param('id') id: string, @Body() updateDto: UpdateAmcContractDto) {
    try {
      console.log('Controller: Updating contract', id, 'with data:', updateDto);
      const result = await this.amcContractsService.update(id, updateDto, updateDto.tenant_id);
      console.log('Controller: Update successful');
      return result;
    } catch (error: any) {
      console.error('Controller: Update error:', error.message);
      console.error('Controller: Error stack:', error.stack);
      throw error;
    }
  }

  @Delete('contracts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeContract(@Param('id') id: string) {
    return this.amcContractsService.remove(id);
  }

  @Post('contracts/auto-generate')
  @HttpCode(HttpStatus.CREATED)
  async autoGenerateContracts() {
    try {
      console.log('POST /contracts/auto-generate called');
      const result = await this.amcContractsService.autoGenerateFromProjects();
      console.log('Auto-generated contracts:', result.created);
      return result;
    } catch (error: any) {
      console.error('Error auto-generating contracts:', error.message, error.stack);
      throw error;
    }
  }

  @Post('contracts/remove-duplicates')
  @HttpCode(HttpStatus.OK)
  async removeDuplicateContracts() {
    try {
      console.log('POST /contracts/remove-duplicates called');
      const result = await this.amcContractsService.forceRemoveDuplicates();
      console.log('Removed duplicates:', result.deleted, 'Remaining:', result.remaining);
      return result;
    } catch (error: any) {
      console.error('Error removing duplicates:', error.message, error.stack);
      throw error;
    }
  }

  // ============ AI INSIGHT ============

  @Get('ai-insight')
  getAiInsight() {
    return {
      insight: 'No critical issues detected. All systems operational.',
      recommendations: [
        'Schedule preventive maintenance for high-priority systems',
        'Review AMC contracts expiring in next 30 days',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  // ============ VISITS ============

  @Get('visits')
  findAllVisits(@Query() query: QueryVisitDto) {
    return this.visitsService.findAll(query);
  }

  @Get('visits/stats')
  getVisitStats() {
    return this.visitsService.getStats();
  }

  @Get('visits/:id')
  findOneVisit(@Param('id') id: string) {
    return this.visitsService.findOne(id);
  }

  @Post('visits')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  async createVisit(@Body() createDto: CreateVisitDto) {
    try {
      // Validate required fields
      if (!createDto.contract_id || !createDto.scheduled_date || !createDto.scheduled_time || !createDto.engineer_id) {
        return {
          success: false,
          message: 'Missing required fields: contract_id, scheduled_date, scheduled_time, engineer_id'
        };
      }

      const visit = await this.visitsService.create(createDto, createDto.tenant_id);
      return {
        success: true,
        message: 'Visit Scheduled Successfully',
        data: visit
      };
    } catch (error: any) {
      console.error('Error creating visit:', error.message);
      return {
        success: false,
        message: error.message || 'Failed to schedule visit'
      };
    }
  }

  @Patch('visits/:id')
  updateVisit(@Param('id') id: string, @Body() updateDto: UpdateVisitDto) {
    return this.visitsService.update(id, updateDto);
  }

  @Delete('visits/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeVisit(@Param('id') id: string) {
    return this.visitsService.remove(id);
  }
}
