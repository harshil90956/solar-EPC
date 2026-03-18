import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersController } from './controllers/customers.controller';
import { CustomersService } from './services/customers.service';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { SettingsModule } from '../settings/settings.module';
import { PermissionGuard } from '../settings/guards/permission.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
    ]),
    SettingsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService, PermissionGuard],
  exports: [CustomersService],
})
export class CustomersModule {}
