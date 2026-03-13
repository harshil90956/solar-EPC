import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quotation, QuotationDocument } from '../schemas/quotation.schema';
import { QuotationHistory, QuotationHistoryDocument } from '../schemas/quotation-history.schema';
import { CreateQuotationDto, UpdateQuotationDto } from '../dto/quotation.dto';
import { v4 as uuidv4 } from 'uuid';
import { PdfService } from './pdf.service';
import { EmailService } from '../../email/email.service';

@Injectable()
export class QuotationService {
  constructor(
    @InjectModel(Quotation.name) private quotationModel: Model<QuotationDocument>,
    @InjectModel(QuotationHistory.name) private historyModel: Model<QuotationHistoryDocument>,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
  ) {}

  async create(createDto: CreateQuotationDto, userId: string, tenantId: string): Promise<Quotation> {
    const quotationId = `QTN-${uuidv4().split('-')[0].toUpperCase()}`;
    const newQuotation = new this.quotationModel({
      ...createDto,
      quotationId,
      userId,
      tenantId,
      createdBy: userId,
    });

    const saved = await newQuotation.save();
    await this.logHistory(saved._id as unknown as string, 'created', userId, tenantId, 'Initial quotation created');
    return saved;
  }

  async findAll(tenantId: string): Promise<Quotation[]> {
    return this.quotationModel.find({ tenantId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, tenantId: string): Promise<QuotationDocument> {
    const quotation = await this.quotationModel.findOne({ _id: id, tenantId }).exec();
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }

  async update(id: string, updateDto: UpdateQuotationDto, userId: string, tenantId: string): Promise<Quotation> {
    const existing = await this.findOne(id, tenantId);
    const updated = await this.quotationModel.findByIdAndUpdate(
      id,
      { $set: updateDto },
      { new: true }
    ).exec();

    if (!updated) throw new NotFoundException('Quotation not found');

    if (updateDto.status && updateDto.status !== existing.status) {
      await this.logHistory(id, 'edited', userId, tenantId, `Status changed from ${existing.status} to ${updateDto.status}`);
    } else {
      await this.logHistory(id, 'edited', userId, tenantId, 'Quotation details updated');
    }

    return updated;
  }

  async approve(id: string, userId: string, tenantId: string): Promise<Quotation> {
    const quotation = await this.update(id, { status: 'Approved' }, userId, tenantId);
    await this.logHistory(id, 'approved', userId, tenantId, 'Quotation approved');
    return quotation;
  }

  async reject(id: string, userId: string, tenantId: string, reason?: string): Promise<Quotation> {
    const quotation = await this.update(id, { status: 'Rejected' }, userId, tenantId);
    await this.logHistory(id, 'rejected', userId, tenantId, reason || 'Quotation rejected');
    return quotation;
  }

  async generatePdf(id: string, tenantId: string): Promise<Buffer> {
    const quotation = await this.findOne(id, tenantId);
    return this.pdfService.generateQuotationPdf({
      ...quotation.toObject(),
      date: new Date((quotation as any).createdAt).toLocaleDateString(),
      validUntil: quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A',
    });
  }

  async send(id: string, userId: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const quotation = await this.findOne(id, tenantId);
    
    // Generate PDF
    const pdfBuffer = await this.generatePdf(id, tenantId);

    // Send Email
    const emailResult = await this.emailService.sendEmail(
      quotation.customerEmail,
      'Solar System Quotation',
      `Dear ${quotation.customerName},\n\nPlease find attached your solar quotation.\n\nRegards,\nSolar Company`,
      undefined,
      [{
        filename: `Quotation_${quotation.quotationId}.pdf`,
        content: pdfBuffer,
      }]
    );

    if (emailResult.success) {
      await this.update(id, { status: 'Sent' }, userId, tenantId);
      await this.logHistory(id, 'sent', userId, tenantId, `Quotation emailed to ${quotation.customerEmail}`);
    }

    return emailResult;
  }

  async convertToProject(id: string, userId: string, tenantId: string): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    if (quotation.status !== 'Approved') {
      throw new BadRequestException('Only approved quotations can be converted to projects');
    }

    const updated = await this.update(id, { status: 'ConvertedToProject' }, userId, tenantId);
    await this.logHistory(id, 'converted', userId, tenantId, 'Quotation converted to project');
    return updated;
  }

  private async logHistory(quotationId: string, action: string, userId: string, tenantId: string, notes?: string) {
    const history = new this.historyModel({
      quotationId,
      action,
      userId,
      tenantId,
      notes,
      timestamp: new Date(),
    });
    await history.save();
  }

  async getHistory(quotationId: string, tenantId: string): Promise<QuotationHistory[]> {
    return this.historyModel.find({ quotationId, tenantId }).sort({ timestamp: -1 }).exec();
  }
}
