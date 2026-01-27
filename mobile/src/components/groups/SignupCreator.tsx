import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { X, Plus, ClipboardList, Users } from 'lucide-react-native';
import { colors } from '../../constants/colors';

interface SignupSlot {
  name: string;
  maxSignups?: number;
}

interface SignupData {
  title: string;
  description?: string;
  slots: SignupSlot[];
  settings?: {
    allowUserSlots?: boolean;
  };
}

interface SignupCreatorProps {
  onSave: (data: SignupData) => void;
  onCancel: () => void;
}

export function SignupCreator({ onSave, onCancel }: SignupCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slots, setSlots] = useState<{ name: string; maxSignups: string }[]>([
    { name: '', maxSignups: '' },
    { name: '', maxSignups: '' },
  ]);
  const [allowUserSlots, setAllowUserSlots] = useState(false);

  const addSlot = () => {
    if (slots.length < 20) {
      setSlots([...slots, { name: '', maxSignups: '' }]);
    }
  };

  const removeSlot = (index: number) => {
    if (slots.length > 1) {
      setSlots(slots.filter((_, i) => i !== index));
    }
  };

  const updateSlot = (index: number, field: 'name' | 'maxSignups', value: string) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const handleSave = () => {
    const filledSlots: SignupSlot[] = slots
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        maxSignups: s.maxSignups ? parseInt(s.maxSignups) : undefined,
      }));

    const hasValidSlots = filledSlots.length >= 1 || allowUserSlots;

    if (title.trim() && hasValidSlots) {
      onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        slots: filledSlots,
        settings: allowUserSlots ? { allowUserSlots: true } : undefined,
      });
    }
  };

  const isValid = title.trim() && (slots.filter((s) => s.name.trim()).length >= 1 || allowUserSlots);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ClipboardList size={16} color={colors.emerald[600]} />
        <Text style={styles.headerTitle}>Create Sign-Up</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={18} color={colors.emerald[400]} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Snack Sign-Up for Saturday Meet"
            placeholderTextColor={colors.slate[400]}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Description <Text style={styles.hint}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any additional details..."
            placeholderTextColor={colors.slate[400]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Slots */}
        <View style={styles.section}>
          <Text style={styles.label}>Sign-Up Slots</Text>
          {slots.map((slot, index) => (
            <View key={index} style={styles.slotRow}>
              <TextInput
                style={styles.slotNameInput}
                placeholder={`Slot ${index + 1} (e.g., Fruit)`}
                placeholderTextColor={colors.slate[400]}
                value={slot.name}
                onChangeText={(value) => updateSlot(index, 'name', value)}
              />
              <TextInput
                style={styles.slotMaxInput}
                placeholder="Max"
                placeholderTextColor={colors.slate[400]}
                value={slot.maxSignups}
                onChangeText={(value) => updateSlot(index, 'maxSignups', value.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
              />
              {slots.length > 1 && (
                <TouchableOpacity onPress={() => removeSlot(index)} style={styles.removeSlotButton}>
                  <X size={16} color={colors.slate[400]} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {slots.length < 20 && (
            <TouchableOpacity onPress={addSlot} style={styles.addSlotLink}>
              <Plus size={16} color={colors.emerald[600]} />
              <Text style={styles.addSlotText}>Add slot</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.hintText}>Leave "Max" empty for unlimited sign-ups</Text>
        </View>

        {/* Allow User Slots */}
        <View style={styles.optionCard}>
          <View style={styles.optionContent}>
            <View style={styles.optionHeader}>
              <Users size={16} color={colors.emerald[600]} />
              <Text style={styles.optionTitle}>Allow members to add items</Text>
            </View>
            <Text style={styles.optionDescription}>
              Perfect for potlucks! Members can add their own items.
            </Text>
          </View>
          <Switch
            value={allowUserSlots}
            onValueChange={setAllowUserSlots}
            trackColor={{ false: colors.slate[200], true: colors.emerald[200] }}
            thumbColor={allowUserSlots ? colors.emerald[500] : colors.slate[400]}
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
          <Text style={styles.saveButtonText}>Add Sign-Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.emerald[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.emerald[200],
    overflow: 'hidden',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.emerald[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.emerald[200],
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.emerald[700],
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 12,
    maxHeight: 350,
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
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  slotNameInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[300],
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate[900],
  },
  slotMaxInput: {
    width: 60,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[300],
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate[900],
    textAlign: 'center',
  },
  removeSlotButton: {
    padding: 6,
  },
  addSlotLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  addSlotText: {
    fontSize: 14,
    color: colors.emerald[600],
    fontWeight: '500',
  },
  hintText: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.white,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
  },
  optionDescription: {
    fontSize: 12,
    color: colors.slate[500],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.emerald[100],
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
    backgroundColor: colors.emerald[600],
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
