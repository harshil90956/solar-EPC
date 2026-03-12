# 🔐 First Time Setup - Superadmin Login

## Problem
You're getting **"Invalid email or password"** error because there's no user in the database yet.

## Solution: Create Superadmin User

### Step 1: Start MongoDB
Make sure MongoDB is running on your system:
```bash
# Windows (if MongoDB is installed as service)
net start MongoDB

# Or start manually
mongod
```

### Step 2: Run the Setup Script
Open a **NEW terminal** in your backend folder and run:

```bash
cd backend
npx ts-node scripts/create-superadmin.ts
```

### Step 3: Note the Credentials
The script will output:
```
🎉 Setup Complete!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email:     superadmin@solarios.com
🔑 Password:  SuperAdmin@123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Login to Superadmin Panel
1. Go to `http://localhost:5173/login`
2. Enter the email and password from Step 3
3. Click "Sign In"
4. You'll be redirected to the dashboard

### Step 5: Start Creating Tenants
Now you can:
- ✅ Navigate to Tenants page
- ✅ Click "Create Tenant"
- ✅ Fill in the form
- ✅ Submit - it will work now!

---

## What the Script Does

The `create-superadmin.ts` script:
1. Connects to your MongoDB database
2. Creates a "default" tenant (for platform-level administration)
3. Creates a superadmin user with:
   - Email: `superadmin@solarios.com`
   - Password: `SuperAdmin@123`
   - Role: Super Admin
   - Data Scope: ALL (can see all tenants)
4. Saves to database

---

## Troubleshooting

### Error: "connect ECONNREFUSED ::1:27017"
**MongoDB is not running!** Start MongoDB first:
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### Error: "Superadmin user already exists"
This means you've already created the superadmin. Just use the credentials:
- Email: `superadmin@solarios.com`
- Password: `SuperAdmin@123`

### Still Getting "Invalid email or password"
1. Make sure you're using the exact credentials from the script output
2. Check if you have multiple MongoDB databases
3. Verify the `.env` file in backend has correct `MONGODB_URI`

---

## Alternative: Create via API

If the script doesn't work, you can create a user manually using Postman/curl:

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@solarios.com",
    "password": "SuperAdmin@123",
    "name": "Super Admin",
    "role": "Super Admin",
    "isSuperAdmin": true
  }'
```

But the script is easier! 🚀

---

## Quick Reference

| What | Value |
|------|-------|
| **Login URL** | `http://localhost:5173/login` |
| **Default Email** | `superadmin@solarios.com` |
| **Default Password** | `SuperAdmin@123` |
| **Setup Script** | `npx ts-node scripts/create-superadmin.ts` |

---

**Next:** After logging in successfully, go to Tenants page and create your first tenant! 🎉
