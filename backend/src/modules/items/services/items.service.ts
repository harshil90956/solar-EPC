import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Item } from '../schemas/item.schema';
import { InventoryReservation } from '../../inventory/schemas/inventory-reservation.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { CreateItemDto, UpdateItemDto } from '../dto/item.dto';

interface UserWithVisibility {
  id?: string;
  _id?: string;
  dataScope?: 'ALL' | 'ASSIGNED';
}

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item.name) private readonly itemModel: Model<Item>,
    @InjectModel(InventoryReservation.name) private readonly reservationModel: Model<InventoryReservation>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<string> {
    // First, try to find by code
    const tenantByCode = await this.tenantModel.findOne({ code: tenantCode });
    if (tenantByCode) {
      return tenantByCode._id.toString();
    }
    
    // If not found by code, and input looks like ObjectId, try to find by _id
    if (Types.ObjectId.isValid(tenantCode)) {
      const tenantById = await this.tenantModel.findById(tenantCode);
      if (tenantById) {
        return tenantById._id.toString();
      }
    }
    
    throw new NotFoundException(`Tenant ${tenantCode} not found`);
  }

  async findAll(tenantId: string, user?: UserWithVisibility, search?: string, itemGroupId?: string) {
    // Resolve tenant code to actual ObjectId
    const actualTenantId = await this.getTenantId(tenantId);
    const query: any = { tenantId: actualTenantId, isDeleted: false };
    
    console.log(`[ITEMS VISIBILITY] user?.dataScope:`, user?.dataScope);
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        query.assignedTo = objectId;
        console.log(`[ITEMS VISIBILITY] Applied STRICT assignedTo filter:`, objectId);
      }
    } else {
      console.log(`[ITEMS VISIBILITY] No filter - ALL scope or no user`);
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    if (itemGroupId) {
      query.itemGroupId = itemGroupId;
    }

    return this.itemModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(tenantId: string, id: string) {
    // Resolve tenant code to actual ObjectId
    const actualTenantId = await this.getTenantId(tenantId);
    const item = await this.itemModel.findOne({
      tenantId: actualTenantId,
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
    // Resolve tenant code to actual ObjectId
    const actualTenantId = await this.getTenantId(tenantId);
    const item = await this.itemModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(id) },
      { $set: updateItemDto },
      { new: true },
    ).exec();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    return item;
  }

  async remove(tenantId: string, id: string) {
    // Resolve tenant code to actual ObjectId
    const actualTenantId = await this.getTenantId(tenantId);
    const item = await this.itemModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(id),
      isDeleted: false,
    }).exec();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    await this.itemModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(id) },
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    ).exec();

    return { data: null, message: 'Item deleted successfully' };
  }

  async bulkDelete(tenantId: string, ids: string[]) {
    const objectIds = ids.map(id => new Types.ObjectId(id));
    await this.itemModel.updateMany(
      { tenantId, _id: { $in: objectIds } },
      { $set: { isDeleted: true } }
    ).exec();
    return { message: `${ids.length} items deleted successfully` };
  }

  async stockIn(tenantId: string, id: string, quantity: number, poReference?: string, receivedDate?: string, remarks?: string) {
    // Resolve tenant code to actual ObjectId
    const actualTenantId = await this.getTenantId(tenantId);
    const item = await this.itemModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(id),
      isDeleted: false,
    }).exec();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    const updated = await this.itemModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(id) },
      { 
        $inc: { stock: quantity },
      },
      { new: true },
    ).exec();

    return { data: updated, message: `Stock in successful. Added ${quantity} units.` };
  }

  async stockOut(tenantId: string, id: string, quantity: number, projectId?: string, issuedDate?: string, remarks?: string) {
    // Resolve tenant code to actual ObjectId
    const actualTenantId = await this.getTenantId(tenantId);
    const item = await this.itemModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(id),
      isDeleted: false,
    }).exec();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    if ((item.stock || 0) < quantity) {
      throw new NotFoundException(`Insufficient stock. Available: ${item.stock || 0}`);
    }

    const updated = await this.itemModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(id) },
      { 
        $inc: { stock: -quantity, reserved: quantity },
      },
      { new: true },
    ).exec();

    return { data: updated, message: `Stock out successful. Issued ${quantity} units to project ${projectId || 'N/A'}.` };
  }
}
