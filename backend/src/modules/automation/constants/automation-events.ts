/**
 * Automation Event Types
 * Standardized events across all modules
 */

// Lead Events
export const LEAD_EVENTS = {
  CREATED: 'lead.created',
  UPDATED: 'lead.updated',
  DELETED: 'lead.deleted',
  STATUS_CHANGED: 'lead.status_changed',
  STAGE_CHANGED: 'lead.stage_changed',
  ASSIGNED: 'lead.assigned',
  CONVERTED_TO_PROJECT: 'lead.converted_to_project',
  ACTIVITY_ADDED: 'lead.activity_added',
  SCORE_UPDATED: 'lead.score_updated',
  SLA_BREACH: 'lead.sla_breach',
  FOLLOW_UP_DUE: 'lead.follow_up_due',
} as const;

// Survey Events
export const SURVEY_EVENTS = {
  CREATED: 'survey.created',
  UPDATED: 'survey.updated',
  COMPLETED: 'survey.completed',
  ASSIGNED: 'survey.assigned',
  APPROVED: 'survey.approved',
  REJECTED: 'survey.rejected',
  PHOTOS_UPLOADED: 'survey.photos_uploaded',
} as const;

// Design Events
export const DESIGN_EVENTS = {
  CREATED: 'design.created',
  UPDATED: 'design.updated',
  APPROVED: 'design.approved',
  REJECTED: 'design.rejected',
  BOQ_GENERATED: 'design.boq_generated',
} as const;

// Quotation Events
export const QUOTATION_EVENTS = {
  CREATED: 'quotation.created',
  UPDATED: 'quotation.updated',
  SENT: 'quotation.sent',
  ACCEPTED: 'quotation.accepted',
  REJECTED: 'quotation.rejected',
  EXPIRED: 'quotation.expired',
  FOLLOW_UP_DUE: 'quotation.follow_up_due',
} as const;

// Project Events
export const PROJECT_EVENTS = {
  CREATED: 'project.created',
  UPDATED: 'project.updated',
  STATUS_CHANGED: 'project.status_changed',
  MILESTONE_COMPLETED: 'project.milestone_completed',
  MILESTONE_DELAYED: 'project.milestone_delayed',
  PM_ASSIGNED: 'project.pm_assigned',
  STARTED: 'project.started',
  ON_HOLD: 'project.on_hold',
  RESUMED: 'project.resumed',
  COMPLETED: 'project.completed',
  CANCELLED: 'project.cancelled',
  PROGRESS_UPDATED: 'project.progress_updated',
} as const;

// Inventory Events
export const INVENTORY_EVENTS = {
  STOCK_ADDED: 'inventory.stock_added',
  STOCK_REMOVED: 'inventory.stock_removed',
  LOW_STOCK: 'inventory.low_stock',
  OUT_OF_STOCK: 'inventory.out_of_stock',
  RESERVED: 'inventory.reserved',
  RESERVATION_RELEASED: 'inventory.reservation_released',
  MATERIAL_ISSUED: 'inventory.material_issued',
} as const;

// Procurement Events
export const PROCUREMENT_EVENTS = {
  PO_CREATED: 'procurement.po_created',
  PO_SENT: 'procurement.po_sent',
  PO_ACKNOWLEDGED: 'procurement.po_acknowledged',
  PO_FULFILLED: 'procurement.po_fulfilled',
  PO_CANCELLED: 'procurement.po_cancelled',
  VENDOR_ADDED: 'procurement.vendor_added',
} as const;

// Logistics Events
export const LOGISTICS_EVENTS = {
  DISPATCH_PLANNED: 'logistics.dispatch_planned',
  DISPATCH_SHIPPED: 'logistics.dispatch_shipped',
  DISPATCH_DELIVERED: 'logistics.dispatch_delivered',
  DISPATCH_DELAYED: 'logistics.dispatch_delayed',
} as const;

// Installation Events
export const INSTALLATION_EVENTS = {
  SCHEDULED: 'installation.scheduled',
  STARTED: 'installation.started',
  CHECKLIST_COMPLETED: 'installation.checklist_completed',
  COMPLETED: 'installation.completed',
  DELIVERED: 'installation.delivered',
  ISSUE_REPORTED: 'installation.issue_reported',
} as const;

// Commissioning Events
export const COMMISSIONING_EVENTS = {
  INITIATED: 'commissioning.initiated',
  TESTING_STARTED: 'commissioning.testing_started',
  TESTING_COMPLETED: 'commissioning.testing_completed',
  HANDOVER_COMPLETED: 'commissioning.handover_completed',
  DOCUMENTS_COMPLETED: 'commissioning.documents_completed',
} as const;

