# Completed Installation → Pending Commissioning Fix

## Problem
When an Installation was marked as "Completed", it did not appear in the "Pending Assign" dropdown in the Commissioning page. Users had to manually create commissioning records, causing completed installations to be forgotten or missed.

## Solution Summary

✅ **Fetches completed installations** automatically  
✅ **Merges with pending commissionings** in dropdown  
✅ **Prevents duplicates** (filters out already-commissioned)  
✅ **Auto-populates** customer and site details  

## Files Modified

### Frontend
- `frontend/src/pages/CommissioningPage.js`
  - Added query to fetch completed installations
  - Updated `pendingCommissionings` to include completed installations
  - Enhanced `createCommissioning` to handle installation data

## How It Works

### Before Fix
```
Installation Completed ❌
    ↓
NOT in Commissioning dropdown
    ↓
User must manually remember to create commissioning
```

### After Fix
```
Installation Completed ✅
    ↓
Automatically fetched
    ↓
Appears in "Pending Assign" dropdown
    ↓
User can assign technician with one click
```

## Data Flow

```javascript
// 1. Fetch completed installations
const { data: CompletedInstallationsRaw=[] } = useQuery({
  queryKey: ['completed-installations'],
  queryFn: async () => {
    const r = await apiClient.get('/installations');
    const all = r.data || [];
    // Filter: Completed AND no commissioning yet
    return all.filter(inst => 
      inst.status === 'Completed' && !inst.commissioningId
    );
  }
});

// 2. Convert to commissioning format
const completedInstallationsAsPending = CompletedInstallationsRaw.map(inst => ({
  _id: inst._id,
  CommissioningId: `PENDING-${inst.installationId}`,
  customerName: inst.customerName,
  site: inst.site,
  projectId: inst.projectId,
  status: 'Pending Assign',
  isFromInstallation: true,
  installationId: inst.installationId,
}));

// 3. Merge with existing pending commissionings
const pendingCommissionings = [
  ...logs.filter(l => l.status === 'Pending' || l.status === 'Pending Assign'),
  ...completedInstallationsAsPending
];

// 4. Show in dropdown
<select>
  {pendingCommissionings.map(inst => (
    <option>{inst.customerName} — {inst.site}</option>
  ))}
</select>
```

## Testing Steps

### Test 1: Completed Installation Appears
1. Go to Installation page
2. Mark an installation as "Completed"
3. Go to Commissioning page
4. Click "+ Assign" button
5. **Expected**: Completed installation appears in dropdown

### Test 2: Assignment Works
1. Select completed installation from dropdown
2. Choose technician
3. Click "Assign"
4. **Expected**: Commissioning created successfully
5. **Expected**: Installation now has `commissioningId`

### Test 3: No Duplicates
1. Complete an installation
2. Create commissioning for it
3. Go back to "+ Assign" dropdown
4. **Expected**: Installation does NOT appear again (already commissioned)

## Dropdown Example

**Before**:
```
Select Pending Commissioning
├─ PENDING-001 (Customer A)
└─ PENDING-002 (Customer B)
```

**After**:
```
Select Pending Commissioning
├─ PENDING-001 (Customer A)          ← Existing pending
├─ PENDING-002 (Customer B)          ← Existing pending
└─ PENDING-INSTALL-003 (Customer C)  ← NEW! From completed installation
```

## Benefits

| Benefit | Description |
|---------|-------------|
| ✅ **No Missed Handoffs** | Completed installations automatically appear |
| ✅ **Faster Workflow** | One-click assignment from dropdown |
| ✅ **Better Tracking** | See what needs commissioning |
| ✅ **Prevents Errors** | Filters out already-commissioned |
| ✅ **Auto-Population** | Customer/site details filled automatically |

## Technical Details

### Key Changes

1. **New Query**: Fetches completed installations
2. **Data Transformation**: Converts installation → commissioning format
3. **Merge Logic**: Combines pending + completed installations
4. **Duplicate Prevention**: Filters by `!commissioningId`

### Dependencies

- `logs`: Existing commissionings data
- `CompletedInstallationsRaw`: New completed installations data
- Both cached with 5-minute stale time

### Performance Impact

- **Minimal**: Only fetches once per 5 minutes
- **Efficient**: Client-side filtering and merging
- **No Extra API Calls**: Uses existing `/installations` endpoint

## Troubleshooting

### Issue: Completed installation not appearing

**Check**:
1. Installation status is "Completed"
2. Installation doesn't have `commissioningId` field
3. Browser console for errors

**Solution**:
```javascript
// In browser console
console.log('Completed installations:', CompletedInstallationsRaw);
console.log('Pending commissionings:', pendingCommissionings);
```

### Issue: Duplicate entries

**Cause**: Installation already has commissioning but still showing

**Solution**: Check if `commissioningId` field is properly set on installation

---

**Status**: ✅ COMPLETE  
**Version**: 1.0  
**Date**: 2026-03-12
