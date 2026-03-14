import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AutomationRule, AutomationRuleDocument } from '../schemas/automation-rule.schema';
import { AutomationExecution, AutomationExecutionDocument } from '../schemas/automation-execution.schema';

/**
 * Automation Templates Service
 * Provides pre-built automation templates for common workflows
 */

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'lead_management' | 'project_workflow' | 'finance' | 'service' | 'inventory' | 'custom';
  trigger: { event: string; module: string; entityType: string };
  conditionTree: any;
  actionNodes: any[];
  variables?: Record<string, any>;
  tags: string[];
}

@Injectable()
export class AutomationTemplatesService {
  private readonly logger = new Logger(AutomationTemplatesService.name);

  // Pre-defined templates
  private readonly templates: AutomationTemplate[] = [
    // Lead Management Templates
    {
      id: 'lead-qualified-create-survey',
      name: 'Lead Qualified → Create Site Survey',
      description: 'Automatically create a site survey when a lead is marked as qualified',
      category: 'lead_management',
      trigger: { event: 'lead.status_changed', module: 'leads', entityType: 'lead' },
      conditionTree: {
        type: 'condition',
        field: 'status',
        operator: 'eq',
        value: 'qualified',
      },
      actionNodes: [
        {
          nodeId: 'create_survey',
          type: 'create_record',
          config: {
            module: 'survey',
            entityType: 'site_survey',
            data: {
              status: 'pending',
            },
            copyFields: [
              { from: '_id', to: 'leadId' },
              { from: 'name', to: 'clientName' },
              { from: 'city', to: 'city' },
              { from: 'phone', to: 'contactNumber' },
            ],
          },
          dependencies: [],
          nextNodes: ['notify_team'],
        },
        {
          nodeId: 'notify_team',
          type: 'send_notification',
          config: {
            recipients: ['{{assignedTo}}', 'admin'],
            title: 'New Site Survey Created',
            message: 'Site survey automatically created for lead {{name}}',
            type: 'info',
            link: '/survey/{{create_survey.output.entityId}}',
          },
          dependencies: ['create_survey'],
          nextNodes: [],
        },
      ],
      tags: ['lead', 'survey', 'auto-create'],
    },

    {
      id: 'high-value-lead-alert',
      name: 'High Value Lead Alert',
      description: 'Send alert when lead value exceeds threshold',
      category: 'lead_management',
      trigger: { event: 'lead.created', module: 'leads', entityType: 'lead' },
      conditionTree: {
        type: 'condition',
        field: 'value',
        operator: 'gte',
        value: 500000,
      },
      actionNodes: [
        {
          nodeId: 'send_alert',
          type: 'send_email',
          config: {
            to: 'sales-manager@company.com',
            subject: 'High Value Lead Alert: {{name}}',
            body: 'A high value lead (₹{{value}}) has been created.\n\nLead Details:\nName: {{name}}\nPhone: {{phone}}\nEmail: {{email}}\nSource: {{source}}\n\nView lead: {{appUrl}}/leads/{{_id}}',
          },
          dependencies: [],
          nextNodes: [],
        },
      ],
      variables: { threshold: 500000 },
      tags: ['lead', 'alert', 'high-value'],
    },

    {
      id: 'lead-sla-breach',
      name: 'SLA Breach - Escalate Lead',
      description: 'Auto-escalate leads that have been inactive for more than 3 days',
      category: 'lead_management',
      trigger: { event: 'lead.sla_breach', module: 'leads', entityType: 'lead' },
      conditionTree: { type: 'group', logic: 'AND', children: [] }, // Always true for SLA breach
      actionNodes: [
        {
          nodeId: 'escalate',
          type: 'update_field',
          config: {
            module: 'leads',
            field: 'priority',
            value: 'high',
          },
          dependencies: [],
          nextNodes: ['notify_manager'],
        },
        {
          nodeId: 'notify_manager',
          type: 'send_notification',
          config: {
            recipients: ['manager'],
            title: 'Lead SLA Breach - Action Required',
            message: 'Lead {{name}} has been inactive for 3+ days and needs immediate attention',
            type: 'warning',
          },
          dependencies: ['escalate'],
          nextNodes: ['create_task'],
        },
        {
          nodeId: 'create_task',
          type: 'create_task',
          config: {
            title: 'Follow up on inactive lead: {{name}}',
            description: 'This lead has breached SLA. Immediate follow-up required.',
            assignee: '{{assignedTo}}',
            dueDate: '+1d',
            priority: 'high',
          },
          dependencies: ['notify_manager'],
          nextNodes: [],
        },
      ],
      tags: ['lead', 'sla', 'escalation'],
    },

    // Project Workflow Templates
    {
      id: 'quotation-accepted-create-project',
      name: 'Quotation Accepted → Create Project',
      description: 'Automatically create a project when quotation is accepted',
      category: 'project_workflow',
      trigger: { event: 'quotation.accepted', module: 'quotation', entityType: 'quotation' },
      conditionTree: { type: 'group', logic: 'AND', children: [] },
      actionNodes: [
        {
          nodeId: 'create_project',
          type: 'create_project',
          config: {
            fromEntity: 'quotation',
            data: {
              status: 'survey',
            },
          },
          dependencies: [],
          nextNodes: ['assign_pm'],
        },
        {
          nodeId: 'assign_pm',
          type: 'assign_user',
          config: {
            module: 'projects',
            userId: '{{pmId}}',
            role: 'project_manager',
          },
          dependencies: ['create_project'],
          nextNodes: ['notify_customer'],
        },
        {
          nodeId: 'notify_customer',
          type: 'send_email',
          config: {
            to: '{{customerEmail}}',
            subject: 'Your Solar Project Has Been Initiated',
            template: 'project-initiated',
          },
          dependencies: ['create_project'],
          nextNodes: [],
        },
      ],
      tags: ['quotation', 'project', 'auto-create'],
    },

    {
      id: 'survey-completed-generate-quotation',
      name: 'Survey Completed → Generate Quotation',
      description: 'Auto-generate quotation when site survey is completed',
      category: 'project_workflow',
      trigger: { event: 'survey.completed', module: 'survey', entityType: 'site_survey' },
      conditionTree: { type: 'group', logic: 'AND', children: [] },
      actionNodes: [
        {
          nodeId: 'create_quotation',
          type: 'create_quotation',
          config: {
            fromEntity: 'survey',
            data: {
              status: 'draft',
            },
          },
          dependencies: [],
          nextNodes: ['notify_sales'],
        },
        {
          nodeId: 'notify_sales',
          type: 'send_notification',
          config: {
            recipients: ['sales'],
            title: 'New Quotation Ready for Review',
            message: 'Quotation automatically generated from completed survey for {{clientName}}',
            type: 'info',
          },
          dependencies: ['create_quotation'],
          nextNodes: [],
        },
      ],
      tags: ['survey', 'quotation', 'auto-create'],
    },

    {
      id: 'installation-complete-send-invoice',
      name: 'Installation Complete → Send Invoice',
      description: 'Automatically create and send invoice when installation is completed',
      category: 'project_workflow',
      trigger: { event: 'installation.completed', module: 'installation', entityType: 'installation' },
      conditionTree: { type: 'group', logic: 'AND', children: [] },
      actionNodes: [
        {
          nodeId: 'create_invoice',
          type: 'create_record',
          config: {
            module: 'finance',
            entityType: 'invoice',
            data: {
              status: 'draft',
              autoSend: true,
            },
          },
          dependencies: [],
          nextNodes: ['trigger_commissioning'],
        },
        {
          nodeId: 'trigger_commissioning',
          type: 'create_record',
          config: {
            module: 'commissioning',
            entityType: 'commissioning',
            data: {
              status: 'initiated',
            },
          },
          dependencies: ['create_invoice'],
          nextNodes: [],
        },
      ],
      tags: ['installation', 'invoice', 'commissioning', 'auto-create'],
    },

    // Finance Templates
    {
      id: 'invoice-overdue-send-reminder',
      name: 'Invoice Overdue → Send Reminder',
      description: 'Send payment reminder when invoice becomes overdue',
      category: 'finance',
      trigger: { event: 'finance.invoice_overdue', module: 'finance', entityType: 'invoice' },
      conditionTree: { type: 'group', logic: 'AND', children: [] },
      actionNodes: [
        {
          nodeId: 'send_reminder',
          type: 'send_email',
          config: {
            to: '{{customerEmail}}',
            subject: 'Payment Reminder - Invoice #{{invoiceNumber}}',
            template: 'overdue-reminder',
          },
          dependencies: [],
          nextNodes: ['create_followup_task'],
        },
        {
          nodeId: 'create_followup_task',
          type: 'create_task',
          config: {
            title: 'Follow up on overdue invoice #{{invoiceNumber}}',
            description: 'Invoice is overdue. Contact customer for payment status.',
            assignee: '{{accountManager}}',
            dueDate: '+2d',
            priority: 'medium',
          },
          dependencies: ['send_reminder'],
          nextNodes: [],
        },
      ],
      tags: ['finance', 'invoice', 'overdue', 'reminder'],
    },

    {
      id: 'payment-received-send-receipt',
      name: 'Payment Received → Send Receipt',
      description: 'Send payment receipt and thank you email when payment is received',
      category: 'finance',
      trigger: { event: 'finance.payment_received', module: 'finance', entityType: 'payment' },
      conditionTree: { type: 'group', logic: 'AND', children: [] },
      actionNodes: [
        {
          nodeId: 'send_receipt',
          type: 'send_email',
          config: {
            to: '{{customerEmail}}',
            subject: 'Payment Receipt - ₹{{amount}}',
            template: 'payment-receipt',
          },
          dependencies: [],
          nextNodes: ['update_invoice_status'],
        },
        {
          nodeId: 'update_invoice_status',
          type: 'update_field',
          config: {
            module: 'finance',
            entityId: '{{invoiceId}}',
            field: 'paymentStatus',
            value: 'paid',
          },
          dependencies: ['send_receipt'],
          nextNodes: [],
        },
      ],
      tags: ['finance', 'payment', 'receipt'],
    },

    // Inventory Templates
    {
      id: 'low-stock-create-po',
      name: 'Low Stock → Create Purchase Order',
      description: 'Auto-create purchase order when inventory falls below threshold',
      category: 'inventory',
      trigger: { event: 'inventory.low_stock', module: 'inventory', entityType: 'inventory' },
      conditionTree: {
        type: 'condition',
        field: 'quantity',
        operator: 'lte',
        value: '{{reorderPoint}}',
      },
      actionNodes: [
        {
          nodeId: 'create_po',
          type: 'create_record',
          config: {
            module: 'procurement',
            entityType: 'purchase_order',
            data: {
              status: 'draft',
              autoGenerate: true,
            },
          },
          dependencies: [],
          nextNodes: ['notify_procurement'],
        },
        {
          nodeId: 'notify_procurement',
          type: 'send_notification',
          config: {
            recipients: ['procurement'],
            title: 'Auto-generated PO for Low Stock Item',
            message: 'Purchase order created for {{itemName}} (Current: {{quantity}}, Reorder: {{reorderPoint}})',
            type: 'warning',
          },
          dependencies: ['create_po'],
          nextNodes: [],
        },
      ],
      tags: ['inventory', 'low-stock', 'auto-po'],
    },

    // Service/AMC Templates
    {
      id: 'ticket-created-assign-engineer',
      name: 'Service Ticket → Assign Engineer',
      description: 'Auto-assign service engineer based on ticket type and location',
      category: 'service',
      trigger: { event: 'service.ticket_created', module: 'service-amc', entityType: 'ticket' },
      conditionTree: { type: 'group', logic: 'AND', children: [] },
      actionNodes: [
        {
          nodeId: 'assign_engineer',
          type: 'assign_user',
          config: {
            module: 'service-amc',
            userId: '{{autoAssignEngineerId}}',
            role: 'service_engineer',
          },
          dependencies: [],
          nextNodes: ['notify_customer'],
        },
        {
          nodeId: 'notify_customer',
          type: 'send_email',
          config: {
            to: '{{customerEmail}}',
            subject: 'Your Service Ticket #{{ticketNumber}} Has Been Assigned',
            template: 'ticket-assigned',
          },
          dependencies: ['assign_engineer'],
          nextNodes: [],
        },
      ],
      tags: ['service', 'ticket', 'auto-assign'],
    },

    {
      id: 'amc-renewal-reminder',
      name: 'AMC Renewal Reminder',
      description: 'Send renewal reminder 30 days before AMC expiry',
      category: 'service',
      trigger: { event: 'service.amc_contract_renewal_due', module: 'service-amc', entityType: 'amc_contract' },
      conditionTree: { type: 'group', logic: 'AND', children: [] },
      actionNodes: [
        {
          nodeId: 'send_reminder',
          type: 'send_email',
          config: {
            to: '{{customerEmail}}',
            subject: 'AMC Renewal Reminder - {{projectName}}',
            template: 'amc-renewal-reminder',
          },
          dependencies: [],
          nextNodes: ['create_renewal_task'],
        },
        {
          nodeId: 'create_renewal_task',
          type: 'create_task',
          config: {
            title: 'Follow up on AMC renewal - {{customerName}}',
            description: 'AMC expires in 30 days. Contact customer for renewal.',
            assignee: '{{accountManager}}',
            dueDate: '+7d',
            priority: 'medium',
          },
          dependencies: ['send_reminder'],
          nextNodes: [],
        },
      ],
      tags: ['service', 'amc', 'renewal', 'reminder'],
    },
  ];

