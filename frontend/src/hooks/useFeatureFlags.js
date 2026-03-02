/**
 * Solar OS — useFeatureFlags hook
 * Lightweight hook for components that only need feature flag checks
 * without full permission context.
 */
import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';

export function useFeatureFlags() {
    const { flags, isModuleEnabled, isFeatureEnabled, isActionEnabled } = useSettings();

    const isOn = useCallback((moduleId, featureId) => {
        if (!featureId) return isModuleEnabled(moduleId);
        return isFeatureEnabled(moduleId, featureId);
    }, [isModuleEnabled, isFeatureEnabled]);

    const allFlags = useCallback(() => {
        const result = [];
        Object.entries(flags).forEach(([modId, modState]) => {
            result.push({ moduleId: modId, featureId: null, enabled: modState.enabled });
            Object.entries(modState.features || {}).forEach(([featId, val]) => {
                result.push({ moduleId: modId, featureId: featId, enabled: val });
            });
        });
        return result;
    }, [flags]);

    return { isOn, isActionEnabled, allFlags, flags };
}

export default useFeatureFlags;
