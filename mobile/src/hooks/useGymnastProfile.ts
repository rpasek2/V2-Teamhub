import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { format, differenceInYears, subMonths, startOfMonth, endOfMonth, subDays, isAfter } from 'date-fns';
import { supabase } from '../services/supabase';
import { useHubStore } from '../stores/hubStore';
import { useOfflineMusicStore } from '../stores/offlineMusicStore';
import { useMusicPlayerStore } from '../stores/musicPlayerStore';
import {
  parseLocalDate,
  PARENT_EDITABLE_SECTIONS,
  ASSIGNMENT_EVENTS,
  DEFAULT_WAG_EVENTS,
  DEFAULT_MAG_EVENTS,
  SKILL_STATUS_ORDER,
  ALLOWED_AUDIO_EXTENSIONS,
} from '../components/gymnast/constants';
import type {
  GymnastProfile,
  Guardian,
  RecentScore,
  SkillSummary,
  DetailedSkill,
  AttendanceRecord,
  Assignment,
  Goal,
  Subgoal,
  Assessment,
  AttendanceStats,
  MonthlyTrend,
  AssignmentStats,
  Tab,
} from '../components/gymnast/types';

export function useGymnastProfile(gymnastId: string) {
  const [gymnast, setGymnast] = useState<GymnastProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [recentScores, setRecentScores] = useState<RecentScore[]>([]);
  const [skillSummary, setSkillSummary] = useState<SkillSummary[]>([]);
  const [detailedSkills, setDetailedSkills] = useState<DetailedSkill[]>([]);
  const [expandedSkillEvents, setExpandedSkillEvents] = useState<Set<string>>(new Set());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  // Goals modal state
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', event: '', target_date: '' });
  const [savingGoal, setSavingGoal] = useState(false);

  // Subgoal state
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [newSubgoalTitle, setNewSubgoalTitle] = useState<Record<string, string>>({});

  // Assessment edit state
  const [editingAssessment, setEditingAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({ strengths: '', weaknesses: '', overall_plan: '', injuries: '' });
  const [savingAssessment, setSavingAssessment] = useState(false);

  // Season picker & attendance filter
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Profile editing state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ date_of_birth: '', level: '', schedule_group: '', tshirt_size: '', leo_size: '' });
  const [guardianForm, setGuardianForm] = useState({
    guardian_1: { name: '', relationship: '', phone: '', email: '' },
    guardian_2: { name: '', relationship: '', phone: '', email: '' },
  });
  const [emergencyForm, setEmergencyForm] = useState({
    emergency_contact_1: { name: '', relationship: '', phone: '' },
    emergency_contact_2: { name: '', relationship: '', phone: '' },
  });
  const [medicalForm, setMedicalForm] = useState({ allergies: '', medications: '', conditions: '', notes: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Floor music state
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const playerStore = useMusicPlayerStore();
  const playingMusic = useMemo(() => playerStore.track?.gymnastId === gymnast?.id && (playerStore.isPlaying || !!playerStore.track), [playerStore.track, playerStore.isPlaying, gymnast?.id]);

  const currentHub = useHubStore((state) => state.currentHub);
  const linkedGymnasts = useHubStore((state) => state.linkedGymnasts);
  const isStaff = useHubStore((state) => state.isStaff);
  const canEditData = useHubStore((state) => state.canEdit);
  const isParent = useHubStore((state) => state.isParent);
  const getPermissionScope = useHubStore((state) => state.getPermissionScope);
  const offlineStore = useOfflineMusicStore();

  useEffect(() => {
    if (currentHub?.id) offlineStore.initialize(currentHub.id);
  }, [currentHub?.id]);

  const EVENT_LABELS_MAP: Record<string, string> = { vault: 'VT', bars: 'UB', beam: 'BB', floor: 'FX', pommel: 'PH', rings: 'SR', pbars: 'PB', highbar: 'HB' };

  const getEventsForGender = (gender: string | null) => {
    const g = gender === 'Male' ? 'Male' : 'Female';
    const customEvents = currentHub?.settings?.skillEvents?.[g];
    if (customEvents && customEvents.length > 0) {
      return customEvents.map((e: string | { id: string }) => typeof e === 'string' ? e : e.id);
    }
    return g === 'Female' ? DEFAULT_WAG_EVENTS : DEFAULT_MAG_EVENTS;
  };

  // Permission checks
  const canAccess = useMemo(() => {
    if (isStaff()) return true;
    if (isParent()) return linkedGymnasts.some(g => g.id === gymnastId);
    return false;
  }, [isStaff, isParent, linkedGymnasts, gymnastId]);

  const canViewAttendance = useMemo(() => {
    const scope = getPermissionScope('attendance');
    if (scope === 'all') return true;
    if (scope === 'own' && isParent()) return linkedGymnasts.some(g => g.id === gymnastId);
    return false;
  }, [getPermissionScope, isParent, linkedGymnasts, gymnastId]);

  const canViewAssignments = useMemo(() => {
    const scope = getPermissionScope('assignments');
    if (scope === 'all') return true;
    if (scope === 'own') {
      if (isParent()) return linkedGymnasts.some(g => g.id === gymnastId);
      return true;
    }
    return false;
  }, [getPermissionScope, isParent, linkedGymnasts, gymnastId]);

  const canViewMedical = useMemo(() => {
    if (isStaff()) return true;
    if (isParent()) return linkedGymnasts.some(g => g.id === gymnastId);
    return false;
  }, [isStaff, isParent, linkedGymnasts, gymnastId]);

  const isOwnGymnastParent = useMemo(() => {
    return !isStaff() && isParent() && linkedGymnasts.some(g => g.id === gymnastId);
  }, [isStaff, isParent, linkedGymnasts, gymnastId]);

  const canEditSection = useCallback((section: string): boolean => {
    if (canEditData()) return true;
    if (isOwnGymnastParent && PARENT_EDITABLE_SECTIONS.includes(section)) return true;
    return false;
  }, [canEditData, isOwnGymnastParent]);

  const canUploadAvatar = useMemo(() => canEditData() || isOwnGymnastParent, [canEditData, isOwnGymnastParent]);

  const canAddGoals = useMemo(() => isStaff() || linkedGymnasts.some(g => g.id === gymnastId), [isStaff, linkedGymnasts, gymnastId]);

  // Helpers
  const getGuardianName = (guardian: Guardian | null) => {
    if (!guardian) return null;
    if (guardian.name) return guardian.name;
    if (guardian.first_name || guardian.last_name) return `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim();
    return null;
  };

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    try { return differenceInYears(new Date(), parseLocalDate(dob)); } catch { return null; }
  };

  // Data fetching
  const fetchGymnastData = async () => {
    if (!gymnastId || !currentHub) return;
    try {
      const { data: gymnastData, error: gymnastError } = await supabase
        .from('gymnast_profiles')
        .select('id, first_name, last_name, level, gender, date_of_birth, schedule_group, guardian_1, guardian_2, medical_info, emergency_contact_1, emergency_contact_2, member_id, tshirt_size, leo_size, avatar_url, floor_music_url, floor_music_name')
        .eq('id', gymnastId)
        .single();

      if (gymnastError) throw gymnastError;
      setGymnast(gymnastData);

      if (gymnastData) {
        setProfileForm({
          date_of_birth: gymnastData.date_of_birth || '',
          level: gymnastData.level || '',
          schedule_group: gymnastData.schedule_group || '',
          tshirt_size: gymnastData.tshirt_size || '',
          leo_size: gymnastData.leo_size || '',
        });
        setGuardianForm({
          guardian_1: { name: getGuardianName(gymnastData.guardian_1) || '', relationship: gymnastData.guardian_1?.relationship || '', phone: gymnastData.guardian_1?.phone || '', email: gymnastData.guardian_1?.email || '' },
          guardian_2: { name: getGuardianName(gymnastData.guardian_2) || '', relationship: gymnastData.guardian_2?.relationship || '', phone: gymnastData.guardian_2?.phone || '', email: gymnastData.guardian_2?.email || '' },
        });
        setEmergencyForm({
          emergency_contact_1: { name: gymnastData.emergency_contact_1?.name || '', relationship: gymnastData.emergency_contact_1?.relationship || '', phone: gymnastData.emergency_contact_1?.phone || '' },
          emergency_contact_2: { name: gymnastData.emergency_contact_2?.name || '', relationship: gymnastData.emergency_contact_2?.relationship || '', phone: gymnastData.emergency_contact_2?.phone || '' },
        });
        setMedicalForm({
          allergies: gymnastData.medical_info?.allergies || '',
          medications: gymnastData.medical_info?.medications || '',
          conditions: gymnastData.medical_info?.conditions || '',
          notes: gymnastData.medical_info?.notes || '',
        });
      }

      const events = getEventsForGender(gymnastData?.gender);
      const fetchStartDate = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
      const fetchEndDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const [scoresResult, skillsResult, attendanceResult, assignmentsResult, goalsResult, assessmentResult] = await Promise.all([
        supabase.from('competition_scores').select('id, event, score, competition_id, competitions(name, start_date, season_id)').eq('gymnast_profile_id', gymnastId).order('created_at', { ascending: false }),
        supabase.from('gymnast_skills').select('id, hub_event_skill_id, status, achieved_date, hub_event_skills!inner(id, skill_name, event, hub_id)').eq('gymnast_profile_id', gymnastId).eq('hub_event_skills.hub_id', currentHub.id),
        canViewAttendance ? supabase.from('attendance_records').select('id, attendance_date, status, check_in_time, check_out_time, notes').eq('hub_id', currentHub.id).eq('gymnast_profile_id', gymnastId).gte('attendance_date', fetchStartDate).lte('attendance_date', fetchEndDate).order('attendance_date', { ascending: false }) : Promise.resolve({ data: null }),
        canViewAssignments ? supabase.from('gymnast_assignments').select('id, date, vault, bars, beam, floor, strength, flexibility, conditioning, completed_items').eq('gymnast_profile_id', gymnastId).order('date', { ascending: false }).limit(50) : Promise.resolve({ data: null }),
        supabase.from('gymnast_goals').select('id, gymnast_profile_id, title, description, event, target_date, completed_at, created_by, created_at, subgoals:gymnast_subgoals(id, goal_id, title, target_date, completed_at)').eq('gymnast_profile_id', gymnastId).order('created_at', { ascending: false }),
        supabase.from('gymnast_assessments').select('id, gymnast_profile_id, strengths, weaknesses, overall_plan, injuries').eq('gymnast_profile_id', gymnastId).maybeSingle(),
      ]);

      if (scoresResult.data) {
        setRecentScores(scoresResult.data.map((s: Record<string, unknown>) => ({
          id: s.id as string, event: s.event as string, score: s.score as number, competition_id: s.competition_id as string,
          competition_name: (s.competitions as Record<string, unknown>)?.name as string || 'Unknown',
          competition_date: (s.competitions as Record<string, unknown>)?.start_date as string || '',
          season_id: (s.competitions as Record<string, unknown>)?.season_id as string || null,
        })));
      }

      if (skillsResult.data) {
        setSkillSummary(events.map((event: string) => {
          const eventSkills = skillsResult.data.filter((s: Record<string, unknown>) => (s.hub_event_skills as Record<string, unknown>)?.event === event);
          return {
            event, eventLabel: EVENT_LABELS_MAP[event] || event.toUpperCase(), total: eventSkills.length,
            compete_ready: eventSkills.filter((s: Record<string, unknown>) => s.status === 'achieved' || s.status === 'mastered').length,
          };
        }));
        setDetailedSkills(skillsResult.data.map((s: Record<string, unknown>) => ({
          id: s.id as string, hub_event_skill_id: s.hub_event_skill_id as string,
          event: (s.hub_event_skills as Record<string, unknown>)?.event as string || '',
          name: (s.hub_event_skills as Record<string, unknown>)?.skill_name as string || 'Unknown Skill',
          status: s.status as DetailedSkill['status'], achieved_date: s.achieved_date as string | null,
        })));
      }

      if (attendanceResult.data) setAttendanceRecords(attendanceResult.data);
      if (assignmentsResult.data) setAssignments(assignmentsResult.data);
      if (goalsResult.data) setGoals(goalsResult.data);
      if (assessmentResult.data) {
        setAssessment(assessmentResult.data);
        setAssessmentForm({ strengths: assessmentResult.data.strengths || '', weaknesses: assessmentResult.data.weaknesses || '', overall_plan: assessmentResult.data.overall_plan || '', injuries: assessmentResult.data.injuries || '' });
      }
    } catch (err) {
      console.error('Error fetching gymnast data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (gymnastId && canAccess) fetchGymnastData();
  }, [gymnastId, canAccess]);

  const handleRefresh = () => { setRefreshing(true); fetchGymnastData(); };

  // Computed values
  const attendanceStats: AttendanceStats = useMemo(() => {
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const leftEarly = attendanceRecords.filter(r => r.status === 'left_early').length;
    const total = attendanceRecords.length;
    const attended = present + late + leftEarly;
    return { present, late, absent, leftEarly, total, attended, percentage: total > 0 ? Math.round((attended / total) * 100) : 0 };
  }, [attendanceRecords]);

  const monthlyTrends: MonthlyTrend[] = useMemo(() => {
    const months: MonthlyTrend[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      const monthRecords = attendanceRecords.filter(r => r.attendance_date >= monthStart && r.attendance_date <= monthEnd);
      const attended = monthRecords.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'left_early').length;
      const total = monthRecords.length;
      months.push({ key: monthKey, label: format(monthDate, 'MMM yyyy'), present: attended, total, percentage: total > 0 ? Math.round((attended / total) * 100) : 0 });
    }
    return months;
  }, [attendanceRecords]);

  const filteredAttendanceRecords = useMemo(() => {
    if (!selectedMonth) return attendanceRecords;
    return attendanceRecords.filter(r => format(parseLocalDate(r.attendance_date), 'yyyy-MM') === selectedMonth);
  }, [attendanceRecords, selectedMonth]);

  const assignmentStats: AssignmentStats = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    const filtered = assignments.filter(a => { const date = parseLocalDate(a.date); return isAfter(date, cutoff) || format(date, 'yyyy-MM-dd') === format(cutoff, 'yyyy-MM-dd'); });
    let totalExercises = 0, totalCompleted = 0;
    filtered.forEach(assignment => {
      ASSIGNMENT_EVENTS.forEach(event => {
        const content = assignment[event as keyof Assignment] as string | undefined;
        if (!content || typeof content !== 'string') return;
        const exerciseCount = content.split('\n').filter(line => line.trim()).length;
        totalCompleted += Math.min((assignment.completed_items?.[event] || []).length, exerciseCount);
        totalExercises += exerciseCount;
      });
    });
    return { totalExercises, totalCompleted, completionRate: totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0, daysCount: filtered.length };
  }, [assignments]);

  // Goal CRUD
  const openAddGoalModal = () => { setEditingGoal(null); setGoalForm({ title: '', description: '', event: '', target_date: '' }); setGoalModalVisible(true); };
  const openEditGoalModal = (goal: Goal) => { setEditingGoal(goal); setGoalForm({ title: goal.title, description: goal.description || '', event: goal.event || '', target_date: goal.target_date || '' }); setGoalModalVisible(true); };

  const saveGoal = async () => {
    if (!goalForm.title.trim() || !gymnastId) return;
    setSavingGoal(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (editingGoal) {
        const { error } = await supabase.from('gymnast_goals').update({ title: goalForm.title.trim(), description: goalForm.description.trim() || null, event: goalForm.event || null, target_date: goalForm.target_date || null }).eq('id', editingGoal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('gymnast_goals').insert({ gymnast_profile_id: gymnastId, title: goalForm.title.trim(), description: goalForm.description.trim() || null, event: goalForm.event || null, target_date: goalForm.target_date || null, created_by: user?.id || null });
        if (error) throw error;
      }
      setGoalModalVisible(false);
      fetchGymnastData();
    } catch (err) { console.error('Error saving goal:', err); Alert.alert('Error', 'Failed to save goal'); }
    finally { setSavingGoal(false); }
  };

  const deleteGoal = (goalId: string) => {
    Alert.alert('Delete Goal', 'Are you sure you want to delete this goal? This will also delete all subgoals.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { const { error } = await supabase.from('gymnast_goals').delete().eq('id', goalId); if (error) throw error; fetchGymnastData(); }
        catch (err) { console.error('Error deleting goal:', err); Alert.alert('Error', 'Failed to delete goal'); }
      }},
    ]);
  };

  const toggleGoalComplete = async (goal: Goal) => {
    try { const { error } = await supabase.from('gymnast_goals').update({ completed_at: goal.completed_at ? null : new Date().toISOString() }).eq('id', goal.id); if (error) throw error; fetchGymnastData(); }
    catch (err) { console.error('Error updating goal:', err); }
  };

  const toggleGoalExpanded = (goalId: string) => { setExpandedGoals(prev => { const n = new Set(prev); if (n.has(goalId)) n.delete(goalId); else n.add(goalId); return n; }); };

  const addSubgoal = async (goalId: string) => {
    const title = newSubgoalTitle[goalId]?.trim();
    if (!title) return;
    try { const { error } = await supabase.from('gymnast_subgoals').insert({ goal_id: goalId, title }); if (error) throw error; setNewSubgoalTitle(prev => ({ ...prev, [goalId]: '' })); fetchGymnastData(); }
    catch (err) { console.error('Error adding subgoal:', err); }
  };

  const toggleSubgoalComplete = async (subgoal: Subgoal) => {
    try { const { error } = await supabase.from('gymnast_subgoals').update({ completed_at: subgoal.completed_at ? null : new Date().toISOString() }).eq('id', subgoal.id); if (error) throw error; fetchGymnastData(); }
    catch (err) { console.error('Error updating subgoal:', err); }
  };

  const deleteSubgoal = async (subgoalId: string) => {
    try { const { error } = await supabase.from('gymnast_subgoals').delete().eq('id', subgoalId); if (error) throw error; fetchGymnastData(); }
    catch (err) { console.error('Error deleting subgoal:', err); }
  };

  // Assessment
  const saveAssessment = async () => {
    if (!gymnastId) return;
    setSavingAssessment(true);
    try {
      const { error } = await supabase.from('gymnast_assessments').upsert({ gymnast_profile_id: gymnastId, strengths: assessmentForm.strengths.trim() || null, weaknesses: assessmentForm.weaknesses.trim() || null, overall_plan: assessmentForm.overall_plan.trim() || null, injuries: assessmentForm.injuries.trim() || null }, { onConflict: 'gymnast_profile_id' });
      if (error) throw error;
      setEditingAssessment(false);
      fetchGymnastData();
    } catch (err) { console.error('Error saving assessment:', err); Alert.alert('Error', 'Failed to save assessment'); }
    finally { setSavingAssessment(false); }
  };

  // Avatar upload
  const handleAvatarUpload = async () => {
    if (!gymnastId || !currentHub || !canUploadAvatar) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Please allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext = asset.fileName?.split('.').pop() || 'jpg';
      const fileName = `gymnasts/${currentHub.id}/${gymnastId}/avatar-${Date.now()}.${ext}`;
      const binaryString = atob(asset.base64!);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, bytes, { contentType: `image/${ext}`, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('gymnast_profiles').update({ avatar_url: `${publicUrl}?t=${Date.now()}` }).eq('id', gymnastId);
      if (updateError) throw updateError;
      fetchGymnastData();
    } catch (error) { console.error('Error uploading avatar:', error); Alert.alert('Error', 'Failed to upload photo. Please try again.'); }
    finally { setUploadingAvatar(false); }
  };

  // Profile section saves
  const saveBasicInfo = async () => {
    if (!gymnastId) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('gymnast_profiles').update({ date_of_birth: profileForm.date_of_birth || null, level: profileForm.level || null, schedule_group: profileForm.schedule_group || null, tshirt_size: profileForm.tshirt_size || null, leo_size: profileForm.leo_size || null }).eq('id', gymnastId);
      if (error) throw error;
      setEditingSection(null); fetchGymnastData();
    } catch (err) { console.error('Error saving basic info:', err); Alert.alert('Error', 'Failed to save basic info'); }
    finally { setSavingProfile(false); }
  };

  const saveGuardians = async () => {
    if (!gymnastId) return;
    setSavingProfile(true);
    try {
      const g1 = guardianForm.guardian_1.name ? { name: guardianForm.guardian_1.name.trim(), relationship: guardianForm.guardian_1.relationship.trim() || null, phone: guardianForm.guardian_1.phone.trim() || null, email: guardianForm.guardian_1.email.trim() || null } : null;
      const g2 = guardianForm.guardian_2.name ? { name: guardianForm.guardian_2.name.trim(), relationship: guardianForm.guardian_2.relationship.trim() || null, phone: guardianForm.guardian_2.phone.trim() || null, email: guardianForm.guardian_2.email.trim() || null } : null;
      const { error } = await supabase.from('gymnast_profiles').update({ guardian_1: g1, guardian_2: g2 }).eq('id', gymnastId);
      if (error) throw error;
      setEditingSection(null); fetchGymnastData();
    } catch (err) { console.error('Error saving guardians:', err); Alert.alert('Error', 'Failed to save guardian info'); }
    finally { setSavingProfile(false); }
  };

  const saveEmergencyContacts = async () => {
    if (!gymnastId) return;
    setSavingProfile(true);
    try {
      const ec1 = emergencyForm.emergency_contact_1.name ? { name: emergencyForm.emergency_contact_1.name.trim(), relationship: emergencyForm.emergency_contact_1.relationship.trim() || null, phone: emergencyForm.emergency_contact_1.phone.trim() || null } : null;
      const ec2 = emergencyForm.emergency_contact_2.name ? { name: emergencyForm.emergency_contact_2.name.trim(), relationship: emergencyForm.emergency_contact_2.relationship.trim() || null, phone: emergencyForm.emergency_contact_2.phone.trim() || null } : null;
      const { error } = await supabase.from('gymnast_profiles').update({ emergency_contact_1: ec1, emergency_contact_2: ec2 }).eq('id', gymnastId);
      if (error) throw error;
      setEditingSection(null); fetchGymnastData();
    } catch (err) { console.error('Error saving emergency contacts:', err); Alert.alert('Error', 'Failed to save emergency contacts'); }
    finally { setSavingProfile(false); }
  };

  const saveMedicalInfo = async () => {
    if (!gymnastId) return;
    setSavingProfile(true);
    try {
      const medicalInfo = { ...gymnast?.medical_info, allergies: medicalForm.allergies.trim() || null, medications: medicalForm.medications.trim() || null, conditions: medicalForm.conditions.trim() || null, notes: medicalForm.notes.trim() || null };
      const hasMedicalInfo = Object.values(medicalInfo).some(v => v);
      const { error } = await supabase.from('gymnast_profiles').update({ medical_info: hasMedicalInfo ? medicalInfo : null }).eq('id', gymnastId);
      if (error) throw error;
      setEditingSection(null); fetchGymnastData();
    } catch (err) { console.error('Error saving medical info:', err); Alert.alert('Error', 'Failed to save medical info'); }
    finally { setSavingProfile(false); }
  };

  const cancelSectionEdit = (section: string) => {
    setEditingSection(null);
    if (!gymnast) return;
    if (section === 'basic') setProfileForm({ date_of_birth: gymnast.date_of_birth || '', level: gymnast.level || '', schedule_group: gymnast.schedule_group || '', tshirt_size: gymnast.tshirt_size || '', leo_size: gymnast.leo_size || '' });
    else if (section === 'guardians') setGuardianForm({ guardian_1: { name: getGuardianName(gymnast.guardian_1) || '', relationship: gymnast.guardian_1?.relationship || '', phone: gymnast.guardian_1?.phone || '', email: gymnast.guardian_1?.email || '' }, guardian_2: { name: getGuardianName(gymnast.guardian_2) || '', relationship: gymnast.guardian_2?.relationship || '', phone: gymnast.guardian_2?.phone || '', email: gymnast.guardian_2?.email || '' } });
    else if (section === 'emergency') setEmergencyForm({ emergency_contact_1: { name: gymnast.emergency_contact_1?.name || '', relationship: gymnast.emergency_contact_1?.relationship || '', phone: gymnast.emergency_contact_1?.phone || '' }, emergency_contact_2: { name: gymnast.emergency_contact_2?.name || '', relationship: gymnast.emergency_contact_2?.relationship || '', phone: gymnast.emergency_contact_2?.phone || '' } });
    else if (section === 'medical') setMedicalForm({ allergies: gymnast.medical_info?.allergies || '', medications: gymnast.medical_info?.medications || '', conditions: gymnast.medical_info?.conditions || '', notes: gymnast.medical_info?.notes || '' });
  };

  // Floor music
  const handleFloorMusicUpload = async () => {
    if (!gymnast || !currentHub) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['audio/*'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      if (file.size && file.size > 20 * 1024 * 1024) { Alert.alert('Error', 'File size exceeds 20MB limit'); return; }
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_AUDIO_EXTENSIONS.includes(extension)) { Alert.alert('Error', `File type not allowed. Accepted: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`); return; }
      if (file.mimeType && !file.mimeType.startsWith('audio/')) { Alert.alert('Error', 'File must be an audio file'); return; }
      setUploadingMusic(true);
      if (gymnast.floor_music_url) {
        try { const oldPath = gymnast.floor_music_url.split('/floor-music/')[1]; if (oldPath) { const decoded = decodeURIComponent(oldPath); if (!decoded.includes('..') && decoded.split('/').length <= 3) await supabase.storage.from('floor-music').remove([decoded]); } } catch { /* ignore */ }
      }
      const fileExt = extension || 'mp3';
      const fileName = `${Crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${currentHub.id}/${gymnast.id}/${fileName}`;
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error: uploadError } = await supabase.storage.from('floor-music').upload(storagePath, arrayBuffer, { contentType: file.mimeType || 'audio/mpeg' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('floor-music').getPublicUrl(storagePath);
      const { error: updateError } = await supabase.from('gymnast_profiles').update({ floor_music_url: urlData.publicUrl, floor_music_name: file.name.replace(/[<>"'&]/g, '_').slice(0, 255) }).eq('id', gymnast.id);
      if (updateError) throw updateError;
      await fetchGymnastData();
    } catch (err) { console.error('Error uploading floor music:', err); Alert.alert('Error', 'Failed to upload floor music'); }
    finally { setUploadingMusic(false); }
  };

  const handleRemoveFloorMusic = async () => {
    if (!gymnast?.floor_music_url || !currentHub) return;
    Alert.alert('Remove Floor Music', 'Are you sure you want to remove this floor music?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          const pathMatch = gymnast.floor_music_url!.split('/floor-music/')[1];
          if (pathMatch) await supabase.storage.from('floor-music').remove([decodeURIComponent(pathMatch)]);
          const { error } = await supabase.from('gymnast_profiles').update({ floor_music_url: null, floor_music_name: null }).eq('id', gymnast.id);
          if (error) throw error;
          playerStore.stop();
          offlineStore.removeFile(gymnast.id);
          await fetchGymnastData();
        } catch (err) { console.error('Error removing floor music:', err); Alert.alert('Error', 'Failed to remove floor music'); }
      }},
    ]);
  };

  const playMusic = () => {
    if (!gymnast?.floor_music_url) return;
    const localUri = offlineStore.getLocalUri(gymnast.id, gymnast.floor_music_url);
    playerStore.play({ gymnastId: gymnast.id, gymnastName: `${gymnast.first_name} ${gymnast.last_name}`, fileName: gymnast.floor_music_name || 'Floor Music', uri: localUri || gymnast.floor_music_url });
  };

  const stopMusic = () => playerStore.stop();

  const handleDownloadMusic = () => { if (gymnast?.floor_music_url) { import('react-native').then(({ Linking }) => Linking.openURL(gymnast.floor_music_url!)); } };

  // Skills
  const cycleSkillStatus = async (skill: DetailedSkill) => {
    if (!canEditData()) return;
    const currentStatus = skill.status || 'none';
    const currentIndex = SKILL_STATUS_ORDER.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % SKILL_STATUS_ORDER.length;
    const newStatus = SKILL_STATUS_ORDER[nextIndex];
    try {
      const { error } = await supabase.from('gymnast_skills').update({ status: newStatus, achieved_date: newStatus !== 'none' ? new Date().toISOString() : null }).eq('id', skill.id);
      if (error) throw error;
      fetchGymnastData();
    } catch (err) { console.error('Error updating skill status:', err); Alert.alert('Error', 'Failed to update skill status'); }
  };

  const toggleSkillEventExpanded = (event: string) => { setExpandedSkillEvents(prev => { const n = new Set(prev); if (n.has(event)) n.delete(event); else n.add(event); return n; }); };

  return {
    // Core data
    gymnast, loading, refreshing, handleRefresh,
    activeTab, setActiveTab,
    currentHub, gymnastId,

    // Permissions
    canAccess, canViewAttendance, canViewAssignments, canViewMedical,
    isOwnGymnastParent, canEditSection, canUploadAvatar, canAddGoals,
    isStaff, canEditData,

    // Tab data
    recentScores, skillSummary, detailedSkills, attendanceRecords, assignments, goals, assessment,

    // Computed
    attendanceStats, monthlyTrends, filteredAttendanceRecords, assignmentStats,
    getAge, getGuardianName, getEventsForGender,

    // Avatar
    uploadingAvatar, handleAvatarUpload,

    // Profile editing
    editingSection, setEditingSection,
    profileForm, setProfileForm,
    guardianForm, setGuardianForm,
    emergencyForm, setEmergencyForm,
    medicalForm, setMedicalForm,
    savingProfile,
    saveBasicInfo, saveGuardians, saveEmergencyContacts, saveMedicalInfo, cancelSectionEdit,

    // Goals
    goalModalVisible, setGoalModalVisible,
    editingGoal, goalForm, setGoalForm, savingGoal,
    expandedGoals, newSubgoalTitle, setNewSubgoalTitle,
    openAddGoalModal, openEditGoalModal, saveGoal, deleteGoal,
    toggleGoalComplete, toggleGoalExpanded,
    addSubgoal, toggleSubgoalComplete, deleteSubgoal,

    // Assessment
    editingAssessment, setEditingAssessment,
    assessmentForm, setAssessmentForm, savingAssessment, saveAssessment,

    // Scores
    selectedSeasonId, setSelectedSeasonId,

    // Attendance
    selectedMonth, setSelectedMonth,

    // Skills
    expandedSkillEvents, cycleSkillStatus, toggleSkillEventExpanded,

    // Floor music
    uploadingMusic, playingMusic,
    handleFloorMusicUpload, handleRemoveFloorMusic, playMusic, stopMusic, handleDownloadMusic,
    offlineStore,
  };
}
