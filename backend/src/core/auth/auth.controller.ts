import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('users')
  async getUsers(@Query('tenantId') tenantId: string, @Query('role') role?: string) {
    return this.authService.getUsersByTenantAndRole(tenantId, role);
  }

  @Post('users')
  async createUser(@Query('tenantId') tenantId: string, @Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(tenantId, createUserDto);
  }

  @Get('users/:userId')
  async getUser(@Query('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.authService.findOne(tenantId, userId);
  }

  @Patch('users/:userId')
  async updateUser(@Query('tenantId') tenantId: string, @Param('userId') userId: string, @Body() updateUserDto: UpdateUserDto) {
    return this.authService.updateUser(tenantId, userId, updateUserDto);
  }

  @Delete('users/:userId')
  async deleteUser(@Query('tenantId') tenantId: string, @Param('userId') userId: string) {
    return this.authService.deleteUser(tenantId, userId);
  }
}
