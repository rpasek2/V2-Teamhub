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
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/authStore';

export default function FeedbackScreen() {
  const { t, isDark } = useTheme();
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
      <ScrollView style={[styles.container, { backgroundColor: t.background }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type Toggle */}
        <Text style={[styles.label, { color: t.textSecondary }]}>Type</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: t.surface, borderColor: t.border }, type === 'bug' && { backgroundColor: isDark ? colors.error[700] + '20' : colors.error[50], borderColor: isDark ? colors.error[700] : colors.error[300] }]}
            onPress={() => setType('bug')}
            activeOpacity={0.7}
          >
            <Bug size={16} color={type === 'bug' ? (isDark ? colors.error[400] : colors.error[700]) : t.textMuted} />
            <Text style={[styles.toggleText, { color: t.textMuted }, type === 'bug' && { color: isDark ? colors.error[400] : colors.error[700] }]}>
              Bug Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: t.surface, borderColor: t.border }, type === 'feature_request' && { backgroundColor: isDark ? `${t.primary}20` : colors.brand[50], borderColor: isDark ? t.primary : colors.brand[300] }]}
            onPress={() => setType('feature_request')}
            activeOpacity={0.7}
          >
            <Lightbulb size={16} color={type === 'feature_request' ? t.primary : t.textMuted} />
            <Text style={[styles.toggleText, { color: t.textMuted }, type === 'feature_request' && { color: t.primary }]}>
              Feature Request
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={[styles.label, { color: t.textSecondary }]}>Title</Text>
        <TextInput
          style={[styles.input, { color: t.text, backgroundColor: t.surface, borderColor: t.border }]}
          placeholder={type === 'bug' ? 'Brief description of the bug' : 'Your feature idea'}
          placeholderTextColor={t.textFaint}
          value={title}
          onChangeText={setTitle}
        />

        {/* Description */}
        <Text style={[styles.label, { color: t.textSecondary }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { color: t.text, backgroundColor: t.surface, borderColor: t.border }]}
          placeholder={
            type === 'bug'
              ? 'What happened? What did you expect to happen?'
              : 'Describe the feature and how it would help you'
          }
          placeholderTextColor={t.textFaint}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: t.primary }, !canSubmit && { backgroundColor: isDark ? colors.slate[600] : colors.slate[300] }]}
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
