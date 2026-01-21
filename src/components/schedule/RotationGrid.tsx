import { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { X, User, Loader2, GripVertical, Pencil, EyeOff, Eye, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { RotationBlock, RotationEvent } from '../../types';

interface ActiveLevel {
    level: string;
    schedule_group: string;
    start_time: string;
    end_time: string;
    is_external_group?: boolean;
}

interface Coach {
    id: string;
    full_name: string;
}

interface RotationGridProps {
    dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    activeLevels: ActiveLevel[];
    blocks: RotationBlock[];
    selectedEvent: RotationEvent | null;
    coaches: Coach[];
    onBlockCreated: () => void;
    onBlockDeleted: (blockId: string) => void;
    onBlockUpdated: () => void;
    canManage: boolean;
    columnOrder?: number[]; // Custom order of columns by index
    onColumnOrderChange?: (newOrder: number[]) => void;
    columnNames?: Record<string, string>; // Custom names: { "Level 5|A": "Optionals" }
    onColumnNamesChange?: (names: Record<string, string>) => void;
    hiddenColumns?: string[]; // Hidden column keys: ["Level 3|A"]
    onHiddenColumnsChange?: (hidden: string[]) => void;
}

interface DragState {
    level: string;
    scheduleGroup: string;
    startRow: number;
    endRow: number;
}

interface ColumnDragState {
    draggedIndex: number;
    targetIndex: number | null;
}

const ROW_HEIGHT = 24; // Height of each 5-minute row in pixels
const MINUTES_PER_ROW = 5;

export function RotationGrid({
    dayOfWeek,
    activeLevels,
    blocks,
    selectedEvent,
    coaches,
    onBlockCreated,
    onBlockDeleted,
    onBlockUpdated,
    canManage,
    columnOrder,
    onColumnOrderChange,
    columnNames = {},
    onColumnNamesChange,
    hiddenColumns = [],
    onHiddenColumnsChange
}: RotationGridProps) {
    const { hubId } = useParams();
    const { user } = useAuth();

    const [dragState, setDragState] = useState<DragState | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<RotationBlock | null>(null);
    const [savingCoach, setSavingCoach] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);

    // Column reordering drag state
    const [columnDragState, setColumnDragState] = useState<ColumnDragState | null>(null);

    // Editing column name state
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Show hidden columns toggle
    const [showHiddenColumns, setShowHiddenColumns] = useState(false);

    // Get level key for storage
    const getLevelKey = (level: ActiveLevel) => `${level.level}|${level.schedule_group}`;

    // Column drag handlers
    const handleColumnDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
        setColumnDragState({ draggedIndex: index, targetIndex: null });
    };

    const handleColumnDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (columnDragState && columnDragState.draggedIndex !== index) {
            setColumnDragState({ ...columnDragState, targetIndex: index });
        }
    };

    const handleColumnDragEnd = () => {
        setColumnDragState(null);
    };

    const handleColumnDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const draggedDisplayIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

        if (draggedDisplayIndex === targetIndex || isNaN(draggedDisplayIndex)) {
            setColumnDragState(null);
            return;
        }

        // Calculate new order
        const currentOrder = columnOrder && columnOrder.length === activeLevels.length
            ? [...columnOrder]
            : activeLevels.map((_, i) => i);

        // Simple single column move
        const [removed] = currentOrder.splice(draggedDisplayIndex, 1);

        // Calculate adjusted target index after removal
        let adjustedTarget = targetIndex;
        if (targetIndex > draggedDisplayIndex) {
            adjustedTarget = targetIndex - 1;
        }

        currentOrder.splice(adjustedTarget, 0, removed);

        onColumnOrderChange?.(currentOrder);
        setColumnDragState(null);
    };

    // Get ordered levels based on columnOrder prop or default order
    const orderedLevels = useMemo(() => {
        if (!columnOrder || columnOrder.length !== activeLevels.length) {
            return activeLevels;
        }
        // Validate that all indices in columnOrder are valid
        const validOrder = columnOrder.every(i => i >= 0 && i < activeLevels.length);
        if (!validOrder) {
            return activeLevels;
        }
        return columnOrder.map(i => activeLevels[i]);
    }, [activeLevels, columnOrder]);

    // Filter out hidden columns for display
    const visibleLevels = useMemo(() => {
        if (showHiddenColumns) return orderedLevels;
        return orderedLevels.filter(level => !hiddenColumns.includes(getLevelKey(level)));
    }, [orderedLevels, hiddenColumns, showHiddenColumns]);

    // Get display name for a level
    const getDisplayName = (level: ActiveLevel) => {
        const key = getLevelKey(level);
        return columnNames[key] || level.level;
    };

    // Handle rename
    const handleStartRename = (level: ActiveLevel) => {
        const key = getLevelKey(level);
        setEditingColumn(key);
        setEditingName(columnNames[key] || level.level);
    };

    const handleSaveRename = () => {
        if (!editingColumn) return;

        const level = activeLevels.find(l => getLevelKey(l) === editingColumn);
        const defaultName = level?.level || '';

        const newNames = { ...columnNames };
        if (editingName.trim() && editingName.trim() !== defaultName) {
            newNames[editingColumn] = editingName.trim();
        } else {
            // If empty or same as default, remove custom name
            delete newNames[editingColumn];
        }

        onColumnNamesChange?.(newNames);
        setEditingColumn(null);
        setEditingName('');
    };

    const handleCancelRename = () => {
        setEditingColumn(null);
        setEditingName('');
    };

    // Handle hide/show column
    const handleToggleHidden = (level: ActiveLevel) => {
        const key = getLevelKey(level);
        const newHidden = hiddenColumns.includes(key)
            ? hiddenColumns.filter(k => k !== key)
            : [...hiddenColumns, key];
        onHiddenColumnsChange?.(newHidden);
    };

    // Calculate time range for the grid (earliest start to latest end across all levels)
    const timeRange = useMemo(() => {
        let earliest = '23:59';
        let latest = '00:00';

        activeLevels.forEach(level => {
            if (level.start_time < earliest) earliest = level.start_time;
            if (level.end_time > latest) latest = level.end_time;
        });

        return { start: earliest, end: latest };
    }, [activeLevels]);

    // Generate time slots (5-minute intervals)
    const timeSlots = useMemo(() => {
        const slots: string[] = [];
        const [startHour, startMin] = timeRange.start.split(':').map(Number);
        const [endHour, endMin] = timeRange.end.split(':').map(Number);

        let currentHour = startHour;
        let currentMin = startMin;

        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
            const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}:00`;
            slots.push(timeStr);

            currentMin += MINUTES_PER_ROW;
            if (currentMin >= 60) {
                currentMin = 0;
                currentHour++;
            }
        }

        return slots;
    }, [timeRange]);

    // Format time for the left column - returns { label, isHour } for styling
    const formatTimeLabel = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const isHour = minutes === '00';

        if (isHour) {
            return { label: `${hour12}:00 ${ampm}`, isHour: true };
        }
        return { label: `${hour12}:${minutes}`, isHour: false };
    };

    const timeToRow = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const [startHours, startMinutes] = timeRange.start.split(':').map(Number);
        const totalMinutes = (hours * 60 + minutes) - (startHours * 60 + startMinutes);
        return Math.floor(totalMinutes / MINUTES_PER_ROW);
    };

    const rowToTime = (row: number) => {
        const [startHours, startMinutes] = timeRange.start.split(':').map(Number);
        const totalMinutes = (startHours * 60 + startMinutes) + (row * MINUTES_PER_ROW);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    };

    // Check if a level is active at a given time
    const isLevelActiveAtTime = (level: ActiveLevel, timeSlot: string) => {
        return timeSlot >= level.start_time && timeSlot < level.end_time;
    };

    // Get blocks for a level
    const getBlocksForLevel = (level: ActiveLevel) => {
        return blocks.filter(b =>
            b.level === level.level && b.schedule_group === level.schedule_group
        );
    };

    const handleMouseDown = (level: ActiveLevel, row: number) => {
        if (!canManage || !selectedEvent) return;

        const timeSlot = timeSlots[row];

        // Check if this cell is within the level's active time
        if (!isLevelActiveAtTime(level, timeSlot)) return;

        setIsDragging(true);
        setDragState({
            level: level.level,
            scheduleGroup: level.schedule_group,
            startRow: row,
            endRow: row
        });
    };

    const handleMouseEnter = (level: ActiveLevel, row: number) => {
        if (!isDragging || !dragState) return;

        // Only allow dragging within the same level
        if (level.level !== dragState.level || level.schedule_group !== dragState.scheduleGroup) return;

        const timeSlot = timeSlots[row];
        if (!isLevelActiveAtTime(level, timeSlot)) return;

        setDragState({
            ...dragState,
            endRow: row
        });
    };

    const handleMouseUp = async () => {
        if (!isDragging || !dragState || !selectedEvent || !hubId || !user) {
            setIsDragging(false);
            setDragState(null);
            return;
        }

        const startRow = Math.min(dragState.startRow, dragState.endRow);
        const endRow = Math.max(dragState.startRow, dragState.endRow);

        const startTime = rowToTime(startRow);
        const endTime = rowToTime(endRow + 1); // +1 because we want to include the end row

        const { error } = await supabase
            .from('rotation_blocks')
            .insert({
                hub_id: hubId,
                day_of_week: dayOfWeek,
                level: dragState.level,
                schedule_group: dragState.scheduleGroup,
                rotation_event_id: selectedEvent.id,
                event_name: selectedEvent.name,
                start_time: startTime,
                end_time: endTime,
                color: selectedEvent.color,
                created_by: user.id
            });

        if (error) {
            console.error('Error creating block:', error);
        } else {
            await onBlockCreated();
        }

        setIsDragging(false);
        setDragState(null);
    };

    const handleDeleteBlock = async (e: React.MouseEvent, blockId: string) => {
        e.stopPropagation();
        await onBlockDeleted(blockId);
    };

    const handleBlockClick = (e: React.MouseEvent, block: RotationBlock) => {
        e.stopPropagation();
        if (canManage) {
            setSelectedBlock(block);
        }
    };

    const handleAssignCoach = async (coachId: string | null) => {
        if (!selectedBlock) return;

        setSavingCoach(true);
        const { error } = await supabase
            .from('rotation_blocks')
            .update({
                coach_id: coachId,
                updated_at: new Date().toISOString()
            })
            .eq('id', selectedBlock.id);

        if (error) {
            console.error('Error assigning coach:', error);
        } else {
            await onBlockUpdated();
        }
        setSavingCoach(false);
        setSelectedBlock(null);
    };

    // Get first name only for compact display
    const getFirstName = (fullName: string) => {
        return fullName.split(' ')[0];
    };

    // Format time for display (e.g., "4:30 PM")
    const formatBlockTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Calculate block position and height
    const getBlockStyle = (block: RotationBlock) => {
        const startRow = timeToRow(block.start_time);
        const endRow = timeToRow(block.end_time);
        const height = (endRow - startRow) * ROW_HEIGHT;

        return {
            top: startRow * ROW_HEIGHT,
            height: Math.max(height, ROW_HEIGHT),
            backgroundColor: `${block.color || '#10b981'}30`,
            borderColor: block.color || '#10b981',
            color: block.color || '#10b981'
        };
    };

    // Get drag selection style for a level
    const getDragSelectionStyle = (level: ActiveLevel) => {
        if (!dragState) return null;

        if (level.level !== dragState.level || level.schedule_group !== dragState.scheduleGroup) {
            return null;
        }

        const startRow = Math.min(dragState.startRow, dragState.endRow);
        const endRow = Math.max(dragState.startRow, dragState.endRow);
        const height = (endRow - startRow + 1) * ROW_HEIGHT;

        return {
            top: startRow * ROW_HEIGHT,
            height,
            backgroundColor: `${selectedEvent?.color || '#10b981'}30`,
            borderColor: selectedEvent?.color || '#10b981'
        };
    };

    return (
        <div
            ref={gridRef}
            className="card overflow-hidden"
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                if (isDragging) {
                    handleMouseUp();
                }
            }}
        >
            {/* Hidden columns toggle */}
            {canManage && hiddenColumns.length > 0 && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                    <span className="text-sm text-amber-700">
                        {hiddenColumns.length} column{hiddenColumns.length > 1 ? 's' : ''} hidden
                    </span>
                    <button
                        onClick={() => setShowHiddenColumns(!showHiddenColumns)}
                        className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium"
                    >
                        {showHiddenColumns ? (
                            <>
                                <EyeOff className="w-4 h-4" />
                                Hide
                            </>
                        ) : (
                            <>
                                <Eye className="w-4 h-4" />
                                Show All
                            </>
                        )}
                    </button>
                </div>
            )}

            <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                    {/* Header */}
                    <div className="flex border-b border-slate-200 bg-slate-50">
                        <div className="w-20 flex-shrink-0 px-2 py-3 text-sm font-semibold text-slate-700">
                            Time
                        </div>
                        {visibleLevels.map((level, displayIdx) => {
                            const key = getLevelKey(level);
                            const isHidden = hiddenColumns.includes(key);
                            const isDraggingCol = columnDragState?.draggedIndex === displayIdx;
                            const isDragTarget = columnDragState?.targetIndex === displayIdx;
                            const isEditing = editingColumn === key;

                            return (
                                <div
                                    key={key}
                                    draggable={canManage && !isEditing}
                                    onDragStart={(e) => handleColumnDragStart(e, displayIdx)}
                                    onDragOver={(e) => handleColumnDragOver(e, displayIdx)}
                                    onDragEnd={handleColumnDragEnd}
                                    onDrop={(e) => handleColumnDrop(e, displayIdx)}
                                    className={`flex-1 min-w-[120px] border-l border-slate-200 transition-all ${
                                        level.is_external_group ? 'bg-purple-50/50' : ''
                                    } ${isDraggingCol ? 'opacity-50' : ''} ${
                                        isDragTarget ? 'border-l-4 border-l-brand-500' : ''
                                    } ${isHidden ? 'bg-amber-50/50' : ''} ${
                                        canManage && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''
                                    }`}
                                >
                                    <div className="flex items-center px-2 py-3">
                                        {/* Drag handle */}
                                        {canManage && !isEditing && (
                                            <div className="flex-shrink-0 mr-1 text-slate-400 hover:text-slate-600">
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                        )}

                                        {/* Column name - editable or display */}
                                        <div className="flex-1 min-w-0">
                                            {isEditing ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveRename();
                                                            if (e.key === 'Escape') handleCancelRename();
                                                        }}
                                                        className="w-full px-1 py-0.5 text-sm font-semibold border border-brand-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSaveRename}
                                                        className="p-1 text-brand-600 hover:text-brand-700"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelRename}
                                                        className="p-1 text-slate-400 hover:text-slate-600"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <span className={`font-semibold ${level.is_external_group ? 'text-purple-700' : 'text-slate-700'} ${isHidden ? 'opacity-50' : ''}`}>
                                                        {getDisplayName(level)}
                                                    </span>
                                                    {level.schedule_group !== 'A' && (
                                                        <span className="ml-1 text-xs text-indigo-600">
                                                            ({level.schedule_group})
                                                        </span>
                                                    )}
                                                    {level.is_external_group && (
                                                        <span className="ml-1 text-xs text-purple-500">ext</span>
                                                    )}
                                                    {columnNames[key] && (
                                                        <div className="text-xs text-slate-400 truncate">
                                                            {level.level}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        {canManage && !isEditing && (
                                            <div className="flex-shrink-0 flex items-center gap-0.5 ml-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartRename(level);
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                    title="Rename column"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleHidden(level);
                                                    }}
                                                    className={`p-1 rounded transition-colors ${
                                                        isHidden
                                                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-100'
                                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                    title={isHidden ? 'Show column' : 'Hide column'}
                                                >
                                                    {isHidden ? (
                                                        <Eye className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <EyeOff className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid Body */}
                    <div className="flex">
                        {/* Time Column */}
                        <div className="w-20 flex-shrink-0 bg-slate-50 border-r border-slate-100">
                            {timeSlots.map((time) => {
                                const { label, isHour } = formatTimeLabel(time);
                                return (
                                    <div
                                        key={time}
                                        className={`h-6 px-2 flex items-center border-b border-slate-100 ${
                                            isHour ? 'bg-slate-100' : ''
                                        }`}
                                    >
                                        <span className={
                                            isHour
                                                ? 'text-xs font-medium text-slate-700'
                                                : 'text-[10px] text-slate-400'
                                        }>
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Level Columns */}
                        {visibleLevels.map((level) => {
                            const key = getLevelKey(level);
                            const levelBlocks = getBlocksForLevel(level);
                            const dragSelection = getDragSelectionStyle(level);
                            const isHidden = hiddenColumns.includes(key);

                            return (
                                <div
                                    key={key}
                                    className={`flex-1 min-w-[120px] border-l border-slate-200 relative ${isHidden ? 'opacity-50' : ''}`}
                                >
                                    {/* Time Rows */}
                                    {timeSlots.map((time, rowIndex) => {
                                        const isActive = isLevelActiveAtTime(level, time);
                                        return (
                                            <div
                                                key={time}
                                                className={`h-6 border-b border-slate-100 ${
                                                    isActive
                                                        ? selectedEvent
                                                            ? 'bg-white cursor-crosshair hover:bg-slate-50'
                                                            : 'bg-white'
                                                        : 'bg-slate-50'
                                                }`}
                                                onMouseDown={() => handleMouseDown(level, rowIndex)}
                                                onMouseEnter={() => handleMouseEnter(level, rowIndex)}
                                            />
                                        );
                                    })}

                                    {/* Drag Selection */}
                                    {dragSelection && (
                                        <div
                                            className="absolute left-1 right-1 border-2 border-dashed rounded pointer-events-none"
                                            style={dragSelection}
                                        />
                                    )}

                                    {/* Rotation Blocks */}
                                    {levelBlocks.map(block => {
                                        const style = getBlockStyle(block);
                                        const blockHeight = style.height as number;

                                        // Scale text size based on block height
                                        const isSmall = blockHeight >= 48 && blockHeight < 72;
                                        const isMedium = blockHeight >= 72 && blockHeight < 120;
                                        const isLarge = blockHeight >= 120;

                                        const showCoach = (isMedium || isLarge) && block.coach;
                                        const showTimeRange = isLarge;

                                        const eventTextClass = isLarge
                                            ? 'text-2xl font-bold'
                                            : isMedium
                                                ? 'text-xl font-bold'
                                                : isSmall
                                                    ? 'text-lg font-bold'
                                                    : 'text-sm font-semibold';

                                        const coachTextClass = isLarge
                                            ? 'text-lg'
                                            : 'text-base';

                                        const timeTextClass = 'text-base font-semibold';

                                        return (
                                            <div
                                                key={block.id}
                                                onClick={(e) => handleBlockClick(e, block)}
                                                className={`absolute left-1 right-1 rounded-lg border-2 px-3 py-2 overflow-hidden group flex flex-col ${
                                                    canManage ? 'cursor-pointer hover:brightness-95' : ''
                                                }`}
                                                style={style}
                                            >
                                                <div className="flex items-start justify-between flex-shrink-0">
                                                    <span className={`${eventTextClass} truncate leading-tight`}>
                                                        {block.event_name || block.rotation_event?.name || 'Event'}
                                                    </span>
                                                    {canManage && (
                                                        <button
                                                            onClick={(e) => handleDeleteBlock(e, block.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/50 rounded transition-opacity flex-shrink-0"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                                {showCoach && (
                                                    <div className={`${coachTextClass} opacity-80 truncate flex items-center gap-2 mt-1`}>
                                                        <User className={`${isLarge ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                                                        {getFirstName(block.coach!.full_name)}
                                                    </div>
                                                )}
                                                {showTimeRange && (
                                                    <div className={`mt-auto ${timeTextClass} opacity-80`}>
                                                        {formatBlockTime(block.start_time)} - {formatBlockTime(block.end_time)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Instructions */}
            {canManage && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
                    {selectedEvent ? (
                        <>Click and drag on the grid to create a "{selectedEvent.name}" block</>
                    ) : (
                        <>Select an event from the palette above, then click and drag to create blocks. Click a block to assign a coach.</>
                    )}
                </div>
            )}

            {/* Coach Assignment Modal */}
            {selectedBlock && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="card p-5 max-w-sm w-full mx-4">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Assign Coach
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {selectedBlock.event_name || selectedBlock.rotation_event?.name} ({formatBlockTime(selectedBlock.start_time)} - {formatBlockTime(selectedBlock.end_time)})
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedBlock(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Coach Options */}
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                            {/* Unassign option */}
                            <button
                                onClick={() => handleAssignCoach(null)}
                                disabled={savingCoach}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                    !selectedBlock.coach_id
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-400" />
                                </div>
                                <span className="text-sm font-medium">No coach assigned</span>
                                {savingCoach && !selectedBlock.coach_id && (
                                    <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                                )}
                            </button>

                            {/* Coach list */}
                            {coaches.map(coach => (
                                <button
                                    key={coach.id}
                                    onClick={() => handleAssignCoach(coach.id)}
                                    disabled={savingCoach}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                        selectedBlock.coach_id === coach.id
                                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                            : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                        selectedBlock.coach_id === coach.id
                                            ? 'bg-brand-100 text-brand-700'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {coach.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <span className="text-sm font-medium">{coach.full_name}</span>
                                    {savingCoach && selectedBlock.coach_id === coach.id && (
                                        <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                                    )}
                                </button>
                            ))}

                            {coaches.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    No coaches found in this hub.
                                </p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
