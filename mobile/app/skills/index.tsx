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
import { Target, ChevronDown, Check, List } from 'lucide-react-native';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

// Types
interface SkillEvent {
  id: string;
  label: string;
  fullName: string;
}

interface SkillList {
  id: string;
  hub_id: string;
  name: string;
  is_default: boolean;
}

interface HubEventSkill {
  id: string;
  hub_id: string;
  skill_list_id: string;
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
const getSkillStatusConfig = (isDark: boolean): Record<SkillStatus, { label: string; icon: string; bgColor: string; textColor: string }> => ({
  none: { label: 'Not Started', icon: '', bgColor: isDark ? colors.slate[700] : colors.slate[100], textColor: isDark ? colors.slate[400] : colors.slate[400] },
  learning: { label: 'Learning', icon: '◐', bgColor: isDark ? colors.amber[700] + '30' : colors.amber[100], textColor: isDark ? colors.amber[500] : colors.amber[700] },
  achieved: { label: 'Achieved', icon: '✓', bgColor: isDark ? colors.emerald[700] + '30' : colors.emerald[100], textColor: isDark ? colors.emerald[400] : colors.emerald[700] },
  mastered: { label: 'Mastered', icon: '★', bgColor: isDark ? colors.yellow[700] + '30' : colors.yellow[100], textColor: isDark ? colors.yellow[500] : colors.yellow[700] },
  injured: { label: 'Injured', icon: '⚠', bgColor: isDark ? colors.red[700] + '30' : colors.red[100], textColor: isDark ? colors.red[400] : colors.red[700] },
});

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
  const { t, isDark } = useTheme();
  const currentHub = useHubStore((state) => state.currentHub);
  const linkedGymnasts = useHubStore((state) => state.linkedGymnasts);
  const isStaff = useHubStore((state) => state.isStaff);
  const canEdit = useHubStore((state) => state.canEdit);
  const isParent = useHubStore((state) => state.isParent);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [skillLists, setSkillLists] = useState<SkillList[]>([]);
  const [selectedSkillListId, setSelectedSkillListId] = useState<string>('');
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

  // Fetch skill lists when hub loads
  useEffect(() => {
    if (currentHub) {
      setSelectedSkillListId('');
      fetchSkillLists();
    }
  }, [currentHub?.id]);

  // Fetch gymnasts, skills, and gymnast_skills together (parallel where possible)
  useEffect(() => {
    if (!currentHub || !selectedLevel || !selectedEvent || !selectedSkillListId) return;

    let cancelled = false;
    const loadAll = async () => {
      setLoading(true);
      setError(null);

      // Fetch gymnasts and skills in parallel
      const [gymnastsResult, skillsResult] = await Promise.all([
        fetchGymnasts(),
        fetchSkills(),
      ]);

      if (cancelled) return;

      // Then fetch gymnast_skills (depends on both results)
      if (gymnastsResult && gymnastsResult.length > 0 && skillsResult && skillsResult.length > 0) {
        await fetchGymnastSkills();
      }
      if (!cancelled) setLoading(false);
    };

    loadAll();
    return () => { cancelled = true; };
  }, [currentHub?.id, selectedLevel, selectedEvent, selectedSkillListId]);

