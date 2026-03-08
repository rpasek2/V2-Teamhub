import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { DEFAULT_WAG_EVENTS, DEFAULT_MAG_EVENTS, getEventLabel } from './constants';
import type { Goal } from './types';

interface Props {
  visible: boolean;
  editingGoal: Goal | null;
  goalForm: { title: string; description: string; event: string; target_date: string };
  setGoalForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; event: string; target_date: string }>>;
  savingGoal: boolean;
  onSave: () => void;
  onClose: () => void;
  gender: 'Male' | 'Female' | null;
}

export function GoalModal({
  visible,
  editingGoal,
  goalForm,
  setGoalForm,
  savingGoal,
  onSave,
  onClose,
  gender,
}: Props) {
  const { t, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: t.overlay }]}>
        <View style={[styles.modalContent, { backgroundColor: t.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>
              {editingGoal ? 'Edit Goal' : 'Add Goal'}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={onClose}
            >
              <X size={24} color={t.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
              placeholder="Enter goal title"
              placeholderTextColor={t.textFaint}
              value={goalForm.title}
              onChangeText={(text) => setGoalForm(prev => ({ ...prev, title: text }))}
            />

            <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
              placeholder="Describe the goal"
              placeholderTextColor={t.textFaint}
              value={goalForm.description}
              onChangeText={(text) => setGoalForm(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Event (optional)</Text>
            <View style={styles.eventPicker}>
              {(gender === 'Female' ? DEFAULT_WAG_EVENTS : DEFAULT_MAG_EVENTS).map((event) => (
                <TouchableOpacity
                  key={event}
                  style={[
                    styles.eventOption,
                    { backgroundColor: isDark ? colors.slate[700] : colors.slate[100], borderColor: t.border },
                    goalForm.event === event && [styles.eventOptionSelected, { backgroundColor: t.primary, borderColor: t.primary }],
                  ]}
                  onPress={() =>
                    setGoalForm(prev => ({
                      ...prev,
                      event: prev.event === event ? '' : event,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.eventOptionText,
                      { color: t.textSecondary },
                      goalForm.event === event && styles.eventOptionTextSelected,
                    ]}
                  >
                    {getEventLabel(event)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Target Date (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={t.textFaint}
              value={goalForm.target_date}
              onChangeText={(text) => setGoalForm(prev => ({ ...prev, target_date: text }))}
            />
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: t.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: t.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: t.primary }, (!goalForm.title.trim() || savingGoal) && { backgroundColor: isDark ? colors.slate[600] : colors.slate[300] }]}
              onPress={onSave}
              disabled={!goalForm.title.trim() || savingGoal}
            >
              {savingGoal ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>{editingGoal ? 'Save' : 'Add Goal'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.slate[900],
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  eventPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  eventOptionSelected: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  eventOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[600],
  },
  eventOptionTextSelected: {
    color: colors.white,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[700],
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
