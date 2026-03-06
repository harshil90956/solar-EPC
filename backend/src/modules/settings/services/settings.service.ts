import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeatureFlag, FeatureFlagDocument } from '../schemas/feature-flag.schema';
import { RBACConfig, RBACConfigDocument } from '../schemas/rbac-config.schema';
import { WorkflowRule, WorkflowRuleDocument } from '../schemas/workflow-rule.schema';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';
import { CustomRole, CustomRoleDocument } from '../schemas/custom-role.schema';
import { ProjectTypeConfig, ProjectTypeConfigDocument } from '../schemas/project-type-config.schema';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(FeatureFlag.name) private featureFlagModel: Model<FeatureFlagDocument>,
    @InjectModel(RBACConfig.name) private rbacConfigModel: Model<RBACConfigDocument>,
    @InjectModel(WorkflowRule.name) private workflowRuleModel: Model<WorkflowRuleDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(CustomRole.name) private customRoleModel: Model<CustomRoleDocument>,
    @InjectModel(ProjectTypeConfig.name) private projectTypeConfigModel: Model<ProjectTypeConfigDocument>,
  ) {}

  private toObjectId(tenantId: string | undefined): Types.ObjectId | undefined {
    if (!tenantId) return undefined;
    // Check if tenantId is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(tenantId);
    if (!isValidObjectId) return undefined;
    return new Types.ObjectId(tenantId);
  }

  // ── Feature Flags ─────────────────────────────────────────────────────────
  async getFeatureFlags(tenantId?: string): Promise<FeatureFlag[]> {
    const tid = this.toObjectId(tenantId);
    return this.featureFlagModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async updateFeatureFlag(moduleId: string, update: Partial<FeatureFlag>, tenantId?: string): Promise<FeatureFlag> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { moduleId, tenantId: tid } : { moduleId };
    const doc = await this.featureFlagModel.findOneAndUpdate(filter, { $set: update }, { upsert: true, new: true }).exec();
    return doc;
  }

  async toggleModule(moduleId: string, enabled: boolean, tenantId?: string): Promise<FeatureFlag> {
    return this.updateFeatureFlag(moduleId, { enabled }, tenantId);
  }

  async toggleFeature(moduleId: string, featureId: string, enabled: boolean, tenantId?: string): Promise<FeatureFlag> {
    const flag = await this.getOrCreateFeatureFlag(moduleId, tenantId);
    flag.features.set(featureId, enabled);
    return flag.save();
  }

  async toggleAction(moduleId: string, actionId: string, enabled: boolean, tenantId?: string): Promise<FeatureFlag> {
    const flag = await this.getOrCreateFeatureFlag(moduleId, tenantId);
    flag.actions.set(actionId, enabled);
    return flag.save();
  }

  private async getOrCreateFeatureFlag(moduleId: string, tenantId?: string): Promise<FeatureFlagDocument> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { moduleId, tenantId: tid } : { moduleId };
    let flag = await this.featureFlagModel.findOne(filter).exec();
    if (!flag) {
      flag = new this.featureFlagModel({ moduleId, tenantId: tid, enabled: true, features: {}, actions: {} });
      await flag.save();
    }
    return flag;
  }

  // ── RBAC ─────────────────────────────────────────────────────────────────
  async getRBACConfigs(tenantId?: string): Promise<RBACConfig[]> {
    const tid = this.toObjectId(tenantId);
    return this.rbacConfigModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async updateRBAC(roleId: string, moduleId: string, permissions: Map<string, boolean>, tenantId?: string): Promise<RBACConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { roleId, moduleId, tenantId: tid } : { roleId, moduleId };
    const doc = await this.rbacConfigModel.findOneAndUpdate(filter, { $set: { permissions } }, { upsert: true, new: true }).exec();
    return doc;
  }

  async toggleRBAC(roleId: string, moduleId: string, actionId: string, enabled: boolean, tenantId?: string): Promise<RBACConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { roleId, moduleId, tenantId: tid } : { roleId, moduleId };
    let config = await this.rbacConfigModel.findOne(filter).exec();
    if (!config) {
      config = new this.rbacConfigModel({ roleId, moduleId, tenantId: tid, permissions: new Map() });
    }
    config.permissions.set(actionId, enabled);
    return config.save();
  }

  // ── Workflow Rules ──────────────────────────────────────────────────────
  async getWorkflowRules(tenantId?: string): Promise<WorkflowRule[]> {
    const tid = this.toObjectId(tenantId);
    return this.workflowRuleModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async createWorkflowRule(rule: Partial<WorkflowRule>, tenantId?: string): Promise<WorkflowRule> {
    const tid = this.toObjectId(tenantId);
    const newRule = new this.workflowRuleModel({ ...rule, tenantId: tid, wfId: `wf${Date.now()}` });
    return newRule.save();
  }

  async updateWorkflowRule(wfId: string, updates: Partial<WorkflowRule>, tenantId?: string): Promise<WorkflowRule | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { wfId, tenantId: tid } : { wfId };
    return this.workflowRuleModel.findOneAndUpdate(filter, { $set: updates }, { new: true }).exec();
  }

  async deleteWorkflowRule(wfId: string, tenantId?: string): Promise<WorkflowRule | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { wfId, tenantId: tid } : { wfId };
    return this.workflowRuleModel.findOneAndDelete(filter).exec();
  }

  // ── Audit Logs ───────────────────────────────────────────────────────────
  async getAuditLogs(tenantId?: string, limit = 500): Promise<AuditLog[]> {
    const tid = this.toObjectId(tenantId);
    return this.auditLogModel.find(tid ? { tenantId: tid } : {}).sort({ ts: -1 }).limit(limit).exec();
  }

  async createAuditLog(log: Partial<AuditLog>, tenantId?: string): Promise<AuditLog> {
    const tid = this.toObjectId(tenantId);
    const newLog = new this.auditLogModel({
      ...log,
      tenantId: tid,
      logId: `a${Date.now()}`,
      ts: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });
    return newLog.save();
  }

  // ── Custom Roles ────────────────────────────────────────────────────────
  async getCustomRoles(tenantId?: string): Promise<CustomRole[]> {
    const tid = this.toObjectId(tenantId);
    return this.customRoleModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async createCustomRole(role: Partial<CustomRole>, tenantId?: string): Promise<CustomRole> {
    const tid = this.toObjectId(tenantId);
    const newRole = new this.customRoleModel({ ...role, tenantId: tid, roleId: `custom_${Date.now()}` });
    return newRole.save();
  }

  async updateCustomRole(roleId: string, updates: Partial<CustomRole>, tenantId?: string): Promise<CustomRole | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { roleId, tenantId: tid } : { roleId };
    return this.customRoleModel.findOneAndUpdate(filter, { $set: updates }, { new: true }).exec();
  }

  async deleteCustomRole(roleId: string, tenantId?: string): Promise<CustomRole | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { roleId, tenantId: tid } : { roleId };
    return this.customRoleModel.findOneAndDelete(filter).exec();
  }

  // ── Project Type Config ────────────────────────────────────────────────
  async getProjectTypeConfigs(tenantId?: string): Promise<ProjectTypeConfig[]> {
    const tid = this.toObjectId(tenantId);
    return this.projectTypeConfigModel.find(tid ? { tenantId: tid } : {}).exec();
  }

  async updateProjectTypeConfig(typeId: string, config: any, tenantId?: string): Promise<ProjectTypeConfig> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { typeId, tenantId: tid } : { typeId };
    const doc = await this.projectTypeConfigModel.findOneAndUpdate(filter, { $set: { config } }, { upsert: true, new: true }).exec();
    return doc;
  }

  // ── Full Settings ───────────────────────────────────────────────────────
  async getFullSettings(tenantId?: string): Promise<any> {
    const [flags, rbac, workflows, auditLogs, customRoles, projectTypeConfigs] = await Promise.all([
      this.getFeatureFlags(tenantId),
      this.getRBACConfigs(tenantId),
      this.getWorkflowRules(tenantId),
      this.getAuditLogs(tenantId),
      this.getCustomRoles(tenantId),
      this.getProjectTypeConfigs(tenantId),
    ]);

    return {
      flags,
      rbac,
      workflows,
      auditLogs,
      customRoles,
      projectTypeConfigs,
    };
  }
}
