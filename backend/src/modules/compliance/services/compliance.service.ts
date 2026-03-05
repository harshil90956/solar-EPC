import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NetMetering } from '../schemas/net-metering.schema';
import { Subsidy } from '../schemas/subsidy.schema';
import { Inspection } from '../schemas/inspection.schema';
import { ComplianceDocument } from '../schemas/compliance-document.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import {
  CreateNetMeteringDto, UpdateNetMeteringDto,
  CreateSubsidyDto, UpdateSubsidyDto,
  CreateInspectionDto, UpdateInspectionDto,
  CreateComplianceDocumentDto, UpdateComplianceDocumentDto,
} from '../dto/compliance.dto';

@Injectable()
export class ComplianceService {
  constructor(
    @InjectModel(NetMetering.name) private readonly netMeteringModel: Model<NetMetering>,
    @InjectModel(Subsidy.name) private readonly subsidyModel: Model<Subsidy>,
    @InjectModel(Inspection.name) private readonly inspectionModel: Model<Inspection>,
    @InjectModel(ComplianceDocument.name) private readonly documentModel: Model<ComplianceDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<Types.ObjectId> {
    // If it looks like an ObjectId (24 hex chars), use it directly
    if (/^[0-9a-fA-F]{24}$/.test(tenantCode)) {
      return new Types.ObjectId(tenantCode);
    }
    // Otherwise, look up by code
    const tenant = await this.tenantModel.findOne({ code: tenantCode });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }
    return tenant._id as Types.ObjectId;
  }

  // ==================== NET METERING ====================

