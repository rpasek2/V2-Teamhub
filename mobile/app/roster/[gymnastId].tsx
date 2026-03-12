import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { isTabEnabled } from '../../src/lib/permissions';
import { useGymnastProfile } from '../../src/hooks/useGymnastProfile';
import { GymnastProfileHeader } from '../../src/components/gymnast/GymnastProfileHeader';
import { GymnastTabBar } from '../../src/components/gymnast/GymnastTabBar';
import { OverviewTab } from '../../src/components/gymnast/OverviewTab';
import { GoalsTab } from '../../src/components/gymnast/GoalsTab';
import { GoalModal } from '../../src/components/gymnast/GoalModal';
import { AssessmentTab } from '../../src/components/gymnast/AssessmentTab';
import { SkillsTab } from '../../src/components/gymnast/SkillsTab';
import { ScoresTab } from '../../src/components/gymnast/ScoresTab';
import { AttendanceTab } from '../../src/components/gymnast/AttendanceTab';
import { AssignmentsTab } from '../../src/components/gymnast/AssignmentsTab';
import { ProgressReportsTab } from '../../src/components/gymnast/ProgressReportsTab';
import type { Tab } from '../../src/components/gymnast/types';

export default function GymnastProfileScreen() {
  const { t, isDark } = useTheme();
  const { gymnastId } = useLocalSearchParams<{ gymnastId: string }>();
  const router = useRouter();
  const hook = useGymnastProfile(gymnastId!);

  // Redirect if no access
  useEffect(() => {
    if (!hook.loading && !hook.canAccess) router.back();
  }, [hook.loading, hook.canAccess]);

  if (hook.loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (!hook.gymnast) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <Text style={[styles.errorText, { color: t.textMuted }]}>Gymnast not found</Text>
      </View>
    );
  }

  const age = hook.getAge(hook.gymnast.date_of_birth);

  // Build tabs based on permissions and hub settings
  const hubEnabledTabs = hook.currentHub?.settings?.enabledTabs;
  const availableTabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'goals', label: 'Goals' },
    { key: 'assessment', label: 'Assessment' },
  ];
  if (isTabEnabled('skills', hubEnabledTabs)) availableTabs.push({ key: 'skills', label: 'Skills' });
  if (isTabEnabled('scores', hubEnabledTabs)) availableTabs.push({ key: 'scores', label: 'Scores' });
  if (hook.canViewAttendance && isTabEnabled('attendance', hubEnabledTabs)) availableTabs.push({ key: 'attendance', label: 'Attendance' });
  if (hook.canViewAssignments && isTabEnabled('assignments', hubEnabledTabs)) availableTabs.push({ key: 'assignments', label: 'Assignments' });
  availableTabs.push({ key: 'progress_reports', label: 'Reports' });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: t.background }]}
      refreshControl={<RefreshControl refreshing={hook.refreshing} onRefresh={hook.handleRefresh} />}
    >
      <GymnastProfileHeader
        gymnast={hook.gymnast}
        age={age}
        canUploadAvatar={hook.canUploadAvatar}
        uploadingAvatar={hook.uploadingAvatar}
        onAvatarUpload={hook.handleAvatarUpload}
      />

      <GymnastTabBar
        tabs={availableTabs}
        activeTab={hook.activeTab}
        onTabChange={hook.setActiveTab}
      />

      <View style={styles.content}>
        {hook.activeTab === 'overview' && (
          <OverviewTab
            gymnast={hook.gymnast}
            skillSummary={hook.skillSummary}
            recentScores={hook.recentScores}
            canViewAttendance={hook.canViewAttendance}
            attendanceStats={hook.attendanceStats}
            attendanceRecords={hook.attendanceRecords}
            canViewAssignments={hook.canViewAssignments}
            assignmentStats={hook.assignmentStats}
            assignments={hook.assignments}
            playingMusic={hook.playingMusic}
            uploadingMusic={hook.uploadingMusic}
            onPlayMusic={hook.playMusic}
            onStopMusic={hook.stopMusic}
            onUploadMusic={hook.handleFloorMusicUpload}
            onRemoveMusic={hook.handleRemoveFloorMusic}
            onDownloadMusic={hook.handleDownloadMusic}
            canEditData={hook.canEditData()}
            offlineStore={hook.offlineStore}
            canViewMedical={hook.canViewMedical}
            canEditSection={hook.canEditSection}
            editingSection={hook.editingSection}
            setEditingSection={hook.setEditingSection}
            profileForm={hook.profileForm}
            setProfileForm={hook.setProfileForm}
            guardianForm={hook.guardianForm}
            setGuardianForm={hook.setGuardianForm}
            emergencyForm={hook.emergencyForm}
            setEmergencyForm={hook.setEmergencyForm}
            medicalForm={hook.medicalForm}
            setMedicalForm={hook.setMedicalForm}
            savingProfile={hook.savingProfile}
            saveBasicInfo={hook.saveBasicInfo}
            saveGuardians={hook.saveGuardians}
            saveEmergencyContacts={hook.saveEmergencyContacts}
            saveMedicalInfo={hook.saveMedicalInfo}
            cancelSectionEdit={hook.cancelSectionEdit}
            getGuardianName={hook.getGuardianName}
          />
        )}

        {hook.activeTab === 'goals' && (
          <GoalsTab
            goals={hook.goals}
            expandedGoals={hook.expandedGoals}
            newSubgoalTitle={hook.newSubgoalTitle}
            setNewSubgoalTitle={hook.setNewSubgoalTitle}
            canAddGoals={hook.canAddGoals}
            canEditData={hook.canEditData()}
            onAddGoal={hook.openAddGoalModal}
            onEditGoal={hook.openEditGoalModal}
            onDeleteGoal={hook.deleteGoal}
            onToggleGoalComplete={hook.toggleGoalComplete}
            onToggleGoalExpanded={hook.toggleGoalExpanded}
            onAddSubgoal={hook.addSubgoal}
            onToggleSubgoalComplete={hook.toggleSubgoalComplete}
            onDeleteSubgoal={hook.deleteSubgoal}
          />
        )}

        {hook.activeTab === 'assessment' && (
          <AssessmentTab
            assessment={hook.assessment}
            assessmentForm={hook.assessmentForm}
            setAssessmentForm={hook.setAssessmentForm}
            editingAssessment={hook.editingAssessment}
            setEditingAssessment={hook.setEditingAssessment}
            savingAssessment={hook.savingAssessment}
            saveAssessment={hook.saveAssessment}
            canEditData={hook.canEditData()}
          />
        )}

        {hook.activeTab === 'skills' && (
          <SkillsTab
            skillSummary={hook.skillSummary}
            detailedSkills={hook.detailedSkills}
            expandedSkillEvents={hook.expandedSkillEvents}
            canEditData={hook.canEditData()}
            isDark={isDark}
            onCycleStatus={hook.cycleSkillStatus}
            onToggleExpand={hook.toggleSkillEventExpanded}
          />
        )}

        {hook.activeTab === 'scores' && hook.currentHub && (
          <ScoresTab
            recentScores={hook.recentScores}
            selectedSeasonId={hook.selectedSeasonId}
            onSeasonChange={hook.setSelectedSeasonId}
            hubId={hook.currentHub.id}
          />
        )}

        {hook.activeTab === 'attendance' && hook.canViewAttendance && (
          <AttendanceTab
            attendanceStats={hook.attendanceStats}
            monthlyTrends={hook.monthlyTrends}
            filteredAttendanceRecords={hook.filteredAttendanceRecords}
            selectedMonth={hook.selectedMonth}
            onSelectedMonthChange={hook.setSelectedMonth}
            isDark={isDark}
          />
        )}

        {hook.activeTab === 'assignments' && hook.canViewAssignments && (
          <AssignmentsTab
            assignments={hook.assignments}
            assignmentStats={hook.assignmentStats}
            isDark={isDark}
          />
        )}

        {hook.activeTab === 'progress_reports' && hook.gymnastId && (
          <ProgressReportsTab gymnastProfileId={hook.gymnastId} />
        )}
      </View>

      <View style={{ height: 40 }} />

      <GoalModal
        visible={hook.goalModalVisible}
        editingGoal={hook.editingGoal}
        goalForm={hook.goalForm}
        setGoalForm={hook.setGoalForm}
        savingGoal={hook.savingGoal}
        onSave={hook.saveGoal}
        onClose={() => hook.setGoalModalVisible(false)}
        gender={hook.gymnast.gender}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
  },
  errorText: {
    fontSize: 16,
    color: colors.slate[500],
  },
  content: {
    padding: 16,
  },
});
