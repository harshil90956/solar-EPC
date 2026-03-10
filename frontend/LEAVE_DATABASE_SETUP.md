# 🗄️ Leave Management - Database Setup Guide

## Overview
This guide explains the database structure and how to set up/populate data for the Leave Management system.

---

## 📊 MongoDB Collections

### 1. **Leaves Collection**
Primary collection for storing leave requests.

```javascript
// Collection: leaves
{
  _id: ObjectId("66e8f1234567890abcdef123"),
  employeeId: ObjectId("65f7a1234567890abcdef456"),
  leaveType: "paid",
  startDate: ISODate("2026-03-15T00:00:00Z"),
  endDate: ISODate("2026-03-17T00:00:00Z"),
  days: 3,
  reason: "Family vacation",
  status: "pending",
  approvedBy: ObjectId("65abc1234567890abcdef789"),
  approvedAt: ISODate("2026-03-10T14:30:00Z"),
  rejectionReason: "",
  tenantId: ObjectId("65def1234567890abcdef012"),
  createdAt: ISODate("2026-03-09T10:00:00Z"),
  updatedAt: ISODate("2026-03-10T14:30:00Z")
}
```

### 2. **Employees Collection**
Referenced by `leaves.employeeId`

```javascript
// Collection: employees
{
  _id: ObjectId("65f7a1234567890abcdef456"),
  employeeId: "EMP001",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@company.com",
  department: "Engineering",
  designation: "Senior Developer",
  joiningDate: ISODate("2025-01-15T00:00:00Z"),
  status: "active",
  tenantId: ObjectId("65def1234567890abcdef012"),
  createdAt: ISODate("2025-01-15T09:00:00Z"),
  updatedAt: ISODate("2025-01-15T09:00:00Z")
}
```

### 3. **Users Collection**
Referenced by `leaves.approvedBy`

```javascript
// Collection: users
{
  _id: ObjectId("65abc1234567890abcdef789"),
  firstName: "Manager",
  lastName: "Admin",
  email: "admin@company.com",
  role: "admin",
  tenantId: ObjectId("65def1234567890abcdef012")
}
```

---

## 🔧 Database Setup Scripts

### Create Indexes
```javascript
// MongoDB Shell Commands

// Switch to your database
use solar_epc

// Create indexes for better performance
db.leaves.createIndex({ employeeId: 1, status: 1 })
db.leaves.createIndex({ tenantId: 1, status: 1 })
db.leaves.createIndex({ startDate: 1, endDate: 1 })
db.leaves.createIndex({ createdAt: -1 })

db.employees.createIndex({ tenantId: 1, status: 1 })
db.employees.createIndex({ employeeId: 1 }, { unique: true })
```

---

## 📝 Sample Data Scripts

### 1. Insert Sample Employees
```javascript
db.employees.insertMany([
  {
    _id: ObjectId(),
    employeeId: "EMP001",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@company.com",
    department: "Engineering",
    designation: "Senior Developer",
    joiningDate: new Date("2025-01-15"),
    status: "active",
    tenantId: ObjectId("65def1234567890abcdef012"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    employeeId: "EMP002",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@company.com",
    department: "Marketing",
    designation: "Marketing Manager",
    joiningDate: new Date("2024-06-10"),
    status: "active",
    tenantId: ObjectId("65def1234567890abcdef012"),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    employeeId: "EMP003",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike.johnson@company.com",
    department: "Sales",
    designation: "Sales Executive",
    joiningDate: new Date("2024-03-20"),
    status: "active",
    tenantId: ObjectId("65def1234567890abcdef012"),
    createdAt: new Date(),
    updatedAt: new Date()
  }
])
```

