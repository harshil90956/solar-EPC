# Solar OS – Settings Module Backend Implementation Blueprint

**Version:** 1.0  
**Date:** March 3, 2026  
**Status:** Production-Grade Planning Document

---

## 1. Settings System Overview

### 1.1 Purpose
The Settings Module is the central control engine for Solar OS, providing:
- Feature flag management (module/sub-feature/action level)
- RBAC (Role-Based Access Control) with inheritance
- Custom role creation and management
- User-level permission overrides
- Workflow automation rules
- Comprehensive audit logging
- Project type configurations

### 1.2 Core Architecture Principles

| Principle | Description |
|-----------|-------------|
| **Tenant Isolation** | All settings are tenant-scoped; no cross-tenant data leakage |
| **Hierarchical Permissions** | Base Role → Custom Role → User Override → Feature Flag |
| **Event-Driven Audit** | All mutations logged asynchronously with full context |
| **Lazy Evaluation** | Feature flags evaluated on-demand with caching |
| **Immutable Snapshots** | Settings changes create audit trail with rollback capability |

### 1.3 Permission Resolution Chain (Frontend → Backend Parity)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMISSION RESOLUTION FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Feature Flag Check (Global Kill Switch)                      │
│     └── Module enabled? ──No──► DENIED                           │
│                              │                                    │
│                              ▼                                    │
│  2. User Override Check (Hard Override)                          │
│     └── Has override? ──Yes──► USE OVERRIDE VALUE                │
│                        │                                         │
│                        ▼                                         │
│  3. Custom Role Check (User-Assigned Role)                     │
│     └── Custom role assigned? ──Yes──► USE CUSTOM ROLE         │
│                                   │                              │
│                                   ▼                              │
│  4. Base RBAC Check (Default Role Permissions)                 │
│     └── USE BASE ROLE PERMISSIONS                                │
│                                                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Module-by-Module Backend Plan

### 2.1 Module Control & Feature Flags

#### What It Controls
- Module-level enable/disable (e.g., CRM, Projects, Inventory)
- Sub-feature toggles (e.g., KPI Cards, Activity Feed, Smart Alerts)
- Action-level permissions (View, Create, Edit, Delete, Export, Approve, Assign)

#### Required Database Schema
```typescript
// feature_flags collection
{
  _id: ObjectId,
  tenantId: ObjectId (indexed),
  moduleId: String (indexed),           // 'crm', 'projects', 'inventory'
  enabled: Boolean,                   // Master switch for module
  features: Map<String, Boolean>,      // Sub-feature flags
  actions: Map<String, Boolean>,       // Action-level flags
  createdAt: Date,
  updatedAt: Date,
  version: Number                      // For optimistic locking
}

// Indexes:
// - { tenantId: 1, moduleId: 1 } - Unique compound
// - { tenantId: 1, enabled: 1 } - Fast active module queries
```

#### Required APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/settings/flags` | GET | List all feature flags for tenant |
| `/settings/flags/:moduleId` | GET | Get specific module flags |
| `/settings/flags/:moduleId` | PATCH | Toggle module/sub-feature/action |
| `/settings/flags/:moduleId/reset` | POST | Reset to defaults |

#### Required Middleware
```typescript
// FeatureFlagGuard - NestJS Guard
@Injectable()
class FeatureFlagGuard implements CanActivate {
  constructor(
    private featureFlagService: FeatureFlagService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.get('module', context.getHandler());
    const requiredAction = this.reflector.get('action', context.getHandler());
    
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;
    
    return this.featureFlagService.isActionEnabled(
      tenantId, 
      requiredModule, 
      requiredAction
    );
  }
}
```

#### Edge Cases
| Scenario | Handling |
|----------|----------|
| New tenant onboarding | Auto-populate with default feature flags from config |
| Missing feature flag | Default to `enabled: true` for backward compatibility |
| Concurrent toggle | Use version field for optimistic locking |
| Cache invalidation | Redis pub/sub to notify all nodes on flag change |

#### Performance Considerations
- **Redis caching**: Feature flags cached per tenant with 5-minute TTL
- **In-memory cache**: NestJS provider-level cache for hot paths
- **Batch evaluation**: Evaluate all flags for a module in single query

---

### 2.2 RBAC Matrix (Base Roles)

#### What It Controls
- Default permissions for system roles (Admin, Sales, PM, Engineer, etc.)
- Module × Action matrix for each role

#### Required Database Schema
```typescript
// rbac_configs collection
{
  _id: ObjectId,
  tenantId: ObjectId (indexed),
  roleId: String (indexed),             // 'admin', 'sales', 'pm'
  moduleId: String (indexed),           // 'crm', 'projects'
  permissions: Map<String, Boolean>,     // { view: true, create: false, ... }
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - { tenantId: 1, roleId: 1, moduleId: 1 } - Unique compound
// - { tenantId: 1, roleId: 1 } - Fast role retrieval
```

#### Required APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/settings/rbac` | GET | Get full RBAC matrix |
| `/settings/rbac/:roleId` | GET | Get permissions for specific role |
| `/settings/rbac/:roleId/:moduleId` | PATCH | Update specific permission |
| `/settings/rbac/:roleId/preset` | POST | Apply preset (full, view_only, none) |

#### Edge Cases
| Scenario | Handling |
|----------|----------|
| New role added to system | Auto-create RBAC entries with "none" preset |
| Invalid roleId | Return 400 with valid role IDs list |
| Bulk update | Transaction-based; all-or-nothing |

---

### 2.3 Role Builder (Custom Roles)

#### What It Controls
- Custom role creation (e.g., "Field Supervisor", "Junior Sales")
- Role cloning from existing roles
- Permission inheritance from base roles

#### Required Database Schema
```typescript
// custom_roles collection
{
  _id: ObjectId,
  tenantId: ObjectId (indexed),
  roleId: String (indexed),             // 'custom_123456789'
  label: String,                      // Display name
  description: String,
  baseRole: String | null,              // Inheritance source ('sales', null)
  color: String,                      // UI color code
  bg: String,                         // UI background color
  isCustom: Boolean,                  // Always true for this collection
  permissions: {                      // Nested object structure
    [moduleId: string]: {
      [actionId: string]: boolean
    }
  },
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId                 // User who created
}

// Indexes:
// - { tenantId: 1, roleId: 1 } - Unique
// - { tenantId: 1, baseRole: 1 } - Inheritance queries
```

#### Required APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/settings/custom-roles` | GET | List all custom roles |
| `/settings/custom-roles` | POST | Create new custom role |
| `/settings/custom-roles/:roleId` | GET | Get role details |
| `/settings/custom-roles/:roleId` | PATCH | Update role |
| `/settings/custom-roles/:roleId` | DELETE | Delete role |
| `/settings/custom-roles/:roleId/clone` | POST | Clone existing role |
| `/settings/custom-roles/:roleId/permissions` | PATCH | Bulk update permissions |

#### Edge Cases
| Scenario | Handling |
|----------|----------|
| Delete role with assigned users | Prevent deletion; require reassigning users first |
| Circular inheritance | Validate: baseRole cannot reference another custom role |
| Permission merge | On read: custom permissions override base role permissions |

#### Background Jobs
```typescript
// Handle role deletion with user reassignment
@Processor('role-deletion')
class RoleDeletionProcessor {
  @Process('reassign-users')
  async handleReassignment(job: Job<{ roleId: string; newRoleId: string }>) {
    // Reassign all users to new role before deletion
  }
}
```

---

### 2.4 User Permission Overrides

#### What It Controls
- Per-user permission exceptions to role defaults
- Force-grant or force-revoke specific permissions
- Custom role assignment per user

