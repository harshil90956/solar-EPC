import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Installation, InstallationSchema } from './schemas/installation.schema';
import { InstallationController } from './controllers/installation.controller';
import { InstallationService } from './services/installation.service';
import { CommissioningIntegrationService } from './services/commissioning-integration.service';
import { SettingsModule } from '../settings/settings.module';
import { ProjectsModule } from '../projects/projects.module';
import { CommissioningModule } from '../commissioning/commissioning.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Installation.name, schema: InstallationSchema },
    ]),
    SettingsModule,
    ProjectsModule,
    CommissioningModule, // needed for automatic creation from delivered installations
  ],
  controllers: [InstallationController],
  providers: [InstallationService, CommissioningIntegrationService],
  exports: [InstallationService, CommissioningIntegrationService],
})
export class InstallationModule {}

