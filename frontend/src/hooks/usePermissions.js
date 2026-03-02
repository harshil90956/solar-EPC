/**
 * Solar OS — usePermissions hook
 * Resolves permissions via the full priority chain:
 *   User Override → Custom Role → Base RBAC → Feature Flag gate
 *
 * Also respects "View As" mode so admin can preview another user's access.
 */
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export function usePermissions() {
    const { user } = useAuth();
    const {
        isModuleEnabled, isFeatureEnabled, isActionEnabled,
        hasPermission,
        resolvePermission,
        flags, rbac,
        viewAsUserId, enrichedUsers,
    } = useSettings();

    // If "View As" is active, resolve for that user; otherwise current user
    const effectiveUser = viewAsUserId
        ? (enrichedUsers?.find(u => u.id === viewAsUserId) ?? user)
        : user;

    const role = effectiveUser?.role ?? '';
    const userId = effectiveUser?.id ?? null;

    /**
     * can(moduleId, actionId)
     * Full priority chain: User Override → Custom Role → Base RBAC + feature flag gate.
     */
    const can = useCallback((moduleId, actionId) => {
        if (!userId) return hasPermission(role, moduleId, actionId);
        return resolvePermission(userId, role, moduleId, actionId);
    }, [userId, role, hasPermission, resolvePermission]);

    /** featureOn(moduleId, featureId) — sub-feature flag */
    const featureOn = useCallback((moduleId, featureId) =>
        isFeatureEnabled(moduleId, featureId), [isFeatureEnabled]);

    /** moduleOn(moduleId) — top-level module enabled flag */
    const moduleOn = useCallback((moduleId) =>
        isModuleEnabled(moduleId), [isModuleEnabled]);

    /** actionOn(moduleId, actionId) — flag-level action (ignores RBAC) */
    const actionOn = useCallback((moduleId, actionId) =>
        isActionEnabled(moduleId, actionId), [isActionEnabled]);

    return {
        can, featureOn, moduleOn, actionOn,
        role, user: effectiveUser,
        flags, rbac,
        isViewAs: !!viewAsUserId,
        viewAsUser: viewAsUserId ? enrichedUsers?.find(u => u.id === viewAsUserId) : null,
    };
}

export default usePermissions;
