import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto/employee.dto';
import { EmployeeDocument } from '../schemas/employee.schema';

@Controller('hrm/employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { email: string; password: string }, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const employee = await this.employeeService.validateLogin(loginDto.email, loginDto.password, tenantId) as EmployeeDocument | null;
    
    if (!employee) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT token
    const token = require('jsonwebtoken').sign(
      { 
        id: employee._id,
        email: employee.email,
        role: employee.roleId,
        tenantId: tenantId
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    return { 
      success: true, 
      data: {
        id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        roleId: employee.roleId,
        token
      }
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.employeeService.create(createEmployeeDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.employeeService.findAll(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.employeeService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.employeeService.update(id, updateEmployeeDto, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.employeeService.remove(id, tenantId);
    return { success: true, data };
  }

  @Get('by-department/:department')
  async findByDepartment(@Param('department') department: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.employeeService.findByDepartment(department, tenantId);
    return { success: true, data };
  }

  @Get('by-role/:roleId')
  async findByRole(@Param('roleId') roleId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || 'default';
    const data = await this.employeeService.findByRole(roleId, tenantId);
    return { success: true, data };
  }
}
