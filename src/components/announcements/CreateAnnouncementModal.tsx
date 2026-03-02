import { useState, useEffect } from 'react';
import { Plus, Trash2, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useHub } from '../../context/HubContext';
import { supabase } from '../../lib/supabase';
import type { AnnouncementQuestion, AnnouncementLink, Profile } from '../../types';

interface CreateAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
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

export function CreateAnnouncementModal({ isOpen, onClose, onCreated }: CreateAnnouncementModalProps) {
    const { hub } = useHub();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [type, setType] = useState<'announcement' | 'questionnaire'>('announcement');
    const [targetMode, setTargetMode] = useState<TargetMode>('all');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [questions, setQuestions] = useState<AnnouncementQuestion[]>([]);
    const [links, setLinks] = useState<AnnouncementLink[]>([]);
    const [expiresAt, setExpiresAt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // For member picker
    const [members, setMembers] = useState<(Profile & { role: string })[]>([]);
    const [memberSearch, setMemberSearch] = useState('');
    const [loadingMembers, setLoadingMembers] = useState(false);

    const levels = hub?.settings?.levels || [];

    // Fetch members when switching to member targeting
    useEffect(() => {
        if (targetMode === 'members' && hub && members.length === 0) {
            fetchMembers();
        }
    }, [targetMode, hub]);

    const fetchMembers = async () => {
        if (!hub) return;
        setLoadingMembers(true);
        const { data, error } = await supabase
            .from('hub_members')
            .select('user_id, role, profiles(id, full_name, email, avatar_url)')
            .eq('hub_id', hub.id)
            .eq('status', 'active');

        if (!error && data) {
            const mapped = data
                .filter(m => m.profiles)
                .map(m => ({
                    ...(m.profiles as unknown as Profile),
                    role: m.role,
                }));
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
        setExpiresAt('');
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const addQuestion = () => {
        setQuestions(prev => [...prev, {
            id: crypto.randomUUID(),
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

    const addOptionToQuestion = (qIdx: number) => {
        setQuestions(prev => prev.map((q, i) =>
            i === qIdx ? { ...q, options: [...(q.options || []), ''] } : q
        ));
    };

    const updateOption = (qIdx: number, oIdx: number, value: string) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            const options = [...(q.options || [])];
            options[oIdx] = value;
            return { ...q, options };
        }));
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            return { ...q, options: (q.options || []).filter((_, j) => j !== oIdx) };
        }));
    };

    const addLink = () => {
        setLinks(prev => [...prev, { url: '', label: '' }]);
    };

    const updateLink = (idx: number, updates: Partial<AnnouncementLink>) => {
        setLinks(prev => prev.map((l, i) => i === idx ? { ...l, ...updates } : l));
    };

    const removeLink = (idx: number) => {
        setLinks(prev => prev.filter((_, i) => i !== idx));
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

    const handleSubmit = async () => {
        if (!hub || !title.trim()) {
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
            p_hub_id: hub.id,
            p_title: title.trim(),
            p_body: body.trim() || null,
            p_type: type,
            p_target_roles: targetMode === 'roles' ? selectedRoles : null,
            p_target_levels: targetMode === 'roles' && selectedLevels.length > 0 ? selectedLevels : null,
            p_target_member_ids: targetMode === 'members' ? selectedMemberIds : null,
            p_questions: validQuestions,
            p_links: validLinks.length > 0 ? validLinks : null,
            p_expires_at: expiresAt || null,
        });

        if (rpcError) {
            console.error('Error creating announcement:', rpcError);
            setError('Failed to create announcement. Please try again.');
        } else {
            onCreated();
            handleClose();
        }
        setSubmitting(false);
    };

    const filteredMembers = members.filter(m =>
        !memberSearch || m.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
            || m.email?.toLowerCase().includes(memberSearch.toLowerCase())
    );

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create Announcement" size="lg">
            <div className="space-y-5">
                {error && (
                    <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-body mb-1">Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="input w-full"
                        placeholder="Announcement title"
                    />
                </div>

                {/* Body */}
                <div>
                    <label className="block text-sm font-medium text-body mb-1">Message</label>
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        className="input w-full min-h-[80px] resize-y"
                        placeholder="Optional message body..."
                        rows={3}
                    />
                </div>

                {/* Type Toggle */}
                <div>
                    <label className="block text-sm font-medium text-body mb-2">Type</label>
                    <div className="flex bg-surface-hover rounded-lg p-1 w-fit">
                        <button
                            type="button"
                            onClick={() => setType('announcement')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                type === 'announcement'
                                    ? 'bg-surface text-heading shadow-sm'
                                    : 'text-subtle hover:text-heading'
                            }`}
                        >
                            Announcement
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('questionnaire')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                type === 'questionnaire'
                                    ? 'bg-surface text-heading shadow-sm'
                                    : 'text-subtle hover:text-heading'
                            }`}
                        >
                            Questionnaire
                        </button>
                    </div>
                </div>

                {/* Targeting */}
                <div>
                    <label className="block text-sm font-medium text-body mb-2">Target Audience</label>
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            {(['all', 'roles', 'members'] as TargetMode[]).map(mode => (
                                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="targetMode"
                                        checked={targetMode === mode}
                                        onChange={() => setTargetMode(mode)}
                                        className="text-accent-600 focus:ring-accent-500"
                                    />
                                    <span className="text-sm text-body">
                                        {mode === 'all' ? 'All Members' : mode === 'roles' ? 'By Role' : 'Specific Members'}
                                    </span>
                                </label>
                            ))}
                        </div>

                        {/* Role selection */}
                        {targetMode === 'roles' && (
                            <div className="space-y-3 pl-6">
                                <div className="flex flex-wrap gap-2">
                                    {ROLE_OPTIONS.map(role => (
                                        <button
                                            key={role.value}
                                            type="button"
                                            onClick={() => toggleRole(role.value)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                                selectedRoles.includes(role.value)
                                                    ? 'bg-accent-50 border-accent-300 text-accent-700'
                                                    : 'bg-surface border-line text-subtle hover:border-line-strong'
                                            }`}
                                        >
                                            {role.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Level filter (only shown when roles selected) */}
                                {levels.length > 0 && (
                                    <div>
                                        <p className="text-xs text-muted mb-1.5">Filter by level (optional)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {levels.map(level => (
                                                <button
                                                    key={level}
                                                    type="button"
                                                    onClick={() => toggleLevel(level)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                                        selectedLevels.includes(level)
                                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                                            : 'bg-surface border-line text-subtle hover:border-line-strong'
                                                    }`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Member selection */}
                        {targetMode === 'members' && (
                            <div className="pl-6 space-y-2">
                                <input
                                    type="text"
                                    value={memberSearch}
                                    onChange={e => setMemberSearch(e.target.value)}
                                    className="input w-full text-sm"
                                    placeholder="Search members..."
                                />
                                <div className="max-h-48 overflow-y-auto border border-line rounded-lg divide-y divide-line">
                                    {loadingMembers ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="w-5 h-5 animate-spin text-faint" />
                                        </div>
                                    ) : filteredMembers.length === 0 ? (
                                        <p className="text-sm text-muted text-center py-4">No members found</p>
                                    ) : (
                                        filteredMembers.map(m => (
                                            <label
                                                key={m.id}
                                                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-hover"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMemberIds.includes(m.id)}
                                                    onChange={() => toggleMember(m.id)}
                                                    className="text-accent-600 focus:ring-accent-500 rounded"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-heading truncate">{m.full_name}</p>
                                                    <p className="text-xs text-muted truncate">{m.email} &middot; {m.role}</p>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                                {selectedMemberIds.length > 0 && (
                                    <p className="text-xs text-muted">{selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''} selected</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Links */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-body">Links</label>
                        <button
                            type="button"
                            onClick={addLink}
                            className="flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 font-medium"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Link
                        </button>
                    </div>
                    {links.length > 0 && (
                        <div className="space-y-2">
                            {links.map((link, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-faint flex-shrink-0" />
                                    <input
                                        type="text"
                                        value={link.label}
                                        onChange={e => updateLink(idx, { label: e.target.value })}
                                        className="input text-sm flex-1"
                                        placeholder="Label"
                                    />
                                    <input
                                        type="url"
                                        value={link.url}
                                        onChange={e => updateLink(idx, { url: e.target.value })}
                                        className="input text-sm flex-[2]"
                                        placeholder="https://..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeLink(idx)}
                                        className="p-1.5 text-faint hover:text-error-600 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Questions (questionnaire only) */}
                {type === 'questionnaire' && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-body">Questions</label>
                            <button
                                type="button"
                                onClick={addQuestion}
                                className="flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 font-medium"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Question
                            </button>
                        </div>
                        <div className="space-y-4">
                            {questions.map((q, qIdx) => (
                                <div key={q.id} className="p-3 border border-line rounded-lg space-y-3">
                                    <div className="flex items-start gap-2">
                                        <span className="text-xs font-medium text-muted mt-2">{qIdx + 1}.</span>
                                        <input
                                            type="text"
                                            value={q.question}
                                            onChange={e => updateQuestion(qIdx, { question: e.target.value })}
                                            className="input text-sm flex-1"
                                            placeholder="Question text"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeQuestion(qIdx)}
                                            className="p-1.5 text-faint hover:text-error-600 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-4 pl-5">
                                        <div className="flex bg-surface-hover rounded-md p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => updateQuestion(qIdx, { type: 'multiple_choice', options: q.options || ['', ''] })}
                                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                                    q.type === 'multiple_choice'
                                                        ? 'bg-surface text-heading shadow-sm'
                                                        : 'text-muted'
                                                }`}
                                            >
                                                Multiple Choice
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateQuestion(qIdx, { type: 'free_text', options: undefined })}
                                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                                    q.type === 'free_text'
                                                        ? 'bg-surface text-heading shadow-sm'
                                                        : 'text-muted'
                                                }`}
                                            >
                                                Free Text
                                            </button>
                                        </div>
                                        <label className="flex items-center gap-1.5 text-xs text-subtle cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={q.required}
                                                onChange={e => updateQuestion(qIdx, { required: e.target.checked })}
                                                className="text-accent-600 focus:ring-accent-500 rounded"
                                            />
                                            Required
                                        </label>
                                    </div>

                                    {/* MC options */}
                                    {q.type === 'multiple_choice' && (
                                        <div className="pl-5 space-y-1.5">
                                            {(q.options || []).map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full border-2 border-line-strong flex-shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                                        className="input text-sm flex-1"
                                                        placeholder={`Option ${oIdx + 1}`}
                                                    />
                                                    {(q.options || []).length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOption(qIdx, oIdx)}
                                                            className="p-1 text-faint hover:text-error-600"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => addOptionToQuestion(qIdx)}
                                                className="text-xs text-accent-600 hover:text-accent-700 font-medium pl-5"
                                            >
                                                + Add Option
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {questions.length === 0 && (
                                <p className="text-sm text-muted text-center py-4">
                                    No questions yet. Click "Add Question" to get started.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Expiration */}
                <div>
                    <label className="block text-sm font-medium text-body mb-1">Expires (optional)</label>
                    <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={e => setExpiresAt(e.target.value)}
                        className="input w-full sm:w-auto text-sm"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-line">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="btn-secondary"
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="btn-primary"
                        disabled={submitting || !title.trim()}
                    >
                        {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                        ) : (
                            'Send Announcement'
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
