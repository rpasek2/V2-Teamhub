import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Circle, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react-native';
import { colors, theme } from '../../constants/colors';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';

interface StaffTask {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed';
    assigned_by: string | null;
    created_at: string;
}

interface MyTasksSectionProps {
    tasks: StaffTask[];
    onStatusChange: (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => void;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
    urgent: { bg: colors.red[100], text: colors.red[600] },
    high: { bg: colors.orange[100], text: colors.orange[600] },
    medium: { bg: colors.amber[100], text: colors.amber[600] },
    low: { bg: colors.slate[100], text: colors.slate[600] },
};

function getNextStatus(current: 'pending' | 'in_progress' | 'completed'): 'pending' | 'in_progress' | 'completed' {
    if (current === 'pending') return 'in_progress';
    if (current === 'in_progress') return 'completed';
    return 'pending';
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'completed') return <CheckCircle2 size={22} color={colors.success[500]} />;
    if (status === 'in_progress') return <Clock size={22} color={theme.light.primary} />;
    return <Circle size={22} color={colors.slate[400]} />;
}

export function MyTasksSection({ tasks, onStatusChange }: MyTasksSectionProps) {
    const user = useAuthStore((state) => state.user);

    if (tasks.length === 0) return null;

    const displayTasks = tasks.slice(0, 5);
    const hasMore = tasks.length > 5;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.title}>My Tasks</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{tasks.length}</Text>
                    </View>
                </View>
                {user && (
                    <TouchableOpacity onPress={() => router.push(`/staff/${user.id}`)}>
                        <Text style={styles.viewAll}>View All</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.card}>
                {displayTasks.map((task, index) => {
                    const dueDate = task.due_date ? parseISO(task.due_date) : null;
                    const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
                    const isDueToday = dueDate && isToday(dueDate);
                    const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low;

                    return (
                        <View
                            key={task.id}
                            style={[
                                styles.taskItem,
                                index === displayTasks.length - 1 && styles.lastItem,
                                isOverdue ? styles.taskItemOverdue : undefined,
                            ]}
                        >
                            <TouchableOpacity
                                onPress={() => onStatusChange(task.id, getNextStatus(task.status))}
                                style={styles.statusButton}
                            >
                                <StatusIcon status={task.status} />
                            </TouchableOpacity>

                            <View style={styles.taskContent}>
                                <View style={styles.taskTitleRow}>
                                    <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                                    <View style={[styles.priorityBadge, { backgroundColor: priorityColor.bg }]}>
                                        <Text style={[styles.priorityText, { color: priorityColor.text }]}>
                                            {task.priority}
                                        </Text>
                                    </View>
                                </View>
                                {task.due_date && (
                                    <View style={styles.dueDateRow}>
                                        {isOverdue && <AlertCircle size={12} color={colors.red[600]} />}
                                        <Text style={[
                                            styles.dueDate,
                                            isOverdue ? styles.dueDateOverdue : isDueToday ? styles.dueDateToday : undefined,
                                        ]}>
                                            {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : `Due ${format(dueDate!, 'MMM d')}`}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })}

                {hasMore && user && (
                    <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => router.push(`/staff/${user.id}`)}
                    >
                        <Text style={styles.moreButtonText}>+{tasks.length - 5} more tasks</Text>
                        <ChevronRight size={16} color={theme.light.primary} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.slate[900],
    },
    badge: {
        backgroundColor: colors.brand[100],
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.brand[700],
    },
    viewAll: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.light.primary,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.slate[200],
        overflow: 'hidden',
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.slate[100],
    },
    lastItem: {
        borderBottomWidth: 0,
    },
    taskItemOverdue: {
        backgroundColor: colors.red[50],
    },
    statusButton: {
        padding: 2,
    },
    taskContent: {
        flex: 1,
        minWidth: 0,
    },
    taskTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.slate[900],
        flex: 1,
    },
    priorityBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: '600',
    },
    dueDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    dueDate: {
        fontSize: 12,
        color: colors.slate[500],
    },
    dueDateOverdue: {
        color: colors.red[600],
        fontWeight: '500',
    },
    dueDateToday: {
        color: colors.amber[600],
    },
    moreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 4,
        borderTopWidth: 1,
        borderTopColor: colors.slate[100],
    },
    moreButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.light.primary,
    },
});
