import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeadStatus, LeadStatusDocument, StatusType } from '../schemas/lead-status.schema';
import { CreateLeadStatusDto, UpdateLeadStatusDto } from '../dto/lead-status.dto';

// Assuming Lead model exists - we'll need to check usage
interface LeadDocument {
  _id: Types.ObjectId;
  statusKey?: string;
}

@Injectable()
export class LeadStatusService {
  private readonly logger = new Logger(LeadStatusService.name);

  constructor(
    @InjectModel(LeadStatus.name) private leadStatusModel: Model<LeadStatusDocument>,
    @InjectModel('Lead') private leadModel: Model<LeadDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    // Check if id is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try { return new Types.ObjectId(id); } catch { return undefined; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create Status
  // ─────────────────────────────────────────────────────────────────────────

  async createStatus(
    tenantId: string | undefined,
    dto: CreateLeadStatusDto,
  ): Promise<LeadStatus> {
    const tid = this.toObjectId(tenantId);

    // Check if key already exists for this tenant
    const existing = await this.leadStatusModel.findOne({
      tenantId: tid,
      entity: 'lead',
      key: dto.key,
    }).exec();

    if (existing) {
      throw new BadRequestException(`Status key '${dto.key}' already exists`);
    }

    // Get max order for auto-increment
    const maxOrderDoc = await this.leadStatusModel
      .findOne({ tenantId: tid, entity: 'lead' })
      .sort({ order: -1 })
      .exec();
    const nextOrder = (maxOrderDoc?.order ?? -1) + 1;

    const status = new this.leadStatusModel({
      tenantId: tid,
      module: 'crm',
      entity: 'lead',
      key: dto.key,
      label: dto.label,
      color: dto.color || '#64748b',
      order: dto.order ?? nextOrder,
      type: dto.type || StatusType.NORMAL,
      isActive: true,
      isSystem: dto.isSystem || false,
    });

    const saved = await status.save();
    this.logger.log(`Created lead status: ${dto.key} for tenant ${tenantId}`);
    return saved;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get All Statuses (including inactive)
  // ─────────────────────────────────────────────────────────────────────────

  async getAllStatuses(tenantId: string | undefined): Promise<LeadStatus[]> {
    const tid = this.toObjectId(tenantId);

    return this.leadStatusModel
      .find({ tenantId: tid, entity: 'lead' })
      .sort({ order: 1 })
      .exec();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get Active Statuses Only
  // ─────────────────────────────────────────────────────────────────────────

  async getActiveStatuses(tenantId: string | undefined): Promise<LeadStatus[]> {
    const tid = this.toObjectId(tenantId);

    return this.leadStatusModel
      .find({ tenantId: tid, entity: 'lead', isActive: true })
      .sort({ order: 1 })
      .exec();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get Single Status
  // ─────────────────────────────────────────────────────────────────────────

  async getStatus(tenantId: string | undefined, statusId: string): Promise<LeadStatus | null> {
    const tid = this.toObjectId(tenantId);

    return this.leadStatusModel
      .findOne({ _id: new Types.ObjectId(statusId), tenantId: tid, entity: 'lead' })
      .exec();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Get Status by Key
  // ─────────────────────────────────────────────────────────────────────────

  async getStatusByKey(tenantId: string | undefined, key: string): Promise<LeadStatus | null> {
    const tid = this.toObjectId(tenantId);

    return this.leadStatusModel
      .findOne({ tenantId: tid, entity: 'lead', key })
      .exec();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Update Status
  // ─────────────────────────────────────────────────────────────────────────

  async updateStatus(
    tenantId: string | undefined,
    statusId: string,
    dto: UpdateLeadStatusDto,
  ): Promise<LeadStatus> {
    const tid = this.toObjectId(tenantId);

    const status = await this.leadStatusModel.findOneAndUpdate(
      { _id: new Types.ObjectId(statusId), tenantId: tid, entity: 'lead' },
      { $set: dto },
      { new: true },
    ).exec();

    if (!status) {
      throw new NotFoundException(`Status not found`);
    }

    this.logger.log(`Updated lead status: ${status.key} for tenant ${tenantId}`);
    return status;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Delete Status (Soft Delete with Usage Check)
  // ─────────────────────────────────────────────────────────────────────────

  async deleteStatus(tenantId: string | undefined, statusId: string): Promise<{ success: boolean; message: string }> {
    const tid = this.toObjectId(tenantId);

    const status = await this.leadStatusModel
      .findOne({ _id: new Types.ObjectId(statusId), tenantId: tid, entity: 'lead' })
      .exec();

    if (!status) {
      throw new NotFoundException(`Status not found`);
    }

    // Check if status is a system status
    if (status.isSystem) {
      throw new BadRequestException(`Cannot delete system status '${status.key}'`);
    }

    // Check if status is in use by any leads
    const usageCount = await this.leadModel.countDocuments({
      tenantId: tid,
      statusKey: status.key,
    }).exec();

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete status '${status.label}' - it is used by ${usageCount} lead(s). Please reassign those leads first.`
      );
    }

    // Soft delete - set isActive to false
    status.isActive = false;
    await status.save();

    this.logger.log(`Soft-deleted lead status: ${status.key} for tenant ${tenantId}`);
    return { success: true, message: `Status '${status.label}' deleted successfully` };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Hard Delete (Only for unused non-system statuses - admin use)
  // ─────────────────────────────────────────────────────────────────────────

  async hardDeleteStatus(tenantId: string | undefined, statusId: string): Promise<void> {
    const tid = this.toObjectId(tenantId);

    const status = await this.leadStatusModel
      .findOne({ _id: new Types.ObjectId(statusId), tenantId: tid, entity: 'lead' })
      .exec();

    if (!status) {
      throw new NotFoundException(`Status not found`);
    }

    if (status.isSystem) {
      throw new BadRequestException(`Cannot delete system status`);
    }

    // Check usage
    const usageCount = await this.leadModel.countDocuments({
      tenantId: tid,
      statusKey: status.key,
    }).exec();

    if (usageCount > 0) {
      throw new BadRequestException(`Cannot delete - status is in use by ${usageCount} lead(s)`);
    }

    await this.leadStatusModel.deleteOne({ _id: status._id }).exec();
    this.logger.log(`Hard-deleted lead status: ${status.key} for tenant ${tenantId}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Reorder Statuses
  // ─────────────────────────────────────────────────────────────────────────

  async reorderStatuses(tenantId: string | undefined, orderedIds: string[]): Promise<LeadStatus[]> {
    const tid = this.toObjectId(tenantId);

    // Validate all IDs belong to this tenant
    const statuses = await this.leadStatusModel
      .find({ _id: { $in: orderedIds.map(id => new Types.ObjectId(id)) }, tenantId: tid })
      .exec();

    if (statuses.length !== orderedIds.length) {
      throw new BadRequestException('Some status IDs are invalid or do not belong to this tenant');
    }

    // Update order for each status
    const updates = orderedIds.map((id, index) =>
      this.leadStatusModel.updateOne(
        { _id: new Types.ObjectId(id), tenantId: tid },
        { $set: { order: index } }
      ).exec()
    );

    await Promise.all(updates);

    this.logger.log(`Reordered ${orderedIds.length} lead statuses for tenant ${tenantId}`);

    // Return updated list
    return this.getAllStatuses(tenantId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Initialize Default Statuses (for new tenants)
  // ─────────────────────────────────────────────────────────────────────────

  async initializeDefaultStatuses(tenantId: string | undefined): Promise<LeadStatus[]> {
    const defaults = [
      { key: 'new', label: 'New Lead', color: '#3b82f6', type: StatusType.START, order: 0 },
      { key: 'contacted', label: 'Contacted', color: '#8b5cf6', type: StatusType.NORMAL, order: 1 },
      { key: 'qualified', label: 'Qualified', color: '#06b6d4', type: StatusType.NORMAL, order: 2 },
      { key: 'proposal', label: 'Proposal Sent', color: '#f59e0b', type: StatusType.NORMAL, order: 3 },
      { key: 'negotiation', label: 'Negotiation', color: '#eab308', type: StatusType.NORMAL, order: 4 },
      { key: 'won', label: 'Won', color: '#22c55e', type: StatusType.SUCCESS, order: 5 },
      { key: 'lost', label: 'Lost', color: '#ef4444', type: StatusType.FAILURE, order: 6 },
    ];

    const created: LeadStatus[] = [];
    for (const def of defaults) {
      try {
        const status = await this.createStatus(tenantId, {
          ...def,
          isSystem: true,
        });
        created.push(status);
      } catch (err: any) {
        // Status might already exist, skip
        this.logger.warn(`Failed to create default status ${def.key}: ${err?.message || 'Unknown error'}`);
      }
    }

    return created;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Validate Status Key
  // ─────────────────────────────────────────────────────────────────────────

  async validateStatusKey(tenantId: string | undefined, key: string): Promise<boolean> {
    const status = await this.getStatusByKey(tenantId, key);
    return status?.isActive === true;
  }
}
