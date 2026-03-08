import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Target,
  BarChart3,
  Phone,
  Mail,
  TrendingUp,
  UserCheck,
  Clock,
  AlertTriangle,
  Edit2,
  X,
  Music,
  Upload,
  Download,
  Play,
  Square,
  Check,
  Trash2,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { sharedStyles } from './sharedStyles';
import type {
  GymnastProfile,
  SkillSummary,
  RecentScore,
  AttendanceStats,
  AttendanceRecord,
  AssignmentStats,
  Assignment,
  Guardian,
} from './types';

interface GuardianFormData {
  guardian_1: { name: string; relationship: string; phone: string; email: string };
  guardian_2: { name: string; relationship: string; phone: string; email: string };
}

interface EmergencyFormData {
  emergency_contact_1: { name: string; relationship: string; phone: string };
  emergency_contact_2: { name: string; relationship: string; phone: string };
}

interface MedicalFormData {
  allergies: string;
  medications: string;
  conditions: string;
  notes: string;
}

interface ProfileFormData {
  date_of_birth: string;
  level: string;
  schedule_group: string;
  tshirt_size: string;
  leo_size: string;
}

interface OfflineStore {
  isDownloaded: (id: string, url: string) => boolean;
  getLocalUri: (id: string, url: string) => string | null;
  activeDownloads: Record<string, { progress: number } | undefined>;
  downloadFile: (id: string, url: string, name: string) => void;
  removeFile: (id: string) => void;
}

interface Props {
  gymnast: GymnastProfile;
  skillSummary: SkillSummary[];
  recentScores: RecentScore[];
  // Attendance
  canViewAttendance: boolean;
  attendanceStats: AttendanceStats;
  attendanceRecords: AttendanceRecord[];
  // Assignments
  canViewAssignments: boolean;
  assignmentStats: AssignmentStats;
  assignments: Assignment[];
  // Music
  playingMusic: boolean;
  uploadingMusic: boolean;
  onPlayMusic: () => void;
  onStopMusic: () => void;
  onUploadMusic: () => void;
  onRemoveMusic: () => void;
  onDownloadMusic: () => void;
  canEditData: boolean;
  offlineStore: OfflineStore;
  // Editing
  canViewMedical: boolean;
  canEditSection: (section: string) => boolean;
  editingSection: string | null;
  setEditingSection: (section: string | null) => void;
  // Forms
  profileForm: ProfileFormData;
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  guardianForm: GuardianFormData;
  setGuardianForm: React.Dispatch<React.SetStateAction<GuardianFormData>>;
  emergencyForm: EmergencyFormData;
  setEmergencyForm: React.Dispatch<React.SetStateAction<EmergencyFormData>>;
  medicalForm: MedicalFormData;
  setMedicalForm: React.Dispatch<React.SetStateAction<MedicalFormData>>;
  savingProfile: boolean;
  saveBasicInfo: () => void;
  saveGuardians: () => void;
  saveEmergencyContacts: () => void;
  saveMedicalInfo: () => void;
  cancelSectionEdit: (section: string) => void;
  getGuardianName: (guardian: Guardian | null) => string | null;
}

