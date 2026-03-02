import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Bug, Lightbulb, Send } from 'lucide-react-native';
import { colors } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/authStore';

export default function FeedbackScreen() {
  const user = useAuthStore((state) => state.user);

  const [type, setType] = useState<'bug' | 'feature_request'>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !title.trim() || !description.trim()) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('feedback_reports')
        .insert({
          user_id: user.id,
          type,
          title: title.trim(),
          description: description.trim(),
        });

      if (error) throw error;

      Alert.alert('Thank you!', 'Your feedback has been submitted.');
      setTitle('');
      setDescription('');
      setType('bug');
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      Alert.alert('Error', err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !submitting;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Report Bug / Feature Request' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type Toggle */}
        <Text style={styles.label}>Type</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, type === 'bug' && styles.toggleButtonActiveBug]}
            onPress={() => setType('bug')}
            activeOpacity={0.7}
          >
            <Bug size={16} color={type === 'bug' ? colors.error[700] : colors.slate[500]} />
            <Text style={[styles.toggleText, type === 'bug' && styles.toggleTextActiveBug]}>
              Bug Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, type === 'feature_request' && styles.toggleButtonActiveFeature]}
            onPress={() => setType('feature_request')}
            activeOpacity={0.7}
          >
            <Lightbulb size={16} color={type === 'feature_request' ? colors.brand[700] : colors.slate[500]} />
            <Text style={[styles.toggleText, type === 'feature_request' && styles.toggleTextActiveFeature]}>
              Feature Request
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder={type === 'bug' ? 'Brief description of the bug' : 'Your feature idea'}
          placeholderTextColor={colors.slate[400]}
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={
            type === 'bug'
              ? 'What happened? What did you expect to happen?'
              : 'Describe the feature and how it would help you'
          }
          placeholderTextColor={colors.slate[400]}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Send size={16} color={colors.white} />
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 8,
    marginTop: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.white,
  },
  toggleButtonActiveBug: {
    backgroundColor: colors.error[50],
    borderColor: colors.error[300],
  },
  toggleButtonActiveFeature: {
    backgroundColor: colors.brand[50],
    borderColor: colors.brand[300],
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[500],
  },
  toggleTextActiveBug: {
    color: colors.error[700],
  },
  toggleTextActiveFeature: {
    color: colors.brand[700],
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.slate[900],
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand[600],
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