#### Required Database Schema
```typescript
// user_overrides collection
{
  _id: ObjectId,
  tenantId: ObjectId (indexed),
  userId: ObjectId (indexed),          // Reference to users collection
  customRoleId: String | null,         // Assigned custom role ('custom_123' or null)
  overrides: {                         // Permission overrides
    [moduleId: string]: {
      [actionId: string]: boolean | null  // true=grant, false=revoke, null=default
    }
  },
  createdAt: Date,
  updatedAt: Date,
  updatedBy: ObjectId                  // Admin who made the change
}

// Indexes:
// - { tenantId: 1, userId: 1 } - Unique
// - { tenantId: 1, customRoleId: 1 } - Role assignment queries
```

#### Required APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/settings/user-overrides` | GET | List all overrides (paginated) |
| `/settings/user-overrides/:userId` | GET | Get specific user overrides |
| `/settings/user-overrides/:userId/role` | PUT | Assign custom role |
| `/settings/user-overrides/:userId/permissions` | PATCH | Update permission overrides |
| `/settings/user-overrides/:userId` | DELETE | Clear all overrides |
| `/settings/user-overrides/bulk` | POST | Bulk apply overrides |

#### Edge Cases
| Scenario | Handling |
|----------|----------|
| User deleted | Cascade delete overrides; log to audit |
| Override count limit | Soft limit 100 overrides per user (configurable) |
| Conflicting overrides | Last write wins; version field for conflict detection |

---

### 2.5 View As (Impersonation)

#### What It Controls
- Admin ability to view system as another user
- Temporary permission context switching
- Session-based impersonation

#### Required Database Schema
```typescript
// view_as_sessions collection (optional - can use Redis)
{
  _id: ObjectId,
  tenantId: ObjectId,
  adminUserId: ObjectId,              // Who is viewing
  targetUserId: ObjectId,             // Whose view they're seeing
  startedAt: Date,
  expiresAt: Date,                    // Auto-expire after 30 minutes
  permissionsSnapshot: Object,       // Cached resolved permissions
  ipAddress: String,
  userAgent: String
}

// Redis alternative:
// Key: `viewas:${adminUserId}`
// TTL: 1800 seconds
// Value: { targetUserId, permissionsSnapshot }
```

#### Required APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/settings/view-as` | POST | Start impersonation session |
| `/settings/view-as` | GET | Get current impersonation status |
| `/settings/view-as` | DELETE | End impersonation session |
| `/settings/view-as/preview/:userId` | GET | Preview user's permissions without starting session |

#### Edge Cases
| Scenario | Handling |
|----------|----------|
| Impersonation loop | Prevent: cannot view-as when already viewing-as |
| Session expiry | Auto-logout after 30 minutes; configurable per tenant |
| Audit trail | All actions during view-as logged with both admin and target IDs |

---

### 2.6 Workflow Rules

#### What It Controls
- Automation rules based on conditions
- Triggers: Status change, field update, time-based
- Actions: Send notification, update field, create task, webhook call

#### Required Database Schema
```typescript
// workflow_rules collection
{
  _id: ObjectId,
  tenantId: ObjectId (indexed),
  wfId: String (indexed),               // Unique workflow ID
  enabled: Boolean,
  label: String,                        // Display name
  description: String,
  trigger: {
    type: String,                      // 'status_change', 'field_update', 'schedule'
    entity: String,                    // 'project', 'lead', 'task'
    config: Object                     // Trigger-specific config
  },
  conditions: [                        // Multiple conditions with AND/OR logic
    {
      field: String,                   // 'status', 'amount', 'priority'
      operator: String,                // 'eq', 'ne', 'gt', 'lt', 'contains', 'in'
      value: any,
      logic: 'AND' | 'OR'              // Relation to next condition
    }
  ],
  actions: [                           // Multiple actions to execute
    {
      type: String,                    // 'notify', 'update_field', 'create_task', 'webhook'
      config: Object,                  // Action-specific config
      delay: Number                    // Delay in minutes (0 = immediate)
    }
  ],
  executionCount: Number,             // Analytics: how many times executed
  lastExecutedAt: Date,
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId
}

// workflow_executions collection (for audit/debugging)
{
  _id: ObjectId,
  tenantId: ObjectId,
  wfId: String,
  entityId: ObjectId,                // Project/Lead ID that triggered
  entityType: String,
  triggeredAt: Date,
  executedAt: Date,
  status: 'success' | 'failed' | 'pending',
  result: Object,                     // Action results or error message
  context: Object                     // Full context snapshot
}
```

#### Required APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/settings/workflows` | GET | List all workflows |
| `/settings/workflows` | POST | Create new workflow |
| `/settings/workflows/:wfId` | GET | Get workflow details |
| `/settings/workflows/:wfId` | PATCH | Update workflow |
| `/settings/workflows/:wfId` | DELETE | Delete workflow |
| `/settings/workflows/:wfId/toggle` | POST | Enable/disable workflow |
| `/settings/workflows/:wfId/executions` | GET | Get execution history |
| `/settings/workflows/test` | POST | Test workflow against mock data |

#### Required Background Jobs
```typescript
// Workflow execution processor
@Processor('workflow-execution')
class WorkflowProcessor {
  @Process('execute-workflow')
  async handleExecution(job: Job<WorkflowJobData>) {
    const { wfId, entityId, context } = job.data;
    
    // 1. Re-fetch workflow (ensure still enabled)
    // 2. Evaluate conditions
    // 3. Execute actions in sequence
    // 4. Log execution result
    // 5. Handle retries for failed actions
  }
}

// Scheduled workflow trigger (for time-based workflows)
@Cron(CronExpression.EVERY_5_MINUTES)
async handleScheduledWorkflows() {
  // Find workflows with schedule triggers
  // Check if conditions match
  // Queue execution jobs
}
```

#### Edge Cases
| Scenario | Handling |
|----------|----------|
| Workflow recursion | Limit: max 5 nested executions per workflow chain |
| Action failure | Log error; continue to next action; retry 3x with backoff |
| Condition evaluation error | Fail workflow; notify admin; log full context |
| Concurrent executions | Lock entity during workflow execution |

---

### 2.7 Audit Logs

#### What It Controls
- Immutable record of all settings changes
- User attribution (who, what, when, from, to)
- IP address and user agent tracking
- Rollback capability markers

#### Required Database Schema
```typescript
// audit_logs collection
{
  _id: ObjectId,
  tenantId: ObjectId (indexed),
  logId: String (indexed),              // Unique log identifier ('a123456789')
  timestamp: Date (indexed),             // When action occurred
  user: {
    id: ObjectId,
    name: String,
    email: String,
    role: String
  },
  action: String (indexed),               // 'TOGGLE_MODULE', 'RBAC_EDIT', 'CUSTOM_ROLE_CREATED'
  target: String,                      // What was modified
  before: Object,                      // Previous state (full snapshot)
  after: Object,                       // New state (full snapshot)
  diff: Object,                        // Computed diff for quick viewing
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    correlationId: String            // For tracing across services
  },
  isRollback: Boolean,                 // Was this a rollback action?
  rolledBackFrom: String | null,       // Reference to original logId if rollback
  retentionClass: String               // 'standard' (90d), 'extended' (1y), 'permanent'
}

// Indexes:
// - { tenantId: 1, timestamp: -1 } - Time-series queries
// - { tenantId: 1, action: 1, timestamp: -1 } - Action filtering
// - { tenantId: 1, 'user.id': 1, timestamp: -1 } - User activity
// - { logId: 1 } - Unique lookup
// - { tenantId: 1, retentionClass: 1, timestamp: 1 } - TTL queries
```

#### Required APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/settings/audit-logs` | GET | Query logs (filter by date, user, action, target) |
| `/settings/audit-logs/:logId` | GET | Get specific log entry with full details |
| `/settings/audit-logs/export` | POST | Export logs to CSV/Excel |
| `/settings/audit-logs/:logId/rollback` | POST | Rollback to state before this change |
| `/settings/audit-logs/summary` | GET | Analytics dashboard data |