### 2. Insert Sample Leaves
```javascript
// Get employee IDs first
const emp1 = db.employees.findOne({ employeeId: "EMP001" })._id;
const emp2 = db.employees.findOne({ employeeId: "EMP002" })._id;
const emp3 = db.employees.findOne({ employeeId: "EMP003" })._id;
const adminId = db.users.findOne({ role: "admin" })._id;
const tenantId = ObjectId("65def1234567890abcdef012");

// Insert sample leaves
db.leaves.insertMany([
  // Pending Leave
  {
    _id: ObjectId(),
    employeeId: emp1,
    leaveType: "paid",
    startDate: new Date("2026-03-20"),
    endDate: new Date("2026-03-22"),
    days: 3,
    reason: "Family wedding",
    status: "pending",
    tenantId: tenantId,
    createdAt: new Date("2026-03-09"),
    updatedAt: new Date("2026-03-09")
  },
  
  // Approved Leave
  {
    _id: ObjectId(),
    employeeId: emp2,
    leaveType: "sick",
    startDate: new Date("2026-03-15"),
    endDate: new Date("2026-03-17"),
    days: 3,
    reason: "Medical checkup",
    status: "approved",
    approvedBy: adminId,
    approvedAt: new Date("2026-03-10"),
    tenantId: tenantId,
    createdAt: new Date("2026-03-08"),
    updatedAt: new Date("2026-03-10")
  },
  
  // Rejected Leave
  {
    _id: ObjectId(),
    employeeId: emp3,
    leaveType: "casual",
    startDate: new Date("2026-03-25"),
    endDate: new Date("2026-03-27"),
    days: 3,
    reason: "Personal work",
    status: "rejected",
    rejectionReason: "Peak season - insufficient staffing",
    tenantId: tenantId,
    createdAt: new Date("2026-03-07"),
    updatedAt: new Date("2026-03-08")
  },
  
  // Work from Home
  {
    _id: ObjectId(),
    employeeId: emp1,
    leaveType: "work-from-home",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2026-04-05"),
    days: 5,
    reason: "Home renovation work",
    status: "approved",
    approvedBy: adminId,
    approvedAt: new Date("2026-03-09"),
    tenantId: tenantId,
    createdAt: new Date("2026-03-05"),
    updatedAt: new Date("2026-03-09")
  },
  
  // Emergency Leave
  {
    _id: ObjectId(),
    employeeId: emp2,
    leaveType: "emergency",
    startDate: new Date("2026-03-12"),
    endDate: new Date("2026-03-13"),
    days: 2,
    reason: "Family emergency",
    status: "approved",
    approvedBy: adminId,
    approvedAt: new Date("2026-03-12"),
    tenantId: tenantId,
    createdAt: new Date("2026-03-12"),
    updatedAt: new Date("2026-03-12")
  }
])
```

---

## 🔍 Useful Query Examples

### Get All Pending Leaves
```javascript
db.leaves.find({ status: "pending", tenantId: ObjectId("65def...") })
```

### Get Leaves for Specific Employee
```javascript
const empId = db.employees.findOne({ employeeId: "EMP001" })._id;
db.leaves.find({ employeeId: empId })
```

### Get Approved Leaves in Date Range
```javascript
db.leaves.find({
  status: "approved",
  startDate: { $gte: new Date("2026-03-01") },
  endDate: { $lte: new Date("2026-03-31") }
})
```

### Count Leaves by Status
```javascript
db.leaves.aggregate([
  { $match: { tenantId: ObjectId("65def...") } },
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Get Leave Summary by Type
```javascript
db.leaves.aggregate([
  { $match: { status: "approved", tenantId: ObjectId("65def...") } },
  { $group: { 
      _id: "$leaveType", 
      totalDays: { $sum: "$days" },
      count: { $sum: 1 }
  }}
])
```

---

## 🔄 Data Migration Scripts

### Migrate Old Leave Data
```javascript
// If you have old leave data without 'days' field
db.leaves.find({ days: { $exists: false } }).forEach(function(leave) {
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  db.leaves.updateOne(
    { _id: leave._id },
    { $set: { days: days, updatedAt: new Date() } }
  );
});
```

### Add TenantId to Old Records
```javascript
const defaultTenant = ObjectId("65def1234567890abcdef012");

db.leaves.updateMany(
  { tenantId: { $exists: false } },
  { $set: { tenantId: defaultTenant } }
);
```

---

## 🧪 Test Data Generation

### Generate 50 Random Leaves
```javascript
// Node.js script
const { MongoClient, ObjectId } = require('mongodb');

