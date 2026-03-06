import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Dispatch } from '../schemas/dispatch.schema';
import { Vendor } from '../schemas/vendor.schema';
import { InventoryService } from '../../inventory/services/inventory.service';

@Injectable()
export class LogisticsService {
  constructor(
    @InjectModel(Dispatch.name) private dispatchModel: Model<Dispatch>,
    @InjectModel(Vendor.name) private vendorModel: Model<Vendor>,
    private readonly inventoryService: InventoryService,
  ) {}

  // Dispatch methods
  async findAll(): Promise<Dispatch[]> {
    return this.dispatchModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<Dispatch | null> {
    return this.dispatchModel.findOne({ id }).exec();
  }

  async create(data: Partial<Dispatch>): Promise<Dispatch> {
    const lastDispatch = await this.dispatchModel.findOne().sort({ _id: -1 }).exec();
    const nextId = lastDispatch ? this.generateNextId(lastDispatch.id) : 'DS001';
    
    const newDispatch = new this.dispatchModel({
      ...data,
      id: nextId,
    });
    return newDispatch.save();
  }

  async update(id: string, data: Partial<Dispatch>): Promise<Dispatch | null> {
    return this.dispatchModel.findOneAndUpdate({ id }, data, { new: true }).exec();
  }

  async updateStatus(id: string, status: string): Promise<Dispatch | null> {
    const dispatch = await this.dispatchModel.findOne({ id }).exec();
    if (!dispatch) return null;

    const updateData: any = { status };
    if (status === 'Delivered') {
      updateData.deliveredDate = new Date();
      
      // Customer delivery - reduce inventory (items delivered to customer)
      try {
        await this.inventoryService.removeStock(
          dispatch.items,
          1, // Default quantity, can be enhanced to parse from items string
          `Customer delivery - Dispatch ${id}`,
          id
        );
      } catch (error: any) {
        console.log(`Inventory not updated for dispatch ${id}: ${error.message}`);
        // Don't throw - delivery should still be marked even if inventory fails
      }
    }
    
    return this.dispatchModel.findOneAndUpdate({ id }, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<Dispatch | null> {
    return this.dispatchModel.findOneAndUpdate({ id }, { isActive: false }, { new: true }).exec();
  }

  async getStats() {
    const dispatches = await this.dispatchModel.find({ isActive: true }).exec();
    return {
      total: dispatches.length,
      delivered: dispatches.filter(d => d.status === 'Delivered').length,
      inTransit: dispatches.filter(d => d.status === 'In Transit').length,
      scheduled: dispatches.filter(d => d.status === 'Scheduled').length,
      totalFreight: dispatches.reduce((sum, d) => sum + (d.cost || 0), 0),
    };
  }

  // Vendor methods
  async findAllVendors(): Promise<Vendor[]> {
    return this.vendorModel.find({ $or: [{ isActive: { $ne: false } }, { isActive: { $exists: false } }] }).exec();
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
    return this.vendorModel.findOneAndUpdate({ id }, data, { new: true }).exec();
  }

  async deleteVendor(id: string): Promise<Vendor | null> {
    return this.vendorModel.findOneAndUpdate({ id }, { isActive: false }, { new: true }).exec();
  }

  // Vendor delivery - add stock to inventory
  async vendorDelivery(vendorId: string, itemName: string, quantity: number): Promise<any> {
    // Add stock to inventory
    const inventory = await this.inventoryService.addStock(
      itemName,
      quantity,
      `Vendor delivery from ${vendorId}`,
      vendorId
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
