import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { ChevronLeft, ChevronRight, MapPin, Clock, Plus, Filter, CalendarDays } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { EventDetailsModal, CreateEventModal } from '../../src/components/calendar';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { format, parseISO, startOfMonth, endOfMonth, isSameDay, getDay } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  description: string | null;
  rsvp_enabled?: boolean;
}

interface Birthday {
  id: string;
  name: string;
  date: string; // MM-dd format
}

// Holiday type
interface Holiday {
  name: string;
  emoji: string;
  bgColor: string;
  textColor: string;
}

// Event filter type
type EventType = 'all' | 'practice' | 'competition' | 'mentorship' | 'meeting' | 'social' | 'private_lesson' | 'camp' | 'clinic' | 'fundraiser' | 'other';

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'practice', label: 'Practice' },
  { value: 'competition', label: 'Competition' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'social', label: 'Social' },
  { value: 'private_lesson', label: 'Private Lesson' },
  { value: 'camp', label: 'Camp' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'other', label: 'Other' },
];

// Get nth weekday of month (e.g., 4th Thursday)
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = getDay(firstOfMonth);
  let dayOffset = weekday - firstWeekday;
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month, 1 + dayOffset + (n - 1) * 7);
}

// Get last weekday of month (e.g., last Monday)
function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastOfMonth = new Date(year, month + 1, 0);
  const lastDay = lastOfMonth.getDate();
  const lastWeekday = getDay(lastOfMonth);
  let dayOffset = lastWeekday - weekday;
  if (dayOffset < 0) dayOffset += 7;
  return new Date(year, month, lastDay - dayOffset);
}

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// Get all US holidays for a given year
function getUSHolidays(year: number): Map<string, Holiday> {
  const holidays = new Map<string, Holiday>();

  const addHoliday = (date: Date, name: string, emoji: string, bgColor: string, textColor: string) => {
    const key = format(date, 'yyyy-MM-dd');
    holidays.set(key, { name, emoji, bgColor, textColor });
  };

  // Fixed date holidays (using colors available in mobile palette)
  addHoliday(new Date(year, 0, 1), "New Year's Day", '🎉', colors.amber[50], colors.amber[700]);
  addHoliday(new Date(year, 1, 14), "Valentine's Day", '💕', colors.pink[50], colors.pink[700]);
  addHoliday(new Date(year, 2, 17), "St. Patrick's Day", '☘️', colors.emerald[50], colors.emerald[700]);
  addHoliday(new Date(year, 6, 4), "Independence Day", '🇺🇸', colors.blue[50], colors.blue[700]);
  addHoliday(new Date(year, 9, 31), "Halloween", '🎃', colors.orange[50], colors.orange[700]);
  addHoliday(new Date(year, 10, 11), "Veterans Day", '🎖️', colors.error[50], colors.error[700]);
  addHoliday(new Date(year, 11, 24), "Christmas Eve", '🎅', colors.error[50], colors.error[700]);
  addHoliday(new Date(year, 11, 25), "Christmas Day", '🎄', colors.error[50], colors.error[700]);
  addHoliday(new Date(year, 11, 31), "New Year's Eve", '🥳', colors.violet[50], colors.violet[700]);

  // Floating holidays
  addHoliday(getNthWeekdayOfMonth(year, 0, 1, 3), "MLK Jr. Day", '✊🏿', colors.slate[100], colors.slate[700]);
  addHoliday(getNthWeekdayOfMonth(year, 1, 1, 3), "Presidents' Day", '🏛️', colors.blue[50], colors.blue[700]);
  addHoliday(getNthWeekdayOfMonth(year, 4, 0, 2), "Mother's Day", '💐', colors.pink[50], colors.pink[700]);
  addHoliday(getLastWeekdayOfMonth(year, 4, 1), "Memorial Day", '🇺🇸', colors.error[50], colors.error[700]);
  addHoliday(getNthWeekdayOfMonth(year, 5, 0, 3), "Father's Day", '👔', colors.blue[50], colors.blue[700]);
  addHoliday(new Date(year, 5, 19), "Juneteenth", '✊🏿', colors.error[50], colors.error[700]);
  addHoliday(getNthWeekdayOfMonth(year, 8, 1, 1), "Labor Day", '⚒️', colors.amber[50], colors.amber[700]);
  addHoliday(getNthWeekdayOfMonth(year, 9, 1, 2), "Columbus Day", '🧭', colors.indigo[50], colors.indigo[700]);
  addHoliday(getNthWeekdayOfMonth(year, 10, 4, 4), "Thanksgiving", '🦃', colors.orange[50], colors.orange[700]);

  // Easter
  addHoliday(getEasterSunday(year), "Easter Sunday", '🐰', colors.pink[50], colors.pink[700]);

  return holidays;
}