async function generateTestData() {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('solar_epc');
  
  const employees = await db.collection('employees').find().toArray();
  const tenantId = new ObjectId("65def1234567890abcdef012");
  
  const leaveTypes = ['paid', 'sick', 'casual', 'earned', 'work-from-home', 'emergency'];
  const statuses = ['pending', 'approved', 'rejected'];
  const reasons = [
    'Family vacation',
    'Medical checkup',
    'Personal work',
    'Wedding ceremony',
    'Religious festival',
    'Family emergency'
  ];
  
  const leaves = [];
  
  for (let i = 0; i < 50; i++) {
    const startDate = new Date(2026, 2, Math.floor(Math.random() * 28) + 1);
    const days = Math.floor(Math.random() * 5) + 1;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days - 1);
    
    const randomEmp = employees[Math.floor(Math.random() * employees.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    const leave = {
      _id: new ObjectId(),
      employeeId: randomEmp._id,
      leaveType: leaveTypes[Math.floor(Math.random() * leaveTypes.length)],
      startDate: startDate,
      endDate: endDate,
      days: days,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      status: randomStatus,
      tenantId: tenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (randomStatus === 'approved') {
      leave.approvedAt = new Date();
      leave.approvedBy = new ObjectId();
    }
    
    if (randomStatus === 'rejected') {
      leave.rejectionReason = 'Insufficient leave balance';
    }
    
    leaves.push(leave);
  }
  
  await db.collection('leaves').insertMany(leaves);
  console.log(`✅ Generated ${leaves.length} test leaves`);
  
  await client.close();
}

generateTestData();
```

---

## 🔐 Security Considerations

### 1. Multi-Tenant Isolation
```javascript
// Always filter by tenantId
db.leaves.find({ 
  tenantId: ObjectId("65def..."),
  status: "pending" 
})
```

### 2. User Permissions
```javascript
// Example: Employee can only see own leaves
db.leaves.find({ 
  tenantId: userTenantId,
  employeeId: userEmployeeId
})

// Manager can see all team leaves
db.leaves.find({ 
  tenantId: userTenantId,
  "employeeId.department": userDepartment
})
```

---

## 📊 Database Performance Tips

### 1. Compound Indexes
```javascript
// Most common query patterns
db.leaves.createIndex({ tenantId: 1, status: 1, startDate: -1 })
db.leaves.createIndex({ employeeId: 1, createdAt: -1 })
```

### 2. Covered Queries
```javascript
// Use projection to return only needed fields
db.leaves.find(
  { status: "pending" },
  { employeeId: 1, leaveType: 1, startDate: 1, endDate: 1 }
)
```

### 3. Aggregation Pipeline
```javascript
// Efficient for complex queries
db.leaves.aggregate([
  { $match: { tenantId: ObjectId("65def..."), status: "approved" } },
  { $lookup: {
      from: "employees",
      localField: "employeeId",
      foreignField: "_id",
      as: "employee"
  }},
  { $unwind: "$employee" },
  { $project: {
      leaveType: 1,
      days: 1,
      "employee.firstName": 1,
      "employee.lastName": 1
  }}
])
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Employees collection has sample data
- [ ] Leaves collection has sample data
- [ ] Indexes are created
- [ ] TenantId is set on all records
- [ ] Foreign key references are valid (employeeId exists in employees)
- [ ] Date fields are proper ISODate format
- [ ] Status values are correct: "pending", "approved", or "rejected"
- [ ] Days calculation is correct
- [ ] Backend API can fetch data
- [ ] Frontend displays data correctly

---

## 🚀 Quick Start Commands

```bash
# 1. Connect to MongoDB
mongo

# 2. Switch to database
use solar_epc

# 3. Check existing data
db.leaves.countDocuments()
db.employees.countDocuments()

# 4. View sample leave
db.leaves.findOne()

# 5. View with employee details (populated)
db.leaves.aggregate([
  { $limit: 1 },
  { $lookup: {
      from: "employees",
      localField: "employeeId",
      foreignField: "_id",
      as: "employee"
  }}
])
```

---

## 📞 Troubleshooting

### No Data Showing?
1. Check if employees exist: `db.employees.find()`
2. Check if leaves exist: `db.leaves.find()`
3. Verify tenantId matches: Check `x-tenant-id` header
4. Check backend logs for errors

### Foreign Key Errors?
- Ensure employeeId in leaves exists in employees collection
- Use `ObjectId()` for IDs, not strings

### Date Issues?
- Use `ISODate()` in MongoDB shell
- Use `new Date()` in JavaScript
- Backend expects ISO 8601 format: "2026-03-15"

---

**Status**: ✅ Ready to Use  
**Last Updated**: March 9, 2026  
**Database**: MongoDB 7.0+