  const fetchGymnasts = async (): Promise<Gymnast[]> => {
    if (!currentHub || !selectedLevel) return [];

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
      setError('Failed to load data. Pull to refresh.');
      setGymnasts([]);
      return [];
    } else {
      setGymnasts(data || []);
      return data || [];
    }
  };

  const fetchSkillLists = async () => {
    if (!currentHub) return;

    const { data, error } = await supabase
      .from('skill_lists')
      .select('id, hub_id, name, is_default')
      .eq('hub_id', currentHub.id)
      .order('is_default', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching skill lists:', error);
    } else {
      setSkillLists(data || []);
      if (data && data.length > 0) {
        const defaultList = data.find((l) => l.is_default);
        setSelectedSkillListId(defaultList?.id || data[0].id);
      }
    }
  };

  const fetchSkills = async (): Promise<HubEventSkill[]> => {
    if (!currentHub || !selectedLevel || !selectedEvent || !selectedSkillListId) return [];

    const { data, error } = await supabase
      .from('hub_event_skills')
      .select('id, hub_id, skill_list_id, level, event, skill_name, skill_order')
      .eq('hub_id', currentHub.id)
      .eq('skill_list_id', selectedSkillListId)
      .eq('level', selectedLevel)
      .eq('event', selectedEvent)
      .order('skill_order', { ascending: true });

    if (error) {
      console.error('Error fetching skills:', error);
      setError('Failed to load data. Pull to refresh.');
      setSkills([]);
      return [];
    } else {
      setSkills(data || []);
      return data || [];
    }
  };

  const fetchGymnastSkills = async () => {
    if (gymnasts.length === 0 || skills.length === 0) return;

    const gymnastIds = gymnasts.map((g) => g.id);
    const skillIds = skills.map((s) => s.id);

    const { data, error } = await supabase
      .from('gymnast_skills')
      .select('id, gymnast_profile_id, hub_event_skill_id, status, achieved_date')
      .in('gymnast_profile_id', gymnastIds)
      .in('hub_event_skill_id', skillIds);

    if (error) {
      console.error('Error fetching gymnast skills:', error);
      setError('Failed to load data. Pull to refresh.');
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
    if (!canEdit()) return;

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
      <View style={[styles.emptyContainer, { backgroundColor: t.background }]}>
        <Target size={48} color={t.textFaint} />
        <Text style={[styles.emptyTitle, { color: t.text }]}>No hub selected</Text>
        <Text style={[styles.emptyText, { color: t.textMuted }]}>Select a hub to view skills</Text>
      </View>
    );
  }

  const selectedListName = skillLists.find((l) => l.id === selectedSkillListId)?.name || 'Default';

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Skill List Picker (only shown when multiple lists exist) */}
      {skillLists.length > 1 && (
        <View style={[styles.listPickerContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
          <List size={16} color={t.textMuted} />
          <Text style={[styles.listPickerLabel, { color: t.textMuted }]}>Skill List</Text>
          <TouchableOpacity
            style={[styles.listPickerButton, { backgroundColor: t.background, borderColor: t.border }]}
            onPress={() => setShowListDropdown(true)}
          >
            <Text style={[styles.listPickerText, { color: t.text }]} numberOfLines={1}>
              {selectedListName}
            </Text>
            <ChevronDown size={16} color={t.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filters Row */}
      <View style={[styles.filtersContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        {/* Level Dropdown */}
        <View style={styles.dropdownWrapper}>
          <Text style={[styles.dropdownLabel, { color: t.textMuted }]}>Level</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: t.background, borderColor: t.border }]}
            onPress={() => setShowLevelDropdown(true)}
          >
            <Text style={[styles.dropdownText, { color: t.text }]} numberOfLines={1}>
              {selectedLevel || 'Select level'}
            </Text>
            <ChevronDown size={18} color={t.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Event Dropdown */}
        <View style={styles.dropdownWrapper}>
          <Text style={[styles.dropdownLabel, { color: t.textMuted }]}>Event</Text>
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: t.background, borderColor: t.border }]}
            onPress={() => setShowEventDropdown(true)}
          >
            <Text style={[styles.dropdownText, { color: t.text }]} numberOfLines={1}>
              {selectedEventName || 'Select event'}
            </Text>
            <ChevronDown size={18} color={t.textMuted} />
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
        <Pressable style={[styles.pickerOverlay, { backgroundColor: t.overlay }]} onPress={() => setShowLevelDropdown(false)}>
          <View style={[styles.pickerContainer, { backgroundColor: t.surface }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.pickerTitle, { color: t.text }]}>Select Level</Text>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {levels.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.pickerItem, { borderBottomColor: t.borderSubtle }, selectedLevel === level && { backgroundColor: isDark ? `${t.primary}15` : colors.brand[50] }]}
                  onPress={() => {
                    setSelectedLevel(level);
                    setShowLevelDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: t.textSecondary },
                      selectedLevel === level && { color: t.primary, fontWeight: '600' },
                    ]}
                  >
                    {level}
                  </Text>
                  {selectedLevel === level && <Check size={16} color={t.primary} />}
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
        <Pressable style={[styles.pickerOverlay, { backgroundColor: t.overlay }]} onPress={() => setShowEventDropdown(false)}>
          <View style={[styles.pickerContainer, { backgroundColor: t.surface }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.pickerTitle, { color: t.text }]}>Select Event</Text>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.pickerItem, { borderBottomColor: t.borderSubtle }, selectedEvent === event.id && { backgroundColor: isDark ? `${t.primary}15` : colors.brand[50] }]}
                  onPress={() => {
                    setSelectedEvent(event.id);
                    setShowEventDropdown(false);
                  }}
                >
                  <View style={styles.eventItemContent}>
                    <View style={[styles.eventBadge, { backgroundColor: isDark ? colors.indigo[700] + '30' : colors.indigo[100] }]}>
                      <Text style={[styles.eventBadgeText, { color: isDark ? colors.indigo[500] : colors.indigo[700] }]}>{event.label}</Text>
                    </View>
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: t.textSecondary },
                        selectedEvent === event.id && { color: t.primary, fontWeight: '600' },
                      ]}
                    >
                      {event.fullName}
                    </Text>
                  </View>
                  {selectedEvent === event.id && <Check size={16} color={t.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Skill List Picker Modal */}
      <Modal
        visible={showListDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowListDropdown(false)}
      >
        <Pressable style={[styles.pickerOverlay, { backgroundColor: t.overlay }]} onPress={() => setShowListDropdown(false)}>
          <View style={[styles.pickerContainer, { backgroundColor: t.surface }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.pickerTitle, { color: t.text }]}>Select Skill List</Text>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {skillLists.map((list) => (
                <TouchableOpacity
                  key={list.id}
                  style={[styles.pickerItem, { borderBottomColor: t.borderSubtle }, selectedSkillListId === list.id && { backgroundColor: isDark ? `${t.primary}15` : colors.brand[50] }]}
                  onPress={() => {
                    setSelectedSkillListId(list.id);
                    setShowListDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      { color: t.textSecondary },
                      selectedSkillListId === list.id && { color: t.primary, fontWeight: '600' },
                    ]}
                  >
                    {list.name}
                  </Text>
                  {selectedSkillListId === list.id && <Check size={16} color={t.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Error Banner */}
      {error && (
        <View style={{ marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: isDark ? colors.red[700] + '20' : '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: isDark ? colors.red[700] + '40' : '#FECACA' }}>
          <Text style={{ color: isDark ? colors.red[400] : '#DC2626', fontSize: 14 }}>{error}</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : !selectedLevel || !selectedEvent ? (
        <View style={styles.emptyContainer}>
          <Target size={48} color={t.textFaint} />
          <Text style={[styles.emptyTitle, { color: t.text }]}>Select filters</Text>
          <Text style={[styles.emptyText, { color: t.textMuted }]}>Choose a level and event to view skills</Text>
        </View>
      ) : gymnasts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Target size={48} color={t.textFaint} />
          <Text style={[styles.emptyTitle, { color: t.text }]}>No gymnasts</Text>
          <Text style={[styles.emptyText, { color: t.textMuted }]}>No gymnasts found at {selectedLevel} level</Text>
        </View>
      ) : skills.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Target size={48} color={t.textFaint} />
          <Text style={[styles.emptyTitle, { color: t.text }]}>No skills defined</Text>
          <Text style={[styles.emptyText, { color: t.textMuted }]}>
            No skills have been added for {selectedEventName} at {selectedLevel} yet
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.textMuted} />}
        >
          {/* Gymnast Cards */}
          {gymnasts.map((gymnast) => (
            <View key={gymnast.id} style={[styles.gymnastCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              {/* Gymnast Header */}
              <View style={[styles.gymnastHeader, { backgroundColor: t.background, borderBottomColor: t.border }]}>
                <View style={[styles.gymnastAvatar, { backgroundColor: t.primary }]}>
                  <Text style={styles.gymnastInitials}>
                    {gymnast.first_name[0]}
                    {gymnast.last_name[0]}
                  </Text>
                </View>
                <Text style={[styles.gymnastName, { color: t.text }]}>
                  {gymnast.first_name} {gymnast.last_name}
                </Text>
              </View>

              {/* Skills List */}
              <View style={styles.skillsList}>
                {skills.map((skill) => {
                  const status = getSkillStatus(gymnast.id, skill.id);
                  const config = getSkillStatusConfig(isDark)[status];
                  const canEditSkill = canEdit();

                  return (
                    <TouchableOpacity
                      key={skill.id}
                      style={[styles.skillRow, { borderBottomColor: t.borderSubtle }]}
                      onPress={() => handleSkillTap(gymnast.id, skill.id)}
                      disabled={!canEditSkill}
                      activeOpacity={canEditSkill ? 0.7 : 1}
                    >
                      <Text style={[styles.skillName, { color: t.textSecondary }]} numberOfLines={1}>
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
          {canEdit() && (
            <Text style={[styles.footerHint, { color: t.textMuted }]}>Tap a skill status to cycle through: Not Started → Learning → Achieved → Mastered → Injured</Text>
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

  // Skill List Picker
  listPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  listPickerLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  listPickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  listPickerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
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
    color: colors.brand[600],
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
    backgroundColor: colors.brand[600],
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
