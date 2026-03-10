import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, SubscriptionDocument } from '../schemas/subscription.schema';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from '../dto/subscription.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async findAll(query: any = {}): Promise<Subscription[]> {
    return this.subscriptionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionModel.findById(id).exec();
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  async findByTenantId(tenantId: string): Promise<Subscription[]> {
    return this.subscriptionModel.find({ tenantId }).sort({ createdAt: -1 }).exec();
  }

  async getCurrentSubscription(tenantId: string): Promise<Subscription | null> {
    return this.subscriptionModel.findOne({
      tenantId,
      status: { $in: ['active', 'pending'] },
    }).sort({ createdAt: -1 }).exec();
  }

  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = new this.subscriptionModel(createSubscriptionDto);
    return subscription.save();
  }

  async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.subscriptionModel
      .findByIdAndUpdate(id, updateSubscriptionDto, { new: true })
      .exec();
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  async cancel(id: string, reason?: string): Promise<Subscription> {
    return this.update(id, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason,
    } as UpdateSubscriptionDto);
  }

  async delete(id: string): Promise<void> {
    const result = await this.subscriptionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Subscription not found');
    }
  }

  async getStats(): Promise<any> {
    const total = await this.subscriptionModel.countDocuments();
    const active = await this.subscriptionModel.countDocuments({ status: 'active' });
    const cancelled = await this.subscriptionModel.countDocuments({ status: 'cancelled' });
    const expired = await this.subscriptionModel.countDocuments({ status: 'expired' });

    const revenue = await this.subscriptionModel.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);

    return {
      total,
      active,
      cancelled,
      expired,
      monthlyRevenue: revenue[0]?.total || 0,
    };
  }
}
