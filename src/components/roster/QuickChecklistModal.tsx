import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ClipboardCheck, Plus, Trash2, Check, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface Checklist {
    id: string;
    hub_id: string;
    title: string;
    checked_ids: string[];
    created_by: string;
    created_at: string;
    updated_at: string;
}

interface QuickChecklistModalProps {
    isOpen: boolean;
    onClose: () => void;
    gymnasts: { id: string; first_name: string; last_name: string; level?: string | null }[];
    levels: string[];
    hubId: string;
}

export function QuickChecklistModal({ isOpen, onClose, gymnasts, levels, hubId }: QuickChecklistModalProps) {
    const { user } = useHub();
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [confirmDelete, setConfirmDelete] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);

    const active = checklists.find(c => c.id === activeId) || null;

    // Fetch checklists on open
    useEffect(() => {
        if (!isOpen || !hubId) return;
        fetchChecklists();
    }, [isOpen, hubId]);

    const fetchChecklists = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('roster_checklists')
            .select('*')
            .eq('hub_id', hubId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setChecklists(data);
            if (!activeId && data.length > 0) {
                setActiveId(data[0].id);
            }
        }
        setLoading(false);
    };

    const createChecklist = async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('roster_checklists')
            .insert({ hub_id: hubId, title: '', checked_ids: [], created_by: user.id })
            .select()
            .single();

        if (!error && data) {
            setChecklists(prev => [data, ...prev]);
            setActiveId(data.id);
            // Focus title input after render
            setTimeout(() => titleRef.current?.focus(), 50);
        }
    };

    const updateTitle = async (title: string) => {
        if (!active) return;
        setChecklists(prev => prev.map(c => c.id === active.id ? { ...c, title } : c));
        await supabase
            .from('roster_checklists')
            .update({ title })
            .eq('id', active.id);
    };

    const toggleGymnast = async (gymnastId: string) => {
        if (!active) return;
        const isChecked = active.checked_ids.includes(gymnastId);
        const newIds = isChecked
            ? active.checked_ids.filter(id => id !== gymnastId)
            : [...active.checked_ids, gymnastId];

        // Optimistic update
        setChecklists(prev => prev.map(c => c.id === active.id ? { ...c, checked_ids: newIds } : c));

        await supabase
            .from('roster_checklists')
            .update({ checked_ids: newIds })
            .eq('id', active.id);
    };

    const toggleAllInLevel = async (levelGymnasts: { id: string }[]) => {
        if (!active) return;
        const allChecked = levelGymnasts.every(g => active.checked_ids.includes(g.id));
        let newIds: string[];
        if (allChecked) {
            const removeSet = new Set(levelGymnasts.map(g => g.id));
            newIds = active.checked_ids.filter(id => !removeSet.has(id));
        } else {
            const addSet = new Set([...active.checked_ids, ...levelGymnasts.map(g => g.id)]);
            newIds = Array.from(addSet);
        }

        setChecklists(prev => prev.map(c => c.id === active.id ? { ...c, checked_ids: newIds } : c));
        await supabase
            .from('roster_checklists')
            .update({ checked_ids: newIds })
            .eq('id', active.id);
    };

    const deleteChecklist = async () => {
        if (!active) return;
        const deleteId = active.id;
        setChecklists(prev => prev.filter(c => c.id !== deleteId));
        setActiveId(checklists.find(c => c.id !== deleteId)?.id || null);
        setConfirmDelete(false);
        await supabase
            .from('roster_checklists')
            .delete()
            .eq('id', deleteId);
    };

    const toggleSection = (level: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(level)) next.delete(level);
            else next.add(level);
            return next;
        });
    };

    // Group gymnasts by level
    const gymnastsByLevel = useMemo(() => {
        const groups: Record<string, typeof gymnasts> = {};
        groups['No Level'] = [];
        levels.forEach(l => { groups[l] = []; });
        gymnasts.forEach(g => {
            const level = g.level || 'No Level';
            if (!groups[level]) groups[level] = [];
            groups[level].push(g);
        });
        Object.values(groups).forEach(arr =>
            arr.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
        );
        return groups;
    }, [gymnasts, levels]);

    const orderedLevels = useMemo(() => {
        const result = [...levels];
        Object.keys(gymnastsByLevel).forEach(l => {
            if (!result.includes(l)) result.push(l);
        });
        return result.filter(l => (gymnastsByLevel[l]?.length || 0) > 0);
    }, [gymnastsByLevel, levels]);

    // Expand all sections on first load
    useEffect(() => {
        if (orderedLevels.length > 0 && expandedSections.size === 0) {
            setExpandedSections(new Set(orderedLevels));
        }
    }, [orderedLevels]);

    // Filter gymnasts by search
    const filteredGymnastsByLevel = useMemo(() => {
        if (!searchTerm.trim()) return gymnastsByLevel;
        const term = searchTerm.toLowerCase();
        const filtered: Record<string, typeof gymnasts> = {};
        for (const [level, gs] of Object.entries(gymnastsByLevel)) {
            const matches = gs.filter(g =>
                `${g.first_name} ${g.last_name}`.toLowerCase().includes(term)
            );
            if (matches.length > 0) filtered[level] = matches;
        }
        return filtered;
    }, [gymnastsByLevel, searchTerm]);

    const filteredLevels = useMemo(() =>
        orderedLevels.filter(l => filteredGymnastsByLevel[l]?.length > 0),
        [orderedLevels, filteredGymnastsByLevel]
    );

    // Progress count
    const checkedCount = active ? active.checked_ids.length : 0;
    const totalCount = gymnasts.length;

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-surface rounded-xl shadow-xl border border-line w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-line">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-50 rounded-lg">
                            <ClipboardCheck className="h-5 w-5 text-accent-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-heading">Quick Checklist</h2>
                            <p className="text-sm text-muted">Track anything across your roster</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-faint hover:text-subtle hover:bg-surface-hover rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar: checklist list */}
                    <div className="w-52 border-r border-line flex flex-col bg-surface-alt shrink-0">
                        <div className="p-3 border-b border-line">
                            <button
                                onClick={createChecklist}
                                className="w-full btn-secondary text-sm flex items-center justify-center gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                New Checklist
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <p className="p-3 text-sm text-muted">Loading...</p>
                            ) : checklists.length === 0 ? (
                                <p className="p-3 text-sm text-muted text-center">No checklists yet</p>
                            ) : (
                                checklists.map(c => {
                                    const count = c.checked_ids.length;
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => { setActiveId(c.id); setConfirmDelete(false); }}
                                            className={`w-full text-left px-3 py-2.5 text-sm border-b border-line transition-colors ${
                                                c.id === activeId
                                                    ? 'bg-accent-50 text-accent-700 font-medium'
                                                    : 'text-body hover:bg-surface-hover'
                                            }`}
                                        >
                                            <div className="truncate">
                                                {c.title || 'Untitled'}
                                            </div>
                                            <div className="text-xs text-faint mt-0.5">
                                                {count}/{totalCount} checked
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Main area */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {!active ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <ClipboardCheck className="h-10 w-10 text-faint mx-auto mb-3" />
                                    <p className="text-muted text-sm">
                                        {checklists.length === 0
                                            ? 'Create your first checklist to get started'
                                            : 'Select a checklist from the sidebar'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Title + search */}
                                <div className="px-4 py-3 border-b border-line space-y-2">
                                    <div>
                                        <label className="block text-xs font-medium text-muted mb-1">Checklist name</label>
                                        <input
                                            ref={titleRef}
                                            value={active.title}
                                            onChange={(e) => updateTitle(e.target.value)}
                                            placeholder="e.g. Permission slips, Secret Santa..."
                                            className="input w-full text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-faint" />
                                            <input
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search gymnasts..."
                                                className="input pl-8 py-1.5 text-sm w-full"
                                            />
                                        </div>
                                        <span className="text-xs text-muted whitespace-nowrap">
                                            {checkedCount}/{totalCount}
                                        </span>
                                    </div>
                                </div>

                                {/* Gymnast list */}
                                <div className="flex-1 overflow-y-auto px-4 py-3">
                                    {filteredLevels.length === 0 ? (
                                        <p className="text-sm text-muted text-center py-4">No gymnasts found</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {filteredLevels.map(level => {
                                                const gs = filteredGymnastsByLevel[level] || [];
                                                const isExpanded = expandedSections.has(level);
                                                const allChecked = gs.length > 0 && gs.every(g => active.checked_ids.includes(g.id));
                                                const someChecked = gs.some(g => active.checked_ids.includes(g.id));

                                                return (
                                                    <div key={level} className="border border-line rounded-lg overflow-hidden">
                                                        <div
                                                            className="flex items-center gap-3 px-3 py-2 bg-surface cursor-pointer hover:bg-surface-hover transition-colors"
                                                            onClick={() => toggleSection(level)}
                                                        >
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleAllInLevel(gs);
                                                                }}
                                                                className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                                                    allChecked
                                                                        ? 'bg-accent-500 border-accent-500'
                                                                        : someChecked
                                                                        ? 'bg-accent-200 border-accent-500'
                                                                        : 'border-line-strong hover:border-accent-500'
                                                                }`}
                                                                style={{ width: 18, height: 18 }}
                                                            >
                                                                {allChecked && <Check className="h-3 w-3 text-white" />}
                                                                {someChecked && !allChecked && (
                                                                    <div className="w-2 h-0.5 bg-accent-500 rounded" />
                                                                )}
                                                            </button>

                                                            {isExpanded ? (
                                                                <ChevronDown className="h-3.5 w-3.5 text-faint" />
                                                            ) : (
                                                                <ChevronRight className="h-3.5 w-3.5 text-faint" />
                                                            )}

                                                            <span className={`text-sm font-medium ${level === 'No Level' ? 'text-amber-600' : 'text-body'}`}>
                                                                {level}
                                                            </span>
                                                            <span className="text-xs text-faint">
                                                                ({gs.filter(g => active.checked_ids.includes(g.id)).length}/{gs.length})
                                                            </span>
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="divide-y divide-line">
                                                                {gs.map(gymnast => {
                                                                    const isChecked = active.checked_ids.includes(gymnast.id);
                                                                    return (
                                                                        <div
                                                                            key={gymnast.id}
                                                                            className="flex items-center gap-3 px-3 py-2 hover:bg-surface-hover cursor-pointer"
                                                                            onClick={() => toggleGymnast(gymnast.id)}
                                                                        >
                                                                            <div
                                                                                className={`rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                                                                                    isChecked
                                                                                        ? 'bg-accent-500 border-accent-500'
                                                                                        : 'border-line-strong'
                                                                                }`}
                                                                                style={{ width: 18, height: 18 }}
                                                                            >
                                                                                {isChecked && <Check className="h-3 w-3 text-white" />}
                                                                            </div>
                                                                            <span className={`text-sm ${isChecked ? 'text-muted line-through' : 'text-body'}`}>
                                                                                {gymnast.first_name} {gymnast.last_name}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-3 border-t border-line bg-surface-alt flex items-center justify-between">
                                    {confirmDelete ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-red-600">Delete this checklist?</span>
                                            <button
                                                onClick={deleteChecklist}
                                                className="text-sm font-medium text-red-600 hover:text-red-700"
                                            >
                                                Yes, delete
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(false)}
                                                className="text-sm text-muted hover:text-body"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDelete(true)}
                                            className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete
                                        </button>
                                    )}
                                    <button
                                        onClick={onClose}
                                        className="btn-secondary text-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
