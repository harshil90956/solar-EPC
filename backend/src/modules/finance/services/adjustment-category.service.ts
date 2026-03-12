import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdjustmentCategory, AdjustmentCategoryDocument } from '../schemas';
import { CreateAdjustmentCategoryDto, UpdateAdjustmentCategoryDto } from '../dto/adjustment-category.dto';

@Injectable()
export class AdjustmentCategoryService {
  constructor(
    @InjectModel(AdjustmentCategory.name) private readonly categoryModel: Model<AdjustmentCategoryDocument>,
  ) {}

  async findAll(tenantId: string): Promise<AdjustmentCategory[]> {
    const query: any = { isDeleted: false };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId === '') {
      // SuperAdmin case: possibly return all or restricted set. 
      // For now, let's keep it restricted to global if applicable, 
      // but usually AdjustmentCategories are tenant-specific.
      // Returning empty array if no valid tenantId for now to match controller logic.
      return [];
    } else {
      throw new BadRequestException('Invalid Tenant ID');
    }

    const results = await this.categoryModel
      .find(query)
      .sort({ categoryName: 1 })
      .lean();
    // Deduplicate by categoryName + type (case-insensitive)
    const seen = new Set<string>();
    return results.filter((cat: any) => {
      const key = `${(cat.categoryName || '').toLowerCase()}__${cat.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async findByType(tenantId: string, type: 'credit' | 'debit'): Promise<AdjustmentCategory[]> {
    const query: any = { isDeleted: false, type };
    if (tenantId && Types.ObjectId.isValid(tenantId)) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else if (tenantId === '') {
      return [];
    } else {
      throw new BadRequestException('Invalid Tenant ID');
    }

    const results = await this.categoryModel
      .find(query)
      .sort({ categoryName: 1 })
      .lean();
    // Deduplicate by categoryName (case-insensitive)
    const seen = new Set<string>();
    return results.filter((cat: any) => {
      const key = (cat.categoryName || '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async create(tenantId: string, dto: CreateAdjustmentCategoryDto, userId?: string): Promise<AdjustmentCategory> {
    const tid = new Types.ObjectId(tenantId);
    const existingQuery = { 
      tenantId: tid,
      isDeleted: false, 
      categoryName: { $regex: new RegExp(`^${dto.categoryName}$`, 'i') },
      type: dto.type
    };
    
    const existing = await this.categoryModel.findOne(existingQuery).lean();
    if (existing) {
      throw new BadRequestException(`Category '${dto.categoryName}' already exists for ${dto.type} type`);
    }

    const createdByObjectId = userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined;

    const category = new this.categoryModel({
      tenantId: tid,
      categoryName: dto.categoryName,
      type: dto.type,
      createdBy: createdByObjectId,
      isDeleted: false,
    });

    const saved = await category.save();
    return saved.toObject();
  }

  async update(
    tenantId: string,
    categoryId: string,
    dto: UpdateAdjustmentCategoryDto,
    userId?: string,
  ): Promise<AdjustmentCategory> {
    const tid = new Types.ObjectId(tenantId);
    const catId = new Types.ObjectId(categoryId);

    const query = { _id: catId, tenantId: tid, isDeleted: false };

    const category = await this.categoryModel.findOne(query);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check for duplicate name if updating name
    if (dto.categoryName) {
      const duplicateQuery = {
        _id: { $ne: catId },
        tenantId: tid,
        isDeleted: false,
        categoryName: { $regex: new RegExp(`^${dto.categoryName}$`, 'i') },
        type: dto.type || category.type,
      };

      const duplicate = await this.categoryModel.findOne(duplicateQuery).lean();
      if (duplicate) {
        throw new BadRequestException(`Category '${dto.categoryName}' already exists`);
      }
    }

    if (dto.categoryName) category.categoryName = dto.categoryName;
    if (dto.type) category.type = dto.type;

    const saved = await category.save();
    return saved.toObject();
  }

  async delete(tenantId: string, categoryId: string): Promise<{ success: boolean }> {
    const tid = new Types.ObjectId(tenantId);
    const catId = new Types.ObjectId(categoryId);

    const query = { _id: catId, tenantId: tid, isDeleted: false };

    const category = await this.categoryModel.findOne(query);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.isDeleted = true;
    await category.save();

    return { success: true };
  }
}
