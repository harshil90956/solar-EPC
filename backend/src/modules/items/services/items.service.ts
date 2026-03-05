import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Item } from '../schemas/item.schema';
import { InventoryReservation } from '../../inventory/schemas/inventory-reservation.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { CreateItemDto, UpdateItemDto } from '../dto/item.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item.name) private readonly itemModel: Model<Item>,
    @InjectModel(InventoryReservation.name) private readonly reservationModel: Model<InventoryReservation>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<Types.ObjectId> {
    const tenant = await this.tenantModel.findOne({ code: tenantCode });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantCode} not found`);
    }
    return tenant._id as Types.ObjectId;
  }

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

  async stockIn(tenantId: string, id: string, quantity: number, poReference?: string, receivedDate?: string, remarks?: string) {
    const item = await this.itemModel.findOneAndUpdate(
      { tenantId, _id: new Types.ObjectId(id), isDeleted: false },
      { $inc: { stock: quantity } },
      { new: true },
    ).exec();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    return { data: item, message: `Stock in successful. Added ${quantity} units.` };
  }

  async stockOut(tenantId: string, id: string, quantity: number, projectId?: string, issuedDate?: string, remarks?: string, projectName?: string) {
    const item = await this.itemModel.findOne({
      tenantId,
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
      { tenantId, _id: new Types.ObjectId(id) },
      { 
        $inc: { stock: -quantity, reserved: quantity },
      },
      { new: true },
    ).exec();

    // Create reservation record if projectId is provided
    if (projectId && updated) {
      try {
        const realTenantId = await this.getTenantId(tenantId);
        const reservationId = `RES${Date.now().toString(36).toUpperCase()}`;
        const reservation = new this.reservationModel({
          reservationId,
          itemId: item.itemId || id,
          projectId,
          projectName: projectName || '',
          quantity,
          status: 'active',
          reservedDate: issuedDate || new Date().toISOString().split('T')[0],
          notes: remarks || `Stock issued for project ${projectId}`,
          tenantId: realTenantId,
          isDeleted: false,
        });
        await reservation.save();
      } catch (err) {
        console.error('Error creating reservation record:', err);
        // Don't fail the stock-out if reservation creation fails
      }
    }

    return { data: updated, message: `Stock out successful. Issued ${quantity} units to project ${projectId || 'N/A'}.` };
  }
}
