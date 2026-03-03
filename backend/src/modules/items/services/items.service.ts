import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Item } from '../schemas/item.schema';
import { CreateItemDto, UpdateItemDto } from '../dto/item.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item.name) private readonly itemModel: Model<Item>,
  ) {}

  async findAll(tenantId: string, search?: string, itemGroupId?: string) {
    const query: any = { tenantId, isDeleted: false };
    
    if (search) {
      query.$text = { $search: search };
    }

    if (itemGroupId) {
      query.itemGroupId = itemGroupId;
    }

    return this.itemModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.itemModel.findOne({
      tenantId,
      _id: new Types.ObjectId(id),
      isDeleted: false,
    }).exec();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    return item;
  }

  async create(tenantId: string, createItemDto: CreateItemDto) {
    const item = new this.itemModel({
      ...createItemDto,
      tenantId,
    });
    return item.save();
  }

  async update(tenantId: string, id: string, updateItemDto: UpdateItemDto) {
    const item = await this.itemModel.findOneAndUpdate(
      { tenantId, _id: new Types.ObjectId(id) },
      { $set: updateItemDto },
      { new: true },
    ).exec();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    return item;
  }

  async remove(tenantId: string, id: string) {
    const item = await this.itemModel.findOneAndUpdate(
      { tenantId, _id: new Types.ObjectId(id) },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    return { message: `Item ${id} deleted successfully` };
  }

  async bulkDelete(tenantId: string, ids: string[]) {
    const objectIds = ids.map(id => new Types.ObjectId(id));
    await this.itemModel.updateMany(
      { tenantId, _id: { $in: objectIds } },
      { $set: { isDeleted: true } }
    ).exec();
    return { message: `${ids.length} items deleted successfully` };
  }
}
