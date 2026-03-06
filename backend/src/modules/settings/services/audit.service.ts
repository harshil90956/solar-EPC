import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';

// Audit action types
export enum AuditAction {
  // Feature Flags
  TOGGLE_MODULE = 'TOGGLE_MODULE',
  TOGGLE_FEATURE = 'TOGGLE_FEATURE',
  TOGGLE_ACTION = 'TOGGLE_ACTION',
  RESET_FLAGS = 'RESET_FLAGS',

  // RBAC
  RBAC_EDIT = 'RBAC_EDIT',
  ROLE_PRESET = 'ROLE_PRESET',
  RESET_RBAC = 'RESET_RBAC',

  // Custom Roles
  CUSTOM_ROLE_CREATED = 'CUSTOM_ROLE_CREATED',
  CUSTOM_ROLE_UPDATED = 'CUSTOM_ROLE_UPDATED',
  CUSTOM_ROLE_DELETED = 'CUSTOM_ROLE_DELETED',
  CUSTOM_ROLE_CLONED = 'CUSTOM_ROLE_CLONED',
  CUSTOM_ROLE_PERM = 'CUSTOM_ROLE_PERM',

  // User Overrides
  USER_ROLE_ASSIGNED = 'USER_ROLE_ASSIGNED',
  USER_PERM_OVERRIDE = 'USER_PERM_OVERRIDE',
  USER_OVERRIDES_CLEARED = 'USER_OVERRIDES_CLEARED',

  // Workflows
  WORKFLOW_CREATED = 'WORKFLOW_CREATED',
  WORKFLOW_UPDATED = 'WORKFLOW_UPDATED',
  WORKFLOW_DELETED = 'WORKFLOW_DELETED',
  WORKFLOW_TOGGLE = 'WORKFLOW_TOGGLE',
  WORKFLOW_EXECUTED = 'WORKFLOW_EXECUTED',
  WORKFLOW_RETRY = 'WORKFLOW_RETRY',

  // System
  SETTINGS_IMPORTED = 'SETTINGS_IMPORTED',
  SETTINGS_EXPORTED = 'SETTINGS_EXPORTED',
  ROLLBACK = 'ROLLBACK',
  VIEW_AS_STARTED = 'VIEW_AS_STARTED',
  VIEW_AS_ENDED = 'VIEW_AS_ENDED',
}

