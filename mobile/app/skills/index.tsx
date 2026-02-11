import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Target, ChevronDown, Check } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

// Types
interface SkillEvent {
  id: string;
  label: string;
  fullName: string;
}

interface HubEventSkill {
  id: string;
  hub_id: string;
  level: string;
  event: string;
  skill_name: string;
  skill_order: number;
}

interface GymnastSkill {
  id: string;
  gymnast_profile_id: string;
  hub_event_skill_id: string;
  status: SkillStatus;
  achieved_date: string | null;
}

interface Gymnast {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  gender: 'Male' | 'Female' | null;
}

type SkillStatus = 'none' | 'learning' | 'achieved' | 'mastered' | 'injured';

// Status configuration
const SKILL_STATUS_CONFIG: Record<SkillStatus, { label: string; icon: string; bgColor: string; textColor: string }> = {
  none: { label: 'Not Started', icon: '', bgColor: colors.slate[100], textColor: colors.slate[400] },
  learning: { label: 'Learning', icon: '◐', bgColor: colors.amber[100], textColor: colors.amber[700] },
  achieved: { label: 'Achieved', icon: '✓', bgColor: colors.emerald[100], textColor: colors.emerald[700] },
  mastered: { label: 'Mastered', icon: '★', bgColor: colors.yellow[100], textColor: colors.yellow[700] },
  injured: { label: 'Injured', icon: '⚠', bgColor: colors.red[100], textColor: colors.red[700] },
};

const STATUS_CYCLE: SkillStatus[] = ['none', 'learning', 'achieved', 'mastered', 'injured'];

// Default events (used when hub has no custom events)
const DEFAULT_WAG_SKILL_EVENTS: SkillEvent[] = [
  { id: 'vault', label: 'VT', fullName: 'Vault' },
  { id: 'bars', label: 'UB', fullName: 'Uneven Bars' },
  { id: 'beam', label: 'BB', fullName: 'Balance Beam' },
  { id: 'floor', label: 'FX', fullName: 'Floor Exercise' },
];

const DEFAULT_MAG_SKILL_EVENTS: SkillEvent[] = [
  { id: 'floor', label: 'FX', fullName: 'Floor Exercise' },
  { id: 'pommel', label: 'PH', fullName: 'Pommel Horse' },
  { id: 'rings', label: 'SR', fullName: 'Still Rings' },
  { id: 'vault', label: 'VT', fullName: 'Vault' },
  { id: 'pbars', label: 'PB', fullName: 'Parallel Bars' },
  { id: 'highbar', label: 'HB', fullName: 'High Bar' },
];

