# 🚀 Leave Management - Developer Quick Start

## 🎯 Get Started in 5 Minutes

This guide helps you understand and work with the Leave Management system quickly.

---

## 📋 Prerequisites

```bash
✅ Node.js 18+ installed
✅ MongoDB 7.0+ running
✅ React 19+ 
✅ NestJS 10+
```

---

## ⚡ Quick Start

### 1. Check Backend is Running
```bash
# Terminal 1: Start backend
cd backend
npm run start:dev

# Should see:
# ✓ NestJS application listening on port 3000
# ✓ Connected to MongoDB
```

### 2. Check Frontend is Running
```bash
# Terminal 2: Start frontend
cd frontend
npm start

# Should see:
# ✓ Compiled successfully!
# ✓ Running on http://localhost:3001
```

### 3. Access Leave Management
```
Open browser: http://localhost:3001
Click: "Leave Management" in sidebar
URL: http://localhost:3001/hrm-leaves
```

---

## 🗂️ File Structure

```
solar-EPC/
├── backend/
│   └── src/
│       └── modules/
│           └── hrm/
│               ├── controllers/
│               │   └── leave.controller.ts    ← API endpoints
│               ├── services/
│               │   └── leave.service.ts       ← Business logic
│               ├── schemas/
│               │   └── leave.schema.ts        ← Database model
│               └── dto/
│                   └── leave.dto.ts           ← Data validation
│
└── frontend/
    └── src/
        ├── pages/
        │   └── LeavesPage.js                  ← Main component
        ├── services/
        │   └── hrmApi.js                      ← API calls
        └── lib/
            └── apiClient.js                   ← HTTP client
```

---

## 🔌 API Endpoints Cheat Sheet

### Base URL
```
http://localhost:3000/api/v1/hrm/leaves
```

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/hrm/leaves` | Get all leaves |
| GET | `/hrm/leaves/:id` | Get single leave |
| POST | `/hrm/leaves` | Create leave |
| PATCH | `/hrm/leaves/:id/approve` | Approve leave |
| PATCH | `/hrm/leaves/:id/reject` | Reject leave |
| GET | `/hrm/leaves/balance/:employeeId` | Get balance |

---

## 💻 Code Examples

### Frontend: Fetch All Leaves
```javascript
import { leaveApi } from '../services/hrmApi';

