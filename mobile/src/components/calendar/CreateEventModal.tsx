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
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, MapPin, AlignLeft, Users, AlertCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, theme } from '../../constants/colors';
import { supabase } from '../../services/supabase';
import { useHubStore } from '../../stores/hubStore';
import { useAuthStore } from '../../stores/authStore';
import { format } from 'date-fns';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  initialDate?: Date;
}

const EVENT_TYPES = [
  { value: 'practice', label: 'Practice', icon: '🏋️', color: colors.blue[100], textColor: colors.blue[700] },
  { value: 'competition', label: 'Comp', icon: '🏆', color: colors.purple[100], textColor: colors.purple[700] },
  { value: 'meeting', label: 'Meeting', icon: '👥', color: colors.amber[100], textColor: colors.amber[700] },
  { value: 'social', label: 'Social', icon: '🎉', color: colors.emerald[100], textColor: colors.emerald[700] },
  { value: 'camp', label: 'Camp', icon: '🏕️', color: colors.emerald[100], textColor: colors.emerald[700] },
  { value: 'other', label: 'Other', icon: '📌', color: colors.slate[100], textColor: colors.slate[700] },
];

export function CreateEventModal({ isOpen, onClose, onEventCreated, initialDate }: CreateEventModalProps) {
  const { currentHub } = useHubStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('practice');
  const [rsvpEnabled, setRsvpEnabled] = useState(true);

  const [startDate, setStartDate] = useState(initialDate || new Date());
  const [endDate, setEndDate] = useState(initialDate || new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const date = initialDate || new Date();
      // Set default times (9am - 10am)
      const start = new Date(date);
      start.setHours(9, 0, 0, 0);
      const end = new Date(date);
      end.setHours(10, 0, 0, 0);

      setTitle('');
      setDescription('');
      setLocation('');
      setEventType('practice');
      setRsvpEnabled(true);
      setStartDate(start);
      setEndDate(end);
      setError(null);
    }
  }, [isOpen, initialDate]);

  const handleSubmit = async () => {
    if (!currentHub || !user) return;
    if (!title.trim()) {
      setError('Please enter an event title');
      return;
    }

    if (endDate <= startDate) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If competition, also create competition record
      if (eventType === 'competition') {
        const { error: competitionError } = await supabase
          .from('competitions')
          .insert({
            hub_id: currentHub.id,
            name: title,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            location: location || null,
            notes: description || null,
            created_by: user.id,
          });

        if (competitionError) throw competitionError;
      }

      const { error: insertError } = await supabase
        .from('events')
        .insert({
          hub_id: currentHub.id,
          title: title.trim(),
          description: description || null,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          location: location || null,
          type: eventType,
          rsvp_enabled: rsvpEnabled,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      onEventCreated();
      onClose();
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const onStartDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      // Auto-adjust end date if needed
      if (selectedDate >= endDate) {
        const newEnd = new Date(selectedDate);
        newEnd.setHours(newEnd.getHours() + 1);
        setEndDate(newEnd);
      }
    }
  };

  const onEndDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const selectedType = EVENT_TYPES.find(t => t.value === eventType);

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: selectedType?.color || colors.slate[100] }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>{selectedType?.icon}</Text>
            <View>
              <Text style={styles.headerTitle}>Create Event</Text>
              {initialDate && (
                <Text style={styles.headerSubtitle}>
                  {format(initialDate, 'EEEE, MMMM d, yyyy')}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.slate[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={20} color={colors.error[500]} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Event Type Selection */}
          <Text style={styles.label}>Event Type</Text>
          <View style={styles.typeGrid}>
            {EVENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  eventType === type.value && { backgroundColor: type.color, borderColor: type.textColor },
                ]}
                onPress={() => setEventType(type.value)}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text style={[
                  styles.typeLabel,
                  eventType === type.value && { color: type.textColor },
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.label}>Event Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Team Practice, Parents Meeting..."
            placeholderTextColor={colors.slate[400]}
          />

          {/* Date & Time */}
          <Text style={styles.label}>Date & Time</Text>
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <Text style={styles.dateTimeLabel}>Start</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setPickerMode('date');
                  setShowStartPicker(true);
                }}
              >
                <Text style={styles.dateTimeText}>{format(startDate, 'MMM d, yyyy')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setPickerMode('time');
                  setShowStartPicker(true);
                }}
              >
                <Text style={styles.dateTimeText}>{format(startDate, 'h:mm a')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateTimeRow}>
              <Text style={styles.dateTimeLabel}>End</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setPickerMode('date');
                  setShowEndPicker(true);
                }}
              >
                <Text style={styles.dateTimeText}>{format(endDate, 'MMM d, yyyy')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => {
                  setPickerMode('time');
                  setShowEndPicker(true);
                }}
              >
                <Text style={styles.dateTimeText}>{format(endDate, 'h:mm a')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Pickers */}
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode={pickerMode}
              is24Hour={false}
              onChange={onStartDateChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode={pickerMode}
              is24Hour={false}
              onChange={onEndDateChange}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            />
          )}

          {/* Location */}
          <View style={styles.inputRow}>
            <MapPin size={18} color={colors.slate[400]} />
            <Text style={styles.label}>Location</Text>
          </View>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g., Main Gym, Conference Room..."
            placeholderTextColor={colors.slate[400]}
          />

          {/* Description */}
          <View style={styles.inputRow}>
            <AlignLeft size={18} color={colors.slate[400]} />
            <Text style={styles.label}>Description</Text>
            <Text style={styles.optional}>(optional)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add any additional details..."
            placeholderTextColor={colors.slate[400]}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* RSVP Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.toggleInfo}>
              <View style={styles.toggleIcon}>
                <Users size={20} color={colors.slate[600]} />
              </View>
              <View>
                <Text style={styles.toggleTitle}>Enable RSVPs</Text>
                <Text style={styles.toggleSubtitle}>Allow members to respond</Text>
              </View>
            </View>
            <Switch
              value={rsvpEnabled}
              onValueChange={setRsvpEnabled}
              trackColor={{ false: colors.slate[200], true: theme.light.primary }}
              thumbColor={colors.white}
            />
          </View>

          {/* Competition Warning */}
          {eventType === 'competition' && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                This will also create a competition in the Competitions tab.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create Event</Text>
            )}
          </TouchableOpacity>
        </View>
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.slate[600],
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.error[50],
    borderWidth: 1,
    borderColor: colors.error[200],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.error[700],
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 8,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.slate[200],
    backgroundColor: colors.white,
  },
  typeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[600],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.slate[900],
    backgroundColor: colors.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  optional: {
    fontSize: 14,
    color: colors.slate[400],
  },
  dateTimeContainer: {
    backgroundColor: colors.slate[50],
    borderRadius: 12,
    padding: 12,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTimeLabel: {
    width: 50,
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[600],
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  dateTimeText: {
    fontSize: 14,
    color: colors.slate[900],
    textAlign: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleIcon: {
    padding: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
  },
  toggleSubtitle: {
    fontSize: 12,
    color: colors.slate[500],
  },
  warningContainer: {
    backgroundColor: colors.purple[50],
    borderWidth: 1,
    borderColor: colors.purple[200],
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 13,
    color: colors.purple[700],
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
    backgroundColor: colors.white,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.slate[700],
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