#### Background Jobs
```typescript
// Data retention job
@Cron('0 0 * * *') // Daily at midnight
async handleAuditRetention() {
  // Delete standard logs older than 90 days
  // Archive extended logs to cold storage after 1 year
}

// Aggregation job for dashboard
@Cron('0 */6 * * *') // Every 6 hours
async aggregateAuditStats() {
  // Pre-compute daily/monthly statistics
  // Cache in Redis for fast dashboard loading
}
```

#### Edge Cases
| Scenario | Handling |
|----------|----------|
| High write volume | Use MongoDB capped collections or sharding |
| Tamper evidence | Sign logs with HMAC (tenant-specific key) |
| Rollback conflicts | Warn if subsequent changes exist after target state |
| Export timeouts | Stream export; background generation for large datasets |

---

### 2.8 Project Type Configuration

#### What It Controls
- Per-project-type design rules
- Pricing models and margin calculations
- Financial configuration (GST, subsidies, incentives)
- Module visibility by project type

#### Required Database Schema
```typescript
// project_type_configs collection
{
  _id: ObjectId,
  tenantId: ObjectId (indexed),
  typeId: String (indexed),             // 'residential', 'commercial', 'utility'
  label: String,
  icon: String,                        // Lucide icon name
  
  // Design Rules Engine
  designRules: {
    minRoofArea: Number,               // sq meters
    maxRoofLoad: Number,               // kg/sq meter
    minSolarIrradiance: Number,       // kWh/m²/year
    allowedPanelTypes: [String],      // ['mono', 'poly', 'bifacial']
    allowedInverterTypes: [String],    // ['string', 'micro', 'hybrid']
    defaultStringSize: Number,         // Panels per string
    maxDcAcRatio: Number,              // DC/AC ratio limit
    shadowTolerance: String           // 'strict', 'moderate', 'lenient'
  },
  
  // Pricing Model
  pricingModel: {
    basePricePerWatt: Number,         // INR/Wp
    minSystemSizeKw: Number,
    maxSystemSizeKw: Number,
    priceTiers: [                      // Volume discounts
      { maxKw: Number, pricePerWatt: Number }
    ],
    marginPercent: Number,             // Target margin
    installationCostPerKw: Number,
    transportCostPerKm: Number
  },
  
  // Financial Configuration
  financials: {
    gstPercent: Number,                // GST rate
    subsidyEligible: Boolean,
    subsidyPercent: Number,            // If applicable
    acceleratedDepreciation: Boolean,  // Commercial benefit
    loanOptions: {
      available: Boolean,
      maxTenureYears: Number,
      interestRateRange: [Number, Number]
    }
  },
  
  // Module Visibility (which ERP modules are relevant)
  visibleModules: [String],           // ['crm', 'projects', 'commissioning']
  
  // Custom Fields
  customFields: [
    {
      key: String,
      label: String,
      type: 'text' | 'number' | 'select' | 'boolean',
      required: Boolean,
      options: [String]                 // For select type
    }
  ],
  
  createdAt: Date,
  updatedAt: Date,
  updatedBy: ObjectId,
  isActive: Boolean
}
```

#### Required APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/settings/project-types` | GET | List all project type configs |
| `/settings/project-types` | POST | Create new project type |
| `/settings/project-types/:typeId` | GET | Get full configuration |
| `/settings/project-types/:typeId` | PATCH | Update configuration |
| `/settings/project-types/:typeId/validate-design` | POST | Validate design against rules |
| `/settings/project-types/:typeId/calculate-price` | POST | Calculate price for given specs |

#### Integration Points
```typescript
// Quotation Engine Integration
class QuotationService {
  async generateQuotation(projectData, typeId) {
    const config = await this.projectTypeService.getConfig(typeId);
    
    // Apply pricing model
    const price = this.calculatePrice(projectData.systemSize, config.pricingModel);
    
    // Apply financials
    const withGst = this.applyGst(price, config.financials.gstPercent);
    const withSubsidy = config.financials.subsidyEligible 
      ? this.applySubsidy(withGst, config.financials.subsidyPercent)
      : withGst;
    
    return { price: withSubsidy, breakdown: {...} };
  }
}

// Design Engine Integration
class DesignEngineService {
  async validateDesign(designData, typeId) {
    const config = await this.projectTypeService.getConfig(typeId);
    
    const validations = [
      this.validateRoofArea(designData, config.designRules),
      this.validatePanelCompatibility(designData, config.designRules),
      this.validateDcAcRatio(designData, config.designRules)
    ];
    
    return { valid: validations.every(v => v.passed), errors: validations.filter(v => !v.passed) };
  }
}
```

#### Edge Cases
| Scenario | Handling |
|----------|----------|
| Invalid design rules | Validate on save; prevent impossible combinations |
| Price calculation overflow | Cap at max safe value; log warning |
| Module visibility conflicts | If parent module disabled, child features auto-disabled |
| Custom field name collision | Prefix with project type ID |

---

### 2.9 AI Insights (Placeholder for Future)

#### What It Controls
- Settings optimization recommendations
- Permission gap analysis
- Workflow efficiency suggestions
- Anomaly detection in settings changes

#### Required Database Schema
```typescript
// ai_insights collection
{
  _id: ObjectId,
  tenantId: ObjectId,
  insightId: String,
  type: 'permission_gap' | 'workflow_inefficiency' | 'security_risk' | 'optimization',
  severity: 'low' | 'medium' | 'high' | 'critical',
  title: String,
  description: String,
  relatedSettings: [String],          // Affected setting IDs
  recommendation: String,
  automatedFixAvailable: Boolean,
  automatedFixData: Object,           // If auto-fix available
  dismissed: Boolean,
  dismissedBy: ObjectId,
  dismissedAt: Date,
  createdAt: Date,
  expiresAt: Date                     // Insights have shelf life
}
```

#### Required Background Jobs
```typescript
// Daily AI analysis job
@Cron('0 2 * * *') // 2 AM daily
async generateAiInsights() {
  // 1. Analyze permission matrix for gaps
  // 2. Detect redundant/overlapping workflows
  // 3. Identify security risks (e.g., too many admins)
  // 4. Cache insights for dashboard
}
```

---

## 3. Database Schema Overview

### 3.1 Collections Summary

| Collection | Purpose | Approximate Size |
|------------|---------|------------------|
| `feature_flags` | Module/sub-feature/action toggles | ~50 docs/tenant |
| `rbac_configs` | Base role permissions | ~100 docs/tenant |
| `custom_roles` | Custom role definitions | ~20 docs/tenant |
| `user_overrides` | User-level permission exceptions | ~100 docs/tenant |
| `workflow_rules` | Automation rules | ~50 docs/tenant |
| `workflow_executions` | Workflow run history | ~10K docs/tenant/month |
| `audit_logs` | Immutable change log | ~50K docs/tenant/month |
| `project_type_configs` | Project type settings | ~10 docs/tenant |
| `ai_insights` | AI-generated recommendations | ~100 docs/tenant |

### 3.2 Entity Relationship Diagram

```
┌─────────────────────┐         ┌─────────────────────┐
│   feature_flags     │         │   rbac_configs      │
├─────────────────────┤         ├─────────────────────┤
│ tenantId (FK)       │◄────────┤ tenantId (FK)       │
│ moduleId            │         │ roleId              │
│ enabled             │         │ moduleId            │
│ features[]          │         │ permissions{}        │
│ actions[]           │         └─────────────────────┘
└─────────────────────┘                  │
         │                               │
         │         ┌─────────────────────┴─────────────┐
         │         │                                     │
         ▼         ▼                                     ▼
┌─────────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   custom_roles          │  │   user_overrides    │  │   workflow_rules    │
├─────────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ tenantId (FK)           │  │ tenantId (FK)       │  │ tenantId (FK)       │
│ roleId                  │  │ userId (FK)          │  │ wfId                │
│ baseRole ───────────────┘  │ customRoleId ───────┘  │ enabled             │
│ permissions{}             │ overrides{}            │ conditions[]        │
└─────────────────────────┘  └─────────────────────┘  │ actions[]           │
                                                      └─────────────────────┘
┌─────────────────────────┐  ┌─────────────────────────┐
│   project_type_configs  │  │   audit_logs            │
├─────────────────────────┤  ├─────────────────────────┤
│ tenantId (FK)           │  │ tenantId (FK)           │
│ typeId                  │  │ user.id (FK)             │
│ designRules{}            │  │ action                  │
│ pricingModel{}           │  │ target                  │
│ financials{}             │  │ before/after            │
│ visibleModules[]        │  │ metadata{}               │
└─────────────────────────┘  └─────────────────────────┘
```