// Finance Events
export const FINANCE_EVENTS = {
  INVOICE_CREATED: 'finance.invoice_created',
  INVOICE_SENT: 'finance.invoice_sent',
  INVOICE_PAID: 'finance.invoice_paid',
  INVOICE_OVERDUE: 'finance.invoice_overdue',
  PAYMENT_RECEIVED: 'finance.payment_received',
  PAYMENT_MISSED: 'finance.payment_missed',
  EXPENSE_ADDED: 'finance.expense_added',
  EXPENSE_APPROVED: 'finance.expense_approved',
} as const;

// Service/AMC Events
export const SERVICE_EVENTS = {
  TICKET_CREATED: 'service.ticket_created',
  TICKET_ASSIGNED: 'service.ticket_assigned',
  TICKET_RESOLVED: 'service.ticket_resolved',
  TICKET_ESCALATED: 'service.ticket_escalated',
  AMC_CONTRACT_CREATED: 'service.amc_contract_created',
  AMC_CONTRACT_RENEWAL_DUE: 'service.amc_contract_renewal_due',
  VISIT_SCHEDULED: 'service.visit_scheduled',
  VISIT_COMPLETED: 'service.visit_completed',
} as const;

// HRM Events
export const HRM_EVENTS = {
  EMPLOYEE_JOINED: 'hrm.employee_joined',
  EMPLOYEE_RESIGNED: 'hrm.employee_resigned',
  ATTENDANCE_MARKED: 'hrm.attendance_marked',
  LEAVE_APPLIED: 'hrm.leave_applied',
  LEAVE_APPROVED: 'hrm.leave_approved',
  PAYROLL_PROCESSED: 'hrm.payroll_processed',
  SALARY_INCREMENT_DUE: 'hrm.salary_increment_due',
} as const;

// Compliance Events
export const COMPLIANCE_EVENTS = {
  NET_METERING_APPLIED: 'compliance.net_metering_applied',
  NET_METERING_APPROVED: 'compliance.net_metering_approved',
  SUBSIDY_APPLIED: 'compliance.subsidy_applied',
  SUBSIDY_DISBURSED: 'compliance.subsidy_disbursed',
  INSPECTION_SCHEDULED: 'compliance.inspection_scheduled',
  INSPECTION_PASSED: 'compliance.inspection_passed',
} as const;

// All Events Registry
export const ALL_EVENTS = {
  ...LEAD_EVENTS,
  ...SURVEY_EVENTS,
  ...DESIGN_EVENTS,
  ...QUOTATION_EVENTS,
  ...PROJECT_EVENTS,
  ...INVENTORY_EVENTS,
  ...PROCUREMENT_EVENTS,
  ...LOGISTICS_EVENTS,
  ...INSTALLATION_EVENTS,
  ...COMMISSIONING_EVENTS,
  ...FINANCE_EVENTS,
  ...SERVICE_EVENTS,
  ...HRM_EVENTS,
  ...COMPLIANCE_EVENTS,
} as const;

