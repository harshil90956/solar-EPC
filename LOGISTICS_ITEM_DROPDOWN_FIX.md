# Logistics Item Dropdown Fix - Complete

## Problem Statement
When adding/editing a vendor in the Logistics module, only 3 items were showing in the ITEM NAME dropdown. The requirement was to show ALL items from the Inventory module, with proper handling for:
- Show all active items in dropdown
- When editing, show the currently selected item
- If an item is deleted (soft-deleted), it should not appear in dropdown but vendor should retain the item name

## Root Cause
The LogisticsPage was calling the **wrong API endpoint**:
- ❌ **Was calling**: `/inventory` - Returns only items with stock in warehouses
- ✅ **Should call**: `/items` - Returns ALL item master data regardless of stock

### API Difference

**`/inventory` endpoint:**
```javascript
// Returns inventory records with stock levels
[
  { itemId: 'I001', itemName: '400W Panel', stock: 100, warehouse: 'WH-A' },
  { itemId: 'I002', itemName: '50kW Inverter', stock: 5, warehouse: 'WH-A' },
  // Only items that have stock entries
]
```

**`/items` endpoint:**
```javascript
// Returns ALL item master data
[
  { _id: 'I001', description: '400W Mono PERC Panel', category: 'Panel', unit: 'Nos' },
  { _id: 'I002', description: '50kW String Inverter', category: 'Inverter', unit: 'Nos' },
  { _id: 'I003', description: 'Mounting Structure', category: 'Structure', unit: 'Nos' },
  // All items from item master, regardless of stock
]
```

## Solution Implemented

### 1. Changed API Endpoint (Frontend)
**File:** `frontend/src/pages/LogisticsPage.js`

**Before:**
```javascript
const fetchInventoryItems = async () => {
  const res = await api.get('/inventory', { tenantId });
  // ...
};
```

**After:**
```javascript
const fetchInventoryItems = async () => {
  console.log('[LOGISTICS] Fetching items from /items API with tenantId:', tenantId);
  const res = await api.get('/items', { tenantId });
  console.log('[LOGISTICS] Fetched items from /items API:', items.length, items);
  // ...
};
```

### 2. Preserved Deleted Item Names (Edit Flow)
When editing a vendor, if the originally selected item has been soft-deleted, we now preserve the original item name instead of showing empty.

**File:** `frontend/src/pages/LogisticsPage.js` (Line ~1483)

**Before:**
```javascript
itemName: selectedItem?.description || selectedItem?.name || ''
```

**After:**
```javascript
// Preserve original itemName if item not found (might be deleted)
itemName: selectedItem?.description || selectedItem?.name || editedVendor.itemName || ''
```

### 3. Added Debug Logging
Enhanced console logging for better debugging:
- Logs when fetching items from API
- Logs total count and data returned
- Logs which item is selected during vendor creation
- Logs warnings if no items are returned

### 4. Backend Already Handles Soft Deletes
**File:** `backend/src/modules/items/services/items.service.ts` (Line 44)

The backend already filters out soft-deleted items:
```typescript
async findAll(tenantId: string, user?: UserWithVisibility, search?: string, itemGroupId?: string) {
  const query: any = { tenantId: actualTenantId, isDeleted: false }; // ✅ Excludes deleted items
  // ...
}
```

## How It Works Now

### Scenario 1: Adding a New Vendor
1. User clicks "Add Vendor" button
2. ITEM NAME dropdown calls `/items` API
3. **ALL active items** from Item Master are displayed
4. User selects an item (e.g., "400W Mono PERC Panel")
5. System auto-fills Unit field from item master
6. Vendor is created with selected item details

### Scenario 2: Editing an Existing Vendor
1. User clicks "Edit Vendor" on a vendor record
2. Edit modal opens with pre-filled values
3. ITEM dropdown shows **all active items**
4. **Currently selected item is highlighted** in dropdown
5. User can change to a different item or keep same
6. If saved, vendor item is updated