const fetchLeaves = async () => {
  try {
    const response = await leaveApi.getAll();
    const leaves = response.data?.data || response.data || [];
    setLeaves(leaves);
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to fetch leaves');
  }
};
```

### Frontend: Create Leave
```javascript
const handleApplyLeave = async () => {
  const leaveForm = {
    employeeId: '65f7a1234567890abcdef123',
    leaveType: 'paid',
    startDate: '2026-03-15',
    endDate: '2026-03-17',
    reason: 'Family vacation'
  };
  
  try {
    await leaveApi.create(leaveForm);
    toast.success('Leave application submitted');
    fetchLeaves(); // Refresh
  } catch (error) {
    toast.error('Failed to apply leave');
  }
};
```

### Frontend: Approve Leave
```javascript
const handleApproveLeave = async (leaveId) => {
  try {
    const userId = localStorage.getItem('userId') || 'admin';
    await leaveApi.approve(leaveId, userId);
    toast.success('Leave approved');
    fetchLeaves();
  } catch (error) {
    toast.error('Failed to approve leave');
  }
};
```

### Backend: Service Method
```typescript
async create(dto: CreateLeaveDto, tenantId?: string): Promise<Leave> {
  // Calculate days
  const start = new Date(dto.startDate);
  const end = new Date(dto.endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  // Create leave
  const leave = new this.leaveModel({
    ...dto,
    employeeId: new Types.ObjectId(dto.employeeId),
    days,
    status: LeaveStatus.PENDING,
    tenantId: tenantId ? new Types.ObjectId(tenantId) : undefined
  });

  return leave.save();
}
```

---

## 🗄️ Database Queries

### Insert Sample Employee
```javascript
db.employees.insertOne({
  _id: ObjectId(),
  employeeId: "EMP001",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@company.com",
  department: "Engineering",
  status: "active",
  tenantId: ObjectId("65def1234567890abcdef012"),
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Insert Sample Leave
```javascript
db.leaves.insertOne({
  _id: ObjectId(),
  employeeId: ObjectId("65f7a1234567890abcdef123"),
  leaveType: "paid",
  startDate: new Date("2026-03-15"),
  endDate: new Date("2026-03-17"),
  days: 3,
  reason: "Family vacation",
  status: "pending",
  tenantId: ObjectId("65def1234567890abcdef012"),
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Query All Leaves
```javascript
db.leaves.find().pretty()
```

### Query Pending Leaves
```javascript
db.leaves.find({ status: "pending" }).pretty()
```

### Query with Employee Details
```javascript
db.leaves.aggregate([
  {
    $lookup: {
      from: "employees",
      localField: "employeeId",
      foreignField: "_id",
      as: "employee"
    }
  },
  { $unwind: "$employee" }
])
```

---

## 🐛 Common Issues & Fixes

### Issue 1: No data showing in table
**Cause**: Database is empty  
**Fix**:
```bash
# Check if data exists
mongo
use solar_epc
db.leaves.countDocuments()

# If 0, insert sample data (see Database Setup doc)
```

### Issue 2: API returns 401 Unauthorized
**Cause**: Missing or invalid JWT token  
**Fix**:
```javascript
// Login first to get token
localStorage.setItem('solar_token', 'your-jwt-token-here');
```

### Issue 3: CORS error
**Cause**: Backend not configured for frontend URL  
**Fix**: Add to backend `main.ts`:
```typescript
app.enableCors({
  origin: 'http://localhost:3001',
  credentials: true
});
```

### Issue 4: Employee dropdown empty
**Cause**: No employees in database  
**Fix**:
```bash
# Insert sample employees
db.employees.insertMany([...])
```

### Issue 5: Dates not displaying correctly
**Cause**: Timezone issues  
**Fix**: Ensure dates are in ISO format:
```javascript
// ✅ Correct
startDate: "2026-03-15"

// ❌ Wrong
startDate: "15/03/2026"
```

---

## 🧪 Testing Checklist

### Frontend Tests
```bash
- [ ] Page loads without errors
- [ ] KPI cards show correct numbers
- [ ] Table displays leave records
- [ ] Search filter works
- [ ] Status filter works
- [ ] Calendar displays correctly
- [ ] Apply Leave modal opens
- [ ] Form validation works
- [ ] Leave submission succeeds
- [ ] Approve/Reject buttons work
- [ ] Toast notifications appear
```

### Backend Tests
```bash
- [ ] GET /hrm/leaves returns data
- [ ] POST /hrm/leaves creates record
- [ ] PATCH /hrm/leaves/:id/approve works
- [ ] PATCH /hrm/leaves/:id/reject works
- [ ] Validation rejects invalid data
- [ ] TenantId filter works
- [ ] Employee population works
```

### Database Tests
```bash
- [ ] Leaves collection exists
- [ ] Employees collection exists
- [ ] Indexes created
- [ ] Foreign keys valid
- [ ] TenantId on all records
```

---

## 📊 Sample Data for Testing

### Quick Insert Script
```javascript
// Run in MongoDB shell
use solar_epc

// Insert 1 employee
const empId = ObjectId();
db.employees.insertOne({
  _id: empId,
  employeeId: "EMP001",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  department: "Engineering",
  status: "active",
  tenantId: ObjectId(),
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert 3 leaves
const tenantId = ObjectId();
db.leaves.insertMany([
  {
    _id: ObjectId(),
    employeeId: empId,
    leaveType: "paid",
    startDate: new Date("2026-03-15"),
    endDate: new Date("2026-03-17"),
    days: 3,
    reason: "Vacation",
    status: "pending",
    tenantId: tenantId,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    employeeId: empId,
    leaveType: "sick",
    startDate: new Date("2026-03-20"),
    endDate: new Date("2026-03-21"),
    days: 2,
    reason: "Medical",
    status: "approved",
    approvedAt: new Date(),
    tenantId: tenantId,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    employeeId: empId,
    leaveType: "casual",
    startDate: new Date("2026-03-25"),
    endDate: new Date("2026-03-25"),
    days: 1,
    reason: "Personal",
    status: "rejected",
    rejectionReason: "Insufficient leave balance",
    tenantId: tenantId,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("✅ Sample data inserted!");
```

---

## 🔍 Debugging Tips

### Enable Debug Logs

**Frontend:**
```javascript
// In LeavesPage.js
console.log('[DEBUG] Fetching leaves from API...');
console.log('[DEBUG] Response:', response);
console.log('[DEBUG] Leaves data:', leaves);
```

**Backend:**
```typescript
// In leave.service.ts
console.log('[DEBUG] Query:', query);
console.log('[DEBUG] Found leaves:', leaves.length);
```

### Check Network Requests

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Look for `/hrm/leaves` requests
5. Check request headers, body, response

### Inspect MongoDB Queries

**MongoDB Logs:**
```bash
# Enable profiling
db.setProfilingLevel(2)

# View queries
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty()
```

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| `LEAVE_API_DATA_FLOW.md` | Complete API flow explanation |
| `LEAVE_DATABASE_SETUP.md` | Database schema & setup |
| `LEAVE_SYSTEM_ARCHITECTURE.md` | Full system architecture |
| `LEAVE_MANAGEMENT_V2_COMPLETE.md` | V2.0 features & specs |
| `LEAVE_MANAGEMENT_GUIDE.md` | Complete user guide |
| `LEAVE_MANAGEMENT_TESTING.md` | 106 test cases |
| `LEAVE_MANAGEMENT_QUICK_REF.md` | Quick reference card |

---

## 🎯 Key Concepts

### Leave Types
```javascript
paid           → 🏖️ Paid Leave
sick           → 🏥 Sick Leave
casual         → 📅 Casual Leave
earned         → ⭐ Earned Leave
unpaid         → 📅 Unpaid Leave
work-from-home → 🏠 Work From Home
emergency      → 🚨 Emergency Leave
maternity      → 👶 Maternity Leave
paternity      → 👨‍👶 Paternity Leave
```

### Leave Status
```javascript
pending   → 🟡 Awaiting approval
approved  → 🟢 Approved by manager
rejected  → 🔴 Rejected with reason
```

### Multi-Tenancy
```javascript
// Each tenant has isolated data
tenantId: ObjectId("65def...")

// All queries filtered by tenantId
const query = { tenantId: tenantId, status: "pending" };
```

---

## ⚡ Performance Tips

### Frontend
- Use `useMemo` for filtered data
- Debounce search input
- Lazy load modals
- Cache API responses

### Backend
- Create proper indexes
- Use query projection
- Populate only needed fields
- Implement pagination

### Database
- Index frequently queried fields
- Use compound indexes
- Clean up old data
- Monitor slow queries

---

## 🚀 Production Deployment

### Frontend
```bash
# Build
npm run build

# Deploy to Vercel
vercel --prod

# Or Netlify
netlify deploy --prod
```

### Backend
```bash
# Build
npm run build

# Start production
npm run start:prod

# Or use PM2
pm2 start dist/main.js --name solar-api
```

### Environment Variables

**Frontend `.env`:**
```bash
REACT_APP_API_BASE_URL=https://api.yourdomain.com/api/v1
```

**Backend `.env`:**
```bash
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/solar_epc
JWT_SECRET=your-super-secret-key-here
PORT=3000
NODE_ENV=production
```

---

## 📞 Support

### Issues?
1. Check this guide first
2. Review documentation files
3. Check browser console for errors
4. Check backend logs
5. Verify database has data

### Need Help?
- Documentation: 9 comprehensive guides available
- Code comments: Inline explanations
- Architecture diagram: Visual reference

---

## ✅ Quick Verification

Run this checklist to verify everything is working:

```bash
✓ Backend running on port 3000
✓ Frontend running on port 3001
✓ MongoDB connected
✓ Database has sample data
✓ Can navigate to /hrm-leaves
✓ Table shows leave records
✓ KPI cards display numbers
✓ Calendar displays correctly
✓ Can open Apply Leave modal
✓ Can submit new leave
✓ Can approve/reject leaves
✓ Toast notifications work
✓ No console errors
```

---

## 🎉 You're Ready!

The Leave Management system is fully functional. Start by:

1. **Viewing existing leaves** in the table
2. **Clicking dates** on calendar to filter
3. **Applying a test leave** using the modal
4. **Approving/rejecting** test leaves

Happy coding! 🚀

---

**Last Updated**: March 9, 2026  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
