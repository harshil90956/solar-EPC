import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Installation } from '../schemas/installation.schema';

export interface CreateCommissioningData {
  projectId: string;
  installationId: string;
  customerName: string;
  site: string;
  tenantId: string;
  systemSize?: number;
}

@Injectable()
export class CommissioningIntegrationService {
  constructor(
    @InjectModel(Installation.name)
    private installationModel: Model<Installation>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (typeof id === 'string') {
      return new Types.ObjectId(id);
    }
    return id;
  }

  /**
   * Trigger commissioning creation when installation is completed
   * This method is called by InstallationService when status changes to 'Completed'
   */
  async triggerCommissioningOnComplete(
    installationId: string,
    tenantId: string,
  ): Promise<{ success: boolean; commissioningId?: string; message: string }> {
    try {
      const installation = await this.installationModel.findOne({
        _id: this.toObjectId(installationId),
        tenantId: this.toObjectId(tenantId),
        isDeleted: false,
      });

      if (!installation) {
        return { success: false, message: 'Installation not found' };
      }

      if (installation.commissioningTriggered) {
        return { success: false, message: 'Commissioning already triggered for this installation' };
      }

      // Mark as triggered to prevent duplicate commissioning records
      await this.installationModel.updateOne(
        { _id: this.toObjectId(installationId) },
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
   * Link commissioning record to installation
   */
  async linkCommissioningRecord(
    installationId: string,
    commissioningId: string,
    tenantId: string,
  ): Promise<void> {
    await this.installationModel.updateOne(
      {
        _id: this.toObjectId(installationId),
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
   * Check if installation is ready for commissioning
   */
  async isReadyForCommissioning(
    installationId: string,
    tenantId: string,
  ): Promise<{ ready: boolean; message?: string }> {
    const installation = await this.installationModel.findOne({
      _id: this.toObjectId(installationId),
      tenantId: this.toObjectId(tenantId),
      isDeleted: false,
    });

    if (!installation) {
      return { ready: false, message: 'Installation not found' };
    }

    if (installation.status !== 'Completed') {
      return { ready: false, message: 'Installation not completed' };
    }

    if (!installation.qualityCheckPassed) {
      return { ready: false, message: 'Quality check not passed' };
    }

    if (!installation.customerSignOff?.signed) {
      return { ready: false, message: 'Customer sign-off not completed' };
    }

    if (installation.commissioningTriggered) {
      return { ready: false, message: 'Commissioning already triggered' };
    }

    return { ready: true };
  }
}
