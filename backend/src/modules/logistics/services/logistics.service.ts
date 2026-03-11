import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Dispatch } from '../schemas/dispatch.schema';
import { Vendor } from '../schemas/vendor.schema';
import { PurchaseOrder } from '../../procurement/schemas/purchase-order.schema';
import { InventoryService } from '../../inventory/services/inventory.service';
import { InstallationService } from '../../installation/services/installation.service';
import { ProcurementService } from '../../procurement/services/procurement.service';



interface UserWithVisibility {

  id?: string;

  _id?: string;

  dataScope?: 'ALL' | 'ASSIGNED';

}



@Injectable()

export class LogisticsService {

  constructor(

    @InjectModel(Dispatch.name) private dispatchModel: Model<Dispatch>,

    @InjectModel('LogisticsVendor') private vendorModel: Model<Vendor>,

    @InjectModel(PurchaseOrder.name) private purchaseOrderModel: Model<PurchaseOrder>,

    private readonly inventoryService: InventoryService,

    private readonly installationService: InstallationService,

    @Inject(forwardRef(() => ProcurementService))
    private readonly procurementService: ProcurementService,

  ) {}



  // Dispatch methods

  async findAll(user?: UserWithVisibility): Promise<Dispatch[]> {

    const query: any = { isActive: true };

    

    console.log(`[LOGISTICS VISIBILITY] user:`, JSON.stringify(user));

    console.log(`[LOGISTICS VISIBILITY] user?.dataScope:`, user?.dataScope);

    

    // Apply visibility filter based on user's dataScope

    if (user?.dataScope === 'ASSIGNED') {

      const userId = user._id || user.id;

      console.log(`[LOGISTICS VISIBILITY] userId:`, userId);

      if (userId) {

        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)

          ? new Types.ObjectId(userId)

          : userId;

        // STRICT: Only show dispatches explicitly assigned to this user

        query.assignedTo = objectId;

        console.log(`[LOGISTICS VISIBILITY] Applied STRICT assignedTo filter:`, objectId);

      }

    } else {

      console.log(`[LOGISTICS VISIBILITY] No filter applied - ALL scope or no user`);

    }

    

    console.log(`[LOGISTICS VISIBILITY] Final query:`, JSON.stringify(query));

