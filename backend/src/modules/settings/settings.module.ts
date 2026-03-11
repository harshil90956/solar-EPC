import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsController } from './controllers/settings.controller';
import { SettingsService } from './services/settings.service';
import { FeatureFlagService } from './services/feature-flag.service';
import { RBACService } from './services/rbac.service';
import { CustomRoleService } from './services/custom-role.service';
import { UserOverrideService } from './services/user-override.service';
import { PermissionService } from './services/permission.service';
import { ViewAsService } from './services/view-as.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { AuditService } from './services/audit.service';
import { ProjectTypeService } from './services/project-type.service';
import { InstallationTaskService } from './services/installation-task.service';
import { LeadStatusService } from './services/lead-status.service';
import { InstallationTaskConfig, InstallationTaskConfigSchema } from './schemas/installation-task.schema';
import { LeadStatusController } from './controllers/lead-status.controller';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import {
  FeatureFlag,
  FeatureFlagSchema,
  RBACConfig,
  RBACConfigSchema,
  WorkflowRule,
  WorkflowRuleSchema,
  WorkflowExecution,
  WorkflowExecutionSchema,
  AuditLog,
  AuditLogSchema,
  CustomRole,
  CustomRoleSchema,
  UserOverride,
  UserOverrideSchema,
  ProjectTypeConfig,
  ProjectTypeConfigSchema,
  LeadStatus,
  LeadStatusSchema,
} from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeatureFlag.name, schema: FeatureFlagSchema },
      { name: RBACConfig.name, schema: RBACConfigSchema },
      { name: WorkflowRule.name, schema: WorkflowRuleSchema },
      { name: WorkflowExecution.name, schema: WorkflowExecutionSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: CustomRole.name, schema: CustomRoleSchema },
      { name: UserOverride.name, schema: UserOverrideSchema },
      { name: ProjectTypeConfig.name, schema: ProjectTypeConfigSchema },
      { name: InstallationTaskConfig.name, schema: InstallationTaskConfigSchema },
      { name: LeadStatus.name, schema: LeadStatusSchema },
      { name: Lead.name, schema: LeadSchema },
    ]),
  ],
  controllers: [SettingsController, LeadStatusController],
  providers: [
    SettingsService, 
    FeatureFlagService, 
    RBACService,
    CustomRoleService,
    UserOverrideService,
    PermissionService,
    ViewAsService,
    WorkflowEngineService,
    AuditService,
    ProjectTypeService,
    InstallationTaskService,
    LeadStatusService,
  ],
  exports: [
    SettingsService, 
    FeatureFlagService, 
    RBACService,
    CustomRoleService,
    UserOverrideService,
    PermissionService,
    ViewAsService,
    WorkflowEngineService,
    AuditService,
    ProjectTypeService,
    InstallationTaskService,
    LeadStatusService,
  ],
})
export class SettingsModule {}

