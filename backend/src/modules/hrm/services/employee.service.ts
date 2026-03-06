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
    // If tenantId is provided (and not 'default'), search for employees with matching tenantId OR null tenantId
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
    }
    
    console.log('[DEBUG] Login query:', JSON.stringify(query));
    
    const employee = await this.employeeModel
      .findOne(query)
      .populate('roleId', 'roleId label color permissions')
      .exec();

    console.log('[DEBUG] Employee found:', employee ? 'YES' : 'NO');
    
    if (!employee || !employee.password) {
      console.log('[DEBUG] Employee not found or no password');
      return null;
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
