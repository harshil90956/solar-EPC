import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StockMovement, StockMovementType } from '../schemas/stock-movement.schema';
import { Inventory } from '../schemas/inventory.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';

interface CreateStockMovementDto {
  itemId: string;
  itemDescription: string;
  warehouseId?: string;
  warehouseName?: string;
  type: StockMovementType;
  quantity: number;
  stockBefore?: number;
  stockAfter?: number;
  reservedBefore?: number;
  reservedAfter?: number;
  reference?: string;
  referenceType?: string;
  customerName?: string;
  note?: string;
  createdBy?: string;
  createdByName?: string;
}

interface QueryStockMovementsDto {
  itemId?: string;
  warehouseId?: string;
  type?: StockMovementType;
  startDate?: Date;
  endDate?: Date;
  reference?: string;
}

@Injectable()
export class StockMovementService {
  constructor(
    @InjectModel(StockMovement.name) private readonly stockMovementModel: Model<StockMovement>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
  ) {}

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new Error('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    // Try to find by code if it's not a valid ObjectId
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new Error(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  /**
   * Create a stock movement record
   * This should be called whenever inventory changes
   */
  async create(tenantCode: string, dto: CreateStockMovementDto): Promise<StockMovement> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    // Convert string IDs to ObjectIds if provided
    const itemObjectId = Types.ObjectId.isValid(dto.itemId) 
      ? new Types.ObjectId(dto.itemId) 
      : undefined;
    
    const warehouseObjectId = dto.warehouseId && Types.ObjectId.isValid(dto.warehouseId)
      ? new Types.ObjectId(dto.warehouseId)
      : undefined;
    
    const createdByObjectId = dto.createdBy && Types.ObjectId.isValid(dto.createdBy)
      ? new Types.ObjectId(dto.createdBy)
      : undefined;

    const movement = new this.stockMovementModel({
      ...dto,
      itemId: itemObjectId || dto.itemId,
      warehouseId: warehouseObjectId,
      createdBy: createdByObjectId,
      tenantId,
      isDeleted: false,
    });

    return movement.save();
  }

  /**
   * Log stock movement from an inventory operation
   * Automatically captures before/after states
   */
  async logMovement(
    tenantCode: string,
    data: {
      itemId: string;
      type: StockMovementType;
      quantity: number;
      reference?: string;
      referenceType?: string;
      customerName?: string;
      note?: string;
      createdBy?: string;
      createdByName?: string;
      warehouseId?: string;
      warehouseName?: string;
    }
  ): Promise<StockMovement> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    // Get current inventory state
    const item = await this.inventoryModel.findOne({ 
      $or: [
        { _id: Types.ObjectId.isValid(data.itemId) ? new Types.ObjectId(data.itemId) : undefined },
        { itemId: data.itemId }
      ],
      tenantId 
    }).exec();

    const itemDescription = item?.name || data.itemId;
    const stockBefore = item?.stock || 0;
    const reservedBefore = item?.reserved || 0;

    // Calculate stock after based on movement type
    let stockAfter = stockBefore;
    let reservedAfter = reservedBefore;

    switch (data.type) {
      case 'PURCHASE':
        stockAfter = stockBefore + data.quantity;
        break;
      case 'RESERVE':
        reservedAfter = reservedBefore + data.quantity;
        break;
      case 'RELEASE':
        reservedAfter = Math.max(0, reservedBefore - data.quantity);
        break;
      case 'TRANSFER':
        // Stock stays same but warehouse changes
        break;
      case 'DISPATCH':
        stockAfter = stockBefore - data.quantity;
        reservedAfter = Math.max(0, reservedBefore - data.quantity);
        break;
      case 'CONSUME':
        stockAfter = stockBefore - data.quantity;
        break;
      case 'ADJUSTMENT':
        stockAfter = data.quantity; // For adjustment, quantity is the new value
        break;
    }

    return this.create(tenantCode, {
      ...data,
      itemDescription,
      warehouseName: data.warehouseName || item?.warehouse,
      stockBefore,
      stockAfter,
      reservedBefore,
      reservedAfter,
      note: data.note || `${data.type}: ${data.quantity} units`,
    });
  }

  /**
   * Get all stock movements with optional filters
   */
  async findAll(
    tenantCode: string, 
    query: QueryStockMovementsDto = {},
    page = 1,
    limit = 50
  ): Promise<{ data: StockMovement[]; total: number; page: number; totalPages: number }> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const tenantIdStr = tenantId.toString();

    const filter: any = { tenantId: tenantIdStr, isDeleted: false };
    console.log(`[StockMovement.findAll] tenantIdStr: ${tenantIdStr}, query:`, query);

