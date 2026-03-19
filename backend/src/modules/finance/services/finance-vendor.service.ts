import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FinanceVendor, FinanceVendorDocument } from '../schemas/finance-vendor.schema';

@Injectable()
export class FinanceVendorService {
  constructor(
    @InjectModel(FinanceVendor.name) private readonly financeVendorModel: Model<FinanceVendorDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try {
      return new Types.ObjectId(id);
    } catch {
      return undefined;
    }
  }

  async findAll(tenantId: string): Promise<FinanceVendor[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = { isDeleted: false };
    if (tid) {
      // Include vendors with matching tenantId OR vendors without tenantId (for backwards compatibility)
      query.$or = [{ tenantId: tid }, { tenantId: { $exists: false } }, { tenantId: null }];
    }
    return this.financeVendorModel.find(query).sort({ vendorName: 1 }).lean();
  }

  async findByVendorId(tenantId: string, vendorId: string): Promise<FinanceVendor | null> {
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorId);
    if (!vid) return null;
    
    const query: any = { vendorId: vid, isDeleted: false };
    if (tid) {
      query.tenantId = tid;
    }
    return this.financeVendorModel.findOne(query).lean();
  }

  async createOrUpdateVendor(tenantId: string, vendorData: {
    vendorId: string;
    vendorName: string;
    vendorCode: string;
    totalPayable?: number;
    totalPaid?: number;
    totalPurchaseOrders?: number;
  }): Promise<FinanceVendor> {
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorData.vendorId);
    if (!vid) {
      throw new NotFoundException('Invalid vendor ID');
    }

    const query: any = { vendorId: vid };
    if (tid) {
      query.tenantId = tid;
    }

    const existing = await this.financeVendorModel.findOne(query);

    if (existing) {
      // Update existing
      const updateData: any = {
        vendorName: vendorData.vendorName,
        vendorCode: vendorData.vendorCode,
      };

      if (vendorData.totalPayable !== undefined) {
        updateData.totalPayable = vendorData.totalPayable;
      }
      if (vendorData.totalPurchaseOrders !== undefined) {
        updateData.totalPurchaseOrders = vendorData.totalPurchaseOrders;
      }
      if (vendorData.totalPaid !== undefined) {
        // Only update totalPaid if it's from manual payments (recordVendorPayment)
        // NOT from PO-based sync - preserve existing manual payments
        const existingTotalPaid = existing.totalPaid || 0;
        const newTotalPaid = vendorData.totalPaid > existingTotalPaid 
          ? vendorData.totalPaid  // If new value is higher, use it (manual payment recorded)
          : existingTotalPaid;     // Otherwise keep existing (don't reduce from PO sync)
        updateData.totalPaid = newTotalPaid;
        updateData.outstandingAmount = (vendorData.totalPayable || existing.totalPayable || 0) - newTotalPaid;
      }

      const updated = await this.financeVendorModel.findOneAndUpdate(
        query,
        { $set: updateData },
        { new: true }
      ).lean();
      
      return updated as FinanceVendor;
    } else {
      // Create new
      const newVendor = new this.financeVendorModel({
        vendorId: vid,
        vendorName: vendorData.vendorName,
        vendorCode: vendorData.vendorCode,
        tenantId: tid,
        totalPayable: vendorData.totalPayable || 0,
        totalPaid: vendorData.totalPaid || 0,
        outstandingAmount: (vendorData.totalPayable || 0) - (vendorData.totalPaid || 0),
        totalPurchaseOrders: vendorData.totalPurchaseOrders || 0,
        status: 'Active',
        paymentHistory: [],
        isDeleted: false,
      });

      const saved = await newVendor.save();
      return saved.toObject();
    }
  }

  async recordVendorPayment(tenantId: string, vendorId: string, paymentData: {
    amount: number;
    date: string;
    poId?: string;
    poNumber?: string;
    notes?: string;
  }): Promise<FinanceVendor> {
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorId);
    if (!vid) {
      throw new NotFoundException('Invalid vendor ID');
    }

    const query: any = { vendorId: vid, isDeleted: false };
    if (tid) {
      query.tenantId = tid;
    }

    let vendor = await this.financeVendorModel.findOne(query);
    
    // If vendor doesn't exist, create it first
    if (!vendor) {
      // Get vendor info from procurement vendors (if available)
      // For now, create with basic info
      const newVendor = new this.financeVendorModel({
        vendorId: vid,
        vendorName: paymentData.notes || 'Unknown Vendor',
        vendorCode: `V-${vendorId.slice(-4)}`,
        tenantId: tid,
        totalPayable: 0,
        totalPaid: 0,
        outstandingAmount: 0,
        totalPurchaseOrders: 0,
        status: 'Active',
        paymentHistory: [],
        isDeleted: false,
      });
      vendor = await newVendor.save();
    }

    const currentPaid = vendor.totalPaid || 0;
    const newPaid = currentPaid + paymentData.amount;
    const newOutstanding = vendor.totalPayable - newPaid;

    // Add payment to history
    const paymentEntry = {
      date: new Date(paymentData.date),
      amount: paymentData.amount,
      poId: paymentData.poId || '',
      poNumber: paymentData.poNumber || '',
      notes: paymentData.notes || '',
    };

    const updated = await this.financeVendorModel.findOneAndUpdate(
      { _id: vendor._id },
      {
        $set: {
          totalPaid: newPaid,
          outstandingAmount: Math.max(0, newOutstanding),
          lastPaymentDate: new Date(paymentData.date),
          lastPaymentAmount: paymentData.amount,
          status: newOutstanding <= 0 ? 'Paid' : 'Partial',
        },
        $push: { paymentHistory: paymentEntry },
      },
      { new: true }
    ).lean();

    return updated as FinanceVendor;
  }

  async syncVendorFromProcurement(tenantId: string, procurementVendor: any, purchaseOrders: any[]): Promise<FinanceVendor> {
    const vendorId = procurementVendor._id || procurementVendor.id;
    if (!vendorId) {
      throw new NotFoundException('Invalid procurement vendor data');
    }

    // Calculate totals from purchase orders
    const totalPayable = purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);
    const totalPaid = purchaseOrders.reduce((sum, po) => sum + Number((po as any).amountPaid || 0), 0);
    const outstanding = totalPayable - totalPaid;

    // Get existing vendor to preserve totalPaid from financeVendors (if any)
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorId);
    const query: any = { vendorId: vid };
    if (tid) {
      query.tenantId = tid;
    }
    const existingVendor = await this.financeVendorModel.findOne(query);
    
    // If vendor exists, preserve its totalPaid (payments recorded via adjust amount)
    // Otherwise use the PO-based calculation
    const finalTotalPaid = existingVendor ? (existingVendor.totalPaid || 0) : totalPaid;

    return this.createOrUpdateVendor(tenantId, {
      vendorId: String(vendorId),
      vendorName: procurementVendor.name || procurementVendor.vendorName || 'Unknown',
      vendorCode: procurementVendor.id || procurementVendor.vendorCode || procurementVendor.code || `V-${String(vendorId).slice(-4)}`,
      totalPayable,
      totalPaid: finalTotalPaid,
      totalPurchaseOrders: purchaseOrders.length,
    });
  }

  async deleteVendor(tenantId: string, vendorId: string): Promise<void> {
    const tid = this.toObjectId(tenantId);
    const vid = this.toObjectId(vendorId);
    if (!vid) {
      throw new NotFoundException('Invalid vendor ID');
    }

    const query: any = { vendorId: vid };
    if (tid) {
      query.tenantId = tid;
    }

    const result = await this.financeVendorModel.findOneAndUpdate(
      query,
      { $set: { isDeleted: true } }
    );

    if (!result) {
      throw new NotFoundException('Finance vendor not found');
    }
  }
}