export default function SkillsScreen() {
  const { currentHub, linkedGymnasts } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const isParent = useHubStore((state) => state.isParent);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [gymnasts, setGymnasts] = useState<Gymnast[]>([]);
  const [skills, setSkills] = useState<HubEventSkill[]>([]);
  const [gymnastSkills, setGymnastSkills] = useState<GymnastSkill[]>([]);

  const levels = currentHub?.settings?.levels || [];

  // Determine gender based on first gymnast or default to Female
  const activeGender = useMemo(() => {
    if (gymnasts.length > 0) {
      return gymnasts[0].gender || 'Female';
    }
    return 'Female';
  }, [gymnasts]);

  // Get events from hub settings or use defaults
  const getEventsForGender = (gender: 'Female' | 'Male'): SkillEvent[] => {
    const customEvents = currentHub?.settings?.skillEvents?.[gender];
    if (customEvents && customEvents.length > 0) {
      return customEvents;
    }
    return gender === 'Female' ? DEFAULT_WAG_SKILL_EVENTS : DEFAULT_MAG_SKILL_EVENTS;
  };

  const events = getEventsForGender(activeGender);

  // Set default selections
  useEffect(() => {
    if (levels.length > 0 && !selectedLevel) {
      // For parents, use their linked gymnast's level
      if (isParent() && linkedGymnasts.length > 0 && linkedGymnasts[0].level) {
        setSelectedLevel(linkedGymnasts[0].level);
      } else {
        setSelectedLevel(levels[0]);
      }
    }
  }, [levels, selectedLevel, isParent, linkedGymnasts]);

  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      setSelectedEvent(events[0].id);
    }
  }, [events, selectedEvent]);

  // Fetch gymnasts when level changes
  useEffect(() => {
    if (currentHub && selectedLevel) {
      fetchGymnasts();
    }
  }, [currentHub?.id, selectedLevel]);

  // Fetch skills when level or event changes
  useEffect(() => {
    if (currentHub && selectedLevel && selectedEvent) {
      fetchSkills();
    }
  }, [currentHub?.id, selectedLevel, selectedEvent]);

  // Fetch gymnast skills when skills or gymnasts change
  useEffect(() => {
    if (gymnasts.length > 0 && skills.length > 0) {
      fetchGymnastSkills();
    }
  }, [gymnasts, skills]);

  const fetchGymnasts = async () => {
    if (!currentHub || !selectedLevel) return;

    let query = supabase
      .from('gymnast_profiles')
      .select('id, first_name, last_name, level, gender')
      .eq('hub_id', currentHub.id)
      .eq('level', selectedLevel);

    // Parents only see linked gymnasts
    if (isParent() && linkedGymnasts.length > 0) {
      const linkedIds = linkedGymnasts.map((g) => g.id);
      query = query.in('id', linkedIds);
    }

    const { data, error } = await query.order('last_name', { ascending: true });

    if (error) {
      console.error('Error fetching gymnasts:', error);
      setGymnasts([]);
    } else {
      setGymnasts(data || []);
    }
  };

  const fetchSkills = async () => {
    if (!currentHub || !selectedLevel || !selectedEvent) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('hub_event_skills')
      .select('*')
      .eq('hub_id', currentHub.id)
      .eq('level', selectedLevel)
      .eq('event', selectedEvent)
      .order('skill_order', { ascending: true });

    if (error) {
      console.error('Error fetching skills:', error);
      setSkills([]);
    } else {
      setSkills(data || []);
    }
    setLoading(false);
  };

  const fetchGymnastSkills = async () => {
    if (gymnasts.length === 0 || skills.length === 0) return;

    const gymnastIds = gymnasts.map((g) => g.id);
    const skillIds = skills.map((s) => s.id);

    const { data, error } = await supabase
      .from('gymnast_skills')
      .select('*')
      .in('gymnast_profile_id', gymnastIds)
      .in('hub_event_skill_id', skillIds);

    if (error) {
      console.error('Error fetching gymnast skills:', error);
      setGymnastSkills([]);
    } else {
      setGymnastSkills(data || []);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchGymnasts(), fetchSkills()]);
    setRefreshing(false);
  };

  const getSkillStatus = (gymnastId: string, skillId: string): SkillStatus => {
    const record = gymnastSkills.find(
      (gs) => gs.gymnast_profile_id === gymnastId && gs.hub_event_skill_id === skillId
    );
    return (record?.status as SkillStatus) || 'none';
  };

  const handleSkillTap = async (gymnastId: string, skillId: string) => {
    if (!isStaff()) return;

    const currentStatus = getSkillStatus(gymnastId, skillId);
    const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];

    // Optimistic update
    const existingRecord = gymnastSkills.find(
      (gs) => gs.gymnast_profile_id === gymnastId && gs.hub_event_skill_id === skillId
    );

    if (existingRecord) {
      setGymnastSkills((prev) =>
        prev.map((gs) =>
          gs.id === existingRecord.id
            ? { ...gs, status: nextStatus, achieved_date: nextStatus !== 'none' ? new Date().toISOString() : null }
            : gs
        )
      );
    } else {
      // Add new record optimistically
      const tempRecord: GymnastSkill = {
        id: `temp-${Date.now()}`,
        gymnast_profile_id: gymnastId,
        hub_event_skill_id: skillId,
        status: nextStatus,
        achieved_date: nextStatus !== 'none' ? new Date().toISOString() : null,
      };
      setGymnastSkills((prev) => [...prev, tempRecord]);
    }

    // Save to database
    try {
      const { error } = await supabase.from('gymnast_skills').upsert(
        {
          gymnast_profile_id: gymnastId,
          hub_event_skill_id: skillId,
          status: nextStatus,
          achieved_date: nextStatus !== 'none' ? new Date().toISOString() : null,
        },
        {
          onConflict: 'gymnast_profile_id,hub_event_skill_id',
        }
      );

      if (error) {
        console.error('Error updating skill:', error);
        Alert.alert('Error', 'Failed to update skill status');
        // Revert on error
        fetchGymnastSkills();
      }
    } catch (err) {
      console.error('Error:', err);
      fetchGymnastSkills();
    }
  };

  const selectedEventName = events.find((e) => e.id === selectedEvent)?.fullName || selectedEvent;

  if (!currentHub) {
    return (
      <View style={styles.emptyContainer}>
        <Target size={48} color={colors.slate[300]} />
        <Text style={styles.emptyTitle}>No hub selected</Text>
        <Text style={styles.emptyText}>Select a hub to view skills</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters Row */}
      <View style={styles.filtersContainer}>
        {/* Level Dropdown */}
        <View style={styles.dropdownWrapper}>
          <Text style={styles.dropdownLabel}>Level</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowLevelDropdown(true)}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>
              {selectedLevel || 'Select level'}
            </Text>
            <ChevronDown size={18} color={colors.slate[500]} />
          </TouchableOpacity>
        </View>

        {/* Event Dropdown */}
        <View style={styles.dropdownWrapper}>
          <Text style={styles.dropdownLabel}>Event</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowEventDropdown(true)}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>
              {selectedEventName || 'Select event'}
            </Text>
            <ChevronDown size={18} color={colors.slate[500]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Level Picker Modal */}
      <Modal
        visible={showLevelDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLevelDropdown(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowLevelDropdown(false)}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Level</Text>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {levels.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.pickerItem, selectedLevel === level && styles.pickerItemSelected]}
                  onPress={() => {
                    setSelectedLevel(level);
                    setShowLevelDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedLevel === level && styles.pickerItemTextSelected,
                    ]}
                  >
                    {level}
                  </Text>
                  {selectedLevel === level && <Check size={16} color={theme.light.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Event Picker Modal */}
      <Modal
        visible={showEventDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEventDropdown(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setShowEventDropdown(false)}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Event</Text>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.pickerItem, selectedEvent === event.id && styles.pickerItemSelected]}
                  onPress={() => {
                    setSelectedEvent(event.id);
                    setShowEventDropdown(false);
                  }}
                >
                  <View style={styles.eventItemContent}>
                    <View style={styles.eventBadge}>
                      <Text style={styles.eventBadgeText}>{event.label}</Text>
                    </View>
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedEvent === event.id && styles.pickerItemTextSelected,
                      ]}
                    >
                      {event.fullName}
                    </Text>
                  </View>
                  {selectedEvent === event.id && <Check size={16} color={theme.light.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.light.primary} />
        </View>
      ) : !selectedLevel || !selectedEvent ? (
        <View style={styles.emptyContainer}>
          <Target size={48} color={colors.slate[300]} />
          <Text style={styles.emptyTitle}>Select filters</Text>
          <Text style={styles.emptyText}>Choose a level and event to view skills</Text>
        </View>
      ) : gymnasts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Target size={48} color={colors.slate[300]} />
          <Text style={styles.emptyTitle}>No gymnasts</Text>
          <Text style={styles.emptyText}>No gymnasts found at {selectedLevel} level</Text>
        </View>
      ) : skills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Target size={48} color={colors.slate[300]} />
          <Text style={styles.emptyTitle}>No skills defined</Text>
          <Text style={styles.emptyText}>
            No skills have been added for {selectedEventName} at {selectedLevel} yet
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* Gymnast Cards */}
          {gymnasts.map((gymnast) => (
            <View key={gymnast.id} style={styles.gymnastCard}>
              {/* Gymnast Header */}
              <View style={styles.gymnastHeader}>
                <View style={styles.gymnastAvatar}>
                  <Text style={styles.gymnastInitials}>
                    {gymnast.first_name[0]}
                    {gymnast.last_name[0]}
                  </Text>
                </View>
                <Text style={styles.gymnastName}>
                  {gymnast.first_name} {gymnast.last_name}
                </Text>
              </View>

              {/* Skills List */}
              <View style={styles.skillsList}>
                {skills.map((skill) => {
                  const status = getSkillStatus(gymnast.id, skill.id);
                  const config = SKILL_STATUS_CONFIG[status];
                  const canEdit = isStaff();

                  return (
                    <TouchableOpacity
                      key={skill.id}
                      style={styles.skillRow}
                      onPress={() => handleSkillTap(gymnast.id, skill.id)}
                      disabled={!canEdit}
                      activeOpacity={canEdit ? 0.7 : 1}
                    >
                      <Text style={styles.skillName} numberOfLines={1}>
                        {skill.skill_name}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
                        {config.icon ? (
                          <Text style={[styles.statusIcon, { color: config.textColor }]}>{config.icon}</Text>
                        ) : null}
                        <Text style={[styles.statusText, { color: config.textColor }]}>{config.label}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Footer Hint */}
          {isStaff() && (
            <Text style={styles.footerHint}>Tap a skill status to cycle through: Not Started → Learning → Achieved → Mastered → Injured</Text>
          )}
        </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },

  // Filters
  filtersContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  dropdownWrapper: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[500],
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
    marginRight: 8,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: colors.white,
    borderRadius: 14,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  pickerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    textAlign: 'center',
  },
  pickerScroll: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  pickerItemSelected: {
    backgroundColor: colors.brand[50],
  },
  pickerItemText: {
    fontSize: 15,
    color: colors.slate[700],
  },
  pickerItemTextSelected: {
    fontWeight: '600',
    color: theme.light.primary,
  },
  eventItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventBadge: {
    backgroundColor: colors.indigo[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.indigo[700],
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },

  // Gymnast Card
  gymnastCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 12,
    overflow: 'hidden',
  },
  gymnastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  gymnastAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymnastInitials: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  gymnastName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },

  // Skills List
  skillsList: {
    paddingVertical: 4,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  skillName: {
    flex: 1,
    fontSize: 14,
    color: colors.slate[700],
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 90,
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Footer
  footerHint: {
    fontSize: 12,
    color: colors.slate[500],
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