    if (query.itemId) {
      // If user types 'INV3552', we need to find the Mongo _id for that item
      const invQuery = {
        tenantId,
        $or: [
          { itemId: { $regex: query.itemId, $options: 'i' } },
          ...(Types.ObjectId.isValid(query.itemId) ? [{ _id: new Types.ObjectId(query.itemId) }] : [])
        ]
      };
      console.log(`[StockMovement.findAll] Looking up inventory with query:`, invQuery);
      const invItems = await this.inventoryModel.find(invQuery, { _id: 1 }).lean();
      console.log(`[StockMovement.findAll] Found invItems:`, invItems.map(i => i._id.toString()));

      if (invItems.length > 0) {
        // Stock movements store itemId as STRING (not ObjectId), so we need to match strings
        filter.itemId = { $in: invItems.map(i => i._id.toString()) };
        console.log(`[StockMovement.findAll] Setting filter.itemId:`, filter.itemId);
      } else if (Types.ObjectId.isValid(query.itemId)) {
        filter.itemId = query.itemId.toString();
        console.log(`[StockMovement.findAll] Setting filter.itemId from valid ObjectId:`, filter.itemId);
      } else {
        // Fallback search by description
        filter.itemDescription = { $regex: query.itemId, $options: 'i' };
        console.log(`[StockMovement.findAll] Fallback to itemDescription search`);
      }
    }

    if (query.warehouseId) {
      // UI sends warehouse search text; support both ObjectId warehouseId and warehouseName text.
      if (Types.ObjectId.isValid(query.warehouseId)) {
        filter.warehouseId = new Types.ObjectId(query.warehouseId);
      } else {
        filter.warehouseName = { $regex: query.warehouseId, $options: 'i' };
      }
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.reference) {
      filter.$or = [
        { reference: { $regex: query.reference, $options: 'i' } },
        { customerName: { $regex: query.reference, $options: 'i' } }
      ];
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = query.startDate;
      }
      if (query.endDate) {
        filter.createdAt.$lte = query.endDate;
      }
    }

    console.log(`[StockMovement.findAll] Final filter:`, JSON.stringify(filter));

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.stockMovementModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stockMovementModel.countDocuments(filter).exec(),
    ]);

    console.log(`[StockMovement.findAll] Found ${data.length} movements, total: ${total}`);
    console.log(`[StockMovement.findAll] Movement types found:`, data.map(m => m.type));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Get stock movements for a specific item
   */
  async findByItem(
    tenantCode: string, 
    itemId: string,
    page = 1,
    limit = 50
  ): Promise<{ data: StockMovement[]; total: number; page: number; totalPages: number }> {
    return this.findAll(tenantCode, { itemId }, page, limit);
  }

  /**
   * Get stock movements for a specific warehouse
   */
  async findByWarehouse(
    tenantCode: string,
    warehouseId: string,
    page = 1,
    limit = 50
  ): Promise<{ data: StockMovement[]; total: number; page: number; totalPages: number }> {
    return this.findAll(tenantCode, { warehouseId }, page, limit);
  }

  /**
   * Get a single stock movement by ID
   */
  async findOne(tenantCode: string, id: string): Promise<StockMovement> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    const movement = await this.stockMovementModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId,
      isDeleted: false,
    }).exec();

    if (!movement) {
      throw new NotFoundException(`Stock movement ${id} not found`);
    }

    return movement;
  }

  /**
   * Get stock movement statistics
   */
  async getStats(tenantCode: string, startDate?: Date, endDate?: Date): Promise<any> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const tenantIdStr = tenantId.toString();

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    const matchStage = {
      tenantId: tenantIdStr,
      isDeleted: false,
      ...dateFilter,
    };

    console.log(`[StockMovement.getStats] matchStage:`, JSON.stringify(matchStage));

    const stats = await this.stockMovementModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
        },
      },
    ]).exec();

    console.log(`[StockMovement.getStats] Aggregation result:`, stats);

    // Get item-wise movement summary
    const itemStats = await this.stockMovementModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$itemId',
          itemDescription: { $first: '$itemDescription' },
          movementCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $sort: { movementCount: -1 } },
      { $limit: 10 },
    ]).exec();

    return {
      byType: stats,
      topItems: itemStats,
    };
  }

  /**
   * Get stock ledger for an item (running balance)
   */
  async getStockLedger(
    tenantCode: string,
    itemId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<StockMovement[]> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    const filter: any = {
      tenantId,
      isDeleted: false,
      $or: [
        { itemId },
        ...(Types.ObjectId.isValid(itemId) ? [{ itemId: new Types.ObjectId(itemId) }] : [])
      ],
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    return this.stockMovementModel
      .find(filter)
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Soft delete a stock movement (for admin corrections)
   */
  async remove(tenantCode: string, id: string): Promise<{ message: string }> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    const movement = await this.stockMovementModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId },
      { $set: { isDeleted: true } },
      { new: true }
    ).exec();

    if (!movement) {
      throw new NotFoundException(`Stock movement ${id} not found`);
    }

    return { message: `Stock movement ${id} deleted successfully` };
  }
}
