import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AutomationEventBus, AutomationEvent } from './automation-event-bus.service';

/**
 * Automation Event Emitter Service
 * Helper service for modules to emit automation events
 * 
 * Usage in services:
 * constructor(private readonly automationEmitter: AutomationEventEmitter) {}
 * 
 * async createLead(data) {
 *   const lead = await this.create(data);
 *   await this.automationEmitter.emitLeadCreated(tenantId, lead);
 *   return lead;
 * }
 */

@Injectable()
export class AutomationEventEmitter {
  private readonly logger = new Logger(AutomationEventEmitter.name);

  constructor(
    private readonly eventBus: AutomationEventBus,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Lead Events
  // ─────────────────────────────────────────────────────────────────────────

  async emitLeadCreated(tenantId: string, lead: any, userId?: string): Promise<void> {
    await this.emit({
      event: 'lead.created',
      module: 'leads',
      entityType: 'lead',
      entityId: lead._id?.toString() || lead.id,
      tenantId,
      payload: this.sanitizePayload(lead),
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitLeadUpdated(tenantId: string, lead: any, changes: Record<string, any>, userId?: string): Promise<void> {
    await this.emit({
      event: 'lead.updated',
      module: 'leads',
      entityType: 'lead',
      entityId: lead._id?.toString() || lead.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(lead),
        _changes: changes,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitLeadStatusChanged(
    tenantId: string, 
    lead: any, 
    oldStatus: string, 
    newStatus: string, 
    userId?: string
  ): Promise<void> {
    await this.emit({
      event: 'lead.status_changed',
      module: 'leads',
      entityType: 'lead',
      entityId: lead._id?.toString() || lead.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(lead),
        _oldStatus: oldStatus,
        _newStatus: newStatus,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitLeadAssigned(tenantId: string, lead: any, assignedTo: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'lead.assigned',
      module: 'leads',
      entityType: 'lead',
      entityId: lead._id?.toString() || lead.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(lead),
        _assignedTo: assignedTo,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitLeadConvertedToProject(tenantId: string, lead: any, projectId: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'lead.converted_to_project',
      module: 'leads',
      entityType: 'lead',
      entityId: lead._id?.toString() || lead.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(lead),
        _projectId: projectId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitLeadSLABreach(tenantId: string, lead: any, daysInactive: number, userId?: string): Promise<void> {
    await this.emit({
      event: 'lead.sla_breach',
      module: 'leads',
      entityType: 'lead',
      entityId: lead._id?.toString() || lead.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(lead),
        _daysInactive: daysInactive,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Survey Events
  // ─────────────────────────────────────────────────────────────────────────

  async emitSurveyCreated(tenantId: string, survey: any, leadId: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'survey.created',
      module: 'survey',
      entityType: 'site_survey',
      entityId: survey._id?.toString() || survey.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(survey),
        _leadId: leadId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitSurveyCompleted(tenantId: string, survey: any, userId?: string): Promise<void> {
    await this.emit({
      event: 'survey.completed',
      module: 'survey',
      entityType: 'site_survey',
      entityId: survey._id?.toString() || survey.id,
      tenantId,
      payload: this.sanitizePayload(survey),
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitSurveyApproved(tenantId: string, survey: any, userId?: string): Promise<void> {
    await this.emit({
      event: 'survey.approved',
      module: 'survey',
      entityType: 'site_survey',
      entityId: survey._id?.toString() || survey.id,
      tenantId,
      payload: this.sanitizePayload(survey),
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitSurveyAssigned(tenantId: string, survey: any, engineerId: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'survey.assigned',
      module: 'survey',
      entityType: 'site_survey',
      entityId: survey._id?.toString() || survey.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(survey),
        _engineerId: engineerId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Project Events
  // ─────────────────────────────────────────────────────────────────────────

  async emitProjectCreated(tenantId: string, project: any, leadId?: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'project.created',
      module: 'projects',
      entityType: 'project',
      entityId: project._id?.toString() || project.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(project),
        _leadId: leadId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitProjectStatusChanged(
    tenantId: string, 
    project: any, 
    oldStatus: string, 
    newStatus: string, 
    userId?: string
  ): Promise<void> {
    await this.emit({
      event: 'project.status_changed',
      module: 'projects',
      entityType: 'project',
      entityId: project._id?.toString() || project.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(project),
        _oldStatus: oldStatus,
        _newStatus: newStatus,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitProjectCompleted(tenantId: string, project: any, userId?: string): Promise<void> {
    await this.emit({
      event: 'project.completed',
      module: 'projects',
      entityType: 'project',
      entityId: project._id?.toString() || project.id,
      tenantId,
      payload: this.sanitizePayload(project),
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitMilestoneCompleted(tenantId: string, project: any, milestone: any, userId?: string): Promise<void> {
    await this.emit({
      event: 'project.milestone_completed',
      module: 'projects',
      entityType: 'project',
      entityId: project._id?.toString() || project.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(project),
        _milestone: milestone,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Installation Events
  // ─────────────────────────────────────────────────────────────────────────

  async emitInstallationCompleted(tenantId: string, installation: any, projectId: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'installation.completed',
      module: 'installation',
      entityType: 'installation',
      entityId: installation._id?.toString() || installation.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(installation),
        _projectId: projectId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitInstallationDelivered(tenantId: string, installation: any, projectId: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'installation.delivered',
      module: 'installation',
      entityType: 'installation',
      entityId: installation._id?.toString() || installation.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(installation),
        _projectId: projectId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Finance Events
  // ─────────────────────────────────────────────────────────────────────────

  async emitInvoiceCreated(tenantId: string, invoice: any, projectId?: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'finance.invoice_created',
      module: 'finance',
      entityType: 'invoice',
      entityId: invoice._id?.toString() || invoice.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(invoice),
        _projectId: projectId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitInvoiceOverdue(tenantId: string, invoice: any, daysOverdue: number, userId?: string): Promise<void> {
    await this.emit({
      event: 'finance.invoice_overdue',
      module: 'finance',
      entityType: 'invoice',
      entityId: invoice._id?.toString() || invoice.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(invoice),
        _daysOverdue: daysOverdue,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitInvoicePaid(tenantId: string, invoice: any, paymentAmount: number, userId?: string): Promise<void> {
    await this.emit({
      event: 'finance.invoice_paid',
      module: 'finance',
      entityType: 'invoice',
      entityId: invoice._id?.toString() || invoice.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(invoice),
        _paymentAmount: paymentAmount,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitPaymentReceived(tenantId: string, payment: any, invoiceId: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'finance.payment_received',
      module: 'finance',
      entityType: 'payment',
      entityId: payment._id?.toString() || payment.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(payment),
        _invoiceId: invoiceId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Quotation Events
  // ─────────────────────────────────────────────────────────────────────────

  async emitQuotationAccepted(tenantId: string, quotation: any, leadId: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'quotation.accepted',
      module: 'quotation',
      entityType: 'quotation',
      entityId: quotation._id?.toString() || quotation.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(quotation),
        _leadId: leadId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitQuotationSent(tenantId: string, quotation: any, leadId: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'quotation.sent',
      module: 'quotation',
      entityType: 'quotation',
      entityId: quotation._id?.toString() || quotation.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(quotation),
        _leadId: leadId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Inventory Events
  // ─────────────────────────────────────────────────────────────────────────

  async emitLowStock(tenantId: string, inventory: any, reorderPoint: number, userId?: string): Promise<void> {
    await this.emit({
      event: 'inventory.low_stock',
      module: 'inventory',
      entityType: 'inventory',
      entityId: inventory._id?.toString() || inventory.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(inventory),
        _reorderPoint: reorderPoint,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitOutOfStock(tenantId: string, inventory: any, userId?: string): Promise<void> {
    await this.emit({
      event: 'inventory.out_of_stock',
      module: 'inventory',
      entityType: 'inventory',
      entityId: inventory._id?.toString() || inventory.id,
      tenantId,
      payload: this.sanitizePayload(inventory),
      metadata: { userId, timestamp: Date.now() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Service/AMC Events
  // ─────────────────────────────────────────────────────────────────────────

  async emitTicketCreated(tenantId: string, ticket: any, projectId?: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'service.ticket_created',
      module: 'service-amc',
      entityType: 'ticket',
      entityId: ticket._id?.toString() || ticket.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(ticket),
        _projectId: projectId,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitTicketEscalated(tenantId: string, ticket: any, reason: string, userId?: string): Promise<void> {
    await this.emit({
      event: 'service.ticket_escalated',
      module: 'service-amc',
      entityType: 'ticket',
      entityId: ticket._id?.toString() || ticket.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(ticket),
        _escalationReason: reason,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  async emitAMCRenewalDue(tenantId: string, contract: any, daysUntilExpiry: number, userId?: string): Promise<void> {
    await this.emit({
      event: 'service.amc_contract_renewal_due',
      module: 'service-amc',
      entityType: 'amc_contract',
      entityId: contract._id?.toString() || contract.id,
      tenantId,
      payload: {
        ...this.sanitizePayload(contract),
        _daysUntilExpiry: daysUntilExpiry,
      },
      metadata: { userId, timestamp: Date.now() },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generic Emit Method
  // ─────────────────────────────────────────────────────────────────────────

  async emit(event: AutomationEvent): Promise<void> {
    await this.eventBus.emit(event);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────

  private sanitizePayload(entity: any): Record<string, any> {
    if (!entity) return {};

    // Convert Mongoose document to plain object
    const payload = entity.toObject ? entity.toObject() : { ...entity };

    // Remove internal fields
    delete payload.__v;
    delete payload.password;
    delete payload.accessToken;
    delete payload.refreshToken;

    return payload;
  }
}
