# Multi-Tenant Quick Start Guide

## 🚀 Step-by-Step Testing

### Step 1: Start Backend Server
```bash
cd backend
npm run start:dev
```

### Step 2: Create First Tenant (Superadmin)

**Option A: Using Postman/cURL**
```bash
curl -X POST http://localhost:3000/api/superadmin/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "companyName": "Acme Corp Pvt Ltd",
    "adminEmail": "admin@acme.com",
    "adminName": "John Doe",
    "adminPassword": "password123",
    "plan": "professional",
    "limits": {
      "maxUsers": 50,
      "maxProjects": 200,
      "maxLeads": 500,
      "storageGB": 20
    },
    "settings": {
      "timezone": "Asia/Kolkata",
      "currency": "INR",
      "language": "en",
      "dateFormat": "DD/MM/YYYY"
    }
  }'
```

**Option B: Using Seed Script** (Recommended for first setup)
Create file: `backend/scripts/create-first-tenant.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantService } from '../src/modules/superadmin/services/tenant.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const tenantService = app.get(TenantService);

  try {
    const tenant = await tenantService.create({
      name: 'Demo Company',
      slug: 'demo',
      companyName: 'Demo Corp',
      adminEmail: 'admin@demo.com',
      adminName: 'Demo Admin',
      adminPassword: 'password123',
      plan: 'basic',
      limits: {
        maxUsers: 10,
        maxProjects: 50,
        maxLeads: 100,
        storageGB: 5,
      },
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
      },
    });

    console.log('✅ Tenant created:', tenant.name);
    console.log('📧 Admin email:', tenant.adminEmail);
    console.log('🔑 Password: password123');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  await app.close();
}

bootstrap();
```

Run it:
```bash
cd backend
npx ts-node scripts/create-first-tenant.ts
```

### Step 3: Login as Tenant Admin

**Frontend:**
1. Go to `http://localhost:3001/login`
2. Email: `admin@acme.com`
3. Password: `password123`
4. Click Login

**Backend Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65abc123...",
    "email": "admin@acme.com",
    "role": "Admin",
    "tenantId": "65abc456..."  // ← This is extracted automatically
  }
}
```

### Step 4: Verify Tenant Isolation

**Login as Admin of Acme Corp:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"password123"}'
```

**Try to create a project:**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_from_above>" \
  -d '{
    "projectId": "PROJ-001",
    "projectName": "Solar Installation",
    "customerName": "Mr. Customer",
    "status": "Lead"
  }'
```

**Now login as different tenant admin and try to access Acme's projects:**
```bash
# Login as Beta Corp admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@beta.com","password":"password123"}'

# Try to get Acme's projects (should return empty or 403)
curl -X GET http://localhost:3000/api/projects \
  -H "Authorization: Bearer <beta_token>"
```

### Step 5: Superadmin Access

**Login as Superadmin:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@solar.com","password":"your_super_password"}'
```

**View all tenants:**
```bash
curl -X GET http://localhost:3000/api/superadmin/tenants \
  -H "Authorization: Bearer <superadmin_token>"
```

**Response:**
```json
{
  "data": [
    {
      "_id": "65abc456...",
      "name": "Acme Corporation",
      "slug": "acme-corp",
      "adminEmail": "admin@acme.com",
      "status": "active",
      "plan": "professional",
      "stats": {
        "totalUsers": 1,
        "totalProjects": 5,
        "totalLeads": 10
      }
    }
  ]
}
```

## 🎯 Frontend Testing

### Add Route for Tenant Management

Update your router (`frontend/src/App.js` or routing file):
```javascript
// Add this route for superadmin only
<Route 
  path="/superadmin/tenants" 
  element={
    <RequireAuth allowedRoles={['Superadmin']}>
      <TenantListPage />
    </RequireAuth>
  } 
/>
```

### Navigate to Tenant Page
```
http://localhost:3001/superadmin/tenants
```

You should see:
- List of all tenants
- Stats cards (Total, Active, Pending, Suspended)
- Add Tenant button
- Edit/Delete/Activate/Suspend actions

## ✅ Verification Checklist

- [ ] Superadmin can create tenants
- [ ] Admin users are auto-created with correct tenantId
- [ ] Tenant admin can login
- [ ] JWT includes tenantId
- [ ] API requests include x-tenant-id header
- [ ] Projects created by Acme cannot be seen by Beta Corp
- [ ] Each tenant sees only their data
- [ ] Superadmin can see all tenants
- [ ] Superadmin can suspend/activate tenants
- [ ] Deleted tenant removes all associated data

## 🔧 Troubleshooting

### Issue: Cannot create tenant
**Check:**
```bash
# Backend logs for errors
tail -f backend/logs/*.log

# Database connection
mongo --eval "db.tenants.find()"

# Check if superadmin user exists
db.users.findOne({ role: 'Superadmin' })
```

### Issue: Can see other tenant's data
**Critical!** Check:
1. All routes have `@UseGuards(JwtAuthGuard)`
2. Service methods filter by `tenantId`
3. Frontend sends correct headers
4. JWT payload includes `tenantId`

### Issue: TenantId is null/undefined
**Solution:**
1. Re-login to refresh token
2. Check JWT decode in AuthContext
3. Verify localStorage has `tenantId`

## 📊 Database Queries

### View all tenants
```javascript
db.tenants.find().pretty()
```

### View tenant with stats
```javascript
db.tenants.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: 'tenantId',
      as: 'users'
    }
  },
  {
    $lookup: {
      from: 'projects',
      localField: '_id',
      foreignField: 'tenantId',
      as: 'projects'
    }
  },
  {
    $project: {
      name: 1,
      slug: 1,
      status: 1,
      plan: 1,
      adminEmail: 1,
      totalUsers: { $size: '$users' },
      totalProjects: { $size: '$projects' }
    }
  }
]).pretty()
```

### Find user by tenant
```javascript
db.users.find({ 
  tenantId: ObjectId("65abc456..."),
  isActive: true 
}).pretty()
```

### Count data per tenant
```javascript
db.projects.aggregate([
  {
    $group: {
      _id: '$tenantId',
      count: { $sum: 1 }
    }
  }
])
```

## 🎨 UI Screenshots Expected

### Tenant List Page
- Grid of tenant cards or table
- Stats at top
- Search and filters
- Action buttons (Edit, Delete, Activate, Suspend)

### Add Tenant Modal
- Form with sections:
  - Basic Info (name, slug, company)
  - Admin Credentials (email, name, password)
  - Subscription (plan, status)
  - Limits (users, projects, leads, storage)
  - Settings (timezone, currency)

## 🚀 Next Steps

After verifying basic functionality:

1. **Create Multiple Tenants**
   ```bash
   # Create several test tenants
   - TechCorp (technology)
   - SolarMax (solar installations)
   - BuildPro (construction)
   ```

2. **Test User Management**
   - Each tenant creates their own users
   - Verify users can't cross tenant boundaries

3. **Test Resource Creation**
   - Projects, Leads, Inventory per tenant
   - Verify isolation

4. **Test Permissions**
   - Custom roles per tenant
   - User-specific overrides

5. **Load Testing**
   - Multiple tenants creating data simultaneously
   - Verify no data leakage

---

**Need Help?**
- Check `MULTITENANT_IMPLEMENTATION_GUIDE.md` for detailed docs
- Review backend logs for tenant validation
- Inspect network tab for headers
- Verify JWT payload structure
