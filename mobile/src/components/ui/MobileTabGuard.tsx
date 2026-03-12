import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHubStore } from '../../stores/hubStore';
import { useTheme } from '../../hooks/useTheme';
import { isTabEnabled } from '../../lib/permissions';

// Map tab IDs to permission feature names where they differ
const TAB_TO_FEATURE: Record<string, string> = {
    private_lessons: 'privateLessons',
    progress_reports: 'progressReports',
};

interface MobileTabGuardProps {
    tabId: string;
    children: React.ReactNode;
}

/**
 * Guards a mobile tab screen against direct/deep link access
 * when the feature tab has been disabled or the user lacks permission.
 */
export function MobileTabGuard({ tabId, children }: MobileTabGuardProps) {
    const currentHub = useHubStore((state) => state.currentHub);
    const hasPermission = useHubStore((state) => state.hasPermission);
    const { t } = useTheme();
    // Wait for hub to load before enforcing guards
    if (!currentHub) return <>{children}</>;

    const enabled = isTabEnabled(tabId, currentHub?.settings?.enabledTabs);
    const featureName = TAB_TO_FEATURE[tabId] || tabId;
    const hasAccess = hasPermission(featureName);

    if (!enabled) {
        return (
            <View style={[styles.container, { backgroundColor: t.background }]}>
                <Text style={[styles.text, { color: t.textMuted }]}>This feature is not available.</Text>
            </View>
        );
    }

    if (!hasAccess) {
        return (
            <View style={[styles.container, { backgroundColor: t.background }]}>
                <Text style={[styles.text, { color: t.textMuted }]}>You don't have permission to view this feature.</Text>
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 16,
    },
});
