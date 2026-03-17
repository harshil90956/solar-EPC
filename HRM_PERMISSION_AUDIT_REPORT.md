# HRM Module Architecture and Permission System Audit Report

**Project:** Solar ERP System  
**Date:** March 16, 2026  
**Module:** Human Resource Management (HRM)

---

## 1. EXECUTIVE SUMMARY

The HRM module in the Solar ERP system currently has a **dual permission architecture** that creates complexity and inconsistency. Two separate permission systems exist:
1. **Legacy Permission System** (`permission.service.ts`, `role.schema.ts`) - Granular permission-based
2. **HRM-Specific Permission System** (`hrm-permission.service.ts`, `hrm-permission.schema.ts`) - Role-based with hardcoded defaults

This audit identifies critical gaps in data visibility control, role hierarchy, and admin configurability.

---

## 2. CURRENT PERMISSION IMPLEMENTATION ANALYSIS

### 2.1 Backend Permission Systems

#### System A: Legacy Granular Permission System
**Files:**
- `backend/src/modules/hrm/services/permission.service.ts`
- `backend/src/modules/hrm/schemas/permission.schema.ts`
- `backend/src/modules/hrm/schemas/role.schema.ts`

**Structure:**
```typescript
// Permission schema defines granular actions
permissions: [
  'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
  'leaves.view', 'leaves.apply', 'leaves.approve', 'leaves.reject',
  'attendance.view', 'attendance.checkin', 'attendance.checkout',
  'payroll.view', 'payroll.manage', 'payroll.approve',
  // ... 57+ total permissions
]
```

**Features:**
- ✅ Column-level permissions (which columns a role can see)
- ✅ Permission-based module access
- ✅ Role management with system vs custom roles
- ✅ Supports `Admin`, `HR Manager`, `HR Executive`, `Employee` roles

#### System B: HRM-Specific Permission System
**Files:**
- `backend/src/modules/hrm/services/hrm-permission.service.ts`
- `backend/src/modules/hrm/schemas/hrm-permission.schema.ts`

**Structure:**
```typescript
permissions: {
  employees: { view: boolean; manage: boolean; delete: boolean };
  leaves: { view: boolean; apply: boolean; approve: boolean };
  attendance: { view_self: boolean; view_all: boolean; checkin_checkout: boolean; manage: boolean };
  payroll: { view: boolean; manage: boolean; approve: boolean };
  increments: { view: boolean; manage: boolean };
  departments: { view: boolean; manage: boolean };
  dashboard: { view: boolean };
}
```

**Features:**
- ✅ Hardcoded default permissions per role
- ✅ Simple nested permission structure
- ✅ Tenant-aware permission storage
- ❌ No column-level control
- ❌ No data scope control

### 2.2 Frontend Permission Implementation

**Files:**
- `frontend/src/hooks/usePermissions.js` - Uses System A (Legacy)
- `frontend/src/hooks/useHRMPermission.js` - Uses System B (HRM-Specific)
- `frontend/src/pages/HrmPermissionsPage.jsx` - Uses System B (HRM-Specific)

**Key Findings:**
- Frontend uses BOTH systems simultaneously
- `usePermissions` hook fetches from `/hrm/permissions/roles/:id/permissions`
- `useHRMPermission` hook fetches from `/hrm/permissions/role/:roleId`
- Confusion between `permission` and `permissions` endpoints

### 2.3 Current Permission Enforcement

**Controllers Using HRM Permission Checks:**
- `employee.controller.ts` - Uses `hrmPermissionService.checkPermission()`
- `leave.controller.ts` - Uses `hrmPermissionService.checkPermission()`
- `attendance.controller.ts` - Uses both systems
- `payroll.controller.ts` - Uses both systems

**Guard Implementation:**
- `permission.guard.ts` - Uses System A
- No dedicated guard for System B

---

## 3. PROBLEMS IN CURRENT HRM PERMISSION SYSTEM

### 3.1 Critical Issues

| # | Problem | Impact | Severity |
|---|---------|--------|----------|
| 1 | **Dual permission systems** create conflicts | Admin confusion, inconsistent enforcement | 🔴 HIGH |
| 2 | **No data visibility control** | Users see ALL or NOTHING data | 🔴 HIGH |
| 3 | **Hardcoded role defaults** | Cannot create custom roles | 🔴 HIGH |
| 4 | **No role hierarchy** | Cannot inherit permissions | 🟡 MEDIUM |
| 5 | **Missing OWN DATA scope** | Employee sees everyone's records | 🔴 HIGH |
| 6 | **Inconsistent permission keys** | `employees.create` vs `employees.manage` | 🟡 MEDIUM |
| 7 | **No approval workflow config** | Cannot define approval chains | 🟡 MEDIUM |
| 8 | **Permission page accessible to all** | No admin-only restriction | 🟡 MEDIUM |