### Scenario 3: Item Was Soft-Deleted After Vendor Creation
1. Vendor was created with item "ABC Panel" (ID: I001)
2. Later, "ABC Panel" was soft-deleted from Item Master
3. When editing vendor:
   - Dropdown shows **only active items** (I001 NOT in list)
   - But vendor still shows "ABC Panel" as item name
   - User can either:
     - Keep existing (deleted) item - system preserves name
     - Select new active item from dropdown

## Testing Checklist

### ✅ Test Case 1: All Items Show in Dropdown
- [ ] Go to Logistics → Vendors tab
- [ ] Click "Add Vendor"
- [ ] Open ITEM dropdown
- [ ] Verify ALL items from Item Master are listed
- [ ] Count should match items in Inventory module

### ✅ Test Case 2: Edit Shows Current Item
- [ ] Select a vendor with an item assigned
- [ ] Click "Edit Vendor"
- [ ] Verify the assigned item is shown/selected in dropdown
- [ ] Save without changes - should retain same item

### ✅ Test Case 3: Can Change Item on Edit
- [ ] Edit a vendor
- [ ] Change the selected item to a different one
- [ ] Save changes
- [ ] Verify vendor now shows new item

### ✅ Test Case 4: Deleted Items Don't Appear
- [ ] Go to Items module
- [ ] Soft-delete an item
- [ ] Go back to Logistics → Add Vendor
- [ ] Verify deleted item does NOT appear in dropdown

### ✅ Test Case 5: Vendor Retains Deleted Item Name
- [ ] Create vendor with item "X"
- [ ] Delete item "X" from Items module
- [ ] Edit the vendor
- [ ] Verify vendor detail view still shows "Item: X"
- [ ] Dropdown should NOT contain "X"
- [ ] But vendor record preserves the name

## Data Flow

```
┌─────────────────┐
│ Items Module    │
│ (Master Data)   │
│ - 400W Panel    │
│ - 50kW Inverter │
│ - Mounting      │
│ - Cables        │
│ - All items...  │
└────────┬────────┘
         │
         │ GET /items
         │ (All active items)
         ▼
┌─────────────────┐
│ Logistics Page  │
│ Vendor Form     │
│ - Item Dropdown │
│ - Auto-fill     │
└────────┬────────┘
         │
         │ POST /logistics/vendors
         │ (Save with itemId)
         ▼
┌─────────────────┐
│ Vendor Record   │
│ - itemId: I001  │
│ - itemName:     │
│   "400W Panel"  │
│ - quantity: 100 │
└─────────────────┘
```

## Files Modified

1. **frontend/src/pages/LogisticsPage.js**
   - Line ~1303: Changed API from `/inventory` to `/items`
   - Line ~1400: Added debug logging for item selection
   - Line ~1483: Preserve original itemName if item deleted

## Benefits

✅ **Complete Item List**: Users can select from ALL items in Item Master  
✅ **Proper Edit Flow**: Currently selected item shows correctly when editing  
✅ **Soft Delete Handling**: Deleted items don't appear in dropdowns but historical data preserved  
✅ **Better Debugging**: Enhanced console logs help troubleshoot issues  
✅ **Data Integrity**: Vendor records maintain item names even if item is later deleted  

## Notes

- The `/items` endpoint returns item master data (description, category, unit, rate)
- The `/inventory` endpoint returns stock-level data per warehouse
- For vendor creation, we need item master data, not stock levels
- Soft deletes (`isDeleted: true`) automatically filter items from dropdowns
- Historical vendor records preserve item names for audit trail

## Related Modules

- **Items Module**: Master data management (`/items` endpoints)
- **Inventory Module**: Stock tracking per warehouse (`/inventory` endpoints)
- **Logistics Module**: Vendor management with item associations
- **Backend Filter**: `isDeleted: false` ensures only active items shown

---

**Status**: ✅ COMPLETE  
**Date**: March 12, 2026  
**Impact**: All vendors in Logistics module now have access to complete item list

