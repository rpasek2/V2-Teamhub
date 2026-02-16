import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { X, Check, Calendar, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, theme } from '../../../src/constants/colors';
import { supabase } from '../../../src/services/supabase';

interface Coach {
  user_id: string;
  profiles: {
    full_name: string;
  };
}

interface CreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSessionCreated: () => void;
  competitionId: string;
  hubId: string;
  defaultDate?: Date;
}

export function CreateSessionModal({
  visible,
  onClose,
  onSessionCreated,
  competitionId,
  hubId,
  defaultDate,
}: CreateSessionModalProps) {
  const [loading, setLoading] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<Set<string>>(new Set());

  const [name, setName] = useState('');
  const [date, setDate] = useState(defaultDate || new Date());
  const [warmupTime, setWarmupTime] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible && hubId) {
      fetchCoaches();
    }
  }, [visible, hubId]);

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setName('');
      setDate(defaultDate || new Date());
      setWarmupTime(null);
      setSelectedCoaches(new Set());
    }
  }, [visible, defaultDate]);

  const fetchCoaches = async () => {
    const { data, error } = await supabase
      .from('hub_members')
      .select('user_id, profiles(full_name)')
      .eq('hub_id', hubId)
      .in('role', ['owner', 'admin', 'director', 'coach']);

    if (error) {
      console.error('Error fetching coaches:', error);
    } else if (data) {
      const mapped: Coach[] = data.map((d: { user_id: string; profiles: { full_name: string } | { full_name: string }[] | null }) => ({
        user_id: d.user_id,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles ?? { full_name: 'Unknown' },
      }));
      setCoaches(mapped);
    }
  };

  const toggleCoach = (userId: string) => {
    setSelectedCoaches((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a session name');
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData, error: insertError } = await supabase
        .from('competition_sessions')
        .insert({
          competition_id: competitionId,
          name: name.trim(),
          date: format(date, 'yyyy-MM-dd'),
          warmup_time: warmupTime ? format(warmupTime, 'HH:mm:ss') : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Assign selected coaches to the session
      if (selectedCoaches.size > 0 && sessionData) {
        const { error: coachError } = await supabase
          .from('session_coaches')
          .insert(
            [...selectedCoaches].map((userId) => ({
              session_id: sessionData.id,
              user_id: userId,
            }))
          );
        if (coachError) throw coachError;
      }

      onSessionCreated();
      onClose();
    } catch (err) {
      console.error('Error creating session:', err);
      Alert.alert('Error', 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (_event: unknown, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setWarmupTime(selectedTime);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <X size={24} color={colors.slate[600]} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Session</Text>
          <TouchableOpacity
            style={[styles.modalSaveButton, loading && styles.modalSaveButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.modalSaveButtonText}>Add</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          {/* Session Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Session Name</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Session 1, Morning Session"
              placeholderTextColor={colors.slate[400]}
            />
          </View>

          {/* Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={18} color={colors.slate[500]} />
              <Text style={styles.dateButtonText}>{format(date, 'MMM d, yyyy')}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}

          {/* Warmup Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Check-In / Warmup Time <Text style={styles.optionalText}>(optional)</Text>
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={18} color={colors.slate[500]} />
              <Text style={[styles.dateButtonText, !warmupTime && styles.placeholderText]}>
                {warmupTime ? format(warmupTime, 'h:mm a') : 'Select time'}
              </Text>
            </TouchableOpacity>
            {warmupTime && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setWarmupTime(null)}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={warmupTime || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          {/* Coach Assignment */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Assign Coaches <Text style={styles.optionalText}>(optional)</Text>
            </Text>
            {coaches.length > 0 ? (
              <View style={styles.coachesList}>
                {coaches.map((coach) => {
                  const isSelected = selectedCoaches.has(coach.user_id);
                  return (
                    <TouchableOpacity
                      key={coach.user_id}
                      style={[styles.coachRow, isSelected && styles.coachRowSelected]}
                      onPress={() => toggleCoach(coach.user_id)}
                    >
                      <Text style={[styles.coachName, isSelected && styles.coachNameSelected]}>
                        {coach.profiles?.full_name || 'Unknown'}
                      </Text>
                      <View style={[styles.coachCheckbox, isSelected && styles.coachCheckboxSelected]}>
                        {isSelected && <Check size={14} color={colors.white} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noCoachesText}>No coaches available</Text>
            )}
            {selectedCoaches.size > 0 && (
              <Text style={styles.selectedCountText}>
                {selectedCoaches.size} coach{selectedCoaches.size !== 1 ? 'es' : ''} selected
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.slate[900],
  },
  modalSaveButton: {
    backgroundColor: theme.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
    marginBottom: 8,
  },
  optionalText: {
    fontWeight: '400',
    color: colors.slate[400],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.slate[900],
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: colors.slate[900],
  },
  placeholderText: {
    color: colors.slate[400],
  },
  clearButton: {
    marginTop: 6,
  },
  clearButtonText: {
    fontSize: 13,
    color: theme.light.primary,
  },
  coachesList: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 8,
    overflow: 'hidden',
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  coachRowSelected: {
    backgroundColor: colors.brand[50],
  },
  coachName: {
    fontSize: 14,
    color: colors.slate[900],
  },
  coachNameSelected: {
    fontWeight: '500',
  },
  coachCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachCheckboxSelected: {
    backgroundColor: theme.light.primary,
    borderColor: theme.light.primary,
  },
  noCoachesText: {
    fontSize: 14,
    color: colors.slate[500],
    fontStyle: 'italic',
  },
  selectedCountText: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 6,
  },
});