// Event to Module Mapping
export const EVENT_MODULE_MAP: Record<string, string> = {
  [LEAD_EVENTS.CREATED]: 'leads',
  [LEAD_EVENTS.UPDATED]: 'leads',
  [LEAD_EVENTS.DELETED]: 'leads',
  [LEAD_EVENTS.STATUS_CHANGED]: 'leads',
  [LEAD_EVENTS.STAGE_CHANGED]: 'leads',
  [LEAD_EVENTS.ASSIGNED]: 'leads',
  [LEAD_EVENTS.CONVERTED_TO_PROJECT]: 'leads',
  [LEAD_EVENTS.ACTIVITY_ADDED]: 'leads',
  [LEAD_EVENTS.SCORE_UPDATED]: 'leads',
  [LEAD_EVENTS.SLA_BREACH]: 'leads',
  [LEAD_EVENTS.FOLLOW_UP_DUE]: 'leads',
  
  [SURVEY_EVENTS.CREATED]: 'survey',
  [SURVEY_EVENTS.UPDATED]: 'survey',
  [SURVEY_EVENTS.COMPLETED]: 'survey',
  [SURVEY_EVENTS.ASSIGNED]: 'survey',
  [SURVEY_EVENTS.APPROVED]: 'survey',
  [SURVEY_EVENTS.REJECTED]: 'survey',
  [SURVEY_EVENTS.PHOTOS_UPLOADED]: 'survey',
  
  [DESIGN_EVENTS.CREATED]: 'design',
  [DESIGN_EVENTS.UPDATED]: 'design',
  [DESIGN_EVENTS.APPROVED]: 'design',
  [DESIGN_EVENTS.REJECTED]: 'design',
  [DESIGN_EVENTS.BOQ_GENERATED]: 'design',
  
  [QUOTATION_EVENTS.CREATED]: 'quotation',
  [QUOTATION_EVENTS.UPDATED]: 'quotation',
  [QUOTATION_EVENTS.SENT]: 'quotation',
  [QUOTATION_EVENTS.ACCEPTED]: 'quotation',
  [QUOTATION_EVENTS.REJECTED]: 'quotation',
  [QUOTATION_EVENTS.EXPIRED]: 'quotation',
  [QUOTATION_EVENTS.FOLLOW_UP_DUE]: 'quotation',
  
  [PROJECT_EVENTS.CREATED]: 'projects',
  [PROJECT_EVENTS.UPDATED]: 'projects',
  [PROJECT_EVENTS.STATUS_CHANGED]: 'projects',
  [PROJECT_EVENTS.MILESTONE_COMPLETED]: 'projects',
  [PROJECT_EVENTS.MILESTONE_DELAYED]: 'projects',
  [PROJECT_EVENTS.PM_ASSIGNED]: 'projects',
  [PROJECT_EVENTS.STARTED]: 'projects',
  [PROJECT_EVENTS.ON_HOLD]: 'projects',
  [PROJECT_EVENTS.RESUMED]: 'projects',
  [PROJECT_EVENTS.COMPLETED]: 'projects',
  [PROJECT_EVENTS.CANCELLED]: 'projects',
  [PROJECT_EVENTS.PROGRESS_UPDATED]: 'projects',
  
  [INVENTORY_EVENTS.STOCK_ADDED]: 'inventory',
  [INVENTORY_EVENTS.STOCK_REMOVED]: 'inventory',
  [INVENTORY_EVENTS.LOW_STOCK]: 'inventory',
  [INVENTORY_EVENTS.OUT_OF_STOCK]: 'inventory',
  [INVENTORY_EVENTS.RESERVED]: 'inventory',
  [INVENTORY_EVENTS.RESERVATION_RELEASED]: 'inventory',
  [INVENTORY_EVENTS.MATERIAL_ISSUED]: 'inventory',
  
  [PROCUREMENT_EVENTS.PO_CREATED]: 'procurement',
  [PROCUREMENT_EVENTS.PO_SENT]: 'procurement',
  [PROCUREMENT_EVENTS.PO_ACKNOWLEDGED]: 'procurement',
  [PROCUREMENT_EVENTS.PO_FULFILLED]: 'procurement',
  [PROCUREMENT_EVENTS.PO_CANCELLED]: 'procurement',
  [PROCUREMENT_EVENTS.VENDOR_ADDED]: 'procurement',
  
  [LOGISTICS_EVENTS.DISPATCH_PLANNED]: 'logistics',
  [LOGISTICS_EVENTS.DISPATCH_SHIPPED]: 'logistics',
  [LOGISTICS_EVENTS.DISPATCH_DELIVERED]: 'logistics',
  [LOGISTICS_EVENTS.DISPATCH_DELAYED]: 'logistics',
  
  [INSTALLATION_EVENTS.SCHEDULED]: 'installation',
  [INSTALLATION_EVENTS.STARTED]: 'installation',
  [INSTALLATION_EVENTS.CHECKLIST_COMPLETED]: 'installation',
  [INSTALLATION_EVENTS.COMPLETED]: 'installation',
  [INSTALLATION_EVENTS.DELIVERED]: 'installation',
  [INSTALLATION_EVENTS.ISSUE_REPORTED]: 'installation',
  
  [COMMISSIONING_EVENTS.INITIATED]: 'commissioning',
  [COMMISSIONING_EVENTS.TESTING_STARTED]: 'commissioning',
  [COMMISSIONING_EVENTS.TESTING_COMPLETED]: 'commissioning',
  [COMMISSIONING_EVENTS.HANDOVER_COMPLETED]: 'commissioning',
  [COMMISSIONING_EVENTS.DOCUMENTS_COMPLETED]: 'commissioning',
  
  [FINANCE_EVENTS.INVOICE_CREATED]: 'finance',
  [FINANCE_EVENTS.INVOICE_SENT]: 'finance',
  [FINANCE_EVENTS.INVOICE_PAID]: 'finance',
  [FINANCE_EVENTS.INVOICE_OVERDUE]: 'finance',
  [FINANCE_EVENTS.PAYMENT_RECEIVED]: 'finance',
  [FINANCE_EVENTS.PAYMENT_MISSED]: 'finance',
  [FINANCE_EVENTS.EXPENSE_ADDED]: 'finance',
  [FINANCE_EVENTS.EXPENSE_APPROVED]: 'finance',
  
  [SERVICE_EVENTS.TICKET_CREATED]: 'service-amc',
  [SERVICE_EVENTS.TICKET_ASSIGNED]: 'service-amc',
  [SERVICE_EVENTS.TICKET_RESOLVED]: 'service-amc',
  [SERVICE_EVENTS.TICKET_ESCALATED]: 'service-amc',
  [SERVICE_EVENTS.AMC_CONTRACT_CREATED]: 'service-amc',
  [SERVICE_EVENTS.AMC_CONTRACT_RENEWAL_DUE]: 'service-amc',
  [SERVICE_EVENTS.VISIT_SCHEDULED]: 'service-amc',
  [SERVICE_EVENTS.VISIT_COMPLETED]: 'service-amc',
  
  [HRM_EVENTS.EMPLOYEE_JOINED]: 'hrm',
  [HRM_EVENTS.EMPLOYEE_RESIGNED]: 'hrm',
  [HRM_EVENTS.ATTENDANCE_MARKED]: 'hrm',
  [HRM_EVENTS.LEAVE_APPLIED]: 'hrm',
  [HRM_EVENTS.LEAVE_APPROVED]: 'hrm',
  [HRM_EVENTS.PAYROLL_PROCESSED]: 'hrm',
  [HRM_EVENTS.SALARY_INCREMENT_DUE]: 'hrm',
  
  [COMPLIANCE_EVENTS.NET_METERING_APPLIED]: 'compliance',
  [COMPLIANCE_EVENTS.NET_METERING_APPROVED]: 'compliance',
  [COMPLIANCE_EVENTS.SUBSIDY_APPLIED]: 'compliance',
  [COMPLIANCE_EVENTS.SUBSIDY_DISBURSED]: 'compliance',
  [COMPLIANCE_EVENTS.INSPECTION_SCHEDULED]: 'compliance',
  [COMPLIANCE_EVENTS.INSPECTION_PASSED]: 'compliance',
};

