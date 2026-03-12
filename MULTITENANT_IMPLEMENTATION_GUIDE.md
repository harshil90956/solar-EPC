# Multi-Tenant System - Complete Implementation Guide

## Overview

Your Solar ERP system now has complete multi-tenant support! This means:
- **Superadmin** can create multiple tenants (companies/organizations)
- Each tenant gets isolated data, users, roles, and permissions
- Tenants cannot see each other's data
- Superadmin has global visibility across all tenants

## Architecture

### Backend Components

#### 1. Tenant Management (`/backend/src/modules/superadmin`)
- **Tenant Schema**: Stores tenant information (name, slug, admin email, plan, limits)
- **Tenant Service**: CRUD operations for tenants
- **Tenant Controller**: REST API endpoints
- **Subscription Service**: Track subscription status and billing

#### 2. Authentication & Authorization
- **User Schema**: Includes `tenantId` field for isolation
- **JWT Strategy**: Extracts `tenantId` from token payload
- **Tenant Guard**: Validates tenant context on each request
- **Permission System**: Tenant-scoped permissions matrix

#### 3. Data Isolation
All major modules include `tenantId` in:
- Schema definitions
- Query filters
- Create operations
- Permission checks

### Frontend Components

#### 1. Auth Context (`/frontend/src/context/AuthContext.js`)
```javascript
// Automatically extracts tenantId from JWT token
const { user, tenantId } = useAuth();
```

#### 2. API Client (`/frontend/src/lib/apiClient.js`)
```javascript
// Auto-injects x-tenant-id header for all requests
apiClient.interceptors.request.use((config) => {
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});
```

#### 3. Tenant Management UI (`/frontend/src/pages/TenantListPage.js`)
- List all tenants
- Create new tenants
- Edit tenant details
- Manage subscriptions
- Activate/suspend tenants

## How It Works

### 1. Superadmin Creates Tenant

```http
POST /api/superadmin/tenants
Content-Type: application/json
Authorization: Bearer <superadmin_token>

{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "companyName": "Acme Corp Pvt Ltd",
  "adminEmail": "admin@acme.com",
  "adminName": "John Doe",
  "adminPassword": "securepassword123",
  "plan": "professional",
  "limits": {
    "maxUsers": 50,
    "maxProjects": 200,
    "maxLeads": 500,
    "storageGB": 20
  }
}
```

**What happens:**
1. Tenant record is created
2. Admin user is automatically created with `tenantId`
3. Default permissions are set up
4. Response includes tenant details

### 2. Admin Logs In

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@acme.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65abc123...",
    "email": "admin@acme.com",
    "role": "Admin",
    "tenantId": "65abc456..."  // ← Tenant ID included
  }
}
```

### 3. All Subsequent Requests

Frontend automatically includes:
```http
Authorization: Bearer <jwt_token>
x-tenant-id: 65abc456...
```

Backend validates:
1. JWT token is valid
2. `tenantId` in token matches header
3. User has permissions for the action
4. All queries filter by `tenantId`

## Tenant Isolation Examples

### Projects Module
```typescript
// Backend service automatically filters by tenantId
async findAll(tenantCode: string, user?: UserWithVisibility) {
  const tenantId = await this.getTenantId(tenantCode);
  const query = { tenantId, isDeleted: false };
  
  // Apply user-specific visibility
  if (user?.dataScope === 'ASSIGNED') {
    query.assignedTo = user._id;
  }
  
  return this.projectModel.find(query).exec();
}
```

### Frontend Usage
```javascript
// No need to manually pass tenantId - it's automatic!
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: () => api.get('/projects'),  // ← tenantId auto-injected
});
```

## Key Features

### ✅ Implemented

1. **Tenant CRUD Operations**
   - Create tenants with admin user
   - Update tenant details
   - Suspend/activate tenants
   - Delete tenants (with cascade)

2. **User Isolation**
   - Users belong to specific tenant
   - Cannot access other tenant's data
   - Role permissions scoped to tenant

3. **Data Isolation**
   - All queries filtered by `tenantId`
   - Cross-tenant access blocked
   - Unique constraints per tenant

4. **Permission System**
   - Custom roles per tenant
   - User overrides per tenant
   - Permission caching for performance

5. **Superadmin Dashboard**
   - Global tenant list
   - Stats and KPIs
   - Subscription management
   - Bulk operations

### 🚧 To Be Completed (UI Level)

1. **Tenant-Specific Dashboards**
   - Show only tenant data in KPIs
   - Filter reports by tenant
   - Tenant branding/logo

2. **Subscription Management**
   - Plan upgrades/downgrades
   - Usage tracking
   - Billing history
   - Automated renewals

3. **Resource Limits Enforcement**
   - Block creation when limits reached
   - Warning notifications
   - Soft/hard limit options

## Database Schema Highlights

### Tenant Schema
```typescript
{
  name: string;           // Unique tenant name
  slug: string;           // URL-friendly identifier
  companyName: string;
  adminEmail: string;
  adminName: string;
  status: 'active' | 'pending' | 'suspended' | 'expired';
  plan: 'free' | 'basic' | 'professional' | 'enterprise';
  limits: {
    maxUsers: number;
    maxProjects: number;
    maxLeads: number;
    storageGB: number;
  };
  settings: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
  };
}
```

### User Schema (with tenant isolation)
```typescript
{
  email: string;
  passwordHash: string;
  role: string;
  tenantId: ObjectId;     // ← Links to Tenant
  isSuperAdmin: boolean;
  isActive: boolean;
  dataScope: 'ALL' | 'ASSIGNED';
}
```

## Security Measures

1. **JWT Validation**
   - Token includes `tenantId` claim
   - Validated on every request
   - Cannot be tampered

2. **Header Enforcement**
   - `x-tenant-id` header required
   - Must match JWT `tenantId`
   - Blocked if mismatched

3. **Query Isolation**
   - All queries include `tenantId`
   - Cannot query across tenants
   - Indexes on `tenantId` for performance

4. **Permission Boundaries**
   - Permissions scoped to tenant
   - Custom roles per tenant
   - No cross-tenant permission inheritance

## Testing Multi-Tenancy

### Test Scenario 1: Tenant Isolation
```bash
# Login as Admin of Tenant A
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tenant-a.com","password":"password"}'

