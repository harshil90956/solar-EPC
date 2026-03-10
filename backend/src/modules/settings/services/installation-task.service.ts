import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InstallationTaskConfig, InstallationTaskConfigDocument } from '../schemas/installation-task.schema';

@Injectable()
export class InstallationTaskService {
  private readonly logger = new Logger(InstallationTaskService.name);

  constructor(
    @InjectModel(InstallationTaskConfig.name)
    private configModel: Model<InstallationTaskConfigDocument>,
  ) {}

  private toObjectId(id?: string | Types.ObjectId): Types.ObjectId | undefined {
    if (!id) return undefined;
    try {
      return typeof id === 'string' ? new Types.ObjectId(id) : id;
    } catch {
      return undefined;
    }
  }

  /**
   * Retrieve the task configuration for a tenant. If none exists return an empty array.
   */
  async getConfig(tenantId?: string): Promise<InstallationTaskConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid } : {};
    let doc = await this.configModel.findOne(filter).exec();
    if (!doc) {
      // create a placeholder so that frontend always has an object
      doc = new this.configModel({ tenantId: tid, tasks: [] });
    }
    return doc;
  }

  /**
   * Update or create the task configuration for a tenant.
   */
  async updateConfig(
    tenantId: string | undefined,
    tasks: { name: string; photoRequired: boolean }[],
    userId?: string,
  ): Promise<InstallationTaskConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid } : {}; // global

    const update = { tasks: tasks || [] };
    const doc = await this.configModel.findOneAndUpdate(filter, { $set: update }, { upsert: true, new: true }).exec();
    this.logger.log(`Installation tasks updated for tenant ${tenantId} by ${userId}`);
    return doc;
  }
}
