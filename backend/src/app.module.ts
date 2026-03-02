import { Module } from '@nestjs/common';
import { CoreConfigModule } from './core/config/core-config.module';
import { DatabaseModule } from './shared/database/database.module';
import { CommissioningModule } from './modules/commissioning/commissioning.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { DesignModule } from './modules/design/design.module';
import { FinanceModule } from './modules/finance/finance.module';
import { InstallationModule } from './modules/installation/installation.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LeadsModule } from './modules/leads/leads.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuotationModule } from './modules/quotation/quotation.module';
import { ServiceAmcModule } from './modules/service-amc/service-amc.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SurveyModule } from './modules/survey/survey.module';
import { WorkflowModule } from './core/workflow/workflow.module';
import { PermissionsModule } from './core/permissions/permissions.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';

@Module({
  imports: [
    CoreConfigModule,
    DatabaseModule,

    AuthModule,
    TenantModule,
    WorkflowModule,
    PermissionsModule,

    LeadsModule,
    SurveyModule,
    DesignModule,
    QuotationModule,
    ProjectsModule,
    InventoryModule,
    ProcurementModule,
    LogisticsModule,
    InstallationModule,
    CommissioningModule,
    FinanceModule,
    ServiceAmcModule,
    ComplianceModule,
    SettingsModule,
  ],
})
export class AppModule {}
