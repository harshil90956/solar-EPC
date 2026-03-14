# Solar OS - Production-Grade Automation Engine

## Overview

The Solar OS Automation Engine is a comprehensive, event-driven workflow automation system that replaces the basic workflow rules with a production-grade solution similar to HubSpot Workflows, Salesforce Flow, or Zoho CRM Automation.

## Architecture

### Core Components

```
Module Event
    ↓
Event Bus (NestJS EventEmitter)
    ↓
Rule Matcher (HashMap Index - O(1) lookup)
    ↓
Condition Engine (DFS Expression Tree Evaluation)
    ↓
DAG Engine (Topological Sorting)
    ↓
Queue (BullMQ + Redis)
    ↓
Action Engine (Cross-Module Integration)
    ↓
Execution Tracker (MongoDB)
```

### Key Features

1. **Event-Driven Architecture**
   - 80+ predefined events across all modules
   - NestJS EventEmitter for decoupled communication
   - Wildcard event subscriptions

2. **HashMap Rule Indexing**
   - O(1) rule lookup by event name
   - In-memory index with TTL refresh
   - Multi-tenant isolation

3. **Expression Tree Conditions**
   - Complex AND/OR logic with nested groups
   - 14 operators (eq, ne, gt, gte, lt, lte, contains, starts_with, ends_with, in, not_in, exists, empty, regex)
   - Dot-notation field resolution
   - DFS evaluation algorithm

4. **DAG-Based Action Execution**
   - Directed Acyclic Graph for action ordering
   - Dependency management between actions
   - Parallel execution where possible
   - Cycle detection and prevention

5. **BullMQ Persistent Queue**
   - Redis-backed job queue
   - Retry logic with exponential backoff
   - Delayed job scheduling
   - Priority queue support
   - Concurrency control per tenant

6. **Cross-Module Actions**
   - create_record, update_field, assign_user
   - send_email, send_notification, create_task
   - trigger_webhook, delay
   - create_project, create_quotation, assign_engineer
   - enable/disable feature flags

7. **Template System**
   - 10+ pre-built automation templates
   - Categories: Lead Management, Project Workflow, Finance, Service, Inventory
   - One-click template application

8. **Execution Tracking**
   - Complete audit trail
   - Action-level success/failure tracking
   - Duration metrics
   - Error logging with stack traces
   - Replay capability

## File Structure

```
backend/src/modules/automation/
├── automation.module.ts           # Module configuration
├── index.ts                       # Public exports
├── schemas/
│   ├── automation-rule.schema.ts  # Rule document schema
│   └── automation-execution.schema.ts # Execution tracking schema
├── services/
│   ├── automation-engine.service.ts   # Main orchestrator
│   ├── condition-engine.service.ts  # Expression tree evaluator
│   ├── action-engine.service.ts     # Action execution
│   ├── dag-engine.service.ts        # DAG management
│   ├── rule-matcher.service.ts      # HashMap indexing
│   ├── automation-event-bus.service.ts # Event handling
│   ├── automation-queue.service.ts   # BullMQ integration
│   ├── automation-templates.service.ts # Template management
│   ├── automation-migration.service.ts # Legacy migration
│   └── automation-event-emitter.service.ts # Event emitter helper
├── controllers/
│   └── automation.controller.ts     # REST API endpoints
├── workers/
│   └── automation.worker.ts         # BullMQ job processor
├── dto/
│   └── automation.dto.ts            # Data transfer objects
├── constants/
│   └── automation-events.ts         # Event definitions
└── tests/
    └── automation-engine.spec.ts    # Unit tests

frontend/src/
├── components/automation/
│   ├── AutomationBuilder.js       # Main UI component
│   └── index.js                   # Component exports
└── services/
    └── automationApi.js           # API client
```

## API Endpoints

### Rules Management
- `GET    /api/automation/rules` - List all rules
- `POST   /api/automation/rules` - Create new rule
- `GET    /api/automation/rules/:ruleId` - Get rule details
- `PUT    /api/automation/rules/:ruleId` - Update rule
- `PATCH  /api/automation/rules/:ruleId/toggle` - Enable/disable
- `DELETE /api/automation/rules/:ruleId` - Delete rule

### Templates
- `GET /api/automation/templates` - List templates
- `GET /api/automation/templates/categories` - Get categories
- `GET /api/automation/templates/recommended` - Get recommendations
- `POST /api/automation/templates/:templateId/apply` - Apply template

### Executions
- `GET    /api/automation/executions` - List executions
- `GET    /api/automation/executions/:executionId` - Get execution
- `POST   /api/automation/executions/:executionId/retry` - Retry execution
- `POST   /api/automation/executions/:executionId/cancel` - Cancel execution

### Testing & Monitoring
- `POST /api/automation/trigger` - Manually trigger event
- `GET  /api/automation/health` - Engine health status
- `GET  /api/automation/stats` - Usage statistics
- `GET  /api/automation/events` - Available events
- `GET  /api/automation/queue/stats` - Queue statistics

## Events Supported

### Leads Module
- lead.created, lead.updated, lead.deleted
- lead.status_changed, lead.stage_changed
- lead.assigned, lead.converted_to_project
- lead.sla_breach, lead.follow_up_due

