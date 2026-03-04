import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
    StyleSheet, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Megaphone, ExternalLink } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { useHubStore } from '../../stores/hubStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../services/supabase';

interface AnnouncementQuestion {
    id: string;
    type: 'multiple_choice' | 'free_text';
    question: string;
    options?: string[];
    required: boolean;
}

interface AnnouncementLink {
    url: string;
    label: string;
}

interface PendingItem {
    recipient_id: string;
    id: string;
    title: string;
    body: string | null;
    type: 'announcement' | 'questionnaire';
    questions: AnnouncementQuestion[] | null;
    links: AnnouncementLink[] | null;
    hub_id: string;
    is_active: boolean;
    expires_at: string | null;
}

export function AnnouncementOverlay() {
    const { t, isDark } = useTheme();
    const currentHub = useHubStore(s => s.currentHub);
    const user = useAuthStore(s => s.user);
    const [pending, setPending] = useState<PendingItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPending = useCallback(async () => {
        if (!currentHub || !user) return;

        const { data, error } = await supabase
            .from('announcement_recipients')
            .select('id, announcement_id, announcements(*)')
            .eq('user_id', user.id)
            .eq('status', 'pending');

        if (error) {
            console.error('Error fetching pending announcements:', error);
            return;
        }

        const items: PendingItem[] = (data || [])
            .filter(r => {
                const arr = r.announcements;
                const a = Array.isArray(arr) ? arr[0] : arr;
                if (!a || !a.is_active) return false;
                if (a.hub_id !== currentHub.id) return false;
                if (a.expires_at && new Date(a.expires_at as string) < new Date()) return false;
                return true;
            })
            .map(r => {
                const arr = r.announcements;
                const a = Array.isArray(arr) ? arr[0] : arr;
                return {
                    recipient_id: r.id,
                    id: a.id as string,
                    title: a.title as string,
                    body: a.body as string | null,
                    type: a.type as 'announcement' | 'questionnaire',
                    questions: a.questions as AnnouncementQuestion[] | null,
                    links: a.links as AnnouncementLink[] | null,
                    hub_id: a.hub_id as string,
                    is_active: a.is_active as boolean,
                    expires_at: a.expires_at as string | null,
                };
            });

        setPending(items);
        setCurrentIndex(0);
        setResponses({});
    }, [currentHub, user]);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    const current = pending[currentIndex];
    if (!current) return null;

    const questions: AnnouncementQuestion[] = current.questions || [];

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);

        if (current.type === 'questionnaire') {
            const missing = questions.filter(q => q.required && !responses[q.id]?.trim());
            if (missing.length > 0) {
                setError('Please answer all required questions.');
                setSubmitting(false);
                return;
            }
        }

        const questionResponses = current.type === 'questionnaire'
            ? questions.map(q => ({ question_id: q.id, answer: responses[q.id] || '' }))
            : null;

        const { error: updateError } = await supabase
            .from('announcement_recipients')
            .update({
                status: current.type === 'questionnaire' ? 'completed' : 'acknowledged',
                responses: questionResponses,
                completed_at: new Date().toISOString(),
            })
            .eq('id', current.recipient_id);

        if (updateError) {
            console.error('Error acknowledging:', updateError);
            setError('Failed to submit. Please try again.');
        } else {
            setResponses({});
            setError(null);
            if (currentIndex + 1 < pending.length) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setPending([]);
            }
        }
        setSubmitting(false);
    };

    const openLink = (url: string) => {
        Linking.openURL(url).catch(err => console.error('Error opening link:', err));
    };

    return (
        <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
            <View style={[s.backdrop, { backgroundColor: t.overlay }]}>
                <SafeAreaView style={s.cardWrapper} edges={['top', 'bottom']}>
                    <View style={[s.card, { backgroundColor: t.surface }]}>
                        {/* Header */}
                        <View style={[s.header, { borderBottomColor: t.border }]}>
                            <View style={s.iconBox}>
                                <Megaphone size={20} color={colors.brand[600]} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.title, { color: t.text }]} numberOfLines={2}>{current.title}</Text>
                                {pending.length > 1 && (
                                    <Text style={[s.counter, { color: t.textMuted }]}>{currentIndex + 1} of {pending.length}</Text>
                                )}
                            </View>
                        </View>

                        {/* Body */}
                        <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>
                            {current.body && (
                                <Text style={[s.bodyText, { color: t.textSecondary }]}>{current.body}</Text>
                            )}

                            {/* Links */}
                            {current.links && current.links.length > 0 && (
                                <View style={s.linksSection}>
                                    {current.links.map((link, idx) => (
                                        <TouchableOpacity key={idx} onPress={() => openLink(link.url)} style={s.linkRow}>
                                            <ExternalLink size={14} color={colors.brand[600]} />
                                            <Text style={s.linkText}>{link.label || link.url}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Questions */}
                            {current.type === 'questionnaire' && questions.length > 0 && (
                                <View style={s.questionsSection}>
                                    {questions.map((q, idx) => (
                                        <View key={q.id} style={s.questionBlock}>
                                            <Text style={[s.questionText, { color: t.text }]}>
                                                {idx + 1}. {q.question}
                                                {q.required && <Text style={{ color: '#ef4444' }}> *</Text>}
                                            </Text>
                                            {q.type === 'multiple_choice' ? (
                                                <View style={{ gap: 6 }}>
                                                    {(q.options || []).map((opt, oIdx) => (
                                                        <TouchableOpacity
                                                            key={oIdx}
                                                            onPress={() => setResponses(prev => ({ ...prev, [q.id]: opt }))}
                                                            style={s.optionRow}
                                                        >
                                                            <View style={[s.radio, responses[q.id] === opt && s.radioActive]}>
                                                                {responses[q.id] === opt && <View style={s.radioDot} />}
                                                            </View>
                                                            <Text style={[s.optionText, { color: t.textSecondary }]}>{opt}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            ) : (
                                                <TextInput
                                                    style={[s.textArea, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
                                                    value={responses[q.id] || ''}
                                                    onChangeText={v => setResponses(prev => ({ ...prev, [q.id]: v }))}
                                                    placeholder="Your answer..."
                                                    placeholderTextColor={t.textFaint}
                                                    multiline
                                                />
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}

                            {error && (
                                <View style={s.errorBox}>
                                    <Text style={s.errorText}>{error}</Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Footer */}
                        <View style={[s.footer, { borderTopColor: t.border }]}>
                            <TouchableOpacity onPress={handleSubmit} style={[s.submitBtn, submitting && { opacity: 0.5 }]} disabled={submitting}>
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={s.submitBtnText}>
                                        {current.type === 'questionnaire' ? 'Submit Responses' : 'I Acknowledge'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center' },
    cardWrapper: { width: '100%', paddingHorizontal: 20, maxHeight: '90%' },
    card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: '100%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.slate[200] },
    iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.brand[50], alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 17, fontWeight: '700', color: colors.slate[900] },
    counter: { fontSize: 12, color: colors.slate[500], marginTop: 2 },
    body: { maxHeight: 400 },
    bodyContent: { padding: 20, gap: 16 },
    bodyText: { fontSize: 14, lineHeight: 20, color: colors.slate[700] },
    linksSection: { gap: 8 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    linkText: { fontSize: 14, fontWeight: '500', color: colors.brand[600] },
    questionsSection: { gap: 16 },
    questionBlock: { gap: 8 },
    questionText: { fontSize: 14, fontWeight: '600', color: colors.slate[900] },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 4 },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.slate[300], alignItems: 'center', justifyContent: 'center' },
    radioActive: { borderColor: colors.brand[500] },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand[500] },
    optionText: { fontSize: 14, color: colors.slate[700] },
    textArea: { borderWidth: 1, borderColor: colors.slate[300], borderRadius: 8, padding: 10, fontSize: 14, color: colors.slate[900], minHeight: 60, textAlignVertical: 'top' },
    errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12 },
    errorText: { fontSize: 13, color: '#b91c1c' },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.slate[200] },
    submitBtn: { backgroundColor: colors.brand[600], borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
