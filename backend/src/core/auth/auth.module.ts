import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from '../../services/otp.service';
import { MailerService } from '../../utils/mailer';
import { User, UserSchema } from './schemas/user.schema';
import { Tenant, TenantSchema } from '../../core/tenant/schemas/tenant.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CustomRole, CustomRoleSchema } from '../../modules/settings/schemas/custom-role.schema';
import { UserOverride, UserOverrideSchema } from '../../modules/settings/schemas/user-override.schema';
import { Employee, EmployeeSchema } from '../../modules/hrm/schemas/employee.schema';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    CommonModule, // Import for PermissionCacheService
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: CustomRole.name, schema: CustomRoleSchema },
      { name: UserOverride.name, schema: UserOverrideSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, MailerService, JwtStrategy],
  exports: [JwtModule, AuthService, OtpService, MailerService],
})
export class AuthModule {}
