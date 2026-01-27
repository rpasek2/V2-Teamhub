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
import { X, Plus, BarChart3 } from 'lucide-react-native';
import { colors, theme } from '../../constants/colors';

interface PollSettings {
  multipleChoice: boolean;
  allowChangeVote: boolean;
  showResultsBeforeVote: boolean;
}

interface PollData {
  question: string;
  options: string[];
  settings: PollSettings;
}

interface PollCreatorProps {
  onSave: (data: PollData) => void;
  onCancel: () => void;
  initialData?: PollData;
}

export function PollCreator({ onSave, onCancel, initialData }: PollCreatorProps) {
  const [question, setQuestion] = useState(initialData?.question || '');
  const [options, setOptions] = useState<string[]>(
    initialData?.options || ['', '']
  );
  const [multipleChoice, setMultipleChoice] = useState(
    initialData?.settings.multipleChoice || false
  );
  const [allowChangeVote, setAllowChangeVote] = useState(
    initialData?.settings.allowChangeVote ?? true
  );
  const [showResultsBeforeVote, setShowResultsBeforeVote] = useState(
    initialData?.settings.showResultsBeforeVote || false
  );

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSave = () => {
    const filledOptions = options.filter((o) => o.trim() !== '');
    if (question.trim() && filledOptions.length >= 2) {
      onSave({
        question: question.trim(),
        options: filledOptions,
        settings: {
          multipleChoice,
          allowChangeVote,
          showResultsBeforeVote,
        },
      });
    }
  };

  const isValid = question.trim() && options.filter((o) => o.trim()).length >= 2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BarChart3 size={16} color={colors.purple[600]} />
        <Text style={styles.headerTitle}>Create Poll</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <X size={18} color={colors.purple[400]} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Question */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Question <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ask a question..."
            placeholderTextColor={colors.slate[400]}
            value={question}
            onChangeText={setQuestion}
          />
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Options <Text style={styles.hint}>(min 2, max 10)</Text>
          </Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionRow}>
              <TextInput
                style={styles.optionInput}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor={colors.slate[400]}
                value={option}
                onChangeText={(value) => updateOption(index, value)}
              />
              {options.length > 2 && (
                <TouchableOpacity
                  onPress={() => removeOption(index)}
                  style={styles.removeButton}
                >
                  <X size={16} color={colors.slate[400]} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {options.length < 10 && (
            <TouchableOpacity onPress={addOption} style={styles.addButton}>
              <Plus size={16} color={colors.purple[600]} />
              <Text style={styles.addButtonText}>Add option</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Allow multiple selections</Text>
            <Switch
              value={multipleChoice}
              onValueChange={setMultipleChoice}
              trackColor={{ false: colors.slate[200], true: colors.purple[200] }}
              thumbColor={multipleChoice ? colors.purple[500] : colors.slate[400]}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Show results before voting</Text>
            <Switch
              value={showResultsBeforeVote}
              onValueChange={setShowResultsBeforeVote}
              trackColor={{ false: colors.slate[200], true: colors.purple[200] }}
              thumbColor={showResultsBeforeVote ? colors.purple[500] : colors.slate[400]}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Allow changing vote</Text>
            <Switch
              value={allowChangeVote}
              onValueChange={setAllowChangeVote}
              trackColor={{ false: colors.slate[200], true: colors.purple[200] }}
              thumbColor={allowChangeVote ? colors.purple[500] : colors.slate[400]}
            />
          </View>
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
          <Text style={styles.saveButtonText}>Add Poll</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.purple[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.purple[200],
    overflow: 'hidden',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.purple[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.purple[200],
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.purple[700],
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
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionInput: {
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
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: colors.purple[600],
    fontWeight: '500',
  },
  settingsSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.purple[100],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.slate[700],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.purple[100],
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
    backgroundColor: colors.purple[600],
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
