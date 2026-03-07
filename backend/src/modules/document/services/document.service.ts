import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DocumentEntity, DocumentEntityDocument, DocumentStatus } from '../schemas/document.schema';
import { CreateDocumentDto, UpdateDocumentDto, QueryDocumentDto, SendDocumentDto } from '../dto/document.dto';

@Injectable()
export class DocumentService {
  constructor(
    @InjectModel(DocumentEntity.name) private documentModel: Model<DocumentEntityDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  private generateDocumentId(type: string): string {
    const prefix = type.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  }

  // ============================================
  // CRUD Operations
  // ============================================
  async create(createDto: CreateDocumentDto, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    const documentData = {
      ...createDto,
      documentId: createDto.documentId || this.generateDocumentId(createDto.type),
      tenantId: tid,
      createdBy: 'system',
    };

    const created = new this.documentModel(documentData);
    return created.save();
  }

  async findAll(query: QueryDocumentDto, tenantId?: string): Promise<{ data: DocumentEntity[]; total: number }> {
    const tid = this.toObjectId(tenantId);
    const { page = 1, limit = 20, search, type, status, leadId, projectId, customerId } = query;

    const filter: any = { isDeleted: false };
    if (tid) filter.tenantId = tid;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (leadId) filter.leadId = this.toObjectId(leadId);
    if (projectId) filter.projectId = this.toObjectId(projectId);
    if (customerId) filter.customerId = this.toObjectId(customerId);

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { documentId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.documentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documentModel.countDocuments(filter),
    ]);

    return { data: data as DocumentEntity[], total };
  }

  async findByTypes(
    types: string[],
    query: QueryDocumentDto,
    tenantId?: string,
  ): Promise<{ data: DocumentEntity[]; total: number }> {
    const tid = this.toObjectId(tenantId);
    const { page = 1, limit = 20, search, status, leadId, projectId, customerId } = query;

    const filter: any = { type: { $in: types }, isDeleted: false };
    if (tid) filter.tenantId = tid;
    if (status) filter.status = status;
    if (leadId) filter.leadId = this.toObjectId(leadId);
    if (projectId) filter.projectId = this.toObjectId(projectId);
    if (customerId) filter.customerId = this.toObjectId(customerId);

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { documentId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.documentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.documentModel.countDocuments(filter),
    ]);

    return { data: data as DocumentEntity[], total };
  }

  async findOne(id: string, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);
    const doc = await this.documentModel
      .findOne({
        $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
        ...(tid && { tenantId: tid }),
        isDeleted: false,
      })
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return doc as DocumentEntity;
  }

  async update(id: string, updateDto: UpdateDocumentDto, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    const doc = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        { $set: updateDto },
        { new: true },
      )
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return doc as DocumentEntity;
  }

  async remove(id: string, tenantId?: string): Promise<void> {
    const tid = this.toObjectId(tenantId);

    const result = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        { $set: { isDeleted: true } },
      )
      .exec();

    if (!result) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }
  }

  // ============================================
  // Stats
  // ============================================
  async getStats(tenantId?: string): Promise<any> {
    const tid = this.toObjectId(tenantId);
    const baseFilter: any = { isDeleted: false };
    if (tid) baseFilter.tenantId = tid;

    const [total, byType, byStatus] = await Promise.all([
      this.documentModel.countDocuments(baseFilter),
      this.documentModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      this.documentModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byType: byType.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      byStatus: byStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
    };
  }

  async getStatsByTypes(types: string[], tenantId?: string): Promise<any> {
    const tid = this.toObjectId(tenantId);
    const baseFilter: any = { type: { $in: types }, isDeleted: false };
    if (tid) baseFilter.tenantId = tid;

    const [total, byStatus, totalValue] = await Promise.all([
      this.documentModel.countDocuments(baseFilter),
      this.documentModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.documentModel.aggregate([
        { $match: { ...baseFilter, status: { $in: [DocumentStatus.ACCEPTED, DocumentStatus.SENT] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      totalValue: totalValue[0]?.total || 0,
    };
  }

  // ============================================
  // Document Actions
  // ============================================
  async send(id: string, sendDto: SendDocumentDto, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    const doc = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        {
          $set: {
            status: DocumentStatus.SENT,
            sentAt: new Date(),
            ...(sendDto.email && { customerEmail: sendDto.email }),
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return doc as DocumentEntity;
  }

  async duplicate(id: string, tenantId?: string): Promise<DocumentEntity> {
    const original = await this.findOne(id, tenantId);

    const duplicated = {
      ...original,
      _id: undefined,
      documentId: this.generateDocumentId(original.type),
      status: DocumentStatus.DRAFT,
      title: `${original.title} (Copy)`,
      sentAt: null,
      acceptedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = new this.documentModel(duplicated);
    return created.save();
  }

  async convert(id: string, targetType: string, tenantId?: string): Promise<DocumentEntity> {
    const tid = this.toObjectId(tenantId);

    const doc = await this.documentModel
      .findOneAndUpdate(
        {
          $or: [{ _id: this.toObjectId(id) }, { documentId: id }],
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        {
          $set: {
            type: targetType,
            documentId: this.generateDocumentId(targetType),
            status: DocumentStatus.DRAFT,
          },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }

    return doc as DocumentEntity;
  }

  // ============================================
  // Bulk Actions
  // ============================================
  async bulkDelete(ids: string[], tenantId?: string): Promise<{ deleted: number }> {
    const tid = this.toObjectId(tenantId);
    const objectIds = ids.map((id) => this.toObjectId(id)).filter(Boolean);

    const result = await this.documentModel
      .updateMany(
        {
          _id: { $in: objectIds },
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        { $set: { isDeleted: true } },
      )
      .exec();

    return { deleted: result.modifiedCount };
  }

  async bulkUpdateStatus(ids: string[], status: string, tenantId?: string): Promise<{ updated: number }> {
    const tid = this.toObjectId(tenantId);
    const objectIds = ids.map((id) => this.toObjectId(id)).filter(Boolean);

    const updateData: any = { status };
    if (status === DocumentStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === DocumentStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    }

    const result = await this.documentModel
      .updateMany(
        {
          _id: { $in: objectIds },
          ...(tid && { tenantId: tid }),
          isDeleted: false,
        },
        { $set: updateData },
      )
      .exec();

    return { updated: result.modifiedCount };
  }
}
