import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Dispatch } from '../schemas/dispatch.schema';

@Injectable()
export class LogisticsService {
  constructor(
    @InjectModel(Dispatch.name) private dispatchModel: Model<Dispatch>,
  ) {}

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
    const updateData: any = { status };
    if (status === 'Delivered') {
      updateData.deliveredDate = new Date();
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

  private generateNextId(lastId: string): string {
    const num = parseInt(lastId.replace('DS', '')) + 1;
    return `DS${num.toString().padStart(3, '0')}`;
  }
}
