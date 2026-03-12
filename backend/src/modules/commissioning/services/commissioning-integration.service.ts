import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Commissioning } from '../schemas/commissioning.schema';

export interface CreateCommissioningData {
  projectId: string;
  CommissioningId: string;
  customerName: string;
  site: string;
  tenantId: string;
  systemSize?: number;
}

@Injectable()
export class CommissioningIntegrationService {
  constructor(
    @InjectModel(Commissioning.name)
    private CommissioningModel: Model<Commissioning>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (typeof id === 'string') {
      return new Types.ObjectId(id);
    }
    return id;
  }

  /**
   * Trigger commissioning creation when Commissioning is completed
   * This method is called by CommissioningService when status changes to 'Completed'
   */
  async triggerCommissioningOnComplete(
    CommissioningId: string,
    tenantId: string,
  ): Promise<{ success: boolean; commissioningId?: string; message: string }> {
    try {
      const Commissioning = await this.CommissioningModel.findOne({
        _id: this.toObjectId(CommissioningId),
        tenantId: this.toObjectId(tenantId),
        isDeleted: false,
      });

      if (!Commissioning) {
        return { success: false, message: 'Commissioning not found' };
      }

      if (Commissioning.commissioningTriggered) {
        return { success: false, message: 'Commissioning already triggered for this Commissioning' };
      }

      // Mark as triggered to prevent duplicate commissioning records
      await this.CommissioningModel.updateOne(
        { _id: this.toObjectId(CommissioningId) },
        { $set: { commissioningTriggered: true } },
      );

      // Return data needed to create commissioning record
      // The actual commissioning creation should be handled by the CommissioningModule
      return {
        success: true,
        message: 'Commissioning trigger activated',
        commissioningId: undefined, // Will be set by CommissioningModule
      };
    } catch (error: any) {
      return { success: false, message: `Error triggering commissioning: ${error.message}` };
    }
  }

  /**
   * Link commissioning record to Commissioning
   */
  async linkCommissioningRecord(
    CommissioningId: string,
    commissioningId: string,
    tenantId: string,
  ): Promise<void> {
    await this.CommissioningModel.updateOne(
      {
        _id: this.toObjectId(CommissioningId),
        tenantId: this.toObjectId(tenantId),
      },
      {
        $set: {
          commissioningId: this.toObjectId(commissioningId),
          commissioningTriggered: true,
        },
      },
    );
  }

  /**
   * Check if Commissioning is ready for commissioning
   */
  async isReadyForCommissioning(
    CommissioningId: string,
    tenantId: string,
  ): Promise<{ ready: boolean; message?: string }> {
    const Commissioning = await this.CommissioningModel.findOne({
      _id: this.toObjectId(CommissioningId),
      tenantId: this.toObjectId(tenantId),
      isDeleted: false,
    });

    if (!Commissioning) {
      return { ready: false, message: 'Commissioning not found' };
    }

    if (Commissioning.status !== 'Completed') {
      return { ready: false, message: 'Commissioning not completed' };
    }

    if (!Commissioning.qualityCheckPassed) {
      return { ready: false, message: 'Quality check not passed' };
    }

    if (!Commissioning.customerSignOff?.signed) {
      return { ready: false, message: 'Customer sign-off not completed' };
    }

    if (Commissioning.commissioningTriggered) {
      return { ready: false, message: 'Commissioning already triggered' };
    }

    return { ready: true };
  }
}