  async findAllNetMetering(tenantCode: string, status?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    if (status && status !== 'All') {
      query.status = status;
    }
    return this.netMeteringModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOneNetMetering(tenantCode: string, applicationId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.netMeteringModel.findOne({ tenantId, applicationId, isDeleted: false }).exec();
    if (!item) {
      throw new NotFoundException(`Net Metering application ${applicationId} not found`);
    }
    return item;
  }

  async createNetMetering(tenantCode: string, createDto: CreateNetMeteringDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = new this.netMeteringModel({
      ...createDto,
      tenantId,
      status: createDto.status || 'Draft',
    });
    return item.save();
  }

  async updateNetMetering(tenantCode: string, applicationId: string, updateDto: UpdateNetMeteringDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.netMeteringModel.findOneAndUpdate(
      { tenantId, applicationId },
      { $set: updateDto },
      { new: true },
    ).exec();
    if (!item) {
      throw new NotFoundException(`Net Metering application ${applicationId} not found`);
    }
    return item;
  }

  async removeNetMetering(tenantCode: string, applicationId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.netMeteringModel.findOneAndUpdate(
      { tenantId, applicationId },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();
    if (!item) {
      throw new NotFoundException(`Net Metering application ${applicationId} not found`);
    }
    return item;
  }

  // ==================== SUBSIDIES ====================

  async findAllSubsidies(tenantCode: string, status?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    if (status && status !== 'All') {
      query.status = status;
    }
    return this.subsidyModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOneSubsidy(tenantCode: string, subsidyId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.subsidyModel.findOne({ tenantId, subsidyId, isDeleted: false }).exec();
    if (!item) {
      throw new NotFoundException(`Subsidy ${subsidyId} not found`);
    }
    return item;
  }

  async createSubsidy(tenantCode: string, createDto: CreateSubsidyDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = new this.subsidyModel({
      ...createDto,
      tenantId,
      status: createDto.status || 'Applied',
    });
    return item.save();
  }

  async updateSubsidy(tenantCode: string, subsidyId: string, updateDto: UpdateSubsidyDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.subsidyModel.findOneAndUpdate(
      { tenantId, subsidyId },
      { $set: updateDto },
      { new: true },
    ).exec();
    if (!item) {
      throw new NotFoundException(`Subsidy ${subsidyId} not found`);
    }
    return item;
  }

  async removeSubsidy(tenantCode: string, subsidyId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.subsidyModel.findOneAndUpdate(
      { tenantId, subsidyId },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();
    if (!item) {
      throw new NotFoundException(`Subsidy ${subsidyId} not found`);
    }
    return item;
  }

  // ==================== INSPECTIONS ====================

  async findAllInspections(tenantCode: string, status?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    if (status && status !== 'All') {
      query.status = status;
    }
    return this.inspectionModel.find(query).sort({ scheduledDate: 1 }).exec();
  }

  async findOneInspection(tenantCode: string, inspectionId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.inspectionModel.findOne({ tenantId, inspectionId, isDeleted: false }).exec();
    if (!item) {
      throw new NotFoundException(`Inspection ${inspectionId} not found`);
    }
    return item;
  }

  async createInspection(tenantCode: string, createDto: CreateInspectionDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = new this.inspectionModel({
      ...createDto,
      tenantId,
      status: createDto.status || 'Pending',
      checklistItems: createDto.checklistItems || [],
      documentsRequired: createDto.documentsRequired || [],
    });
    return item.save();
  }

  async updateInspection(tenantCode: string, inspectionId: string, updateDto: UpdateInspectionDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.inspectionModel.findOneAndUpdate(
      { tenantId, inspectionId },
      { $set: updateDto },
      { new: true },
    ).exec();
    if (!item) {
      throw new NotFoundException(`Inspection ${inspectionId} not found`);
    }
    return item;
  }

  async removeInspection(tenantCode: string, inspectionId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.inspectionModel.findOneAndUpdate(
      { tenantId, inspectionId },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();
    if (!item) {
      throw new NotFoundException(`Inspection ${inspectionId} not found`);
    }
    return item;
  }

  // ==================== COMPLIANCE DOCUMENTS ====================

  async findAllDocuments(tenantCode: string, status?: string, category?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    if (status && status !== 'All') {
      query.status = status;
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    return this.documentModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOneDocument(tenantCode: string, documentId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.documentModel.findOne({ tenantId, documentId, isDeleted: false }).exec();
    if (!item) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return item;
  }

  async createDocument(tenantCode: string, createDto: CreateComplianceDocumentDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = new this.documentModel({
      ...createDto,
      tenantId,
      status: createDto.status || 'Pending',
      required: createDto.required ?? false,
      version: 1,
    });
    return item.save();
  }

  async updateDocument(tenantCode: string, documentId: string, updateDto: UpdateComplianceDocumentDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.documentModel.findOneAndUpdate(
      { tenantId, documentId },
      { $set: updateDto },
      { new: true },
    ).exec();
    if (!item) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return item;
  }

  async removeDocument(tenantCode: string, documentId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.documentModel.findOneAndUpdate(
      { tenantId, documentId },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();
    if (!item) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return item;
  }

  // ==================== STATS ====================

  async getStats(tenantCode: string) {
    const tenantId = await this.getTenantId(tenantCode);

    const [netMeteringStats, subsidyStats, inspectionStats, documentStats] = await Promise.all([
      this.netMeteringModel.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.subsidyModel.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$claimAmount' } } },
      ]),
      this.inspectionModel.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.documentModel.aggregate([
        { $match: { tenantId, isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const nmTotal = netMeteringStats.reduce((sum, s) => sum + s.count, 0);
    const nmApplied = netMeteringStats.find(s => s._id === 'Applied')?.count || 0;
    const nmApproved = netMeteringStats.find(s => s._id === 'Approved')?.count || 0;
    const nmConnected = netMeteringStats.find(s => s._id === 'Connected')?.count || 0;

    const subTotal = subsidyStats.reduce((sum, s) => sum + s.count, 0);
    const subTotalAmount = subsidyStats.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const subDisbursed = subsidyStats.find(s => s._id === 'Disbursed')?.count || 0;
    const subDisbursedAmount = subsidyStats.find(s => s._id === 'Disbursed')?.totalAmount || 0;

    const insTotal = inspectionStats.reduce((sum, s) => sum + s.count, 0);
    const insPending = inspectionStats.find(s => s._id === 'Pending')?.count || 0;
    const insScheduled = inspectionStats.find(s => s._id === 'Scheduled')?.count || 0;

    const docTotal = documentStats.reduce((sum, s) => sum + s.count, 0);
    const docUploaded = documentStats.find(s => s._id === 'Uploaded')?.count || 0;
    const docPending = documentStats.find(s => s._id === 'Pending')?.count || 0;

    return {
      netMetering: {
        total: nmTotal,
        applied: nmApplied,
        approved: nmApproved,
        connected: nmConnected,
      },
      subsidies: {
        total: subTotal,
        totalAmount: subTotalAmount,
        disbursed: subDisbursed,
        disbursedAmount: subDisbursedAmount,
      },
      inspections: {
        total: insTotal,
        pending: insPending,
        scheduled: insScheduled,
      },
      documents: {
        total: docTotal,
        uploaded: docUploaded,
        pending: docPending,
        complianceScore: docTotal > 0 ? Math.round((docUploaded / docTotal) * 100) : 0,
      },
    };
  }
}
