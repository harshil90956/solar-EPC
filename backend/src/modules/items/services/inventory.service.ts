import { Injectable, NotFoundException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inventory } from '../schemas/inventory.schema';
import { Item } from '../schemas/item.schema';
import { Warehouse } from '../schemas/warehouse.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { StockMovementService } from '../../inventory/services/stock-movement.service';

interface UserWithVisibility {
  id?: string;
  _id?: string;
  dataScope?: 'ALL' | 'ASSIGNED';
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,
    @InjectModel(Item.name) private readonly itemModel: Model<Item>,
    @InjectModel(Warehouse.name) private readonly warehouseModel: Model<Warehouse>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @Inject(forwardRef(() => StockMovementService)) private readonly stockMovementService: StockMovementService,
  ) {}

  private async getTenantId(tenantCode: string): Promise<string> {
    const tenantByCode = await this.tenantModel.findOne({ code: tenantCode });
    if (tenantByCode) {
      return tenantByCode._id.toString();
    }
    
    if (Types.ObjectId.isValid(tenantCode)) {
      const tenantById = await this.tenantModel.findById(tenantCode);
      if (tenantById) {
        return tenantById._id.toString();
      }
    }
    
    throw new NotFoundException(`Tenant ${tenantCode} not found`);
  }

  // Get all inventory records with item + warehouse info
  async findAll(tenantId: string, user?: UserWithVisibility, warehouseId?: string, search?: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    const query: any = { tenantId: actualTenantId, isDeleted: false };
    
    if (warehouseId) {
      query.warehouseId = new Types.ObjectId(warehouseId);
    }

    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
      ];
    }

    const inventory = await this.inventoryModel.find(query)
      .populate('itemId', 'description category unit rate')
      .populate('warehouseId', 'name location')
      .sort({ createdAt: -1 })
      .exec();

    // Calculate available stock and status for each
    return inventory.map(inv => {
      const available = (inv.stock || 0) - (inv.reserved || 0);
      let status = 'Available';
      if (inv.stock === 0) status = 'Out of Stock';
      else if (inv.stock <= inv.minStock) status = 'Low Stock';
      else if (inv.reserved > 0) status = 'Reserved';

      return {
        ...inv.toObject(),
        available,
        status,
      };
    });
  }

  // Get single inventory record
  async findOne(tenantId: string, id: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    const inventory = await this.inventoryModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(id),
      isDeleted: false,
    })
    .populate('itemId', 'description category unit rate minStock')
    .populate('warehouseId', 'name location')
    .exec();

    if (!inventory) {
      throw new NotFoundException(`Inventory record ${id} not found`);
    }

    const available = (inventory.stock || 0) - (inventory.reserved || 0);
    return { ...inventory.toObject(), available };
  }

  // Create inventory record (item + warehouse combination)
  async create(tenantId: string, data: {
    itemId: string;
    warehouseId: string;
    stock?: number;
    minStock?: number;
    rate?: number;
  }) {
    const actualTenantId = await this.getTenantId(tenantId);

    // Get item details
    const item = await this.itemModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(data.itemId),
      isDeleted: false,
    }).exec();

    if (!item) {
      throw new NotFoundException(`Item ${data.itemId} not found`);
    }

    // Get warehouse details
    const warehouse = await this.warehouseModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(data.warehouseId),
      isDeleted: false,
    }).exec();

    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${data.warehouseId} not found`);
    }

    // Check if combination already exists
    const existing = await this.inventoryModel.findOne({
      tenantId: actualTenantId,
      itemId: new Types.ObjectId(data.itemId),
      warehouseId: new Types.ObjectId(data.warehouseId),
      isDeleted: false,
    }).exec();

    if (existing) {
      throw new ConflictException(`Item already exists in this warehouse. Use stock-in instead.`);
    }

    const inventory = new this.inventoryModel({
      itemId: new Types.ObjectId(data.itemId),
      itemCode: item.itemId || item._id.toString(),
      itemName: item.description,
      warehouseId: new Types.ObjectId(data.warehouseId),
      warehouseName: warehouse.name,
      stock: data.stock || 0,
      reserved: 0,
      minStock: data.minStock || item.minStock || 0,
      category: item.category,
      unit: item.unit,
      rate: data.rate || item.rate,
      tenantId: actualTenantId,
    });

    return inventory.save();
  }

  // Stock In - Add stock to warehouse
  async stockIn(tenantId: string, inventoryId: string, quantity: number, poReference?: string, remarks?: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    
    const inventory = await this.inventoryModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(inventoryId),
      isDeleted: false,
    }).exec();

    if (!inventory) {
      throw new NotFoundException(`Inventory record ${inventoryId} not found`);
    }

    const updated = await this.inventoryModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(inventoryId) },
      { $inc: { stock: quantity } },
      { new: true },
    ).exec();

    return { 
      data: updated, 
      message: `Stock in successful. Added ${quantity} units to ${inventory.warehouseName}.` 
    };
  }

  // Stock Out - Remove stock from warehouse (for project allocation)
  async stockOut(tenantId: string, inventoryId: string, quantity: number, projectId?: string, remarks?: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    
    const inventory = await this.inventoryModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(inventoryId),
      isDeleted: false,
    }).exec();

    if (!inventory) {
      throw new NotFoundException(`Inventory record ${inventoryId} not found`);
    }

    const available = (inventory.stock || 0) - (inventory.reserved || 0);
    if (available < quantity) {
      throw new NotFoundException(`Insufficient stock. Available: ${available}`);
    }

    const updated = await this.inventoryModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(inventoryId) },
      { $inc: { reserved: quantity } },
      { new: true },
    ).exec();

    return { 
      data: updated, 
      message: `Stock reserved successfully. ${quantity} units reserved for project ${projectId || 'N/A'} in ${inventory.warehouseName}.` 
    };
  }

  // Transfer stock between warehouses
  async transfer(tenantId: string, fromInventoryId: string, toWarehouseId: string, quantity: number, remarks?: string) {
    const actualTenantId = await this.getTenantId(tenantId);

    // Get source inventory
    const sourceInv = await this.inventoryModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(fromInventoryId),
      isDeleted: false,
    }).exec();

    if (!sourceInv) {
      throw new NotFoundException(`Source inventory record not found`);
    }

    const available = (sourceInv.stock || 0) - (sourceInv.reserved || 0);
    if (available < quantity) {
      throw new NotFoundException(`Insufficient stock in ${sourceInv.warehouseName}. Available: ${available}`);
    }

    // Get destination warehouse
    const destWarehouse = await this.warehouseModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(toWarehouseId),
      isDeleted: false,
    }).exec();

    if (!destWarehouse) {
      throw new NotFoundException(`Destination warehouse not found`);
    }

    // Check if item already exists in destination
    let destInv = await this.inventoryModel.findOne({
      tenantId: actualTenantId,
      itemId: sourceInv.itemId,
      warehouseId: new Types.ObjectId(toWarehouseId),
      isDeleted: false,
    }).exec();

    // Start transfer
    if (destInv) {
      // Update existing destination inventory
      await this.inventoryModel.findOneAndUpdate(
        { tenantId: actualTenantId, _id: destInv._id },
        { $inc: { stock: quantity } },
      ).exec();
    } else {
      // Create new inventory record in destination
      destInv = new this.inventoryModel({
        itemId: sourceInv.itemId,
        itemCode: sourceInv.itemCode,
        itemName: sourceInv.itemName,
        warehouseId: new Types.ObjectId(toWarehouseId),
        warehouseName: destWarehouse.name,
        stock: quantity,
        reserved: 0,
        minStock: sourceInv.minStock,
        category: sourceInv.category,
        unit: sourceInv.unit,
        rate: sourceInv.rate,
        tenantId: actualTenantId,
      });
      await destInv.save();
    }

    // Reduce from source
    await this.inventoryModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: sourceInv._id },
      { $inc: { stock: -quantity } },
    ).exec();

    // Log stock movement for TRANSFER (source - outgoing, negative)
    try {
      console.log(`[INVENTORY TRANSFER] Logging TRANSFER movement from source ${sourceInv.warehouseName}, qty: -${quantity}`);
      await this.stockMovementService.logMovement(tenantId, {
        itemId: sourceInv.itemId.toString(),
        type: 'TRANSFER',
        quantity: -quantity,
        reference: `Transfer to ${destWarehouse.name}`,
        referenceType: 'TRANSFER',
        note: remarks || `Transferred out ${quantity} units from ${sourceInv.warehouseName} to ${destWarehouse.name}`,
        warehouseName: sourceInv.warehouseName,
      });
      console.log(`[INVENTORY TRANSFER] Source TRANSFER logged successfully`);
    } catch (err) {
      console.error('[INVENTORY TRANSFER] Failed to log source TRANSFER:', err);
    }

    // Log stock movement for TRANSFER (destination - incoming, positive)
    try {
      console.log(`[INVENTORY TRANSFER] Logging TRANSFER movement to destination ${destWarehouse.name}, qty: ${quantity}`);
      await this.stockMovementService.logMovement(tenantId, {
        itemId: sourceInv.itemId.toString(),
        type: 'TRANSFER',
        quantity: quantity,
        reference: `Transfer from ${sourceInv.warehouseName}`,
        referenceType: 'TRANSFER',
        note: remarks || `Received ${quantity} units from ${sourceInv.warehouseName} to ${destWarehouse.name}`,
        warehouseName: destWarehouse.name,
      });
      console.log(`[INVENTORY TRANSFER] Destination TRANSFER logged successfully`);
    } catch (err) {
      console.error('[INVENTORY TRANSFER] Failed to log destination TRANSFER:', err);
    }

    return {
      message: `Transfer successful. ${quantity} units transferred from ${sourceInv.warehouseName} to ${destWarehouse.name}.`,
      source: sourceInv.warehouseName,
      destination: destWarehouse.name,
      quantity,
    };
  }

  // Get inventory statistics
  async getStats(tenantId: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    
    const allInventory = await this.inventoryModel.find({
      tenantId: actualTenantId,
      isDeleted: false,
    }).exec();

    const totalStock = allInventory.reduce((sum, inv) => sum + (inv.stock || 0), 0);
    const totalReserved = allInventory.reduce((sum, inv) => sum + (inv.reserved || 0), 0);
    const totalValue = allInventory.reduce((sum, inv) => sum + ((inv.stock || 0) * (inv.rate || 0)), 0);
    
    const lowStock = allInventory.filter(inv => {
      const available = (inv.stock || 0) - (inv.reserved || 0);
      return available > 0 && available <= inv.minStock;
    }).length;

    const outOfStock = allInventory.filter(inv => (inv.stock || 0) === 0).length;

    return {
      totalItems: allInventory.length,
      totalStock,
      totalReserved,
      totalValue,
      lowStockItems: lowStock,
      outOfStockItems: outOfStock,
      availableStock: totalStock - totalReserved,
    };
  }

  // Delete inventory record
  async remove(tenantId: string, id: string) {
    const actualTenantId = await this.getTenantId(tenantId);
    
    const inventory = await this.inventoryModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(id),
      isDeleted: false,
    }).exec();

    if (!inventory) {
      throw new NotFoundException(`Inventory record ${id} not found`);
    }

    await this.inventoryModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(id) },
      { isDeleted: true, deletedAt: new Date() },
    ).exec();

    return { message: 'Inventory record deleted successfully' };
  }
}
