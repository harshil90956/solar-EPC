# Quotation to Project Conversion - Testing Guide

## Implementation Summary

✅ **Backend Implementation Complete**
- Enhanced Project schema with quotation-related fields (leadId, quotationId, items, tax, discount, notes)
- Updated CreateProjectDto with quotation field mappings
- Implemented `createFromQuotation()` service method with full validation
- Added POST `/projects/from-quotation/:quotationId` endpoint
- Automatic item category extraction and project ID generation

✅ **Frontend Implementation Complete**
- Added "Convert to Project" button in QuotationPage modal (visible when status = 'Approved')
- Implemented `handleConvertToProject()` function with API integration
- Row action added for quick conversion from table
- Success toast notifications and automatic navigation to projects page

---

## Test Cases

### Test Case 1: Convert Accepted Quotation to Project

**Precondition:** Quotation status must be "Accepted" or "Approved"

**Steps:**
1. Navigate to Quotations page
2. Find a quotation with status "Accepted" or "Approved"
3. Click "View Quote" or click on the quotation row
4. Modal opens showing quotation details
5. Verify "Convert to Project" button is visible in footer
6. Click "Convert to Project" button

**Expected Result:**
- Toast notification: "Creating project from quotation..."
- API call: `POST /projects/from-quotation/{quotationId}`
- Success toast: "Project created successfully! ID: PRJ-XXXXX"
- Modal closes automatically
- Redirect to Projects page after 1 second
- New project appears in projects list

**Verification:**
```javascript
// Check browser console for successful API call
Request URL: http://localhost:3001/api/projects/from-quotation/{id}
Request Method: POST
Status Code: 201 Created

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "projectId": "PRJ-...",
    "quotationId": "...",
    "leadId": "...",
    "customerName": "Ramesh Joshi",
    "items": [...],
    "value": 850000,
    "status": "Quotation"
  }
}
```

---

### Test Case 2: Duplicate Prevention

**Precondition:** A project already exists for a quotation

**Steps:**
1. Convert a quotation to project (Test Case 1)
2. Note the generated project ID
3. Try to convert the same quotation again
4. Click "Convert to Project" button

**Expected Result:**
- Error toast appears
- Error message: "Project already exists for this quotation (Project ID: PRJ-...)"
- No new project created
- User remains on Quotations page

**API Response:**
```json
{
  "statusCode": 409,
  "message": "Project already exists for this quotation (Project ID: PRJ-...)"
}
```

---

### Test Case 3: Non-Accepted Quotation

**Precondition:** Quotation status is NOT "Accepted" (e.g., Draft, Sent, Rejected)

**Steps:**
1. Find a quotation with status "Draft" or "Sent"
2. Open quotation detail modal
3. Observe the footer buttons

**Expected Result:**
- "Convert to Project" button is NOT visible
- Only "Send to Customer" button is visible (for Draft/Sent)
- User cannot convert non-accepted quotations

**Alternative Test:**
If you manually try to call the API:
```bash
POST /projects/from-quotation/{draft-quotation-id}
```

**Expected API Response:**
```json
{
  "statusCode": 400,
  "message": "Quotation status is 'draft'. Only accepted quotations can be converted to projects"
}
```

---

### Test Case 4: Data Integrity Verification

**Precondition:** Successfully converted quotation to project

**Test Data Example:**
```javascript
// Original Quotation
{
  id: "Q001",
  customerName: "Ramesh Joshi",
  systemSize: 50,
  totalPrice: 850000,
  costPrice: 650000,
  margin: 23.5,
  discount: 5,
  items: [
    { name: "Solar Panel 540Wp", description: "Mono PERC", quantity: 125, unitPrice: 4500, total: 562500 },
    { name: "Inverter 50kW", description: "Three Phase", quantity: 1, unitPrice: 150000, total: 150000 },
    { name: "BOS Kit", description: "Complete set", quantity: 1, unitPrice: 137500, total: 137500 }
  ],
  taxAmount: 153000,
  notes: "Priority customer"
}
```

**Verification Checklist:**

✅ **Customer Information:**
- [ ] Customer name matches: "Ramesh Joshi"
- [ ] Email matches (if present)
- [ ] Mobile number matches (if present)
- [ ] Site address matches customer address

✅ **Financial Data:**
- [ ] Project value = Quotation total (₹8,50,000)
- [ ] Tax amount matches (₹1,53,000)
- [ ] Discount matches (5%)
- [ ] Notes preserved ("Priority customer")

✅ **Items Transfer:**
- [ ] All 3 items copied to project
- [ ] Item names match exactly
- [ ] Quantities match (125, 1, 1)
- [ ] Unit prices match (₹4,500, ₹1,50,000, ₹1,37,500)
- [ ] Total prices match for each item
- [ ] Categories assigned correctly:
  - Solar Panel → "panel"
  - Inverter → "inverter"
  - BOS Kit → "bos" or "accessories"

✅ **References:**
- [ ] leadId copied from quotation
- [ ] quotationId references the original quotation
- [ ] tenantId matches

✅ **Default Values:**
- [ ] Project status = "Quotation" (initial stage)
- [ ] Progress = 0%
- [ ] PM = "TBD" (to be assigned)
- [ ] Start date = today's date

---

### Test Case 5: Empty Items Validation

**Precondition:** Quotation with no items or empty items array

**Steps:**
1. Create/find a quotation with empty items array
2. Manually call the API endpoint

**Expected API Response:**
```json
{
  "statusCode": 400,
  "message": "Quotation has no items. Cannot create project without items"
}
```

