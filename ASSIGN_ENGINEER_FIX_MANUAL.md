# Fix Assign Engineer Functionality - MANUAL STEPS

## Problem
When selecting an engineer and clicking "Start Survey", the survey is not being assigned properly.

## Root Cause
- Frontend dropdown sends engineer NAME (not ID)
- Backend needs to receive `assignedTo` field (engineer user ID)
- Backend also needs to save both `engineer` (name) and `assignedEngineerId` (for filtering)

---

## ✅ COMPLETED CHANGES:

### 1. Frontend Dropdown - SiteSurveyPage.js Line 933
**DONE:** Changed from `value={fullName}` to `value={emp._id}`

✅ **Verified:** Dropdown now returns engineer ID

---

## ⚠️ REMAINING MANUAL FIXES:

### 2. Frontend Form Submission - SiteSurveyPage.js Line 893

**Current:**
```javascript
<Button onClick={() => onSubmit({ 
  engineer: formData.engineer, 
  solarConsultant: formData.engineer, 
  scheduledDate: formData.surveyDate, 
  notes: formData.notes, 
  activeData: { assignedAt: new Date().toISOString(), scheduledDate: formData.surveyDate } 
})}
```

**Change To:**
```javascript
<Button onClick={() => onSubmit({ 
  assignedTo: formData.engineer,  // ← ADD THIS (engineer user ID)
  engineer: engineerLabel ? `${engineerLabel.firstName} ${engineerLabel.lastName}` : '',  // ← Keep engineer name
  solarConsultant: formData.engineer, 
  scheduledDate: formData.surveyDate, 
  notes: formData.notes, 
  activeData: { assignedAt: new Date().toISOString(), scheduledDate: formData.surveyDate } 
})}
```

**File:** `frontend/src/pages/SiteSurveyPage.js`  
**Line:** 893

---

### 3. Backend DTO - site-survey.dto.ts

**Add after line 165 (after `engineer` field in CreateSiteSurveyDto):**

```typescript
@IsString()
@IsOptional()
assignedTo?: string; // Engineer user ID for filtering
```

**File:** `backend/src/modules/survey/dto/site-survey.dto.ts`  
**Location:** After line 165

---

### 4. Backend Service - moveToActive Method

**File:** `backend/src/modules/survey/services/site-surveys.service.ts`  
**Lines:** 233-245

**Current:**
```typescript
const updatedSurvey = await this.surveyModel.findOneAndUpdate(
  { $or: [{ _id: id }, { surveyId: id }] },
  {
    status: SurveyStatus.ACTIVE,
    activeData: {
      ...moveDto.activeData,
      startedAt: new Date()
    },
    notes: moveDto.notes || survey.notes,
    updatedAt: new Date()
  },
  { new: true }
).exec();
```

**Change To:**
```typescript
const updatedSurvey = await this.surveyModel.findOneAndUpdate(
  { $or: [{ _id: id }, { surveyId: id }] },
  {
    status: SurveyStatus.ACTIVE,
    engineer: moveDto.engineer || survey.engineer,  // ← Save engineer name
    assignedEngineerId: moveDto.assignedTo || survey.assignedEngineerId,  // ← Save engineer ID
    activeData: {
      ...moveDto.activeData,
      startedAt: new Date()
    },
    notes: moveDto.notes || survey.notes,
    updatedAt: new Date()
  },
  { new: true }
).exec();
```

---

### 5. Backend MoveToActiveDto - site-survey.dto.ts

**Add after line 264 (in MoveToActiveDto class):**

```typescript
@IsString()
@IsOptional()
engineer?: string;

@IsString()
@IsOptional()
assignedTo?: string;
```

**File:** `backend/src/modules/survey/dto/site-survey.dto.ts`  
**Location:** After line 264 (inside MoveToActiveDto class)

---

## 📋 TESTING CHECKLIST:

### Test 1: Admin Creates Survey
1. Login as admin
2. Go to `/survey`
3. Click "Create Survey"
4. Fill form → Select engineer from dropdown
5. Click "Start Survey"
6. Check console - Should send: `{ assignedTo: "engineer_id_123", engineer: "Jemish Patoliya", ... }`

### Test 2: Database Verification
1. Check MongoDB survey document
2. Should have:
   - `engineer: "Jemish Patoliya"` (name)
   - `assignedEngineerId: "67f3a2b1c4d5e6f7g8h9i0j1"` (user ID)

### Test 3: Engineer Login Filtering
1. Login as Jemish Patoliya (the assigned engineer)
2. Go to `/survey`
3. Should see ONLY surveys where `assignedEngineerId === jemihs.user.id`
4. Should see the survey created in Test 1

### Test 4: Other Engineer Login
1. Login as different engineer (not Jemish)
2. Go to `/survey`
3. Should NOT see the survey assigned to Jemish

### Test 5: UI Display
1. Survey card should show:
   - ✅ `Engineer: Jemish Patoliya` (not "Unassigned")
2. Filter dropdown should work
3. Status badges should be correct

---

## 🎯 EXPECTED RESULT:

### Before Fix:
```
Survey Card:
┌─────────────────────────────┐
│ Client: ABC Corp            │
│ City: Surat                 │
│ Status: Active              │
│ Engineer: Unassigned ❌     │
└─────────────────────────────┘
```

### After Fix:
```
Survey Card:
┌─────────────────────────────┐
│ Client: ABC Corp            │
│ City: Surat                 │
│ Status: Active              │
│ Engineer: Jemish Patoliya ✅│
└─────────────────────────────┘
```

---

## 🔧 WHY THIS WORKS:

1. **Frontend sends engineer ID** (`assignedTo`) instead of just name
2. **Backend saves BOTH fields**:
   - `engineer` = Human-readable name for display
   - `assignedEngineerId` = User ID for secure filtering
3. **Backend filtering works** because it filters by indexed `assignedEngineerId` field
4. **UI displays correctly** because it shows the `engineer` name field

---

## ⚡ QUICK FIX PRIORITY:

1. ✅ **Dropdown value** - DONE (uses emp._id)
2. 🔴 **Form submission** - Add `assignedTo` field
3. 🔴 **Backend DTO** - Add `assignedTo` to CreateSiteSurveyDto
4. 🔴 **Backend Service** - Save `assignedEngineerId` in moveToActive
5. 🔴 **Backend DTO** - Add fields to MoveToActiveDto

**Total Time:** ~10 minutes manual editing
