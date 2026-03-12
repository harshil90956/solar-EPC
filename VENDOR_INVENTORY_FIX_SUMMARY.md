# Vendor Inventory Storage Fix - Summary

## Problem Identified
The Item, Unit, Quantity fields from the "Inventory Stock Entry" form in the Add Vendor modal were not being saved to the `logistics_vendors` database table.

### Root Cause
**Schema Model Conflict**: Both the `Logistics` and `Procurement` modules were registering the same MongoDB model name `'LogisticsVendor'` with different schemas:

1. **Logistics Module** (with inventory fields):
   - File: `backend/src/modules/logistics/schemas/vendor.schema.ts`
   - Had: `itemId`, `itemName`, `unit`, `quantity` fields
   - Marked as required

2. **Procurement Module** (without inventory fields):
   - File: `backend/src/modules/procurement/schemas/vendor.schema.ts`
   - Did NOT have inventory fields
   - Only had basic vendor info

**Issue**: Since Procurement module imported after Logistics, its schema was overwriting the Logistics schema, causing the model to lose the inventory fields. Any data saved would use the Procurement schema (without inventory fields), causing the fields to be ignored.

## Solution Implemented

### 1. Renamed Procurement Module Model Name
**File**: `backend/src/modules/procurement/procurement.module.ts`
```typescript
// BEFORE:
{ name: 'LogisticsVendor', schema: VendorSchema },

// AFTER:
{ name: 'ProcurementVendor', schema: VendorSchema },
```

### 2. Updated Procurement Service Injector
**File**: `backend/src/modules/procurement/services/procurement.service.ts`
```typescript
// BEFORE:
@InjectModel('LogisticsVendor') private vendorModel: Model<VendorDocument>,

// AFTER:
@InjectModel('ProcurementVendor') private vendorModel: Model<VendorDocument>,
```

### 3. Made Inventory Fields Required in DTO
**File**: `backend/src/modules/logistics/dto/create-vendor.dto.ts`
```typescript
// BEFORE:
@IsOptional()
@IsString()
itemId?: string;

// AFTER:
@IsString()
@IsNotEmpty()
itemId!: string;
```

Applied same change to: `itemName`, `unit`, and `quantity` fields to ensure they're validated as required when creating a vendor.

## Result
✅ The `'LogisticsVendor'` model now exclusively uses the Logistics vendor schema with inventory fields
✅ Procurement module uses its own `'ProcurementVendor'` model
✅ Data validation is consistent between frontend and backend
✅ Item, Unit, Quantity will now be properly saved to the database

## Files Modified
1. `backend/src/modules/procurement/procurement.module.ts`
2. `backend/src/modules/procurement/services/procurement.service.ts`
3. `backend/src/modules/logistics/dto/create-vendor.dto.ts`

## Database Schema
No database migration needed - the `logistics_vendors` collection already has the inventory fields defined in the Logistics vendor schema.

## Testing Steps
1. Rebuild backend: `npm run build`
2. Restart backend server
3. Open Logistics page and click "Add Vendor"
4. Fill in all fields including Item, Unit, Quantity
5. Verify data is saved in MongoDB under `logistics_vendors` collection with all inventory fields

## Future Considerations
- Consider completely separating the schemas if Logistics and Procurement vendors have different needs
- Update Procurement schema to include inventory fields if needed for that module