---

### Test Case 6: Category Extraction Logic

**Test the automatic category assignment:**

| Item Name | Description | Expected Category |
|-----------|-------------|-------------------|
| Solar Panel 540Wp | Mono PERC | panel |
| Inverter 50kW | Three Phase | inverter |
| Battery Bank | Lithium Ion | battery |
| Mounting Structure | GI Steel | structure |
| DC Cable | 4mm² | cable |
| BOS Kit | Complete | bos |
| Accessories Pack | Misc | accessories |
| Other Item | Random | other |

**Verification:**
Check project.items[].category for each converted item

---

## API Endpoint Reference

### POST `/projects/from-quotation/:quotationId`

**Headers:**
```
Authorization: Bearer {token}
x-tenant-id: {tenantId}
```

**URL Parameters:**
- `quotationId`: Document ID or documentId string

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "65abc...",
    "projectId": "PRJ-K9H2L3M",
    "quotationId": "65abc...",
    "leadId": "65abc...",
    "customerName": "Ramesh Joshi",
    "site": "Customer address",
    "systemSize": 0,
    "status": "Quotation",
    "pm": "TBD",
    "startDate": "2024-01-15",
    "progress": 0,
    "value": 850000,
    "items": [
      {
        "itemId": "ITEM-1705334400000-0",
        "category": "panel",
        "itemName": "Solar Panel 540Wp",
        "quantity": 125,
        "unitPrice": 4500,
        "totalPrice": 562500
      }
    ],
    "tax": 153000,
    "discount": 5,
    "notes": "Priority customer",
    "tenantId": "65abc...",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Quotation with id {id} not found"
}
```

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Quotation status is 'draft'. Only accepted quotations can be converted to projects"
}
```

**OR**
```json
{
  "statusCode": 400,
  "message": "Quotation has no items. Cannot create project without items"
}
```

**409 Conflict:**
```json
{
  "statusCode": 409,
  "message": "Project already exists for this quotation (Project ID: PRJ-...)"
}
```

---

## Database Schema Changes

### Project Collection - New Fields

```typescript
{
  // ... existing fields
  
  leadId: ObjectId;           // NEW - Reference to Lead
  quotationId: ObjectId;      // UPDATED - Now references Document collection
  
  items: [                    // NEW - Quotation items
    {
      itemId: string;
      category: string;       // panel, inverter, battery, etc.
      itemName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }
  ];
  
  tax: number;                // NEW - Tax amount
  discount: number;           // NEW - Discount percentage
  notes: string;              // NEW - Additional notes
}
```

---

## Frontend Integration Points

### Files Modified

1. **frontend/src/pages/QuotationPage.js**
   - Added `useNavigate` import
   - Added `api` client import
   - Added `toast` notification import
   - Added `navigate` hook
   - Created `handleConvertToProject()` function
   - Updated ROW_ACTIONS to call handler
   - Updated modal button onClick handler

### User Flow

```
┌─────────────────────┐
│  Quotations List    │
│                     │
│  [Q001] Approved ✓  │ ← User clicks row
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Quotation Modal    │
│                     │
│  Customer: Joshi    │
│  Value: ₹8.5L       │
│  Status: Approved   │
│                     │
│  [2-Page PDF]       │
│  [Full PDF]         │
│  [Convert to Proj] ← User clicks
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Processing...      │
│  Creating project   │
│  from quotation...  │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Success!           │
│  Project created!   │
│  ID: PRJ-K9H2L3M    │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Projects List      │
│  (auto-navigate)    │
│                     │
│  [PRJ-K9H2L3M] ✓    │ ← New project highlighted
└─────────────────────┘
```

---

## Troubleshooting

### Common Issues

**1. Button not appearing:**
- Check quotation status === 'Approved' (case-sensitive)
- Verify modal is rendering correctly
- Check browser console for errors

**2. API 401 Unauthorized:**
- Token expired or missing
- Check localStorage: `solar_token`
- Re-login if necessary

**3. API 404 Not Found:**
- Quotation ID doesn't exist
- Check if using correct document ID format
- Verify tenant context

**4. API 500 Internal Server Error:**
- Backend server not running
- MongoDB connection issue
- Check backend logs

**5. Project not appearing in list:**
- Check tenant filter
- Verify project was actually created (check database)
- Refresh projects page

---

## Next Steps / Future Enhancements

### Phase 9: Advanced Features (Future)

1. **Automatic System Size Calculation**
   - Calculate from total panel capacity
   - Sum all panel quantities × wattage

2. **Project Template Assignment**
   - Auto-assign project templates based on system size
   - Pre-populate milestones

3. **Team Assignment**
   - Auto-assign PM based on workload
   - Notify team members

4. **Inventory Reservation**
   - Auto-reserve items from inventory
   - Generate procurement requests

5. **Document Migration**
   - Copy all attachments from quotation
   - Link related documents

6. **Notification System**
   - Email notification to PM
   - SMS to customer
   - Dashboard notification

---

## Success Criteria ✅

- [x] Backend API endpoint functional
- [x] Frontend button integrated
- [x] Data transfers correctly
- [x] Duplicate prevention works
- [x] Validation prevents invalid conversions
- [x] Items mapped with categories
- [x] Financial data preserved
- [x] References maintained (leadId, quotationId)
- [x] User experience smooth (toasts, navigation)
- [x] Error handling complete

---

**Implementation Date:** January 2026
**Status:** ✅ COMPLETE - Ready for Production Testing
**Version:** 1.0
