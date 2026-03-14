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
    console.log('[DEBUG] EmployeeService.create called with:', createEmployeeDto, 'tenantId:', tenantId);
    
    const tid = await this.resolveTenantObjectId(tenantId || '');
    if (!tid) {
      throw new BadRequestException('Tenant context is missing or invalid');
    }
    
    // Build query for duplicate check
    const duplicateQuery: any = { 
      employeeId: createEmployeeDto.employeeId,
      tenantId: tid,
    };
    
    // Check if employeeId already exists for this tenant
    console.log('[DEBUG] Checking duplicate employeeId:', duplicateQuery);
    const existingEmployee = await this.employeeModel.findOne(duplicateQuery);

    if (existingEmployee) {
      console.log('[DEBUG] Employee with ID already exists:', createEmployeeDto.employeeId);
      throw new BadRequestException(`Employee with ID ${createEmployeeDto.employeeId} already exists`);
    }

    // Build email query for duplicate check
    const emailLower = (createEmployeeDto.email || '').toLowerCase();
    const emailQuery: any = { 
      email: emailLower,
      tenantId: tid,
    };
    
    // Check if email already exists for this tenant
    console.log('[DEBUG] Checking duplicate email:', emailQuery);
    const existingEmail = await this.employeeModel.findOne(emailQuery);

    if (existingEmail) {
      console.log('[DEBUG] Employee with email already exists:', createEmployeeDto.email);
      throw new BadRequestException(`Employee with email ${createEmployeeDto.email} already exists`);
    }

    const employeeData: any = { 
      ...createEmployeeDto,
      tenantId: tid,
    };

    // Convert joiningDate from string to Date if needed
    if (employeeData.joiningDate && typeof employeeData.joiningDate === 'string') {
      employeeData.joiningDate = new Date(employeeData.joiningDate);
    }

    // Convert salary from string to Number if needed
    if (employeeData.salary && typeof employeeData.salary === 'string') {
      employeeData.salary = Number(employeeData.salary);
    }

    // Hash password before saving
    if (employeeData.password) {
      console.log('[DEBUG] Hashing password...');
      employeeData.password = await bcrypt.hash(employeeData.password, 10);
    } else {
      console.log('[DEBUG] No password provided!');
    }

    console.log('[DEBUG] Creating employee with data:', employeeData);
    const employee = new this.employeeModel(employeeData);
    const savedEmployee = await employee.save();
    console.log('[DEBUG] Employee saved successfully:', savedEmployee);
    return savedEmployee;
  }

  async findAll(tenantId?: string): Promise<Employee[]> {
    console.log('[DEBUG] EmployeeService.findAll called with tenantId:', tenantId);
    const tid = await this.resolveTenantObjectId(tenantId || '');
    const query: any = tid ? { tenantId: tid } : {};
    console.log('[DEBUG] Employee findAll query:', query);
    const employees = await this.employeeModel
      .find(query)
      .populate('roleId', 'roleId label color')
      .sort({ createdAt: -1 })
      .exec();
    console.log('[DEBUG] Employee findAll result count:', employees.length);
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
    console.log('[DEBUG] validateLogin called with email:', email, 'tenantId:', tenantId);
    
    const tid = await this.resolveTenantObjectId(tenantId || '');
    
    // Build query to find employee by email
    const emailLower = (email || '').toLowerCase();
    const query: any = { 
      email: emailLower,
    };
    if (tid) {
      query.tenantId = tid;
    }
    
    console.log('[DEBUG] Login query:', JSON.stringify(query));
    
    let employee = await this.employeeModel
      .findOne(query)
      .populate('roleId', 'roleId label color permissions')
      .exec();

    if (!employee) {
      // If employee not found, check users collection and auto-create
      console.log('[DEBUG] Checking users collection for fallback...');
      const userEmailLower = (email || '').toLowerCase();
      const userQuery: any = { 
        email: userEmailLower,
      };
      if (tid) {
        userQuery.tenantId = tid;
      }
      
      const user = await this.userModel.findOne(userQuery).exec();
      console.log('[DEBUG] User found in users collection:', user ? 'YES' : 'NO');
      
      if (user && user.passwordHash) {
        // Verify password with user's passwordHash
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        console.log('[DEBUG] User password valid:', isPasswordValid);
        
        if (!isPasswordValid) {
          return null;
        }
        
        // Auto-create employee from user data
        console.log('[DEBUG] Auto-creating employee from user data...');
        const employeeId = this.generateEmployeeId();
        const derivedFirstName = (user.firstName || user.name?.split(' ')[0] || email.split('@')[0] || 'User').trim();
        const derivedLastName = (user.lastName || user.name?.split(' ').slice(1).join(' ') || 'User').trim();
        const derivedPhone = (user.phone || '0000000000').trim();
        const newEmployeeData = {
          employeeId,
          firstName: derivedFirstName || 'User',
          lastName: derivedLastName || 'User',
          email: (user.email || '').toLowerCase(),
          password: user.passwordHash, // Already hashed
          phone: derivedPhone || '0000000000',
          address: user.address || '',
          joiningDate: new Date(),
          department: user.department || 'General',
          designation: user.role || 'Staff',
          status: 'active',
          roleId: user.roleId || user.role,
          tenantId: user.tenantId, // Use user's tenantId
        };
        
        const newEmployee = new this.employeeModel(newEmployeeData);
        employee = await newEmployee.save();
        console.log('[DEBUG] Employee auto-created:', employee._id);
      } else {
        // If no specific tenant matches, try searching across all tenants
        if (tid === null) {
          console.log('[DEBUG] Searching for employee across all tenants...');
          const searchEmailLower = (email || '').toLowerCase();
          employee = await this.employeeModel
            .findOne({ email: searchEmailLower })
            .populate('roleId', 'roleId label color permissions')
            .exec();
          
          if (!employee) return null;
        } else {
          return null;
        }
      }
    }
    
    if (!employee.password) {
      console.log('[DEBUG] Employee has no password');
      return null;
    }

    // If employee was auto-created from user, password is already verified above
    // Otherwise verify employee's own password
    if (!employee.password.startsWith('$2')) {
      // Not a bcrypt hash, might be plaintext or already verified
      console.log('[DEBUG] Password not bcrypt hash, assuming pre-verified');
      return employee;
    }

    console.log('[DEBUG] Comparing passwords...');
    const isPasswordValid = await bcrypt.compare(password, employee.password);
    console.log('[DEBUG] Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return null;
    }

    return employee;
  }
}
