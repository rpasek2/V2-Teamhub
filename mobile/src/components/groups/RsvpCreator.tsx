import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { X, CalendarCheck } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../constants/colors';
import { format } from 'date-fns';

interface RsvpData {
  title: string;
  date?: string;
  time?: string;
  location?: string;
}

interface RsvpCreatorProps {
  onSave: (data: RsvpData) => void;
  onCancel: () => void;
}

export function RsvpCreator({ onSave, onCancel }: RsvpCreatorProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = () => {
    if (title.trim()) {
      onSave({
        title: title.trim(),
        date: date ? format(date, 'yyyy-MM-dd') : undefined,
        time: time ? format(time, 'HH:mm') : undefined,
        location: location.trim() || undefined,
      });
    }
  };

  const isValid = title.trim();

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CalendarCheck size={16} color={colors.blue[600]} />
        <Text style={styles.headerTitle}>Create RSVP</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={18} color={colors.blue[400]} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Event Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Team Dinner"
            placeholderTextColor={colors.slate[400]}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Date <Text style={styles.hint}>(optional)</Text>
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={date ? styles.dateButtonTextSelected : styles.dateButtonText}>
              {date ? format(date, 'EEE, MMM d, yyyy') : 'Select date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Time <Text style={styles.hint}>(optional)</Text>
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={time ? styles.dateButtonTextSelected : styles.dateButtonText}>
              {time ? format(time, 'h:mm a') : 'Select time'}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Location <Text style={styles.hint}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Main Gym"
            placeholderTextColor={colors.slate[400]}
            value={location}
            onChangeText={setLocation}
          />
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!isValid}
          style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>Add RSVP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.blue[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.blue[200],
    overflow: 'hidden',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.blue[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.blue[200],
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.blue[700],
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 12,
    maxHeight: 300,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[600],
    marginBottom: 6,
  },
  required: {
    color: colors.error[500],
  },
  hint: {
    color: colors.slate[400],
    fontWeight: '400',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[300],
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate[900],
  },
  dateButton: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[300],
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.slate[400],
  },
  dateButtonTextSelected: {
    fontSize: 14,
    color: colors.slate[900],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.blue[100],
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[600],
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.blue[600],
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
