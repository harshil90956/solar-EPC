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
  async getStats(@Query('tenantId') tenantId: string) {
    return this.complianceService.getStats(tenantId);
  }

  // ==================== NET METERING ====================

  @Get('net-metering')
  async findAllNetMetering(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.complianceService.findAllNetMetering(tenantId, status);
  }

  @Get('net-metering/:applicationId')
  async findOneNetMetering(
    @Query('tenantId') tenantId: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.complianceService.findOneNetMetering(tenantId, applicationId);
  }

  @Post('net-metering')
  @HttpCode(HttpStatus.CREATED)
  async createNetMetering(
    @Query('tenantId') tenantId: string,
    @Body() createDto: CreateNetMeteringDto,
  ) {
    return this.complianceService.createNetMetering(tenantId, createDto);
  }

  @Patch('net-metering/:applicationId')
  async updateNetMetering(
    @Query('tenantId') tenantId: string,
    @Param('applicationId') applicationId: string,
    @Body() updateDto: UpdateNetMeteringDto,
  ) {
    return this.complianceService.updateNetMetering(tenantId, applicationId, updateDto);
  }

  @Delete('net-metering/:applicationId')
  async removeNetMetering(
    @Query('tenantId') tenantId: string,
    @Param('applicationId') applicationId: string,
  ) {
    return this.complianceService.removeNetMetering(tenantId, applicationId);
  }

  // ==================== SUBSIDIES ====================

  @Get('subsidies')
  async findAllSubsidies(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.complianceService.findAllSubsidies(tenantId, status);
  }

  @Get('subsidies/:subsidyId')
  async findOneSubsidy(
    @Query('tenantId') tenantId: string,
    @Param('subsidyId') subsidyId: string,
  ) {
    return this.complianceService.findOneSubsidy(tenantId, subsidyId);
  }

  @Post('subsidies')
  @HttpCode(HttpStatus.CREATED)
  async createSubsidy(
    @Query('tenantId') tenantId: string,
    @Body() createDto: CreateSubsidyDto,
  ) {
    return this.complianceService.createSubsidy(tenantId, createDto);
  }

  @Patch('subsidies/:subsidyId')
  async updateSubsidy(
    @Query('tenantId') tenantId: string,
    @Param('subsidyId') subsidyId: string,
    @Body() updateDto: UpdateSubsidyDto,
  ) {
    return this.complianceService.updateSubsidy(tenantId, subsidyId, updateDto);
  }

  @Delete('subsidies/:subsidyId')
  async removeSubsidy(
    @Query('tenantId') tenantId: string,
    @Param('subsidyId') subsidyId: string,
  ) {
    return this.complianceService.removeSubsidy(tenantId, subsidyId);
  }

  // ==================== INSPECTIONS ====================

  @Get('inspections')
  async findAllInspections(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.complianceService.findAllInspections(tenantId, status);
  }

  @Get('inspections/:inspectionId')
  async findOneInspection(
    @Query('tenantId') tenantId: string,
    @Param('inspectionId') inspectionId: string,
  ) {
    return this.complianceService.findOneInspection(tenantId, inspectionId);
  }

  @Post('inspections')
  @HttpCode(HttpStatus.CREATED)
  async createInspection(
    @Query('tenantId') tenantId: string,
    @Body() createDto: CreateInspectionDto,
  ) {
    return this.complianceService.createInspection(tenantId, createDto);
  }

  @Patch('inspections/:inspectionId')
  async updateInspection(
    @Query('tenantId') tenantId: string,
    @Param('inspectionId') inspectionId: string,
    @Body() updateDto: UpdateInspectionDto,
  ) {
    return this.complianceService.updateInspection(tenantId, inspectionId, updateDto);
  }

  @Delete('inspections/:inspectionId')
  async removeInspection(
    @Query('tenantId') tenantId: string,
    @Param('inspectionId') inspectionId: string,
  ) {
    return this.complianceService.removeInspection(tenantId, inspectionId);
  }

  // ==================== DOCUMENTS ====================

  @Get('documents')
  async findAllDocuments(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.complianceService.findAllDocuments(tenantId, status, category);
  }

  @Get('documents/:documentId')
  async findOneDocument(
    @Query('tenantId') tenantId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.complianceService.findOneDocument(tenantId, documentId);
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Query('tenantId') tenantId: string,
    @Body() createDto: CreateComplianceDocumentDto,
  ) {
    return this.complianceService.createDocument(tenantId, createDto);
  }

  @Patch('documents/:documentId')
  async updateDocument(
    @Query('tenantId') tenantId: string,
    @Param('documentId') documentId: string,
    @Body() updateDto: UpdateComplianceDocumentDto,
  ) {
    return this.complianceService.updateDocument(tenantId, documentId, updateDto);
  }

  @Delete('documents/:documentId')
  async removeDocument(
    @Query('tenantId') tenantId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.complianceService.removeDocument(tenantId, documentId);
  }
}