### 3.3 Sharding Strategy (Future Consideration)

For 1000+ tenants, consider:
- **Shard key**: `tenantId` (hash-based)
- **Collections to shard**: `audit_logs`, `workflow_executions`
- **Zone sharding**: Group tenants by region for data locality

---

## 4. API Endpoint Blueprint

### 4.1 RESTful Endpoint Map

```
Base Path: /api/v1/settings

┌────────────────────────────────────────────────────────────────────────┐
│ FEATURE FLAGS                                                          │
├────────────────────────────────────────────────────────────────────────┤
GET    /flags                    → List all feature flags
GET    /flags/:moduleId          → Get specific module flags
PATCH  /flags/:moduleId          → Update module/feature/action toggle
POST   /flags/:moduleId/reset     → Reset module to defaults
POST   /flags/reset-all           → Reset all flags (admin only)

┌────────────────────────────────────────────────────────────────────────┐
│ RBAC (BASE ROLES)                                                      │
├────────────────────────────────────────────────────────────────────────┤
GET    /rbac                      → Get full RBAC matrix
GET    /rbac/:roleId             → Get role permissions
PATCH  /rbac/:roleId/:moduleId   → Update specific permission
POST   /rbac/:roleId/preset       → Apply preset (full/view_only/none)

┌────────────────────────────────────────────────────────────────────────┐
│ CUSTOM ROLES                                                           │
├────────────────────────────────────────────────────────────────────────┤
GET    /custom-roles              → List custom roles
POST   /custom-roles              → Create custom role
GET    /custom-roles/:roleId      → Get role details
PATCH  /custom-roles/:roleId      → Update role
DELETE /custom-roles/:roleId      → Delete role
POST   /custom-roles/:roleId/clone → Clone role
PATCH  /custom-roles/:roleId/permissions → Bulk update permissions

┌────────────────────────────────────────────────────────────────────────┐
│ USER PERMISSIONS                                                       │
├────────────────────────────────────────────────────────────────────────┤
GET    /user-overrides            → List all overrides (paginated)
GET    /user-overrides/:userId      → Get user overrides
PUT    /user-overrides/:userId/role → Assign custom role
PATCH  /user-overrides/:userId/permissions → Update overrides
DELETE /user-overrides/:userId      → Clear all overrides
POST   /user-overrides/bulk         → Bulk operations

┌────────────────────────────────────────────────────────────────────────┐
│ VIEW AS (IMPERSONATION)                                               │
├────────────────────────────────────────────────────────────────────────┤
POST   /view-as                   → Start impersonation
GET    /view-as                   → Get current status
DELETE /view-as                   → End impersonation
GET    /view-as/preview/:userId    → Preview without starting

┌────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW RULES                                                         │
├────────────────────────────────────────────────────────────────────────┤
GET    /workflows                 → List workflows
POST   /workflows                 → Create workflow
GET    /workflows/:wfId           → Get workflow details
PATCH  /workflows/:wfId           → Update workflow
DELETE /workflows/:wfId           → Delete workflow
POST   /workflows/:wfId/toggle    → Enable/disable
GET    /workflows/:wfId/executions → Get execution history
POST   /workflows/test            → Test workflow

┌────────────────────────────────────────────────────────────────────────┐
│ AUDIT LOGS                                                             │
├────────────────────────────────────────────────────────────────────────┤
GET    /audit-logs                → Query logs (filtered)
GET    /audit-logs/:logId          → Get specific log
POST   /audit-logs/export          → Export to CSV/Excel
POST   /audit-logs/:logId/rollback → Rollback to this state
GET    /audit-logs/summary         → Dashboard analytics

┌────────────────────────────────────────────────────────────────────────┐
│ PROJECT TYPES                                                          │
├────────────────────────────────────────────────────────────────────────┤
GET    /project-types             → List project types
POST   /project-types             → Create project type
GET    /project-types/:typeId      → Get configuration
PATCH  /project-types/:typeId      → Update configuration
POST   /project-types/:typeId/validate-design → Validate design
POST   /project-types/:typeId/calculate-price → Calculate price

┌────────────────────────────────────────────────────────────────────────┐
│ BULK / ADMIN                                                           │
├────────────────────────────────────────────────────────────────────────┤
GET    /full-settings             → Get all settings (frontend bootstrap)
POST   /import                    → Import settings from JSON
GET    /export                    → Export all settings to JSON
```

### 4.2 DTOs (Data Transfer Objects)

```typescript
// Common DTOs
class PaginationDto {
  page: number = 1;
  limit: number = 50;
  sortBy: string = 'createdAt';
  sortOrder: 'asc' | 'desc' = 'desc';
}

class TenantScopedDto {
  tenantId: string;  // Injected from JWT or header
}

// Feature Flag DTOs
class UpdateFeatureFlagDto {
  @IsBoolean()
  enabled: boolean;
  
  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;
  
  @IsOptional()
  @IsObject()
  actions?: Record<string, boolean>;
  
  @IsNumber()
  version: number;  // For optimistic locking
}

// RBAC DTOs
class UpdateRBACDto {
  @IsString()
  roleId: string;
  
  @IsString()
  moduleId: string;
  
  @IsObject()
  permissions: Record<string, boolean>;
}

// Workflow DTOs
class CreateWorkflowDto {
  @IsString()
  label: string;
  
  @IsString()
  description: string;
  
  @ValidateNested()
  trigger: WorkflowTriggerDto;
  
  @IsArray()
  @ValidateNested({ each: true })
  conditions: WorkflowConditionDto[];
  
  @IsArray()
  @ValidateNested({ each: true })
  actions: WorkflowActionDto[];
}

// Audit Log DTOs
class QueryAuditLogDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;
  
  @IsOptional()
  @IsDateString()
  endDate?: string;
  
  @IsOptional()
  @IsString()
  userId?: string;
  
  @IsOptional()
  @IsString()
  action?: string;
}
```

---

## 5. Permission Middleware Architecture

### 5.1 Middleware Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW (INCOMING)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. AuthenticationGuard          (JWT validation)                 │
│     └── Validates token, extracts user + tenant                   │
│                                                                      │
│  2. TenantGuard                  (Tenant isolation)                 │
│     └── Extracts tenantId, validates user belongs to tenant         │
│                                                                      │
│  3. FeatureFlagGuard             (Global kill switch)               │
│     └── Checks if module/action is enabled in settings            │
│                                                                      │
│  4. PermissionGuard              (RBAC check)                       │
│     └── Resolves user permissions (override → custom → base)        │
│                                                                      │
│  5. RateLimitGuard               (Optional)                         │
│     └── Prevents brute force on sensitive endpoints               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Permission Service Implementation

