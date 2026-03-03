import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inventory } from '../schemas/inventory.schema';
import { InventoryReservation } from '../schemas/inventory-reservation.schema';
import { Tenant, TenantSchema } from '../../../core/tenant/schemas/tenant.schema';
import { CreateInventoryDto, UpdateInventoryDto, StockInDto, StockOutDto, CreateReservationDto, UpdateReservationDto } from '../dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
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

  async findAll(tenantCode: string, category?: string, search?: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const query: any = { tenantId, isDeleted: false };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    return this.inventoryModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(tenantCode: string, itemId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.inventoryModel.findOne({
      tenantId,
      itemId,
      isDeleted: false,
    }).exec();

    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }

    return item;
  }

  async create(tenantCode: string, createDto: CreateInventoryDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = new this.inventoryModel({
      ...createDto,
      tenantId,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
    return item.save();
  }

  async update(tenantCode: string, itemId: string, updateDto: UpdateInventoryDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.inventoryModel.findOneAndUpdate(
      { tenantId, itemId },
      { 
        $set: { 
          ...updateDto,
          lastUpdated: new Date().toISOString().split('T')[0],
        }
      },
      { new: true },
    ).exec();

    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }

    return item;
  }

  // ==================== RESERVATION METHODS ====================

  async createReservation(tenantCode: string, createDto: CreateReservationDto) {
    const tenantId = await this.getTenantId(tenantCode);
    
    // Check if item exists and has enough available stock
    const item = await this.inventoryModel.findOne({ tenantId, itemId: createDto.itemId }).exec();
    if (!item) {
      throw new NotFoundException(`Item ${createDto.itemId} not found`);
    }

    if (item.available < createDto.quantity) {
      throw new BadRequestException(
        `Insufficient available stock. Available: ${item.available}, Requested: ${createDto.quantity}`
      );
    }

    // Create reservation
    const reservationId = `RES${Date.now().toString(36).toUpperCase()}`;
    const reservation = new this.reservationModel({
      ...createDto,
      reservationId,
      tenantId,
      status: 'active',
      reservedDate: new Date().toISOString().split('T')[0],
    });

    // Update inventory reserved count
    const newReserved = item.reserved + createDto.quantity;
    const newAvailable = item.stock - newReserved;

    await this.inventoryModel.findOneAndUpdate(
      { tenantId, itemId: createDto.itemId },
      {
        $set: {
          reserved: newReserved,
          available: newAvailable,
          lastUpdated: new Date().toISOString().split('T')[0],
        }
      },
    ).exec();

    return reservation.save();
  }

  async getReservationsByProject(tenantCode: string, projectId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    return this.reservationModel
      .find({ tenantId, projectId, status: { $in: ['active', 'fulfilled'] } })
      .sort({ reservedDate: -1 })
      .exec();
  }

  async getReservationsByItem(tenantCode: string, itemId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    return this.reservationModel
      .find({ tenantId, itemId, status: { $in: ['active', 'fulfilled'] } })
      .sort({ reservedDate: -1 })
      .exec();
  }

  async updateReservation(
    tenantCode: string, 
    reservationId: string, 
    updateDto: UpdateReservationDto
  ) {
    const tenantId = await this.getTenantId(tenantCode);
    
    const reservation = await this.reservationModel.findOne({ tenantId, reservationId }).exec();
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }

    // If quantity is being updated, adjust inventory
    if (updateDto.quantity && updateDto.quantity !== reservation.quantity) {
      const item = await this.inventoryModel.findOne({ 
        tenantId, 
        itemId: reservation.itemId 
      }).exec();
      
      if (item) {
        const quantityDiff = updateDto.quantity - reservation.quantity;
        
        if (item.available < quantityDiff) {
          throw new BadRequestException(`Insufficient available stock for this update`);
        }

        const newReserved = item.reserved + quantityDiff;
        const newAvailable = item.stock - newReserved;

        await this.inventoryModel.findOneAndUpdate(
          { tenantId, itemId: reservation.itemId },
          {
            $set: {
              reserved: newReserved,
              available: newAvailable,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          },
        ).exec();
      }
    }

    // If status changed to cancelled, release the reservation
    if (updateDto.status === 'cancelled' && reservation.status !== 'cancelled') {
      const item = await this.inventoryModel.findOne({ 
        tenantId, 
        itemId: reservation.itemId 
      }).exec();
      
      if (item) {
        const newReserved = Math.max(0, item.reserved - reservation.quantity);
        const newAvailable = item.stock - newReserved;

        await this.inventoryModel.findOneAndUpdate(
          { tenantId, itemId: reservation.itemId },
          {
            $set: {
              reserved: newReserved,
              available: newAvailable,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          },
        ).exec();
      }
    }

    return this.reservationModel.findOneAndUpdate(
      { tenantId, reservationId },
      { $set: updateDto },
      { new: true },
    ).exec();
  }

  async cancelReservation(tenantCode: string, reservationId: string) {
    return this.updateReservation(tenantCode, reservationId, { status: 'cancelled' });
  }

  async fulfillReservation(tenantCode: string, reservationId: string) {
    return this.updateReservation(tenantCode, reservationId, { status: 'fulfilled' });
  }

  // Get item with reservation details
  async findOneWithReservations(tenantCode: string, itemId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    
    const [item, reservations] = await Promise.all([
      this.inventoryModel.findOne({ tenantId, itemId, isDeleted: false }).exec(),
      this.reservationModel
        .find({ tenantId, itemId, status: 'active' })
        .select('reservationId projectId quantity reservedDate notes')
        .sort({ reservedDate: -1 })
        .exec()
    ]);

    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }

    return {
      ...item.toObject(),
      reservations
    };
  }

  async stockIn(tenantCode: string, itemId: string, stockInDto: StockInDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.inventoryModel.findOne({ tenantId, itemId }).exec();

    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }

    const newStock = item.stock + stockInDto.quantity;
    const newAvailable = newStock - item.reserved;

    const updatedItem = await this.inventoryModel.findOneAndUpdate(
      { tenantId, itemId },
      {
        $set: {
          stock: newStock,
          available: newAvailable,
          lastUpdated: new Date().toISOString().split('T')[0],
        }
      },
      { new: true },
    ).exec();

    return updatedItem;
  }

  async stockOut(tenantCode: string, itemId: string, stockOutDto: StockOutDto) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.inventoryModel.findOne({ tenantId, itemId }).exec();

    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }

    if (item.available < stockOutDto.quantity) {
      throw new NotFoundException(`Insufficient stock. Available: ${item.available}`);
    }

    const newStock = item.stock - stockOutDto.quantity;
    const newAvailable = newStock - item.reserved;

    const updatedItem = await this.inventoryModel.findOneAndUpdate(
      { tenantId, itemId },
      {
        $set: {
          stock: newStock,
          available: newAvailable,
          lastUpdated: new Date().toISOString().split('T')[0],
        }
      },
      { new: true },
    ).exec();

    return updatedItem;
  }

  async remove(tenantCode: string, itemId: string) {
    const tenantId = await this.getTenantId(tenantCode);
    const item = await this.inventoryModel.findOneAndUpdate(
      { tenantId, itemId },
      { $set: { isDeleted: true } },
      { new: true },
    ).exec();

    if (!item) {
      throw new NotFoundException(`Item ${itemId} not found`);
    }

    return { message: `Item ${itemId} deleted successfully` };
  }

  async getStats(tenantCode: string) {
    const tenantId = await this.getTenantId(tenantCode);
    
    const items = await this.inventoryModel.find({ tenantId, isDeleted: false }).exec();
    
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.stock * item.rate), 0);
    const lowStockItems = items.filter(item => item.available <= item.minStock && item.available > 0).length;
    const outOfStockItems = items.filter(item => item.available === 0).length;

    return {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
    };
  }

  async getItemsByCategory(tenantCode: string) {
    const tenantId = await this.getTenantId(tenantCode);
    return this.inventoryModel.aggregate([
      {
        $match: {
          tenantId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$stock', '$rate'] } },
        },
      },
    ]).exec();
  }
}
