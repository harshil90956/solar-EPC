import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TenantController } from './controllers/tenant.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { BackupController } from './controllers/backup.controller';
import { TenantService } from './services/tenant.service';
import { SubscriptionService } from './services/subscription.service';
import { BackupService } from './services/backup.service';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { SystemBackup, SystemBackupSchema } from './schemas/backup.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SystemBackup.name, schema: SystemBackupSchema },
    ]),
  ],
  controllers: [
    TenantController,
    SubscriptionController,
    BackupController,
  ],
  providers: [
    TenantService,
    SubscriptionService,
    BackupService,
  ],
  exports: [
    TenantService,
    SubscriptionService,
    BackupService,
  ],
})
export class SuperadminModule {}
