import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdjustmentCategory, AdjustmentCategoryDocument } from '../schemas';
import { CreateAdjustmentCategoryDto, UpdateAdjustmentCategoryDto } from '../dto/adjustment-category.dto';

@Injectable()
export class AdjustmentCategoryService {
  constructor(
    @InjectModel(AdjustmentCategory.name) private readonly categoryModel: Model<AdjustmentCategoryDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  async findAll(tenantId: string): Promise<AdjustmentCategory[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = { isDeleted: false };
    if (tid) {
      query.tenantId = tid;
    }
    return this.categoryModel
      .find(query)
      .sort({ categoryName: 1 })
      .lean();
  }

  async findByType(tenantId: string, type: 'credit' | 'debit'): Promise<AdjustmentCategory[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = { isDeleted: false, type };
    if (tid) {
      query.tenantId = tid;
    }
    return this.categoryModel
      .find(query)
      .sort({ categoryName: 1 })
      .lean();
  }

  async create(tenantId: string, dto: CreateAdjustmentCategoryDto, userId?: string): Promise<AdjustmentCategory> {
    // Check if category with same name already exists for this tenant
    const tid = this.toObjectId(tenantId);
    const existingQuery: any = { 
      isDeleted: false, 
      categoryName: { $regex: new RegExp(`^${dto.categoryName}$`, 'i') },
      type: dto.type
    };
    if (tid) {
      existingQuery.tenantId = tid;
    }
    
    const existing = await this.categoryModel.findOne(existingQuery).lean();
    if (existing) {
      throw new BadRequestException(`Category '${dto.categoryName}' already exists for ${dto.type} type`);
    }

    const createdByObjectId = userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined;

    const category = new this.categoryModel({
      tenantId: this.toObjectId(tenantId),
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
    const tid = this.toObjectId(tenantId);
    const catId = this.toObjectId(categoryId);

    if (!catId) {
      throw new BadRequestException('Invalid category ID');
    }

    const query: any = { _id: catId, isDeleted: false };
    if (tid) {
      query.tenantId = tid;
    }

    const category = await this.categoryModel.findOne(query);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check for duplicate name if updating name
    if (dto.categoryName) {
      const duplicateQuery: any = {
        _id: { $ne: catId },
        isDeleted: false,
        categoryName: { $regex: new RegExp(`^${dto.categoryName}$`, 'i') },
        type: dto.type || category.type,
      };
      if (tid) {
        duplicateQuery.tenantId = tid;
      }

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
    const tid = this.toObjectId(tenantId);
    const catId = this.toObjectId(categoryId);

    if (!catId) {
      throw new BadRequestException('Invalid category ID');
    }

    const query: any = { _id: catId, isDeleted: false };
    if (tid) {
      query.tenantId = tid;
    }

    const category = await this.categoryModel.findOne(query);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.isDeleted = true;
    await category.save();

    return { success: true };
  }
}
