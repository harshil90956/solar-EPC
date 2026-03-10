import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemBackup, SystemBackupDocument } from '../schemas/backup.schema';
import { CreateBackupDto } from '../dto/backup.dto';

@Injectable()
export class BackupService {
  constructor(
    @InjectModel(SystemBackup.name) private backupModel: Model<SystemBackupDocument>,
  ) {}

  async findAll(query: any = {}): Promise<SystemBackup[]> {
    return this.backupModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<SystemBackup> {
    const backup = await this.backupModel.findById(id).exec();
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }
    return backup;
  }

  async create(createBackupDto: CreateBackupDto, createdBy: string): Promise<SystemBackup> {
    const backup = new this.backupModel({
      ...createBackupDto,
      status: 'pending',
      createdBy,
    });
    return backup.save();
  }

  async updateStatus(id: string, status: string, metadata?: any): Promise<SystemBackup> {
    const update: any = { status };
    if (metadata) {
      update.metadata = metadata;
    }
    if (status === 'completed') {
      update.completedAt = new Date();
    }
    
    const backup = await this.backupModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }
    return backup;
  }

  async delete(id: string): Promise<void> {
    const result = await this.backupModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Backup not found');
    }
  }

  async getStats(): Promise<any> {
    const total = await this.backupModel.countDocuments();
    const completed = await this.backupModel.countDocuments({ status: 'completed' });
    const failed = await this.backupModel.countDocuments({ status: 'failed' });
    const inProgress = await this.backupModel.countDocuments({ status: 'in_progress' });

    const sizeStats = await this.backupModel.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } },
    ]);

    return {
      total,
      completed,
      failed,
      inProgress,
      totalSize: sizeStats[0]?.totalSize || 0,
    };
  }
}
