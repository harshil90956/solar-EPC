import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { CreatePaymentDto, UpdatePaymentDto } from '../dto/payment.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId> {
    if (!tenantId) {
      throw new BadRequestException('Tenant context is missing');
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      throw new BadRequestException(`Tenant not found for identifier: ${tenantId}`);
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  private notDeletedMatch() {
    return { isDeleted: false };
  }

  async findAll(tenantId: string, invoiceId?: string): Promise<Payment[]> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const query: any = { tenantId: tid, ...this.notDeletedMatch() };
    if (invoiceId) {
      query.invoiceId = new Types.ObjectId(invoiceId);
    }
    return this.paymentModel.find(query).sort({ paymentDate: -1 }).lean();
  }

  async findById(tenantId: string, id: string): Promise<Payment> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const payment = await this.paymentModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: tid,
      ...this.notDeletedMatch(),
    }).lean();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async create(tenantId: string, dto: CreatePaymentDto): Promise<Payment> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const payment = new this.paymentModel({
      ...dto,
      tenantId: tid,
      invoiceId: new Types.ObjectId(dto.invoiceId),
      paymentDate: new Date(dto.paymentDate),
    });

    const saved = await payment.save();
    return saved.toObject();
  }

  async update(tenantId: string, id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const tid = await this.resolveTenantObjectId(tenantId);
    const existing = await this.findById(tenantId, id);

    const updated = await this.paymentModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: tid },
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
    const tid = await this.resolveTenantObjectId(tenantId);
    const result = await this.paymentModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      tenantId: tid,
    });

    if (!result) {
      throw new NotFoundException('Payment not found');
    }
  }
}
