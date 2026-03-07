import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { CreatePaymentDto, UpdatePaymentDto } from '../dto/payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
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

  async findAll(tenantId: string, invoiceId?: string): Promise<Payment[]> {
    const tid = this.toObjectId(tenantId);
    const query: any = tid ? { tenantId: tid } : {};
    if (invoiceId) {
      query.invoiceId = new Types.ObjectId(invoiceId);
    }
    return this.paymentModel.find(query).sort({ paymentDate: -1 }).lean();
  }

  async findById(tenantId: string, id: string): Promise<Payment> {
    const tid = this.toObjectId(tenantId);
    const payment = await this.paymentModel.findOne({
      _id: new Types.ObjectId(id),
      ...(tid ? { tenantId: tid } : {}),
    }).lean();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async create(tenantId: string, dto: CreatePaymentDto): Promise<Payment> {
    const payment = new this.paymentModel({
      ...dto,
      tenantId: this.toObjectId(tenantId),
      invoiceId: new Types.ObjectId(dto.invoiceId),
      paymentDate: new Date(dto.paymentDate),
    });

    const saved = await payment.save();
    return saved.toObject();
  }

  async update(tenantId: string, id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const existing = await this.findById(tenantId, id);

    const updated = await this.paymentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: this.toObjectId(tenantId) },
      {
        ...dto,
        invoiceId: dto.invoiceId ? new Types.ObjectId(dto.invoiceId) : existing.invoiceId,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : existing.paymentDate,
      },
      { new: true },
    ).lean();

    if (!updated) {
      throw new NotFoundException('Payment not found');
    }

    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const result = await this.paymentModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!result) {
      throw new NotFoundException('Payment not found');
    }
  }
}
