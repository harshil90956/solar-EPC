import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Employee, EmployeeDocument } from '../schemas/employee.schema';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto/employee.dto';
import { Tenant, TenantDocument } from '../../../core/tenant/schemas/tenant.schema';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  private async resolveTenantObjectId(tenantId: string): Promise<Types.ObjectId | null> {
    if (!tenantId || tenantId === 'ANY_TENANT') {
      return null;
    }
    if (Types.ObjectId.isValid(tenantId)) {
      return new Types.ObjectId(tenantId);
    }
    const tenant = await this.tenantModel.findOne({ code: tenantId }).lean();
    if (!tenant) {
      return null;
    }
    return (tenant as any)._id as Types.ObjectId;
  }

  private generateEmployeeId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `EMP${timestamp}${random}`;
  }

  async create(createEmployeeDto: CreateEmployeeDto, tenantId?: string): Promise<Employee> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    if (!tid) {
      throw new BadRequestException('Invalid tenant context');
    }

    const duplicateQuery: any = { 
      employeeId: createEmployeeDto.employeeId,
      tenantId: tid 
    };
    
    // Check if employeeId already exists for this tenant
    const existingEmployee = await this.employeeModel.findOne(duplicateQuery);

    if (existingEmployee) {
      throw new BadRequestException(`Employee with ID ${createEmployeeDto.employeeId} already exists`);
    }

    const emailQuery: any = { 
      email: (createEmployeeDto.email || '').toLowerCase(),
      tenantId: tid 
    };
    
    // Check if email already exists for this tenant
    const existingEmail = await this.employeeModel.findOne(emailQuery);

    if (existingEmail) {
      throw new BadRequestException(`Employee with email ${createEmployeeDto.email} already exists`);
    }

    const employeeData = {
      ...createEmployeeDto,
      tenantId: tid,
      email: (createEmployeeDto.email || '').toLowerCase(),
    };

    // Hash password before saving
    if (employeeData.password) {
      employeeData.password = await bcrypt.hash(employeeData.password, 10);
    }

    const employee = new this.employeeModel(employeeData);
    const savedEmployee = await employee.save();
    return savedEmployee;
  }

  async findAll(tenantId?: string): Promise<Employee[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = tid ? { tenantId: tid } : {};
    const employees = await this.employeeModel
      .find(query)
      .populate('roleId', 'roleId label color')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return employees;
  }

  async findOne(id: string, tenantId?: string): Promise<Employee> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id) };
    if (tid) query.tenantId = tid;

    const employee = await this.employeeModel
      .findOne(query)
      .populate('roleId', 'roleId label color permissions')
      .exec();

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async findByEmployeeId(employeeId: string, tenantId?: string): Promise<Employee> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { employeeId };
    if (tid) query.tenantId = tid;

    const employee = await this.employeeModel
      .findOne(query)
      .populate('roleId', 'roleId label color permissions')
      .exec();

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto, tenantId?: string): Promise<Employee> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id) };
    if (tid) query.tenantId = tid;

    // Check if email is being updated and if it already exists
    if (updateEmployeeDto.email) {
      const emailLower = updateEmployeeDto.email.toLowerCase();
      const existingEmailQuery: any = {
        email: emailLower,
        _id: { $ne: new Types.ObjectId(id) },
      };
      if (tid) existingEmailQuery.tenantId = tid;
      
      const existingEmail = await this.employeeModel.findOne(existingEmailQuery);

      if (existingEmail) {
        throw new BadRequestException(`Employee with email ${updateEmployeeDto.email} already exists`);
      }
    }

    const employee = await this.employeeModel
      .findOneAndUpdate(
        query,
        { $set: updateEmployeeDto },
        { new: true }
      )
      .exec();

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async remove(id: string, tenantId?: string): Promise<any> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { _id: new Types.ObjectId(id) };
    if (tid) query.tenantId = tid;

    return this.employeeModel.deleteOne(query).exec();
  }

  async findByDepartment(department: string, tenantId?: string): Promise<Employee[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { department };
    if (tid) query.tenantId = tid;

    return this.employeeModel
      .find(query)
      .populate('roleId', 'roleId label color')
      .exec();
  }

  async findByRole(roleId: string, tenantId?: string): Promise<Employee[]> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = { roleId };
    if (tid) query.tenantId = tid;

    return this.employeeModel
      .find(query)
      .populate('roleId', 'roleId label color')
      .exec();
  }

  async validateLogin(email: string, password: string, tenantId?: string): Promise<Employee | null> {
    const tid = await this.resolveTenantObjectId(tenantId || '');
    
    const userEmail = (email || '').toLowerCase();
    const query: any = { email: userEmail };
    if (tid) {
      query.tenantId = tid;
    }
    
    let employee = await this.employeeModel
      .findOne(query)
      .populate('roleId')
      .exec();

    if (!employee) {
      // If employee not found, check users collection and auto-create
      const userEmailLower = (email || '').toLowerCase();
      const userQuery: any = { 
        email: userEmailLower,
        status: 'active'
      };
      if (tid) {
        userQuery.tenantId = tid;
      }
      
      const user = await this.userModel.findOne(userQuery).exec();
      
      if (user && user.passwordHash) {
        // Verify password with user's passwordHash
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        
        if (!isPasswordValid) {
          return null;
        }
        
        // Auto-create employee from user data
        const employeeId = this.generateEmployeeId();
        const derivedFirstName = (user.firstName || user.name?.split(' ')[0] || email.split('@')[0] || 'User').trim();
        const derivedLastName = (user.lastName || user.name?.split(' ').slice(1).join(' ') || 'User').trim();
        
        const newEmployeeData = {
          employeeId,
          firstName: derivedFirstName,
          lastName: derivedLastName,
          email: userEmailLower,
          password: user.passwordHash, // Keep the same hash
          roleId: user.roleId,
          tenantId: user.tenantId,
          department: user.department || 'Other',
          designation: user.designation || 'Staff',
          status: 'active',
          joiningDate: new Date()
        };
        
        const newEmployee = new this.employeeModel(newEmployeeData);
        employee = await newEmployee.save();
      } else {
        // If no specific tenant matches, try searching across all tenants
        if (tid === null) {
          const searchEmailLower = (email || '').toLowerCase();
          employee = await this.employeeModel
            .findOne({ email: searchEmailLower })
            .populate('roleId')
            .exec();
        }
      }
    }
    
    if (!employee) return null;
    
    if (!employee.password) {
      return null;
    }

    // Otherwise verify employee's own password
    if (!employee.password.startsWith('$2')) {
      // Not a bcrypt hash, might be plaintext or already verified
      return employee;
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);
    
    if (!isPasswordValid) {
      return null;
    }

    return employee;
  }
}