    return this.dispatchModel.find(query).exec();

  }



  async findOne(id: string): Promise<Dispatch | null> {

    return this.dispatchModel.findOne({ id }).exec();

  }



  async create(data: Partial<Dispatch>): Promise<Dispatch> {

    const lastDispatch = await this.dispatchModel.findOne().sort({ _id: -1 }).exec();

    const nextId = lastDispatch ? this.generateNextId(lastDispatch.id) : 'DS001';

    

    // Set default dispatchDate if not provided

    const dispatchDate = data.dispatchDate || new Date().toISOString().split('T')[0];

    

    const newDispatch = new this.dispatchModel({

      ...data,

      id: nextId,

      dispatchDate,

    });

    return newDispatch.save();

  }



  async update(id: string, data: Partial<Dispatch>, user?: any): Promise<Dispatch | null> {

    // Check if status is being changed to Delivered

    if (data.status === 'Delivered') {

      return this.updateStatus(id, 'Delivered', user);

    }

    return this.dispatchModel.findOneAndUpdate({ id }, data, { new: true }).exec();

  }



  async updateStatus(id: string, status: string, user?: any): Promise<Dispatch | null> {

    const dispatch = await this.dispatchModel.findOne({ id }).exec();

    if (!dispatch) {

      console.log(`[LOGISTICS] Dispatch ${id} not found`);

      return null;

    }



    console.log(`[LOGISTICS] Updating dispatch ${id} status to: ${status}`);

    console.log(`[LOGISTICS] Dispatch tenantId: ${dispatch.tenantId}`);



    // Use JWT tenantId if dispatch doesn't have one

    const effectiveTenantId = dispatch.tenantId?.toString() || user?.tenantId;

    console.log(`[LOGISTICS] Effective tenantId: ${effectiveTenantId}`);



    const updateData: any = { status };

    if (status === 'Delivered') {

      updateData.deliveredDate = new Date();

      console.log(`[LOGISTICS] ========== DELIVERED STATUS DETECTED ==========`);
      console.log(`[LOGISTICS] Dispatch ID: ${id}`);
      console.log(`[LOGISTICS] User:`, JSON.stringify(user));
      console.log(`[LOGISTICS] Dispatch projectId: ${dispatch.projectId}`);
      console.log(`[LOGISTICS] Dispatch customer: ${dispatch.customer}`);
      console.log(`[LOGISTICS] Dispatch to (site): ${dispatch.to}`);
      console.log(`[LOGISTICS] Dispatch items: ${dispatch.items}`);
      console.log(`[LOGISTICS] Dispatch tenantId: ${dispatch.tenantId}`);
      
      // Customer delivery - reduce inventory (items delivered to customer)

      try {

        await this.inventoryService.removeStock(

          dispatch.items,

          1,

          `Customer delivery - Dispatch ${id}`,

          id

        );

      } catch (error: any) {

        console.log(`[LOGISTICS] Inventory not updated for dispatch ${id}: ${error.message}`);

      }



      // Auto-create installation record when materials are delivered

      console.log(`[LOGISTICS] ========== STARTING INSTALLATION CREATION ==========`);

      console.log(`[LOGISTICS] installationService exists:`, !!this.installationService);
      console.log(`[LOGISTICS] installationService.createInstallationFromDispatch exists:`, !!this.installationService?.createInstallationFromDispatch);

      try {

        // Allow null tenantId for Super Admin - installation service handles it

        const effectiveTenantId = dispatch.tenantId?.toString() || user?.tenantId || null;

        console.log(`[LOGISTICS] Effective tenantId for installation: ${effectiveTenantId}`);
        console.log(`[LOGISTICS] Calling createInstallationFromDispatch...`);
        
        const result = await this.installationService.createInstallationFromDispatch(

          {

            projectId: dispatch.projectId,

            dispatchId: dispatch.id,

            customerName: dispatch.customer,

            site: dispatch.to,

            tenantId: effectiveTenantId,

            items: dispatch.items,

          },

          {

            userId: user?.id || 'system',

            tenantId: effectiveTenantId,

            dataScope: 'ALL',

            role: user?.role || 'system',

          },

        );

        console.log(`[LOGISTICS] ========== INSTALLATION CREATION SUCCESS ==========`);
        console.log(`[LOGISTICS] Created installation ID:`, result?._id);
        console.log(`[LOGISTICS] Created installation status:`, result?.status);

      } catch (installError: any) {

        console.error(`[LOGISTICS] ========== INSTALLATION CREATION FAILED ==========`);
        console.error(`[LOGISTICS] Error:`, installError.message);
        console.error(`[LOGISTICS] Stack:`, installError.stack);

      }

    }

    

    return this.dispatchModel.findOneAndUpdate({ id }, updateData, { new: true }).exec();

  }



  async delete(id: string): Promise<Dispatch | null> {

    return this.dispatchModel.findOneAndUpdate({ id }, { isActive: false }, { new: true }).exec();

  }



  async getStats(user?: UserWithVisibility) {

    const query: any = { isActive: true };

    

    // Apply visibility filter based on user's dataScope

    if (user?.dataScope === 'ASSIGNED') {

      const userId = user._id || user.id;

      if (userId) {

        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)

          ? new Types.ObjectId(userId)

          : userId;

        // STRICT: Only include dispatches explicitly assigned to this user

        query.assignedTo = objectId;

        console.log(`[LOGISTICS STATS VISIBILITY] Applied assignedTo filter:`, objectId);

      }

    }

    

    console.log(`[LOGISTICS STATS VISIBILITY] Query:`, JSON.stringify(query));

    const dispatches = await this.dispatchModel.find(query).exec();

    return {

      total: dispatches.length,

      delivered: dispatches.filter(d => d.status === 'Delivered').length,

      inTransit: dispatches.filter(d => d.status === 'In Transit').length,

      scheduled: dispatches.filter(d => d.status === 'Scheduled').length,

      totalFreight: dispatches.reduce((sum, d) => sum + (d.cost || 0), 0),

    };

  }



  // Vendor methods

  async findAllVendors(user?: UserWithVisibility): Promise<Vendor[]> {

    console.log(`[LOGISTICS VENDORS] Called with user:`, JSON.stringify(user));

    const query: any = { $or: [{ isActive: { $ne: false } }, { isActive: { $exists: false } }] };

    

    console.log(`[LOGISTICS VENDORS] user?.dataScope:`, user?.dataScope);

    // Apply visibility filter based on user's dataScope

    if (user?.dataScope === 'ASSIGNED') {

      const userId = user._id || user.id;

      console.log(`[LOGISTICS VENDORS] userId:`, userId);

      if (userId) {

        const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)

          ? new Types.ObjectId(userId)

          : userId;

        // STRICT: Only show vendors explicitly assigned to this user

        query.assignedTo = objectId;

        console.log(`[LOGISTICS VENDORS VISIBILITY] Applied assignedTo filter:`, objectId);

      }

    } else {

      console.log(`[LOGISTICS VENDORS] SKIPPING filter - dataScope is not ASSIGNED`);

    }

    

    console.log(`[LOGISTICS VENDORS] Final query:`, JSON.stringify(query));

    const results = await this.vendorModel.find(query).exec();

    // Calculate totalOrders dynamically from Purchase Orders
    const vendorsWithPOCount = await Promise.all(
      results.map(async (vendor) => {
        const poCount = await this.purchaseOrderModel.countDocuments({
          vendorId: vendor._id,
          isActive: true
        }).exec();
        
        const vendorObj = vendor.toObject();
        vendorObj.totalOrders = poCount;
        return vendorObj as Vendor;
      })
    );

    console.log(`[LOGISTICS VENDORS] Found:`, results.length, 'records');

    return vendorsWithPOCount;

  }



  async findVendorById(id: string): Promise<Vendor | null> {

    return this.vendorModel.findOne({ id }).exec();

  }



  async createVendor(data: Partial<Vendor>): Promise<Vendor> {

    try {

      // Find the vendor with highest ID number

      const allVendors = await this.vendorModel.find().exec();

      let maxNum = 0;

      allVendors.forEach(v => {

        const num = parseInt(v.id?.replace('V', '') || '0');

        if (num > maxNum) maxNum = num;

      });

      const nextId = `V${(maxNum + 1).toString().padStart(3, '0')}`;



      console.log('Creating vendor with ID:', nextId, 'Data:', data);



      const newVendor = new this.vendorModel({

        ...data,

        id: nextId,

        isActive: true,

        totalOrders: 0,

        rating: data.rating || 5,

      });



      const saved = await newVendor.save();

      console.log('Vendor created successfully:', saved.id);

      return saved;

    } catch (error: any) {

      console.error('Error creating vendor:', error.message, error.code, error);

      throw error;

    }

  }



  async updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor | null> {
    console.log(`[LOGISTICS] Updating vendor ${id} with data:`, data);
    
    const oldVendor = await this.vendorModel.findOne({ id }).exec();
    const updated = await this.vendorModel.findOneAndUpdate({ id }, data, { new: true }).exec();
    
    if (updated && data.name && data.name !== oldVendor?.name) {
      console.log(`[LOGISTICS] Vendor name changed from "${oldVendor?.name}" to "${data.name}" - syncing with POs`);
      try {
        await this.procurementService.syncVendorName(updated._id, data.name);
      } catch (error: any) {
        console.error(`[LOGISTICS] Failed to sync vendor name with POs:`, error.message);
      }
    }
    
    return updated;
  }



  async deleteVendor(id: string): Promise<Vendor | null> {

    return this.vendorModel.findOneAndUpdate({ id }, { isActive: false }, { new: true }).exec();

  }



  // Vendor delivery - add stock to inventory

  async vendorDelivery(vendorId: string, itemName: string, quantity: number, tenantId?: string): Promise<any> {

    // Add stock to inventory

    const inventory = await this.inventoryService.addStock(

      itemName,

      quantity,

      `Vendor delivery from ${vendorId}`,

      vendorId,

      tenantId || 'default'

    );



    // Update vendor order count

    await this.vendorModel.findOneAndUpdate(

      { id: vendorId },

      { $inc: { totalOrders: 1 } }

    ).exec();



    return {

      success: true,

      inventory,

      message: `Added ${quantity} units of ${itemName} to inventory from vendor ${vendorId}`

    };

  }



  private generateNextId(lastId: string): string {

    const num = parseInt(lastId.replace('DS', '')) + 1;

    return `DS${num.toString().padStart(3, '0')}`;

  }



  private generateNextVendorId(lastId: string): string {

    const num = parseInt(lastId.replace('V', '')) + 1;

    return `V${num.toString().padStart(3, '0')}`;

  }

}

