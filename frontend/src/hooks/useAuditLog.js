import { create } from 'zustand';

/**
 * Audit Log Store & Hook
 * Standardized logging for all CRUD operations as per Rulebook Section 8.
 */
const useAuditLogStore = create((set) => ({
    logs: [],
    addLog: (log) => set((state) => ({
        logs: [
            {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                module: log.module,
                action: log.action, // 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'RESTORE'
                entityId: log.entityId,
                entityName: log.entityName,
                performedBy: log.user || 'System',
                changes: log.changes || null, // { field: { old, new } }
                tenantId: log.tenantId || 'default'
            },
            ...state.logs
        ]
    })),
    clearLogs: () => set({ logs: [] })
}));

export const useAuditLog = (moduleName) => {
    const { logs, addLog } = useAuditLogStore();

    const logAction = (action, entity, changes = null) => {
        addLog({
            module: moduleName,
            action,
            entityId: entity.id,
            entityName: entity.name || entity.title,
            changes
        });
    };

    const moduleLogs = logs.filter(l => l.module === moduleName);

    return {
        logs: moduleLogs,
        logCreate: (entity) => logAction('CREATE', entity),
        logUpdate: (entity, changes) => logAction('UPDATE', entity, changes),
        logDelete: (entity) => logAction('DELETE', entity),
        logStatusChange: (entity, oldStatus, newStatus) =>
            logAction('STATUS_CHANGE', entity, { status: { old: oldStatus, new: newStatus } }),
        logRestore: (entity) => logAction('RESTORE', entity),
    };
};

export default useAuditLog;
