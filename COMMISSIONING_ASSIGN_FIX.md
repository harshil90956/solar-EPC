# Commissioning Assignment Fix - Testing Guide

## Problem
Request failure error when trying to assign commissioning to technicians.

## Root Causes Identified
1. Missing `assign` action in commissioning module permissions
2. No bulk assign endpoint for efficient batch assignments
3. Invalid `department` field being sent to backend (not in schema)
4. **Missing `projectIdString` field** - Backend schema requires this field but frontend wasn't sending it

## Fixes Applied

### Backend Changes

#### 1. Added Bulk Assign Endpoint (`backend/src/modules/commissioning/controllers/commissioning.controller.ts`)
   - New endpoint: `PATCH /commissionings/bulk-assign`
   - Accepts: `{ commissioningIds: string[], technicianId: string, technicianName: string }`
   - Returns: Detailed success/failure for each commissioning
   - Uses `edit` permission (since `assign` doesn't exist yet)

#### 2. Updated DTO to Include projectIdString (`backend/src/modules/commissioning/dto/commissioning.dto.ts`)
   - Added `projectIdString?: string` field to `CreateCommissioningDto`
   - Marked as optional with `@IsOptional()` and `@IsString()` validators

#### 3. Fixed Service Layer Priority (`backend/src/modules/commissioning/services/commissioning.service.ts`)
   - Updated `projectIdString` assignment logic
   - Priority order:
     1. `createDto.projectIdString` (from frontend)
     2. `projectId` as string
     3. Empty string fallback
   - Prevents spread operator from overwriting the value

## Fixes Applied

### Backend Changes
1. **Added Bulk Assign Endpoint** (`backend/src/modules/commissioning/controllers/commissioning.controller.ts`)
   - New endpoint: `PATCH /commissionings/bulk-assign`
   - Accepts: `{ commissioningIds: string[], technicianId: string, technicianName: string }`
   - Returns: Detailed success/failure for each commissioning
   - Uses `edit` permission (since `assign` doesn't exist yet)

### Frontend Changes

#### 1. Updated Bulk Assignment Logic (`frontend/src/pages/CommissioningPage.js`)
   - Now uses bulk assign endpoint instead of individual PATCH requests
   - Better error handling with partial success reporting
   - Improved user feedback

#### 2. Added projectIdString to Payload (`frontend/src/pages/CommissioningPage.js`)
   ```javascript
   const projectId = selectedPending.projectId || newForm.projectId;
   
   const payload = {
     ...newForm,
     CommissioningId: selectedPending.CommissioningId,
     projectId: projectId,
     projectIdString: projectId,  // ← ADDED THIS REQUIRED FIELD
     customerName: selectedPending.customerName,
     site: selectedPending.site,
     tasks: getTasksFromSettings().map(t=>({ ... }))
   };
   ```

## How to Test

### Test 1: Single Commissioning Assignment
1. Go to Commissioning page
2. Click on a pending commissioning card/row
3. Select a technician from dropdown
4. Click "Assign" button
5. Expected: Commissioning assigned successfully with status "In Progress"

### Test 2: Bulk Assignment
1. Go to Commissioning page (Table or Kanban view)
2. Select multiple commissionings using checkboxes
3. Click "Assign" button in bulk actions
4. Select department and technician
5. Click "Assign" button
6. Expected: All selected commissionings assigned to technician

### Test 3: Permission Check
1. Login as a user with only "edit" permission (no "assign")
2. Try to assign a commissioning
3. Expected: Should work because code checks `can('assign') || can('edit')`

### Test 4: Error Handling
1. Try to assign with invalid data
2. Expected: Clear error message showing what failed

## API Endpoints

### Create Commissioning (from pending installation)
```http
POST /api/commissionings
Content-Type: application/json

{
  "technicianId": "userId123",
  "technicianName": "John Doe",
  "projectId": "P1234",
  "customerName": "Customer Name",
  "site": "Site Address",
  "scheduledDate": "2026-03-15T10:00:00Z",
  "tasks": [...]
}
```

### Bulk Assign Commissionings (NEW)
```http
PATCH /api/commissionings/bulk-assign
Content-Type: application/json

{
  "commissioningIds": ["id1", "id2", "id3"],
  "technicianId": "userId123",
  "technicianName": "John Doe"
}
```

Response:
```json
{
  "success": true,
  "data": [
    { "commissioningId": "id1", "success": true, "data": {...} },
    { "commissioningId": "id2", "success": false, "error": "Not found" },
    ...
  ]
}
```

### Single Update (still works)
```http
PATCH /api/commissionings/:id
Content-Type: application/json

{
  "technicianId": "userId123",
  "technicianName": "John Doe",
  "status": "In Progress"
}
```

## Important Notes

1. **Permission System**: The `assign` action doesn't exist in the default permission matrix. The workaround is to check `can('assign') OR can('edit')`.

2. **Department Field**: Removed from assignment payload as it's not in the Commissioning schema. If needed, it should be added to the DTO and schema first.

3. **Due Date**: Can be added via `scheduledDate` field if needed.

## Troubleshooting

### If assignment still fails:

1. **Check User Permissions**
   ```javascript
   // In browser console
   const { can } = usePermissions();
   console.log('Can edit:', can('commissioning', 'edit'));
   console.log('Can assign:', can('commissioning', 'assign'));
   ```

2. **Check Backend Logs**
   ```bash
   # Look for these logs:
   [DEBUG] bulkAssign X commissionings to Technician Name by userId
   ```

3. **Verify Database Schema**
   ```javascript
   // Commissioning schema should have:
   {
     technicianId: ObjectId,
     technicianName: String,
     assignedTo: ObjectId,  // Optional
     status: String,        // 'Pending Assign' | 'In Progress' | etc
     // ... other fields
   }
   ```

4. **Test API Directly**
   ```bash
   curl -X PATCH http://localhost:3000/api/commissionings/bulk-assign \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"commissioningIds":["id1","id2"],"technicianId":"tech123","technicianName":"Test Tech"}'
   ```

## Next Steps (Optional Enhancements)

1. **Add `assign` Action to Permission Matrix**
   - Add to feature flags configuration
   - Add to RBAC role definitions
   - Update permission seed scripts

2. **Add Department Field** (if needed)
   - Add to Commissioning schema
   - Add to DTO validators
   - Update UI to display department

3. **Enhanced Reporting**
   - Email notifications on assignment
   - Dashboard widgets for assigned vs pending
   - Technician workload balancing

## Files Modified

1. `backend/src/modules/commissioning/controllers/commissioning.controller.ts`
   - Added `bulkAssign()` method
   
2. `frontend/src/pages/CommissioningPage.js`
   - Updated bulk assign handler to use new endpoint
   - Improved error handling and user feedback

## Verification Checklist

- [ ] Single assignment works
- [ ] Bulk assignment works
- [ ] Error messages are clear
- [ ] Permission checks work correctly
- [ ] Status updates to "In Progress" on assignment
- [ ] Technician name displays correctly
- [ ] No console errors
- [ ] Database records updated correctly