### 3.2 Detailed Problem Analysis

#### Problem 1: Dual Permission Systems
**Current State:**
```typescript
// In employee.controller.ts - Mixed usage
await this.checkPermission(req, 'employees.create'); // System B
await this.permissionService.validateAction(roleId, 'employees.manage', tenantId); // System A
```

**Issue:**
- Controllers use both `hrmPermissionService` and `permissionService`
- Different permission keys (`employees.create` vs `employees.manage`)
- Different validation logic
- No single source of truth

#### Problem 2: No Data Visibility Control
**Current State:**
- `view_self` and `view_all` exist only for Attendance module
- No mechanism to filter data by ownership
- Employee can see all employee records if they have `employees.view`

**Missing:**
- Data scope field: `OWN_DATA` vs `ALL_DATA`
- Automatic filtering based on role
- Hierarchical data visibility (Manager sees team data)

#### Problem 3: Hardcoded Role Defaults
**Current State:**
```typescript
// In hrm-permission.service.ts
const defaults = [
  { roleId: 'Employee', permissions: { ... } },
  { roleId: 'HR', permissions: { ... } },
  { roleId: 'Manager', permissions: { ... } },
  { roleId: 'Admin', permissions: { ... } },
];
```

**Issues:**
- Cannot create custom roles
- Cannot modify default role templates
- Role IDs are hardcoded strings

#### Problem 4: No Role Hierarchy
**Current State:**
- Flat role structure
- No parent-child relationships
- No permission inheritance

**Missing:**
```typescript
// Proposed hierarchy
Role: {
  name: string;
  parentRoleId?: string;  // Inherit from parent
  level: number;          // Employee=1, Manager=2, HR=3, Admin=4
}
```

#### Problem 5: Missing OWN DATA Scope
**Current Implementation:**
```typescript
// In HrmPermissionsPage.jsx
const isChecked = (moduleId, colId) => {
  // Only checks boolean permission, not data scope
  return modPerms.view || modPerms.view_all || modPerms.view_self;
};
```

**Required:**
- Data scope dropdown: `OWN_DATA` | `TEAM_DATA` | `DEPARTMENT_DATA` | `ALL_DATA`
- Automatic query filtering in services

#### Problem 6: Permission Page Not Admin-Only
**Current State:**
```javascript
// HrmPermissionsPage.jsx - No access control check
const HRMPermissionsPage = () => {
  // Any user can access this page
};
```

**Required:**
- Route-level guard: `<RequireAdmin>`
- API-level check: `validateAdminAccess()`

---

## 4. CURRENT HRM PERMISSIONS UI ANALYSIS

### 4.1 Current UI Implementation

**File:** `frontend/src/pages/HrmPermissionsPage.jsx`

**Current UI Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ HRM Permissions                  [Role: ▼ Employee]    │
├─────────────────────────────────────────────────────────┤
│ Module         View  Create  Delete  Approve  ...       │
│ ─────────────────────────────────────────────────────── │
│ 👤 Employees   [✓]   [✓]     [✗]    [─]     [─]      │
│ 📅 Leaves      [✓]   [─]     [─]     [✓]     [✓]      │
│ ⏰ Attendance  [✓]   [─]     [─]     [─]     [─]      │
│ 💰 Payroll     [✗]   [─]     [─]     [─]     [─]      │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### 4.2 UI Problems Identified

| # | Problem | Current State | Required |
|---|---------|---------------|----------|
| 1 | **No Data Scope Column** | Only action toggles | Add `Data Scope` dropdown |
| 2 | **Fixed Role Dropdown** | Hardcoded: Employee, HR, Manager, Admin | Dynamic role selector from API |
| 3 | **No Role Management** | Cannot create/edit roles | Add CRUD for roles |
| 4 | **No Permission Presets** | Manual toggling only | Quick presets: "Full Access", "View Only", "Self Only" |
| 5 | **No Column Permissions UI** | Backend supports, frontend doesn't | Column visibility table |
| 6 | **No Inheritance Indicator** | Flat list | Show parent role permissions |
| 7 | **Poor Visual Hierarchy** | Simple table | Grouped modules, expandable sections |
| 8 | **No Audit Trail** | Changes not logged | Show who changed what and when |

