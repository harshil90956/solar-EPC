import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ComplianceService } from '../services/compliance.service';
import {
  CreateNetMeteringDto, UpdateNetMeteringDto,
  CreateSubsidyDto, UpdateSubsidyDto,
  CreateInspectionDto, UpdateInspectionDto,
  CreateComplianceDocumentDto, UpdateComplianceDocumentDto,
} from '../dto/compliance.dto';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // ==================== STATS ====================

  @Get('stats')
  async getStats(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.getStats(tenantId);
  }

  // ==================== NET METERING ====================

  @Get('net-metering')
  async findAllNetMetering(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('status') status?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.findAllNetMetering(tenantId, status);
  }

  @Get('net-metering/:applicationId')
  async findOneNetMetering(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('applicationId') applicationId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.findOneNetMetering(tenantId, applicationId);
  }

  @Post('net-metering')
  @HttpCode(HttpStatus.CREATED)
  async createNetMetering(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateNetMeteringDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.createNetMetering(tenantId, createDto);
  }

  @Patch('net-metering/:applicationId')
  async updateNetMetering(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('applicationId') applicationId: string,
    @Body() updateDto: UpdateNetMeteringDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.updateNetMetering(tenantId, applicationId, updateDto);
  }

  @Delete('net-metering/:applicationId')
  async removeNetMetering(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('applicationId') applicationId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.removeNetMetering(tenantId, applicationId);
  }

  // ==================== SUBSIDIES ====================

  @Get('subsidies')
  async findAllSubsidies(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('status') status?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.findAllSubsidies(tenantId, status);
  }

  @Get('subsidies/:subsidyId')
  async findOneSubsidy(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('subsidyId') subsidyId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.findOneSubsidy(tenantId, subsidyId);
  }

  @Post('subsidies')
  @HttpCode(HttpStatus.CREATED)
  async createSubsidy(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateSubsidyDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.createSubsidy(tenantId, createDto);
  }

  @Patch('subsidies/:subsidyId')
  async updateSubsidy(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('subsidyId') subsidyId: string,
    @Body() updateDto: UpdateSubsidyDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.updateSubsidy(tenantId, subsidyId, updateDto);
  }

  @Delete('subsidies/:subsidyId')
  async removeSubsidy(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('subsidyId') subsidyId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.removeSubsidy(tenantId, subsidyId);
  }

  // ==================== INSPECTIONS ====================

  @Get('inspections')
  async findAllInspections(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('status') status?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.findAllInspections(tenantId, status);
  }

  @Get('inspections/:inspectionId')
  async findOneInspection(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('inspectionId') inspectionId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.findOneInspection(tenantId, inspectionId);
  }

  @Post('inspections')
  @HttpCode(HttpStatus.CREATED)
  async createInspection(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateInspectionDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.createInspection(tenantId, createDto);
  }

  @Patch('inspections/:inspectionId')
  async updateInspection(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('inspectionId') inspectionId: string,
    @Body() updateDto: UpdateInspectionDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.updateInspection(tenantId, inspectionId, updateDto);
  }

  @Delete('inspections/:inspectionId')
  async removeInspection(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('inspectionId') inspectionId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.removeInspection(tenantId, inspectionId);
  }

  // ==================== DOCUMENTS ====================

  @Get('documents')
  async findAllDocuments(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.findAllDocuments(tenantId, status, category);
  }

  @Get('documents/:documentId')
  async findOneDocument(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('documentId') documentId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.findOneDocument(tenantId, documentId);
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Body() createDto: CreateComplianceDocumentDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.createDocument(tenantId, createDto);
  }

  @Patch('documents/:documentId')
  async updateDocument(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('documentId') documentId: string,
    @Body() updateDto: UpdateComplianceDocumentDto,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.updateDocument(tenantId, documentId, updateDto);
  }

  @Delete('documents/:documentId')
  async removeDocument(
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
    @Param('documentId') documentId: string,
  ) {
    const tenantId = headerTenantId || queryTenantId;
    return this.complianceService.removeDocument(tenantId, documentId);
  }
}
