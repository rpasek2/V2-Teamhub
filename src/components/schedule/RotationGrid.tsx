import { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { X, User, Loader2, Link, Unlink, GripVertical } from 'lucide-react';
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

// A combined group represents multiple levels merged into one column
interface CombinedGroup {
    levels: ActiveLevel[];
    start_time: string;
    end_time: string;
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
    onColumnOrderChange
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
        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

        if (draggedIndex === targetIndex || isNaN(draggedIndex)) {
            setColumnDragState(null);
            return;
        }

        // Calculate new order
        const currentOrder = columnOrder && columnOrder.length === activeLevels.length
            ? [...columnOrder]
            : activeLevels.map((_, i) => i);

        const [removed] = currentOrder.splice(draggedIndex, 1);
        currentOrder.splice(targetIndex, 0, removed);

        onColumnOrderChange?.(currentOrder);
        setColumnDragState(null);
    };

    // Track which columns are combined (stored as sets of indices that are merged together)
    // e.g., [[0,1,2], [3,4]] means levels 0,1,2 are combined, and levels 3,4 are combined
    const [combinedIndices, setCombinedIndices] = useState<number[][]>([]);

    // Get ordered levels based on columnOrder prop or default order
    const orderedLevels = useMemo(() => {
        if (!columnOrder || columnOrder.length !== activeLevels.length) {
            return activeLevels;
        }
        return columnOrder.map(i => activeLevels[i]);
    }, [activeLevels, columnOrder]);

    // Map from ordered index to original index
    const orderedToOriginal = useMemo(() => {
        if (!columnOrder || columnOrder.length !== activeLevels.length) {
            return activeLevels.map((_, i) => i);
        }
        return columnOrder;
    }, [activeLevels, columnOrder]);

    // Combine two adjacent columns
    const combineColumns = (leftIndex: number) => {
        const rightIndex = leftIndex + 1;
        if (rightIndex >= activeLevels.length) return;

        setCombinedIndices(prev => {
            // Find if either index is already part of a group
            const leftGroupIdx = prev.findIndex(g => g.includes(leftIndex));
            const rightGroupIdx = prev.findIndex(g => g.includes(rightIndex));

            if (leftGroupIdx === -1 && rightGroupIdx === -1) {
                // Neither is in a group, create new group
                return [...prev, [leftIndex, rightIndex]];
            } else if (leftGroupIdx !== -1 && rightGroupIdx === -1) {
                // Left is in a group, add right to it
                const newGroups = [...prev];
                newGroups[leftGroupIdx] = [...newGroups[leftGroupIdx], rightIndex].sort((a, b) => a - b);
                return newGroups;
            } else if (leftGroupIdx === -1 && rightGroupIdx !== -1) {
                // Right is in a group, add left to it
                const newGroups = [...prev];
                newGroups[rightGroupIdx] = [leftIndex, ...newGroups[rightGroupIdx]].sort((a, b) => a - b);
                return newGroups;
            } else if (leftGroupIdx !== rightGroupIdx) {
                // Both in different groups, merge the groups
                const newGroups = prev.filter((_, i) => i !== leftGroupIdx && i !== rightGroupIdx);
                const merged = [...prev[leftGroupIdx], ...prev[rightGroupIdx]].sort((a, b) => a - b);
                return [...newGroups, merged];
            }
            // Already in same group, nothing to do
            return prev;
        });
    };

    // Split columns at a specific point
    const splitColumns = (leftIndex: number) => {
        const rightIndex = leftIndex + 1;

        setCombinedIndices(prev => {
            const groupIdx = prev.findIndex(g => g.includes(leftIndex) && g.includes(rightIndex));
            if (groupIdx === -1) return prev;

            const group = prev[groupIdx];
            // Find where to split
            const splitPoint = group.indexOf(rightIndex);
            const leftPart = group.slice(0, splitPoint);
            const rightPart = group.slice(splitPoint);

            const newGroups = prev.filter((_, i) => i !== groupIdx);
            if (leftPart.length > 1) newGroups.push(leftPart);
            if (rightPart.length > 1) newGroups.push(rightPart);

            return newGroups;
        });
    };

    // Check if two adjacent columns are combined
    const areColumnsCombined = (leftIndex: number, rightIndex: number) => {
        return combinedIndices.some(g => g.includes(leftIndex) && g.includes(rightIndex));
    };

    // Build combined groups from activeLevels based on combinedIndices
    const displayGroups = useMemo((): CombinedGroup[] => {
        const groups: CombinedGroup[] = [];
        const processed = new Set<number>();

        for (let i = 0; i < activeLevels.length; i++) {
            if (processed.has(i)) continue;

            // Find if this index is part of a combined group
            const combinedGroup = combinedIndices.find(g => g.includes(i));

            if (combinedGroup) {
                // Add all levels in this combined group
                const levels = combinedGroup.map(idx => activeLevels[idx]);
                const start_time = levels.reduce((min, l) => l.start_time < min ? l.start_time : min, '23:59:00');
                const end_time = levels.reduce((max, l) => l.end_time > max ? l.end_time : max, '00:00:00');

                groups.push({ levels, start_time, end_time });
                combinedGroup.forEach(idx => processed.add(idx));
            } else {
                // Single level
                groups.push({
                    levels: [activeLevels[i]],
                    start_time: activeLevels[i].start_time,
                    end_time: activeLevels[i].end_time
                });
                processed.add(i);
            }
        }

        return groups;
    }, [activeLevels, combinedIndices]);

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

    // Check if a combined group is active at a given time
    const isGroupActiveAtTime = (group: CombinedGroup, timeSlot: string) => {
        return group.levels.some(level => isLevelActiveAtTime(level, timeSlot));
    };

    // Get blocks for a combined group - only from the primary (first) level
    const getBlocksForGroup = (group: CombinedGroup) => {
        const primaryLevel = group.levels[0];
        return blocks.filter(b =>
            b.level === primaryLevel.level && b.schedule_group === primaryLevel.schedule_group
        );
    };

    const handleMouseDown = (groupIndex: number, row: number) => {
        if (!canManage || !selectedEvent) return;

        const group = displayGroups[groupIndex];
        const timeSlot = timeSlots[row];

        // Check if this cell is within the group's active time
        if (!isGroupActiveAtTime(group, timeSlot)) return;

        // Use the first level in the group for the block
        const primaryLevel = group.levels[0];

        setIsDragging(true);
        setDragState({
            level: primaryLevel.level,
            scheduleGroup: primaryLevel.schedule_group,
            startRow: row,
            endRow: row
        });
    };

    const handleMouseEnter = (groupIndex: number, row: number) => {
        if (!isDragging || !dragState) return;

        const group = displayGroups[groupIndex];

        // Only allow dragging within the same group
        const isInGroup = group.levels.some(
            l => l.level === dragState.level && l.schedule_group === dragState.scheduleGroup
        );
        if (!isInGroup) return;

        const timeSlot = timeSlots[row];
        if (!isGroupActiveAtTime(group, timeSlot)) return;

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

    // Get drag selection style for a group
    const getDragSelectionStyle = (groupIndex: number) => {
        if (!dragState) return null;

        const group = displayGroups[groupIndex];
        const isInGroup = group.levels.some(
            l => l.level === dragState.level && l.schedule_group === dragState.scheduleGroup
        );
        if (!isInGroup) return null;

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
            <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                    {/* Header */}
                    <div className="flex border-b border-slate-200 bg-slate-50">
                        <div className="w-20 flex-shrink-0 px-2 py-3 text-sm font-semibold text-slate-700">
                            Time
                        </div>
                        {orderedLevels.map((level, displayIdx) => {
                            // Map display index back to original index for combine/split logic
                            const originalIdx = orderedToOriginal[displayIdx];
                            const isCombinedWithPrev = originalIdx > 0 && areColumnsCombined(originalIdx - 1, originalIdx);
                            const isCombinedWithNext = originalIdx < activeLevels.length - 1 &&
                                areColumnsCombined(originalIdx, originalIdx + 1);

                            // Skip rendering if this column is combined with previous (it's collapsed)
                            if (isCombinedWithPrev) {
                                return null;
                            }

                            // Get all levels in this combined group for display
                            const combinedGroup = combinedIndices.find(g => g.includes(originalIdx));
                            const groupLevels = combinedGroup
                                ? combinedGroup.map(i => activeLevels[i])
                                : [level];
                            const displayName = groupLevels.map(l => l.level).join('/');
                            const isExternal = groupLevels.some(l => l.is_external_group);

                            const isDragging = columnDragState?.draggedIndex === displayIdx;
                            const isDragTarget = columnDragState?.targetIndex === displayIdx;

                            return (
                                <div
                                    key={`${level.level}-${level.schedule_group}`}
                                    draggable={canManage}
                                    onDragStart={(e) => handleColumnDragStart(e, displayIdx)}
                                    onDragOver={(e) => handleColumnDragOver(e, displayIdx)}
                                    onDragEnd={handleColumnDragEnd}
                                    onDrop={(e) => handleColumnDrop(e, displayIdx)}
                                    className={`flex-1 min-w-[120px] flex items-center border-l border-slate-200 transition-all ${
                                        isExternal ? 'bg-purple-50/50' : ''
                                    } ${isDragging ? 'opacity-50' : ''} ${
                                        isDragTarget ? 'border-l-4 border-l-brand-500' : ''
                                    } ${canManage ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                >
                                    {/* Drag handle */}
                                    {canManage && (
                                        <div className="flex-shrink-0 pl-1 text-slate-400 hover:text-slate-600">
                                            <GripVertical className="w-4 h-4" />
                                        </div>
                                    )}
                                    <div className="flex-1 px-2 py-3 text-center">
                                        <span className={`font-semibold ${isExternal ? 'text-purple-700' : 'text-slate-700'}`}>
                                            {displayName}
                                        </span>
                                        {level.schedule_group !== 'A' && (
                                            <span className="ml-1 text-xs text-indigo-600">
                                                ({level.schedule_group})
                                            </span>
                                        )}
                                        {isExternal && (
                                            <span className="ml-1 text-xs text-purple-500">ext</span>
                                        )}
                                    </div>
                                    {/* Combine/Split button between columns */}
                                    {canManage && originalIdx < activeLevels.length - 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                isCombinedWithNext ? splitColumns(originalIdx) : combineColumns(originalIdx);
                                            }}
                                            className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                                isCombinedWithNext
                                                    ? 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                            }`}
                                            title={isCombinedWithNext ? 'Split columns' : 'Combine columns'}
                                        >
                                            {isCombinedWithNext ? (
                                                <Unlink className="w-3.5 h-3.5" />
                                            ) : (
                                                <Link className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    )}
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

                        {/* Level/Group Columns */}
                        {displayGroups.map((group, groupIndex) => {
                            const groupBlocks = getBlocksForGroup(group);
                            const dragSelection = getDragSelectionStyle(groupIndex);

                            return (
                                <div
                                    key={group.levels.map(l => `${l.level}-${l.schedule_group}`).join('+')}
                                    className="flex-1 min-w-[120px] border-l border-slate-200 relative"
                                >
                                    {/* Time Rows */}
                                    {timeSlots.map((time, rowIndex) => {
                                        const isActive = isGroupActiveAtTime(group, time);
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
                                                onMouseDown={() => handleMouseDown(groupIndex, rowIndex)}
                                                onMouseEnter={() => handleMouseEnter(groupIndex, rowIndex)}
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
                                    {groupBlocks.map(block => {
                                        const style = getBlockStyle(block);
                                        const blockHeight = style.height as number;
                                        // Priority: event name (always) > coach name (if height >= 56) > time (if height >= 80)
                                        const showCoach = blockHeight >= 56 && block.coach;
                                        const showTimeRange = blockHeight >= 80;
                                        return (
                                            <div
                                                key={block.id}
                                                onClick={(e) => handleBlockClick(e, block)}
                                                className={`absolute left-1 right-1 rounded border-2 px-2.5 py-1.5 overflow-hidden group flex flex-col ${
                                                    canManage ? 'cursor-pointer hover:brightness-95' : ''
                                                }`}
                                                style={style}
                                            >
                                                <div className="flex items-start justify-between flex-shrink-0">
                                                    <span className="text-sm font-semibold truncate">
                                                        {block.event_name || block.rotation_event?.name || 'Event'}
                                                    </span>
                                                    {canManage && (
                                                        <button
                                                            onClick={(e) => handleDeleteBlock(e, block.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/50 rounded transition-opacity flex-shrink-0"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                {showCoach && (
                                                    <div className="text-xs opacity-80 truncate flex items-center gap-1.5 mt-0.5">
                                                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                                                        {getFirstName(block.coach!.full_name)}
                                                    </div>
                                                )}
                                                {showTimeRange && (
                                                    <div className="mt-auto text-xs font-medium opacity-80">
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