# Try to access Tenant B's data (should fail)
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer <tenant_a_token>"
# Result: Empty array or 403 Forbidden
```

### Test Scenario 2: Superadmin Access
```bash
# Login as Superadmin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@solar.com","password":"password"}'

# Access all tenants
curl -X GET http://localhost:3000/api/superadmin/tenants \
  -H "Authorization: Bearer <superadmin_token>"
# Result: List of all tenants
```

## Migration Guide for Existing Data

For existing data without `tenantId`:

```typescript
// Script to add default tenantId to existing records
await db.projects.updateMany(
  { tenantId: { $exists: false } },
  { $set: { tenantId: defaultTenantId } }
);
```

## Best Practices

1. **Always use tenant context**
   ```typescript
   // ✅ Good
   const projects = await projectModel.find({ tenantId }).exec();
   
   // ❌ Bad - no tenant filter
   const projects = await projectModel.find().exec();
   ```

2. **Validate tenant existence**
   ```typescript
   const tenant = await this.getTenantId(tenantCode);
   // Throws NotFoundException if not found
   ```

3. **Use guards consistently**
   ```typescript
   @UseGuards(JwtAuthGuard, TenantGuard)
   @Get()
   findAll(@Req() req) {
     // Tenant automatically validated
     return this.service.findAll(req.tenant.id);
   }
   ```

4. **Frontend: Never hardcode tenantId**
   ```javascript
   // ✅ Good - uses context
   const { tenantId } = useAuth();
   
   // ❌ Bad - hardcoded
   const tenantId = 'solarcorp';
   ```

## Troubleshooting

### Issue: "Tenant not found" error
**Solution:** Check that:
1. JWT token includes `tenantId`
2. `x-tenant-id` header is sent
3. Tenant exists in database

### Issue: No data returned
**Solution:** Verify:
1. User's `tenantId` matches data's `tenantId`
2. User has correct permissions
3. Data was created with proper `tenantId`

### Issue: Can see other tenant's data
**Solution:** Critical! Check:
1. All queries have `tenantId` filter
2. Guards are applied to all routes
3. No global queries without tenant filter

## Next Steps

1. **Complete UI Integration**
   - [ ] Update all dashboards to show tenant-specific data
   - [ ] Add tenant selector for superadmin
   - [ ] Implement subscription tracking UI

2. **Performance Optimization**
   - [ ] Add composite indexes on `{tenantId, createdAt}`
   - [ ] Implement tenant-level caching
   - [ ] Query optimization for large tenants

3. **Advanced Features**
   - [ ] Tenant customization (branding, themes)
   - [ ] Cross-tenant reporting (superadmin only)
   - [ ] Automated backups per tenant
   - [ ] Usage analytics and alerts

## Support

For issues or questions:
- Check backend logs for tenant validation errors
- Verify JWT payload includes `tenantId`
- Ensure frontend stores tenantId correctly
- Review permission matrix for user's role

---

**Status:** ✅ Backend Complete | 🟡 Frontend Partial | 📋 Testing Pending

