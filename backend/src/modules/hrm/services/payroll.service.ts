import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payroll, PayrollDocument } from '../schemas/payroll.schema';
import { Employee, EmployeeSchema } from '../schemas/employee.schema';
import { GeneratePayrollDto, MarkAsPaidDto, UpdatePayrollDto } from '../dto/payroll.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';
import { UserWithVisibility } from '../../../common/utils/visibility-filter';

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

  async generate(generateDto: GeneratePayrollDto, tenantId?: string, user?: UserWithVisibility): Promise<Payroll> {
    // 1. First, find the employee to get their actual tenantId
    const employee = await this.tenantModel.db.model('Employee', EmployeeSchema).findById(generateDto.employeeId).lean();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    const employeeTenantId = (employee as any).tenantId;

    // Check if payroll already exists for this month/year
    const existingPayroll = await this.payrollModel.findOne({
      employeeId: new Types.ObjectId(generateDto.employeeId),
      month: generateDto.month,
      year: generateDto.year,
      tenantId: employeeTenantId,
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
      tenantId: employeeTenantId,
    });

    return payroll.save();
  }

  async findAll(employeeId?: string, month?: number, year?: number, tenantId?: string, user?: UserWithVisibility): Promise<Payroll[]> {
    const query: any = {};

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      // Regular users MUST have a tenantId
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }
    
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

  async findOne(id: string, tenantId?: string, user?: UserWithVisibility): Promise<Payroll> {
    const query: any = { _id: new Types.ObjectId(id) };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    const payroll = await this.payrollModel
      .findOne(query)
      .populate('employeeId', 'firstName lastName employeeId email department designation')
      .exec();

    if (!payroll) {
      throw new NotFoundException(`Payroll with ID ${id} not found`);
    }

    return payroll;
  }

  async findByEmployeeId(employeeId: string, tenantId?: string, user?: UserWithVisibility): Promise<Payroll[]> {
    const query: any = { 
      employeeId: new Types.ObjectId(employeeId),
    };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    return this.payrollModel
      .find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .sort({ year: -1, month: -1 })
      .exec();
  }

  async markAsPaid(id: string, markDto: MarkAsPaidDto, tenantId?: string, user?: UserWithVisibility): Promise<Payroll> {
    const query: any = { _id: new Types.ObjectId(id) };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

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

  async getSalaryBreakdown(id: string, tenantId?: string, user?: UserWithVisibility): Promise<any> {
    const payroll = await this.findOne(id, tenantId, user) as PayrollDocument;

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

  async update(id: string, updateDto: UpdatePayrollDto, tenantId?: string, user?: UserWithVisibility): Promise<Payroll> {
    const query: any = { _id: new Types.ObjectId(id) };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    const payroll = await this.payrollModel.findOne(query);
    if (!payroll) {
      throw new NotFoundException(`Payroll record with ID ${id} not found`);
    }

    // Recalculate net salary if components are updated
    const baseSalary = updateDto.baseSalary !== undefined ? updateDto.baseSalary : payroll.baseSalary;
    const allowances = updateDto.allowances !== undefined ? updateDto.allowances : payroll.allowances;
    const deductions = updateDto.deductions !== undefined ? updateDto.deductions : payroll.deductions;
    const bonus = updateDto.bonus !== undefined ? updateDto.bonus : payroll.bonus;
    
    const netSalary = baseSalary + allowances + bonus - deductions;

    const updatedPayroll = await this.payrollModel.findOneAndUpdate(
      query,
      { 
        $set: { 
          ...updateDto,
          netSalary 
        } 
      },
      { new: true }
    ).populate('employeeId', 'firstName lastName employeeId email').exec();

    return updatedPayroll!;
  }

  async delete(id: string, tenantId?: string, user?: UserWithVisibility): Promise<void> {
    const query: any = { _id: new Types.ObjectId(id) };

    // SuperAdmin global view support
    if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
      if (tenantId && tenantId !== 'default' && tenantId !== 'undefined' && Types.ObjectId.isValid(tenantId)) {
        query.tenantId = new Types.ObjectId(tenantId);
      }
    } else {
      if (!tenantId || tenantId === 'default' || tenantId === 'undefined') {
        throw new BadRequestException('Tenant context is missing');
      }
      query.tenantId = await this.resolveTenantObjectId(tenantId);
    }

    const result = await this.payrollModel.deleteOne(query).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Payroll record with ID ${id} not found`);
    }
  }

  async generateBulk(employeeIds: string[], month: number, year: number, tenantId?: string, user?: UserWithVisibility): Promise<Payroll[]> {
    const results: Payroll[] = [];

    for (const employeeId of employeeIds) {
      try {
        // Generate using the updated generate method which handles tenantId resolution
        const payroll = await this.generate({
          employeeId,
          month,
          year,
          baseSalary: 30000, // Default - should come from employee record
          allowances: 5000,
          deductions: 2000,
          bonus: 0,
        }, tenantId, user);

        results.push(payroll);
      } catch (error) {
        // Log error but continue with others
        console.error(`Failed to generate payroll for employee ${employeeId}:`, error);
      }
    }

    return results;
  }
}