```typescript
@Injectable()
class PermissionService {
  constructor(
    private featureFlagService: FeatureFlagService,
    private rbacService: RBACService,
    private customRoleService: CustomRoleService,
    private userOverrideService: UserOverrideService,
    private cacheManager: Cache
  ) {}

  /**
   * Resolve permission using hierarchy:
   * 1. Feature Flag (global kill switch)
   * 2. User Override (hard override)
   * 3. Custom Role (user-assigned role)
   * 4. Base RBAC (default role permissions)
   */
  async resolvePermission(
    tenantId: string,
    userId: string,
    roleId: string,
    moduleId: string,
    actionId: string
  ): Promise<boolean> {
    // Check cache first
    const cacheKey = `perm:${tenantId}:${userId}:${moduleId}:${actionId}`;
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== undefined) return cached;

    // 1. Feature Flag Check
    const moduleEnabled = await this.featureFlagService.isModuleEnabled(
      tenantId, moduleId
    );
    if (!moduleEnabled) {
      await this.cacheManager.set(cacheKey, false, 300); // 5 min TTL
      return false;
    }

    // 2. User Override Check
    const userOverride = await this.userOverrideService.getOverride(
      tenantId, userId, moduleId, actionId
    );
    if (userOverride !== null) {
      await this.cacheManager.set(cacheKey, userOverride, 300);
      return userOverride;
    }

    // 3. Custom Role Check
    const customRoleId = await this.userOverrideService.getCustomRoleId(
      tenantId, userId
    );
    if (customRoleId) {
      const customPerm = await this.customRoleService.getPermission(
        tenantId, customRoleId, moduleId, actionId
      );
      if (customPerm !== undefined) {
        await this.cacheManager.set(cacheKey, customPerm, 300);
        return customPerm;
      }
    }

    // 4. Base RBAC Check
    const basePerm = await this.rbacService.getPermission(
      tenantId, roleId, moduleId, actionId
    );
    
    await this.cacheManager.set(cacheKey, basePerm, 300);
    return basePerm;
  }

  /**
   * Bulk resolve all permissions for a user (for frontend bootstrap)
   */
  async resolveAllPermissions(
    tenantId: string,
    userId: string,
    roleId: string
  ): Promise<PermissionMatrix> {
    const cacheKey = `perm:all:${tenantId}:${userId}`;
    const cached = await this.cacheManager.get<PermissionMatrix>(cacheKey);
    if (cached) return cached;

    // Parallel resolution
    const [featureFlags, userOverride, customRoleId] = await Promise.all([
      this.featureFlagService.getAllFlags(tenantId),
      this.userOverrideService.getAllOverrides(tenantId, userId),
      this.userOverrideService.getCustomRoleId(tenantId, userId)
    ]);

    // Build permission matrix
    const matrix: PermissionMatrix = {};
    
    for (const module of MODULES) {
      matrix[module.id] = {};
      
      for (const action of ACTIONS) {
        matrix[module.id][action.id] = this.computePermission(
          featureFlags,
          userOverride,
          customRoleId,
          module.id,
          action.id
        );
      }
    }

    await this.cacheManager.set(cacheKey, matrix, 300);
    return matrix;
  }
}
```

### 5.3 Decorators

```typescript
// Module decorator
export const RequiredModule = (moduleId: string) => 
  SetMetadata('requiredModule', moduleId);

// Action decorator  
export const RequiredAction = (actionId: string) =>
  SetMetadata('requiredAction', actionId);

// Combined decorator
export const RequirePermission = (moduleId: string, actionId: string) =>
  applyDecorators(
    RequiredModule(moduleId),
    RequiredAction(actionId),
    UseGuards(FeatureFlagGuard, PermissionGuard)
  );

// Usage example:
@Controller('leads')
class LeadsController {
  @Get()
  @RequirePermission('crm', 'view')
  async getLeads() { }

  @Post()
  @RequirePermission('crm', 'create')
  async createLead() { }

  @Delete(':id')
  @RequirePermission('crm', 'delete')
  async deleteLead() { }
}
```

### 5.4 Cache Invalidation Strategy

| Event | Cache Keys Invalidated |
|-------|----------------------|
| Feature flag toggled | `perm:${tenantId}:*:${moduleId}:*` |
| RBAC updated | `perm:${tenantId}:*:${moduleId}:*` |
| Custom role changed | `perm:${tenantId}:*` (all users with this role) |
| User override changed | `perm:${tenantId}:${userId}:*` |

---

## 6. Workflow Engine Architecture

### 6.1 Workflow Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW EXECUTION FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TRIGGER                                                            │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │
│  │  Event      │────►│  Condition  │────►│  Action     │          │
│  │  Captured   │     │  Evaluation │     │  Execution  │          │
│  └─────────────┘     └─────────────┘     └─────────────┘          │
│        │                    │                   │                   │
│        ▼                    ▼                   ▼                   │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐          │
│  │  Queue Job  │     │  Log Result │     │  Handle     │          │
│  │             │     │             │     │  Retries    │          │
│  └─────────────┘     └─────────────┘     └─────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Trigger Types

| Trigger | Description | Example |
|---------|-------------|---------|
| `entity_created` | New entity created | New lead added |
| `entity_updated` | Field changed | Lead status changed to "Qualified" |
| `status_changed` | Status transition | Project moved to "Installation" |
| `schedule` | Time-based | Every Monday at 9 AM |
| `webhook` | External event | Payment received webhook |

### 6.3 Condition Operators

```typescript
const CONDITION_OPERATORS = {
  'eq': (a, b) => a === b,
  'ne': (a, b) => a !== b,
  'gt': (a, b) => a > b,
  'gte': (a, b) => a >= b,
  'lt': (a, b) => a < b,
  'lte': (a, b) => a <= b,
  'contains': (a, b) => a.includes(b),
  'in': (a, b) => b.includes(a),
  'between': (a, b) => a >= b[0] && a <= b[1],
  'exists': (a) => a !== undefined && a !== null,
  'matches': (a, b) => new RegExp(b).test(a),
};
```

### 6.4 Action Types

| Action | Config | Description |
|--------|--------|-------------|
| `notify` | `{ channel: 'email' \| 'sms' \| 'push', template: string, recipients: string[] }` | Send notification |
| `update_field` | `{ entity: string, field: string, value: any }` | Update entity field |
| `create_task` | `{ title: string, assignee: string, dueInDays: number }` | Create follow-up task |
| `webhook` | `{ url: string, method: string, headers: object, body: object }` | HTTP call |
| `approval_request` | `{ approvers: string[], timeout: number }` | Request approval |
| `delay` | `{ duration: number }` | Wait before next action |

### 6.5 Implementation Structure

```typescript
// Workflow Engine Service
@Injectable()
class WorkflowEngineService {
  constructor(
    private workflowRuleService: WorkflowRuleService,
    private queue: Queue,
    private auditService: AuditService
  ) {}

  async trigger(trigger: WorkflowTrigger, context: WorkflowContext) {
    // 1. Find matching workflows
    const workflows = await this.workflowRuleService.findByTrigger(
      context.tenantId,
      trigger.type,
      trigger.entity
    );

    // 2. Queue evaluation jobs
    for (const workflow of workflows) {
      if (!workflow.enabled) continue;

      await this.queue.add('evaluate-workflow', {
        workflowId: workflow.id,
        trigger,
        context,
        triggeredAt: new Date()
      }, {
        delay: 0,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      });
    }
  }

  async evaluateConditions(
    workflow: WorkflowRule,
    context: WorkflowContext
  ): Promise<boolean> {
    let result = true;

    for (let i = 0; i < workflow.conditions.length; i++) {
      const condition = workflow.conditions[i];
      const value = this.getValueFromContext(context, condition.field);
      const operator = CONDITION_OPERATORS[condition.operator];
      const conditionResult = operator(value, condition.value);

      if (i === 0) {
        result = conditionResult;
      } else {
        const prevCondition = workflow.conditions[i - 1];
        if (prevCondition.logic === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }
    }

    return result;
  }

  async executeActions(
    workflow: WorkflowRule,
    context: WorkflowContext
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of workflow.actions) {
      // Handle delay
      if (action.delay > 0) {
        await new Promise(r => setTimeout(r, action.delay * 60000));
      }

      const executor = this.getActionExecutor(action.type);
      try {
        const result = await executor.execute(action.config, context);
        results.push({ action, status: 'success', result });
      } catch (error) {
        results.push({ action, status: 'failed', error: error.message });
        // Continue to next action unless configured otherwise
      }
    }

    return results;
  }
}

// Bull Queue Processor
@Processor('workflow-execution')
class WorkflowExecutionProcessor {
  constructor(private engine: WorkflowEngineService) {}

  @Process('evaluate-workflow')
  async handleEvaluation(job: Job<WorkflowJobData>) {
    const { workflowId, context } = job.data;

    // Re-fetch workflow to ensure still enabled
    const workflow = await this.engine.getWorkflow(workflowId);
    if (!workflow?.enabled) return;

    // Evaluate conditions
    const conditionsMet = await this.engine.evaluateConditions(workflow, context);
    if (!conditionsMet) return;

    // Execute actions
    const results = await this.engine.executeActions(workflow, context);

    // Log execution
    await this.engine.logExecution(workflowId, context, results);
  }
}
```

