import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { X, Users, Check, Search, Loader2, Plus, Save, LayoutGrid, ClipboardList, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAssignments, useBatchUpsertAssignments } from '../../hooks/useAssignments';
import { useStations, useUpsertStation } from '../../hooks/useStations';
import { useTemplates } from '../../hooks/useTemplates';
import type { GymnastProfile, AssignmentEventType, MainStation, AssignmentTemplate } from '../../types';
import { ASSIGNMENT_EVENTS, ASSIGNMENT_EVENT_LABELS, ASSIGNMENT_EVENT_COLORS } from '../../types';

type AssignmentMode = 'checklist' | 'stations';

interface AssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate: Date;
    selectedEvent: AssignmentEventType;
    onSuccess?: () => void;
}

export function AssignmentModal({ isOpen, onClose, initialDate, selectedEvent: initialEvent, onSuccess }: AssignmentModalProps) {
    const { hub } = useHub();
    const [mode, setMode] = useState<AssignmentMode>('checklist');
    const [gymnasts, setGymnasts] = useState<GymnastProfile[]>([]);
    const [loadingGymnasts, setLoadingGymnasts] = useState(true);
    const [selectedGymnasts, setSelectedGymnasts] = useState<string[]>([]);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<AssignmentEventType>(initialEvent);
    const [exercises, setExercises] = useState('');
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);

    // Station-specific state
    const [mainStations, setMainStations] = useState<MainStation[]>([
        { id: crypto.randomUUID(), content: '', side_stations: [] }
    ]);

    // Use format to avoid timezone issues
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const { assignments } = useAssignments({ hubId: hub?.id, date: dateString });
    const { templates } = useTemplates({ hubId: hub?.id, event: selectedEvent, templateType: mode });
    const { batchUpsert } = useBatchUpsertAssignments();
    useStations({ hubId: hub?.id, date: dateString });
    const { upsertStation } = useUpsertStation();

    const levels = hub?.settings?.levels || [];

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedEvent(initialEvent);
            setSelectedDate(initialDate);
            setSelectedGymnasts([]);
            setSelectedLevels([]);
            setExercises('');
            setMainStations([{ id: crypto.randomUUID(), content: '', side_stations: [] }]);
            setSuccessMessage('');
        }
    }, [isOpen, initialEvent, initialDate]);

    // Fetch gymnasts
    useEffect(() => {
        const fetchGymnasts = async () => {
            if (!hub?.id) return;
            setLoadingGymnasts(true);

            const { data, error } = await supabase
                .from('gymnast_profiles')
                .select('*')
                .eq('hub_id', hub.id)
                .order('first_name');

            if (error) {
                console.error('Error fetching gymnasts:', error);
            } else {
                setGymnasts(data || []);
            }
            setLoadingGymnasts(false);
        };

        if (isOpen) {
            fetchGymnasts();
        }
    }, [hub?.id, isOpen]);

    // Filter gymnasts
    const filteredGymnasts = useMemo(() => {
        return gymnasts.filter(g => {
            const matchesSearch = searchTerm === '' ||
                `${g.first_name} ${g.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLevel = levelFilter === 'all' || g.level === levelFilter;
            return matchesSearch && matchesLevel;
        });
    }, [gymnasts, searchTerm, levelFilter]);

    // Gymnasts who already have assignments for this event
    const gymnastsWithAssignments = useMemo(() => {
        const set = new Set<string>();
        assignments.forEach(a => {
            if (a[selectedEvent]) {
                set.add(a.gymnast_profile_id);
            }
        });
        return set;
    }, [assignments, selectedEvent]);

    // Checklist helpers
    const toggleGymnast = (id: string) => {
        setSelectedGymnasts(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const selectAll = () => setSelectedGymnasts(filteredGymnasts.map(g => g.id));
    const clearSelection = () => setSelectedGymnasts([]);

    // Station helpers
    const toggleLevel = (level: string) => {
        setSelectedLevels(prev =>
            prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
        );
    };

    const selectAllLevels = () => setSelectedLevels([...levels]);
    const clearLevelSelection = () => setSelectedLevels([]);

    const addMainStation = () => {
        setMainStations(prev => [...prev, { id: crypto.randomUUID(), content: '', side_stations: [] }]);
    };

    const updateMainStation = (id: string, content: string) => {
        setMainStations(prev => prev.map(s => s.id === id ? { ...s, content } : s));
    };

    const removeMainStation = (id: string) => {
        if (mainStations.length > 1) {
            setMainStations(prev => prev.filter(s => s.id !== id));
        }
    };

    const addSideStation = (mainStationId: string) => {
        setMainStations(prev => prev.map(main =>
            main.id === mainStationId
                ? { ...main, side_stations: [...main.side_stations, { id: crypto.randomUUID(), content: '' }] }
                : main
        ));
    };

    const updateSideStation = (mainStationId: string, sideId: string, content: string) => {
        setMainStations(prev => prev.map(main =>
            main.id === mainStationId
                ? { ...main, side_stations: main.side_stations.map(s => s.id === sideId ? { ...s, content } : s) }
                : main
        ));
    };

    const removeSideStation = (mainStationId: string, sideId: string) => {
        setMainStations(prev => prev.map(main =>
            main.id === mainStationId
                ? { ...main, side_stations: main.side_stations.filter(s => s.id !== sideId) }
                : main
        ));
    };

    const handleApplyTemplate = (template: AssignmentTemplate) => {
        if (mode === 'checklist') {
            // Apply checklist template exercises
            if (template.exercises) {
                setExercises(template.exercises);
            }
        } else {
            // Apply station template - replace all stations with template stations
            if (template.stations && template.stations.length > 0) {
                // Clone the stations with new IDs to avoid conflicts
                const clonedStations = template.stations.map(station => ({
                    id: crypto.randomUUID(),
                    content: station.content,
                    side_stations: station.side_stations.map(side => ({
                        id: crypto.randomUUID(),
                        content: side.content
                    }))
                }));
                setMainStations(clonedStations);
            }
        }
    };

    // Save handlers
    const handleSaveAssignments = async () => {
        if (!hub?.id || selectedGymnasts.length === 0 || !exercises.trim()) return;

        setIsSaving(true);
        try {
            const success = await batchUpsert({
                hub_id: hub.id,
                date: dateString,
                gymnast_profile_ids: selectedGymnasts,
                event: selectedEvent,
                content: exercises
            });

            if (success) {
                setSuccessMessage(`Assigned to ${selectedGymnasts.length} gymnast(s)`);
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 1000);
            }
        } catch (err) {
            console.error('Error saving assignments:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveStations = async () => {
        if (!hub?.id || selectedLevels.length === 0 || mainStations.every(s => !s.content.trim())) return;

        setIsSaving(true);
        try {
            const validStations = mainStations
                .filter(m => m.content.trim())
                .map(m => ({
                    ...m,
                    side_stations: m.side_stations.filter(s => s.content.trim())
                }));

            const results = await Promise.all(
                selectedLevels.map(level =>
                    upsertStation({
                        hub_id: hub.id,
                        date: dateString,
                        level,
                        event: selectedEvent,
                        stations: validStations
                    })
                )
            );

            const successCount = results.filter(Boolean).length;
            if (successCount > 0) {
                setSuccessMessage(`Created ${validStations.length} station(s) for ${successCount} level(s)`);
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 1000);
            }
        } catch (err) {
            console.error('Error saving stations:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const eventColors = ASSIGNMENT_EVENT_COLORS[selectedEvent];

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl border border-slate-200 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Compact Header with all controls */}
                <div className="p-4 border-b border-slate-200 space-y-3">
                    {/* Top row: Title + Mode Toggle + Close */}
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold text-slate-900">New Assignment</h2>

                        {/* Mode Toggle - compact */}
                        <div className="flex space-x-1 rounded-lg bg-slate-100 p-1">
                            <button
                                onClick={() => setMode('checklist')}
                                className={`flex items-center gap-1.5 rounded-md py-1.5 px-3 text-sm font-medium transition-all ${
                                    mode === 'checklist'
                                        ? 'bg-white text-slate-900 shadow'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <ClipboardList className="w-4 h-4" />
                                Checklist
                            </button>
                            <button
                                onClick={() => setMode('stations')}
                                className={`flex items-center gap-1.5 rounded-md py-1.5 px-3 text-sm font-medium transition-all ${
                                    mode === 'stations'
                                        ? 'bg-amber-100 text-amber-600 shadow'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Stations
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Bottom row: Date + Event + Templates - all inline */}
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Date - compact */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={dateString}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const [year, month, day] = e.target.value.split('-').map(Number);
                                        setSelectedDate(new Date(year, month - 1, day, 12, 0, 0));
                                    }
                                }}
                                className="input py-1 px-2 text-sm"
                            />
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        {/* Event chips - compact */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {ASSIGNMENT_EVENTS.map(event => {
                                const colors = ASSIGNMENT_EVENT_COLORS[event];
                                return (
                                    <button
                                        key={event}
                                        onClick={() => setSelectedEvent(event)}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                            selectedEvent === event
                                                ? `${colors.bg} ${colors.text} border ${colors.border}`
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        {ASSIGNMENT_EVENT_LABELS[event]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Templates dropdown - if available */}
                        {templates.length > 0 && (
                            <>
                                <div className="h-6 w-px bg-slate-200" />
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">Template:</span>
                                    <select
                                        onChange={(e) => {
                                            const template = templates.find(t => t.id === e.target.value);
                                            if (template) handleApplyTemplate(template);
                                        }}
                                        className="input py-1 px-2 text-xs"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select...</option>
                                        {templates.map(template => (
                                            <option key={template.id} value={template.id}>{template.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Success Message */}
                    {successMessage && (
                        <div className="bg-success-500/10 border border-success-500/30 rounded-lg p-3 flex items-center gap-3">
                            <Check className="w-5 h-5 text-success-400" />
                            <span className="text-success-400">{successMessage}</span>
                        </div>
                    )}

                    {/* Checklist Mode Content */}
                    {mode === 'checklist' && (
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Gymnast Selection */}
                            <div className="bg-slate-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="w-4 h-4 text-mint-600" />
                                    <span className="font-medium text-slate-900 text-sm">Select Gymnasts</span>
                                    {selectedGymnasts.length > 0 && (
                                        <span className="badge-mint text-xs">{selectedGymnasts.length}</span>
                                    )}
                                </div>

                                {/* Search and Filter */}
                                <div className="flex gap-2 mb-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search..."
                                            className="input pl-8 py-1.5 text-sm w-full"
                                        />
                                    </div>
                                    {levels.length > 0 && (
                                        <select
                                            value={levelFilter}
                                            onChange={(e) => setLevelFilter(e.target.value)}
                                            className="input py-1.5 text-sm"
                                        >
                                            <option value="all">All</option>
                                            {levels.map(level => (
                                                <option key={level} value={level}>{level}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2 mb-3 text-xs">
                                    <button onClick={selectAll} className="text-mint-600 hover:text-mint-700">
                                        Select All ({filteredGymnasts.length})
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button onClick={clearSelection} className="text-slate-500 hover:text-slate-700">
                                        Clear
                                    </button>
                                </div>

                                {/* Gymnast List */}
                                <div className="max-h-[300px] overflow-y-auto space-y-1.5">
                                    {loadingGymnasts ? (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 className="w-5 h-5 text-mint-600 animate-spin" />
                                        </div>
                                    ) : filteredGymnasts.length === 0 ? (
                                        <p className="text-center py-6 text-slate-500 text-sm">No gymnasts found</p>
                                    ) : (
                                        filteredGymnasts.map(gymnast => {
                                            const isSelected = selectedGymnasts.includes(gymnast.id);
                                            const hasAssignment = gymnastsWithAssignments.has(gymnast.id);
                                            return (
                                                <label
                                                    key={gymnast.id}
                                                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                                                        isSelected
                                                            ? 'bg-mint-100 border border-mint-200'
                                                            : 'bg-white border border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleGymnast(gymnast.id)}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                                        isSelected ? 'bg-mint-500 border-mint-500' : 'border-slate-300'
                                                    }`}>
                                                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-slate-900 truncate">
                                                            {gymnast.first_name} {gymnast.last_name}
                                                        </p>
                                                    </div>
                                                    {hasAssignment && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded">Has</span>
                                                    )}
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Exercise Input */}
                            <div className="bg-slate-50 rounded-lg p-4">
                                <label className="block text-sm font-medium text-slate-500 mb-2">
                                    Exercises (one per line)
                                </label>
                                <textarea
                                    value={exercises}
                                    onChange={(e) => setExercises(e.target.value)}
                                    placeholder={`Enter ${ASSIGNMENT_EVENT_LABELS[selectedEvent]} exercises...\nOne exercise per line`}
                                    className="input w-full min-h-[300px] resize-none font-mono text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Stations Mode Content */}
                    {mode === 'stations' && (
                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Level Selection */}
                            <div className="bg-slate-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <LayoutGrid className="w-4 h-4 text-amber-600" />
                                    <span className="font-medium text-slate-900 text-sm">Select Levels</span>
                                    {selectedLevels.length > 0 && (
                                        <span className="badge-mint text-xs">{selectedLevels.length}</span>
                                    )}
                                </div>

                                {levels.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No levels configured.</p>
                                ) : (
                                    <>
                                        <div className="flex gap-2 mb-3 text-xs">
                                            <button onClick={selectAllLevels} className="text-amber-600 hover:text-amber-700">
                                                Select All ({levels.length})
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button onClick={clearLevelSelection} className="text-slate-500 hover:text-slate-700">
                                                Clear
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {levels.map(level => {
                                                const isSelected = selectedLevels.includes(level);
                                                return (
                                                    <label
                                                        key={level}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                                                            isSelected
                                                                ? 'bg-amber-100 border-2 border-amber-400/50'
                                                                : 'bg-white border-2 border-slate-200 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleLevel(level)}
                                                            className="sr-only"
                                                        />
                                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                                            isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-300'
                                                        }`}>
                                                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                        </div>
                                                        <span className={isSelected ? 'text-amber-600' : 'text-slate-700'}>{level}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Station Builder */}
                            <div className="bg-slate-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-medium text-slate-900 text-sm">Stations ({mainStations.length})</span>
                                    <button
                                        onClick={addMainStation}
                                        className="text-sm text-mint-600 hover:text-mint-700 flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[350px] overflow-y-auto">
                                    {mainStations.map((station, idx) => (
                                        <div
                                            key={station.id}
                                            className={`rounded-lg border-2 p-3 ${eventColors.bg} ${eventColors.border}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                                        {idx + 1}
                                                    </span>
                                                    <span className={`text-xs font-medium ${eventColors.text}`}>Station {idx + 1}</span>
                                                </div>
                                                {mainStations.length > 1 && (
                                                    <button
                                                        onClick={() => removeMainStation(station.id)}
                                                        className="p-1 text-slate-400 hover:text-error-400"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <textarea
                                                value={station.content}
                                                onChange={(e) => updateMainStation(station.id, e.target.value)}
                                                placeholder="Station exercises..."
                                                className="input w-full min-h-[60px] resize-none text-sm mb-2"
                                                rows={2}
                                            />

                                            {/* Side Stations */}
                                            <div className="border-t border-slate-200 pt-2">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[10px] text-slate-500">Side Stations</span>
                                                    {station.side_stations.length < 3 && (
                                                        <button
                                                            onClick={() => addSideStation(station.id)}
                                                            className="text-[10px] text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
                                                        >
                                                            <Plus className="w-2.5 h-2.5" />
                                                            Add
                                                        </button>
                                                    )}
                                                </div>

                                                {station.side_stations.length === 0 ? (
                                                    <p className="text-[10px] text-slate-500 text-center py-1.5 bg-white rounded border border-dashed border-slate-300">
                                                        No side stations
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {station.side_stations.map((side, sideIdx) => (
                                                            <div key={side.id} className="bg-amber-50 rounded p-2 border border-amber-200">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-[10px] font-medium text-amber-700">Side {sideIdx + 1}</span>
                                                                    <button
                                                                        onClick={() => removeSideStation(station.id, side.id)}
                                                                        className="p-0.5 text-slate-400 hover:text-error-400"
                                                                    >
                                                                        <X className="w-2.5 h-2.5" />
                                                                    </button>
                                                                </div>
                                                                <textarea
                                                                    value={side.content}
                                                                    onChange={(e) => updateSideStation(station.id, side.id, e.target.value)}
                                                                    placeholder="Side station..."
                                                                    className="input w-full text-xs py-1 resize-none"
                                                                    rows={1}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    {mode === 'checklist' ? (
                        <button
                            onClick={handleSaveAssignments}
                            disabled={isSaving || selectedGymnasts.length === 0 || !exercises.trim()}
                            className="btn-primary"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Assign to {selectedGymnasts.length} Gymnast(s)
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleSaveStations}
                            disabled={isSaving || selectedLevels.length === 0 || mainStations.every(s => !s.content.trim())}
                            className="btn-primary"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {selectedLevels.length === 0
                                        ? 'Select Level(s)'
                                        : `Create for ${selectedLevels.length} Level(s)`
                                    }
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