### Survey Module
- survey.created, survey.updated, survey.completed
- survey.approved, survey.rejected, survey.assigned

### Projects Module
- project.created, project.updated, project.status_changed
- project.milestone_completed, project.milestone_delayed
- project.completed, project.cancelled

### Installation Module
- installation.scheduled, installation.started
- installation.completed, installation.delivered

### Finance Module
- finance.invoice_created, finance.invoice_sent
- finance.invoice_paid, finance.invoice_overdue
- finance.payment_received, finance.payment_missed

### Service/AMC Module
- service.ticket_created, service.ticket_assigned
- service.ticket_resolved, service.ticket_escalated
- service.amc_contract_created, service.amc_contract_renewal_due

### And many more...

## Migration from Old Workflow System

### Automatic Migration
```typescript
// Inject the migration service
constructor(private readonly migrationService: AutomationMigrationService) {}

// Run migration
async migrate() {
  const result = await this.migrationService.migrateOldRules();
  console.log(`Migrated ${result.migrated} rules`);
}
```

### Migration Features
- Preserves all existing rules
- Converts to new format automatically
- Adds `migrated` tag for tracking
- Maintains backward compatibility
- Rollback capability

## Usage Examples

### Example 1: Lead Qualified → Create Survey
```typescript
// Automation triggers when lead.status changes to "qualified"
{
  trigger: { event: 'lead.status_changed', module: 'leads', entityType: 'lead' },
  conditionTree: {
    type: 'condition',
    field: 'status',
    operator: 'eq',
    value: 'qualified'
  },
  actionNodes: [
    {
      nodeId: 'create_survey',
      type: 'create_record',
      config: {
        module: 'survey',
        entityType: 'site_survey',
        copyFields: [
          { from: '_id', to: 'leadId' },
          { from: 'name', to: 'clientName' }
        ]
      }
    },
    {
      nodeId: 'notify_team',
      type: 'send_notification',
      config: {
        title: 'New Survey Created',
        message: 'Survey created for lead {{name}}'
      },
      dependencies: ['create_survey']
    }
  ]
}
```

### Example 2: High Value Lead Alert
```typescript
{
  trigger: { event: 'lead.created', module: 'leads', entityType: 'lead' },
  conditionTree: {
    type: 'condition',
    field: 'value',
    operator: 'gte',
    value: 500000
  },
  actionNodes: [
    {
      nodeId: 'send_alert',
      type: 'send_email',
      config: {
        to: 'sales-manager@company.com',
        subject: 'High Value Lead: {{name}}',
        body: 'Lead worth ₹{{value}} created by {{source}}'
      }
    }
  ]
}
```

### Example 3: Complex Multi-Condition
```typescript
{
  conditionTree: {
    type: 'group',
    logic: 'AND',
    children: [
      {
        type: 'condition',
        field: 'status',
        operator: 'eq',
        value: 'qualified'
      },
      {
        type: 'group',
        logic: 'OR',
        children: [
          {
            type: 'condition',
            field: 'value',
            operator: 'gte',
            value: 500000
          },
          {
            type: 'condition',
            field: 'source',
            operator: 'eq',
            value: 'referral'
          }
        ]
      }
    ]
  }
}
```

## Environment Variables

```env
# Redis (required for BullMQ)
REDIS_URL=redis://localhost:6379

# Automation Worker
AUTOMATION_WORKER_CONCURRENCY=5

# Optional: Queue configuration
AUTOMATION_QUEUE_PREFIX=solar-os
```

## Installation

1. **Install Dependencies**
```bash
cd backend
npm install @nestjs/event-emitter @nestjs/axios bullmq ioredis
```

2. **Ensure Redis is Running**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine
```

3. **Start the Application**
```bash
npm run start:dev
```

## Testing

```bash
# Run automation tests
npm test -- automation

# Run specific test
npm test -- automation-engine
```

## Performance Considerations

1. **Rule Indexing**: Rules are indexed in memory with 1-minute TTL
2. **Queue Processing**: Configurable concurrency (default: 5 workers)
3. **Execution Timeout**: Actions timeout after 30 seconds by default
4. **Database**: Execution history retention policy (configurable)

## Security

1. **Multi-tenancy**: All rules and executions are tenant-scoped
2. **Input Sanitization**: All dynamic variables are escaped
3. **Rate Limiting**: Queue rate limiting prevents abuse
4. **Audit Logging**: Complete execution audit trail

## Future Enhancements

1. Visual workflow builder (React Flow integration)
2. AI-powered template recommendations
3. Custom action plugins
4. Scheduled/recurring automations
5. Advanced analytics dashboard
6. Webhook signature verification
7. Action retry policies per rule
8. Conditional branching with multiple paths

## Support

For issues or questions:
1. Check execution logs in MongoDB
2. Review queue stats via `/api/automation/queue/stats`
3. Check engine health via `/api/automation/health`
4. Review application logs for automation worker

---

**Version**: 2.0.0  
**Last Updated**: March 2026  
**Maintainer**: Solar OS Engineering Team