// Event descriptions for UI
export const EVENT_DESCRIPTIONS: Record<string, string> = {
  [LEAD_EVENTS.CREATED]: 'When a new lead is created',
  [LEAD_EVENTS.UPDATED]: 'When any lead is updated',
  [LEAD_EVENTS.STATUS_CHANGED]: 'When lead status changes',
  [LEAD_EVENTS.STAGE_CHANGED]: 'When lead moves to different stage',
  [LEAD_EVENTS.ASSIGNED]: 'When lead is assigned to someone',
  [LEAD_EVENTS.CONVERTED_TO_PROJECT]: 'When lead converts to project',
  [LEAD_EVENTS.SLA_BREACH]: 'When lead exceeds SLA time',
  [LEAD_EVENTS.FOLLOW_UP_DUE]: 'When lead follow-up is due',
  
  [SURVEY_EVENTS.CREATED]: 'When site survey is created',
  [SURVEY_EVENTS.COMPLETED]: 'When survey is marked complete',
  [SURVEY_EVENTS.APPROVED]: 'When survey is approved',
  [SURVEY_EVENTS.REJECTED]: 'When survey is rejected',
  
  [QUOTATION_EVENTS.CREATED]: 'When quotation is generated',
  [QUOTATION_EVENTS.SENT]: 'When quotation is sent to customer',
  [QUOTATION_EVENTS.ACCEPTED]: 'When customer accepts quotation',
  [QUOTATION_EVENTS.REJECTED]: 'When customer rejects quotation',
  [QUOTATION_EVENTS.EXPIRED]: 'When quotation expires',
  
  [PROJECT_EVENTS.CREATED]: 'When project is created',
  [PROJECT_EVENTS.STATUS_CHANGED]: 'When project status changes',
  [PROJECT_EVENTS.MILESTONE_COMPLETED]: 'When project milestone is completed',
  [PROJECT_EVENTS.MILESTONE_DELAYED]: 'When milestone is delayed',
  [PROJECT_EVENTS.COMPLETED]: 'When project is completed',
  
  [INVENTORY_EVENTS.LOW_STOCK]: 'When inventory goes below threshold',
  [INVENTORY_EVENTS.OUT_OF_STOCK]: 'When item goes out of stock',
  [INVENTORY_EVENTS.MATERIAL_ISSUED]: 'When materials are issued to project',
  
  [PROCUREMENT_EVENTS.PO_FULFILLED]: 'When purchase order is fully received',
  
  [INSTALLATION_EVENTS.COMPLETED]: 'When installation is completed',
  [INSTALLATION_EVENTS.DELIVERED]: 'When installation is delivered',
  
  [FINANCE_EVENTS.INVOICE_OVERDUE]: 'When invoice becomes overdue',
  [FINANCE_EVENTS.INVOICE_PAID]: 'When invoice is paid',
  [FINANCE_EVENTS.PAYMENT_MISSED]: 'When scheduled payment is missed',
  
  [SERVICE_EVENTS.TICKET_CREATED]: 'When service ticket is created',
  [SERVICE_EVENTS.TICKET_ESCALATED]: 'When ticket is escalated',
  [SERVICE_EVENTS.AMC_CONTRACT_RENEWAL_DUE]: 'When AMC renewal is due',
};
