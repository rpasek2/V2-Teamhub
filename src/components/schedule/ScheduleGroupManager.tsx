import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { X, Loader2, Users, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GymnastProfile } from '../../types';

interface ScheduleGroupManagerProps {
    isOpen: boolean;
    onClose: () => void;
    levels: string[];
}

interface GymnastWithGroup extends GymnastProfile {
    full_name: string;
}

export function ScheduleGroupManager({ isOpen, onClose, levels }: ScheduleGroupManagerProps) {
    const { hubId } = useParams();

    const [gymnasts, setGymnasts] = useState<GymnastWithGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set(levels));

    useEffect(() => {
        if (isOpen && hubId) {
            fetchGymnasts();
        }
    }, [isOpen, hubId]);

    const fetchGymnasts = async () => {
        if (!hubId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('gymnast_profiles')
            .select('*')
            .eq('hub_id', hubId)
            .order('level')
            .order('last_name');

        if (error) {
            console.error('Error fetching gymnasts:', error);
        } else {
            const withNames = (data || []).map(g => ({
                ...g,
                full_name: `${g.first_name} ${g.last_name}`
            }));
            setGymnasts(withNames);
        }
        setLoading(false);
    };

    const handleGroupChange = async (gymnastId: string, newGroup: string) => {
        setSaving(gymnastId);

        const { error } = await supabase
            .from('gymnast_profiles')
            .update({
                schedule_group: newGroup,
                updated_at: new Date().toISOString()
            })
            .eq('id', gymnastId);

        if (error) {
            console.error('Error updating group:', error);
        } else {
            setGymnasts(gymnasts.map(g =>
                g.id === gymnastId ? { ...g, schedule_group: newGroup } : g
            ));
        }
        setSaving(null);
    };

    const toggleLevel = (level: string) => {
        const newExpanded = new Set(expandedLevels);
        if (newExpanded.has(level)) {
            newExpanded.delete(level);
        } else {
            newExpanded.add(level);
        }
        setExpandedLevels(newExpanded);
    };

    // Filter and group gymnasts by level
    const filteredGymnasts = gymnasts.filter(g =>
        searchQuery === '' ||
        g.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const gymnastsByLevel = levels.reduce((acc, level) => {
        acc[level] = filteredGymnasts.filter(g => g.level === level);
        return acc;
    }, {} as Record<string, GymnastWithGroup[]>);

    // Include any levels not in hub settings
    const otherGymnasts = filteredGymnasts.filter(g => !levels.includes(g.level));
    const allLevels = [...levels];
    if (otherGymnasts.length > 0) {
        // Group by their actual levels
        const otherLevels = Array.from(new Set(otherGymnasts.map(g => g.level)));
        otherLevels.forEach(level => {
            if (!allLevels.includes(level)) {
                allLevels.push(level);
                gymnastsByLevel[level] = otherGymnasts.filter(g => g.level === level);
            }
        });
    }

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Manage Schedule Groups</h2>
                            <p className="text-sm text-slate-500">Assign gymnasts to schedule groups (A, B, C)</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search gymnasts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input w-full pl-10"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                        </div>
                    ) : filteredGymnasts.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            {searchQuery ? 'No gymnasts match your search.' : 'No gymnasts found.'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {allLevels.map(level => {
                                const levelGymnasts = gymnastsByLevel[level] || [];
                                if (levelGymnasts.length === 0) return null;

                                const isExpanded = expandedLevels.has(level);

                                return (
                                    <div key={level} className="border border-slate-200 rounded-lg overflow-hidden">
                                        {/* Level Header */}
                                        <button
                                            onClick={() => toggleLevel(level)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                                )}
                                                <span className="font-medium text-slate-900">{level}</span>
                                                <span className="text-sm text-slate-500">
                                                    ({levelGymnasts.length} gymnast{levelGymnasts.length !== 1 ? 's' : ''})
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                                                    A: {levelGymnasts.filter(g => (g.schedule_group || 'A') === 'A').length}
                                                </span>
                                                <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded">
                                                    B: {levelGymnasts.filter(g => g.schedule_group === 'B').length}
                                                </span>
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                                                    C: {levelGymnasts.filter(g => g.schedule_group === 'C').length}
                                                </span>
                                            </div>
                                        </button>

                                        {/* Gymnast List */}
                                        {isExpanded && (
                                            <div className="divide-y divide-slate-100">
                                                {levelGymnasts.map(gymnast => (
                                                    <div
                                                        key={gymnast.id}
                                                        className="flex items-center justify-between px-4 py-2 bg-white"
                                                    >
                                                        <span className="text-sm text-slate-700">
                                                            {gymnast.full_name}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {saving === gymnast.id && (
                                                                <Loader2 className="w-3 h-3 text-slate-400 animate-spin mr-1" />
                                                            )}
                                                            {['A', 'B', 'C'].map(group => (
                                                                <button
                                                                    key={group}
                                                                    onClick={() => handleGroupChange(gymnast.id, group)}
                                                                    disabled={saving === gymnast.id}
                                                                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                                                                        (gymnast.schedule_group || 'A') === group
                                                                            ? group === 'A'
                                                                                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                                                                                : group === 'B'
                                                                                ? 'bg-sky-100 text-sky-700 border-2 border-sky-300'
                                                                                : 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                                                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-2 border-transparent'
                                                                    }`}
                                                                >
                                                                    {group}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-4 mt-4 border-t border-slate-200">
                    <button onClick={onClose} className="btn-primary">
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
