import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payroll, PayrollDocument } from '../schemas/payroll.schema';
import { GeneratePayrollDto, MarkAsPaidDto } from '../dto/payroll.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(Payroll.name) private readonly payrollModel: Model<PayrollDocument>,
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

  async generate(generateDto: GeneratePayrollDto, tenantId?: string): Promise<Payroll> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    // Check if payroll already exists for this month/year
    const existingPayroll = await this.payrollModel.findOne({
      employeeId: new Types.ObjectId(generateDto.employeeId),
      month: generateDto.month,
      year: generateDto.year,
      tenantId: tid,
    });

    if (existingPayroll) {
      throw new BadRequestException(`Payroll already generated for ${generateDto.month}/${generateDto.year}`);
    }

    // Calculate net salary
    const allowances = generateDto.allowances || 0;
    const deductions = generateDto.deductions || 0;
    const bonus = generateDto.bonus || 0;
    const netSalary = generateDto.baseSalary + allowances + bonus - deductions;

    const payroll = new this.payrollModel({
      ...generateDto,
      employeeId: new Types.ObjectId(generateDto.employeeId),
      allowances,
      deductions,
      bonus,
      netSalary,
      isPaid: false,
      tenantId: tid,
    });

    return payroll.save();
  }

  async findAll(employeeId?: string, month?: number, year?: number, tenantId?: string): Promise<Payroll[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { tenantId: tid };
    
    if (employeeId) {
      query.employeeId = new Types.ObjectId(employeeId);
    }
    
    if (month) {
      query.month = month;
    }
    
    if (year) {
      query.year = year;
    }

    return this.payrollModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId email')
      .sort({ year: -1, month: -1 })
      .exec();
  }

  async findOne(id: string, tenantId?: string): Promise<Payroll> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id), tenantId: tid };

    const payroll = await this.payrollModel
      .findOne(query)
      .populate('employeeId', 'firstName lastName employeeId email department designation')
      .exec();

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${id} not found`);
    }

    return payroll;
  }

  async findByEmployeeId(employeeId: string, tenantId?: string): Promise<Payroll[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId),
      tenantId: tid,
    };

    return this.payrollModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .sort({ year: -1, month: -1 })
      .exec();
  }

  async markAsPaid(id: string, markDto: MarkAsPaidDto, tenantId?: string): Promise<Payroll> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id), tenantId: tid };

    const payroll = await this.payrollModel
      .findOneAndUpdate(
        query,
        {
          $set: {
            isPaid: true,
            paidAt: new Date(),
            paymentReference: markDto.paymentReference,
          },
        },
        { new: true }
      )
      .populate('employeeId', 'firstName lastName employeeId')
      .exec();

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${id} not found`);
    }

    return payroll;
  }

  async getSalaryBreakdown(id: string, tenantId?: string): Promise<any> {
    const payroll = await this.findOne(id, tenantId) as PayrollDocument;

    return {
      payrollId: payroll._id,
      employee: payroll.employeeId,
      month: payroll.month,
      year: payroll.year,
      earnings: {
        baseSalary: payroll.baseSalary,
        allowances: payroll.allowances,
        bonus: payroll.bonus,
        grossSalary: payroll.baseSalary + payroll.allowances + payroll.bonus,
      },
      deductions: {
        total: payroll.deductions,
        // Can be expanded to include individual deduction types
      },
      netSalary: payroll.netSalary,
      isPaid: payroll.isPaid,
      paidAt: payroll.paidAt,
      paymentReference: payroll.paymentReference,
      generatedAt: payroll.generatedAt,
    };
  }

  async generateBulk(employeeIds: string[], month: number, year: number, tenantId?: string): Promise<Payroll[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const results: Payroll[] = [];

    for (const employeeId of employeeIds) {
      try {
        // Check if already exists
        const existing = await this.payrollModel.findOne({
          employeeId: new Types.ObjectId(employeeId),
          month,
          year,
          tenantId: tid,
        });

        if (existing) {
          continue; // Skip if already exists
        }

        // Generate with default values (can be customized per employee)
        const payroll = await this.generate({
          employeeId,
          month,
          year,
          baseSalary: 30000, // Default - should come from employee record
          allowances: 5000,
          deductions: 2000,
          bonus: 0,
        }, tenantId);

        results.push(payroll);
      } catch (error) {
        // Log error but continue with others
        console.error(`Failed to generate payroll for employee ${employeeId}:`, error);
      }
    }

    return results;
  }
}