---

## 7. Feature Flag Engine Architecture

### 7.1 Evaluation Strategy

```typescript
@Injectable()
class FeatureFlagService {
  constructor(
    @InjectModel(FeatureFlag.name) private model: Model<FeatureFlagDocument>,
    @Inject(CACHE_MANAGER) private cache: Cache
  ) {}

  async isModuleEnabled(tenantId: string, moduleId: string): Promise<boolean> {
    const cacheKey = `flag:module:${tenantId}:${moduleId}`;
    
    // Check cache
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== undefined) return cached;

    // Fetch from DB
    const flag = await this.model.findOne({ tenantId, moduleId });
    const enabled = flag?.enabled ?? true; // Default to true

    // Cache result
    await this.cache.set(cacheKey, enabled, 300);
    return enabled;
  }

  async isFeatureEnabled(
    tenantId: string,
    moduleId: string,
    featureId: string
  ): Promise<boolean> {
    // Must check module first
    const moduleEnabled = await this.isModuleEnabled(tenantId, moduleId);
    if (!moduleEnabled) return false;

    const cacheKey = `flag:feature:${tenantId}:${moduleId}:${featureId}`;
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== undefined) return cached;

    const flag = await this.model.findOne({ tenantId, moduleId });
    const enabled = flag?.features?.get(featureId) ?? true;

    await this.cache.set(cacheKey, enabled, 300);
    return enabled;
  }

  async isActionEnabled(
    tenantId: string,
    moduleId: string,
    actionId: string
  ): Promise<boolean> {
    const moduleEnabled = await this.isModuleEnabled(tenantId, moduleId);
    if (!moduleEnabled) return false;

    const cacheKey = `flag:action:${tenantId}:${moduleId}:${actionId}`;
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== undefined) return cached;

    const flag = await this.model.findOne({ tenantId, moduleId });
    const enabled = flag?.actions?.get(actionId) ?? false; // Default to false

    await this.cache.set(cacheKey, enabled, 300);
    return enabled;
  }

  async getAllFlags(tenantId: string): Promise<FeatureFlagMap> {
    const cacheKey = `flags:all:${tenantId}`;
    const cached = await this.cache.get<FeatureFlagMap>(cacheKey);
    if (cached) return cached;

    const flags = await this.model.find({ tenantId });
    const map: FeatureFlagMap = {};

    for (const flag of flags) {
      map[flag.moduleId] = {
        enabled: flag.enabled,
        features: Object.fromEntries(flag.features || new Map()),
        actions: Object.fromEntries(flag.actions || new Map())
      };
    }

    await this.cache.set(cacheKey, map, 300);
    return map;
  }

  async toggle(
    tenantId: string,
    moduleId: string,
    type: 'module' | 'feature' | 'action',
    id: string,
    enabled: boolean,
    userId: string
  ): Promise<void> {
    const update: any = {};
    
    if (type === 'module') {
      update.enabled = enabled;
    } else if (type === 'feature') {
      update[`features.${id}`] = enabled;
    } else if (type === 'action') {
      update[`actions.${id}`] = enabled;
    }

    await this.model.updateOne(
      { tenantId, moduleId },
      { $set: update, $inc: { version: 1 } },
      { upsert: true }
    );

    // Invalidate caches
    await this.invalidateCaches(tenantId, moduleId, type, id);

    // Log audit
    await this.auditService.log({
      action: `TOGGLE_${type.toUpperCase()}`,
      target: `${moduleId}.${id}`,
      to: enabled,
      userId
    });
  }

  private async invalidateCaches(
    tenantId: string,
    moduleId: string,
    type: string,
    id: string
  ): Promise<void> {
    // Publish invalidation event for other nodes
    await this.redis.publish('cache:invalidate', JSON.stringify({
      tenantId,
      moduleId,
      type,
      id
    }));
  }
}
```

### 7.2 Default Flags Generation

```typescript
// Default flags for new tenants
const DEFAULT_FEATURE_FLAGS = {
  dashboard: {
    enabled: true,
    features: {
      kpi_cards: true,
      activity_feed: true,
      smart_alerts: true,
      performance_charts: true
    },
    actions: {
      view: true,
      customize: true,
      export: false
    }
  },
  crm: {
    enabled: true,
    features: {
      kanban_view: true,
      table_view: true,
      bulk_actions: true,
      email_integration: false
    },
    actions: {
      view: true,
      create: true,
      edit: true,
      delete: false,
      export: true,
      assign: true,
      approve: false
    }
  },
  // ... other modules
};

@Injectable()
class TenantProvisioningService {
  async provisionTenant(tenantId: string): Promise<void> {
    // Create default feature flags
    for (const [moduleId, config] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
      await this.featureFlagService.create({
        tenantId,
        moduleId,
        ...config
      });
    }

    // Create default RBAC
    await this.rbacService.createDefaults(tenantId);

    // Create default project types
    await this.projectTypeService.createDefaults(tenantId);
  }
}
```

---

## 8. Audit Logging System Design

### 8.1 Audit Event Types

```typescript
enum AuditAction {
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

  // Project Types
  PROJECT_TYPE_CREATED = 'PROJECT_TYPE_CREATED',
  PROJECT_TYPE_UPDATED = 'PROJECT_TYPE_UPDATED',
  PROJECT_TYPE_DELETED = 'PROJECT_TYPE_DELETED',

  // System
  SETTINGS_IMPORTED = 'SETTINGS_IMPORTED',
  SETTINGS_EXPORTED = 'SETTINGS_EXPORTED',
  ROLLBACK = 'ROLLBACK'
}
```

### 8.2 Audit Service Implementation

