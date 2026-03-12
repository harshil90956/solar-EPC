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

const buildDefaultRBAC = () => {
    const rbac = {};
    const modules = [
        'dashboard', 'crm', 'survey', 'design', 'project', 'inventory', 
        'procurement', 'logistics', 'installation', 'commissioning', 
        'finance', 'service', 'compliance', 'settings', 'hrm', 'intelligence'
    ];
    
    ROLE_DEFS.forEach(role => {
        rbac[role.id] = {};
        modules.forEach(mod => {
            rbac[role.id][mod] = {
                view: true,
                create: role.id === 'admin' || role.id === 'manager',
                edit: role.id === 'admin' || role.id === 'manager',
                delete: role.id === 'admin',
                export: role.id === 'admin' || role.id === 'manager',
                approve: role.id === 'admin' || role.id === 'manager',
                assign: role.id === 'admin' || role.id === 'manager',
            };
        });
    });
    return rbac;
};

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
    const [installationTasks, setInstallationTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // ── Load data from API on mount (only if user is logged in) ─────────────────
    useEffect(() => {
        // Check if user is logged in before making API calls
        const token = localStorage.getItem('solar_token');
        if (!token) {
            setIsLoading(false);
            return; // Don't load settings if not logged in
        }
        
        const loadSettings = async () => {
            try {
                setIsLoading(true);
                const response = await settingsApi.getFullSettings();

                // Handle wrapped response format {success: true, data: {...}}
                const settings = response.data || response;

                // Transform flags from API format (object with moduleId keys)
                if (settings?.flags && Object.keys(settings.flags).length > 0) {
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
                    // Use defaults if API returns empty flags
                    setFlagsState(buildDefaultFlags());
                }

                // Transform RBAC from API format (object format from backend)
                if (settings?.rbac && Object.keys(settings.rbac).length > 0) {
                    // Backend returns object directly, use as-is
                    setRBACState(settings.rbac);
                } else {
                    // Use defaults if API returns empty RBAC
                    setRBACState(buildDefaultRBAC());
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
                            // Handle permissions that might be MongoDB Map or plain object
                            let perms = r.permissions || {};
                            if (typeof perms === 'object' && typeof perms.entries === 'function') {
                                // It's a Map - convert to object
                                const permsObj = {};
                                for (const [moduleId, modulePerms] of perms.entries()) {
                                    if (typeof modulePerms === 'object' && typeof modulePerms.entries === 'function') {
                                        permsObj[moduleId] = Object.fromEntries(modulePerms.entries());
                                    } else {
                                        permsObj[moduleId] = modulePerms;
                                    }
                                }
                                perms = permsObj;
                            }
                            rolesObj[roleId] = {
                                id: roleId,
                                label: r.label,
                                description: r.description,
                                baseRole: r.baseRole,
                                color: r.color,
                                bg: r.bg,
                                isCustom: r.isCustom,
                                dataScope: r.dataScope || 'ALL',
                                permissions: perms,
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

                if (settings?.installationTasks) {
                    setInstallationTasks(Array.isArray(settings.installationTasks) ? settings.installationTasks : []);
                } else {
                    setInstallationTasks([]);
                }
            } catch (error) {
                console.error('Failed to load settings from API:', error);
                // Fall back to defaults on API failure
                setFlagsState(buildDefaultFlags());
                setRBACState(buildDefaultRBAC());
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

    // Load custom roles from dedicated endpoint
    useEffect(() => {
        // Only load if user is logged in
        const token = localStorage.getItem('solar_token');
        if (token) {
            refreshCustomRoles();
        }
    }, []);

    useEffect(() => {
        try {
            const modulePermissions = Object.fromEntries(
                Object.entries(flags || {}).map(([moduleId, cfg]) => [moduleId, cfg?.actions || {}])
            );
            localStorage.setItem('modulePermissions', JSON.stringify(modulePermissions));
        } catch (e) {
            console.error('Failed to persist modulePermissions to localStorage:', e);
        }
    }, [flags]);

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

    const refreshCustomRoles = useCallback(async () => {
        try {
            const response = await settingsApi.getCustomRoles();
            const rolesArray = response.data || response;
            console.log('[SETTINGS DEBUG] getCustomRoles response:', JSON.stringify(rolesArray, null, 2));
            
            const rolesObj = {};

            // Handle both array format and object format from backend
            let rolesToProcess = [];
            if (Array.isArray(rolesArray)) {
                rolesToProcess = rolesArray;
            } else if (rolesArray && typeof rolesArray === 'object') {
                // Backend returns object with roleId as keys
                rolesToProcess = Object.values(rolesArray);
            }
            
            rolesToProcess.forEach(r => {
                const roleId = r.roleId || r.id;
                console.log(`[SETTINGS DEBUG] Processing role: ${roleId}, Label: ${r.label}`);
                if (roleId) {
                    // Handle permissions transformation (same as loadSettings)
                    let perms = r.permissions || {};
                    if (perms && typeof perms === 'object') {
                        // If it's a Map-like object from Mongoose, convert to plain object
                        const permsObj = {};
                        const entries = (typeof perms.entries === 'function')
                            ? Array.from(perms.entries())
                            : Object.entries(perms);

                        entries.forEach(([moduleId, modulePerms]) => {
                            if (modulePerms && typeof modulePerms === 'object') {
                                permsObj[moduleId] = (typeof modulePerms.entries === 'function')
                                    ? Object.fromEntries(modulePerms.entries())
                                    : modulePerms;
                            } else {
                                permsObj[moduleId] = modulePerms;
                            }
                        });
                        perms = permsObj;
                    }
                    rolesObj[roleId] = {
                        id: roleId,
                        label: r.label,
                        description: r.description,
                        baseRole: r.baseRole,
                        color: r.color,
                        bg: r.bg,
                        isCustom: true,
                        dataScope: r.dataScope || 'ALL',
                        permissions: perms,
                        createdAt: r.createdAt,
                        updatedAt: r.updatedAt,
                    };
                }
            });
            setCustomRoles(rolesObj);
            console.log('[SETTINGS] Refreshed custom roles:', Object.keys(rolesObj));
            console.log('[SETTINGS DEBUG] Custom roles object keys:', Object.keys(rolesObj));
            if (Object.keys(rolesObj).length > 0) {
                console.log('[SETTINGS DEBUG] First role permissions:', rolesObj[Object.keys(rolesObj)[0]]?.permissions);
            }
        } catch (error) {
            console.error('Failed to refresh custom roles:', error);
        }
    }, []);

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

    const createCustomRole = useCallback(async (roleOrLabel, description, baseRole, user) => {
        const incoming = (roleOrLabel && typeof roleOrLabel === 'object') ? roleOrLabel : null;
        const resolvedLabel = incoming
            ? (typeof incoming.label === 'string' ? incoming.label : String(incoming.label ?? ''))
            : (typeof roleOrLabel === 'string' ? roleOrLabel : String(roleOrLabel ?? ''));
        const resolvedDescription = incoming ? (incoming.description || '') : (description || '');
        const resolvedBaseRole = incoming ? (incoming.baseRole ?? null) : (baseRole || null);
        const resolvedColor = incoming?.color || '#8b5cf6';
        const resolvedBg = incoming?.bg || 'rgba(139,92,246,0.12)';
        const resolvedDataScope = incoming?.dataScope || 'ALL';

        try {
            const id = `custom_${Date.now()}`;

            const basePerms = baseRole
                ? (customRoles[baseRole]?.permissions || rbac[baseRole] || {})
                : {};
            const newRole = {
                id,
                label: resolvedLabel,
                description: resolvedDescription,
                baseRole: resolvedBaseRole,
                color: resolvedColor,
                bg: resolvedBg,
                isCustom: true,
                dataScope: resolvedDataScope,
                permissions: JSON.parse(JSON.stringify(basePerms)),
            };

            // Persist to backend
            try {
                await settingsApi.createCustomRole({
                    label: newRole.label,
                    description: newRole.description,
                    baseRole: newRole.baseRole,
                    color: newRole.color,
                    bg: newRole.bg,
                    dataScope: newRole.dataScope,
                });
            } catch (e) {
                console.error('Failed to create custom role on backend:', e);
            }

            setCustomRoles(prev => ({ ...prev, [id]: newRole }));
            addAudit('CUSTOM_ROLE_CREATED', newRole.label, 'null', id, user);
            await refreshCustomRoles();
            return id;
        } catch (error) {
            console.error('Failed to create custom role:', error);
            // Fallback: create locally
            const id = `custom_${Date.now()}`;
            const newRole = {
                id,
                label: resolvedLabel,
                description: resolvedDescription,
                baseRole: resolvedBaseRole,
                color: '#8b5cf6',
                bg: 'rgba(139,92,246,0.12)',
                isCustom: true,
                permissions: {},
            };
            setCustomRoles(prev => ({ ...prev, [id]: newRole }));
            addAudit('CUSTOM_ROLE_CREATED', newRole.label, 'null', id, user);
            return id;
        }
    }, [customRoles, rbac, addAudit, refreshCustomRoles]);

    const updateCustomRole = useCallback(async (roleId, updates, user) => {
        setCustomRoles(prev => {
            if (!prev[roleId]) return prev;
            return { ...prev, [roleId]: { ...prev[roleId], ...updates } };
        });

        // Persist to backend
        try {
            const allowed = {
                ...(updates?.label !== undefined ? { label: typeof updates.label === 'string' ? updates.label : String(updates.label ?? '') } : {}),
                ...(updates?.description !== undefined ? { description: updates.description } : {}),
                ...(updates?.baseRole !== undefined ? { baseRole: updates.baseRole } : {}),
                ...(updates?.color !== undefined ? { color: updates.color } : {}),
                ...(updates?.bg !== undefined ? { bg: updates.bg } : {}),
                ...(updates?.dataScope !== undefined ? { dataScope: updates.dataScope } : {}),
            };
            await settingsApi.updateCustomRole(roleId, allowed);
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

    const setCustomRolePreset = useCallback(async (roleId, preset, user) => {
        // Build permissions object
        const perms = {};
        MODULE_DEFS.forEach(mod => {
            if (preset === 'full') perms[mod.id] = fullPerms();
            else if (preset === 'view_only') perms[mod.id] = { ...emptyPerms(), view: true };
            else perms[mod.id] = emptyPerms();
        });
        
        // Update local state
        setCustomRoles(prev => {
            if (!prev[roleId]) return prev;
            addAudit('CUSTOM_ROLE_PRESET', `${roleId} → ${preset}`, 'custom', preset, user);
            return { ...prev, [roleId]: { ...prev[roleId], permissions: perms } };
        });
        
        // Persist to backend - update each module's permissions
        try {
            for (const [moduleId, modulePerms] of Object.entries(perms)) {
                await settingsApi.updateCustomRolePermissions(roleId, moduleId, modulePerms);
            }
        } catch (e) {
            console.error('Failed to save preset permissions:', e);
        }
    }, [addAudit]);

    const deleteCustomRole = useCallback(async (roleId, user) => {
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
        } catch (e) {
            console.error('Failed to delete custom role:', e);
        }
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

    // ── Installation Task Config APIs ─────────────────────────────────────────
    const updateInstallationTasksState = useCallback(async (tasks, user) => {
        setInstallationTasks(tasks);
        await addAudit('INSTALLATION_TASKS_UPDATED', 'installation.tasks', '[prev]', '[new]', user);
        try {
            await settingsApi.updateInstallationTasks(tasks);
        } catch (e) {
            console.error('Failed to persist installation tasks:', e);
        }
    }, [addAudit]);

    const getInstallationTasksState = useCallback(() => installationTasks, [installationTasks]);

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
        (flags[moduleId]?.enabled ?? true) && (flags[moduleId]?.actions?.[actionId] ?? true), [flags]);
    const canRoleDo = useCallback((role, moduleId, actionId) =>
        rbac[role]?.[moduleId]?.[actionId] ?? false, [rbac]);

    /**
     * resolvePermission(userId, roleId, moduleId, actionId)
     * Priority: Backend Matrix (Pre-computed) -> Feature Flag -> User Override -> Custom Role -> Base RBAC -> Admin Fallback
     */
    const resolvePermission = useCallback((userId, roleId, moduleId, actionId) => {
        // STEP 1: Check feature flags first (global kill switch)
        if (!(flags[moduleId]?.enabled ?? true)) return false;
        if (actionId && !(flags[moduleId]?.actions?.[actionId] ?? true)) return false;

        // STEP 2: Admin/Super Admin has full access by default (unless feature flag disabled)
        const normalizedRoleId = roleId?.toLowerCase();
        const isAdminLike = normalizedRoleId === 'admin' 
            || normalizedRoleId === 'superadmin' 
            || normalizedRoleId === 'super-admin'
            || normalizedRoleId === 'manager';
        
        if (isAdminLike) {
            return true; // Admins have full access by default
        }

        // STEP 3: Hard user override (highest priority for specific users)
        const userOvr = userOverrides[userId];
        const hardVal = userOvr?.overrides?.[moduleId]?.[actionId];
        if (hardVal !== undefined && hardVal !== null) return hardVal;

        // 2. Custom role permissions
        // Priority for custom role id:
        //   (a) explicit user override customRoleId
        //   (b) user's roleId itself if it looks like a custom role id
        //   (c) ANY matching role label in customRoles (case-insensitive)
        const explicitCustomRoleId = userOvr?.customRoleId;
        const roleIdAsCustomRoleId = normalizedRoleId?.startsWith('custom_') ? roleId : undefined;
        
        // Try to find matching custom role by ID first
        let candidateCustomRoleId = explicitCustomRoleId || roleIdAsCustomRoleId;
        let customRole = candidateCustomRoleId ? customRoles[candidateCustomRoleId] : undefined;
        
        // If not found by ID, search by role label (case-insensitive match)
        if (!customRole && normalizedRoleId) {
            const matchedByLabel = Object.values(customRoles).find(r => 
                r.label?.toLowerCase() === normalizedRoleId || 
                r.id?.toLowerCase() === normalizedRoleId
            );
            if (matchedByLabel) {
                customRole = matchedByLabel;
            }
        }
        
        if (!customRole && candidateCustomRoleId) {
            const normalizedCandidate = candidateCustomRoleId.toLowerCase();
            const matchedKey = Object.keys(customRoles).find(key => key.toLowerCase() === normalizedCandidate);
            if (matchedKey) customRole = customRoles[matchedKey];
        }

        if (customRole) {
            const perm = customRole.permissions?.[moduleId]?.[actionId];
            console.log(`[PERM DEBUG] Custom role check - Role: ${customRole.label} (${candidateCustomRoleId}), Module: ${moduleId}, Action: ${actionId}`);
            console.log(`[PERM DEBUG] Raw permission value:`, perm, `Type: ${typeof perm}`);
            console.log(`[PERM DEBUG] Full module permissions:`, customRole.permissions[moduleId]);
            
            // CRITICAL FIX: For custom roles, if permission is not explicitly defined,
            // use smart defaults based on action type
            if (perm === undefined || perm === null) {
                console.log(`[PERM DEBUG] Permission undefined/null, defaulting to ${actionId === 'view' ? 'true' : 'false'}`);
                // View permission defaults to TRUE (show module by default)
                if (actionId === 'view') {
                    return true;
                }
                // Other actions (create/edit/delete) default to FALSE
                return false;
            }
            
            // Explicit true = allow, explicit false = deny
            if (perm === true) return true;
            if (perm === false) return false;
            
            // Fallback (shouldn't reach here, but safety net)
            if (actionId === 'view') return true;
            return false;
        }

        console.log(`[PERM DEBUG] No custom role found, falling back to RBAC for role: ${normalizedRoleId || roleId}`);

        // STEP 5: Base RBAC for non-admin roles
        const rbacVal = rbac[normalizedRoleId]?.[moduleId]?.[actionId] ?? rbac[roleId]?.[moduleId]?.[actionId];
        return rbacVal ?? false;
    }, [flags, userOverrides, customRoles, rbac]);

    /** Backward-compat: role-only check (no user id) */
    const hasPermission = useCallback((role, moduleId, actionId) =>
        isModuleEnabled(moduleId) && canRoleDo(role, moduleId, actionId),
        [isModuleEnabled, canRoleDo]);

    const hasPermissionForUser = useCallback((userId, roleId, moduleId, actionId) =>
        resolvePermission(userId, roleId, moduleId, actionId), [resolvePermission]);

    // ── Derived lists ─────────────────────────────────────────────────────────
    const allRoles = useMemo(() => [
        // Base system roles
        ...ROLE_DEFS.map(r => ({ ...r, isBaseRole: true })),
        // Custom roles from settings
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
        // Installation task checklist config
        installationTasks,
        updateInstallationTasks: updateInstallationTasksState,
        getInstallationTasks: getInstallationTasksState,
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
