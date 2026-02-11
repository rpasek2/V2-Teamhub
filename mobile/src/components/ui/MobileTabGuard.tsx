import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHubStore } from '../../stores/hubStore';
import { isTabEnabled } from '../../lib/permissions';
import { colors } from '../../constants/colors';

interface MobileTabGuardProps {
    tabId: string;
    children: React.ReactNode;
}

/**
 * Guards a mobile tab screen against direct/deep link access
 * when the feature tab has been disabled by the hub owner.
 */
export function MobileTabGuard({ tabId, children }: MobileTabGuardProps) {
    const { currentHub } = useHubStore();
    const enabled = isTabEnabled(tabId, currentHub?.settings?.enabledTabs);

    if (!enabled) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>This feature is not available.</Text>
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
        backgroundColor: colors.slate[50],
    },
    text: {
        fontSize: 16,
        color: colors.slate[500],
    },
});