```typescript
@Injectable()
class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private model: Model<AuditLogDocument>,
    @InjectQueue('audit-logs') private queue: Queue
  ) {}

  /**
   * Log an audit event asynchronously
   */
  async log(event: AuditEvent): Promise<void> {
    // Queue for async processing (don't block main flow)
    await this.queue.add('log-audit', event, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true
    });
  }

  /**
   * Immediate logging for critical events
   */
  async logImmediate(event: AuditEvent): Promise<AuditLog> {
    const doc = new this.model({
      logId: `a${Date.now()}${randomBytes(4).toString('hex')}`,
      timestamp: new Date(),
      ...event
    });
    return doc.save();
  }

  /**
   * Query audit logs with filtering
   */
  async query(params: AuditQueryParams): Promise<PaginatedResult<AuditLog>> {
    const { tenantId, startDate, endDate, userId, action, page = 1, limit = 50 } = params;

    const filter: any = { tenantId };
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (userId) filter['user.id'] = userId;
    if (action) filter.action = action;

    const [data, total] = await Promise.all([
      this.model.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter)
    ]);

    return { data, total, page, limit };
  }

  /**
   * Rollback to a specific audit state
   */
  async rollback(tenantId: string, logId: string, requestedBy: string): Promise<void> {
    const auditLog = await this.model.findOne({ tenantId, logId });
    if (!auditLog) throw new NotFoundException('Audit log not found');

    // Check if subsequent changes exist
    const subsequentChanges = await this.model.countDocuments({
      tenantId,
      target: auditLog.target,
      timestamp: { $gt: auditLog.timestamp }
    });

    if (subsequentChanges > 0) {
      // Warn about conflicts but allow rollback
      // Store warning in rollback metadata
    }

    // Restore state based on audit type
    await this.restoreState(auditLog);

    // Log the rollback itself
    await this.logImmediate({
      tenantId,
      user: await this.getUser(requestedBy),
      action: AuditAction.ROLLBACK,
      target: auditLog.target,
      from: 'current',
      to: `state_at_${auditLog.timestamp}`,
      metadata: {
        rolledBackFrom: logId,
        conflictCount: subsequentChanges
      }
    });
  }

  private async restoreState(auditLog: AuditLogDocument): Promise<void> {
    // Type-specific restoration logic
    switch (auditLog.action) {
      case AuditAction.TOGGLE_MODULE:
      case AuditAction.TOGGLE_FEATURE:
      case AuditAction.TOGGLE_ACTION:
        await this.featureFlagService.restore(auditLog.tenantId, auditLog.before);
        break;
      case AuditAction.RBAC_EDIT:
        await this.rbacService.restore(auditLog.tenantId, auditLog.before);
        break;
      // ... other cases
    }
  }
}

// Queue processor
@Processor('audit-logs')
class AuditLogProcessor {
  @Process('log-audit')
  async handleLog(job: Job<AuditEvent>) {
    const doc = new this.auditModel({
      logId: `a${Date.now()}${randomBytes(4).toString('hex')}`,
      timestamp: new Date(),
      ...job.data
    });
    await doc.save();
  }
}
```

---

## 9. Project Type Configuration Engine Design

### 9.1 Configuration Resolution

```typescript
@Injectable()
class ProjectTypeService {
  constructor(
    @InjectModel(ProjectTypeConfig.name) private model: Model<ProjectTypeConfigDocument>,
    private cache: Cache
  ) {}

  /**
   * Get full configuration for a project type
   */
  async getConfig(tenantId: string, typeId: string): Promise<ProjectTypeConfig> {
    const cacheKey = `pt:${tenantId}:${typeId}`;
    const cached = await this.cache.get<ProjectTypeConfig>(cacheKey);
    if (cached) return cached;

    const config = await this.model.findOne({ tenantId, typeId });
    if (!config) throw new NotFoundException(`Project type ${typeId} not found`);

    await this.cache.set(cacheKey, config, 600); // 10 min cache
    return config;
  }

  /**
   * Validate design against project type rules
   */
  async validateDesign(
    tenantId: string,
    typeId: string,
    designData: DesignData
  ): Promise<ValidationResult> {
    const config = await this.getConfig(tenantId, typeId);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate roof area
    if (designData.roofArea < config.designRules.minRoofArea) {
      errors.push(`Roof area ${designData.roofArea}m² is below minimum ${config.designRules.minRoofArea}m²`);
    }

    // Validate roof load
    const estimatedLoad = this.calculatePanelLoad(designData.panels);
    if (estimatedLoad > config.designRules.maxRoofLoad) {
      errors.push(`Estimated load ${estimatedLoad}kg/m² exceeds maximum ${config.designRules.maxRoofLoad}kg/m²`);
    }

    // Validate panel type
    if (!config.designRules.allowedPanelTypes.includes(designData.panelType)) {
      errors.push(`Panel type ${designData.panelType} not allowed for ${typeId} projects`);
    }

    // Validate DC/AC ratio
    const dcAcRatio = designData.dcCapacity / designData.acCapacity;
    if (dcAcRatio > config.designRules.maxDcAcRatio) {
      warnings.push(`DC/AC ratio ${dcAcRatio.toFixed(2)} exceeds recommended ${config.designRules.maxDcAcRatio}`);
    }

    // Validate string size
    const stringSize = this.calculateStringSize(designData.panels, designData.inverters);
    if (stringSize > config.designRules.defaultStringSize) {
      warnings.push(`String size ${stringSize} exceeds recommended ${config.designRules.defaultStringSize}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      estimatedPerformance: this.calculatePerformance(designData, config)
    };
  }

  /**
   * Calculate price for a project
   */
  async calculatePrice(
    tenantId: string,
    typeId: string,
    systemSizeKw: number
  ): Promise<PriceBreakdown> {
    const config = await this.getConfig(tenantId, typeId);
    const pricing = config.pricingModel;

    // Determine price tier
    let pricePerWatt = pricing.basePricePerWatt;
    for (const tier of pricing.priceTiers) {
      if (systemSizeKw <= tier.maxKw) {
        pricePerWatt = tier.pricePerWatt;
        break;
      }
    }

    // Calculate base price
    const systemSizeWatts = systemSizeKw * 1000;
    const basePrice = systemSizeWatts * pricePerWatt;

    // Add installation cost
    const installationCost = systemSizeKw * pricing.installationCostPerKw;

    // Subtotal before margin
    const subtotal = basePrice + installationCost;

    // Apply margin
    const margin = subtotal * (pricing.marginPercent / 100);
    const withMargin = subtotal + margin;

    // Apply GST
    const gst = withMargin * (config.financials.gstPercent / 100);
    const withGst = withMargin + gst;

    // Apply subsidy if eligible
    let finalPrice = withGst;
    let subsidy = 0;
    if (config.financials.subsidyEligible) {
      subsidy = basePrice * (config.financials.subsidyPercent / 100);
      finalPrice = withGst - subsidy;
    }

    return {
      basePrice,
      installationCost,
      margin,
      gst,
      subsidy,
      finalPrice,
      breakdown: {
        pricePerWatt,
        systemSizeKw,
        marginPercent: pricing.marginPercent,
        gstPercent: config.financials.gstPercent,
        subsidyPercent: config.financials.subsidyEligible ? config.financials.subsidyPercent : 0
      }
    };
  }
}
```

### 9.2 Integration with Quotation Engine

```typescript
// Quotation Service
@Injectable()
class QuotationService {
  constructor(
    private projectTypeService: ProjectTypeService,
    private designEngine: DesignEngineService
  ) {}

