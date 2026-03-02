import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
    MessageCircle, Users, CalendarDays, Trophy, Medal,
    Sparkles, ClipboardCheck, ShoppingBag, FolderOpen,
} from 'lucide-react-native';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useActivityFeedStore, type UserNotificationPreferences } from '../../src/stores/activityFeedStore';

type PrefKey = keyof Omit<UserNotificationPreferences, 'id' | 'user_id' | 'hub_id' | 'created_at' | 'updated_at'>;

const FEATURES: { key: PrefKey; label: string; description: string; icon: typeof MessageCircle }[] = [
    { key: 'messages_enabled', label: 'Messages', description: 'Direct messages and channels', icon: MessageCircle },
    { key: 'groups_enabled', label: 'Groups', description: 'Group posts and updates', icon: Users },
    { key: 'calendar_enabled', label: 'Calendar', description: 'New events and changes', icon: CalendarDays },
    { key: 'competitions_enabled', label: 'Competitions', description: 'New competitions added', icon: Trophy },
    { key: 'scores_enabled', label: 'Scores', description: 'New competition scores', icon: Medal },
    { key: 'skills_enabled', label: 'Skills', description: 'Skill status changes', icon: Sparkles },
    { key: 'assignments_enabled', label: 'Assignments', description: 'New practice assignments', icon: ClipboardCheck },
    { key: 'marketplace_enabled', label: 'Marketplace', description: 'New items for sale', icon: ShoppingBag },
    { key: 'resources_enabled', label: 'Resources', description: 'New shared resources', icon: FolderOpen },
];

export default function NotificationSettingsScreen() {
    const { t, isDark } = useTheme();
    const currentHub = useHubStore((s) => s.currentHub);
    const user = useAuthStore((s) => s.user);
    const { preferences, fetchPreferences, updatePreferences } = useActivityFeedStore();

    useEffect(() => {
        if (currentHub && user) {
            fetchPreferences(currentHub.id, user.id);
        }
    }, [currentHub?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const isEnabled = (key: PrefKey) => {
        if (!preferences) return true;
        return preferences[key] as boolean;
    };

    const toggleFeature = (key: PrefKey) => {
        if (!currentHub || !user) return;
        updatePreferences(currentHub.id, user.id, { [key]: !isEnabled(key) });
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={[styles.container, { backgroundColor: t.surface }]} edges={['top']}>
                <View style={[styles.header, { borderBottomColor: t.border }]}>
                    <Text style={[styles.headerTitle, { color: t.text }]}>Notification Preferences</Text>
                    {currentHub && (
                        <Text style={[styles.headerSubtitle, { color: t.textMuted }]}>{currentHub.name}</Text>
                    )}
                </View>

                <ScrollView style={styles.content}>
                    <Text style={[styles.sectionDescription, { color: t.textMuted }]}>
                        Choose which features show badges and appear in your notification feed.
                    </Text>

                    {FEATURES.map(({ key, label, description, icon: Icon }) => (
                        <View key={key} style={[styles.featureRow, { borderBottomColor: t.borderSubtle }]}>
                            <View style={[styles.iconWrapper, { backgroundColor: t.surfaceSecondary }]}>
                                <Icon size={18} color={t.textSecondary} />
                            </View>
                            <View style={styles.featureText}>
                                <Text style={[styles.featureLabel, { color: t.text }]}>{label}</Text>
                                <Text style={[styles.featureDescription, { color: t.textMuted }]}>{description}</Text>
                            </View>
                            <Switch
                                value={isEnabled(key)}
                                onValueChange={() => toggleFeature(key)}
                                trackColor={{ false: t.border, true: t.primary }}
                                thumbColor={colors.white}
                            />
                        </View>
                    ))}

                    <View style={styles.bottomPadding} />
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[200],
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.slate[900],
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.slate[500],
        marginTop: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sectionDescription: {
        fontSize: 14,
        color: colors.slate[500],
        paddingVertical: 16,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[100],
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.slate[100],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    featureText: {
        flex: 1,
    },
    featureLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.slate[900],
    },
    featureDescription: {
        fontSize: 13,
        color: colors.slate[500],
        marginTop: 1,
    },
    bottomPadding: {
        height: 40,
    },
});
