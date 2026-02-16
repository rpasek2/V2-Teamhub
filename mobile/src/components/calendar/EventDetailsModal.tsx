import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import {
  X,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  Users,
  Check,
  HelpCircle,
  XCircle,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, theme } from '../../constants/colors';
import { Badge } from '../ui';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';

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

interface Attendee {
  user_id: string;
  status: 'going' | 'maybe' | 'not_going';
  profiles: {
    full_name: string;
  };
}

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEventUpdated?: () => void;
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

export function EventDetailsModal({
  isOpen,
  onClose,
  event,
  onEventUpdated,
}: EventDetailsModalProps) {
  const user = useAuthStore((state) => state.user);
  const [rsvpStatus, setRsvpStatus] = useState<'going' | 'maybe' | 'not_going' | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    if (isOpen && event && user) {
      fetchRsvpStatus();
      fetchAttendees();
    }
  }, [isOpen, event?.id, user?.id]);

  const fetchRsvpStatus = async () => {
    if (!event || !user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('event_rsvps')
        .select('status')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setRsvpStatus(data.status as 'going' | 'maybe' | 'not_going');
      } else {
        setRsvpStatus(null);
      }
    } catch {
      setRsvpStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async () => {
    if (!event) return;
    try {
      const { data } = await supabase
        .from('event_rsvps')
        .select('user_id, status, profiles(full_name)')
        .eq('event_id', event.id)
        .eq('status', 'going');

      if (data) {
        const mapped = data.map((d: any) => ({
          user_id: d.user_id,
          status: d.status,
          profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles,
        }));
        setAttendees(mapped as Attendee[]);
      }
    } catch (err) {
      console.error('Error fetching attendees:', err);
    }
  };

  const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    if (!event || !user) return;
    setRsvpLoading(true);

    try {
      const { error } = await supabase
        .from('event_rsvps')
        .upsert(
          {
            event_id: event.id,
            user_id: user.id,
            status: status,
          },
          { onConflict: 'event_id,user_id' }
        );

      if (!error) {
        setRsvpStatus(status);
        fetchAttendees();
        if (onEventUpdated) onEventUpdated();
      }
    } catch (err) {
      console.error('Error updating RSVP:', err);
    } finally {
      setRsvpLoading(false);
    }
  };

  if (!event) return null;

  const eventColor = EVENT_COLORS[event.type] || colors.slate[500];

  const formatEventDate = () => {
    try {
      return format(parseISO(event.start_time), 'EEEE, MMMM d, yyyy');
    } catch {
      return '';
    }
  };

  const formatEventTime = () => {
    try {
      const start = format(parseISO(event.start_time), 'h:mm a');
      const end = format(parseISO(event.end_time), 'h:mm a');
      return `${start} - ${end}`;
    } catch {
      return '';
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.colorBar, { backgroundColor: eventColor }]} />
            <Badge
              label={event.type.replace('_', ' ')}
              variant={event.type === 'competition' ? 'warning' : 'neutral'}
              size="sm"
            />
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.slate[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Event Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <CalendarIcon size={20} color={colors.slate[400]} />
              <Text style={styles.detailText}>{formatEventDate()}</Text>
            </View>

            <View style={styles.detailRow}>
              <Clock size={20} color={colors.slate[400]} />
              <Text style={styles.detailText}>{formatEventTime()}</Text>
            </View>

            {event.location && (
              <View style={styles.detailRow}>
                <MapPin size={20} color={colors.slate[400]} />
                <Text style={styles.detailText}>{event.location}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}

          {/* RSVP Section */}
          {event.rsvp_enabled !== false && (
            <View style={styles.rsvpSection}>
              <Text style={styles.sectionTitle}>Your RSVP</Text>

              {loading ? (
                <ActivityIndicator size="small" color={theme.light.primary} />
              ) : (
                <View style={styles.rsvpButtons}>
                  <TouchableOpacity
                    style={[
                      styles.rsvpButton,
                      rsvpStatus === 'going' && styles.rsvpButtonGoing,
                    ]}
                    onPress={() => handleRsvp('going')}
                    disabled={rsvpLoading}
                  >
                    <Check
                      size={18}
                      color={rsvpStatus === 'going' ? colors.white : colors.emerald[600]}
                    />
                    <Text
                      style={[
                        styles.rsvpButtonText,
                        rsvpStatus === 'going' && styles.rsvpButtonTextActive,
                      ]}
                    >
                      Going
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rsvpButton,
                      rsvpStatus === 'maybe' && styles.rsvpButtonMaybe,
                    ]}
                    onPress={() => handleRsvp('maybe')}
                    disabled={rsvpLoading}
                  >
                    <HelpCircle
                      size={18}
                      color={rsvpStatus === 'maybe' ? colors.white : colors.amber[600]}
                    />
                    <Text
                      style={[
                        styles.rsvpButtonText,
                        rsvpStatus === 'maybe' && styles.rsvpButtonTextActive,
                      ]}
                    >
                      Maybe
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.rsvpButton,
                      rsvpStatus === 'not_going' && styles.rsvpButtonNotGoing,
                    ]}
                    onPress={() => handleRsvp('not_going')}
                    disabled={rsvpLoading}
                  >
                    <XCircle
                      size={18}
                      color={rsvpStatus === 'not_going' ? colors.white : colors.error[600]}
                    />
                    <Text
                      style={[
                        styles.rsvpButtonText,
                        rsvpStatus === 'not_going' && styles.rsvpButtonTextActive,
                      ]}
                    >
                      Can't Go
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Attendees Section */}
          {event.rsvp_enabled !== false && (
            <View style={styles.attendeesSection}>
              <View style={styles.attendeesHeader}>
                <Users size={18} color={colors.slate[500]} />
                <Text style={styles.sectionTitle}>
                  Attendees ({attendees.length})
                </Text>
              </View>

              {attendees.length > 0 ? (
                <View style={styles.attendeesList}>
                  {attendees.map((attendee) => (
                    <View key={attendee.user_id} style={styles.attendeeChip}>
                      <View style={styles.attendeeAvatar}>
                        <Text style={styles.attendeeInitial}>
                          {attendee.profiles?.full_name?.[0] || '?'}
                        </Text>
                      </View>
                      <Text style={styles.attendeeName}>
                        {attendee.profiles?.full_name || 'Unknown'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noAttendeesText}>
                  No one has RSVP'd yet.
                </Text>
              )}
            </View>
          )}

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
    marginBottom: 20,
  },
  detailsSection: {
    gap: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: colors.slate[600],
    flex: 1,
  },
  descriptionSection: {
    backgroundColor: colors.slate[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.slate[600],
    lineHeight: 22,
  },
  rsvpSection: {
    marginBottom: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 12,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
  },
  rsvpButtonGoing: {
    backgroundColor: colors.emerald[500],
  },
  rsvpButtonMaybe: {
    backgroundColor: colors.amber[500],
  },
  rsvpButtonNotGoing: {
    backgroundColor: colors.error[500],
  },
  rsvpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
  },
  rsvpButtonTextActive: {
    color: colors.white,
  },
  attendeesSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  attendeesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attendeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.emerald[50],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  attendeeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.emerald[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInitial: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.emerald[700],
  },
  attendeeName: {
    fontSize: 14,
    color: colors.emerald[700],
    fontWeight: '500',
  },
  noAttendeesText: {
    fontSize: 14,
    color: colors.slate[400],
    fontStyle: 'italic',
  },
});
