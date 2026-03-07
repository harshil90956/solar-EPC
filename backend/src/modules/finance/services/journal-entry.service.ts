import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JournalEntry, JournalEntryDocument, JournalEntryLine } from '../schemas/journal-entry.schema';
import { ManualAdjustment, ManualAdjustmentDocument } from '../schemas/manual-adjustment.schema';
import { CreateJournalEntryDto, CreateJournalEntryFromAdjustmentDto } from '../dto/journal-entry.dto';

@Injectable()
export class JournalEntryService {
  constructor(
    @InjectModel(JournalEntry.name) private readonly journalEntryModel: Model<JournalEntryDocument>,
    @InjectModel(ManualAdjustment.name) private readonly manualAdjustmentModel: Model<ManualAdjustmentDocument>,
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

  private generateJournalEntryId(): string {
    const prefix = 'JE';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async findAll(tenantId: string): Promise<JournalEntry[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = { isDeleted: false };
    if (tid) {
      query.tenantId = tid;
    }
    return this.journalEntryModel
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  async findById(tenantId: string, id: string): Promise<JournalEntry | null> {
    const tid = this.toObjectId(tenantId);
    const query: any = { isDeleted: false, _id: id };
    if (tid) {
      query.tenantId = tid;
    }
    return this.journalEntryModel.findOne(query).lean();
  }

  async findByAdjustmentId(tenantId: string, adjustmentId: string): Promise<JournalEntry | null> {
    const tid = this.toObjectId(tenantId);
    const adjustmentObjId = this.toObjectId(adjustmentId);
    const query: any = { isDeleted: false, relatedAdjustmentId: adjustmentObjId };
    if (tid) {
      query.tenantId = tid;
    }
    return this.journalEntryModel.findOne(query).lean();
  }

  async create(tenantId: string, dto: CreateJournalEntryDto, userId?: string): Promise<JournalEntry> {
    // Validate that total debits equals total credits
    const totalDebit = dto.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredit = dto.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException('Total debit must equal total credit');
    }

    if (totalDebit === 0) {
      throw new BadRequestException('Journal entry must have at least one line with non-zero amount');
    }

    const createdByObjectId = userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined;

    const entry = new this.journalEntryModel({
      tenantId: this.toObjectId(tenantId),
      journalEntryId: this.generateJournalEntryId(),
      date: new Date(dto.date),
      narration: dto.narration,
      reference: dto.reference,
      lines: dto.lines,
      totalDebit,
      totalCredit,
      relatedAdjustmentId: this.toObjectId(dto.relatedAdjustmentId),
      createdBy: createdByObjectId,
      isDeleted: false,
    });

    const saved = await entry.save();
    return saved.toObject();
  }

  async createFromAdjustment(
    tenantId: string,
    dto: CreateJournalEntryFromAdjustmentDto,
    adjustmentId: string,
    userId?: string,
  ): Promise<JournalEntry> {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const lines: JournalEntryLine[] = [];
    let narration = '';

    if (dto.type === 'debit') {
      // Debit adjustment: Category account debited, Cash/Bank credited
      lines.push({
        accountName: dto.category, // Debit: Selected Category
        debitAmount: amount,
        creditAmount: 0,
      });
      lines.push({
        accountName: 'Cash/Bank A/c', // Credit: Cash/Bank
        debitAmount: 0,
        creditAmount: amount,
      });
      narration = `Debit adjustment: ${dto.reason || dto.category}`;
    } else {
      // Credit adjustment: Cash/Bank debited, Category credited
      lines.push({
        accountName: 'Cash/Bank A/c', // Debit: Cash/Bank
        debitAmount: amount,
        creditAmount: 0,
      });
      lines.push({
        accountName: dto.category, // Credit: Selected Category
        debitAmount: 0,
        creditAmount: amount,
      });
      narration = `Credit adjustment: ${dto.reason || dto.category}`;
    }

    const journalEntryDto: CreateJournalEntryDto = {
      date: dto.date,
      narration: narration || dto.reason,
      reference: dto.reference,
      lines,
      relatedAdjustmentId: adjustmentId,
    };

    return this.create(tenantId, journalEntryDto, userId);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const tid = this.toObjectId(tenantId);
    const query: any = { isDeleted: false, _id: id };
    if (tid) {
      query.tenantId = tid;
    }

    // Find the journal entry first to get relatedAdjustmentId
    const journalEntry = await this.journalEntryModel.findOne(query);
    if (!journalEntry) {
      throw new NotFoundException('Journal entry not found');
    }

    // Delete the journal entry (soft delete)
    await this.journalEntryModel.updateOne(query, { isDeleted: true });

    // Also delete the related manual adjustment if exists
    if (journalEntry.relatedAdjustmentId) {
      await this.manualAdjustmentModel.updateOne(
        { _id: journalEntry.relatedAdjustmentId, isDeleted: false },
        { isDeleted: true }
      );
    }
  }
}
