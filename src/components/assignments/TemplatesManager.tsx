import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Save, FileText, LayoutGrid, ClipboardList } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useHub } from '../../context/HubContext';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '../../hooks/useTemplates';
import type { AssignmentTemplate, AssignmentEventType, AssignmentTemplateType, MainStation } from '../../types';
import { ASSIGNMENT_EVENTS, ASSIGNMENT_EVENT_LABELS, ASSIGNMENT_EVENT_COLORS } from '../../types';

interface TemplatesManagerProps {
    onClose?: () => void;
}

export function TemplatesManager({ onClose }: TemplatesManagerProps) {
    const { hub } = useHub();
    const [selectedEvent, setSelectedEvent] = useState<AssignmentEventType | 'all'>('all');
    const [selectedType, setSelectedType] = useState<AssignmentTemplateType | 'all'>('all');
    const [editingTemplate, setEditingTemplate] = useState<AssignmentTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const { templates, loading, refetch } = useTemplates({
        hubId: hub?.id,
        event: selectedEvent === 'all' ? undefined : selectedEvent,
        templateType: selectedType === 'all' ? undefined : selectedType
    });

    const filteredTemplates = templates.filter(t => {
        const matchesEvent = selectedEvent === 'all' || t.event === selectedEvent;
        const matchesType = selectedType === 'all' || t.template_type === selectedType;
        return matchesEvent && matchesType;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Templates</h2>
                    <p className="text-sm text-slate-500">
                        Create reusable exercise templates for quick assignment
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        New Template
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="btn-ghost p-2">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Type Filter */}
            <div className="flex space-x-1 rounded-lg bg-slate-100 p-1 w-fit">
                <button
                    onClick={() => setSelectedType('all')}
                    className={`flex items-center gap-2 rounded-md py-2 px-4 text-sm font-medium transition-all ${
                        selectedType === 'all'
                            ? 'bg-white text-slate-900 shadow'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    All Types
                </button>
                <button
                    onClick={() => setSelectedType('checklist')}
                    className={`flex items-center gap-2 rounded-md py-2 px-4 text-sm font-medium transition-all ${
                        selectedType === 'checklist'
                            ? 'bg-white text-slate-900 shadow'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    Checklist
                </button>
                <button
                    onClick={() => setSelectedType('stations')}
                    className={`flex items-center gap-2 rounded-md py-2 px-4 text-sm font-medium transition-all ${
                        selectedType === 'stations'
                            ? 'bg-amber-100 text-amber-600 shadow'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    Stations
                </button>
            </div>

            {/* Event Filter */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setSelectedEvent('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedEvent === 'all'
                            ? 'bg-slate-200 text-slate-900 border border-slate-300'
                            : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                >
                    All Events
                </button>
                {ASSIGNMENT_EVENTS.map(event => {
                    const colors = ASSIGNMENT_EVENT_COLORS[event];
                    return (
                        <button
                            key={event}
                            onClick={() => setSelectedEvent(event)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                selectedEvent === event
                                    ? `${colors.bg} ${colors.text} border ${colors.border}`
                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {ASSIGNMENT_EVENT_LABELS[event]}
                        </button>
                    );
                })}
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-mint-600 animate-spin" />
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 card">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-slate-500" />
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">No templates yet</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        Create your first template to speed up assignments
                    </p>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Create Template
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplates.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onEdit={() => setEditingTemplate(template)}
                            onDeleted={refetch}
                        />
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {(isCreating || editingTemplate) && (
                <TemplateModal
                    template={editingTemplate}
                    onClose={() => {
                        setIsCreating(false);
                        setEditingTemplate(null);
                    }}
                    onSaved={() => {
                        refetch();
                        setIsCreating(false);
                        setEditingTemplate(null);
                    }}
                />
            )}
        </div>
    );
}

interface TemplateCardProps {
    template: AssignmentTemplate;
    onEdit: () => void;
    onDeleted: () => void;
}

function TemplateCard({ template, onEdit, onDeleted }: TemplateCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const { deleteTemplate } = useDeleteTemplate();

    const colors = ASSIGNMENT_EVENT_COLORS[template.event];
    const isStations = template.template_type === 'stations';
    const stationCount = template.stations?.length || 0;
    const exerciseCount = template.exercises?.split('\n').filter(line => line.trim()).length || 0;

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        setIsDeleting(true);
        const success = await deleteTemplate(template.id);
        if (success) {
            onDeleted();
        }
        setIsDeleting(false);
    };

    return (
        <div className={`card p-4 ${colors.bg} border ${colors.border}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{template.name}</h3>
                        {isStations ? (
                            <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                            <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                        )}
                    </div>
                    <span className={`text-xs ${colors.text}`}>
                        {ASSIGNMENT_EVENT_LABELS[template.event]}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className="p-1.5 text-slate-500 hover:text-mint-600 hover:bg-slate-100 rounded transition-colors"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="p-1.5 text-slate-400 hover:text-error-400 hover:bg-error-500/10 rounded transition-colors"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {isStations ? (
                <>
                    <div className="text-sm text-slate-700 space-y-1.5 max-h-[100px] overflow-hidden">
                        {template.stations?.slice(0, 3).map((station, idx) => (
                            <div key={station.id} className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                                    {idx + 1}
                                </span>
                                <p className="truncate">{station.content.split('\n')[0]}</p>
                            </div>
                        ))}
                    </div>
                    {stationCount > 3 && (
                        <p className="text-xs text-slate-500 mt-2">
                            +{stationCount - 3} more stations
                        </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        <span className="text-xs text-slate-500">
                            {stationCount} station{stationCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </>
            ) : (
                <>
                    <div className="text-sm text-slate-700 space-y-1 max-h-[100px] overflow-hidden">
                        {template.exercises?.split('\n').slice(0, 4).map((line, idx) => (
                            <p key={idx} className="truncate">{line}</p>
                        ))}
                    </div>
                    {exerciseCount > 4 && (
                        <p className="text-xs text-slate-500 mt-2">
                            +{exerciseCount - 4} more exercises
                        </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        <span className="text-xs text-slate-500">
                            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}

interface TemplateModalProps {
    template: AssignmentTemplate | null;
    onClose: () => void;
    onSaved: () => void;
}

function TemplateModal({ template, onClose, onSaved }: TemplateModalProps) {
    const { hub } = useHub();
    const [name, setName] = useState(template?.name || '');
    const [event, setEvent] = useState<AssignmentEventType>(template?.event || 'vault');
    const [templateType, setTemplateType] = useState<AssignmentTemplateType>(template?.template_type || 'checklist');
    const [exercises, setExercises] = useState(template?.exercises || '');
    const [mainStations, setMainStations] = useState<MainStation[]>(
        template?.stations || [{ id: crypto.randomUUID(), content: '', side_stations: [] }]
    );
    const [isSaving, setIsSaving] = useState(false);

    const { createTemplate } = useCreateTemplate();
    const { updateTemplate } = useUpdateTemplate();

    const eventColors = ASSIGNMENT_EVENT_COLORS[event];

    // Station helpers
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

    const isValid = () => {
        if (!name.trim()) return false;
        if (templateType === 'checklist') {
            return exercises.trim() !== '';
        } else {
            return mainStations.some(s => s.content.trim());
        }
    };

    const handleSave = async () => {
        if (!hub?.id || !isValid()) return;

        setIsSaving(true);
        try {
            const validStations = mainStations
                .filter(m => m.content.trim())
                .map(m => ({
                    ...m,
                    side_stations: m.side_stations.filter(s => s.content.trim())
                }));

            if (template) {
                await updateTemplate({
                    id: template.id,
                    name: name.trim(),
                    event,
                    template_type: templateType,
                    exercises: templateType === 'checklist' ? exercises.trim() : '',
                    stations: templateType === 'stations' ? validStations : undefined
                });
            } else {
                await createTemplate({
                    hub_id: hub.id,
                    name: name.trim(),
                    event,
                    template_type: templateType,
                    exercises: templateType === 'checklist' ? exercises.trim() : '',
                    stations: templateType === 'stations' ? validStations : undefined
                });
            }
            onSaved();
        } catch (err) {
            console.error('Error saving template:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">
                        {template ? 'Edit Template' : 'New Template'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-2">
                            Template Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Warm-up Routine, Competition Prep"
                            className="input w-full"
                        />
                    </div>

                    {/* Template Type Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-2">
                            Template Type
                        </label>
                        <div className="flex space-x-1 rounded-lg bg-slate-100 p-1 w-fit">
                            <button
                                onClick={() => setTemplateType('checklist')}
                                className={`flex items-center gap-2 rounded-md py-2 px-4 text-sm font-medium transition-all ${
                                    templateType === 'checklist'
                                        ? 'bg-white text-slate-900 shadow'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <ClipboardList className="w-4 h-4" />
                                Checklist
                            </button>
                            <button
                                onClick={() => setTemplateType('stations')}
                                className={`flex items-center gap-2 rounded-md py-2 px-4 text-sm font-medium transition-all ${
                                    templateType === 'stations'
                                        ? 'bg-amber-100 text-amber-600 shadow'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Stations
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-2">
                            Event
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {ASSIGNMENT_EVENTS.map(e => {
                                const colors = ASSIGNMENT_EVENT_COLORS[e];
                                return (
                                    <button
                                        key={e}
                                        onClick={() => setEvent(e)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                            event === e
                                                ? `${colors.bg} ${colors.text} border ${colors.border}`
                                                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {ASSIGNMENT_EVENT_LABELS[e]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Checklist Content */}
                    {templateType === 'checklist' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-2">
                                Exercises (one per line)
                            </label>
                            <textarea
                                value={exercises}
                                onChange={(e) => setExercises(e.target.value)}
                                placeholder="Enter exercises, one per line..."
                                className="input w-full min-h-[150px] resize-none font-mono text-sm"
                                rows={8}
                            />
                        </div>
                    )}

                    {/* Stations Content */}
                    {templateType === 'stations' && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-slate-500">
                                    Stations ({mainStations.length})
                                </label>
                                <button
                                    onClick={addMainStation}
                                    className="text-sm text-mint-600 hover:text-mint-700 flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Station
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
                                                        className="text-[10px] text-amber-500 hover:text-amber-400 flex items-center gap-0.5"
                                                    >
                                                        <Plus className="w-2.5 h-2.5" />
                                                        Add
                                                    </button>
                                                )}
                                            </div>

                                            {station.side_stations.length === 0 ? (
                                                <p className="text-[10px] text-slate-500 text-center py-1.5 bg-slate-50 rounded border border-dashed border-slate-300">
                                                    No side stations
                                                </p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {station.side_stations.map((side, sideIdx) => (
                                                        <div key={side.id} className="bg-amber-500/10 rounded p-2 border border-amber-500/20">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[10px] font-medium text-amber-400">Side {sideIdx + 1}</span>
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
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                    <button onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isValid()}
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
                                {template ? 'Update Template' : 'Create Template'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
