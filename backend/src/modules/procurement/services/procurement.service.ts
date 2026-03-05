import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vendor, VendorDocument } from '../schemas/vendor.schema';
import { PurchaseOrder, PurchaseOrderDocument } from '../schemas/purchase-order.schema';
import { Tenant } from '../../../core/tenant/schemas/tenant.schema';
import { CreateVendorDto, UpdateVendorDto } from '../dto/create-vendor.dto';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto, UpdatePurchaseOrderStatusDto } from '../dto/create-purchase-order.dto';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectModel(Vendor.name) private vendorModel: Model<VendorDocument>,
    @InjectModel(PurchaseOrder.name) private purchaseOrderModel: Model<PurchaseOrderDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
  ) {}

  private async getTenantId(tenantCode: string): Promise<Types.ObjectId | null> {
    if (tenantCode === 'default') return null;
    // If it looks like an ObjectId (24 hex chars), use it directly
    if (/^[0-9a-fA-F]{24}$/.test(tenantCode)) {
      return new Types.ObjectId(tenantCode);
    }
    // Otherwise, look up by code
    const tenant = await this.tenantModel.findOne({ code: tenantCode });
    if (!tenant) {
      // Return null instead of throwing - will query all records
      console.warn(`Tenant ${tenantCode} not found, querying all records`);
      return null;
    }
    return tenant._id as Types.ObjectId;
  }

  // ==================== VENDOR CRUD ====================

  async createVendor(dto: CreateVendorDto, tenantId: string): Promise<Vendor> {
    const tenantObjId = await this.getTenantId(tenantId);
    // Count all active vendors when tenant is default, otherwise count by tenant
    const countQuery = tenantObjId ? { tenantId: tenantObjId, isActive: true } : { isActive: true };
    const count = await this.vendorModel.countDocuments(countQuery);
    const id = `V${String(count + 1).padStart(3, '0')}`;

    const vendor = new this.vendorModel({
      ...dto,
      id,
      rating: dto.rating || 0,
      totalOrders: 0,
      tenantId: tenantObjId,
    });
    return vendor.save();
  }

  async findAllVendors(tenantId: string): Promise<Vendor[]> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ tenantId: tenantObjId }, { tenantId: null }, { tenantId: { $exists: false } }], isActive: true }
      : { isActive: true };
    console.log('[DEBUG] findAllVendors - tenantId:', tenantId, 'tenantObjId:', tenantObjId, 'query:', JSON.stringify(query));
    const results = await this.vendorModel.find(query).exec();
    console.log('[DEBUG] findAllVendors - found:', results.length, 'records');
    return results;
  }

  async findVendorById(id: string, tenantId: string): Promise<Vendor> {
    const tenantObjId = await this.getTenantId(tenantId);
    const query = tenantObjId ? { id, tenantId: tenantObjId } : { id };
    const vendor = await this.vendorModel.findOne(query).exec();
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async updateVendor(id: string, dto: UpdateVendorDto, tenantId: string): Promise<Vendor> {
    const tenantObjId = await this.getTenantId(tenantId);
    const query = tenantObjId ? { id, tenantId: tenantObjId } : { id };
    const vendor = await this.vendorModel.findOneAndUpdate(
      query,
      { $set: dto },
      { new: true },
    ).exec();
    if (!vendor) throw new NotFoundException(`Vendor ${id} not found`);
    return vendor;
  }

  async deleteVendor(id: string, tenantId: string): Promise<void> {
    const tenantObjId = await this.getTenantId(tenantId);
    const query = tenantObjId ? { id, tenantId: tenantObjId } : { id };
    const result = await this.vendorModel.findOneAndUpdate(
      query,
      { $set: { isActive: false } },
    ).exec();
    if (!result) throw new NotFoundException(`Vendor ${id} not found`);
  }

  // ==================== PURCHASE ORDER CRUD ====================

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, tenantId: string): Promise<PurchaseOrder> {
    const tenantObjId = await this.getTenantId(tenantId);
    // Count all active POs when tenant is default, otherwise count by tenant
    const countQuery = tenantObjId ? { tenantId: tenantObjId, isActive: true } : { isActive: true };
    const count = await this.purchaseOrderModel.countDocuments(countQuery);
    const id = `PO${String(count + 1).padStart(3, '0')}`;

    // Get vendor name - search by vendor ID without tenant filter for default
    const vendorQuery = tenantObjId ? { id: dto.vendorId, tenantId: tenantObjId } : { id: dto.vendorId };
    const vendor = await this.vendorModel.findOne(vendorQuery).exec();
    if (!vendor) throw new NotFoundException(`Vendor ${dto.vendorId} not found`);

    const now = new Date();
    const orderedDate = now.toISOString().split('T')[0];

    const purchaseOrder = new this.purchaseOrderModel({
      ...dto,
      id,
      vendorId: vendor._id,
      vendorName: vendor.name,
      orderedDate,
      status: 'Ordered',
      deliveredDate: null,
      tenantId: tenantObjId,
    });

    // Increment vendor total orders
    await this.vendorModel.findByIdAndUpdate(vendor._id, { $inc: { totalOrders: 1 } });

    return purchaseOrder.save();
  }

  async findAllPurchaseOrders(tenantId: string): Promise<PurchaseOrder[]> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ tenantId: tenantObjId }, { tenantId: null }, { tenantId: { $exists: false } }], isActive: true }
      : { isActive: true };
    return this.purchaseOrderModel
      .find(query)
      .populate('vendorId', 'id name')
      .exec();
  }

  async findPurchaseOrderById(id: string, tenantId: string): Promise<PurchaseOrder> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ id, tenantId: tenantObjId }, { id, tenantId: null }, { id, tenantId: { $exists: false } }] }
      : { id };
    const po = await this.purchaseOrderModel
      .findOne(query)
      .populate('vendorId', 'id name')
      .exec();
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    return po;
  }

  async updatePurchaseOrderStatus(id: string, dto: UpdatePurchaseOrderStatusDto, tenantId: string): Promise<PurchaseOrder> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ id, tenantId: tenantObjId }, { id, tenantId: null }, { id, tenantId: { $exists: false } }] }
      : { id };
    const updateData: any = { status: dto.status };
    if (dto.deliveredDate) {
      updateData.deliveredDate = dto.deliveredDate;
    }
    if (dto.status === 'Delivered' && !dto.deliveredDate) {
      updateData.deliveredDate = new Date().toISOString().split('T')[0];
    }

    const po = await this.purchaseOrderModel.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true },
    ).exec();
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    return po;
  }

  async updatePurchaseOrder(id: string, dto: UpdatePurchaseOrderDto, tenantId: string): Promise<PurchaseOrder> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ id, tenantId: tenantObjId }, { id, tenantId: null }, { id, tenantId: { $exists: false } }] }
      : { id };
    const po = await this.purchaseOrderModel.findOneAndUpdate(
      query,
      { $set: dto },
      { new: true },
    ).exec();
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    return po;
  }

  async deletePurchaseOrder(id: string, tenantId: string): Promise<void> {
    const tenantObjId = await this.getTenantId(tenantId);
    // If tenantId provided, find records with matching tenantId OR null tenantId
    const query = tenantObjId 
      ? { $or: [{ id, tenantId: tenantObjId }, { id, tenantId: null }, { id, tenantId: { $exists: false } }] }
      : { id };
    const result = await this.purchaseOrderModel.findOneAndUpdate(
      query,
      { $set: { isActive: false } },
    ).exec();
    if (!result) throw new NotFoundException(`Purchase Order ${id} not found`);
  }

  // ==================== STATS ====================

  async getProcurementStats(tenantId: string): Promise<any> {
    const tenantObjId = await this.getTenantId(tenantId);
    const baseQuery = tenantObjId ? { tenantId: tenantObjId, isActive: true } : { isActive: true };
    
    const vendorCount = await this.vendorModel.countDocuments(baseQuery);
    const poCount = await this.purchaseOrderModel.countDocuments(baseQuery);
    const inTransitCount = await this.purchaseOrderModel.countDocuments({
      ...baseQuery,
      status: 'In Transit',
    });

    const totalSpendAgg = tenantObjId 
      ? await this.purchaseOrderModel.aggregate([
          { $match: { tenantId: tenantObjId, isActive: true } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ])
      : await this.purchaseOrderModel.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]);
    const totalSpend = totalSpendAgg.length > 0 ? totalSpendAgg[0].total : 0;

    return {
      vendorCount,
      poCount,
      inTransitCount,
      totalSpend,
    };
  }
}