### 4.3 Missing UI Components

1. **Role Manager Sidebar**
   - List all roles
   - Create new role button
   - Edit/Delete role actions

2. **Data Scope Selector**
   ```
   Data Scope: [Own Data ▼]
   Options: Own Data | Team Data | Department Data | All Data
   ```

3. **Permission Presets**
   ```
   Quick Apply: [View Only] [Standard Employee] [Manager] [Full Admin]
   ```

4. **Column Visibility Panel**
   ```
   Columns for Employees module:
   ☑ Employee Name    ☑ Department    ☑ Salary
   ☑ Contact          ☑ Join Date     ☑ Actions
   ```

---

## 5. MISSING BACKEND PERMISSION LOGIC

### 5.1 Required Backend Enhancements

#### 1. Data Scope Filtering in Services

**Current State (leave.service.ts):**
```typescript
async findAll(employeeId?, status?, tenantId?, user?) {
  const query: any = {};
  query.tenantId = tid;
  // No user-based filtering!
  return this.leaveModel.find(query);
}
```

**Required:**
```typescript
async findAll(employeeId?, status?, tenantId?, user?, dataScope?) {
  const query: any = {};
  query.tenantId = tid;
  
  // Apply data scope filtering
  switch (dataScope) {
    case 'OWN_DATA':
      query.employeeId = user.employeeId;
      break;
    case 'TEAM_DATA':
      query.employeeId = { $in: user.teamMemberIds };
      break;
    case 'DEPARTMENT_DATA':
      query.departmentId = user.departmentId;
      break;
    case 'ALL_DATA':
      // No additional filter
      break;
  }
  
  return this.leaveModel.find(query);
}
```

#### 2. Role Hierarchy Support

**Missing Schema Addition:**
```typescript
// role.schema.ts
@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: false })
  parentRoleId?: Types.ObjectId;  // Inherit permissions

  @Prop({ default: 1 })
  level!: number;  // 1=Employee, 2=Manager, 3=HR, 4=Admin

  @Prop({ default: false })
  isSystem!: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Permission' }], default: [] })
  permissions!: Types.ObjectId[];
  
  @Prop({ type: Object, default: {} })
  dataScope!: {
    employees: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
    leaves: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
    attendance: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
    payroll: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
  };
}
```

#### 3. Admin-Only Middleware

**Missing:**
```typescript
// decorators/require-admin.decorator.ts
export const RequireAdmin = () => {
  return applyDecorators(
    UseGuards(JwtAuthGuard, TenantGuard, AdminGuard)
  );
};

// guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (user.role === 'Admin' || user.role === 'Super Admin') {
      return true;
    }
    
    throw new ForbiddenException('Admin access required');
  }
}
```

#### 4. Unified Permission System

**Recommendation: Merge into single system**

Migrate all HRM permissions to the granular system (System A):

```typescript
// Deprecate hrm-permission.schema.ts
// Use permission.schema.ts for all HRM permissions

// Update hrm-permission.service.ts to use permission.service.ts
@Injectable()
export class HrmPermissionService {
  constructor(
    private permissionService: PermissionService,  // Use unified system
  ) {}
  
  async checkPermission(roleId: string, action: string): Promise<boolean> {
    return this.permissionService.hasPermission(roleId, action);
  }
}
```

---

## 6. RECOMMENDED RBAC ARCHITECTURE

### 6.1 Unified Permission Model

```typescript
// Single source of truth
interface Permission {
  key: string;              // 'employees.view'
  name: string;             // 'View Employees'
  module: string;           // 'employees'
  action: string;           // 'view'
  description: string;
}

interface Role {
  id: string;
  name: string;             // 'HR Manager'
  description: string;
  level: number;            // 1-4 (for hierarchy)
  parentRoleId?: string;     // Inheritance
  isSystem: boolean;        // Cannot delete
  permissions: string[];    // Permission keys
  dataScope: {
    [module: string]: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
  };
  columnPermissions: {
    [module: string]: string[];  // Visible columns
  };
}
```

### 6.2 Role Hierarchy Levels

```
Level 4: Admin (Super Admin, Admin)
         ↓ inherits from
Level 3: HR (HR Manager, HR Executive)
         ↓ inherits from
Level 2: Manager (Department Manager, Team Lead)
         ↓ inherits from
Level 1: Employee (Standard Employee, Contractor)
```

