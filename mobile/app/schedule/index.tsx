import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Clock, Grid3X3, Calendar, Users } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

// Days of week
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ScheduleTab = 'hours' | 'rotations';

interface PracticeSchedule {
  id: string;
  hub_id: string;
  level: string;
  schedule_group: string;
  group_label: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_external_group: boolean;
}

interface RotationBlock {
  id: string;
  hub_id: string;
  day_of_week: number;
  level: string;
  schedule_group: string;
  rotation_event_id: string;
  event_name: string;
  start_time: string;
  end_time: string;
  color: string;
  coach_id: string | null;
  coach?: { full_name: string } | null;
}

interface LevelGroup {
  level: string;
  schedule_group: string;
  group_label: string | null;
  is_external_group: boolean;
  schedules: PracticeSchedule[];
}

interface RotationGridSettings {
  id: string;
  hub_id: string;
  day_of_week: number;
  column_order: number[];
  combined_indices: number[][];
  column_names: Record<string, string>;
  hidden_columns: string[];
}

interface CombinedLevel {
  key: string;
  displayName: string;
  levels: { level: string; schedule_group: string; start_time: string; end_time: string }[];
  blocks: RotationBlock[];
}

// Format time from "HH:MM:SS" to "H:MM AM/PM"
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Hours Tab Component
function HoursTab({
  levelGroups,
  loading,
  refreshing,
  onRefresh,
}: {
  levelGroups: LevelGroup[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {levelGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Clock size={48} color={colors.slate[300]} />
          <Text style={styles.emptyTitle}>No schedules yet</Text>
          <Text style={styles.emptyText}>Practice schedules will appear here once they're set up.</Text>
        </View>
      ) : (
        levelGroups.map((group) => (
          <View key={`${group.level}-${group.schedule_group}`} style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View style={styles.levelTitleRow}>
                <Text style={styles.levelName}>{group.level}</Text>
                {group.is_external_group && (
                  <Badge label="External" variant="neutral" size="sm" />
                )}
                {group.schedule_group !== 'A' && (
                  <Badge label={`Group ${group.schedule_group}`} variant="primary" size="sm" />
                )}
              </View>
              {group.group_label && (
                <Text style={styles.groupLabel}>{group.group_label}</Text>
              )}
            </View>

            <View style={styles.daysGrid}>
              {DAYS_SHORT.map((day, dayIndex) => {
                const schedule = group.schedules.find((s) => s.day_of_week === dayIndex);
                return (
                  <View key={day} style={styles.dayColumn}>
                    <Text style={styles.dayLabel}>{day}</Text>
                    {schedule ? (
                      <View style={styles.timeSlot}>
                        <Text style={styles.startTime}>{formatTime(schedule.start_time)}</Text>
                        <Text style={styles.endTime}>{formatTime(schedule.end_time)}</Text>
                      </View>
                    ) : (
                      <Text style={styles.noTime}>—</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// Rotations Tab Component
function RotationsTab({
  selectedDay,
  setSelectedDay,
  combinedLevels,
  loading,
  refreshing,
  onRefresh,
}: {
  selectedDay: number;
  setSelectedDay: (day: number) => void;
  combinedLevels: CombinedLevel[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  // Format time range for combined levels
  const formatTimeRange = (levels: CombinedLevel['levels']) => {
    if (levels.length === 0) return '';
    const earliest = levels.reduce((min, l) => l.start_time < min ? l.start_time : min, levels[0].start_time);
    const latest = levels.reduce((max, l) => l.end_time > max ? l.end_time : max, levels[0].end_time);
    return `${formatTime(earliest)} - ${formatTime(latest)}`;
  };

  return (
    <View style={styles.tabContent}>
      {/* Day Selector */}
      <View style={styles.daySelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelector}>
          {DAYS_OF_WEEK.map((day, index) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayButton, selectedDay === index && styles.dayButtonActive]}
              onPress={() => setSelectedDay(index)}
            >
              <Text style={[styles.dayButtonText, selectedDay === index && styles.dayButtonTextActive]}>
                {day.slice(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Day Title */}
      <View style={styles.dayTitleContainer}>
        <Text style={styles.dayTitle}>{DAYS_OF_WEEK[selectedDay]} Rotations</Text>
      </View>

      {/* Rotations List */}
      <ScrollView
        style={styles.rotationsScroll}
        contentContainerStyle={styles.rotationsContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {combinedLevels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Grid3X3 size={48} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>No practice scheduled</Text>
            <Text style={styles.emptyText}>
              {DAYS_OF_WEEK[selectedDay]} has no practice times set.
            </Text>
          </View>
        ) : (
          combinedLevels.map((combinedLevel) => (
              <View key={combinedLevel.key} style={styles.rotationLevelCard}>
                <View style={styles.rotationLevelHeader}>
                  <Text style={styles.rotationLevelName}>{combinedLevel.displayName}</Text>
                  <Text style={styles.rotationLevelTime}>
                    {formatTimeRange(combinedLevel.levels)}
                  </Text>
                </View>

                {combinedLevel.blocks.length === 0 ? (
                  <View style={styles.noRotationsContainer}>
                    <Text style={styles.noRotationsText}>No rotations set</Text>
                  </View>
                ) : (
                  <View style={styles.blocksContainer}>
                    {combinedLevel.blocks.map((block) => (
                      <View
                        key={block.id}
                        style={[
                          styles.rotationBlock,
                          { backgroundColor: `${block.color}20`, borderLeftColor: block.color },
                        ]}
                      >
                        <View style={styles.blockHeader}>
                          <Text style={[styles.blockEventName, { color: block.color }]}>
                            {block.event_name}
                          </Text>
                          <Text style={styles.blockTime}>
                            {formatTime(block.start_time)} - {formatTime(block.end_time)}
                          </Text>
                        </View>
                        {block.coach && (
                          <View style={styles.blockCoach}>
                            <Users size={14} color={colors.slate[400]} />
                            <Text style={styles.blockCoachName}>{block.coach.full_name}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default function ScheduleScreen() {
  const [activeTab, setActiveTab] = useState<ScheduleTab>('hours');
  const [schedules, setSchedules] = useState<PracticeSchedule[]>([]);
  const [rotationBlocks, setRotationBlocks] = useState<RotationBlock[]>([]);
  const [gridSettings, setGridSettings] = useState<RotationGridSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const { currentHub } = useHubStore();
  const levels = currentHub?.settings?.levels || [];

  useEffect(() => {
    fetchSchedules();
  }, [currentHub?.id]);

  useEffect(() => {
    if (currentHub?.id) {
      fetchRotationsForDay();
    }
  }, [currentHub?.id, selectedDay]);

  const fetchSchedules = async () => {
    if (!currentHub) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('practice_schedules')
        .select('*')
        .eq('hub_id', currentHub.id)
        .order('level')
        .order('schedule_group')
        .order('day_of_week');

      if (error) {
        console.error('Error fetching schedules:', error);
        setSchedules([]);
      } else {
        setSchedules(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setSchedules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRotationsForDay = async () => {
    if (!currentHub) {
      setRotationBlocks([]);
      setGridSettings(null);
      return;
    }

    try {
      // Fetch rotation blocks and grid settings in parallel
      const [blocksResult, settingsResult] = await Promise.all([
        supabase
          .from('rotation_blocks')
          .select('*, coach:profiles!rotation_blocks_coach_id_fkey(full_name)')
          .eq('hub_id', currentHub.id)
          .eq('day_of_week', selectedDay)
          .order('start_time'),
        supabase
          .from('rotation_grid_settings')
          .select('*')
          .eq('hub_id', currentHub.id)
          .eq('day_of_week', selectedDay)
          .maybeSingle(),
      ]);

      if (blocksResult.error) {
        console.error('Error fetching rotation blocks:', blocksResult.error);
        setRotationBlocks([]);
      } else {
        setRotationBlocks(blocksResult.data || []);
      }

      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        console.error('Error fetching grid settings:', settingsResult.error);
      }
      setGridSettings(settingsResult.data || null);
    } catch (err) {
      console.error('Error:', err);
      setRotationBlocks([]);
      setGridSettings(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSchedules();
    await fetchRotationsForDay();
    setRefreshing(false);
  };

  // Group schedules by level and schedule_group
  const levelGroups = useMemo(() => {
    const groups: LevelGroup[] = [];
    const groupMap = new Map<string, LevelGroup>();

    schedules.forEach((schedule) => {
      const key = `${schedule.level}-${schedule.schedule_group}`;
      if (!groupMap.has(key)) {
        const group: LevelGroup = {
          level: schedule.level,
          schedule_group: schedule.schedule_group,
          group_label: schedule.group_label,
          is_external_group: schedule.is_external_group || false,
          schedules: [],
        };
        groupMap.set(key, group);
        groups.push(group);
      }
      groupMap.get(key)!.schedules.push(schedule);
    });

    // Sort: roster levels first (by hub settings order), then external groups
    groups.sort((a, b) => {
      if (a.is_external_group !== b.is_external_group) {
        return a.is_external_group ? 1 : -1;
      }
      if (!a.is_external_group) {
        const aIndex = levels.indexOf(a.level);
        const bIndex = levels.indexOf(b.level);
        const aOrder = aIndex === -1 ? 999 : aIndex;
        const bOrder = bIndex === -1 ? 999 : bIndex;
        if (aOrder !== bOrder) return aOrder - bOrder;
      }
      if (a.level !== b.level) {
        return a.level.localeCompare(b.level);
      }
      return a.schedule_group.localeCompare(b.schedule_group);
    });

    return groups;
  }, [schedules, levels]);

  // Get levels that have practice on the selected day (for rotations)
  // Apply grid settings: column order, hidden columns, custom display names
  const combinedLevelsForDay = useMemo((): CombinedLevel[] => {
    // Get all levels with practice on this day
    const levelsWithPractice = schedules
      .filter((s) => s.day_of_week === selectedDay)
      .map((schedule) => ({
        level: schedule.level,
        schedule_group: schedule.schedule_group,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      }));

    if (levelsWithPractice.length === 0) return [];

    // Apply column_order to match web's left-to-right ordering
    // column_order is an array of indices that reorders the levels
    const columnOrder = gridSettings?.column_order || [];
    let orderedLevels = levelsWithPractice;

    if (columnOrder.length === levelsWithPractice.length) {
      // Validate that all indices are valid
      const validOrder = columnOrder.every(
        (i) => i >= 0 && i < levelsWithPractice.length
      );
      if (validOrder) {
        orderedLevels = columnOrder.map((i) => levelsWithPractice[i]);
      }
    }

    // Group blocks by level - each level only shows its own blocks
    const blocksByLevel: Record<string, RotationBlock[]> = {};
    rotationBlocks.forEach((block) => {
      const key = `${block.level}|${block.schedule_group}`;
      if (!blocksByLevel[key]) blocksByLevel[key] = [];
      blocksByLevel[key].push(block);
    });

    // Sort blocks by start time
    Object.values(blocksByLevel).forEach((blocks) => {
      blocks.sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    // Get hidden columns and custom names from grid settings
    const hiddenColumns = gridSettings?.hidden_columns || [];
    const columnNames = gridSettings?.column_names || {};

    // Filter out hidden columns and apply custom display names
    return orderedLevels
      .filter((levelData) => {
        const key = `${levelData.level}|${levelData.schedule_group}`;
        // Skip levels that are in hidden_columns
        return !hiddenColumns.includes(key);
      })
      .map((levelData) => {
        const key = `${levelData.level}|${levelData.schedule_group}`;
        // Use custom name if available, otherwise use the level name
        const displayName = columnNames[key] || levelData.level;
        const blocks = blocksByLevel[key] || [];

        return {
          key,
          displayName,
          levels: [levelData],
          blocks,
        };
      });
  }, [schedules, selectedDay, rotationBlocks, gridSettings]);

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'hours' && styles.tabButtonActive]}
          onPress={() => setActiveTab('hours')}
        >
          <Calendar size={18} color={activeTab === 'hours' ? theme.light.primary : colors.slate[500]} />
          <Text style={[styles.tabButtonText, activeTab === 'hours' && styles.tabButtonTextActive]}>
            Hours
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'rotations' && styles.tabButtonActive]}
          onPress={() => setActiveTab('rotations')}
        >
          <Grid3X3 size={18} color={activeTab === 'rotations' ? theme.light.primary : colors.slate[500]} />
          <Text style={[styles.tabButtonText, activeTab === 'rotations' && styles.tabButtonTextActive]}>
            Rotations
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'hours' ? (
        <HoursTab
          levelGroups={levelGroups}
          loading={loading}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <RotationsTab
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          combinedLevels={combinedLevelsForDay}
          loading={loading}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: colors.brand[50],
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[600],
  },
  tabButtonTextActive: {
    color: theme.light.primary,
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Hours Tab Styles
  levelCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  levelHeader: {
    marginBottom: 12,
  },
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  levelName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  groupLabel: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[500],
    marginBottom: 6,
  },
  timeSlot: {
    backgroundColor: colors.brand[50],
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  startTime: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand[700],
  },
  endTime: {
    fontSize: 10,
    color: colors.brand[600],
  },
  noTime: {
    fontSize: 14,
    color: colors.slate[300],
    marginTop: 8,
  },
  // Rotations Tab Styles
  daySelectorContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  daySelector: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  dayButtonActive: {
    backgroundColor: theme.light.primary,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[600],
  },
  dayButtonTextActive: {
    color: colors.white,
  },
  dayTitleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
  },
  rotationsScroll: {
    flex: 1,
  },
  rotationsContent: {
    padding: 16,
    flexGrow: 1,
  },
  rotationLevelCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  rotationLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  rotationLevelName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  rotationLevelTime: {
    fontSize: 13,
    color: colors.slate[500],
    marginLeft: 'auto',
  },
  noRotationsContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noRotationsText: {
    fontSize: 14,
    color: colors.slate[400],
  },
  blocksContainer: {
    gap: 8,
  },
  rotationBlock: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockEventName: {
    fontSize: 15,
    fontWeight: '600',
  },
  blockTime: {
    fontSize: 13,
    color: colors.slate[500],
  },
  blockCoach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  blockCoachName: {
    fontSize: 13,
    color: colors.slate[600],
  },
});
