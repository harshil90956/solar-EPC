import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Estimate, EstimateDocument, EstimateStatus } from '../schemas/estimate.schema';
import { CreateEstimateDto, UpdateEstimateDto, QueryEstimateDto } from '../dto/estimate.dto';

@Injectable()
export class EstimateService {
  private readonly logger = new Logger(EstimateService.name);

  constructor(
    @InjectModel(Estimate.name) private estimateModel: Model<EstimateDocument>,
  ) {}

  private generateEstimateNumber(): string {
    const prefix = 'EST';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  private calculateTotals(data: CreateEstimateDto | UpdateEstimateDto): Partial<Estimate> {
    const items = data.items || [];
    const equipmentCost = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const installationCost = data.installationCost || 0;
    const engineeringCost = data.engineeringCost || 0;
    const transportationCost = data.transportationCost || 0;
    const miscellaneousCost = data.miscellaneousCost || 0;
    
    const subtotal = equipmentCost + installationCost + engineeringCost + transportationCost + miscellaneousCost;
    const gstRate = data.gstRate || 18;
    const gstAmount = (subtotal * gstRate) / 100;
    const total = subtotal + gstAmount;

    return {
      equipmentCost,
      subtotal,
      gstAmount,
      total,
    };
  }

  async create(createDto: CreateEstimateDto, tenantId: string, createdBy: string): Promise<Estimate> {
    try {
      const estimateNumber = this.generateEstimateNumber();
      const calculatedFields = this.calculateTotals(createDto);

      const estimate = new this.estimateModel({
        ...createDto,
        ...calculatedFields,
        estimateNumber,
        tenantId: tenantId ? new Types.ObjectId(tenantId) : undefined,
        createdBy,
      });

      return await estimate.save();
    } catch (error: any) {
      this.logger.error(`Failed to create estimate: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create estimate: ${error.message}`);
    }
  }

  async findAll(query: QueryEstimateDto, tenantId: string): Promise<{ data: Estimate[]; total: number }> {
    try {
      const { search, status, customerName, projectName, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

      const filter: any = { isDeleted: false };
      
      if (tenantId) {
        filter.tenantId = new Types.ObjectId(tenantId);
      }

      if (status) {
        filter.status = status;
      }

      if (customerName) {
        filter.customerName = { $regex: customerName, $options: 'i' };
      }

      if (projectName) {
        filter.projectName = { $regex: projectName, $options: 'i' };
      }

      if (search) {
        filter.$or = [
          { estimateNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { projectName: { $regex: search, $options: 'i' } },
          { companyName: { $regex: search, $options: 'i' } },
        ];
      }

      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.estimateModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.estimateModel.countDocuments(filter),
      ]);

      return { data, total };
    } catch (error: any) {
      this.logger.error(`Failed to find estimates: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to find estimates: ${error.message}`);
    }
  }

  async findOne(id: string, tenantId: string): Promise<Estimate> {
    try {
      const filter: any = { _id: new Types.ObjectId(id), isDeleted: false };
      if (tenantId) {
        filter.tenantId = new Types.ObjectId(tenantId);
      }

      const estimate = await this.estimateModel.findOne(filter).exec();
      
      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${id} not found`);
      }

      return estimate;
    } catch (error: any) {
      this.logger.error(`Failed to find estimate: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateEstimateDto, tenantId: string): Promise<Estimate> {
    try {
      const existingEstimate = await this.findOne(id, tenantId);
      
      const calculatedFields = this.calculateTotals(updateDto);
      
      const updateData = {
        ...updateDto,
        ...calculatedFields,
        version: existingEstimate.version + 1,
      };

      const filter: any = { _id: new Types.ObjectId(id) };
      if (tenantId) {
        filter.tenantId = new Types.ObjectId(tenantId);
      }

      const estimate = await this.estimateModel
        .findOneAndUpdate(filter, updateData, { new: true })
        .exec();

      if (!estimate) {
        throw new NotFoundException(`Estimate with ID ${id} not found`);
      }

      return estimate;
    } catch (error: any) {
      this.logger.error(`Failed to update estimate: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    try {
      const filter: any = { _id: new Types.ObjectId(id) };
      if (tenantId) {
        filter.tenantId = new Types.ObjectId(tenantId);
      }

      const result = await this.estimateModel
        .findOneAndUpdate(filter, { isDeleted: true }, { new: true })
        .exec();

      if (!result) {
        throw new NotFoundException(`Estimate with ID ${id} not found`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to delete estimate: ${error.message}`, error.stack);
      throw error;
    }
  }

  async duplicate(id: string, tenantId: string, createdBy: string): Promise<Estimate> {
    try {
      const original = await this.findOne(id, tenantId);
      const originalObj = (original as any).toObject();
      
      delete originalObj._id;
      delete originalObj.createdAt;
      delete originalObj.updatedAt;
      
      const newEstimate = new this.estimateModel({
        ...originalObj,
        estimateNumber: this.generateEstimateNumber(),
        status: EstimateStatus.DRAFT,
        tenantId: tenantId ? new Types.ObjectId(tenantId) : undefined,
        createdBy,
        version: 1,
      });

      return await newEstimate.save();
    } catch (error: any) {
      this.logger.error(`Failed to duplicate estimate: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStats(tenantId: string): Promise<any> {
    try {
      const filter: any = { isDeleted: false };
      if (tenantId) {
        filter.tenantId = new Types.ObjectId(tenantId);
      }

      const stats = await this.estimateModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalValue: { $sum: '$total' },
            accepted: {
              $sum: { $cond: [{ $eq: ['$status', EstimateStatus.ACCEPTED] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', EstimateStatus.SENT] }, 1, 0] },
            },
            draft: {
              $sum: { $cond: [{ $eq: ['$status', EstimateStatus.DRAFT] }, 1, 0] },
            },
            rejected: {
              $sum: { $cond: [{ $eq: ['$status', EstimateStatus.REJECTED] }, 1, 0] },
            },
          },
        },
      ]);

      const result = stats[0] || {
        total: 0,
        totalValue: 0,
        accepted: 0,
        pending: 0,
        draft: 0,
        rejected: 0,
      };

      return {
        totalEstimates: result.total,
        totalValue: result.totalValue,
        acceptedEstimates: result.accepted,
        pendingEstimates: result.pending,
        draftEstimates: result.draft,
        rejectedEstimates: result.rejected,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get stats: ${error.message}`, error.stack);
      throw error;
    }
  }
}