export function OverviewTab({
  gymnast,
  skillSummary,
  recentScores,
  canViewAttendance,
  attendanceStats,
  attendanceRecords,
  canViewAssignments,
  assignmentStats,
  assignments,
  playingMusic,
  uploadingMusic,
  onPlayMusic,
  onStopMusic,
  onUploadMusic,
  onRemoveMusic,
  onDownloadMusic,
  canEditData,
  offlineStore,
  canViewMedical,
  canEditSection,
  editingSection,
  setEditingSection,
  profileForm,
  setProfileForm,
  guardianForm,
  setGuardianForm,
  emergencyForm,
  setEmergencyForm,
  medicalForm,
  setMedicalForm,
  savingProfile,
  saveBasicInfo,
  saveGuardians,
  saveEmergencyContacts,
  saveMedicalInfo,
  cancelSectionEdit,
  getGuardianName,
}: Props) {
  const { isDark, t } = useTheme();

  return (
    <>
      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Target size={20} color={t.primary} />
          <Text style={[styles.statValue, { color: t.text }]}>
            {skillSummary.reduce((sum, s) => sum + s.compete_ready, 0)}
          </Text>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>Skills Ready</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <BarChart3 size={20} color={colors.amber[600]} />
          <Text style={[styles.statValue, { color: t.text }]}>{recentScores.length}</Text>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>Recent Scores</Text>
        </View>
      </View>

      {/* Attendance Summary - if visible */}
      {canViewAttendance && attendanceRecords.length > 0 && (
        <View style={sharedStyles.section}>
          <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Attendance (6 Months)</Text>
          <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.attendanceSummaryRow}>
              <View style={styles.attendanceSummaryItem}>
                <TrendingUp size={16} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
                <Text style={[styles.attendanceSummaryValue, { color: isDark ? colors.emerald[400] : colors.emerald[600] }]}>
                  {attendanceStats.percentage}%
                </Text>
                <Text style={[styles.attendanceSummaryLabel, { color: t.textMuted }]}>Rate</Text>
              </View>
              <View style={styles.attendanceSummaryItem}>
                <UserCheck size={16} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
                <Text style={[styles.attendanceSummaryValue, { color: t.text }]}>{attendanceStats.present}</Text>
                <Text style={[styles.attendanceSummaryLabel, { color: t.textMuted }]}>Present</Text>
              </View>
              <View style={styles.attendanceSummaryItem}>
                <Clock size={16} color={isDark ? colors.amber[500] : colors.amber[600]} />
                <Text style={[styles.attendanceSummaryValue, { color: t.text }]}>{attendanceStats.late}</Text>
                <Text style={[styles.attendanceSummaryLabel, { color: t.textMuted }]}>Late</Text>
              </View>
              <View style={styles.attendanceSummaryItem}>
                <AlertTriangle size={16} color={isDark ? colors.error[400] : colors.error[600]} />
                <Text style={[styles.attendanceSummaryValue, { color: t.text }]}>{attendanceStats.absent}</Text>
                <Text style={[styles.attendanceSummaryLabel, { color: t.textMuted }]}>Absent</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Assignment Summary - if visible */}
      {canViewAssignments && assignments.length > 0 && (
        <View style={sharedStyles.section}>
          <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Assignments (30 Days)</Text>
          <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.assignmentSummaryRow}>
              <View style={styles.assignmentSummaryItem}>
                <Text style={[styles.assignmentSummaryValue, { color: t.primary }]}>
                  {assignmentStats.completionRate}%
                </Text>
                <Text style={[styles.assignmentSummaryLabel, { color: t.textMuted }]}>Completion</Text>
              </View>
              <View style={styles.assignmentSummaryItem}>
                <Text style={[styles.assignmentSummaryValue, { color: t.text }]}>{assignmentStats.totalCompleted}</Text>
                <Text style={[styles.assignmentSummaryLabel, { color: t.textMuted }]}>Completed</Text>
              </View>
              <View style={styles.assignmentSummaryItem}>
                <Text style={[styles.assignmentSummaryValue, { color: t.text }]}>{assignmentStats.totalExercises}</Text>
                <Text style={[styles.assignmentSummaryLabel, { color: t.textMuted }]}>Total</Text>
              </View>
            </View>
            <View style={[sharedStyles.progressBar, { backgroundColor: isDark ? colors.slate[600] : colors.slate[100] }]}>
              <View
                style={[
                  sharedStyles.progressFill,
                  { width: `${assignmentStats.completionRate}%`, backgroundColor: t.primary },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* Floor Music */}
      <View style={sharedStyles.section}>
        <View style={sharedStyles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Music size={18} color={isDark ? colors.purple[400] : colors.purple[600]} />
            <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Floor Music</Text>
          </View>
          {canEditData && !gymnast.floor_music_url && (
            <TouchableOpacity
              style={[styles.floorMusicUploadBtn, { backgroundColor: t.primary }]}
              onPress={onUploadMusic}
              disabled={uploadingMusic}
            >
              {uploadingMusic ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Upload size={14} color={colors.white} />
                  <Text style={styles.floorMusicUploadBtnText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          {gymnast.floor_music_url ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text style={[styles.floorMusicName, { flex: 1, marginBottom: 0, color: t.textSecondary }]} numberOfLines={1}>
                  {gymnast.floor_music_name || 'Floor Music'}
                </Text>
                {offlineStore.isDownloaded(gymnast.id, gymnast.floor_music_url) && (
                  <View style={styles.offlineBadge}>
                    <Check size={12} color={colors.success[600]} />
                    <Text style={styles.offlineBadgeText}>Offline</Text>
                  </View>
                )}
              </View>
              <View style={styles.floorMusicControls}>
                <TouchableOpacity
                  style={[styles.floorMusicBtn, { backgroundColor: `${t.primary}15` }]}
                  onPress={playingMusic ? onStopMusic : onPlayMusic}
                >
                  {playingMusic ? (
                    <Square size={16} color={t.primary} />
                  ) : (
                    <Play size={16} color={t.primary} />
                  )}
                  <Text style={[styles.floorMusicBtnText, { color: t.primary }]}>
                    {playingMusic ? 'Stop' : 'Play'}
                  </Text>
                </TouchableOpacity>
                {offlineStore.activeDownloads[gymnast.id] ? (
                  <View style={[styles.floorMusicBtn, { backgroundColor: `${t.primary}15` }]}>
                    <ActivityIndicator size="small" color={t.primary} />
                    <Text style={[styles.floorMusicBtnText, { color: t.primary }]}>
                      {Math.round((offlineStore.activeDownloads[gymnast.id]?.progress || 0) * 100)}%
                    </Text>
                  </View>
                ) : offlineStore.isDownloaded(gymnast.id, gymnast.floor_music_url) ? (
                  <TouchableOpacity
                    style={[styles.floorMusicBtn, { backgroundColor: isDark ? colors.success[700] + '20' : colors.success[50] }]}
                    onPress={() => {
                      Alert.alert(
                        'Remove Offline Copy',
                        'Remove the downloaded copy? You can re-download it later.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => offlineStore.removeFile(gymnast.id) },
                        ]
                      );
                    }}
                  >
                    <Check size={16} color={isDark ? colors.success[500] : colors.success[600]} />
                    <Text style={[styles.floorMusicBtnText, { color: isDark ? colors.success[500] : colors.success[600] }]}>Saved</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.floorMusicBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
                    onPress={() => offlineStore.downloadFile(gymnast.id, gymnast.floor_music_url!, gymnast.floor_music_name || 'floor-music')}
                  >
                    <Download size={16} color={t.textSecondary} />
                    <Text style={[styles.floorMusicBtnText, { color: t.textSecondary }]}>Save</Text>
                  </TouchableOpacity>
                )}
                {canEditData && (
                  <TouchableOpacity
                    style={[styles.floorMusicBtn, { backgroundColor: isDark ? colors.error[700] + '20' : colors.error[50] }]}
                    onPress={onRemoveMusic}
                  >
                    <Trash2 size={16} color={isDark ? colors.error[400] : colors.error[600]} />
                  </TouchableOpacity>
                )}
              </View>
              {canEditData && (
                <TouchableOpacity
                  style={styles.floorMusicReplaceBtn}
                  onPress={onUploadMusic}
                  disabled={uploadingMusic}
                >
                  {uploadingMusic ? (
                    <ActivityIndicator size="small" color={t.primary} />
                  ) : (
                    <Text style={[styles.floorMusicReplaceBtnText, { color: t.primary }]}>Replace file</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.floorMusicEmpty}>
              <Music size={32} color={t.textFaint} />
              <Text style={[styles.floorMusicEmptyText, { color: t.textMuted }]}>No floor music uploaded</Text>
            </View>
          )}
        </View>
      </View>

      {/* Guardian Info - Staff or own gymnast */}
      {canViewMedical && (
        <View style={sharedStyles.section}>
          <View style={sharedStyles.sectionHeader}>
            <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Guardian Information</Text>
            {canEditData && (
              <TouchableOpacity
                style={[sharedStyles.sectionEditBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
                onPress={() => setEditingSection(editingSection === 'guardians' ? null : 'guardians')}
              >
                {editingSection === 'guardians' ? (
                  <X size={16} color={t.textMuted} />
                ) : (
                  <Edit2 size={16} color={t.textMuted} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {editingSection === 'guardians' ? (
            <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[sharedStyles.editFormSubtitle, { color: t.textSecondary }]}>Guardian 1</Text>
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Name"
                placeholderTextColor={t.textFaint}
                value={guardianForm.guardian_1.name}
                onChangeText={(text) => setGuardianForm(prev => ({
                  ...prev,
                  guardian_1: { ...prev.guardian_1, name: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Relationship (e.g., Mother)"
                placeholderTextColor={t.textFaint}
                value={guardianForm.guardian_1.relationship}
                onChangeText={(text) => setGuardianForm(prev => ({
                  ...prev,
                  guardian_1: { ...prev.guardian_1, relationship: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Phone"
                placeholderTextColor={t.textFaint}
                keyboardType="phone-pad"
                value={guardianForm.guardian_1.phone}
                onChangeText={(text) => setGuardianForm(prev => ({
                  ...prev,
                  guardian_1: { ...prev.guardian_1, phone: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Email"
                placeholderTextColor={t.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                value={guardianForm.guardian_1.email}
                onChangeText={(text) => setGuardianForm(prev => ({
                  ...prev,
                  guardian_1: { ...prev.guardian_1, email: text }
                }))}
              />

              <Text style={[sharedStyles.editFormSubtitle, { marginTop: 16, color: t.textSecondary }]}>Guardian 2</Text>
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Name"
                placeholderTextColor={t.textFaint}
                value={guardianForm.guardian_2.name}
                onChangeText={(text) => setGuardianForm(prev => ({
                  ...prev,
                  guardian_2: { ...prev.guardian_2, name: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Relationship"
                placeholderTextColor={t.textFaint}
                value={guardianForm.guardian_2.relationship}
                onChangeText={(text) => setGuardianForm(prev => ({
                  ...prev,
                  guardian_2: { ...prev.guardian_2, relationship: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Phone"
                placeholderTextColor={t.textFaint}
                keyboardType="phone-pad"
                value={guardianForm.guardian_2.phone}
                onChangeText={(text) => setGuardianForm(prev => ({
                  ...prev,
                  guardian_2: { ...prev.guardian_2, phone: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Email"
                placeholderTextColor={t.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                value={guardianForm.guardian_2.email}
                onChangeText={(text) => setGuardianForm(prev => ({
                  ...prev,
                  guardian_2: { ...prev.guardian_2, email: text }
                }))}
              />

              <View style={sharedStyles.editFormButtons}>
                <TouchableOpacity
                  style={[sharedStyles.editCancelBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
                  onPress={() => cancelSectionEdit('guardians')}
                >
                  <Text style={[sharedStyles.editCancelText, { color: t.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sharedStyles.editSaveBtn, { backgroundColor: t.primary }, savingProfile && { backgroundColor: isDark ? colors.slate[600] : colors.slate[300] }]}
                  onPress={saveGuardians}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={sharedStyles.editSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (getGuardianName(gymnast.guardian_1) || getGuardianName(gymnast.guardian_2)) ? (
            <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              {getGuardianName(gymnast.guardian_1) && (
                <View style={styles.guardianItem}>
                  <Text style={[styles.guardianName, { color: t.text }]}>
                    {getGuardianName(gymnast.guardian_1)}
                    {gymnast.guardian_1?.relationship && (
                      <Text style={[styles.guardianRelation, { color: t.textMuted }]}> ({gymnast.guardian_1.relationship})</Text>
                    )}
                  </Text>
                  {gymnast.guardian_1?.phone && (
                    <View style={styles.contactRow}>
                      <Phone size={14} color={t.textFaint} />
                      <Text style={[styles.contactText, { color: t.textSecondary }]}>{gymnast.guardian_1.phone}</Text>
                    </View>
                  )}
                  {gymnast.guardian_1?.email && (
                    <View style={styles.contactRow}>
                      <Mail size={14} color={t.textFaint} />
                      <Text style={[styles.contactText, { color: t.textSecondary }]}>{gymnast.guardian_1.email}</Text>
                    </View>
                  )}
                </View>
              )}
              {getGuardianName(gymnast.guardian_2) && (
                <View style={[styles.guardianItem, { marginTop: 16 }]}>
                  <Text style={[styles.guardianName, { color: t.text }]}>
                    {getGuardianName(gymnast.guardian_2)}
                    {gymnast.guardian_2?.relationship && (
                      <Text style={[styles.guardianRelation, { color: t.textMuted }]}> ({gymnast.guardian_2.relationship})</Text>
                    )}
                  </Text>
                  {gymnast.guardian_2?.phone && (
                    <View style={styles.contactRow}>
                      <Phone size={14} color={t.textFaint} />
                      <Text style={[styles.contactText, { color: t.textSecondary }]}>{gymnast.guardian_2.phone}</Text>
                    </View>
                  )}
                  {gymnast.guardian_2?.email && (
                    <View style={styles.contactRow}>
                      <Mail size={14} color={t.textFaint} />
                      <Text style={[styles.contactText, { color: t.textSecondary }]}>{gymnast.guardian_2.email}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : canEditData && (
            <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[sharedStyles.emptyFieldText, { color: t.textFaint }]}>No guardian info added. Tap edit to add.</Text>
            </View>
          )}
        </View>
      )}

      {/* Emergency Contacts - Staff or own gymnast */}
      {canViewMedical && (
        <View style={sharedStyles.section}>
          <View style={sharedStyles.sectionHeader}>
            <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Emergency Contacts</Text>
            {canEditSection('emergency') && (
              <TouchableOpacity
                style={[sharedStyles.sectionEditBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
                onPress={() => setEditingSection(editingSection === 'emergency' ? null : 'emergency')}
              >
                {editingSection === 'emergency' ? (
                  <X size={16} color={t.textMuted} />
                ) : (
                  <Edit2 size={16} color={t.textMuted} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {editingSection === 'emergency' ? (
            <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[sharedStyles.editFormSubtitle, { color: t.textSecondary }]}>Emergency Contact 1</Text>
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Name"
                placeholderTextColor={t.textFaint}
                value={emergencyForm.emergency_contact_1.name}
                onChangeText={(text) => setEmergencyForm(prev => ({
                  ...prev,
                  emergency_contact_1: { ...prev.emergency_contact_1, name: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Relationship"
                placeholderTextColor={t.textFaint}
                value={emergencyForm.emergency_contact_1.relationship}
                onChangeText={(text) => setEmergencyForm(prev => ({
                  ...prev,
                  emergency_contact_1: { ...prev.emergency_contact_1, relationship: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Phone"
                placeholderTextColor={t.textFaint}
                keyboardType="phone-pad"
                value={emergencyForm.emergency_contact_1.phone}
                onChangeText={(text) => setEmergencyForm(prev => ({
                  ...prev,
                  emergency_contact_1: { ...prev.emergency_contact_1, phone: text }
                }))}
              />

              <Text style={[sharedStyles.editFormSubtitle, { marginTop: 16, color: t.textSecondary }]}>Emergency Contact 2</Text>
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Name"
                placeholderTextColor={t.textFaint}
                value={emergencyForm.emergency_contact_2.name}
                onChangeText={(text) => setEmergencyForm(prev => ({
                  ...prev,
                  emergency_contact_2: { ...prev.emergency_contact_2, name: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Relationship"
                placeholderTextColor={t.textFaint}
                value={emergencyForm.emergency_contact_2.relationship}
                onChangeText={(text) => setEmergencyForm(prev => ({
                  ...prev,
                  emergency_contact_2: { ...prev.emergency_contact_2, relationship: text }
                }))}
              />
              <TextInput
                style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Phone"
                placeholderTextColor={t.textFaint}
                keyboardType="phone-pad"
                value={emergencyForm.emergency_contact_2.phone}
                onChangeText={(text) => setEmergencyForm(prev => ({
                  ...prev,
                  emergency_contact_2: { ...prev.emergency_contact_2, phone: text }
                }))}
              />

              <View style={sharedStyles.editFormButtons}>
                <TouchableOpacity
                  style={[sharedStyles.editCancelBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
                  onPress={() => cancelSectionEdit('emergency')}
                >
                  <Text style={[sharedStyles.editCancelText, { color: t.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sharedStyles.editSaveBtn, { backgroundColor: t.primary }, savingProfile && { backgroundColor: isDark ? colors.slate[600] : colors.slate[300] }]}
                  onPress={saveEmergencyContacts}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={sharedStyles.editSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (gymnast.emergency_contact_1?.name || gymnast.emergency_contact_2?.name) ? (
            <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              {gymnast.emergency_contact_1?.name && (
                <View style={styles.guardianItem}>
                  <Text style={[styles.guardianName, { color: t.text }]}>
                    {gymnast.emergency_contact_1.name}
                    {gymnast.emergency_contact_1.relationship && (
                      <Text style={[styles.guardianRelation, { color: t.textMuted }]}> ({gymnast.emergency_contact_1.relationship})</Text>
                    )}
                  </Text>
                  {gymnast.emergency_contact_1.phone && (
                    <View style={styles.contactRow}>
                      <Phone size={14} color={t.textFaint} />
                      <Text style={[styles.contactText, { color: t.textSecondary }]}>{gymnast.emergency_contact_1.phone}</Text>
                    </View>
                  )}
                </View>
              )}
              {gymnast.emergency_contact_2?.name && (
                <View style={[styles.guardianItem, { marginTop: 16 }]}>
                  <Text style={[styles.guardianName, { color: t.text }]}>
                    {gymnast.emergency_contact_2.name}
                    {gymnast.emergency_contact_2.relationship && (
                      <Text style={[styles.guardianRelation, { color: t.textMuted }]}> ({gymnast.emergency_contact_2.relationship})</Text>
                    )}
                  </Text>
                  {gymnast.emergency_contact_2.phone && (
                    <View style={styles.contactRow}>
                      <Phone size={14} color={t.textFaint} />
                      <Text style={[styles.contactText, { color: t.textSecondary }]}>{gymnast.emergency_contact_2.phone}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : canEditSection('emergency') && (
            <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[sharedStyles.emptyFieldText, { color: t.textFaint }]}>No emergency contacts added. Tap edit to add.</Text>
            </View>
          )}
        </View>
      )}

      {/* Medical Info - Staff or own gymnast */}
      {canViewMedical && (
        <View style={sharedStyles.section}>
          <View style={sharedStyles.sectionHeader}>
            <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Medical Information</Text>
            {canEditSection('medical') && (
              <TouchableOpacity
                style={[sharedStyles.sectionEditBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
                onPress={() => setEditingSection(editingSection === 'medical' ? null : 'medical')}
              >
                {editingSection === 'medical' ? (
                  <X size={16} color={t.textMuted} />
                ) : (
                  <Edit2 size={16} color={t.textMuted} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {editingSection === 'medical' ? (
            <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[sharedStyles.editFormSubtitle, { color: t.textSecondary }]}>Allergies</Text>
              <TextInput
                style={[sharedStyles.profileInput, sharedStyles.profileTextArea, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="List any allergies"
                placeholderTextColor={t.textFaint}
                value={medicalForm.allergies}
                onChangeText={(text) => setMedicalForm(prev => ({ ...prev, allergies: text }))}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <Text style={[sharedStyles.editFormSubtitle, { marginTop: 12, color: t.textSecondary }]}>Medications</Text>
              <TextInput
                style={[sharedStyles.profileInput, sharedStyles.profileTextArea, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="List any medications"
                placeholderTextColor={t.textFaint}
                value={medicalForm.medications}
                onChangeText={(text) => setMedicalForm(prev => ({ ...prev, medications: text }))}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <Text style={[sharedStyles.editFormSubtitle, { marginTop: 12, color: t.textSecondary }]}>Conditions</Text>
              <TextInput
                style={[sharedStyles.profileInput, sharedStyles.profileTextArea, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="List any medical conditions"
                placeholderTextColor={t.textFaint}
                value={medicalForm.conditions}
                onChangeText={(text) => setMedicalForm(prev => ({ ...prev, conditions: text }))}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <Text style={[sharedStyles.editFormSubtitle, { marginTop: 12, color: t.textSecondary }]}>Notes</Text>
              <TextInput
                style={[sharedStyles.profileInput, sharedStyles.profileTextArea, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                placeholder="Additional notes"
                placeholderTextColor={t.textFaint}
                value={medicalForm.notes}
                onChangeText={(text) => setMedicalForm(prev => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <View style={sharedStyles.editFormButtons}>
                <TouchableOpacity
                  style={[sharedStyles.editCancelBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
                  onPress={() => cancelSectionEdit('medical')}
                >
                  <Text style={[sharedStyles.editCancelText, { color: t.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sharedStyles.editSaveBtn, { backgroundColor: t.primary }, savingProfile && { backgroundColor: isDark ? colors.slate[600] : colors.slate[300] }]}
                  onPress={saveMedicalInfo}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={sharedStyles.editSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : gymnast.medical_info && (gymnast.medical_info.allergies || gymnast.medical_info.medications || gymnast.medical_info.conditions) ? (
            <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              {gymnast.medical_info.allergies && (
                <View style={styles.medicalItem}>
                  <Text style={[styles.medicalLabel, { color: t.textMuted }]}>Allergies</Text>
                  <Text style={[styles.medicalValue, { color: t.textSecondary }]}>{gymnast.medical_info.allergies}</Text>
                </View>
              )}
              {gymnast.medical_info.medications && (
                <View style={styles.medicalItem}>
                  <Text style={[styles.medicalLabel, { color: t.textMuted }]}>Medications</Text>
                  <Text style={[styles.medicalValue, { color: t.textSecondary }]}>{gymnast.medical_info.medications}</Text>
                </View>
              )}
              {gymnast.medical_info.conditions && (
                <View style={styles.medicalItem}>
                  <Text style={[styles.medicalLabel, { color: t.textMuted }]}>Conditions</Text>
                  <Text style={[styles.medicalValue, { color: t.textSecondary }]}>{gymnast.medical_info.conditions}</Text>
                </View>
              )}
            </View>
          ) : canEditSection('medical') && (
            <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[sharedStyles.emptyFieldText, { color: t.textFaint }]}>No medical info added. Tap edit to add.</Text>
            </View>
          )}
        </View>
      )}

      {/* Basic Info Edit Form */}
      {editingSection === 'basic' && canEditData && (
        <View style={sharedStyles.section}>
          <View style={sharedStyles.sectionHeader}>
            <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Basic Information</Text>
          </View>
          <View style={[sharedStyles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[sharedStyles.editFormSubtitle, { color: t.textSecondary }]}>Date of Birth</Text>
            <TextInput
              style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={t.textFaint}
              value={profileForm.date_of_birth}
              onChangeText={(text) => setProfileForm(prev => ({ ...prev, date_of_birth: text }))}
            />

            <Text style={[sharedStyles.editFormSubtitle, { marginTop: 12, color: t.textSecondary }]}>Level</Text>
            <TextInput
              style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
              placeholder="Level"
              placeholderTextColor={t.textFaint}
              value={profileForm.level}
              onChangeText={(text) => setProfileForm(prev => ({ ...prev, level: text }))}
            />

            <Text style={[sharedStyles.editFormSubtitle, { marginTop: 12, color: t.textSecondary }]}>Schedule Group</Text>
            <TextInput
              style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
              placeholder="Schedule Group"
              placeholderTextColor={t.textFaint}
              value={profileForm.schedule_group}
              onChangeText={(text) => setProfileForm(prev => ({ ...prev, schedule_group: text }))}
            />

            <Text style={[sharedStyles.editFormSubtitle, { marginTop: 12, color: t.textSecondary }]}>T-Shirt Size</Text>
            <TextInput
              style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
              placeholder="T-Shirt Size"
              placeholderTextColor={t.textFaint}
              value={profileForm.tshirt_size}
              onChangeText={(text) => setProfileForm(prev => ({ ...prev, tshirt_size: text }))}
            />

            <Text style={[sharedStyles.editFormSubtitle, { marginTop: 12, color: t.textSecondary }]}>Leo Size</Text>
            <TextInput
              style={[sharedStyles.profileInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
              placeholder="Leo Size"
              placeholderTextColor={t.textFaint}
              value={profileForm.leo_size}
              onChangeText={(text) => setProfileForm(prev => ({ ...prev, leo_size: text }))}
            />

            <View style={sharedStyles.editFormButtons}>
              <TouchableOpacity
                style={[sharedStyles.editCancelBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}
                onPress={() => cancelSectionEdit('basic')}
              >
                <Text style={[sharedStyles.editCancelText, { color: t.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[sharedStyles.editSaveBtn, { backgroundColor: t.primary }, savingProfile && { backgroundColor: isDark ? colors.slate[600] : colors.slate[300] }]}
                onPress={saveBasicInfo}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={sharedStyles.editSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.slate[900],
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 4,
  },
  guardianItem: {},
  guardianName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 8,
  },
  guardianRelation: {
    fontWeight: '400',
    color: colors.slate[500],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  contactText: {
    fontSize: 14,
    color: colors.slate[600],
  },
  medicalItem: {
    marginBottom: 12,
  },
  medicalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[500],
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  medicalValue: {
    fontSize: 14,
    color: colors.slate[700],
  },
  // Floor Music
  floorMusicUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brand[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  floorMusicUploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  floorMusicName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 12,
  },
  floorMusicControls: {
    flexDirection: 'row',
    gap: 8,
  },
  floorMusicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  floorMusicBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  floorMusicReplaceBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  floorMusicReplaceBtnText: {
    fontSize: 13,
    color: colors.brand[600],
    fontWeight: '500',
  },
  floorMusicEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  floorMusicEmptyText: {
    fontSize: 14,
    color: colors.slate[400],
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  offlineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success[600],
  },
  // Attendance Summary (Overview)
  attendanceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attendanceSummaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  attendanceSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
  },
  attendanceSummaryLabel: {
    fontSize: 11,
    color: colors.slate[500],
  },
  // Assignment Summary (Overview)
  assignmentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  assignmentSummaryItem: {
    alignItems: 'center',
  },
  assignmentSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.slate[900],
  },
  assignmentSummaryLabel: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
});
