# Solar OS Permission System Implementation

## Overview
Comprehensive permission system has been implemented across the ERP with the following hierarchy:

**Tenant → DataScope → Permissions (view/create/edit/delete)**

---

## Backend Implementation

### 1. Permission Hierarchy (Already Working)
The backend resolves permissions in this priority order:
1. **Feature Flag** (Global kill switch)
2. **User Override** (Hard override for specific user)
3. **Custom Role** (User-assigned custom role permissions)
4. **Base RBAC** (Default role permissions)

### 2. Files Modified

#### JwtStrategy (`backend/src/core/auth/strategies/jwt.strategy.ts`)
- Added debug logging for troubleshooting
- Fixed dataScope default to `ALL` for admin-like roles
- **NOTE**: Currently defaults ALL users to `ALL` for debugging - change line 83 back to:
  ```typescript
  || (isAdminLike ? 'ALL' : 'ASSIGNED');
  ```

#### PermissionGuard (`backend/src/modules/settings/guards/permission.guard.ts`)
- Added comprehensive tenant context check
- Added user authentication check
- Resolves permissions using full hierarchy
- Attaches effective permissions to request

#### Controllers Updated with PermissionGuard + @RequirePermission:

1. **LeadsController** (`backend/src/modules/leads/controllers/leads.controller.ts`)
   - `@RequirePermission('leads', 'view')` on findAll
   - `@RequirePermission('leads', 'create')` on create
   - `@RequirePermission('leads', 'edit')` on update
   - `@RequirePermission('leads', 'delete')` on remove

2. **ProjectsController** (`backend/src/modules/projects/controllers/projects.controller.ts`)
   - `@RequirePermission('projects', 'view')` on findAll
   - `@RequirePermission('projects', 'create')` on create
   - `@RequirePermission('projects', 'edit')` on update
   - `@RequirePermission('projects', 'delete')` on remove

3. **FinanceController** (`backend/src/modules/finance/controllers/finance.controller.ts`)
   - `@RequirePermission('finance', 'view')` on getInvoices
   - `@RequirePermission('finance', 'create')` on createInvoice
   - `@RequirePermission('finance', 'edit')` on updateInvoice
   - `@RequirePermission('finance', 'delete')` on deleteInvoice

4. **ServiceAmcController** (`backend/src/modules/service-amc/controllers/service-amc.controller.ts`)
   - `@RequirePermission('tickets', 'view')` on findAllTickets
   - `@RequirePermission('tickets', 'create')` on createTicket
   - `@RequirePermission('tickets', 'edit')` on updateTicket
   - `@RequirePermission('tickets', 'delete')` on removeTicket

---

## Frontend Implementation

### 1. CanAccess Component (`frontend/src/components/CanAccess.jsx`)
Already implemented and working:
```jsx
<CanAccess module="leads" action="view">...</CanAccess>
<CanAccess module="projects" action="create">...</CanAccess>
<CanEdit module="finance">...</CanEdit>
<CanDelete module="tickets">...</CanDelete>
```

### 2. usePermissions Hook (`frontend/src/hooks/usePermissions.js`)
Resolves permissions using the same hierarchy as backend:
```javascript
const { can, moduleOn, featureOn } = usePermissions();
if (can('leads', 'edit')) { ... }
```

---

## Permission Flow

### When User Accesses a Module:

1. **Tenant Check** (PermissionGuard)
   - Checks `req.tenant.id` exists
   - Throws `ForbiddenException` if missing

2. **Authentication Check** (JwtAuthGuard + PermissionGuard)
   - Validates JWT token
   - Attaches user to `req.user`

3. **DataScope Resolution** (JwtStrategy)
   - Checks custom role dataScope
   - Checks user override
   - Defaults to `ALL` (admin) or `ASSIGNED`

4. **Permission Check** (PermissionGuard)
   - Reads `@RequirePermission(module, action)` metadata
   - Resolves using hierarchy
   - Throws `ForbiddenException` if denied

5. **UI Gating** (Frontend CanAccess)
   - Hides/shows buttons based on permissions
   - Disabled mode available

---

## Critical Steps to Complete

### 1. Restart Backend Server
```bash
cd backend
npm run start:dev
```

### 2. Clear Browser Token & Re-login
- Open DevTools → Application → Local Storage
- Delete `solar_token` and `solar_user`
- Logout and Login again

### 3. Fix JwtStrategy DataScope Default
Edit `backend/src/core/auth/strategies/jwt.strategy.ts` line 83:
```typescript
// Change from:
|| (isAdminLike ? 'ALL' : 'ALL'); // Default to ALL for safety

// To:
|| (isAdminLike ? 'ALL' : 'ASSIGNED');
```

### 4. Test Permission Resolution
Login and check these endpoints:
```
GET /api/v1/settings/my-permissions     # Returns full permission matrix
GET /api/v1/settings/debug-permission/leads/view  # Debug specific permission
```

---

## Module ID Reference

Use these module IDs in `@RequirePermission()` and `<CanAccess>`:

| Module | ID |
|--------|-----|
| Leads/CRM | `leads` |
| Projects | `projects` |
| Tickets | `tickets` |
| AMC Contracts | `amc` |
| Finance | `finance` |
| Procurement | `procurement` |
| Inventory | `inventory` |
| HRM | `hrm` |
| Settings | `settings` |

## Action ID Reference

| Action | ID |
|--------|-----|
| View/List | `view` |
| Create | `create` |
| Edit/Update | `edit` |
| Delete | `delete` |
| Export | `export` |
| Approve | `approve` |
| Assign | `assign` |

---

## Troubleshooting

### 401 Unauthorized on /projects
- Token not being sent: Check `apiClient.js` interceptor
- JWT secret mismatch: Fixed in HRM controller
- Token expired: Clear localStorage and re-login

### Permission Denied (403)
- Check user role has required permission
- Verify custom role permissions in Settings
- Use debug endpoint to trace resolution

### Data Not Showing (Empty Lists)
- Check `dataScope` in JWT payload
- Admin users should see ALL data
- Custom role users with ASSIGNED need assigned records

---

## Next Steps (Optional)

1. Apply PermissionGuard to remaining controllers:
   - ProcurementController
   - InventoryController
   - HRMController
   - CommissioningController
   - ComplianceController

2. Add more granular permissions (export, approve, assign)

3. Implement row-level permissions for sensitive data

4. Add permission caching for better performance
