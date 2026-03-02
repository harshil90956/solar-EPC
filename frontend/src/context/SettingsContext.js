/**
 * Solar OS — Settings & Feature Flag Context
 * Central control engine for feature flags, RBAC, custom roles,
 * user-level permission overrides, workflow rules, and audit logs.
 * Permission priority: User Override > Custom Role > Base Role Default
 */
import React, {
    createContext, useContext, useState, useCallback, useMemo, useEffect,
} from 'react';
import {
    buildDefaultFlags,
    buildDefaultRBAC,
    DEFAULT_WORKFLOW_RULES,
    DEFAULT_AUDIT_LOGS,
    MODULE_DEFS,
    ROLE_DEFS,
    ACTION_DEFS,
} from '../config/features.config';
import { PROJECT_TYPE_DEFAULTS } from '../config/projectTypes.config';
import { USERS } from '../data/mockData';

const STORAGE_KEYS = {
    FLAGS: 'solar-os-feature-flags',
    RBAC: 'solar-os-rbac',
    WORKFLOWS: 'solar-os-workflows',
    AUDIT: 'solar-os-audit-logs',
    CUSTOM_ROLES: 'solar-os-custom-roles',
    USER_OVERRIDES: 'solar-os-user-overrides',
    VIEW_AS: 'solar-os-view-as',
    PROJECT_TYPE_CFG: 'solar-os-project-type-cfg',
};

const readStore = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
};
const writeStore = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
};

const SettingsContext = createContext(null);

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyPerms = () =>
    Object.fromEntries(ACTION_DEFS.map(a => [a.id, false]));
const fullPerms = () =>
    Object.fromEntries(ACTION_DEFS.map(a => [a.id, true]));

