import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { EventDetailsModal } from '../../src/components/calendar';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { format, parseISO, startOfMonth, endOfMonth, isSameDay } from 'date-fns';

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

const EVENT_COLORS: Record<string, string> = {
  practice: colors.brand[600],
  competition: colors.amber[600],
  meeting: colors.blue[600],
  social: colors.violet[600],
  private_lesson: colors.pink[600],
  camp: colors.emerald[600],
  clinic: colors.indigo[600],
  fundraiser: colors.orange[600],
  other: colors.slate[500],
};

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const { currentHub } = useHubStore();

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

  useEffect(() => {
    setLoading(true);
    fetchEvents();
  }, [currentHub?.id, currentDate.getMonth(), currentDate.getFullYear()]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const formatDateString = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-${String(day).padStart(2, '0')}`;
  };

  const hasEvents = (day: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.some(e => isSameDay(parseISO(e.start_time), targetDate));
  };

  const getEventsForDate = (dateStr: string) => {
    const targetDate = parseISO(dateStr);
    return events.filter(e => isSameDay(parseISO(e.start_time), targetDate));
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
      const isSelected = selectedDate === dateStr;
      const dayHasEvents = hasEvents(day);

      days.push(
        <TouchableOpacity
          key={day}
          style={styles.dayCell}
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
              ]}
            >
              {day}
            </Text>
          </View>
          {dayHasEvents && <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />}
        </TouchableOpacity>
      );
    }

    return days;
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Get upcoming events (next 5 from today)
  const upcomingEvents = events
    .filter(e => parseISO(e.start_time) >= new Date())
    .slice(0, 5);

  const displayEvents = selectedDate ? selectedEvents : upcomingEvents;

  return (
    <View style={styles.container}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
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
              {selectedDate ? 'No events on this day' : 'No upcoming events'}
            </Text>
          )}
        </ScrollView>
      </View>

      {/* FAB for adding events - only show for staff */}
      {/* <TouchableOpacity style={styles.fab}>
        <Plus size={24} color={colors.white} />
      </TouchableOpacity> */}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  navButton: {
    padding: 8,
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
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.light.primary,
    marginTop: 2,
  },
  eventDotSelected: {
    backgroundColor: colors.white,
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
