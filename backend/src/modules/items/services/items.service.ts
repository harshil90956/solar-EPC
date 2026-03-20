import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Item } from '../schemas/item.schema';
import { InventoryReservation } from '../../inventory/schemas/inventory-reservation.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { StockMovementService } from '../../inventory/services/stock-movement.service';
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
    @Inject(forwardRef(() => StockMovementService)) private readonly stockMovementService: StockMovementService,
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
        // Show items assigned to user OR items with no assignedTo (for backward compatibility)
        query.$or = [
          { assignedTo: objectId },
          { assignedTo: { $exists: false } },
          { assignedTo: null }
        ];
        console.log(`[ITEMS VISIBILITY] Applied ASSIGNED filter (including unassigned items):`, objectId);
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
    
    // Get original item to compare stock changes
    const originalItem = await this.itemModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(id),
    }).exec();
    
    const item = await this.itemModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(id) },
      { $set: updateItemDto },
      { new: true },
    ).exec();

    if (!item) {
      throw new NotFoundException(`Item ${id} not found`);
    }

    // Log stock movement if stock increased (PURCHASE)
    if (updateItemDto.stock !== undefined && originalItem && updateItemDto.stock > (originalItem.stock || 0)) {
      const quantity = updateItemDto.stock - (originalItem.stock || 0);
      try {
        console.log(`[ITEMS UPDATE] Logging PURCHASE movement for item: ${item._id.toString()}, qty: ${quantity}`);
        await this.stockMovementService.logMovement(tenantId, {
          itemId: item._id.toString(),
          type: 'PURCHASE',
          quantity: quantity,
          reference: 'Direct Update',
          referenceType: 'PO',
          note: `Stock increased by ${quantity} units via item update`,
          warehouseName: item.warehouse,
        });
        console.log(`[ITEMS UPDATE] PURCHASE logged successfully`);
      } catch (err) {
        console.error('[ITEMS UPDATE] Failed to log PURCHASE:', err);
      }
    }

    // Log stock movement if reserved increased (RESERVE)
    if (updateItemDto.reserved !== undefined && originalItem && updateItemDto.reserved > (originalItem.reserved || 0)) {
      const quantity = updateItemDto.reserved - (originalItem.reserved || 0);
      try {
        console.log(`[ITEMS UPDATE] Logging RESERVE movement for item: ${item._id.toString()}, qty: ${quantity}`);
        await this.stockMovementService.logMovement(tenantId, {
          itemId: item._id.toString(),
          type: 'RESERVE',
          quantity: quantity,
          reference: 'Project Reservation',
          referenceType: 'PROJECT',
          note: `Reserved ${quantity} units via item update`,
          warehouseName: item.warehouse,
        });
        console.log(`[ITEMS UPDATE] RESERVE logged successfully`);
      } catch (err) {
        console.error('[ITEMS UPDATE] Failed to log RESERVE:', err);
      }
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

  async stockIn(tenantId: string, id: string, quantity: number, poReference?: string, receivedDate?: string, remarks?: string, warehouse?: string) {
    console.log(`[STOCK-IN] Received tenantId: ${tenantId}, itemId: ${id}`);
    const actualTenantId = await this.getTenantId(tenantId);
    console.log(`[STOCK-IN] Resolved actualTenantId: ${actualTenantId}`);
    
    const item = await this.itemModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(id),
      isDeleted: false,
    }).exec();

    if (!item) {
      console.log(`[STOCK-IN] Item not found. Query: { tenantId: ${actualTenantId}, _id: ${id}, isDeleted: false }`);
      const itemAnyTenant = await this.itemModel.findById(id).exec();
      console.log(`[STOCK-IN] Item without tenant filter:`, itemAnyTenant ? `Found (tenantId: ${itemAnyTenant.tenantId})` : 'Not found');
      throw new NotFoundException(`Item ${id} not found`);
    }

    // If warehouse differs from current item's warehouse → create new record for that warehouse
    if (warehouse && warehouse !== item.warehouse) {
      // Check if a record already exists for this item + warehouse combo
      const existingWarehouseRecord = await this.itemModel.findOne({
        tenantId: actualTenantId,
        itemId: item.itemId,
        warehouse,
        isDeleted: false,
      }).exec();

      if (existingWarehouseRecord) {
        // Update the existing warehouse record
        const updated = await this.itemModel.findOneAndUpdate(
          { tenantId: actualTenantId, _id: existingWarehouseRecord._id },
          {
            $inc: { stock: quantity },
            ...(poReference ? { $set: { poReference } } : {}),
          },
          { new: true },
        ).exec();
        return { data: updated, message: `Stock in successful. Added ${quantity} units to ${warehouse}.` };
      } else {
        // Create a new item record for this warehouse (clone of original item, new warehouse + stock)
        const newWarehouseItem = new this.itemModel({
          itemId: item.itemId,
          description: item.description,
          longDescription: item.longDescription,
          rate: item.rate,
          tax1: item.tax1,
          tax2: item.tax2,
          unit: item.unit,
          category: item.category,
          warehouse,
          stock: quantity,
          reserved: 0,
          minStock: item.minStock,
          status: item.status,
          itemGroupId: item.itemGroupId,
          itemGroupName: item.itemGroupName,
          tenantId: actualTenantId,
          isDeleted: false,
          ...(poReference ? { poReference } : {}),
        });
        const saved = await newWarehouseItem.save();
        
        // Log stock movement for PURCHASE (new warehouse)
        try {
          console.log(`[ITEMS STOCK-IN] Logging PURCHASE movement for new warehouse`);
          await this.stockMovementService.logMovement(tenantId, {
            itemId: saved._id.toString(),
            type: 'PURCHASE',
            quantity: quantity,
            reference: poReference,
            referenceType: 'PO',
            note: remarks || `Stock in: ${quantity} units to ${warehouse}`,
            warehouseName: warehouse,
          });
          console.log(`[ITEMS STOCK-IN] PURCHASE logged successfully`);
        } catch (err) {
          console.error('[ITEMS STOCK-IN] Failed to log PURCHASE:', err);
        }
        
        return { data: saved, message: `Stock in successful. Created ${quantity} units in ${warehouse}.` };
      }
    }

    // Same warehouse or no warehouse specified → update existing record
    const updated = await this.itemModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(id) },
      { 
        $inc: { stock: quantity },
        ...(poReference || warehouse ? { $set: { ...(poReference ? { poReference } : {}), ...(warehouse ? { warehouse } : {}) } } : {}),
      },
      { new: true },
    ).exec();

    // Log stock movement for PURCHASE (same warehouse)
    try {
      console.log(`[ITEMS STOCK-IN] Logging PURCHASE movement for item: ${updated?._id?.toString()}`);
      await this.stockMovementService.logMovement(tenantId, {
        itemId: updated?._id?.toString() || id,
        type: 'PURCHASE',
        quantity: quantity,
        reference: poReference,
        referenceType: 'PO',
        note: remarks || `Stock in: ${quantity} units`,
        warehouseName: updated?.warehouse || warehouse,
      });
      console.log(`[ITEMS STOCK-IN] PURCHASE logged successfully`);
    } catch (err) {
      console.error('[ITEMS STOCK-IN] Failed to log PURCHASE:', err);
    }

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

    if ((item.stock || 0) - (item.reserved || 0) < quantity) {
      throw new NotFoundException(`Insufficient available stock. Available: ${(item.stock || 0) - (item.reserved || 0)}`);
    }

    const updated = await this.itemModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: new Types.ObjectId(id) },
      { 
        $inc: { reserved: quantity },
      },
      { new: true },
    ).exec();

    // Create reservation record for project
    if (projectId) {
      console.log(`[STOCK-OUT] Creating reservation for project ${projectId}, item ${item.itemId}, qty ${quantity}`);
      try {
        const reservation = new this.reservationModel({
          reservationId: `RES-${Date.now()}`,
          itemId: item.itemId,
          projectId: projectId,
          quantity: quantity,
          status: 'active',
          notes: remarks || `Stock issued on ${issuedDate || new Date().toISOString().split('T')[0]}`,
          tenantId: new Types.ObjectId(actualTenantId),
        });
        console.log('[STOCK-OUT] Reservation object created:', reservation);
        const saved = await reservation.save();
        console.log('[STOCK-OUT] Reservation saved successfully:', saved);
        
        // Log stock movement for RESERVE
        try {
          console.log(`[ITEMS STOCK-OUT] Logging RESERVE movement for item: ${item._id.toString()}`);
          await this.stockMovementService.logMovement(tenantId, {
            itemId: item._id.toString(),
            type: 'RESERVE',
            quantity: quantity,
            reference: projectId,
            referenceType: 'PROJECT',
            note: remarks || `Reserved ${quantity} units for project ${projectId}`,
            warehouseName: item.warehouse,
          });
          console.log(`[ITEMS STOCK-OUT] RESERVE logged successfully`);
        } catch (err) {
          console.error('[ITEMS STOCK-OUT] Failed to log RESERVE:', err);
        }
      } catch (err) {
        console.error('[STOCK-OUT] Failed to create reservation record:', err);
        // Don't fail the stock-out if reservation creation fails
      }
    } else {
      console.log('[STOCK-OUT] No projectId provided, skipping reservation creation');
    }

    return { data: updated, message: `Stock out successful. Issued ${quantity} units to project ${projectId || 'N/A'}.` };
  }

  // Transfer stock between warehouses
  async transfer(tenantId: string, fromItemId: string, toWarehouse: string, quantity: number, remarks?: string) {
    const actualTenantId = await this.getTenantId(tenantId);

    // Get source item
    const sourceItem = await this.itemModel.findOne({
      tenantId: actualTenantId,
      _id: new Types.ObjectId(fromItemId),
      isDeleted: false,
    }).exec();

    if (!sourceItem) {
      throw new NotFoundException(`Source item not found`);
    }

    if ((sourceItem.stock || 0) < quantity) {
      throw new NotFoundException(`Insufficient stock. Available: ${sourceItem.stock}`);
    }

    // Check if item exists in destination warehouse
    let destItem = await this.itemModel.findOne({
      tenantId: actualTenantId,
      itemId: sourceItem.itemId,
      warehouse: toWarehouse,
      isDeleted: false,
    }).exec();

    // Update source stock
    await this.itemModel.findOneAndUpdate(
      { tenantId: actualTenantId, _id: sourceItem._id },
      { $inc: { stock: -quantity } },
    ).exec();

    if (destItem) {
      // Update existing destination item
      await this.itemModel.findOneAndUpdate(
        { tenantId: actualTenantId, _id: destItem._id },
        { $inc: { stock: quantity } },
      ).exec();
    } else {
      // Create new item in destination warehouse
      destItem = new this.itemModel({
        itemId: sourceItem.itemId,
        description: sourceItem.description,
        category: sourceItem.category,
        unit: sourceItem.unit,
        stock: quantity,
        reserved: 0,
        minStock: sourceItem.minStock,
        rate: sourceItem.rate,
        warehouse: toWarehouse,
        tenantId: actualTenantId,
      });
      await destItem.save();
    }

    // Log stock movement for TRANSFER
    try {
      console.log(`[ITEMS TRANSFER] Logging TRANSFER movement from ${sourceItem.warehouse} to ${toWarehouse}, qty: ${quantity}`);
      await this.stockMovementService.logMovement(tenantId, {
        itemId: sourceItem._id.toString(),
        type: 'TRANSFER',
        quantity: quantity,
        reference: `From ${sourceItem.warehouse} to ${toWarehouse}`,
        referenceType: 'TRANSFER',
        note: remarks || `Transferred ${quantity} units from ${sourceItem.warehouse} to ${toWarehouse}`,
        warehouseName: `${sourceItem.warehouse} → ${toWarehouse}`,
      });
      console.log(`[ITEMS TRANSFER] TRANSFER logged successfully`);
    } catch (err) {
      console.error('[ITEMS TRANSFER] Failed to log TRANSFER:', err);
    }

    return {
      message: `Transfer successful. ${quantity} units transferred from ${sourceItem.warehouse} to ${toWarehouse}.`,
      source: sourceItem.warehouse,
      destination: toWarehouse,
      quantity,
    };
  }
}
