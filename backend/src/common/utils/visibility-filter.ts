import { Types } from 'mongoose';

export interface UserWithVisibility {
  _id?: Types.ObjectId;
  id?: string;
  dataScope: 'ALL' | 'ASSIGNED';
  role?: string;
  isSuperAdmin?: boolean;
  teamMemberIds?: string[]; // For MANAGER role - list of team member IDs
}

/**
 * Role-based visibility rules:
 * - SUPER_ADMIN: All tenants, all data
 * - ADMIN: All data in their tenant
 * - MANAGER: Leads created by team members OR assigned to team members
 * - AGENT: Leads they created OR leads assigned to them
 */

/**
 * Builds visibility filter for database queries based on user role
 * @param user - User object with dataScope, role, and team info
 * @param options - Optional configuration
 * @returns Filter object to be merged into query
 * 
 * Security Rules:
 * - SUPER_ADMIN with ALL scope → returns {} (no restriction, sees all tenants)
 * - ADMIN → returns {} (sees all data in their tenant - tenant filter applied separately)
 * - MANAGER → returns { $or: [{ createdBy: teamMemberIds }, { assignedTo: teamMemberIds }] }
 * - AGENT → returns { $or: [{ createdBy: userId }, { assignedTo: userId }] }
 * - No user context → returns { tenantId: null } (safest default - returns nothing)
 */
export function buildVisibilityFilter(
  user: UserWithVisibility | null | undefined,
  options?: { allowCrossTenant?: boolean }
): Record<string, any> {
  if (!user) {
    // No user context - return filter that matches nothing
    return { tenantId: null };
  }

  // SUPER_ADMIN bypasses all filters (sees everything)
  if (user.isSuperAdmin || user.role?.toLowerCase() === 'superadmin') {
    return {};
  }

  const userRole = user.role?.toLowerCase() || '';
  const userId = user._id || user.id;

  // ADMIN sees all data in their tenant
  if (userRole === 'admin') {
    return {};
  }

  // Convert userId to ObjectId if needed
  const objectId = typeof userId === 'string' && Types.ObjectId.isValid(userId)
    ? new Types.ObjectId(userId)
    : userId;

  if (!objectId) {
    return { tenantId: null };
  }

  // MANAGER sees leads created by team members OR assigned to team members
  if (userRole === 'manager') {
    const teamIds = user.teamMemberIds || [];
    const teamObjectIds: Types.ObjectId[] = teamIds
      .filter(id => Types.ObjectId.isValid(id))
      .map(id => new Types.ObjectId(id));
    
    // Include manager themselves in the team
    if (objectId instanceof Types.ObjectId) {
      teamObjectIds.push(objectId);
    }

    return {
      $or: [
        { createdBy: { $in: teamObjectIds } },
        { assignedTo: { $in: teamObjectIds } }
      ]
    };
  }

  // AGENT sees leads they created OR leads assigned to them
  // Default for any non-admin role with ASSIGNED scope
  if (objectId instanceof Types.ObjectId) {
    return {
      $or: [
        { createdBy: objectId },
        { assignedTo: objectId }
      ]
    };
  }
  
  // Fallback - return nothing if we can't build a valid filter
  return { tenantId: null };
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
 * Checks if user can access a specific record based on role-based rules
 * @param user - User object
 * @param record - The record to check (lead, project, etc.)
 * @param record.assignedTo - ID of user the record is assigned to
 * @param record.createdBy - ID of user who created the record
 * @returns boolean
 */
export function canAccessRecord(
  user: UserWithVisibility,
  record?: {
    assignedTo?: Types.ObjectId | string | null;
    createdBy?: Types.ObjectId | string | null;
    tenantId?: Types.ObjectId | string | null;
  }
): boolean {
  // SUPER_ADMIN can access everything
  if (user.isSuperAdmin || user.role?.toLowerCase() === 'superadmin') {
    return true;
  }

  const userRole = user.role?.toLowerCase() || '';
  const userId = user._id?.toString() || user.id;

  // ADMIN can access everything in their tenant
  if (userRole === 'admin') {
    return true;
  }

  if (!userId || !record) {
    return false;
  }

  const recordAssignedTo = record.assignedTo?.toString();
  const recordCreatedBy = record.createdBy?.toString();

  // MANAGER can access records created by or assigned to team members
  if (userRole === 'manager') {
    const teamIds = user.teamMemberIds || [];
    const teamSet = new Set([...teamIds, userId]);
    
    return teamSet.has(recordAssignedTo || '') || teamSet.has(recordCreatedBy || '');
  }

  // AGENT can access records they created OR records assigned to them
  return recordAssignedTo === userId || recordCreatedBy === userId;
}
