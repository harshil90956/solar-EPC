# HRM Department Edit Fix

## Issue
Department edit functionality was not working - clicking "Save Changes" had no effect.

## Root Cause
The `departmentApi.update()` function in `hrmApi.js` was missing the data parameter:

```javascript
// BEFORE (BROKEN)
update: (id, data) => apiClient.patch(`/hrm/departments/${id}`),

// AFTER (FIXED)
update: (id, data) => apiClient.patch(`/hrm/departments/${id}`, data),
```

## What Was Fixed
✅ **File:** `frontend/src/services/hrmApi.js` (Line 74)
- Added missing `data` parameter to department update API call
- Now properly sends updated department data to backend

## How It Works Now

### Edit Department Flow:
1. User clicks "Edit" button on a department row
2. Modal opens with pre-filled form data (name, code, description)
3. User modifies any field
4. Clicks "Save Changes" button
5. Frontend calls: `departmentApi.update(id, formData)`
6. PATCH request sent to: `/api/hrm/departments/:id` with updated data in body
7. Backend updates department and returns success
8. Toast notification shows "Department updated successfully"
9. Table refreshes to show updated data

### Backend Endpoint
```typescript
@Patch(':id')
async update(@Param('id') id: string, @Body() updateDto: UpdateDepartmentDto, @Req() req: any) {
  const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || req.query.tenantId;
  const data = await this.departmentService.update(id, updateDto, tenantId, req.user);
  return { success: true, data };
}
```

## Testing
To test the fix:
1. Go to HRM → Departments page
2. Click "Edit" button on any department
3. Change the department name, code, or description
4. Click "Save Changes"
5. Should see success toast and updated data in table

## Related APIs
All other HRM APIs already have correct data parameters:
- ✅ Employee API: `update: (id, data) => apiClient.patch(..., data)`
- ✅ Leave API: `update: (id, data) => apiClient.patch(..., data)`
- ✅ Payroll API: `update: (id, data) => apiClient.patch(..., data)`
- ✅ Increment API: `update: (id, data) => apiClient.patch(..., data)`
- ✅ Attendance API: `update: (id, data) => apiClient.put(..., data)`

## Status
✅ **FIXED** - Department edit and save now working correctly