export interface AuditLogEntry {
  tenantId?: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
  action: AuditAction | string;
  target: string;
  before?: any;
  after?: any;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    correlationId?: string;
  };
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  private toObjectId(id: string | undefined): Types.ObjectId | undefined {
    if (!id) return undefined;
    // Check if id is a valid 24-character hex string (MongoDB ObjectId format)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isValidObjectId) return undefined;
    try { return new Types.ObjectId(id); } catch { return undefined; }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core Audit Logging
  // ─────────────────────────────────────────────────────────────────────────

  async log(entry: AuditLogEntry): Promise<AuditLog> {
    const tid = this.toObjectId(entry.tenantId);
    const logId = `a${Date.now()}${Math.random().toString(36).substr(2, 6)}`;
    
    const doc = new this.auditLogModel({
      logId,
      tenantId: tid,
      ts: new Date().toISOString().replace('T', ' ').slice(0, 16),
      user: typeof entry.user === 'string' ? entry.user : JSON.stringify(entry.user),
      action: entry.action,
      target: entry.target,
      from: entry.before ? JSON.stringify(entry.before) : '',
      to: entry.after ? JSON.stringify(entry.after) : '',
      ip: entry.metadata?.ipAddress || '127.0.0.1',
    });

    const saved = await doc.save();
    this.logger.log(`Audit log: ${entry.action} on ${entry.target}`);
    return saved;
  }

  async logImmediate(entry: AuditLogEntry): Promise<AuditLog> {
    return this.log(entry);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Convenience Methods for Auto-Logging
  // ─────────────────────────────────────────────────────────────────────────

  async logFeatureFlagChange(
    tenantId: string | undefined,
    userId: string,
    type: 'module' | 'feature' | 'action',
    moduleId: string,
    id: string | null,
    enabled: boolean,
    previousValue?: boolean,
    metadata?: any,
  ): Promise<AuditLog> {
    const actionMap: Record<string, AuditAction> = {
      module: AuditAction.TOGGLE_MODULE,
      feature: AuditAction.TOGGLE_FEATURE,
      action: AuditAction.TOGGLE_ACTION,
    };

    return this.log({
      tenantId,
      user: { id: userId },
      action: actionMap[type],
      target: id ? `${moduleId}.${id}` : moduleId,
      before: previousValue !== undefined ? { enabled: previousValue } : undefined,
      after: { enabled },
      metadata,
    });
  }

  async logRBACChange(
    tenantId: string | undefined,
    userId: string,
    roleId: string,
    moduleId: string,
    actionId: string,
    enabled: boolean,
    previousValue?: boolean,
    metadata?: any,
  ): Promise<AuditLog> {
    return this.log({
      tenantId,
      user: { id: userId },
      action: AuditAction.RBAC_EDIT,
      target: `${roleId}.${moduleId}.${actionId}`,
      before: previousValue !== undefined ? { permitted: previousValue } : undefined,
      after: { permitted: enabled },
      metadata,
    });
  }

  async logCustomRoleChange(
    tenantId: string | undefined,
    userId: string,
    action: AuditAction,
    roleId: string,
    details?: any,
    metadata?: any,
  ): Promise<AuditLog> {
    return this.log({
      tenantId,
      user: { id: userId },
      action,
      target: roleId,
      after: details,
      metadata,
    });
  }

  async logWorkflowChange(
    tenantId: string | undefined,
    userId: string,
    action: AuditAction,
    wfId: string,
    details?: any,
    metadata?: any,
  ): Promise<AuditLog> {
    return this.log({
      tenantId,
      user: { id: userId },
      action,
      target: wfId,
      after: details,
      metadata,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Query Methods
  // ─────────────────────────────────────────────────────────────────────────

  async getAuditLogs(
    tenantId: string | undefined,
    options: {
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      action?: string;
      target?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ data: AuditLog[]; total: number }> {
    const tid = this.toObjectId(tenantId);
    
    const filter: any = tid ? { tenantId: tid } : {};
    
    if (options.action) filter.action = options.action;
    if (options.target) filter.target = options.target;
    
    if (options.startDate || options.endDate) {
      filter.ts = {};
      if (options.startDate) filter.ts.$gte = options.startDate.toISOString().slice(0, 16);
      if (options.endDate) filter.ts.$lte = options.endDate.toISOString().slice(0, 16);
    }

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ ts: -1 })
        .skip(options.offset || 0)
        .limit(options.limit || 50)
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  async getAuditLog(tenantId: string | undefined, logId: string): Promise<AuditLog | null> {
    const tid = this.toObjectId(tenantId);
    const filter = tid ? { tenantId: tid, logId } : { logId };
    return this.auditLogModel.findOne(filter).exec();
  }

  async getAuditSummary(
    tenantId: string | undefined,
    days: number = 30,
  ): Promise<{
    total: number;
    byAction: Record<string, number>;
    byDay: Array<{ date: string; count: number }>;
  }> {
    const tid = this.toObjectId(tenantId);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 16);

    const filter: any = {
      ...(tid && { tenantId: tid }),
      ts: { $gte: sinceStr },
    };

    const logs = await this.auditLogModel.find(filter).exec();

    // Group by action
    const byAction: Record<string, number> = {};
    const byDayMap: Record<string, number> = {};

    for (const log of logs) {
      // Count by action
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      // Count by day (ts format: "YYYY-MM-DD HH:mm")
      const day = log.ts?.slice(0, 10) || 'unknown';
      byDayMap[day] = (byDayMap[day] || 0) + 1;
    }

    // Convert byDay map to array
    const byDay = Object.entries(byDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total: logs.length,
      byAction,
      byDay,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rollback Functionality
  // ─────────────────────────────────────────────────────────────────────────

  async getRollbackState(tenantId: string | undefined, logId: string): Promise<{
    log: AuditLog | null;
    canRollback: boolean;
    targetState: any;
    subsequentChanges: AuditLog[];
  }> {
    const log = await this.getAuditLog(tenantId, logId);
    
    if (!log) {
      return { log: null, canRollback: false, targetState: null, subsequentChanges: [] };
    }

    // Get all changes to the same target after this one
    const tid = this.toObjectId(tenantId);
    const subsequentFilter: any = {
      ...(tid && { tenantId: tid }),
      target: log.target,
      ts: { $gt: log.ts },
    };

    const subsequentChanges = await this.auditLogModel
      .find(subsequentFilter)
      .sort({ ts: 1 })
      .exec();

    // Parse the "from" state as the target rollback state
    let targetState: any = null;
    try {
      if ((log as any).to) {
        targetState = JSON.parse((log as any).to);
      }
    } catch {
      targetState = (log as any).to;
    }

    const canRollback = targetState !== null && log.action !== AuditAction.ROLLBACK;

    return {
      log,
      canRollback,
      targetState,
      subsequentChanges,
    };
  }

  async rollback(tenantId: string | undefined, logId: string, userId: string): Promise<{
    success: boolean;
    message: string;
    rollbackLogId?: string;
  }> {
    const { log, canRollback, targetState, subsequentChanges } = 
      await this.getRollbackState(tenantId, logId);

    if (!log) {
      return { success: false, message: 'Audit log not found' };
    }

    if (!canRollback) {
      return { success: false, message: 'Cannot rollback this change' };
    }

    // Warning: subsequent changes exist
    if (subsequentChanges.length > 0) {
      this.logger.warn(`Rollback of ${logId} will override ${subsequentChanges.length} subsequent changes`);
    }

    // Log the rollback itself
    const rollbackLog = await this.log({
      tenantId,
      user: { id: userId },
      action: AuditAction.ROLLBACK,
      target: log.target,
      before: (log as any).after,
      after: targetState,
      metadata: {
        correlationId: logId,
      },
    });

    return {
      success: true,
      message: `Rolled back ${log.action} on ${log.target}`,
      rollbackLogId: rollbackLog.logId,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Data Retention
  // ─────────────────────────────────────────────────────────────────────────

  async cleanupOldLogs(
    tenantId: string | undefined,
    retentionDays: number = 90,
  ): Promise<{ deleted: number }> {
    const tid = this.toObjectId(tenantId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffStr = cutoff.toISOString().slice(0, 16);

    const filter: any = {
      ...(tid && { tenantId: tid }),
      ts: { $lt: cutoffStr },
    };

    const result = await this.auditLogModel.deleteMany(filter).exec();
    const deleted = result.deletedCount || 0;

    this.logger.log(`Cleaned up ${deleted} audit logs older than ${retentionDays} days`);
    return { deleted };
  }
}