  constructor(
    @InjectModel(AutomationRule.name)
    private ruleModel: Model<AutomationRuleDocument>,
  ) {}

  /**
   * Get all available templates
   */
  getAllTemplates(): AutomationTemplate[] {
    return this.templates;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): AutomationTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  /**
   * Get a specific template by ID
   */
  getTemplateById(id: string): AutomationTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }

  /**
   * Search templates by name or tags
   */
  searchTemplates(query: string): AutomationTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Instantiate a template into a rule for a tenant
   */
  async instantiateTemplate(
    templateId: string,
    tenantId: string,
    overrides?: Partial<AutomationTemplate>
  ): Promise<AutomationRule | null> {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const rule = new this.ruleModel({
      ruleId,
      tenantId: new Types.ObjectId(tenantId),
      name: overrides?.name || template.name,
      description: overrides?.description || template.description,
      enabled: true,
      trigger: template.trigger,
      conditionTree: overrides?.conditionTree || template.conditionTree,
      actionNodes: overrides?.actionNodes || template.actionNodes,
      startNodeId: template.actionNodes[0]?.nodeId,
      variables: template.variables || {},
      isTemplate: false,
      category: 'template',
      tags: template.tags,
      executionCount: 0,
      successCount: 0,
      createdBy: 'template_system',
    });

    return rule.save();
  }

  /**
   * Get template categories for UI
   */
  getCategories(): { id: string; name: string; icon: string; description: string }[] {
    return [
      { id: 'lead_management', name: 'Lead Management', icon: 'users', description: 'Automations for CRM and lead workflows' },
      { id: 'project_workflow', name: 'Project Workflow', icon: 'project', description: 'Project lifecycle automations' },
      { id: 'finance', name: 'Finance', icon: 'dollar', description: 'Invoicing and payment automations' },
      { id: 'service', name: 'Service & AMC', icon: 'wrench', description: 'Service ticket and AMC automations' },
      { id: 'inventory', name: 'Inventory', icon: 'package', description: 'Stock and procurement automations' },
      { id: 'custom', name: 'Custom', icon: 'settings', description: 'Custom automations' },
    ];
  }

  /**
   * Get recommended templates for a tenant based on their configuration
   */
  async getRecommendedTemplates(tenantId: string): Promise<AutomationTemplate[]> {
    // TODO: Analyze tenant configuration and return relevant templates
    // For now, return top templates from each category
    const recommendations: AutomationTemplate[] = [];
    const categories = ['lead_management', 'project_workflow', 'finance'];
    
    for (const category of categories) {
      const templates = this.getTemplatesByCategory(category as any);
      if (templates.length > 0) {
        recommendations.push(templates[0]);
      }
    }

    return recommendations;
  }
}
