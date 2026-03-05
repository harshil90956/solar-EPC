# Inventory Flow - Simple Guide

## Stock Movement Logic

### 1. Vendor Delivery (Stock ⬆️ IN/Plus)
**When:** Vendor delivers items to warehouse
**Action:** Stock increases (+)
**API:** `POST /logistics/vendors/:id/delivery`

**Example Flow:**
```
Vendor "V001" delivers 100 Panels
↓
Inventory: Panels +100 (IN transaction)
↓
Stock increases ⬆️
```

### 2. Customer Delivery (Stock ⬇️ OUT/Minus)
**When:** Dispatch marked "Delivered" to customer
**Action:** Stock decreases (-)
**Auto-trigger:** When status changes to "Delivered"

**Example Flow:**
```
Dispatch "DS001" marked Delivered (125 Panels)
↓
Inventory: Panels -125 (OUT transaction)
↓
Stock decreases ⬇️
```

---

## Current Implementation

### Backend Services

**File:** `backend/src/modules/inventory/services/inventory.service.ts`

```typescript
// Add Stock (+) - Called when vendor delivers
addStock(itemName, quantity, reason, referenceId)
→ Creates IN transaction
→ Increases quantity

// Remove Stock (-) - Called when customer receives
removeStock(itemName, quantity, reason, referenceId)
→ Creates OUT transaction  
→ Decreases quantity (checks if enough stock)
```

**File:** `backend/src/modules/logistics/services/logistics.service.ts`

```typescript
// Vendor delivery endpoint calls:
vendorDelivery(vendorId, itemName, quantity)
→ inventoryService.addStock()  [STOCK +]

// Customer delivery auto-calls:
updateStatus(id, "Delivered")
→ inventoryService.removeStock()  [STOCK -]
```

---

## How to Use

### Add Stock (Vendor Delivery)
```bash
POST http://localhost:3000/api/v1/logistics/vendors/V001/delivery
{
  "itemName": "400W Solar Panels",
  "quantity": 100
}
```
**Result:** Inventory increases by 100

### Remove Stock (Customer Delivery)
```bash
PATCH http://localhost:3000/api/v1/logistics/dispatches/DS001/status
{
  "status": "Delivered"
}
```
**Result:** Inventory decreases by dispatch items quantity

---

## Transaction History

Every stock movement is recorded:

```typescript
transactions: [
  { type: "IN",  quantity: 100, reason: "Vendor delivery from V001", date: "..." },
  { type: "OUT", quantity: 125, reason: "Customer delivery - Dispatch DS001", date: "..." },
  { type: "IN",  quantity: 50,  reason: "Vendor delivery from V002", date: "..." }
]
```

---

## Key Points

✅ **Plus (+)** = Vendor adds stock (IN)  
✅ **Minus (-)** = Customer takes stock (OUT)  
✅ Auto-tracked in transaction history  
✅ Low stock alerts when quantity ≤ minStock

## Frontend Usage

1. **Add Vendor Stock:** Go to Logistics → Vendors → Click vendor → "Record Delivery"
2. **Customer Takes Stock:** Go to Logistics → Dispatches → Mark dispatch "Delivered"

Stock automatically updates!
