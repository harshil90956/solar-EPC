# Survey Dashboard Engineer Filtering Fix

## Problem
All surveys are visible to every logged-in user. Engineers should only see surveys assigned to them.

## Solution Overview
1. Add `assignedEngineerId` field to survey schema (indexed for performance)
2. Update backend API to filter by user ID when user is not admin
3. Update frontend to send user ID instead of name
4. Ensure stats are calculated from filtered data

---

## Step 1: Update Schema
**File:** `backend/src/modules/survey/schemas/site-survey.schema.ts`

Add this field after the `engineer` field:

```typescript
// Assigned Engineer (name for display)
@Prop({ type: String, default: '' })
engineer!: string;

// Assigned Engineer ID (for filtering and security)
@Prop({ type: String, default: '', index: true })
assignedEngineerId!: string;
```

---

## Step 2: Update Service - Create Method
**File:** `backend/src/modules/survey/services/site-surveys.service.ts`

In the `create()` method, add the assignedEngineerId when creating a survey:

```typescript
async create(createDto: CreateSiteSurveyDto, tenantId?: string): Promise<Survey> {
  
  const surveyData = {
    ...createDto,
    tenantId,
    status: createDto.status || 'pending',
    engineer: createDto.engineer || '',
    assignedEngineerId: createDto.assignedTo || '', // ← ADD THIS LINE
    surveyId: `SUR-${timestamp}-${randomPart}`,
  };
  
  // ... rest of code ...
}
```

---

## Step 3: Update Service - findAll Method (CRITICAL)
**File:** `backend/src/modules/survey/services/site-surveys.service.ts`

Update the `findAll()` method to filter by user ID:

```typescript
async findAll(
  query: QuerySiteSurveyDto,
  userId?: string,
  userRole?: string
): Promise<{ data: any[]; total: number; page: number; limit: number }> {
  const {
    status,
    city,
    engineer,
    search,
    page = 1,
    limit = 25,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = query;

  // Build filter
  const filter: any = {};

  if (status) {
    filter.status = status;
  }

  if (city) {
    filter.city = { $regex: city, $options: 'i' };
  }

  // SECURITY FIX: Filter by engineer ID (not just name)
  if (userId && userRole !== 'admin') {
    // Non-admin users only see surveys assigned to them
    filter.assignedEngineerId = userId;
    console.log('[SiteSurveysService] Filtering by assignedEngineerId:', userId);
  } else if (engineer) {
    // Admin can filter by engineer name
    filter.engineer = { $regex: engineer, $options: 'i' };
  }

  if (search) {
    filter.$or = [
      { clientName: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
      { surveyId: { $regex: search, $options: 'i' } }
    ];
  }

  // ... rest of existing code (pagination, sorting, etc.)
}
```

---

## Step 4: Update Controller
**File:** `backend/src/modules/survey/controllers/site-surveys.controller.ts`

Pass userId and userRole to the service:

```typescript
@Get()
@UseGuards(JwtAuthGuard, TenantGuard)
async findAll(
  @Query() query: QuerySiteSurveyDto,
  @Request() req: any
) {
  // Extract user info from JWT token
  const userId = req.user?.sub || req.user?.id;
  const userRole = req.user?.role;
  
  console.log('[SiteSurveysController] User ID:', userId, 'Role:', userRole);
  
  return this.siteSurveysService.findAll(query, userId, userRole);
}
```

---

## Step 5: Update Frontend API Call
**File:** `frontend/src/pages/SiteSurveyPage.js`

Change from sending engineer NAME to sending engineer ID:

```javascript
const fetchSurveys = useCallback(async () => {
  try {
    setLoading(true);
    const status = activeTab === 'all' ? '' : activeTab;
    
    // Filter by assigned engineer ID - non-admin users only see their assigned surveys
    const engineerIdFilter = (!isAdmin && user?.id) ? user.id : '';
    
    console.log('[SiteSurvey] User ID:', user?.id, '| Is Admin:', isAdmin, '| Engineer ID Filter:', engineerIdFilter);
    
    const response = await siteSurveysApi.getAll({ 
      status, 
      search: searchQuery, 
      engineerId: engineerIdFilter,  // ← Changed from 'engineer' to 'engineerId'
      limit: 100 
    });
    
    console.log('[SiteSurvey] Fetched surveys count:', response.data?.data?.length || 0);
    const surveyData = response.data?.data || response.data || [];
    setSurveys(surveyData);
    
    // Stats are automatically filtered because they're calculated from filtered surveys
    setStats({
      total: surveyData.length,
      pending: surveyData.filter(s => s.status === 'pending').length,
      active: surveyData.filter(s => s.status === 'active').length,
      complete: surveyData.filter(s => s.status === 'complete').length,
    });
    
  } catch (error) {
    console.error('Failed to fetch surveys:', error);
    setSurveys([]);
  } finally {
    setLoading(false);
  }
}, [activeTab, searchQuery, isAdmin, user?.id]); // ← Include user?.id in dependencies
```

---

## Step 6: Update DTO
**File:** `backend/src/modules/survey/dto/site-survey.dto.ts`

Add `assignedEngineerId` to DTOs:

```typescript
export class CreateSiteSurveyDto {
  // ... existing fields ...
  
  @IsString()
  @IsOptional()
  assignedTo?: string; // Engineer ID who will conduct survey
}

export class QuerySiteSurveyDto {
  // ... existing fields ...
  
  @IsString()
  @IsOptional()
  engineerId?: string; // Filter by engineer ID
}
```

---

## Testing

### Test 1: Admin Login
1. Login as admin
2. Go to `/survey`
3. Should see ALL surveys
4. Console shows: `User Role: admin | No engineer ID filter applied`

### Test 2: Engineer Login (Jemish Patoliya)
1. Login as Jemish Patoliya (user ID: abc123)
2. Go to `/survey`
3. Should see ONLY surveys where `assignedEngineerId = "abc123"`
4. Console shows: `Filtering by assignedEngineerId: abc123`

### Test 3: Create Survey with Assignment
1. Admin creates survey → Assigns to "Jemish Patoliya" (ID: abc123)
2. Database saves: `assignedEngineerId: "abc123"`
3. Jemish logs in → Sees the new survey
4. Other engineer logs in → Does NOT see the survey

---

## Security Notes

✅ **Backend Enforcement**: Filtering happens on the server side  
✅ **Indexed Field**: `assignedEngineerId` has database index for performance  
✅ **Role-Based**: Admin sees all, engineers see only theirs  
✅ **JWT Verified**: User ID extracted from authenticated token  

---

## Expected Result

### Engineer Dashboard (Jemish):
```
Total Surveys: 3
Pending: 1
Active: 1
Completed: 1

Grid shows:
✓ Survey A (assigned to Jemish)
✓ Survey B (assigned to Jemish)
✓ Survey C (assigned to Jemish)
```

### Other Engineer Dashboard:
```
Total Surveys: 0
(No surveys assigned)
```

### Admin Dashboard:
```
Total Surveys: 10
(Shows all surveys assigned to all engineers)
```
