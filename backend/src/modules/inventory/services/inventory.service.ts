import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inventory } from '../schemas/inventory.schema';
import { InventoryReservation } from '../schemas/inventory-reservation.schema';
import { Tenant, TenantSchema } from '../../../core/tenant/schemas/tenant.schema';
import { CreateInventoryDto, UpdateInventoryDto, StockInDto, StockOutDto, CreateReservationDto, UpdateReservationDto } from '../dto/inventory.dto';

interface UserWithVisibility {
  id?: string;
  _id?: string;
  dataScope?: 'ALL' | 'ASSIGNED';
}



@Injectable()

export class InventoryService {

  constructor(

    @InjectModel(Inventory.name) private readonly inventoryModel: Model<Inventory>,

    @InjectModel(InventoryReservation.name) private readonly reservationModel: Model<InventoryReservation>,

    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,

  ) {}



  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    // Try to find by code if it's not a valid ObjectId
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  async findAll(tenantCode: string, user?: UserWithVisibility, category?: string, search?: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    const query: any = { tenantId, isDeleted: false };
    
    console.log(`[INVENTORY VISIBILITY] user:`, JSON.stringify(user));
    console.log(`[INVENTORY VISIBILITY] user?.dataScope:`, user?.dataScope);
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      console.log(`[INVENTORY VISIBILITY] userId:`, userId);
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only show items explicitly assigned to this user
        query.assignedTo = objectId;
        console.log(`[INVENTORY VISIBILITY] Applied STRICT assignedTo filter:`, objectId);
      }
    } else {
      console.log(`[INVENTORY VISIBILITY] No filter applied - ALL scope or no user`);
    }
    
    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }
    
    console.log(`[INVENTORY VISIBILITY] Final query:`, JSON.stringify(query));

    return this.inventoryModel.find(query).sort({ createdAt: -1 }).exec();
  }



  async findOne(tenantCode: string, itemId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
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
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    

    const stock = createDto.stock || 0;

    const available = createDto.available || 0;

    const minStock = createDto.minStock || 0;

    

    let status: string;

    if (available === 0) {

      status = 'Out of Stock';

    } else if (available <= minStock) {

      status = 'Low Stock';

    } else if (createDto.reserved && createDto.reserved > 0) {

      status = 'Reserved';

    } else {

      status = 'In Stock';

    }

    

    const item = new this.inventoryModel({

      ...createDto,

      tenantId,

      status,

      lastUpdated: new Date().toISOString().split('T')[0],

    });

    return item.save();

  }



  async update(tenantCode: string, itemId: string, updateDto: UpdateInventoryDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
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



  async createReservation(tenantCode: string, createDto: CreateReservationDto) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    

    const item = await this.inventoryModel.findOne({ tenantId, itemId: createDto.itemId }).exec();

    if (!item) {

      throw new NotFoundException(`Item ${createDto.itemId} not found`);

    }



    if (item.available < createDto.quantity) {

      throw new BadRequestException(

        `Insufficient available stock. Available: ${item.available}, Requested: ${createDto.quantity}`

      );

    }



    const reservationId = `RES${Date.now().toString(36).toUpperCase()}`;

    const reservation = new this.reservationModel({

      ...createDto,

      reservationId,

      tenantId,

      status: 'active',

      reservedDate: new Date().toISOString().split('T')[0],

    });



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
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    
    // Build projectId variants to match both string and ObjectId formats
    const searchProjectIds: any[] = [projectId];
    if (Types.ObjectId.isValid(projectId)) {
      searchProjectIds.push(new Types.ObjectId(projectId));
    }
    
    return this.reservationModel
      .find({ 
        $and: [
          {
            $or: [
              { tenantId: tenantId },
              { tenantId: tenantId.toString() },
            ]
          },
          {
            $or: [
              { projectId: { $in: searchProjectIds } },
              { projectId: projectId.toString() }
            ]
          }
        ],
        status: { $in: ['active', 'fulfilled', 'Pending', 'Active'] } 
      })
      .sort({ createdAt: -1 })
      .exec();
  }



  async getReservationsByItem(tenantCode: string, itemId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    // Build itemId variants to match across different ID formats
    const searchItemIds = [itemId];
    if (itemId.startsWith('INV')) {
      searchItemIds.push(itemId.replace(/^INV/, ''));
    } else {
      searchItemIds.push('INV' + itemId);
    }

    const reservations = await this.reservationModel
      .find({
        $or: [
          { tenantId: tenantId },
          { tenantId: tenantId.toString() },
        ],
        itemId: { $in: searchItemIds },
        status: { $in: ['active', 'fulfilled', 'Pending'] },
      })
      .sort({ createdAt: -1 })
      .exec();

    // Transform reservations to include project details
    const transformedReservations = await Promise.all(
      reservations.map(async (res) => {
        const resObj = res.toObject();
        
        // Try to find project details - projectId could be string or ObjectId
        let projectDetails = null;
        try {
          const projectIdStr = res.projectId?.toString();
          // Try to find by projectId as string (e.g., P3262)
          const query: any = { projectId: projectIdStr };
          // Also try _id if projectId is a valid ObjectId
          if (Types.ObjectId.isValid(res.projectId)) {
            query.$or = [
              { projectId: projectIdStr },
              { _id: new Types.ObjectId(res.projectId) }
            ];
            delete query.projectId;
          }
          projectDetails = await this.inventoryModel.db.collection('projects').findOne(query, { projection: { projectId: 1, customerName: 1, name: 1, status: 1 } });
        } catch (e) {
          // Ignore errors
        }

        return {
          ...resObj,
          projectId: res.projectId?.toString(),
          project: projectDetails || {
            projectId: res.projectId?.toString(),
            customerName: (res as any).projectName || 'Unknown Project'
          }
        };
      })
    );

    return transformedReservations;
  }



  async updateReservation(
    tenantCode: string, 
    reservationId: string, 
    updateDto: UpdateReservationDto
  ) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    

    const reservation = await this.reservationModel.findOne({ tenantId, reservationId }).exec();

    if (!reservation) {

      throw new NotFoundException(`Reservation ${reservationId} not found`);

    }



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



  async findOneWithReservations(tenantCode: string, itemId: string) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    

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
    const tenantId = await this.resolveTenantObjectId(tenantCode);
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
    const tenantId = await this.resolveTenantObjectId(tenantCode);
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
    const tenantId = await this.resolveTenantObjectId(tenantCode);
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



  async getStats(tenantCode: string, user?: UserWithVisibility) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    
    const query: any = { tenantId, isDeleted: false };
    
    console.log(`[INVENTORY STATS VISIBILITY] user param:`, JSON.stringify(user));
    console.log(`[INVENTORY STATS VISIBILITY] user?.dataScope:`, user?.dataScope);
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        // STRICT: Only include items explicitly assigned to this user
        query.assignedTo = objectId;
        console.log(`[INVENTORY STATS VISIBILITY] Applied assignedTo filter:`, objectId);
      }
    } else {
      console.log(`[INVENTORY STATS VISIBILITY] SKIPPING filter - dataScope is not ASSIGNED`);
    }
    
    console.log(`[INVENTORY STATS VISIBILITY] Final Query:`, JSON.stringify(query));
    
    const items = await this.inventoryModel.find(query).exec();
    
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



  async getItemsByCategory(tenantCode: string, user?: UserWithVisibility) {
    const tenantId = await this.resolveTenantObjectId(tenantCode);
    
    console.log(`[INVENTORY CATEGORY VISIBILITY] user:`, JSON.stringify(user));
    console.log(`[INVENTORY CATEGORY VISIBILITY] user?.dataScope:`, user?.dataScope);
    
    // Build match query with dataScope filter
    const matchQuery: any = {
      tenantId,
      isDeleted: false,
    };
    
    // Apply visibility filter based on user's dataScope
    if (user?.dataScope === 'ASSIGNED') {
      const userId = user._id || user.id;
      if (userId) {
        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
          ? new Types.ObjectId(userId)
          : userId;
        matchQuery.assignedTo = objectId;
        console.log(`[INVENTORY CATEGORY VISIBILITY] Applied assignedTo filter:`, objectId);
      }
    } else {
      console.log(`[INVENTORY CATEGORY VISIBILITY] No filter - ALL scope or no user`);
    }

    return this.inventoryModel.aggregate([

      {

        $match: matchQuery,

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



  // Backward compatibility methods for logistics service

  async addStock(
    itemName: string,
    quantity: number,
    reason: string,
    tenantCode: string,
    referenceId?: string,
  ): Promise<Inventory | null> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    let item = await this.inventoryModel.findOne({ tenantId, name: itemName }).exec();

    if (!item) {

      // Create new inventory item if it doesn't exist

      const newItem = new this.inventoryModel({

        tenantId,

        itemId: `INV${Date.now().toString(36).toUpperCase()}`,

        name: itemName,

        category: 'Auto-created',

        stock: quantity,

        available: quantity,

        reserved: 0,

        minStock: 0,

        rate: 0,

        unit: 'Nos',

        warehouse: 'Main',

        status: 'In Stock',

        lastUpdated: new Date().toISOString().split('T')[0],

      });

      item = await newItem.save();

      return item;

    }



    const newStock = item.stock + quantity;

    const newAvailable = newStock - item.reserved;



    return this.inventoryModel.findOneAndUpdate(

      { tenantId, _id: item._id },

      {

        $set: {

          stock: newStock,

          available: newAvailable,

          lastUpdated: new Date().toISOString().split('T')[0],

        }

      },

      { new: true },

    ).exec();

  }



  async removeStock(
    itemName: string,
    quantity: number,
    reason: string,
    tenantCode: string,
    referenceId?: string,
  ): Promise<Inventory | null> {
    const tenantId = await this.resolveTenantObjectId(tenantCode);

    

    const item = await this.inventoryModel.findOne({ tenantId, name: itemName }).exec();

    

    if (!item) {

      throw new NotFoundException(`Inventory item "${itemName}" not found`);

    }



    if (item.available < quantity) {

      throw new BadRequestException(`Insufficient stock for "${itemName}". Available: ${item.available}, Requested: ${quantity}`);

    }



    const newStock = item.stock - quantity;

    const newAvailable = newStock - item.reserved;



    return this.inventoryModel.findOneAndUpdate(

      { tenantId, _id: item._id },

      {

        $set: {

          stock: newStock,

          available: newAvailable,

          lastUpdated: new Date().toISOString().split('T')[0],

        }

      },

      { new: true },

    ).exec();

  }

}

