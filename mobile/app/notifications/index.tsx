import React, { useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, CheckCheck, Bell, MessageCircle, Users,
    CalendarDays, Trophy, Medal, Sparkles, ClipboardCheck,
    ShoppingBag, FolderOpen, BellOff, Briefcase, CalendarOff, GraduationCap
} from 'lucide-react-native';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useActivityFeedStore, type ActivityNotification, type NotificationType } from '../../src/stores/activityFeedStore';

const NOTIFICATION_ICONS: Record<NotificationType, typeof MessageCircle> = {
    message: MessageCircle,
    post: Users,
    event: CalendarDays,
    competition: Trophy,
    score: Medal,
    skill: Sparkles,
    assignment: ClipboardCheck,
    marketplace_item: ShoppingBag,
    resource: FolderOpen,
    staff_task: Briefcase,
    staff_time_off: CalendarOff,
    private_lesson: GraduationCap,
};

const NOTIFICATION_COLORS: Record<NotificationType, { bg: string; text: string }> = {
    message: { bg: colors.brand[50], text: colors.brand[600] },
    post: { bg: colors.purple[50], text: colors.purple[600] },
    event: { bg: colors.indigo[50], text: colors.indigo[600] },
    competition: { bg: colors.amber[50], text: colors.amber[600] },
    score: { bg: colors.emerald[50], text: colors.emerald[600] },
    skill: { bg: '#fdf2f8', text: colors.pink?.[600] || '#db2777' },
    assignment: { bg: colors.blue[50], text: colors.blue[600] },
    marketplace_item: { bg: '#fff7ed', text: '#ea580c' },
    resource: { bg: colors.slate[100], text: colors.slate[600] },
    staff_task: { bg: colors.blue[50], text: colors.blue[600] },
    staff_time_off: { bg: colors.amber[50], text: colors.amber[600] },
    private_lesson: { bg: colors.brand[50], text: colors.brand[600] },
};

function navigateToNotification(notification: ActivityNotification) {
    switch (notification.reference_type) {
        case 'channel':
            router.push(`/chat/${notification.reference_id}` as never);
            break;
        case 'group':
            router.push(`/group/${notification.reference_id}` as never);
            break;
        case 'event':
            router.push('/(tabs)/calendar' as never);
            break;
        case 'competition':
            router.push(`/competitions/${notification.reference_id}` as never);
            break;
        case 'assignment':
            router.push('/(tabs)/assignments' as never);
            break;
        case 'skill':
            router.push('/(tabs)/skills' as never);
            break;
        case 'marketplace_item':
            router.push('/marketplace' as never);
            break;
        case 'resource':
            router.push('/resources' as never);
            break;
        case 'staff_task':
        case 'staff_time_off':
            router.push('/staff/' as never);
            break;
        case 'lesson_booking':
            router.push('/private-lessons/' as never);
            break;
    }
}

export default function NotificationsScreen() {
    const currentHub = useHubStore((s) => s.currentHub);
    const user = useAuthStore((s) => s.user);
    const {
        notifications, loading, loadingMore, hasMore, unreadCount,
        fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead,
    } = useActivityFeedStore();

    const loadData = useCallback(() => {
        if (currentHub && user) {
            fetchNotifications(currentHub.id, user.id, true);
            fetchUnreadCount(currentHub.id, user.id);
        }
    }, [currentHub?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleNotificationPress = async (notification: ActivityNotification) => {
        if (!notification.is_read && user) {
            await markAsRead(notification.id, user.id);
        }
        navigateToNotification(notification);
    };

    const handleMarkAllRead = () => {
        if (currentHub && user) {
            markAllAsRead(currentHub.id, user.id);
        }
    };

    const handleLoadMore = () => {
        if (hasMore && !loadingMore && currentHub && user) {
            fetchNotifications(currentHub.id, user.id, false);
        }
    };

    const renderNotification = ({ item }: { item: ActivityNotification }) => {
        const Icon = NOTIFICATION_ICONS[item.type] || Bell;
        const colorSet = NOTIFICATION_COLORS[item.type] || { bg: colors.slate[100], text: colors.slate[600] };

        return (
            <TouchableOpacity
                style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: colorSet.bg }]}>
                    <Icon size={16} color={colorSet.text} />
                </View>
                <View style={styles.contentContainer}>
                    <Text
                        style={[styles.title, !item.is_read && styles.unreadTitle]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    {item.body ? (
                        <Text style={styles.body} numberOfLines={1}>
                            {item.body}
                        </Text>
                    ) : null}
                    <Text style={styles.timestamp}>
                        {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
                    </Text>
                </View>
                {!item.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.slate[700]} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
                            <CheckCheck size={20} color={colors.brand[600]} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => router.push('/settings/notifications' as never)}
                        style={styles.settingsButton}
                    >
                        <Text style={styles.settingsText}>Settings</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Notification List */}
            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={loadData}
                        tintColor={theme.light.primary}
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.loadingMore}>
                            <ActivityIndicator size="small" color={theme.light.primary} />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <BellOff size={40} color={colors.slate[300]} />
                            <Text style={styles.emptyTitle}>You're all caught up!</Text>
                            <Text style={styles.emptySubtitle}>No new notifications</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[200],
    },
    backButton: {
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: colors.slate[900],
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    markAllButton: {
        padding: 6,
    },
    settingsButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    settingsText: {
        fontSize: 14,
        color: colors.brand[600],
        fontWeight: '500',
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[100],
    },
    unreadItem: {
        backgroundColor: `${colors.brand[50]}40`,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        color: colors.slate[700],
    },
    unreadTitle: {
        fontWeight: '600',
        color: colors.slate[900],
    },
    body: {
        fontSize: 13,
        color: colors.slate[500],
        marginTop: 2,
    },
    timestamp: {
        fontSize: 12,
        color: colors.slate[400],
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.brand[500],
        marginTop: 6,
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.slate[500],
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: colors.slate[400],
        marginTop: 4,
    },
    loadingMore: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});
