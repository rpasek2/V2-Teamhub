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
    combinedIndices?: number[][]; // Indices of combined columns
    onCombinedIndicesChange?: (indices: number[][]) => void;
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
    onColumnOrderChange,
    combinedIndices: externalCombinedIndices,
    onCombinedIndicesChange
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
        const draggedDisplayIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

        if (draggedDisplayIndex === targetIndex || isNaN(draggedDisplayIndex)) {
            setColumnDragState(null);
            return;
        }

        // Calculate new order
        const currentOrder = columnOrder && columnOrder.length === activeLevels.length
            ? [...columnOrder]
            : activeLevels.map((_, i) => i);

        // Get the original index of the dragged column
        const draggedOriginalIdx = currentOrder[draggedDisplayIndex];

        // Check if the dragged column is part of a combined group
        const cleanedCombinedIndices = (externalCombinedIndices || [])
            .map(g => g.filter(idx => idx >= 0 && idx < activeLevels.length))
            .filter(g => g.length > 1);

        const draggedGroup = cleanedCombinedIndices.find(g => g.includes(draggedOriginalIdx));

        if (draggedGroup) {
            // Moving a combined group - find all display indices in this group
            const groupDisplayIndices = draggedGroup
                .map(origIdx => currentOrder.indexOf(origIdx))
                .filter(di => di !== -1)
                .sort((a, b) => a - b);

            if (groupDisplayIndices.length > 1) {
                // Remove all group members from their current positions (in reverse order to maintain indices)
                const removedOriginalIndices: number[] = [];
                for (let i = groupDisplayIndices.length - 1; i >= 0; i--) {
                    const di = groupDisplayIndices[i];
                    const [removed] = currentOrder.splice(di, 1);
                    removedOriginalIndices.unshift(removed);
                }

                // Calculate adjusted target index after removal
                let adjustedTarget = targetIndex;
                const minRemovedIdx = groupDisplayIndices[0];
                if (targetIndex > minRemovedIdx) {
                    adjustedTarget = targetIndex - groupDisplayIndices.length;
                }

                // Insert all group members at the target position
                currentOrder.splice(adjustedTarget, 0, ...removedOriginalIndices);

                onColumnOrderChange?.(currentOrder);
                setColumnDragState(null);
                return;
            }
        }

        // Single column move (not part of a group)
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

    // Track which columns are combined using level keys (level-scheduleGroup)
    // This is more robust than indices since it survives reordering
    // combinedIndices still uses numbers for backward compatibility, but we handle the mapping
    const combinedIndices = externalCombinedIndices || [];
    const setCombinedIndices = (updater: number[][] | ((prev: number[][]) => number[][])) => {
        const newValue = typeof updater === 'function' ? updater(combinedIndices) : updater;
        onCombinedIndicesChange?.(newValue);
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

    // Map from ordered index to original index
    const orderedToOriginal = useMemo(() => {
        if (!columnOrder || columnOrder.length !== activeLevels.length) {
            return activeLevels.map((_, i) => i);
        }
        const validOrder = columnOrder.every(i => i >= 0 && i < activeLevels.length);
        if (!validOrder) {
            return activeLevels.map((_, i) => i);
        }
        return columnOrder;
    }, [activeLevels, columnOrder]);

    // Clean up combinedIndices to remove any invalid indices
    const validCombinedIndices = useMemo(() => {
        return combinedIndices
            .map(group => group.filter(idx => idx >= 0 && idx < activeLevels.length))
            .filter(group => group.length > 1);
    }, [combinedIndices, activeLevels.length]);

    // Combine two adjacent columns by their ORIGINAL indices
    const combineColumnsByOriginalIndices = (leftOriginalIdx: number, rightOriginalIdx: number) => {
        if (leftOriginalIdx < 0 || leftOriginalIdx >= activeLevels.length ||
            rightOriginalIdx < 0 || rightOriginalIdx >= activeLevels.length) {
            return;
        }

        setCombinedIndices(prev => {
            // Clean up any invalid indices first
            const cleanedPrev = prev
                .map(g => g.filter(idx => idx >= 0 && idx < activeLevels.length))
                .filter(g => g.length > 0);

            // Find if either index is already part of a group
            const leftGroupIdx = cleanedPrev.findIndex(g => g.includes(leftOriginalIdx));
            const rightGroupIdx = cleanedPrev.findIndex(g => g.includes(rightOriginalIdx));

            if (leftGroupIdx === -1 && rightGroupIdx === -1) {
                // Neither is in a group, create new group
                return [...cleanedPrev, [leftOriginalIdx, rightOriginalIdx]];
            } else if (leftGroupIdx !== -1 && rightGroupIdx === -1) {
                // Left is in a group, add right to it
                const newGroups = [...cleanedPrev];
                newGroups[leftGroupIdx] = [...newGroups[leftGroupIdx], rightOriginalIdx];
                return newGroups;
            } else if (leftGroupIdx === -1 && rightGroupIdx !== -1) {
                // Right is in a group, add left to it
                const newGroups = [...cleanedPrev];
                newGroups[rightGroupIdx] = [leftOriginalIdx, ...newGroups[rightGroupIdx]];
                return newGroups;
            } else if (leftGroupIdx !== rightGroupIdx) {
                // Both in different groups, merge the groups
                const newGroups = cleanedPrev.filter((_, i) => i !== leftGroupIdx && i !== rightGroupIdx);
                const merged = [...cleanedPrev[leftGroupIdx], ...cleanedPrev[rightGroupIdx]];
                return [...newGroups, merged];
            }
            // Already in same group, nothing to do
            return cleanedPrev;
        });
    };

    // Split columns by their ORIGINAL indices - split at the boundary between left and right
    const splitColumnsByOriginalIndices = (leftOriginalIdx: number, rightOriginalIdx: number) => {
        setCombinedIndices(prev => {
            const groupIdx = prev.findIndex(g => g.includes(leftOriginalIdx) && g.includes(rightOriginalIdx));
            if (groupIdx === -1) return prev;

            const group = prev[groupIdx];

            // Find the position of these two indices in the current display order
            const leftDisplayIdx = orderedToOriginal.indexOf(leftOriginalIdx);
            const rightDisplayIdx = orderedToOriginal.indexOf(rightOriginalIdx);

            if (leftDisplayIdx === -1 || rightDisplayIdx === -1) return prev;

            // Get all group indices and their display positions
            const groupWithDisplayPos = group.map(idx => ({
                originalIdx: idx,
                displayIdx: orderedToOriginal.indexOf(idx)
            })).filter(item => item.displayIdx !== -1);

            // Sort by display position
            groupWithDisplayPos.sort((a, b) => a.displayIdx - b.displayIdx);

            // Split: indices that appear before or at leftDisplayIdx go to left part
            // indices that appear at or after rightDisplayIdx go to right part
            const splitPoint = groupWithDisplayPos.findIndex(item => item.originalIdx === rightOriginalIdx);

            if (splitPoint === -1 || splitPoint === 0) return prev;

            const leftPart = groupWithDisplayPos.slice(0, splitPoint).map(item => item.originalIdx);
            const rightPart = groupWithDisplayPos.slice(splitPoint).map(item => item.originalIdx);

            const newGroups = prev.filter((_, i) => i !== groupIdx);
            if (leftPart.length > 1) newGroups.push(leftPart);
            if (rightPart.length > 1) newGroups.push(rightPart);

            return newGroups;
        });
    };

    // Check if two columns (by original indices) are combined
    const areColumnsCombined = (leftOriginalIdx: number, rightOriginalIdx: number) => {
        return validCombinedIndices.some(g => g.includes(leftOriginalIdx) && g.includes(rightOriginalIdx));
    };

    // Build combined groups from orderedLevels based on combinedIndices
    // The combinedIndices use ORIGINAL indices (before ordering), so we need to map correctly
    const displayGroups = useMemo((): CombinedGroup[] => {
        const groups: CombinedGroup[] = [];
        const processedOriginalIndices = new Set<number>();

        // Iterate in ORDERED sequence (using orderedLevels)
        for (let displayIdx = 0; displayIdx < orderedLevels.length; displayIdx++) {
            // Map back to original index
            const originalIdx = orderedToOriginal[displayIdx];

            if (processedOriginalIndices.has(originalIdx)) continue;

            // Find if this original index is part of a combined group
            const combinedGroup = validCombinedIndices.find(g => g.includes(originalIdx));

            if (combinedGroup) {
                // Get the levels for this combined group, ordered by their display position
                const groupLevelsWithPos = combinedGroup
                    .map(idx => ({
                        originalIdx: idx,
                        displayIdx: orderedToOriginal.indexOf(idx),
                        level: activeLevels[idx]
                    }))
                    .filter(item => item.displayIdx !== -1 && item.level)
                    .sort((a, b) => a.displayIdx - b.displayIdx);

                const levels = groupLevelsWithPos.map(item => item.level);

                if (levels.length > 0) {
                    const start_time = levels.reduce((min, l) => l.start_time < min ? l.start_time : min, '23:59:00');
                    const end_time = levels.reduce((max, l) => l.end_time > max ? l.end_time : max, '00:00:00');

                    groups.push({ levels, start_time, end_time });
                    combinedGroup.forEach(idx => processedOriginalIndices.add(idx));
                }
            } else {
                // Single level - use the ordered level
                const level = orderedLevels[displayIdx];
                if (level) {
                    groups.push({
                        levels: [level],
                        start_time: level.start_time,
                        end_time: level.end_time
                    });
                    processedOriginalIndices.add(originalIdx);
                }
            }
        }

        return groups;
    }, [orderedLevels, orderedToOriginal, activeLevels, validCombinedIndices]);

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
                            // Map display index back to original index
                            const originalIdx = orderedToOriginal[displayIdx];

                            // Find if this level is part of a combined group
                            const combinedGroup = validCombinedIndices.find(g => g.includes(originalIdx));

                            // If this level is part of a combined group, determine if we should render it
                            // We render at the first display position of the group
                            if (combinedGroup) {
                                // Find the minimum display index within this combined group
                                const groupDisplayIndices = combinedGroup
                                    .map(idx => orderedToOriginal.indexOf(idx))
                                    .filter(di => di !== -1);
                                const minDisplayIdx = Math.min(...groupDisplayIndices);

                                // Only render if this is the first column of the group
                                if (displayIdx !== minDisplayIdx) {
                                    return null;
                                }
                            }

                            // Get all levels in this combined group for display, sorted by display order
                            const groupLevels = combinedGroup
                                ? combinedGroup
                                    .map(i => ({ idx: i, level: activeLevels[i], displayPos: orderedToOriginal.indexOf(i) }))
                                    .filter(item => item.level && item.displayPos !== -1)
                                    .sort((a, b) => a.displayPos - b.displayPos)
                                    .map(item => item.level)
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
                                    {canManage && (() => {
                                        // Find the last display index of this group (or just this column if not combined)
                                        let lastGroupDisplayIdx = displayIdx;
                                        if (combinedGroup) {
                                            const groupDisplayIndices = combinedGroup
                                                .map(idx => orderedToOriginal.indexOf(idx))
                                                .filter(di => di !== -1);
                                            lastGroupDisplayIdx = Math.max(...groupDisplayIndices);
                                        }

                                        // The next column after the group
                                        const nextAfterGroupDisplayIdx = lastGroupDisplayIdx + 1;
                                        if (nextAfterGroupDisplayIdx >= orderedLevels.length) {
                                            return null; // No next column
                                        }

                                        const nextAfterGroupOriginalIdx = orderedToOriginal[nextAfterGroupDisplayIdx];
                                        const lastInGroupOriginalIdx = orderedToOriginal[lastGroupDisplayIdx];

                                        // Check if this group is combined with the next column
                                        const isNextCombined = areColumnsCombined(lastInGroupOriginalIdx, nextAfterGroupOriginalIdx);

                                        return (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isNextCombined) {
                                                        // Split: break the link between last of current group and next
                                                        splitColumnsByOriginalIndices(lastInGroupOriginalIdx, nextAfterGroupOriginalIdx);
                                                    } else {
                                                        // Combine: link last of current group with next
                                                        combineColumnsByOriginalIndices(lastInGroupOriginalIdx, nextAfterGroupOriginalIdx);
                                                    }
                                                }}
                                                className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                                    isNextCombined
                                                        ? 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                                }`}
                                                title={isNextCombined ? 'Split columns' : 'Combine columns'}
                                            >
                                                {isNextCombined ? (
                                                    <Unlink className="w-3.5 h-3.5" />
                                                ) : (
                                                    <Link className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        );
                                    })()}
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

                                        // Scale text size based on block height for visibility from a distance
                                        // Tiny blocks (< 48px): compact view
                                        // Small blocks (48-72px): medium text
                                        // Medium blocks (72-120px): large text with coach
                                        // Large blocks (>= 120px): extra large text with coach and time
                                        const isSmall = blockHeight >= 48 && blockHeight < 72;
                                        const isMedium = blockHeight >= 72 && blockHeight < 120;
                                        const isLarge = blockHeight >= 120;

                                        const showCoach = (isMedium || isLarge) && block.coach;
                                        const showTimeRange = isLarge;

                                        // Dynamic text classes based on block size
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
