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
    MODULE_DEFS,
    ROLE_DEFS,
    ACTION_DEFS,
} from '../config/features.config';
import { settingsApi } from '../services/settingsApi';

const SettingsContext = createContext(null);

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyPerms = () =>
    Object.fromEntries(ACTION_DEFS.map(a => [a.id, false]));
const fullPerms = () =>
    Object.fromEntries(ACTION_DEFS.map(a => [a.id, true]));

export const SettingsProvider = ({ children }) => {

    // ── Core state ────────────────────────────────────────────────────────────
    const [flags, setFlagsState] = useState(buildDefaultFlags());
    const [rbac, setRBACState] = useState(buildDefaultRBAC());
    const [workflows, setWorkflowsState] = useState([]);
    const [auditLogs, setAuditLogsState] = useState([]);
    const [customRoles, setCustomRoles] = useState({});
    const [userOverrides, setUserOverrides] = useState({});
    const [viewAsUserId, setViewAsUserIdState] = useState(null);
    const [projectTypeConfig, setProjectTypeConfig] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    // ── Load data from API on mount ─────────────────────────────────────────────
    useEffect(() => {
        const loadSettings = async () => {
            try {
                setIsLoading(true);
                const response = await settingsApi.getFullSettings();
                
                // Handle wrapped response format {success: true, data: {...}}
                const settings = response.data || response;

                // Transform flags from API format (object with moduleId keys)
                if (settings?.flags) {
                    const flagsObj = {};
                    // Handle both object and array formats
                    const flagsArray = Array.isArray(settings.flags) 
                        ? settings.flags 
                        : Object.entries(settings.flags).map(([moduleId, data]) => ({ moduleId, ...data }));
                    flagsArray.forEach(f => {
                        const moduleId = f.moduleId || f.id;
                        if (moduleId) {
                            flagsObj[moduleId] = {
                                enabled: f.enabled,
                                features: f.features || {},
                                actions: f.actions || {},
                            };
                        }
                    });
                    setFlagsState(flagsObj);
                } else {
                    setFlagsState({});
                }

                // Transform RBAC from API format (object format from backend)
                if (settings?.rbac) {
                    // Backend returns object directly, use as-is
                    setRBACState(settings.rbac);
                } else {
                    setRBACState({});
                }

                // Set workflows
                if (settings?.workflows) {
                    setWorkflowsState(settings.workflows);
                } else {
                    setWorkflowsState([]);
                }

                // Set audit logs
                if (settings?.auditLogs) {
                    setAuditLogsState(settings.auditLogs);
                } else {
                    setAuditLogsState([]);
                }

                // Transform custom roles
                if (settings?.customRoles) {
                    const rolesObj = {};
                    // Handle both array and object formats from backend
                    const rolesArray = Array.isArray(settings.customRoles) 
                        ? settings.customRoles 
                        : Object.values(settings.customRoles);
                    rolesArray.forEach(r => {
                        const roleId = r.roleId || r.id;
                        if (roleId) {
                            rolesObj[roleId] = {
                                id: roleId,
                                label: r.label,
                                description: r.description,
                                baseRole: r.baseRole,
                                color: r.color,
                                bg: r.bg,
                                isCustom: r.isCustom,
                                permissions: r.permissions || {},
                            };
                        }
                    });
                    setCustomRoles(rolesObj);
                } else {
                    setCustomRoles({});
                }

                // Transform project type configs
                if (settings?.projectTypeConfigs) {
                    const configsObj = {};
                    const configsArray = Array.isArray(settings.projectTypeConfigs)
                        ? settings.projectTypeConfigs
                        : Object.entries(settings.projectTypeConfigs).map(([typeId, config]) => ({ typeId, config }));
                    configsArray.forEach(c => {
                        if (c.typeId) {
                            configsObj[c.typeId] = c.config || c;
                        }
                    });
                    setProjectTypeConfig(configsObj);
                } else {
                    setProjectTypeConfig({});
                }
            } catch (error) {
                console.error('Failed to load settings from API:', error);
                // Fall back to defaults on API failure
                setFlagsState({});
                setRBACState({});
                setWorkflowsState([]);
                setAuditLogsState([]);
                setCustomRoles({});
                setProjectTypeConfig({});
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    // ── Audit helper ──────────────────────────────────────────────────────────
    const addAudit = useCallback(async (action, target, from, to, user = 'Admin User') => {
        const entry = {
            logId: `a${Date.now()}`,
            ts: new Date().toISOString().replace('T', ' ').slice(0, 16),
            user, action, target,
            from: String(from), to: String(to),
            ip: '127.0.0.1',
        };
        setAuditLogsState(prev => [entry, ...prev].slice(0, 500));
        // Persist to backend
        try {
            await settingsApi.createAuditLog(entry);
        } catch (e) {
            console.error('Failed to save audit log:', e);
        }
    }, []);

    // ── Feature Flag APIs ─────────────────────────────────────────────────────
    const toggleModule = useCallback(async (moduleId, user) => {
        const cur = flags[moduleId]?.enabled ?? true;
        const newEnabled = !cur;

        setFlagsState(prev => ({
            ...prev,
            [moduleId]: { ...prev[moduleId], enabled: newEnabled }
        }));

        await addAudit('TOGGLE_MODULE', `${moduleId} (entire module)`, cur, newEnabled, user);

        // Persist to backend
        try {
            await settingsApi.toggleModule(moduleId, newEnabled);
        } catch (e) {
            console.error('Failed to toggle module:', e);
        }
    }, [flags, addAudit]);

    const toggleFeature = useCallback(async (moduleId, featureId, user) => {
        const cur = flags[moduleId]?.features?.[featureId] ?? true;
        const newEnabled = !cur;

        setFlagsState(prev => ({
            ...prev,
            [moduleId]: {
                ...prev[moduleId],
                features: { ...prev[moduleId]?.features, [featureId]: newEnabled }
            }
        }));

        await addAudit('TOGGLE_FEATURE', `${moduleId}.${featureId}`, cur, newEnabled, user);

        // Persist to backend
        try {
            await settingsApi.toggleFeature(moduleId, featureId, newEnabled);
        } catch (e) {
            console.error('Failed to toggle feature:', e);
        }
    }, [flags, addAudit]);

    const toggleAction = useCallback(async (moduleId, actionId, user) => {
        const cur = flags[moduleId]?.actions?.[actionId] ?? false;
        const newEnabled = !cur;

        setFlagsState(prev => ({
            ...prev,
            [moduleId]: {
                ...prev[moduleId],
                actions: { ...prev[moduleId]?.actions, [actionId]: newEnabled }
            }
        }));

        await addAudit('TOGGLE_ACTION', `${moduleId}.action.${actionId}`, cur, newEnabled, user);

        // Persist to backend
        try {
            await settingsApi.toggleAction(moduleId, actionId, newEnabled);
        } catch (e) {
            console.error('Failed to toggle action:', e);
        }
    }, [flags, addAudit]);

    const resetFlags = useCallback(async (user) => {
        await addAudit('RESET_FLAGS', 'ALL FLAGS', 'custom', 'defaults', user);
        const defaults = buildDefaultFlags();
        setFlagsState(defaults);
        // Note: Backend reset would require a specific endpoint
    }, [addAudit]);

    // ── Base RBAC APIs ────────────────────────────────────────────────────────
    const toggleRBAC = useCallback(async (roleId, moduleId, actionId, user) => {
        const cur = rbac[roleId]?.[moduleId]?.[actionId] ?? false;
        const newEnabled = !cur;

        setRBACState(prev => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [moduleId]: { ...prev[roleId]?.[moduleId], [actionId]: newEnabled }
            }
        }));

        await addAudit('RBAC_EDIT', `${roleId} → ${moduleId}.${actionId}`, cur, newEnabled, user);

        // Persist to backend
        try {
            await settingsApi.toggleRBAC(roleId, moduleId, actionId, newEnabled);
        } catch (e) {
            console.error('Failed to toggle RBAC:', e);
        }
    }, [rbac, addAudit]);

    const setRolePreset = useCallback(async (roleId, preset, user) => {
        const isCustomRole = roleId.startsWith('custom_');
        
        // Update local state
        if (isCustomRole) {
            // For custom roles, update via setCustomRolePreset
            await setCustomRolePreset(roleId, preset, user);
            return;
        }
        
        // For base roles, update RBAC
        const updated = { ...rbac, [roleId]: {} };
        MODULE_DEFS.forEach(mod => {
            if (preset === 'full') updated[roleId][mod.id] = fullPerms();
            else if (preset === 'view_only') updated[roleId][mod.id] = { ...emptyPerms(), view: true };
            else updated[roleId][mod.id] = emptyPerms();
        });
        setRBACState(updated);
        await addAudit('ROLE_PRESET', `${roleId} → ${preset}`, 'custom', preset, user);

        // Persist to backend
        try {
            await Promise.all(
                MODULE_DEFS.map(mod =>
                    settingsApi.updateRBAC(roleId, mod.id, updated[roleId][mod.id])
                )
            );
        } catch (e) {
            console.error('Failed to set role preset:', e);
        }
    }, [rbac, addAudit]);

    const resetRBAC = useCallback(async (user) => {
        await addAudit('RESET_RBAC', 'ALL RBAC', 'custom', 'defaults', user);
        const defaults = buildDefaultRBAC();
        setRBACState(defaults);
        // Note: Backend reset would require a specific endpoint
    }, [addAudit]);

    // ── Custom Role APIs ──────────────────────────────────────────────────────

    // Function to refresh custom roles from backend
    const refreshCustomRoles = useCallback(async () => {
        try {
            const response = await settingsApi.getCustomRoles();
            
            // Handle wrapped response format {success: true, data: {...}}
            const rolesData = response.data || response;
            
            // Transform roles data (handle both object and array formats)
            const rolesObj = {};
            const rolesArray = Array.isArray(rolesData) ? rolesData : Object.values(rolesData);
            rolesArray.forEach(r => {
                const roleId = r.roleId || r.id;
                if (roleId) {
                    rolesObj[roleId] = {
                        id: roleId,
                        label: r.label,
                        description: r.description,
                        baseRole: r.baseRole,
                        color: r.color,
                        bg: r.bg,
                        isCustom: true,
                        permissions: r.permissions || {},
                    };
                }
            });
            setCustomRoles(rolesObj);
        } catch (error) {
            // Silent fail
        }
    }, []);

    const createCustomRole = useCallback(async (roleData, user) => {
        try {
            // Persist to backend first
            const response = await settingsApi.createCustomRole({
                label: roleData.label,
                description: roleData.description || '',
                baseRole: roleData.baseRole || null,
                color: roleData.color || '#8b5cf6',
                bg: 'rgba(139,92,246,0.12)',
            });

            const savedRole = response;
            const id = savedRole.id || savedRole.roleId;

            // Update local state with backend response
            const newRole = {
                id,
                label: savedRole.label || roleData.label,
                description: savedRole.description || '',
                baseRole: savedRole.baseRole || null,
                color: savedRole.color || '#8b5cf6',
                bg: savedRole.bg || 'rgba(139,92,246,0.12)',
                isCustom: true,
                permissions: savedRole.permissions || Object.fromEntries(MODULE_DEFS.map(mod => [mod.id, emptyPerms()])),
            };
            setCustomRoles(prev => ({ ...prev, [id]: newRole }));
            addAudit('CUSTOM_ROLE_CREATED', newRole.label, 'null', 'created', user);
            
            // Refresh all custom roles from backend to ensure sync
            await refreshCustomRoles();
            
            return id;
        } catch (error) {
            // Fallback: create locally only
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
        }
    }, [addAudit, refreshCustomRoles]);

    const cloneRole = useCallback(async (sourceRoleId, newLabel, user) => {
        try {
            // Call backend to clone
            const response = await settingsApi.cloneCustomRole(sourceRoleId, newLabel);
            const cloned = response;
            const id = cloned.id || cloned.roleId;

            // Update local state
            const clonedRole = {
                id,
                label: cloned.label || newLabel,
                description: cloned.description || `Cloned from ${sourceRoleId}`,
                baseRole: sourceRoleId,
                color: cloned.color || '#06b6d4',
                bg: cloned.bg || 'rgba(6,182,212,0.12)',
                isCustom: true,
                permissions: cloned.permissions || {},
            };
            setCustomRoles(prev => ({ ...prev, [id]: clonedRole }));
            addAudit('CUSTOM_ROLE_CLONED', `${sourceRoleId} → ${cloned.label}`, sourceRoleId, id, user);
            
            // Refresh from backend
            await refreshCustomRoles();
            
            return id;
        } catch (error) {
            console.error('Failed to clone role:', error);
            // Fallback: clone locally
            const id = `custom_${Date.now()}`;
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
        }
    }, [customRoles, rbac, addAudit, refreshCustomRoles]);

    const updateCustomRole = useCallback(async (roleId, updates, user) => {
        // Update local state
        setCustomRoles(prev => {
            if (!prev[roleId]) return prev;
            return { ...prev, [roleId]: { ...prev[roleId], ...updates } };
        });
        addAudit('CUSTOM_ROLE_UPDATED', roleId, 'old', JSON.stringify(updates), user);

        // Persist to backend
        try {
            await settingsApi.updateCustomRole(roleId, updates);
        } catch (e) {
            console.error('Failed to update custom role:', e);
        }
    }, [addAudit]);

    const toggleCustomRolePermission = useCallback(async (roleId, moduleId, actionId, user) => {
        const cur = customRoles[roleId]?.permissions?.[moduleId]?.[actionId] ?? false;
        const newEnabled = !cur;

        // Update local state optimistically
        setCustomRoles(prev => {
            if (!prev[roleId]) return prev;
            return {
                ...prev,
                [roleId]: {
                    ...prev[roleId],
                    permissions: {
                        ...prev[roleId].permissions,
                        [moduleId]: {
                            ...prev[roleId].permissions?.[moduleId],
                            [actionId]: newEnabled,
                        },
                    },
                },
            };
        });

        addAudit('CUSTOM_ROLE_PERM', `${roleId} → ${moduleId}.${actionId}`, cur, newEnabled, user);

        // Persist to backend
        try {
            const permissions = { [actionId]: newEnabled };
            await settingsApi.updateCustomRolePermissions(roleId, moduleId, permissions);
        } catch (e) {
            console.error('Failed to toggle custom role permission:', e);
        }
    }, [customRoles, addAudit]);

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

    const deleteCustomRole = useCallback(async (roleId, user) => {
        // Update local state
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

        // Persist to backend
        try {
            await settingsApi.deleteCustomRole(roleId);
            // Refresh from backend
            await refreshCustomRoles();
        } catch (e) {
            console.error('Failed to delete custom role:', e);
        }
    }, [addAudit, refreshCustomRoles]);

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
    const updateProjectTypeField = useCallback(async (typeId, field, value, user) => {
        setProjectTypeConfig(prev => {
            const updated = {
                ...prev,
                [typeId]: { ...prev[typeId], [field]: value },
            };
            return updated;
        });
        await addAudit('PROJECT_TYPE_UPDATED', `${typeId}.${field}`, String(projectTypeConfig[typeId]?.[field]), String(value), user);

        // Persist to backend
        try {
            const config = { ...projectTypeConfig[typeId], [field]: value };
            await settingsApi.updateProjectTypeConfig(typeId, config);
        } catch (e) {
            console.error('Failed to update project type config:', e);
        }
    }, [projectTypeConfig, addAudit]);

    const resetProjectType = useCallback(async (typeId, user) => {
        await addAudit('PROJECT_TYPE_RESET', typeId, 'custom', 'defaults', user);
        // Note: Would need backend endpoint for full reset
    }, [addAudit]);

    const resetAllProjectTypes = useCallback(async (user) => {
        await addAudit('PROJECT_TYPE_RESET_ALL', 'ALL', 'custom', 'defaults', user);
        // Note: Would need backend endpoint for full reset
    }, [addAudit]);

    const getProjectTypeCfg = useCallback((typeId) =>
        projectTypeConfig[typeId] || {},
        [projectTypeConfig]);

    // ── Workflow APIs ─────────────────────────────────────────────────────────
    const toggleWorkflow = useCallback(async (wfId, user) => {
        setWorkflowsState(prev => prev.map(wf => {
            if (wf.id !== wfId) return wf;
            addAudit('WORKFLOW_TOGGLE', wf.label, wf.enabled, !wf.enabled, user);
            return { ...wf, enabled: !wf.enabled };
        }));

        // Persist to backend
        try {
            const wf = workflows.find(w => w.id === wfId);
            if (wf) {
                await settingsApi.updateWorkflowRule(wfId, { enabled: !wf.enabled });
            }
        } catch (e) {
            console.error('Failed to toggle workflow:', e);
        }
    }, [workflows, addAudit]);

    const addWorkflow = useCallback(async (rule, user) => {
        const newRule = { ...rule, id: `wf${Date.now()}`, createdBy: user, createdAt: new Date().toISOString().slice(0, 10) };
        setWorkflowsState(prev => [...prev, newRule]);
        await addAudit('WORKFLOW_CREATED', rule.label, 'null', 'created', user);

        // Persist to backend
        try {
            await settingsApi.createWorkflowRule(newRule);
        } catch (e) {
            console.error('Failed to create workflow:', e);
        }
    }, [addAudit]);

    const deleteWorkflow = useCallback(async (wfId, user) => {
        setWorkflowsState(prev => {
            const wf = prev.find(w => w.id === wfId);
            if (wf) addAudit('WORKFLOW_DELETED', wf.label, 'exists', 'deleted', user);
            return prev.filter(w => w.id !== wfId);
        });

        // Persist to backend
        try {
            await settingsApi.deleteWorkflowRule(wfId);
        } catch (e) {
            console.error('Failed to delete workflow:', e);
        }
    }, [workflows, addAudit]);

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
        ...Object.values(customRoles || {}),
    ], [customRoles]);

    // Note: enrichedUsers now expects users to be passed from AuthContext or fetched separately
    const getEnrichedUsers = useCallback((users) => {
        return (users || []).map(u => ({
            ...u,
            customRoleId: userOverrides[u.id]?.customRoleId ?? null,
            overrideCount: Object.values(userOverrides[u.id]?.overrides ?? {})
                .flatMap(m => Object.values(m)).filter(v => v !== null && v !== undefined).length,
            effectiveRole: userOverrides[u.id]?.customRoleId
                ? (customRoles[userOverrides[u.id].customRoleId]?.label ?? u.role)
                : u.role,
        }));
    }, [userOverrides, customRoles]);

    // ── Context value ─────────────────────────────────────────────────────────
    const value = useMemo(() => ({
        // Raw state
        flags, rbac, workflows, auditLogs,
        customRoles, userOverrides, viewAsUserId,
        roleDefs: ROLE_DEFS,
        allRoles,
        isLoading,
        // Project type config (admin-overridable)
        projectTypeConfig,
        // Feature flag APIs
        toggleModule, toggleFeature, toggleAction, resetFlags,
        // Base RBAC APIs
        toggleRBAC, setRolePreset, resetRBAC,
        // Custom role APIs
        createCustomRole, cloneRole, updateCustomRole,
        toggleCustomRolePermission, setCustomRolePreset, deleteCustomRole,
        refreshCustomRoles,
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
        getEnrichedUsers,
    }), [
        flags, rbac, workflows, auditLogs,
        customRoles, userOverrides, viewAsUserId,
        allRoles, isLoading,
        projectTypeConfig,
        toggleModule, toggleFeature, toggleAction, resetFlags,
        toggleRBAC, setRolePreset, resetRBAC,
        createCustomRole, cloneRole, updateCustomRole,
        toggleCustomRolePermission, setCustomRolePreset, deleteCustomRole,
        refreshCustomRoles,
        assignCustomRoleToUser, setUserPermissionOverride, clearUserOverrides,
        setViewAs, clearViewAs,
        toggleWorkflow, addWorkflow, deleteWorkflow,
        rollbackAudit,
        isModuleEnabled, isFeatureEnabled, isActionEnabled,
        canRoleDo, hasPermission, hasPermissionForUser, resolvePermission,
        getProjectTypeCfg, updateProjectTypeField, resetProjectType, resetAllProjectTypes,
        getEnrichedUsers,
    ]);

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
    return ctx;
};

export default SettingsContext;