export const SettingsProvider = ({ children }) => {

    // ── Core state ────────────────────────────────────────────────────────────
    const [flags, setFlagsState] = useState(() => readStore(STORAGE_KEYS.FLAGS, buildDefaultFlags()));
    const [rbac, setRBACState] = useState(() => readStore(STORAGE_KEYS.RBAC, buildDefaultRBAC()));
    const [workflows, setWorkflowsState] = useState(() => readStore(STORAGE_KEYS.WORKFLOWS, DEFAULT_WORKFLOW_RULES));
    const [auditLogs, setAuditLogsState] = useState(() => readStore(STORAGE_KEYS.AUDIT, DEFAULT_AUDIT_LOGS));
    // Custom roles: { [roleId]: { id, label, description, baseRole, color, bg, isCustom, permissions: { [modId]: { [actionId]: bool } } } }
    const [customRoles, setCustomRoles] = useState(() => readStore(STORAGE_KEYS.CUSTOM_ROLES, {}));
    // User overrides: { [userId]: { customRoleId?: string|null, overrides: { [modId]: { [actionId]: bool|null } } } }
    const [userOverrides, setUserOverrides] = useState(() => readStore(STORAGE_KEYS.USER_OVERRIDES, {}));
    // "View As" userId for admin impersonation preview
    const [viewAsUserId, setViewAsUserIdState] = useState(() => readStore(STORAGE_KEYS.VIEW_AS, null));
    // Project type admin overrides: { residential: {…}, commercial: {…}, industrial: {…} }
    const [projectTypeConfig, setProjectTypeConfig] = useState(() =>
        readStore(STORAGE_KEYS.PROJECT_TYPE_CFG, JSON.parse(JSON.stringify(PROJECT_TYPE_DEFAULTS)))
    );

    // ── Persist ───────────────────────────────────────────────────────────────
    useEffect(() => writeStore(STORAGE_KEYS.FLAGS, flags), [flags]);
    useEffect(() => writeStore(STORAGE_KEYS.RBAC, rbac), [rbac]);
    useEffect(() => writeStore(STORAGE_KEYS.WORKFLOWS, workflows), [workflows]);
    useEffect(() => writeStore(STORAGE_KEYS.AUDIT, auditLogs), [auditLogs]);
    useEffect(() => writeStore(STORAGE_KEYS.CUSTOM_ROLES, customRoles), [customRoles]);
    useEffect(() => writeStore(STORAGE_KEYS.USER_OVERRIDES, userOverrides), [userOverrides]);
    useEffect(() => writeStore(STORAGE_KEYS.VIEW_AS, viewAsUserId), [viewAsUserId]);
    useEffect(() => writeStore(STORAGE_KEYS.PROJECT_TYPE_CFG, projectTypeConfig), [projectTypeConfig]);

    // ── Audit helper ──────────────────────────────────────────────────────────
    const addAudit = useCallback((action, target, from, to, user = 'Admin User') => {
        const entry = {
            id: `a${Date.now()}`,
            ts: new Date().toISOString().replace('T', ' ').slice(0, 16),
            user, action, target,
            from: String(from), to: String(to),
            ip: '127.0.0.1',
        };
        setAuditLogsState(prev => [entry, ...prev].slice(0, 500));
    }, []);

    // ── Feature Flag APIs ─────────────────────────────────────────────────────
    const toggleModule = useCallback((moduleId, user) => {
        setFlagsState(prev => {
            const cur = prev[moduleId]?.enabled ?? true;
            addAudit('TOGGLE_MODULE', `${moduleId} (entire module)`, cur, !cur, user);
            return { ...prev, [moduleId]: { ...prev[moduleId], enabled: !cur } };
        });
    }, [addAudit]);

    const toggleFeature = useCallback((moduleId, featureId, user) => {
        setFlagsState(prev => {
            const cur = prev[moduleId]?.features?.[featureId] ?? true;
            addAudit('TOGGLE_FEATURE', `${moduleId}.${featureId}`, cur, !cur, user);
            return { ...prev, [moduleId]: { ...prev[moduleId], features: { ...prev[moduleId]?.features, [featureId]: !cur } } };
        });
    }, [addAudit]);

    const toggleAction = useCallback((moduleId, actionId, user) => {
        setFlagsState(prev => {
            const cur = prev[moduleId]?.actions?.[actionId] ?? false;
            addAudit('TOGGLE_ACTION', `${moduleId}.action.${actionId}`, cur, !cur, user);
            return { ...prev, [moduleId]: { ...prev[moduleId], actions: { ...prev[moduleId]?.actions, [actionId]: !cur } } };
        });
    }, [addAudit]);

    const resetFlags = useCallback((user) => {
        addAudit('RESET_FLAGS', 'ALL FLAGS', 'custom', 'defaults', user);
        setFlagsState(buildDefaultFlags());
    }, [addAudit]);

    // ── Base RBAC APIs ────────────────────────────────────────────────────────
    const toggleRBAC = useCallback((roleId, moduleId, actionId, user) => {
        setRBACState(prev => {
            const cur = prev[roleId]?.[moduleId]?.[actionId] ?? false;
            addAudit('RBAC_EDIT', `${roleId} → ${moduleId}.${actionId}`, cur, !cur, user);
            return { ...prev, [roleId]: { ...prev[roleId], [moduleId]: { ...prev[roleId]?.[moduleId], [actionId]: !cur } } };
        });
    }, [addAudit]);

    const setRolePreset = useCallback((roleId, preset, user) => {
        setRBACState(prev => {
            const updated = { ...prev, [roleId]: {} };
            MODULE_DEFS.forEach(mod => {
                if (preset === 'full') updated[roleId][mod.id] = fullPerms();
                else if (preset === 'view_only') updated[roleId][mod.id] = { ...emptyPerms(), view: true };
                else updated[roleId][mod.id] = emptyPerms();
            });
            addAudit('ROLE_PRESET', `${roleId} → ${preset}`, 'custom', preset, user);
            return updated;
        });
    }, [addAudit]);

    const resetRBAC = useCallback((user) => {
        addAudit('RESET_RBAC', 'ALL RBAC', 'custom', 'defaults', user);
        setRBACState(buildDefaultRBAC());
    }, [addAudit]);

    // ── Custom Role APIs ──────────────────────────────────────────────────────

    const createCustomRole = useCallback((roleData, user) => {
        const id = `custom_${Date.now()}`;
        const newRole = {
            id,
            label: roleData.label || 'New Role',
            description: roleData.description || '',
            baseRole: roleData.baseRole || null,
            color: roleData.color || '#8b5cf6',
            bg: 'rgba(139,92,246,0.12)',
            isCustom: true,
            permissions: Object.fromEntries(MODULE_DEFS.map(mod => [mod.id, emptyPerms()])),
        };
        setCustomRoles(prev => ({ ...prev, [id]: newRole }));
        addAudit('CUSTOM_ROLE_CREATED', newRole.label, 'null', 'created', user);
        return id;
    }, [addAudit]);

    const cloneRole = useCallback((sourceRoleId, newLabel, user) => {
        const id = `custom_${Date.now()}`;
        // Pull source perms: custom role first, then base RBAC
        const srcPermsMap = customRoles[sourceRoleId]?.permissions
            ?? Object.fromEntries(MODULE_DEFS.map(mod => [
                mod.id,
                { ...(rbac[sourceRoleId]?.[mod.id] ?? emptyPerms()) },
            ]));
        const clonedLabel = newLabel || `Clone of ${sourceRoleId}`;
        const srcDef = ROLE_DEFS.find(r => r.id === sourceRoleId) || customRoles[sourceRoleId];
        const newRole = {
            id,
            label: clonedLabel,
            description: `Cloned from ${sourceRoleId}`,
            baseRole: sourceRoleId,
            color: srcDef?.color || '#06b6d4',
            bg: srcDef?.bg || 'rgba(6,182,212,0.12)',
            isCustom: true,
            permissions: JSON.parse(JSON.stringify(srcPermsMap)),
        };
        setCustomRoles(prev => ({ ...prev, [id]: newRole }));
        addAudit('CUSTOM_ROLE_CLONED', `${sourceRoleId} → ${clonedLabel}`, sourceRoleId, id, user);
        return id;
    }, [customRoles, rbac, addAudit]);

    const updateCustomRole = useCallback((roleId, updates, user) => {
        setCustomRoles(prev => {
            if (!prev[roleId]) return prev;
            addAudit('CUSTOM_ROLE_UPDATED', roleId, 'old', JSON.stringify(updates), user);
            return { ...prev, [roleId]: { ...prev[roleId], ...updates } };
        });
    }, [addAudit]);

    const toggleCustomRolePermission = useCallback((roleId, moduleId, actionId, user) => {
        setCustomRoles(prev => {
            if (!prev[roleId]) return prev;
            const cur = prev[roleId].permissions?.[moduleId]?.[actionId] ?? false;
            addAudit('CUSTOM_ROLE_PERM', `${roleId} → ${moduleId}.${actionId}`, cur, !cur, user);
            return {
                ...prev,
                [roleId]: {
                    ...prev[roleId],
                    permissions: {
                        ...prev[roleId].permissions,
                        [moduleId]: {
                            ...prev[roleId].permissions?.[moduleId],
                            [actionId]: !cur,
                        },
                    },
                },
            };
        });
    }, [addAudit]);

    const setCustomRolePreset = useCallback((roleId, preset, user) => {
        setCustomRoles(prev => {
            if (!prev[roleId]) return prev;
            const perms = {};
            MODULE_DEFS.forEach(mod => {
                if (preset === 'full') perms[mod.id] = fullPerms();
                else if (preset === 'view_only') perms[mod.id] = { ...emptyPerms(), view: true };
                else perms[mod.id] = emptyPerms();
            });
            addAudit('CUSTOM_ROLE_PRESET', `${roleId} → ${preset}`, 'custom', preset, user);
            return { ...prev, [roleId]: { ...prev[roleId], permissions: perms } };
        });
    }, [addAudit]);

    const deleteCustomRole = useCallback((roleId, user) => {
        setCustomRoles(prev => {
            const { [roleId]: _removed, ...rest } = prev;
            addAudit('CUSTOM_ROLE_DELETED', roleId, 'exists', 'deleted', user);
            return rest;
        });
        setUserOverrides(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(uid => {
                if (updated[uid]?.customRoleId === roleId)
                    updated[uid] = { ...updated[uid], customRoleId: null };
            });
            return updated;
        });
    }, [addAudit]);

    // ── User Override APIs ────────────────────────────────────────────────────

    const assignCustomRoleToUser = useCallback((userId, customRoleId, user) => {
        setUserOverrides(prev => {
            const old = prev[userId]?.customRoleId ?? 'base';
            addAudit('USER_ROLE_ASSIGNED', `user:${userId}`, old, customRoleId ?? 'base', user);
            return { ...prev, [userId]: { ...(prev[userId] ?? { overrides: {} }), customRoleId } };
        });
    }, [addAudit]);

    // value: true = force-grant, false = force-revoke, null = use role default
    const setUserPermissionOverride = useCallback((userId, moduleId, actionId, value, user) => {
        setUserOverrides(prev => {
            const existing = prev[userId] ?? { customRoleId: null, overrides: {} };
            addAudit('USER_PERM_OVERRIDE', `user:${userId} → ${moduleId}.${actionId}`, 'role_default', String(value), user);
            return {
                ...prev,
                [userId]: {
                    ...existing,
                    overrides: {
                        ...existing.overrides,
                        [moduleId]: { ...existing.overrides?.[moduleId], [actionId]: value },
                    },
                },
            };
        });
    }, [addAudit]);

    const clearUserOverrides = useCallback((userId, user) => {
        setUserOverrides(prev => {
            const { [userId]: _removed, ...rest } = prev;
            addAudit('USER_OVERRIDES_CLEARED', `user:${userId}`, 'custom', 'cleared', user);
            return rest;
        });
    }, [addAudit]);

    // ── View As ───────────────────────────────────────────────────────────────
    const setViewAs = useCallback((userId) => setViewAsUserIdState(userId), []);
    const clearViewAs = useCallback(() => setViewAsUserIdState(null), []);

    // ── Project Type Config APIs ──────────────────────────────────────────────
    /** Update a single field of a project type config (admin only) */
    const updateProjectTypeField = useCallback((typeId, field, value, user) => {
        setProjectTypeConfig(prev => {
            const updated = {
                ...prev,
                [typeId]: { ...prev[typeId], [field]: value },
            };
            addAudit('PROJECT_TYPE_UPDATED', `${typeId}.${field}`, String(prev[typeId]?.[field]), String(value), user);
            return updated;
        });
    }, [addAudit]);

    /** Reset a single project type back to factory defaults */
    const resetProjectType = useCallback((typeId, user) => {
        setProjectTypeConfig(prev => {
            addAudit('PROJECT_TYPE_RESET', typeId, 'custom', 'defaults', user);
            return { ...prev, [typeId]: JSON.parse(JSON.stringify(PROJECT_TYPE_DEFAULTS[typeId])) };
        });
    }, [addAudit]);

    /** Reset ALL project types to factory defaults */
    const resetAllProjectTypes = useCallback((user) => {
        addAudit('PROJECT_TYPE_RESET_ALL', 'ALL', 'custom', 'defaults', user);
        setProjectTypeConfig(JSON.parse(JSON.stringify(PROJECT_TYPE_DEFAULTS)));
    }, [addAudit]);

    /**
     * getProjectTypeCfg(typeId) — returns merged config (defaults + admin overrides).
     * Components should always use this instead of PROJECT_TYPE_DEFAULTS directly.
     */
    const getProjectTypeCfg = useCallback((typeId) =>
        projectTypeConfig[typeId] ?? PROJECT_TYPE_DEFAULTS[typeId],
        [projectTypeConfig]);

    // ── Workflow APIs ─────────────────────────────────────────────────────────
    const toggleWorkflow = useCallback((wfId, user) => {
        setWorkflowsState(prev => prev.map(wf => {
            if (wf.id !== wfId) return wf;
            addAudit('WORKFLOW_TOGGLE', wf.label, wf.enabled, !wf.enabled, user);
            return { ...wf, enabled: !wf.enabled };
        }));
    }, [addAudit]);

    const addWorkflow = useCallback((rule, user) => {
        const newRule = { ...rule, id: `wf${Date.now()}`, createdBy: user, createdAt: new Date().toISOString().slice(0, 10) };
        setWorkflowsState(prev => [...prev, newRule]);
        addAudit('WORKFLOW_CREATED', rule.label, 'null', 'created', user);
    }, [addAudit]);

    const deleteWorkflow = useCallback((wfId, user) => {
        setWorkflowsState(prev => {
            const wf = prev.find(w => w.id === wfId);
            if (wf) addAudit('WORKFLOW_DELETED', wf.label, 'exists', 'deleted', user);
            return prev.filter(w => w.id !== wfId);
        });
    }, [addAudit]);

    const rollbackAudit = useCallback((logId, user) => {
        addAudit('ROLLBACK', `log:${logId}`, 'current', 'rolled_back', user);
    }, [addAudit]);

    // ── Permission resolution ─────────────────────────────────────────────────

    const isModuleEnabled = useCallback((moduleId) => flags[moduleId]?.enabled ?? true, [flags]);
    const isFeatureEnabled = useCallback((moduleId, featureId) =>
        (flags[moduleId]?.enabled ?? true) && (flags[moduleId]?.features?.[featureId] ?? true), [flags]);
    const isActionEnabled = useCallback((moduleId, actionId) =>
        (flags[moduleId]?.enabled ?? true) && (flags[moduleId]?.actions?.[actionId] ?? false), [flags]);
    const canRoleDo = useCallback((role, moduleId, actionId) =>
        rbac[role]?.[moduleId]?.[actionId] ?? false, [rbac]);

    /**
     * resolvePermission(userId, roleId, moduleId, actionId)
     * Priority: User Override → Custom Role → Base RBAC
     */
    const resolvePermission = useCallback((userId, roleId, moduleId, actionId) => {
        if (!(flags[moduleId]?.enabled ?? true)) return false;
        // 1. Hard user override
        const userOvr = userOverrides[userId];
        const hardVal = userOvr?.overrides?.[moduleId]?.[actionId];
        if (hardVal !== undefined && hardVal !== null) return hardVal;
        // 2. Custom role assigned to this user
        const crId = userOvr?.customRoleId;
        if (crId && customRoles[crId]) {
            return customRoles[crId].permissions?.[moduleId]?.[actionId] ?? false;
        }
        // 3. Base RBAC
        return rbac[roleId]?.[moduleId]?.[actionId] ?? false;
    }, [flags, userOverrides, customRoles, rbac]);

    /** Backward-compat: role-only check (no user id) */
    const hasPermission = useCallback((role, moduleId, actionId) =>
        isModuleEnabled(moduleId) && canRoleDo(role, moduleId, actionId),
        [isModuleEnabled, canRoleDo]);

    const hasPermissionForUser = useCallback((userId, roleId, moduleId, actionId) =>
        resolvePermission(userId, roleId, moduleId, actionId), [resolvePermission]);

    // ── Derived lists ─────────────────────────────────────────────────────────

    const allRoles = useMemo(() => [
        ...ROLE_DEFS,
        ...Object.values(customRoles),
    ], [customRoles]);

    const enrichedUsers = useMemo(() => USERS.map(u => ({
        ...u,
        customRoleId: userOverrides[u.id]?.customRoleId ?? null,
        overrideCount: Object.values(userOverrides[u.id]?.overrides ?? {})
            .flatMap(m => Object.values(m)).filter(v => v !== null && v !== undefined).length,
        effectiveRole: userOverrides[u.id]?.customRoleId
            ? (customRoles[userOverrides[u.id].customRoleId]?.label ?? u.role)
            : u.role,
    })), [userOverrides, customRoles]);

    // ── Context value ─────────────────────────────────────────────────────────
    const value = useMemo(() => ({
        // Raw state
        flags, rbac, workflows, auditLogs,
        customRoles, userOverrides, viewAsUserId,
        allRoles, enrichedUsers,
        // Project type config (admin-overridable)
        projectTypeConfig,
        // Feature flag APIs
        toggleModule, toggleFeature, toggleAction, resetFlags,
        // Base RBAC APIs
        toggleRBAC, setRolePreset, resetRBAC,
        // Custom role APIs
        createCustomRole, cloneRole, updateCustomRole,
        toggleCustomRolePermission, setCustomRolePreset, deleteCustomRole,
        // User override APIs
        assignCustomRoleToUser, setUserPermissionOverride, clearUserOverrides,
        // View As
        setViewAs, clearViewAs,
        // Workflow APIs
        toggleWorkflow, addWorkflow, deleteWorkflow,
        // Audit
        rollbackAudit,
        // Permission helpers
        isModuleEnabled, isFeatureEnabled, isActionEnabled,
        canRoleDo, hasPermission, hasPermissionForUser, resolvePermission,
        // Project type APIs
        getProjectTypeCfg, updateProjectTypeField, resetProjectType, resetAllProjectTypes,
        // Utility
        emptyPerms, fullPerms,
    }), [
        flags, rbac, workflows, auditLogs,
        customRoles, userOverrides, viewAsUserId,
        allRoles, enrichedUsers,
        projectTypeConfig,
        toggleModule, toggleFeature, toggleAction, resetFlags,
        toggleRBAC, setRolePreset, resetRBAC,
        createCustomRole, cloneRole, updateCustomRole,
        toggleCustomRolePermission, setCustomRolePreset, deleteCustomRole,
        assignCustomRoleToUser, setUserPermissionOverride, clearUserOverrides,
        setViewAs, clearViewAs,
        toggleWorkflow, addWorkflow, deleteWorkflow,
        rollbackAudit,
        isModuleEnabled, isFeatureEnabled, isActionEnabled,
        canRoleDo, hasPermission, hasPermissionForUser, resolvePermission,
        getProjectTypeCfg, updateProjectTypeField, resetProjectType, resetAllProjectTypes,
    ]);

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
    return ctx;
};

export default SettingsContext;
