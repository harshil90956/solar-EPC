# 🎯 Custom Role Permission - Quick Reference

## ✅ What Was Fixed

### Problem
Employee sidebar was blank even with custom role permissions.

### Root Causes
1. ❌ `roleId` not extracted from JWT token
2. ❌ Case-sensitive role matching failed
3. ❌ No debug logging for troubleshooting

### Solutions Applied
1. ✅ Extract `roleId` from JWT payload in AuthContext
2. ✅ Normalize role IDs to lowercase for matching
3. ✅ Add comprehensive console logging

---

## 🚀 Quick Test

### 1. Create Custom Role
```
Settings → Role Builder → Create Custom Role

Name: Sales Executive
Base Role: Sales
Permissions:
  ✅ CRM → view: true
  ✅ Leads → view: true
  ❌ Projects → view: false
```

### 2. Assign to Employee
```
HRM → Employees → Edit Employee
Role: Sales Executive
Save
```

### 3. Login & Verify
```
Login as employee

Expected Sidebar:
✅ Dashboard
✅ Reminders  
✅ CRM
✅ Leads
❌ Projects (hidden)
```

---

## 🔍 Debug Commands

### Check JWT Payload
```javascript
const token = localStorage.getItem('solar_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('roleId:', payload.roleId);
```

### Check User Context
```javascript
const user = JSON.parse(localStorage.getItem('solar_user'));
console.log('User roleId:', user.roleId);
```

### Check Custom Roles
```javascript
const { customRoles } = useSettings();
console.log('Available roles:', Object.keys(customRoles));
```

### Test Permission
```javascript
const { resolvePermission } = useSettings();
const canView = resolvePermission(user.id, user.roleId, 'crm', 'view');
console.log('Can view CRM:', canView);
```

---

## 📊 Expected Console Output

```
[AUTH] Employee JWT payload: { roleId: 'custom_123...', tenantId: '...' }
[AUTH] Employee logged in with roleId: custom_123...

[PERMISSION CHECK] { userId: '...', roleId: 'custom_123...', moduleId: 'crm', actionId: 'view' }
  🔍 Checking custom role: { existsInCustomRoles: true }
  📋 Custom role found: Sales Executive
  Permission value: true for crm view
  ✅ Explicit permission granted

[PERMISSION CHECK] { userId: '...', roleId: 'custom_123...', moduleId: 'project', actionId: 'view' }
  🔍 Checking custom role: { ... }
  📋 Custom role found: Sales Executive
  Permission value: false for project view
  ❌ Explicit permission denied
```

---

## 🐛 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Blank sidebar | roleId missing | Check JWT extraction |
| All modules show | Role is 'Admin' | Verify custom role assigned |
| Some modules missing | Module disabled | Check feature flags |
| Console errors | Custom roles not loaded | Check `/settings` API |

---

## 📁 Modified Files

```
frontend/src/context/
├── AuthContext.js           (+12 lines)
└── SettingsContext.js       (+35 lines)

Documentation/
├── CUSTOM_ROLE_PERMISSION_FIX.md     (Full guide)
└── PERMISSION_QUICK_REF.md          (This file)
```

---

## ✅ Success Checklist

After fix, verify:

- [ ] Employee can login
- [ ] Sidebar shows permitted modules
- [ ] Hidden modules not visible
- [ ] Console logs show permission checks
- [ ] No JavaScript errors
- [ ] Custom role respected

---

**Quick Start:** Run test commands above to verify fix is working!