// Pre-compute holidays for a range of years
const ALL_HOLIDAYS_MAP = new Map<string, Holiday>();
for (let year = 2020; year <= 2035; year++) {
  const yearHolidays = getUSHolidays(year);
  yearHolidays.forEach((holiday, key) => ALL_HOLIDAYS_MAP.set(key, holiday));
}

// Event type colors - matching web app
const EVENT_COLORS: Record<string, string> = {
  practice: colors.blue[500],
  competition: colors.purple[500],
  mentorship: colors.pink[500],
  meeting: colors.amber[500],
  social: colors.emerald[500],
  private_lesson: colors.violet[500],
  camp: colors.emerald[600],
  clinic: colors.indigo[500],
  fundraiser: colors.orange[500],
  other: colors.slate[500],
};

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<EventType>('all');
  const [showFilter, setShowFilter] = useState(false);

  const { currentHub, isStaff } = useHubStore();
  const canAddEvents = isStaff();
  const showBirthdays = currentHub?.settings?.showBirthdays === true;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch events for the current month
  const fetchEvents = async () => {
    if (!currentHub) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data, error } = await supabase
        .from('events')
        .select('id, title, type, start_time, end_time, location, description, rsvp_enabled')
        .eq('hub_id', currentHub.id)
        .gte('start_time', monthStart.toISOString())
        .lte('start_time', monthEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch birthdays from gymnast profiles
  const fetchBirthdays = async () => {
    if (!currentHub || !showBirthdays) {
      setBirthdays([]);
      return;
    }

    try {
      const [gymnastResult, membersResult, privacyResult] = await Promise.all([
        supabase
          .from('gymnast_profiles')
          .select('id, first_name, last_name, date_of_birth, guardian_1')
          .eq('hub_id', currentHub.id)
          .not('date_of_birth', 'is', null),
        supabase
          .from('hub_members')
          .select('user_id, profile:profiles(email)')
          .eq('hub_id', currentHub.id)
          .eq('role', 'parent'),
        supabase
          .from('parent_privacy_settings')
          .select('user_id, show_gymnast_birthday')
          .eq('hub_id', currentHub.id)
      ]);

      if (gymnastResult.error) throw gymnastResult.error;

      const gymnasts = gymnastResult.data || [];
      const parentMembers = membersResult.data || [];
      const privacySettings = privacyResult.data || [];

      // Build email -> user_id map for parents
      const emailToUserId = new Map<string, string>();
      parentMembers.forEach((m: any) => {
        if (m.profile?.email) {
          emailToUserId.set(m.profile.email.toLowerCase(), m.user_id);
        }
      });

      // Build user_id -> privacy settings map
      const userPrivacyMap = new Map<string, boolean>();
      privacySettings.forEach((p: any) => {
        userPrivacyMap.set(p.user_id, p.show_gymnast_birthday ?? true);
      });

      // Filter gymnasts based on parent privacy settings (default: show)
      const birthdayData: Birthday[] = gymnasts
        .filter((g: any) => {
          const guardianEmail = g.guardian_1?.email?.toLowerCase();
          if (!guardianEmail) return true;
          const parentUserId = emailToUserId.get(guardianEmail);
          if (!parentUserId) return true;
          const showBirthday = userPrivacyMap.get(parentUserId) ?? true;
          return showBirthday;
        })
        .map((g: any) => ({
          id: g.id,
          name: `${g.first_name} ${g.last_name}`.trim(),
          date: format(parseISO(g.date_of_birth), 'MM-dd'),
        }));

      setBirthdays(birthdayData);
    } catch (err) {
      console.error('Error fetching birthdays:', err);
      setBirthdays([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEvents();
    fetchBirthdays();
  }, [currentHub?.id, currentDate.getMonth(), currentDate.getFullYear(), showBirthdays]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
    fetchBirthdays();
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);

  // Pre-compute event dates map for O(1) lookup - memoized to avoid recomputing on every render
  const eventDatesSet = useMemo(() => {
    const dateSet = new Set<string>();
    events.forEach(e => {
      const dateStr = format(parseISO(e.start_time), 'yyyy-MM-dd');
      dateSet.add(dateStr);
    });
    return dateSet;
  }, [events]);

  // Pre-compute birthday dates map for O(1) lookup
  const birthdayDatesSet = useMemo(() => {
    const dateSet = new Set<string>();
    if (showBirthdays) {
      birthdays.forEach(b => dateSet.add(b.date)); // MM-dd format
    }
    return dateSet;
  }, [birthdays, showBirthdays]);

  // Pre-compute events by date for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(e => {
      const dateStr = format(parseISO(e.start_time), 'yyyy-MM-dd');
      const existing = map.get(dateStr) || [];
      existing.push(e);
      map.set(dateStr, existing);
    });
    return map;
  }, [events]);

  // Pre-compute birthdays by MM-dd for quick lookup
  const birthdaysByMonthDay = useMemo(() => {
    const map = new Map<string, Birthday[]>();
    if (showBirthdays) {
      birthdays.forEach(b => {
        const existing = map.get(b.date) || [];
        existing.push(b);
        map.set(b.date, existing);
      });
    }
    return map;
  }, [birthdays, showBirthdays]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(format(today, 'yyyy-MM-dd'));
  };

  const formatDateString = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-${String(day).padStart(2, '0')}`;
  };

  // O(1) lookup using pre-computed set
  const hasEvents = (dateStr: string) => eventDatesSet.has(dateStr);

  // O(1) lookup using pre-computed map
  const getEventsForDate = (dateStr: string) => eventsByDate.get(dateStr) || [];

  // Get holiday for a specific date
  const getHolidayForDate = (dateStr: string): Holiday | undefined => {
    return ALL_HOLIDAYS_MAP.get(dateStr);
  };

  // O(1) lookup using pre-computed map
  const getBirthdaysForDate = (dateStr: string): Birthday[] => {
    if (!showBirthdays) return [];
    const monthDay = dateStr.slice(5); // Extract MM-dd from yyyy-MM-dd
    return birthdaysByMonthDay.get(monthDay) || [];
  };

  // O(1) lookup using pre-computed set
  const hasBirthday = (monthDay: string) => {
    if (!showBirthdays) return false;
    return birthdayDatesSet.has(monthDay);
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const formatEventTime = (event: CalendarEvent) => {
    try {
      const start = format(parseISO(event.start_time), 'h:mm a');
      const end = format(parseISO(event.end_time), 'h:mm a');
      return `${start} - ${end}`;
    } catch {
      return '';
    }
  };

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDateString(day);
      const monthDay = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const dayHasEvents = hasEvents(dateStr);
      const dayHasBirthday = hasBirthday(monthDay);
      const holiday = getHolidayForDate(dateStr);

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            holiday && !isSelected && { backgroundColor: holiday.bgColor },
          ]}
          onPress={() => setSelectedDate(dateStr)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.dayCircle,
              isToday(day) && styles.todayCircle,
              isSelected && styles.selectedCircle,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                isToday(day) && !isSelected && styles.todayText,
                isSelected && styles.selectedText,
                holiday && !isSelected && !isToday(day) && { color: holiday.textColor },
              ]}
            >
              {day}
            </Text>
          </View>
          <View style={styles.dayIndicators}>
            {holiday && <Text style={styles.holidayEmoji}>{holiday.emoji}</Text>}
            {dayHasBirthday && <Text style={styles.birthdayEmoji}>🎂</Text>}
            {dayHasEvents && <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />}
          </View>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedBirthdays = selectedDate ? getBirthdaysForDate(selectedDate) : [];

  // Filter events based on selected filter type
  const filteredEvents = filterType === 'all'
    ? events
    : events.filter(e => e.type === filterType);

  // Get events for selected date (filtered)
  const filteredSelectedEvents = selectedDate
    ? filteredEvents.filter(e => isSameDay(parseISO(e.start_time), parseISO(selectedDate)))
    : [];

  // Get upcoming events (no limit) - filtered
  const upcomingEvents = filteredEvents
    .filter(e => parseISO(e.start_time) >= new Date());

  const displayEvents = selectedDate ? filteredSelectedEvents : upcomingEvents;

  return (
    <View style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
            <ChevronLeft size={24} color={colors.slate[700]} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <ChevronRight size={24} color={colors.slate[700]} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerBottomRow}>
          <TouchableOpacity
            onPress={goToToday}
            style={styles.todayButton}
            activeOpacity={0.7}
          >
            <CalendarDays size={16} color={theme.light.primary} />
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowFilter(true)}
            style={[
              styles.filterButton,
              filterType !== 'all' && styles.filterButtonActive,
            ]}
            activeOpacity={0.7}
          >
            <Filter size={16} color={filterType !== 'all' ? colors.white : colors.slate[600]} />
            <Text style={[
              styles.filterButtonText,
              filterType !== 'all' && styles.filterButtonTextActive,
            ]}>
              {filterType === 'all' ? 'Filter' : EVENT_TYPE_OPTIONS.find(o => o.value === filterType)?.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilter(false)}
      >
        <Pressable style={styles.filterModalOverlay} onPress={() => setShowFilter(false)}>
          <View style={styles.filterModalContent}>
            <Text style={styles.filterModalTitle}>Filter by Type</Text>
            <ScrollView style={styles.filterOptionsList}>
              {EVENT_TYPE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    filterType === option.value && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setFilterType(option.value);
                    setShowFilter(false);
                  }}
                  activeOpacity={0.7}
                >
                  {option.value !== 'all' && (
                    <View
                      style={[
                        styles.filterOptionDot,
                        { backgroundColor: EVENT_COLORS[option.value] || colors.slate[400] },
                      ]}
                    />
                  )}
                  <Text style={[
                    styles.filterOptionText,
                    filterType === option.value && styles.filterOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Day Names */}
      <View style={styles.dayNamesRow}>
        {dayNames.map(name => (
          <View key={name} style={styles.dayNameCell}>
            <Text style={styles.dayName}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.light.primary} />
          </View>
        ) : (
          renderCalendarDays()
        )}
      </View>

      {/* Events List */}
      <View style={styles.eventsSection}>
        {selectedDate && getHolidayForDate(selectedDate) && (
          <View style={[styles.holidayBanner, { backgroundColor: getHolidayForDate(selectedDate)?.bgColor }]}>
            <Text style={styles.holidayBannerEmoji}>{getHolidayForDate(selectedDate)?.emoji}</Text>
            <Text style={[styles.holidayBannerText, { color: getHolidayForDate(selectedDate)?.textColor }]}>
              {getHolidayForDate(selectedDate)?.name}
            </Text>
          </View>
        )}
        {selectedBirthdays.length > 0 && (
          <View style={styles.birthdayBannerContainer}>
            {selectedBirthdays.map(birthday => (
              <View key={birthday.id} style={styles.birthdayBanner}>
                <Text style={styles.birthdayBannerEmoji}>🎂</Text>
                <Text style={styles.birthdayBannerText}>{birthday.name}'s Birthday</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.eventsSectionTitle}>
          {selectedDate
            ? `Events on ${format(parseISO(selectedDate), 'MMM d, yyyy')}`
            : 'Upcoming Events'}
        </Text>
        <ScrollView
          style={styles.eventsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {displayEvents.map(event => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => {
                setSelectedEvent(event);
                setShowEventModal(true);
              }}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.eventColorBar,
                  { backgroundColor: EVENT_COLORS[event.type] || colors.slate[400] },
                ]}
              />
              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <Badge
                    label={event.type.replace('_', ' ')}
                    variant={event.type === 'competition' ? 'warning' : 'neutral'}
                    size="sm"
                  />
                </View>
                {!selectedDate && (
                  <Text style={styles.eventDate}>
                    {format(parseISO(event.start_time), 'EEE, MMM d')}
                  </Text>
                )}
                <View style={styles.eventMeta}>
                  <View style={styles.eventMetaItem}>
                    <Clock size={14} color={colors.slate[400]} />
                    <Text style={styles.eventMetaText}>
                      {formatEventTime(event)}
                    </Text>
                  </View>
                  {event.location && (
                    <View style={styles.eventMetaItem}>
                      <MapPin size={14} color={colors.slate[400]} />
                      <Text style={styles.eventMetaText}>{event.location}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {displayEvents.length === 0 && !loading && (
            <Text style={styles.noEventsText}>
              {filterType !== 'all'
                ? `No ${filterType.replace('_', ' ')} events${selectedDate ? ' on this day' : ''}`
                : selectedDate ? 'No events on this day' : 'No upcoming events'}
            </Text>
          )}
        </ScrollView>
      </View>

      {/* FAB for adding events - only show for staff */}
      {canAddEvents && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Event Details Modal */}
      <EventDetailsModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onEventUpdated={fetchEvents}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={() => {
          setShowCreateModal(false);
          fetchEvents();
        }}
        initialDate={selectedDate ? parseISO(selectedDate) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  calendarHeader: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  navButton: {
    padding: 8,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.light.primary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  filterButtonActive: {
    backgroundColor: theme.light.primary,
    borderColor: theme.light.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  filterModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 300,
    maxHeight: 400,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  filterOptionsList: {
    maxHeight: 320,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterOptionActive: {
    backgroundColor: colors.brand[50],
  },
  filterOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterOptionText: {
    fontSize: 15,
    color: colors.slate[700],
  },
  filterOptionTextActive: {
    color: theme.light.primary,
    fontWeight: '600',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  dayNamesRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[500],
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    paddingBottom: 8,
    minHeight: 240,
  },
  loadingContainer: {
    width: '100%',
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: colors.brand[50],
  },
  selectedCircle: {
    backgroundColor: theme.light.primary,
  },
  dayText: {
    fontSize: 16,
    color: colors.slate[900],
  },
  todayText: {
    fontWeight: '600',
    color: theme.light.primary,
  },
  selectedText: {
    fontWeight: '600',
    color: colors.white,
  },
  dayIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 16,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.light.primary,
  },
  eventDotSelected: {
    backgroundColor: colors.white,
  },
  holidayEmoji: {
    fontSize: 10,
  },
  birthdayEmoji: {
    fontSize: 10,
  },
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  holidayBannerEmoji: {
    fontSize: 18,
  },
  holidayBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  birthdayBannerContainer: {
    marginBottom: 12,
    gap: 6,
  },
  birthdayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.pink[50],
  },
  birthdayBannerEmoji: {
    fontSize: 18,
  },
  birthdayBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.pink[700],
  },
  eventsSection: {
    flex: 1,
    padding: 16,
  },
  eventsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 12,
  },
  eventsList: {
    flex: 1,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  eventColorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    flex: 1,
    marginRight: 8,
  },
  eventDate: {
    fontSize: 13,
    color: colors.slate[600],
    marginBottom: 4,
  },
  eventMeta: {
    gap: 4,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMetaText: {
    fontSize: 13,
    color: colors.slate[500],
  },
  noEventsText: {
    textAlign: 'center',
    color: colors.slate[400],
    marginTop: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