  async generateQuotation(
    tenantId: string,
    projectData: ProjectData
  ): Promise<Quotation> {
    const typeId = projectData.projectType;

    // 1. Validate design against project type rules
    const validation = await this.projectTypeService.validateDesign(
      tenantId,
      typeId,
      projectData.design
    );

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Design validation failed',
        errors: validation.errors
      });
    }

    // 2. Calculate price
    const priceBreakdown = await this.projectTypeService.calculatePrice(
      tenantId,
      typeId,
      projectData.systemSizeKw
    );

    // 3. Generate optimized design
    const optimizedDesign = await this.designEngine.optimize(
      projectData.design,
      validation.estimatedPerformance
    );

    // 4. Generate BOM (Bill of Materials)
    const bom = await this.generateBOM(tenantId, typeId, optimizedDesign);

    // 5. Calculate financial projections
    const financials = this.calculateProjections(
      priceBreakdown,
      projectData.systemSizeKw,
      projectData.location
    );

    return {
      id: generateId(),
      tenantId,
      projectId: projectData.id,
      projectType: typeId,
      validation,
      price: priceBreakdown,
      design: optimizedDesign,
      bom,
      financials,
      status: 'draft',
      createdAt: new Date()
    };
  }
}
```

---

## 10. Implementation Order (Phase 1 → Phase 4)

### 10.1 Phase 1: Foundation (Weeks 1-2)

**Priority: CRITICAL**

| Task | Deliverable | Owner |
|------|-------------|-------|
| 1.1 | Database schema setup (all collections) | Backend Team |
| 1.2 | Base NestJS module structure | Backend Team |
| 1.3 | Tenant isolation middleware | Backend Team |
| 1.4 | Feature Flag service + cache layer | Backend Team |
| 1.5 | RBAC service | Backend Team |
| 1.6 | API endpoints for Feature Flags & RBAC | Backend Team |
| 1.7 | Frontend integration (basic) | Frontend Team |

**Acceptance Criteria:**
- All CRUD operations working for Feature Flags and RBAC
- Cache invalidation working
- Tenant isolation tested

### 10.2 Phase 2: Permission System (Weeks 3-4)

**Priority: HIGH**

| Task | Deliverable | Owner |
|------|-------------|-------|
| 2.1 | Custom Role service | Backend Team |
| 2.2 | User Override service | Backend Team |
| 2.3 | Permission resolution engine | Backend Team |
| 2.4 | PermissionGuard implementation | Backend Team |
| 2.5 | View As session management | Backend Team |
| 2.6 | API endpoints for Custom Roles & Overrides | Backend Team |
| 2.7 | Frontend permission hooks update | Frontend Team |

**Acceptance Criteria:**
- Permission resolution chain working end-to-end
- Custom roles can be created and assigned
- User overrides apply correctly
- "View As" functionality working

### 10.3 Phase 3: Automation & Audit (Weeks 5-6)

**Priority: HIGH**

| Task | Deliverable | Owner |
|------|-------------|-------|
| 3.1 | Workflow Rules service | Backend Team |
| 3.2 | Workflow execution engine (Bull queue) | Backend Team |
| 3.3 | Condition evaluation engine | Backend Team |
| 3.4 | Action executor framework | Backend Team |
| 3.5 | Audit logging service | Backend Team |
| 3.6 | Audit log aggregation jobs | Backend Team |
| 3.7 | Rollback functionality | Backend Team |

**Acceptance Criteria:**
- Workflows can be created and triggered
- Audit logs capturing all changes
- Rollback working for all setting types

### 10.4 Phase 4: Advanced Features (Weeks 7-8)

**Priority: MEDIUM**

| Task | Deliverable | Owner |
|------|-------------|-------|
| 4.1 | Project Type Configuration service | Backend Team |
| 4.2 | Design validation engine | Backend Team |
| 4.3 | Pricing calculation engine | Backend Team |
| 4.4 | Integration with Quotation service | Backend Team |
| 4.5 | AI Insights foundation | Backend Team |
| 4.6 | Bulk import/export functionality | Backend Team |
| 4.7 | Performance optimization | Backend Team |
| 4.8 | End-to-end testing | QA Team |

**Acceptance Criteria:**
- Project types fully configurable
- Design validation working
- Price calculations accurate
- System handles 1000+ tenants

### 10.5 Timeline Summary

```
Week 1-2:  [████████░░] Phase 1: Foundation (CRITICAL)
Week 3-4:  [████████░░] Phase 2: Permission System (HIGH)
Week 5-6:  [████████░░] Phase 3: Automation & Audit (HIGH)
Week 7-8:  [████████░░] Phase 4: Advanced Features (MEDIUM)
Week 9+:   [░░░░░░░░░░] Buffer / Polish / Performance
```

---

## 11. Risk & Complexity Analysis

### 11.1 High Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Permission cascade failures** | Security breach | Extensive unit tests for permission resolution; automated security testing |
| **Workflow infinite loops** | System overload | Max execution depth (5); circuit breaker pattern; monitoring |
| **Cache inconsistency** | Stale permissions | Redis pub/sub for invalidation; short TTLs; cache warming on startup |
| **Audit log data explosion** | Storage costs; query slowdown | Data retention policies; sharding strategy; archive to cold storage |
| **Tenant data leakage** | Compliance violation | Strict tenantId filtering on all queries; automated integration tests |

### 11.2 Complexity Matrix

| Component | Business Complexity | Technical Complexity | Est. Effort |
|-----------|-------------------|---------------------|-------------|
| Feature Flags | Low | Low | 2 days |
| RBAC Matrix | Medium | Low | 3 days |
| Custom Roles | Medium | Medium | 5 days |
| User Overrides | Medium | Medium | 4 days |
| Permission Resolution | High | High | 6 days |
| Workflow Engine | High | High | 8 days |
| Audit Logging | Low | Medium | 4 days |
| Project Types | High | Medium | 6 days |
| Integrations | Medium | High | 5 days |

**Total Estimated Effort: ~43 developer days**

### 11.3 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Permission resolution | < 10ms (cached) | Average over 1000 requests |
| Permission resolution (cache miss) | < 50ms | Average over 100 requests |
| Feature flag toggle propagation | < 5 seconds | Time to invalidate all caches |
| Workflow execution | < 2 seconds | From trigger to completion |
| Audit log query | < 100ms | 10,000 logs filtered |
| Settings page load | < 500ms | Full settings payload |

### 11.4 Scalability Considerations

| Scenario | Limit | Strategy |
|----------|-------|----------|
| Max workflows per tenant | 100 | Soft limit with warning |
| Max custom roles per tenant | 50 | Soft limit |
| Max audit logs per tenant | 1M | Archive to S3 after 90 days |
| Concurrent workflow executions | 10/tenant | Queue with backoff |
| Permission cache entries | 100K | LRU eviction |

---

## 12. Appendix: Data Migration Strategy

### 12.1 From LocalStorage to Backend

For existing users with localStorage data:

```typescript
@Injectable()
class SettingsMigrationService {
  async migrateFromLocalStorage(
    tenantId: string,
    localStorageData: LocalStorageSettings
  ): Promise<MigrationResult> {
    const results = {
      featureFlags: 0,
      rbacConfigs: 0,
      customRoles: 0,
      workflows: 0,
      errors: []
    };

    // 1. Migrate Feature Flags
    for (const [moduleId, flag] of Object.entries(localStorageData.flags)) {
      try {
        await this.featureFlagService.create({
          tenantId,
          moduleId,
          enabled: flag.enabled,
          features: flag.features,
          actions: flag.actions
        });
        results.featureFlags++;
      } catch (e) {
        results.errors.push({ type: 'featureFlag', moduleId, error: e.message });
      }
    }

    // 2. Migrate RBAC
    for (const [roleId, modules] of Object.entries(localStorageData.rbac)) {
      for (const [moduleId, permissions] of Object.entries(modules)) {
        try {
          await this.rbacService.create({
            tenantId,
            roleId,
            moduleId,
            permissions
          });
          results.rbacConfigs++;
        } catch (e) {
          results.errors.push({ type: 'rbac', roleId, moduleId, error: e.message });
        }
      }
    }

    // 3. Migrate Custom Roles
    for (const [roleId, role] of Object.entries(localStorageData.customRoles)) {
      try {
        await this.customRoleService.create({
          tenantId,
          ...role
        });
        results.customRoles++;
      } catch (e) {
        results.errors.push({ type: 'customRole', roleId, error: e.message });
      }
    }

    // 4. Migrate Workflows
    for (const workflow of localStorageData.workflows) {
      try {
        await this.workflowService.create({
          tenantId,
          ...workflow
        });
        results.workflows++;
      } catch (e) {
        results.errors.push({ type: 'workflow', wfId: workflow.wfId, error: e.message });
      }
    }

    return results;
  }
}
```

### 12.2 Rollback Plan

If migration fails:

```typescript
// Rollback all changes for a tenant
async rollbackMigration(tenantId: string): Promise<void> {
  await Promise.all([
    this.featureFlagService.deleteAll(tenantId),
    this.rbacService.deleteAll(tenantId),
    this.customRoleService.deleteAll(tenantId),
    this.workflowService.deleteAll(tenantId),
    this.auditService.deleteAll(tenantId)
  ]);
}
```

---

**Document End**

*This blueprint is a living document. Update as requirements evolve.*
