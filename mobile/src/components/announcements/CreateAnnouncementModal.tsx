import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Trash2, Link as LinkIcon } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useHubStore } from '../../stores/hubStore';
import { supabase } from '../../services/supabase';

interface CreateAnnouncementModalProps {
    visible: boolean;
    onClose: () => void;
    onCreated: () => void;
}

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

type TargetMode = 'all' | 'roles' | 'members';

const ROLE_OPTIONS = [
    { value: 'owner', label: 'Owner' },
    { value: 'director', label: 'Director' },
    { value: 'admin', label: 'Admin' },
    { value: 'coach', label: 'Coach' },
    { value: 'parent', label: 'Parent' },
    { value: 'athlete', label: 'Athlete' },
];

export function CreateAnnouncementModal({ visible, onClose, onCreated }: CreateAnnouncementModalProps) {
    const currentHub = useHubStore(s => s.currentHub);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [type, setType] = useState<'announcement' | 'questionnaire'>('announcement');
    const [targetMode, setTargetMode] = useState<TargetMode>('all');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [questions, setQuestions] = useState<AnnouncementQuestion[]>([]);
    const [links, setLinks] = useState<AnnouncementLink[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [members, setMembers] = useState<{ id: string; full_name: string; email: string; role: string }[]>([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [loadingMembers, setLoadingMembers] = useState(false);

    const levels: string[] = (currentHub?.settings as Record<string, unknown>)?.levels as string[] || [];

    useEffect(() => {
        if (targetMode === 'members' && currentHub && members.length === 0) {
            fetchMembers();
        }
    }, [targetMode, currentHub]);

    const fetchMembers = async () => {
        if (!currentHub) return;
        setLoadingMembers(true);
        const { data } = await supabase
            .from('hub_members')
            .select('user_id, role, profiles(id, full_name, email)')
            .eq('hub_id', currentHub.id)
            .eq('status', 'active');

        if (data) {
            const mapped = data
                .filter(m => m.profiles)
                .map(m => {
                    const p = m.profiles as unknown as { id: string; full_name: string; email: string };
                    return { id: p.id, full_name: p.full_name, email: p.email, role: m.role };
                });
            setMembers(mapped);
        }
        setLoadingMembers(false);
    };

    const resetForm = () => {
        setTitle('');
        setBody('');
        setType('announcement');
        setTargetMode('all');
        setSelectedRoles([]);
        setSelectedLevels([]);
        setSelectedMemberIds([]);
        setQuestions([]);
        setLinks([]);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const toggleRole = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const toggleLevel = (level: string) => {
        setSelectedLevels(prev =>
            prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
        );
    };

    const toggleMember = (userId: string) => {
        setSelectedMemberIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const addQuestion = () => {
        setQuestions(prev => [...prev, {
            id: `q-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: 'multiple_choice',
            question: '',
            options: ['', ''],
            required: true,
        }]);
    };

    const updateQuestion = (idx: number, updates: Partial<AnnouncementQuestion>) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
    };

    const removeQuestion = (idx: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    const addOption = (qIdx: number) => {
        setQuestions(prev => prev.map((q, i) =>
            i === qIdx ? { ...q, options: [...(q.options || []), ''] } : q
        ));
    };

    const updateOption = (qIdx: number, oIdx: number, value: string) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            const opts = [...(q.options || [])];
            opts[oIdx] = value;
            return { ...q, options: opts };
        }));
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            return { ...q, options: (q.options || []).filter((_, j) => j !== oIdx) };
        }));
    };

    const addLink = () => setLinks(prev => [...prev, { url: '', label: '' }]);
    const updateLink = (idx: number, updates: Partial<AnnouncementLink>) => {
        setLinks(prev => prev.map((l, i) => i === idx ? { ...l, ...updates } : l));
    };
    const removeLink = (idx: number) => setLinks(prev => prev.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (!currentHub || !title.trim()) {
            setError('Title is required.');
            return;
        }
        if (targetMode === 'roles' && selectedRoles.length === 0) {
            setError('Select at least one role.');
            return;
        }
        if (targetMode === 'members' && selectedMemberIds.length === 0) {
            setError('Select at least one member.');
            return;
        }
        if (type === 'questionnaire' && questions.length === 0) {
            setError('Add at least one question.');
            return;
        }

        setSubmitting(true);
        setError(null);

        const validLinks = links.filter(l => l.url.trim());
        const validQuestions = type === 'questionnaire' ? questions.filter(q => q.question.trim()) : null;

        const { error: rpcError } = await supabase.rpc('create_announcement', {
            p_hub_id: currentHub.id,
            p_title: title.trim(),
            p_body: body.trim() || null,
            p_type: type,
            p_target_roles: targetMode === 'roles' ? selectedRoles : null,
            p_target_levels: targetMode === 'roles' && selectedLevels.length > 0 ? selectedLevels : null,
            p_target_member_ids: targetMode === 'members' ? selectedMemberIds : null,
            p_questions: validQuestions,
            p_links: validLinks.length > 0 ? validLinks : null,
            p_expires_at: null,
        });

        if (rpcError) {
            console.error('Error creating announcement:', rpcError);
            setError('Failed to create announcement.');
        } else {
            onCreated();
            handleClose();
        }
        setSubmitting(false);
    };

    const filteredMembers = members.filter(m =>
        !memberSearch || m.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
            <SafeAreaView style={s.container} edges={['top', 'bottom']}>
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    {/* Header */}
                    <View style={s.header}>
                        <Text style={s.headerTitle}>Create Announcement</Text>
                        <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
                            <X size={20} color={colors.slate[500]} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={s.body} contentContainerStyle={s.bodyContent} keyboardShouldPersistTaps="handled">
                        {error && (
                            <View style={s.errorBox}>
                                <Text style={s.errorText}>{error}</Text>
                            </View>
                        )}

                        {/* Title */}
                        <Text style={s.label}>Title *</Text>
                        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Announcement title" placeholderTextColor={colors.slate[400]} />

                        {/* Body */}
                        <Text style={s.label}>Message</Text>
                        <TextInput style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={body} onChangeText={setBody} placeholder="Optional message..." placeholderTextColor={colors.slate[400]} multiline />

                        {/* Type Toggle */}
                        <Text style={s.label}>Type</Text>
                        <View style={s.pillRow}>
                            {(['announcement', 'questionnaire'] as const).map(t => (
                                <TouchableOpacity key={t} onPress={() => setType(t)} style={[s.pill, type === t && s.pillActive]}>
                                    <Text style={[s.pillText, type === t && s.pillTextActive]}>
                                        {t === 'announcement' ? 'Announcement' : 'Questionnaire'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Targeting */}
                        <Text style={s.label}>Target Audience</Text>
                        <View style={s.pillRow}>
                            {([['all', 'All Members'], ['roles', 'By Role'], ['members', 'Specific']] as [TargetMode, string][]).map(([mode, label]) => (
                                <TouchableOpacity key={mode} onPress={() => setTargetMode(mode)} style={[s.pill, targetMode === mode && s.pillActive]}>
                                    <Text style={[s.pillText, targetMode === mode && s.pillTextActive]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {targetMode === 'roles' && (
                            <View style={s.indent}>
                                <View style={s.chipRow}>
                                    {ROLE_OPTIONS.map(r => (
                                        <TouchableOpacity key={r.value} onPress={() => toggleRole(r.value)} style={[s.chip, selectedRoles.includes(r.value) && s.chipActive]}>
                                            <Text style={[s.chipText, selectedRoles.includes(r.value) && s.chipTextActive]}>{r.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {levels.length > 0 && (
                                    <>
                                        <Text style={s.subLabel}>Filter by level (optional)</Text>
                                        <View style={s.chipRow}>
                                            {levels.map(l => (
                                                <TouchableOpacity key={l} onPress={() => toggleLevel(l)} style={[s.chip, selectedLevels.includes(l) && s.chipActiveIndigo]}>
                                                    <Text style={[s.chipText, selectedLevels.includes(l) && s.chipTextActiveIndigo]}>{l}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                )}
                            </View>
                        )}

                        {targetMode === 'members' && (
                            <View style={s.indent}>
                                <TextInput style={s.input} value={memberSearch} onChangeText={setMemberSearch} placeholder="Search members..." placeholderTextColor={colors.slate[400]} />
                                {loadingMembers ? (
                                    <ActivityIndicator style={{ marginTop: 12 }} color={colors.brand[500]} />
                                ) : (
                                    <View style={s.memberList}>
                                        {filteredMembers.slice(0, 20).map(m => (
                                            <TouchableOpacity key={m.id} onPress={() => toggleMember(m.id)} style={s.memberRow}>
                                                <View style={[s.checkbox, selectedMemberIds.includes(m.id) && s.checkboxActive]} />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={s.memberName}>{m.full_name}</Text>
                                                    <Text style={s.memberEmail}>{m.role}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                {selectedMemberIds.length > 0 && (
                                    <Text style={s.subLabel}>{selectedMemberIds.length} selected</Text>
                                )}
                            </View>
                        )}

                        {/* Links */}
                        <View style={s.sectionHeader}>
                            <Text style={s.label}>Links</Text>
                            <TouchableOpacity onPress={addLink} style={s.addBtn}>
                                <Plus size={14} color={colors.brand[600]} />
                                <Text style={s.addBtnText}>Add Link</Text>
                            </TouchableOpacity>
                        </View>
                        {links.map((link, idx) => (
                            <View key={idx} style={s.linkRow}>
                                <LinkIcon size={14} color={colors.slate[400]} />
                                <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={link.label} onChangeText={v => updateLink(idx, { label: v })} placeholder="Label" placeholderTextColor={colors.slate[400]} />
                                <TextInput style={[s.input, { flex: 2, marginBottom: 0 }]} value={link.url} onChangeText={v => updateLink(idx, { url: v })} placeholder="https://..." placeholderTextColor={colors.slate[400]} autoCapitalize="none" keyboardType="url" />
                                <TouchableOpacity onPress={() => removeLink(idx)}>
                                    <Trash2 size={16} color={colors.slate[400]} />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Questions (questionnaire only) */}
                        {type === 'questionnaire' && (
                            <>
                                <View style={s.sectionHeader}>
                                    <Text style={s.label}>Questions</Text>
                                    <TouchableOpacity onPress={addQuestion} style={s.addBtn}>
                                        <Plus size={14} color={colors.brand[600]} />
                                        <Text style={s.addBtnText}>Add Question</Text>
                                    </TouchableOpacity>
                                </View>
                                {questions.map((q, qIdx) => (
                                    <View key={q.id} style={s.questionCard}>
                                        <View style={s.questionHeader}>
                                            <Text style={s.questionNum}>{qIdx + 1}.</Text>
                                            <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={q.question} onChangeText={v => updateQuestion(qIdx, { question: v })} placeholder="Question text" placeholderTextColor={colors.slate[400]} />
                                            <TouchableOpacity onPress={() => removeQuestion(qIdx)}>
                                                <Trash2 size={16} color={colors.slate[400]} />
                                            </TouchableOpacity>
                                        </View>
                                        <View style={s.pillRow}>
                                            <TouchableOpacity onPress={() => updateQuestion(qIdx, { type: 'multiple_choice', options: q.options || ['', ''] })} style={[s.pillSm, q.type === 'multiple_choice' && s.pillActive]}>
                                                <Text style={[s.pillSmText, q.type === 'multiple_choice' && s.pillTextActive]}>Multiple Choice</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => updateQuestion(qIdx, { type: 'free_text', options: undefined })} style={[s.pillSm, q.type === 'free_text' && s.pillActive]}>
                                                <Text style={[s.pillSmText, q.type === 'free_text' && s.pillTextActive]}>Free Text</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {q.type === 'multiple_choice' && (q.options || []).map((opt, oIdx) => (
                                            <View key={oIdx} style={s.optionRow}>
                                                <View style={s.radioCircle} />
                                                <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={opt} onChangeText={v => updateOption(qIdx, oIdx, v)} placeholder={`Option ${oIdx + 1}`} placeholderTextColor={colors.slate[400]} />
                                                {(q.options || []).length > 2 && (
                                                    <TouchableOpacity onPress={() => removeOption(qIdx, oIdx)}>
                                                        <Trash2 size={14} color={colors.slate[400]} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}
                                        {q.type === 'multiple_choice' && (
                                            <TouchableOpacity onPress={() => addOption(qIdx)} style={{ marginLeft: 20, marginTop: 4 }}>
                                                <Text style={{ fontSize: 12, color: colors.brand[600], fontWeight: '600' }}>+ Add Option</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                            </>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={s.footer}>
                        <TouchableOpacity onPress={handleClose} style={s.cancelBtn} disabled={submitting}>
                            <Text style={s.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSubmit} style={[s.submitBtn, (!title.trim() || submitting) && { opacity: 0.5 }]} disabled={submitting || !title.trim()}>
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={s.submitBtnText}>Send</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.slate[200] },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.slate[900] },
    closeBtn: { padding: 4 },
    body: { flex: 1 },
    bodyContent: { padding: 16, paddingBottom: 32 },
    errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 12 },
    errorText: { fontSize: 13, color: '#b91c1c' },
    label: { fontSize: 13, fontWeight: '600', color: colors.slate[700], marginBottom: 6, marginTop: 16 },
    subLabel: { fontSize: 11, color: colors.slate[500], marginTop: 8, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: colors.slate[300], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.slate[900], marginBottom: 4 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.slate[100] },
    pillActive: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.slate[300], shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    pillText: { fontSize: 13, fontWeight: '500', color: colors.slate[500] },
    pillTextActive: { color: colors.slate[900] },
    pillSm: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: colors.slate[100] },
    pillSmText: { fontSize: 11, fontWeight: '500', color: colors.slate[500] },
    indent: { marginLeft: 8, marginTop: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: '#fff' },
    chipActive: { borderColor: colors.brand[300], backgroundColor: colors.brand[50] },
    chipText: { fontSize: 12, fontWeight: '500', color: colors.slate[600] },
    chipTextActive: { color: colors.brand[700] },
    chipActiveIndigo: { borderColor: '#a5b4fc', backgroundColor: '#eef2ff' },
    chipTextActiveIndigo: { color: '#4338ca' },
    memberList: { borderWidth: 1, borderColor: colors.slate[200], borderRadius: 8, marginTop: 8, maxHeight: 200 },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: colors.slate[300] },
    checkboxActive: { backgroundColor: colors.brand[500], borderColor: colors.brand[500] },
    memberName: { fontSize: 13, fontWeight: '500', color: colors.slate[900] },
    memberEmail: { fontSize: 11, color: colors.slate[500] },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addBtnText: { fontSize: 12, fontWeight: '600', color: colors.brand[600] },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    questionCard: { borderWidth: 1, borderColor: colors.slate[200], borderRadius: 8, padding: 12, marginTop: 8 },
    questionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    questionNum: { fontSize: 12, fontWeight: '600', color: colors.slate[500] },
    optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 12 },
    radioCircle: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.slate[300] },
    footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.slate[200] },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.slate[300], alignItems: 'center' },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.slate[700] },
    submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.brand[600], alignItems: 'center' },
    submitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