### 6.3 Data Scope Matrix

| Role Level | Default Scope | Can Override To |
|------------|---------------|-----------------|
| Employee   | OWN_DATA      | - |
| Manager    | TEAM_DATA     | OWN_DATA |
| HR         | ALL_DATA      | DEPARTMENT_DATA, TEAM_DATA, OWN_DATA |
| Admin      | ALL_DATA      | Any scope |

### 6.4 Permission Actions by Module

```typescript
const HRM_PERMISSIONS = {
  employees: ['view', 'create', 'edit', 'delete', 'export', 'assign'],
  leaves: ['view', 'apply', 'edit', 'delete', 'approve', 'reject', 'export'],
  attendance: ['view', 'checkin', 'checkout', 'edit', 'delete', 'manage', 'export'],
  payroll: ['view', 'create', 'edit', 'delete', 'generate', 'approve', 'export'],
  increments: ['view', 'create', 'edit', 'delete', 'approve', 'export'],
  departments: ['view', 'create', 'edit', 'delete', 'assign', 'export'],
};
```

---

## 7. RECOMMENDED HRM PERMISSION UI LAYOUT

### 7.1 New UI Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ HRM Role Permissions                                    [+ New Role] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│ │ ROLES        │  │ PERMISSION CONFIGURATION                      │ │
│ │              │  │                                               │ │
│ │ ⚪ Employee  │  │ Selected Role: HR Manager                     │ │
│ │ 🔵 Manager   │  │ Level: 3 (HR)                                 │ │
│ │ 🟢 HR        │  │ Inherits from: Manager                        │ │
│ │ 🔴 Admin     │  │                                               │ │
│ │              │  │ ───────────────────────────────────────────── │ │
│ │ [+ Create]   │  │ Quick Presets: [View Only] [Standard] [Full]  │ │
│ │              │  │                                               │ │
│ └──────────────┘  │ ┌───────────────────────────────────────────┐ │
│                   │ │ PERMISSION TABLE                          │ │
│                   │ │                                           │ │
│                   │ │ Module    │View│Create│Delete│Appr│DataScope│ │
│                   │ │───────────┼────┼──────┼──────┼────┼────────│ │
│                   │ │ Employees │ ☑  │  ☑   │  ☐   │ ␣  │[ALL▼]  │ │
│                   │ │ Leaves    │ ☑  │  ☑   │  ☐   │ ☑  │[ALL▼]  │ │
│                   │ │ Attendance│ ☑  │  ☐   │  ☐   │ ␣  │[TEAM▼] │ │
│                   │ │ Payroll   │ ☑  │  ☑   │  ☐   │ ☑  │[ALL▼]  │ │
│                   │ │ Increments│ ☑  │  ☑   │  ☐   │ ☑  │[ALL▼]  │ │
│                   │ │ Dept      │ ☑  │  ☑   │  ☐   │ ␣  │[ALL▼]  │ │
│                   │ │           │    │      │      │    │        │ │
│                   │ └───────────────────────────────────────────┘ │
│                   │                                               │ │
│                   │ ┌───────────────────────────────────────────┐ │
│                   │ │ COLUMN VISIBILITY (Expandable)            │ │
│                   │ │ Employees module:                         │ │
│                   │ │ ☑ Name  ☑ Dept  ☑ Role  ☑ Salary  ☑ Join │ │
│                   │ └───────────────────────────────────────────┘ │
│                   │                                               │ │
│                   │ [Cancel]                    [Save Changes]    │ │
│                   └───────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 UI Components Recommendation (shadcn)

```typescript
// Recommended shadcn components
import {
  Select,           // Role selector, Data scope dropdown
  Switch,           // Permission toggles (alternative to checkboxes)
  Checkbox,         // Permission checkboxes
  Table,            // Permission matrix
  Collapsible,      // Expandable column permissions
  Card,             // Role cards
  Badge,            // Role level indicators
  Tabs,             // Module grouping
  Tooltip,          // Permission descriptions
  Dialog,           // Create role modal
  AlertDialog,      // Delete confirmation
} from '@shadcn/ui';
```

### 7.3 Permission Presets

```typescript
const PERMISSION_PRESETS = {
  'view_only': {
    employees: { view: true, create: false, edit: false, delete: false },
    leaves: { view: true, apply: false, approve: false },
    // ... all modules view only
  },
  'standard_employee': {
    employees: { view: true, create: false, edit: false, delete: false },
    leaves: { view: true, apply: true, approve: false },
    attendance: { view: true, checkin: true, checkout: true },
    payroll: { view: true },
    // ...
  },
  'manager': {
    // Manager permissions
  },
  'full_access': {
    // All permissions true
  },
};
```

