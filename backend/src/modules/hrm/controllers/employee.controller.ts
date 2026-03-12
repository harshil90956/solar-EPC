import { Controller, Get, Post, Patch, Delete, Body, Param, Req, Headers, Query, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto/employee.dto';
import { EmployeeDocument } from '../schemas/employee.schema';

@Controller('hrm/employees')
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: { email: string; password: string },
    @Req() req: any,
    @Headers('x-tenant-id') headerTenantId: string,
    @Query('tenantId') queryTenantId: string,
  ) {
    // For login, try to resolve tenantId from headers, query, or context.
    // If multiple tenants exist, we need to know which one the user belongs to.
    const tenantId = headerTenantId || queryTenantId || req.tenant?.id || req.user?.tenantId;
    
    // If no tenantId provided, we'll try to find the employee across all tenants by email.
    // This is useful if the frontend hasn't set the tenant context yet.
    const resolvedTenantId = tenantId || 'ANY_TENANT';

    console.log('[DEBUG] Employee login - tenantId:', tenantId, 'email:', loginDto.email);
    
    const employee = await this.employeeService.validateLogin(loginDto.email, loginDto.password, resolvedTenantId) as EmployeeDocument | null;
    
    if (!employee) {
      console.log('[DEBUG] Login failed - employee not found or invalid password');
      throw new UnauthorizedException('Invalid email or password');
    }

    // IMPORTANT:
    // Always embed the employee's actual tenant ObjectId in the JWT.
    // The incoming tenantId may be a placeholder like 'default' if frontend didn't send x-tenant-id.
    const effectiveTenantId = employee?.tenantId ? String(employee.tenantId) : tenantId;

    // Generate JWT token using same secret as JwtStrategy
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const dataScope = (employee as any)?.dataScope || 'ASSIGNED';
    const token = require('jsonwebtoken').sign(
      { 
        sub: employee._id,
        email: employee.email,
        role: 'Employee',
        roleId: employee.roleId,
        tenantId: effectiveTenantId,
        dataScope,
      },
      jwtSecret,
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
        dataScope,
        tenantId: effectiveTenantId,
        token
      }
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Req() req: any) {
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';
    const data = await this.employeeService.create(createEmployeeDto, tenantId);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';
    const data = await this.employeeService.findAll(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';
    const data = await this.employeeService.findOne(id, tenantId);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';
    const data = await this.employeeService.update(id, updateEmployeeDto, tenantId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';
    const data = await this.employeeService.remove(id, tenantId);
    return { success: true, data };
  }

  @Get('by-department/:department')
  async findByDepartment(@Param('department') department: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';
    const data = await this.employeeService.findByDepartment(department, tenantId);
    return { success: true, data };
  }

  @Get('by-role/:roleId')
  async findByRole(@Param('roleId') roleId: string, @Req() req: any) {
    const tenantId = req.tenant?.id || req.user?.tenantId || req.headers?.['x-tenant-id'] || req.query?.tenantId || 'default';
    const data = await this.employeeService.findByRole(roleId, tenantId);
    return { success: true, data };
  }
}
