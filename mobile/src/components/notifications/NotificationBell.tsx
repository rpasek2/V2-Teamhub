import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors } from '../../constants/colors';
import { useActivityFeedStore } from '../../stores/activityFeedStore';

export function NotificationBell() {
    const unreadCount = useActivityFeedStore((s) => s.unreadCount);

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
        >
            <Bell size={22} color={colors.slate[600]} />
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 8,
        borderRadius: 10,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.error[500],
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: '700',
    },
});
