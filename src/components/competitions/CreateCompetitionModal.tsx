import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertCircle, Check, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';

interface CreateCompetitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCompetitionCreated: () => void;
}

interface Gymnast {
    id: string;
    first_name: string;
    last_name: string;
    level: string | null;
}

export function CreateCompetitionModal({ isOpen, onClose, onCompetitionCreated }: CreateCompetitionModalProps) {
    const { hub } = useHub();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gymnasts, setGymnasts] = useState<Gymnast[]>([]);
    const [selectedGymnasts, setSelectedGymnasts] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        location: ''
    });

    useEffect(() => {
        if (isOpen && hub) {
            fetchGymnasts();
            // Reset form when opening
            setFormData({ name: '', startDate: '', endDate: '', location: '' });
            setSelectedGymnasts([]);
            setError(null);
        }
    }, [isOpen, hub]);

    const fetchGymnasts = async () => {
        if (!hub) return;
        // Fetch from gymnast_profiles table
        const { data, error } = await supabase
            .from('gymnast_profiles')
            .select('id, first_name, last_name, level')
            .eq('hub_id', hub.id);

        if (error) {
            console.error('Error fetching gymnasts:', error);
        } else {
            // Sort by level (using hub settings order) then by last name
            const hubLevels = hub?.settings?.levels || [];
            const sortedData = (data || []).sort((a, b) => {
                const aLevelIndex = a.level ? hubLevels.indexOf(a.level) : 999;
                const bLevelIndex = b.level ? hubLevels.indexOf(b.level) : 999;
                const aLevelOrder = aLevelIndex === -1 ? 998 : aLevelIndex;
                const bLevelOrder = bLevelIndex === -1 ? 998 : bLevelIndex;

                if (aLevelOrder !== bLevelOrder) {
                    return aLevelOrder - bLevelOrder;
                }

                return (a.last_name || '').localeCompare(b.last_name || '');
            });
            setGymnasts(sortedData);
        }
    };

    const toggleGymnast = (gymnastId: string) => {
        setSelectedGymnasts(prev =>
            prev.includes(gymnastId)
                ? prev.filter(id => id !== gymnastId)
                : [...prev, gymnastId]
        );
    };

    const selectAll = () => {
        setSelectedGymnasts(gymnasts.map(g => g.id));
    };

    const selectNone = () => {
        setSelectedGymnasts([]);
    };

    const toggleLevelSelection = (level: string) => {
        const levelGymnastIds = gymnasts.filter(g => g.level === level).map(g => g.id);
        const allSelected = levelGymnastIds.every(id => selectedGymnasts.includes(id));

        if (allSelected) {
            // Deselect all from this level
            setSelectedGymnasts(prev => prev.filter(id => !levelGymnastIds.includes(id)));
        } else {
            // Select all from this level
            setSelectedGymnasts(prev => {
                const newSet = new Set([...prev, ...levelGymnastIds]);
                return Array.from(newSet);
            });
        }
    };

    // Get unique levels from gymnasts, ordered by hub settings
    const availableLevels = (() => {
        const hubLevels = hub?.settings?.levels || [];
        const gymnastLevels = [...new Set(gymnasts.map(g => g.level).filter(Boolean))] as string[];

        // Sort by hub level order
        return gymnastLevels.sort((a, b) => {
            const aIndex = hubLevels.indexOf(a);
            const bIndex = hubLevels.indexOf(b);
            const aOrder = aIndex === -1 ? 999 : aIndex;
            const bOrder = bIndex === -1 ? 999 : bIndex;
            return aOrder - bOrder;
        });
    })();

    // Check if all gymnasts of a level are selected
    const isLevelFullySelected = (level: string) => {
        const levelGymnastIds = gymnasts.filter(g => g.level === level).map(g => g.id);
        return levelGymnastIds.length > 0 && levelGymnastIds.every(id => selectedGymnasts.includes(id));
    };

    // Count selected per level
    const getSelectedCountForLevel = (level: string) => {
        const levelGymnastIds = gymnasts.filter(g => g.level === level).map(g => g.id);
        return levelGymnastIds.filter(id => selectedGymnasts.includes(id)).length;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub || !user) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Create Competition
            const { data: compData, error: compError } = await supabase
                .from('competitions')
                .insert({
                    hub_id: hub.id,
                    name: formData.name,
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    location: formData.location,
                    created_by: user.id
                })
                .select()
                .single();

            if (compError) throw compError;

            // 2. Add Gymnasts using gymnast_profile_id
            if (selectedGymnasts.length > 0) {
                const gymnastInserts = selectedGymnasts.map(gymnastProfileId => ({
                    competition_id: compData.id,
                    gymnast_profile_id: gymnastProfileId
                }));

                const { error: rosterError } = await supabase
                    .from('competition_gymnasts')
                    .insert(gymnastInserts);

                if (rosterError) throw rosterError;
            }

            // 3. Auto-create calendar event for the competition
            const startDateTime = new Date(`${formData.startDate}T09:00:00`);
            const endDateTime = new Date(`${formData.endDate}T17:00:00`);

            const { error: eventError } = await supabase
                .from('events')
                .insert({
                    hub_id: hub.id,
                    title: formData.name,
                    description: `Competition: ${formData.name}${formData.location ? ` at ${formData.location}` : ''}`,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    location: formData.location || null,
                    type: 'competition',
                    rsvp_enabled: true,
                    created_by: user.id
                });

            if (eventError) {
                console.error('Error creating calendar event:', eventError);
                // Don't throw - competition was created successfully, calendar event is secondary
            }

            onCompetitionCreated();
            onClose();
        } catch (err: any) {
            console.error('Error creating competition:', err);
            setError(err.message || 'Failed to create competition');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Create Competition</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Competition Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                            Competition Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input w-full"
                            placeholder="State Championships"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                id="startDate"
                                required
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1">
                                End Date *
                            </label>
                            <input
                                type="date"
                                id="endDate"
                                required
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="input w-full"
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
                            Location
                        </label>
                        <input
                            type="text"
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="input w-full"
                            placeholder="City, State or Venue"
                        />
                    </div>

                    {/* Gymnast Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Select Gymnasts
                            </label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                                >
                                    Select All
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                    type="button"
                                    onClick={selectNone}
                                    className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Level quick-select buttons */}
                        {availableLevels.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {availableLevels.map(level => {
                                    const count = gymnasts.filter(g => g.level === level).length;
                                    const selectedCount = getSelectedCountForLevel(level);
                                    const isFullySelected = isLevelFullySelected(level);

                                    return (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => toggleLevelSelection(level)}
                                            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                                                isFullySelected
                                                    ? 'bg-brand-100 border-brand-300 text-brand-700'
                                                    : selectedCount > 0
                                                    ? 'bg-brand-50 border-brand-200 text-brand-600'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600'
                                            }`}
                                        >
                                            {level}
                                            <span className="ml-1 text-slate-400">
                                                ({selectedCount}/{count})
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50">
                            {gymnasts.length > 0 ? (
                                <div className="divide-y divide-slate-200">
                                    {gymnasts.map((gymnast) => (
                                        <div
                                            key={gymnast.id}
                                            className={`flex cursor-pointer items-center justify-between p-3 hover:bg-white transition-colors ${
                                                selectedGymnasts.includes(gymnast.id) ? 'bg-brand-50' : ''
                                            }`}
                                            onClick={() => toggleGymnast(gymnast.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-slate-900">
                                                    {gymnast.first_name} {gymnast.last_name}
                                                </span>
                                                {gymnast.level && (
                                                    <span className="px-2 py-0.5 text-xs bg-slate-200 text-slate-600 rounded-full">
                                                        {gymnast.level}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedGymnasts.includes(gymnast.id) && (
                                                <Check className="w-4 h-4 text-brand-600" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 text-center">
                                    <p className="text-sm text-slate-500">No gymnasts found in roster.</p>
                                    <p className="text-xs text-slate-400 mt-1">Add gymnasts to your hub's roster first.</p>
                                </div>
                            )}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                            {selectedGymnasts.length} of {gymnasts.length} selected
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? 'Creating...' : 'Create Competition'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
