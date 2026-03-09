import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Employee, EmployeeDocument } from '../schemas/employee.schema';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto/employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel('User') private readonly userModel: Model<any>,
  ) {}

  private generateEmployeeId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `EMP${timestamp}${random}`;
  }

  async create(createEmployeeDto: CreateEmployeeDto, tenantId?: string): Promise<Employee> {
    console.log('[DEBUG] EmployeeService.create called with:', createEmployeeDto, 'tenantId:', tenantId);
    
    // Build query for duplicate check
    const duplicateQuery: any = { employeeId: createEmployeeDto.employeeId };
    if (tenantId && tenantId !== 'default') {
      duplicateQuery.tenantId = new Types.ObjectId(tenantId);
    }
    
    // Check if employeeId already exists for this tenant
    console.log('[DEBUG] Checking duplicate employeeId:', duplicateQuery);
    const existingEmployee = await this.employeeModel.findOne(duplicateQuery);

    if (existingEmployee) {
      console.log('[DEBUG] Employee with ID already exists:', createEmployeeDto.employeeId);
      throw new BadRequestException(`Employee with ID ${createEmployeeDto.employeeId} already exists`);
    }

    // Build email query for duplicate check
    const emailQuery: any = { email: createEmployeeDto.email.toLowerCase() };
    if (tenantId && tenantId !== 'default') {
      emailQuery.tenantId = new Types.ObjectId(tenantId);
    }
    
    // Check if email already exists for this tenant
    console.log('[DEBUG] Checking duplicate email:', emailQuery);
    const existingEmail = await this.employeeModel.findOne(emailQuery);

    if (existingEmail) {
      console.log('[DEBUG] Employee with email already exists:', createEmployeeDto.email);
      throw new BadRequestException(`Employee with email ${createEmployeeDto.email} already exists`);
    }

    const employeeData: any = { ...createEmployeeDto };
    if (tenantId && tenantId !== 'default') {
      employeeData.tenantId = new Types.ObjectId(tenantId);
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
    const query: any = {};
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }
    return this.employeeModel
      .find(query)
      .populate('roleId', 'roleId label color')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, tenantId?: string): Promise<Employee> {
    const query: any = { _id: new Types.ObjectId(id) };
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

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
    const query: any = { employeeId };
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const employee = await this.employeeModel
      .findOne(query)
      .populate('roleId', 'roleId label color permissions')
      .exec();

    if (!employee) {
      throw new NotFoundException(`Employee with employee ID ${employeeId} not found`);
    }

    return employee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto, tenantId?: string): Promise<Employee> {
    const query: any = { _id: new Types.ObjectId(id) };
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    // Check if email is being updated and if it already exists
    if (updateEmployeeDto.email) {
      const existingEmail = await this.employeeModel.findOne({
        email: updateEmployeeDto.email.toLowerCase(),
        tenantId: tenantId ? new Types.ObjectId(tenantId) : undefined,
        _id: { $ne: new Types.ObjectId(id) },
      });

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
      .populate('roleId', 'roleId label color permissions')
      .exec();

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async remove(id: string, tenantId?: string): Promise<{ deleted: boolean }> {
    const query: any = { _id: new Types.ObjectId(id) };
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const result = await this.employeeModel.deleteOne(query).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return { deleted: true };
  }

  async countByStatus(status: string, tenantId?: string): Promise<number> {
    const query: any = { status };
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }
    return this.employeeModel.countDocuments(query).exec();
  }

  async findByDepartment(department: string, tenantId?: string): Promise<Employee[]> {
    const query: any = { department };
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }
    return this.employeeModel
      .find(query)
      .populate('roleId', 'roleId label color')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByRole(roleId: string, tenantId?: string): Promise<Employee[]> {
    const query: any = { roleId: new Types.ObjectId(roleId) };
    if (tenantId && tenantId !== 'default') {
      query.tenantId = new Types.ObjectId(tenantId);
    }
    return this.employeeModel
      .find(query)
      .populate('roleId', 'roleId label color')
      .sort({ createdAt: -1 })
      .exec();
  }

  async validateLogin(email: string, password: string, tenantId?: string): Promise<Employee | null> {
    console.log('[DEBUG] validateLogin called with email:', email, 'tenantId:', tenantId);
    
    // Build query to find employee by email
    // Search for employees with: matching tenantId OR null tenantId OR missing tenantId
    let query: any = { email: email.toLowerCase() };
    
    if (tenantId && tenantId !== 'default') {
      // Search for employees with matching tenantId OR null/undefined tenantId
      query = {
        email: email.toLowerCase(),
        $or: [
          { tenantId: new Types.ObjectId(tenantId) },
          { tenantId: null },
          { tenantId: { $exists: false } }
        ]
      };
    } else {
      // For 'default' tenant, search employees with null/missing tenantId only
      // Note: tenantId is ObjectId type, cannot query with string 'default'
      query = {
        email: email.toLowerCase(),
        $or: [
          { tenantId: null },
          { tenantId: { $exists: false } }
        ]
      };
    }
    
    console.log('[DEBUG] Login query:', JSON.stringify(query));
    
    let employee = await this.employeeModel
      .findOne(query)
      .populate('roleId', 'roleId label color permissions')
      .exec();

    console.log('[DEBUG] Employee found:', employee ? 'YES' : 'NO');
    
    // If employee not found, check users collection and auto-create
    if (!employee) {
      console.log('[DEBUG] Checking users collection for fallback...');
      const userQuery: any = { email: email.toLowerCase() };
      // NOTE: User.tenantId is ObjectId type; do not query with string 'default'
      if (tenantId && tenantId !== 'default' && Types.ObjectId.isValid(tenantId)) {
        userQuery.$or = [
          { tenantId: new Types.ObjectId(tenantId) },
          { tenantId: null },
          { tenantId: { $exists: false } }
        ];
      } else {
        userQuery.$or = [
          { tenantId: null },
          { tenantId: { $exists: false } }
        ];
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
          email: user.email.toLowerCase(),
          password: user.passwordHash, // Already hashed
          phone: derivedPhone || '0000000000',
          address: user.address || '',
          joiningDate: new Date(),
          department: user.department || 'General',
          designation: user.role || 'Staff',
          status: 'active',
          roleId: user.roleId || user.role,
        };
        
        const newEmployee = new this.employeeModel(newEmployeeData);
        employee = await newEmployee.save();
        console.log('[DEBUG] Employee auto-created:', employee._id);
      } else {
        return null;
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
