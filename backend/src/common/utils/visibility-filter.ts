import { Types } from 'mongoose';

export interface UserWithVisibility {
  _id?: Types.ObjectId;
  id?: string;
  dataScope: 'ALL' | 'ASSIGNED';
  role?: string;
  isSuperAdmin?: boolean;
}

/**
 * Builds visibility filter for database queries
 * @param user - User object with dataScope and role info
 * @param options - Optional configuration
 * @returns Filter object to be spread into query
 * 
 * Security Rules:
 * - SUPER_ADMIN with ALL scope → returns {} (no restriction, sees all tenants)
 * - dataScope = ALL → returns { tenantId } (sees all data in their tenant)
 * - dataScope = ASSIGNED → returns { tenantId, assignedTo } (sees only assigned records)
 * - No user context → returns { tenantId: null } (safest default - returns nothing)
 */
export function buildVisibilityFilter(
  user: UserWithVisibility | null | undefined,
  options?: { allowCrossTenant?: boolean }
): Record<string, any> {
  if (!user) {
    // No user context - return filter that matches nothing
    // This is a security measure to prevent unfiltered queries
    return { tenantId: null };
  }

  // SUPER_ADMIN with ALL scope bypasses all filters (sees everything)
  if (user.isSuperAdmin || user.role?.toLowerCase() === 'superadmin') {
    return {};
  }

  // Admin-like roles with ALL scope see all data in their tenant
  const adminRoles = ['admin', 'manager', 'supervisor'];
  const isAdminLike = adminRoles.includes(user.role?.toLowerCase() || '');
  
  if (user.dataScope === 'ALL' || isAdminLike) {
    // Admin sees all records in their tenant
    // Note: tenantId should be applied separately
    return {};
  }

  // User with ASSIGNED scope only sees assigned records
  const userId = user._id || user.id;
  if (!userId) {
    // No userId but has ASSIGNED scope - safest to return nothing
    return { tenantId: null };
  }

  // Convert string ID to ObjectId if needed
  const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
    ? new Types.ObjectId(userId)
    : userId;

  return { assignedTo: objectId };
}

/**
 * Combines base filter with visibility filter
 * @param baseFilter - Existing query filter
 * @param user - User object with dataScope
 * @returns Combined filter
 */
export function applyVisibilityFilter(
  baseFilter: Record<string, any>,
  user: UserWithVisibility | null | undefined
): Record<string, any> {
  const visibilityFilter = buildVisibilityFilter(user);
  
  // If no visibility restriction, return base filter
  if (Object.keys(visibilityFilter).length === 0) {
    return baseFilter;
  }

  // If base filter has $and, append to it
  if (baseFilter.$and) {
    return {
      ...baseFilter,
      $and: [
        ...baseFilter.$and,
        visibilityFilter
      ]
    };
  }

  // Combine filters with $and
  return {
    $and: [
      baseFilter,
      visibilityFilter
    ]
  };
}

/**
 * Builds complete database query filter including tenant isolation and visibility
 * @param tenantId - The tenant ID to filter by (or undefined for super admin)
 * @param user - User object with dataScope and role info
 * @param additionalFilters - Any additional query filters
 * @returns Complete filter object ready for database query
 * 
 * This is the recommended function to use in service layer methods
 */
export function buildCompleteFilter(
  tenantId: string | Types.ObjectId | undefined,
  user: UserWithVisibility | null | undefined,
  additionalFilters: Record<string, any> = {}
): Record<string, any> {
  // Start with isDeleted filter (soft delete handling)
  const filter: Record<string, any> = { isDeleted: { $ne: true }, ...additionalFilters };

  // SUPER_ADMIN bypasses tenant filtering
  if (user?.isSuperAdmin || user?.role?.toLowerCase() === 'superadmin') {
    // Super admin sees everything, only apply visibility filter if needed
    const visibilityFilter = buildVisibilityFilter(user);
    if (Object.keys(visibilityFilter).length > 0) {
      Object.assign(filter, visibilityFilter);
    }
    return filter;
  }

  // Regular users MUST have tenantId
  if (!tenantId) {
    // No tenant context and not super admin - return filter that matches nothing
    return { tenantId: null, ...filter };
  }

  // Apply tenant filter
  const tenantObjId = typeof tenantId === 'string' && Types.ObjectId.isValid(tenantId)
    ? new Types.ObjectId(tenantId)
    : tenantId;
  filter.tenantId = tenantObjId;

  // Apply visibility filter (assignedTo restriction for ASSIGNED scope)
  const visibilityFilter = buildVisibilityFilter(user);
  if (Object.keys(visibilityFilter).length > 0) {
    // Merge visibility filter directly (it's already an AND condition via assignedTo)
    Object.assign(filter, visibilityFilter);
  }

  return filter;
}

/**
 * Checks if user can access a specific record
 * @param user - User object
 * @param recordAssignedTo - ID of user the record is assigned to
 * @returns boolean
 */
export function canAccessRecord(
  user: UserWithVisibility,
  recordAssignedTo?: Types.ObjectId | string | null
): boolean {
  // SUPER_ADMIN can access everything
  if (user.isSuperAdmin || user.role?.toLowerCase() === 'superadmin') {
    return true;
  }

  // ALL scope users can access everything in their tenant
  if (user.dataScope === 'ALL') {
    return true;
  }

  // ASSIGNED scope users can only access their assigned records
  if (!recordAssignedTo) {
    return false;
  }

  const userId = user._id?.toString() || user.id;
  const assignedToId = typeof recordAssignedTo === 'string'
    ? recordAssignedTo
    : recordAssignedTo?.toString();

  return userId === assignedToId;
}
