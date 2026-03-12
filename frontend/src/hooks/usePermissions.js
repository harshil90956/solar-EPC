/**
 * Solar OS — usePermissions hook
 * Resolves permissions via the full priority chain:
 *   User Override → Custom Role → Base RBAC → Feature Flag gate
 *
 * Also respects "View As" mode so admin can preview another user's access.
 */
import { useCallback, useMemo } from 'react';
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
    // Use roleId first (custom role id like 'custom_xxx'), fall back to role ('Employee', 'Admin', etc.)
    const roleId = effectiveUser?.roleId || role;
    const userId = effectiveUser?.id ?? null;

    /**
     * can(moduleId, actionId)
     * Full priority chain: User Override → Custom Role → Base RBAC + feature flag gate.
     */
    const can = useCallback((moduleId, actionId) => {
        if (!userId) return hasPermission(roleId, moduleId, actionId);
        return resolvePermission(userId, roleId, moduleId, actionId);
    }, [userId, roleId, hasPermission, resolvePermission]);

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
        role, roleId, user: effectiveUser,
        flags, rbac,
        isViewAs: !!viewAsUserId,
        viewAsUser: viewAsUserId ? enrichedUsers?.find(u => u.id === viewAsUserId) : null,
    };
}

export function useModulePermissions(moduleId) {
    const { can, featureOn, moduleOn, actionOn } = usePermissions();

    const canView = useMemo(() => can(moduleId, 'view'), [can, moduleId]);
    const canCreate = useMemo(() => can(moduleId, 'create'), [can, moduleId]);
    const canEdit = useMemo(() => can(moduleId, 'edit'), [can, moduleId]);
    const canDelete = useMemo(() => can(moduleId, 'delete'), [can, moduleId]);
    const canExport = useMemo(() => can(moduleId, 'export'), [can, moduleId]);
    const canAssign = useMemo(() => can(moduleId, 'assign'), [can, moduleId]);

    const feature = useCallback((featureId) => {
        if (!featureId) return moduleOn(moduleId);
        if (moduleId === 'crm' && featureId === 'csv_import') {
            return featureOn(moduleId, 'import_csv') || featureOn(moduleId, 'csv_import');
        }
        return featureOn(moduleId, featureId);
    }, [featureOn, moduleOn, moduleId]);

    const action = useCallback((actionId) => actionOn(moduleId, actionId), [actionOn, moduleId]);

    return {
        moduleId,
        canView,
        canCreate,
        canEdit,
        canDelete,
        canExport,
        canAssign,
        feature,
        action,
        can,
    };
}

export default usePermissions;
