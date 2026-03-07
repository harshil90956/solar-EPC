import { Types } from 'mongoose';

export interface UserWithVisibility {
  _id?: Types.ObjectId;
  id?: string;
  dataScope: 'ALL' | 'ASSIGNED';
  role?: string;
}

/**
 * Builds visibility filter for database queries
 * @param user - User object with dataScope
 * @returns Filter object to be spread into query
 * 
 * If dataScope = ALL → returns {} (no restriction)
 * If dataScope = ASSIGNED → returns { assignedTo: userId }
 */
export function buildVisibilityFilter(user: UserWithVisibility | null | undefined): Record<string, any> {
  if (!user) {
    // No user context - safest to return empty filter
    return {};
  }

  // Admin with ALL scope sees everything
  if (user.dataScope === 'ALL') {
    return {};
  }

  // User with ASSIGNED scope only sees assigned records
  const userId = user._id || user.id;
  if (!userId) {
    return {};
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
 * Checks if user can access a specific record
 * @param user - User object
 * @param recordAssignedTo - ID of user the record is assigned to
 * @returns boolean
 */
export function canAccessRecord(
  user: UserWithVisibility,
  recordAssignedTo?: Types.ObjectId | string | null
): boolean {
  // ALL scope users can access everything
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
