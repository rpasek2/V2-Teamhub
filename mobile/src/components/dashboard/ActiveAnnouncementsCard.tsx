import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Megaphone, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { useHubStore } from '../../stores/hubStore';
import { supabase } from '../../services/supabase';

interface AnnouncementStat {
    id: string;
    title: string;
    type: 'announcement' | 'questionnaire';
    created_at: string;
    creator_name: string;
    total: number;
    completed: number;
}

export function ActiveAnnouncementsCard() {
    const { t, isDark } = useTheme();
    const currentHub = useHubStore(s => s.currentHub);
    const [announcements, setAnnouncements] = useState<AnnouncementStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (currentHub) fetchAnnouncements();
    }, [currentHub]);

    const fetchAnnouncements = async () => {
        if (!currentHub) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('announcements')
            .select('id, title, type, created_at, profiles!announcements_created_by_fkey(full_name)')
            .eq('hub_id', currentHub.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error || !data) {
            setLoading(false);
            return;
        }

        const ids = data.map(a => a.id);
        if (ids.length === 0) {
            setAnnouncements([]);
            setLoading(false);
            return;
        }

        const { data: recipientStats } = await supabase
            .from('announcement_recipients')
            .select('announcement_id, status')
            .in('announcement_id', ids);

        const statsMap: Record<string, { total: number; completed: number }> = {};
        (recipientStats || []).forEach(r => {
            if (!statsMap[r.announcement_id]) statsMap[r.announcement_id] = { total: 0, completed: 0 };
            statsMap[r.announcement_id].total++;
            if (r.status !== 'pending') statsMap[r.announcement_id].completed++;
        });

        const items: AnnouncementStat[] = data.map(a => ({
            id: a.id,
            title: a.title,
            type: a.type as 'announcement' | 'questionnaire',
            created_at: a.created_at,
            creator_name: (a.profiles as unknown as { full_name: string })?.full_name || 'Unknown',
            total: statsMap[a.id]?.total || 0,
            completed: statsMap[a.id]?.completed || 0,
        }));

        setAnnouncements(items);
        setLoading(false);
    };

    const closeAnnouncement = async (id: string) => {
        const { error } = await supabase
            .from('announcements')
            .update({ is_active: false })
            .eq('id', id);

        if (!error) {
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        }
    };

    if (loading || announcements.length === 0) return null;

    return (
        <View style={[s.container, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[s.header, { borderBottomColor: t.border }]}>
                <Megaphone size={16} color={colors.brand[600]} />
                <Text style={[s.headerTitle, { color: t.text }]}>Active Announcements</Text>
                <View style={[s.badge, { backgroundColor: t.surfaceSecondary }]}>
                    <Text style={[s.badgeText, { color: t.textSecondary }]}>{announcements.length}</Text>
                </View>
            </View>

            {announcements.map(a => {
                const pct = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0;

                return (
                    <View key={a.id} style={[s.item, { borderBottomColor: t.borderSubtle }]}>
                        <View style={s.itemHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.itemTitle, { color: t.text }]} numberOfLines={1}>{a.title}</Text>
                                <Text style={[s.itemMeta, { color: t.textMuted }]}>
                                    {a.creator_name} &middot; {formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}
                                </Text>
                            </View>
                            <View style={s.statsCol}>
                                <Text style={[s.pctText, { color: t.text }]}>{pct}%</Text>
                                <Text style={[s.statsText, { color: t.textMuted }]}>{a.completed}/{a.total}</Text>
                            </View>
                            <TouchableOpacity onPress={() => closeAnnouncement(a.id)} style={s.closeBtn}>
                                <X size={14} color={t.textFaint} />
                            </TouchableOpacity>
                        </View>
                        <View style={[s.progressBar, { backgroundColor: t.surfaceSecondary }]}>
                            <View style={[s.progressFill, { width: `${pct}%` }]} />
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const s = StyleSheet.create({
    container: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], overflow: 'hidden', marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.brand[50], borderBottomWidth: 1, borderBottomColor: colors.slate[200] },
    headerTitle: { fontSize: 13, fontWeight: '600', color: colors.slate[900], flex: 1 },
    badge: { backgroundColor: colors.slate[100], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 11, fontWeight: '600', color: colors.slate[600] },
    item: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
    itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemTitle: { fontSize: 13, fontWeight: '600', color: colors.slate[900] },
    itemMeta: { fontSize: 11, color: colors.slate[500], marginTop: 2 },
    statsCol: { alignItems: 'flex-end' },
    pctText: { fontSize: 14, fontWeight: '700', color: colors.slate[900] },
    statsText: { fontSize: 11, color: colors.slate[500] },
    closeBtn: { padding: 6 },
    progressBar: { height: 4, backgroundColor: colors.slate[100], borderRadius: 2, marginTop: 8, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.brand[500], borderRadius: 2 },
});
