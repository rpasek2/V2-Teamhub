import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, ShieldAlert, Check, AlertTriangle } from 'lucide-react-native';
import { colors, theme } from '../../constants/colors';
import { supabase } from '../../services/supabase';

interface AnonymousReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  hubId: string;
  ownerName: string;
}

export function AnonymousReportModal({
  isOpen,
  onClose,
  hubId,
  ownerName,
}: AnonymousReportModalProps) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setSubmitted(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('anonymous_reports')
        .insert({
          hub_id: hubId,
          message: message.trim(),
        });

      if (submitError) {
        console.error('Error submitting anonymous report:', submitError);
        setError('Failed to submit report. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setSubmitted(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.slate[600]} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <View style={styles.headerIcon}>
              <ShieldAlert size={20} color={colors.purple[600]} />
            </View>
            <Text style={styles.title}>Anonymous Report</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Check size={32} color={colors.success[600]} />
              </View>
              <Text style={styles.successTitle}>Report Submitted</Text>
              <Text style={styles.successText}>
                Your anonymous report has been sent to {ownerName}. Since this is
                anonymous, you won't receive a direct response.
              </Text>
              <TouchableOpacity
                style={styles.closeButtonPrimary}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Info Box */}
              <View style={styles.infoBox}>
                <ShieldAlert size={20} color={colors.purple[600]} style={styles.infoIcon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>
                    Your identity will not be recorded
                  </Text>
                  <Text style={styles.infoText}>
                    This message will be sent anonymously to{' '}
                    <Text style={styles.bold}>{ownerName}</Text>, the hub owner.
                    They will not be able to see who sent it.
                  </Text>
                </View>
              </View>

              {/* Warning Box */}
              <View style={styles.warningBox}>
                <AlertTriangle size={16} color={colors.amber[600]} />
                <Text style={styles.warningText}>
                  Because this is anonymous, you won't receive a direct reply. If
                  you need a response, consider sending a direct message instead.
                </Text>
              </View>

              {/* Message Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Your Message</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Describe your concern or feedback..."
                  placeholderTextColor={colors.slate[400]}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={2000}
                />
              </View>

              {/* Error */}
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!message.trim() || submitting) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!message.trim() || submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.purple[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: colors.slate[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  closeButtonPrimary: {
    backgroundColor: theme.light.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.purple[50],
    borderWidth: 1,
    borderColor: colors.purple[200],
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.purple[800],
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.purple[700],
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.amber[50],
    borderWidth: 1,
    borderColor: colors.amber[200],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.amber[800],
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: colors.slate[900],
    minHeight: 140,
  },
  errorBox: {
    backgroundColor: colors.error[50],
    borderWidth: 1,
    borderColor: colors.error[200],
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.error[700],
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.slate[700],
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.purple[600],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
