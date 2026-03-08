import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Edit2, X, Zap, Activity, FileText, Heart } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { sharedStyles } from './sharedStyles';
import type { Assessment } from './types';

interface Props {
  assessment: Assessment | null;
  assessmentForm: { strengths: string; weaknesses: string; overall_plan: string; injuries: string };
  setAssessmentForm: React.Dispatch<React.SetStateAction<{ strengths: string; weaknesses: string; overall_plan: string; injuries: string }>>;
  editingAssessment: boolean;
  setEditingAssessment: (editing: boolean) => void;
  savingAssessment: boolean;
  saveAssessment: () => void;
  canEditData: boolean;
}

export function AssessmentTab({
  assessment,
  assessmentForm,
  setAssessmentForm,
  editingAssessment,
  setEditingAssessment,
  savingAssessment,
  saveAssessment,
  canEditData,
}: Props) {
  const { t, isDark } = useTheme();

  return (
    <View style={sharedStyles.section}>
      {/* Edit toggle for staff */}
      {canEditData && (
        <View style={styles.assessmentHeader}>
          <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Coach Assessment</Text>
          <TouchableOpacity
            style={[styles.editToggleBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
            onPress={() => {
              if (editingAssessment) {
                // Cancel edit - reset form
                setAssessmentForm({
                  strengths: assessment?.strengths || '',
                  weaknesses: assessment?.weaknesses || '',
                  overall_plan: assessment?.overall_plan || '',
                  injuries: assessment?.injuries || '',
                });
              }
              setEditingAssessment(!editingAssessment);
            }}
          >
            {editingAssessment ? (
              <X size={18} color={t.textMuted} />
            ) : (
              <Edit2 size={18} color={t.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {!canEditData && <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Coach Assessment</Text>}

      {editingAssessment ? (
        // Edit Mode
        <View style={styles.assessmentEditForm}>
          <View style={[styles.assessmentEditCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[styles.assessmentEditHeader, { backgroundColor: isDark ? colors.emerald[700] + '20' : colors.emerald[50] }]}>
              <Zap size={18} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
              <Text style={[styles.assessmentEditLabel, { color: isDark ? colors.emerald[400] : colors.emerald[700] }]}>Strengths</Text>
            </View>
            <TextInput
              style={[styles.assessmentTextArea, { color: t.text }]}
              placeholder="Enter strengths..."
              placeholderTextColor={t.textFaint}
              value={assessmentForm.strengths}
              onChangeText={(text) => setAssessmentForm(prev => ({ ...prev, strengths: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.assessmentEditCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[styles.assessmentEditHeader, { backgroundColor: isDark ? colors.amber[700] + '20' : colors.amber[50] }]}>
              <Activity size={18} color={isDark ? colors.amber[500] : colors.amber[600]} />
              <Text style={[styles.assessmentEditLabel, { color: isDark ? colors.amber[500] : colors.amber[700] }]}>Areas to Improve</Text>
            </View>
            <TextInput
              style={[styles.assessmentTextArea, { color: t.text }]}
              placeholder="Enter areas to improve..."
              placeholderTextColor={t.textFaint}
              value={assessmentForm.weaknesses}
              onChangeText={(text) => setAssessmentForm(prev => ({ ...prev, weaknesses: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.assessmentEditCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[styles.assessmentEditHeader, { backgroundColor: isDark ? colors.purple[700] + '20' : colors.indigo[50] }]}>
              <FileText size={18} color={isDark ? colors.purple[400] : colors.indigo[600]} />
              <Text style={[styles.assessmentEditLabel, { color: isDark ? colors.purple[400] : colors.indigo[700] }]}>Training Plan</Text>
            </View>
            <TextInput
              style={[styles.assessmentTextArea, { color: t.text }]}
              placeholder="Enter training plan..."
              placeholderTextColor={t.textFaint}
              value={assessmentForm.overall_plan}
              onChangeText={(text) => setAssessmentForm(prev => ({ ...prev, overall_plan: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.assessmentEditCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[styles.assessmentEditHeader, { backgroundColor: isDark ? colors.error[700] + '20' : colors.error[50] }]}>
              <Heart size={18} color={isDark ? colors.error[400] : colors.error[600]} />
              <Text style={[styles.assessmentEditLabel, { color: isDark ? colors.error[400] : colors.error[700] }]}>Injuries / Notes</Text>
            </View>
            <TextInput
              style={[styles.assessmentTextArea, { color: t.text }]}
              placeholder="Enter injury notes..."
              placeholderTextColor={t.textFaint}
              value={assessmentForm.injuries}
              onChangeText={(text) => setAssessmentForm(prev => ({ ...prev, injuries: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, savingAssessment && styles.saveButtonDisabled]}
            onPress={saveAssessment}
            disabled={savingAssessment}
          >
            {savingAssessment ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save Assessment</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // View Mode
        <View style={styles.assessmentViewCards}>
          {assessmentForm.strengths || assessmentForm.weaknesses || assessmentForm.overall_plan || assessmentForm.injuries ? (
            <>
              {assessmentForm.strengths && (
                <View style={[styles.assessmentViewCard, { backgroundColor: t.surface, borderColor: t.border, borderLeftColor: isDark ? colors.emerald[400] : colors.emerald[500] }]}>
                  <View style={styles.assessmentViewHeader}>
                    <Zap size={16} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
                    <Text style={[styles.assessmentViewLabel, { color: isDark ? colors.emerald[400] : colors.emerald[700] }]}>Strengths</Text>
                  </View>
                  <Text style={[styles.assessmentViewText, { color: t.textSecondary }]}>{assessmentForm.strengths}</Text>
                </View>
              )}

              {assessmentForm.weaknesses && (
                <View style={[styles.assessmentViewCard, { backgroundColor: t.surface, borderColor: t.border, borderLeftColor: isDark ? colors.amber[500] : colors.amber[500] }]}>
                  <View style={styles.assessmentViewHeader}>
                    <Activity size={16} color={isDark ? colors.amber[500] : colors.amber[600]} />
                    <Text style={[styles.assessmentViewLabel, { color: isDark ? colors.amber[500] : colors.amber[700] }]}>Areas to Improve</Text>
                  </View>
                  <Text style={[styles.assessmentViewText, { color: t.textSecondary }]}>{assessmentForm.weaknesses}</Text>
                </View>
              )}

              {assessmentForm.overall_plan && (
                <View style={[styles.assessmentViewCard, { backgroundColor: t.surface, borderColor: t.border, borderLeftColor: isDark ? colors.purple[400] : colors.indigo[500] }]}>
                  <View style={styles.assessmentViewHeader}>
                    <FileText size={16} color={isDark ? colors.purple[400] : colors.indigo[600]} />
                    <Text style={[styles.assessmentViewLabel, { color: isDark ? colors.purple[400] : colors.indigo[700] }]}>Training Plan</Text>
                  </View>
                  <Text style={[styles.assessmentViewText, { color: t.textSecondary }]}>{assessmentForm.overall_plan}</Text>
                </View>
              )}

              {assessmentForm.injuries && (
                <View style={[styles.assessmentViewCard, { backgroundColor: t.surface, borderColor: t.border, borderLeftColor: isDark ? colors.error[400] : colors.error[500] }]}>
                  <View style={styles.assessmentViewHeader}>
                    <Heart size={16} color={isDark ? colors.error[400] : colors.error[600]} />
                    <Text style={[styles.assessmentViewLabel, { color: isDark ? colors.error[400] : colors.error[700] }]}>Injuries / Notes</Text>
                  </View>
                  <Text style={[styles.assessmentViewText, { color: t.textSecondary }]}>{assessmentForm.injuries}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={sharedStyles.emptyContainer}>
              <FileText size={48} color={t.textFaint} />
              <Text style={[sharedStyles.emptyTitle, { color: t.text }]}>No Assessment Yet</Text>
              <Text style={[sharedStyles.emptyTextCenter, { color: t.textMuted }]}>
                {canEditData ? 'Tap the edit button to add an assessment' : 'No assessment has been added by coaches yet'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  assessmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editToggleBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  assessmentEditForm: {
    gap: 16,
  },
  assessmentEditCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  assessmentEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  assessmentEditLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  assessmentTextArea: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.slate[900],
    minHeight: 100,
    textAlignVertical: 'top',
  },
  assessmentViewCards: {
    gap: 12,
  },
  assessmentViewCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  assessmentViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  assessmentViewLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  assessmentViewText: {
    fontSize: 14,
    color: colors.slate[700],
    lineHeight: 20,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