---

## 8. ADMIN CONTROL SCREEN SPECIFICATIONS

### 8.1 Admin-Only Access Requirements

**Frontend Route Protection:**
```javascript
// routes.js
{
  path: '/hrm/permissions',
  element: (
    <RequireAdmin>
      <HrmPermissionsPage />
    </RequireAdmin>
  ),
}
```

**Backend API Protection:**
```typescript
// hrm-permission.controller.ts
@Controller('hrm/permissions')
@UseGuards(JwtAuthGuard, TenantGuard, AdminGuard)  // Add AdminGuard
export class HrmPermissionController {
  // All routes now require Admin access
}
```

### 8.2 Admin Control Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Role CRUD | Create, edit, delete custom roles | HIGH |
| Permission Matrix | Toggle permissions per role | HIGH |
| Data Scope Control | Set visibility scope per module | HIGH |
| Column Visibility | Configure visible columns per role | MEDIUM |
| Copy Role | Duplicate existing role as template | MEDIUM |
| Import/Export | JSON export/import of role configs | LOW |
| Audit Log | View who changed what permissions | MEDIUM |
| Permission Presets | One-click apply common configurations | HIGH |

### 8.3 Database Schema for New Architecture

```typescript
// Unified role schema
interface Role {
  _id: ObjectId;
  name: string;
  description: string;
  level: number;           // 1=Employee, 2=Manager, 3=HR, 4=Admin
  parentRoleId?: ObjectId; // For inheritance
  isSystem: boolean;     // Cannot delete system roles
  tenantId?: ObjectId;     // Multi-tenant support
  permissions: string[];   // ['employees.view', 'leaves.apply', ...]
  dataScope: {
    employees?: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
    leaves?: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
    attendance?: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
    payroll?: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
    increments?: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
    departments?: 'OWN' | 'TEAM' | 'DEPARTMENT' | 'ALL';
  };
  columnPermissions: {
    [module: string]: string[];  // ['name', 'department', 'salary']
  };
  createdAt: Date;
  updatedAt: Date;
}

// Permission audit log
interface PermissionAuditLog {
  _id: ObjectId;
  roleId: ObjectId;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changedBy: ObjectId;     // Admin user ID
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  timestamp: Date;
}
```

---

## 9. IMPLEMENTATION ROADMAP

### Phase 1: Consolidation (Week 1-2)
1. Deprecate `hrm-permission.schema.ts`
2. Migrate all HRM controllers to use `permission.service.ts`
3. Remove dual permission checks

### Phase 2: Data Scope (Week 3-4)
1. Add `dataScope` field to Role schema
2. Implement data filtering in all HRM services
3. Add data scope column to permission UI

### Phase 3: Role Hierarchy (Week 5-6)
1. Add `parentRoleId` and `level` to Role schema
2. Implement permission inheritance logic
3. Update UI to show hierarchy

### Phase 4: Enhanced UI (Week 7-8)
1. Build new permission matrix UI
2. Add role management sidebar
3. Implement permission presets
4. Add column visibility controls

### Phase 5: Security (Week 9)
1. Add AdminGuard to all permission APIs
2. Remove permission page from non-admin navigation
3. Add audit logging

---

## 10. SUMMARY OF RECOMMENDATIONS

### Immediate Actions Required:

1. **🔴 CRITICAL:** Unify permission systems into single architecture
2. **🔴 CRITICAL:** Implement data scope filtering (OWN_DATA vs ALL_DATA)
3. **🔴 CRITICAL:** Add admin-only access to permission configuration
4. **🟡 HIGH:** Add role hierarchy support
5. **🟡 HIGH:** Create permission presets for quick configuration
6. **🟡 MEDIUM:** Implement column-level permission UI
7. **🟢 LOW:** Add audit logging for permission changes

### Expected Outcomes:

After implementing these recommendations, the Admin will be able to:

1. ✅ Create custom roles beyond the 4 hardcoded roles
2. ✅ Control exactly what each role can see and do per module
3. ✅ Set data visibility scope (own records vs team vs department vs all)
4. ✅ Configure which table columns each role can see
5. ✅ Use permission presets for quick role configuration
6. ✅ View audit trail of permission changes
7. ✅ Define role hierarchy with automatic permission inheritance

---

**Report End**
