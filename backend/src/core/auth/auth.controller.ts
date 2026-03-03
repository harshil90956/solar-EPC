import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
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
}
