import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CalendarCheck, MapPin, Clock, Check, X, HelpCircle, User, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { supabase } from '../../services/supabase';
import { format, parseISO } from 'date-fns';

type RsvpStatus = 'going' | 'not_going' | 'maybe';

interface RsvpResponse {
  id: string;
  post_id: string;
  user_id: string;
  status: RsvpStatus;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface RsvpDisplayProps {
  postId: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  currentUserId: string;
}

export function RsvpDisplay({
  postId,
  title,
  date,
  time,
  location,
  currentUserId,
}: RsvpDisplayProps) {
  const [responses, setResponses] = useState<RsvpResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [userStatus, setUserStatus] = useState<RsvpStatus | null>(null);
  const [showResponses, setShowResponses] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, [postId]);

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('rsvp_responses')
        .select('*, profiles(full_name, avatar_url)')
        .eq('post_id', postId);

      if (error) throw error;

      setResponses(data || []);

      const myResponse = data?.find((r) => r.user_id === currentUserId);
      if (myResponse) {
        setUserStatus(myResponse.status as RsvpStatus);
      }
    } catch (err) {
      console.error('Error fetching RSVP responses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (status: RsvpStatus) => {
    if (!currentUserId || responding) return;

    setResponding(true);
    try {
      if (userStatus) {
        // Update existing response
        await supabase
          .from('rsvp_responses')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('post_id', postId)
          .eq('user_id', currentUserId);
      } else {
        // Insert new response
        await supabase.from('rsvp_responses').insert({
          post_id: postId,
          user_id: currentUserId,
          status,
        });
      }

      setUserStatus(status);
      fetchResponses();
    } catch (err) {
      console.error('Error responding to RSVP:', err);
    } finally {
      setResponding(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEE, MMM d');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const goingCount = responses.filter((r) => r.status === 'going').length;
  const maybeCount = responses.filter((r) => r.status === 'maybe').length;
  const notGoingCount = responses.filter((r) => r.status === 'not_going').length;

  const goingResponses = responses.filter((r) => r.status === 'going');
  const maybeResponses = responses.filter((r) => r.status === 'maybe');
  const notGoingResponses = responses.filter((r) => r.status === 'not_going');

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.blue[500]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CalendarCheck size={14} color={colors.blue[600]} />
        <Text style={styles.headerTitle}>RSVP</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>

        {/* Event Details */}
        {(date || time || location) && (
          <View style={styles.detailsContainer}>
            {date && (
              <View style={styles.detailRow}>
                <CalendarCheck size={14} color={colors.blue[500]} />
                <Text style={styles.detailText}>{formatDate(date)}</Text>
              </View>
            )}
            {time && (
              <View style={styles.detailRow}>
                <Clock size={14} color={colors.blue[500]} />
                <Text style={styles.detailText}>{formatTime(time)}</Text>
              </View>
            )}
            {location && (
              <View style={styles.detailRow}>
                <MapPin size={14} color={colors.blue[500]} />
                <Text style={styles.detailText}>{location}</Text>
              </View>
            )}
          </View>
        )}

        {/* Response Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.rsvpButton, userStatus === 'going' && styles.rsvpButtonGoing]}
            onPress={() => handleRsvp('going')}
            disabled={responding}
          >
            <Check size={16} color={userStatus === 'going' ? colors.white : colors.emerald[600]} />
            <Text style={[styles.rsvpButtonText, userStatus === 'going' && styles.rsvpButtonTextActive]}>
              Going
            </Text>
            <Text style={[styles.rsvpCount, userStatus === 'going' && styles.rsvpCountActive]}>
              ({goingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rsvpButton, userStatus === 'maybe' && styles.rsvpButtonMaybe]}
            onPress={() => handleRsvp('maybe')}
            disabled={responding}
          >
            <HelpCircle size={16} color={userStatus === 'maybe' ? colors.white : colors.amber[600]} />
            <Text style={[styles.rsvpButtonText, userStatus === 'maybe' && styles.rsvpButtonTextActive]}>
              Maybe
            </Text>
            <Text style={[styles.rsvpCount, userStatus === 'maybe' && styles.rsvpCountActive]}>
              ({maybeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rsvpButton, userStatus === 'not_going' && styles.rsvpButtonNotGoing]}
            onPress={() => handleRsvp('not_going')}
            disabled={responding}
          >
            <X size={16} color={userStatus === 'not_going' ? colors.white : colors.error[600]} />
            <Text style={[styles.rsvpButtonText, userStatus === 'not_going' && styles.rsvpButtonTextActive]}>
              Can't Go
            </Text>
            <Text style={[styles.rsvpCount, userStatus === 'not_going' && styles.rsvpCountActive]}>
              ({notGoingCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Response List Toggle */}
        {responses.length > 0 && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowResponses(!showResponses)}
          >
            <Text style={styles.toggleButtonText}>
              {showResponses ? 'Hide responses' : `See all ${responses.length} responses`}
            </Text>
            {showResponses ? (
              <ChevronUp size={16} color={colors.blue[600]} />
            ) : (
              <ChevronDown size={16} color={colors.blue[600]} />
            )}
          </TouchableOpacity>
        )}

        {/* Response Lists */}
        {showResponses && (
          <View style={styles.responseLists}>
            {goingResponses.length > 0 && (
              <View style={styles.responseGroup}>
                <Text style={styles.responseGroupTitle}>Going ({goingResponses.length})</Text>
                <View style={styles.responseChips}>
                  {goingResponses.map((r) => (
                    <View key={r.id} style={[styles.responseChip, styles.responseChipGoing]}>
                      <User size={12} color={colors.emerald[700]} />
                      <Text style={styles.responseChipTextGoing}>
                        {r.profiles?.full_name || 'Unknown'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {maybeResponses.length > 0 && (
              <View style={styles.responseGroup}>
                <Text style={[styles.responseGroupTitle, styles.responseGroupTitleMaybe]}>
                  Maybe ({maybeResponses.length})
                </Text>
                <View style={styles.responseChips}>
                  {maybeResponses.map((r) => (
                    <View key={r.id} style={[styles.responseChip, styles.responseChipMaybe]}>
                      <User size={12} color={colors.amber[700]} />
                      <Text style={styles.responseChipTextMaybe}>
                        {r.profiles?.full_name || 'Unknown'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {notGoingResponses.length > 0 && (
              <View style={styles.responseGroup}>
                <Text style={[styles.responseGroupTitle, styles.responseGroupTitleNotGoing]}>
                  Can't Go ({notGoingResponses.length})
                </Text>
                <View style={styles.responseChips}>
                  {notGoingResponses.map((r) => (
                    <View key={r.id} style={[styles.responseChip, styles.responseChipNotGoing]}>
                      <User size={12} color={colors.error[700]} />
                      <Text style={styles.responseChipTextNotGoing}>
                        {r.profiles?.full_name || 'Unknown'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.blue[200],
    backgroundColor: colors.blue[50],
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.blue[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.blue[200],
  },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.blue[700],
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.slate[600],
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  rsvpButtonGoing: {
    backgroundColor: colors.emerald[500],
    borderColor: colors.emerald[500],
  },
  rsvpButtonMaybe: {
    backgroundColor: colors.amber[500],
    borderColor: colors.amber[500],
  },
  rsvpButtonNotGoing: {
    backgroundColor: colors.error[500],
    borderColor: colors.error[500],
  },
  rsvpButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[700],
  },
  rsvpButtonTextActive: {
    color: colors.white,
  },
  rsvpCount: {
    fontSize: 11,
    color: colors.slate[400],
  },
  rsvpCountActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.blue[600],
  },
  responseLists: {
    marginTop: 12,
    gap: 12,
  },
  responseGroup: {},
  responseGroupTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.emerald[600],
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  responseGroupTitleMaybe: {
    color: colors.amber[600],
  },
  responseGroupTitleNotGoing: {
    color: colors.error[600],
  },
  responseChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  responseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  responseChipGoing: {
    backgroundColor: colors.emerald[50],
    borderWidth: 1,
    borderColor: colors.emerald[200],
  },
  responseChipMaybe: {
    backgroundColor: colors.amber[50],
    borderWidth: 1,
    borderColor: colors.amber[200],
  },
  responseChipNotGoing: {
    backgroundColor: colors.error[50],
    borderWidth: 1,
    borderColor: colors.error[200],
  },
  responseChipTextGoing: {
    fontSize: 12,
    color: colors.emerald[700],
  },
  responseChipTextMaybe: {
    fontSize: 12,
    color: colors.amber[700],
  },
  responseChipTextNotGoing: {
    fontSize: 12,
    color: colors.error[700],
  },
});
