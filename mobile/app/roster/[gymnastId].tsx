import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Target,
  BarChart3,
  Phone,
  Mail,
  UserCheck,
  ClipboardList,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Plus,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  Heart,
  Zap,
} from 'lucide-react-native';
import { format, parseISO, differenceInYears, subMonths, startOfMonth, endOfMonth, subDays, isAfter } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { SeasonPicker } from '../../src/components/ui/SeasonPicker';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface Guardian {
  name?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  first_name?: string;
  last_name?: string;
}

interface MedicalInfo {
  allergies?: string;
  medications?: string;
  conditions?: string;
  notes?: string;
}

interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

interface GymnastProfile {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  gender: 'Male' | 'Female' | null;
  date_of_birth: string | null;
  schedule_group: string | null;
  guardian_1: Guardian | null;
  guardian_2: Guardian | null;
  medical_info: MedicalInfo | null;
  emergency_contact_1: EmergencyContact | null;
  emergency_contact_2: EmergencyContact | null;
  member_id: string | null;
  tshirt_size: string | null;
  leo_size: string | null;
}

interface RecentScore {
  id: string;
  event: string;
  score: number;
  competition_name: string;
  competition_date: string;
  season_id: string | null;
}

interface SkillSummary {
  event: string;
  total: number;
  compete_ready: number;
}

interface DetailedSkill {
  id: string;
  hub_event_skill_id: string;
  event: string;
  name: string;
  status: 'none' | 'achieved' | 'compete_ready' | 'mastered' | null;
  achieved_date: string | null;
}

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: 'present' | 'late' | 'absent' | 'left_early';
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
}

interface Assignment {
  id: string;
  date: string;
  vault?: string;
  bars?: string;
  beam?: string;
  floor?: string;
  strength?: string;
  flexibility?: string;
  conditioning?: string;
  completed_items?: Record<string, number[]>;
}

interface Subgoal {
  id: string;
  goal_id: string;
  title: string;
  target_date: string | null;
  completed_at: string | null;
}

interface Goal {
  id: string;
  gymnast_profile_id: string;
  title: string;
  description: string | null;
  event: string | null;
  target_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  subgoals: Subgoal[];
}

interface Assessment {
  id: string;
  gymnast_profile_id: string;
  strengths: string | null;
  weaknesses: string | null;
  overall_plan: string | null;
  injuries: string | null;
}

type Tab = 'overview' | 'goals' | 'assessment' | 'skills' | 'scores' | 'attendance' | 'assignments';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  present: { label: 'Present', color: colors.emerald[700], bgColor: colors.emerald[100] },
  late: { label: 'Late', color: colors.amber[700], bgColor: colors.amber[100] },
  left_early: { label: 'Left Early', color: colors.blue[700], bgColor: colors.blue[100] },
  absent: { label: 'Absent', color: colors.error[700], bgColor: colors.error[100] },
};

const ASSIGNMENT_EVENTS = ['vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'];

export default function GymnastProfileScreen() {
  const { gymnastId } = useLocalSearchParams<{ gymnastId: string }>();
  const router = useRouter();
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
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    event: '',
    target_date: '',
  });
  const [savingGoal, setSavingGoal] = useState(false);

  // Subgoal state
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [newSubgoalTitle, setNewSubgoalTitle] = useState<Record<string, string>>({});

  // Assessment edit state
  const [editingAssessment, setEditingAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    strengths: '',
    weaknesses: '',
    overall_plan: '',
    injuries: '',
  });
  const [savingAssessment, setSavingAssessment] = useState(false);

  // Season picker state for Scores tab
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Attendance month filter
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Profile editing state (staff only)
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    date_of_birth: '',
    level: '',
    schedule_group: '',
    tshirt_size: '',
    leo_size: '',
  });
  const [guardianForm, setGuardianForm] = useState({
    guardian_1: { name: '', relationship: '', phone: '', email: '' },
    guardian_2: { name: '', relationship: '', phone: '', email: '' },
  });
  const [emergencyForm, setEmergencyForm] = useState({
    emergency_contact_1: { name: '', relationship: '', phone: '' },
    emergency_contact_2: { name: '', relationship: '', phone: '' },
  });
  const [medicalForm, setMedicalForm] = useState({
    allergies: '',
    medications: '',
    conditions: '',
    notes: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const { currentHub, linkedGymnasts } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const isParent = useHubStore((state) => state.isParent);
  const getPermissionScope = useHubStore((state) => state.getPermissionScope);

  const WAG_EVENTS = ['vault', 'bars', 'beam', 'floor'];
  const MAG_EVENTS = ['floor', 'pommel', 'rings', 'vault', 'pbars', 'highbar'];

  // Check if user can access this gymnast
  const canAccess = useMemo(() => {
    if (isStaff()) return true;
    if (isParent()) {
      return linkedGymnasts.some(g => g.id === gymnastId);
    }
    return false;
  }, [isStaff, isParent, linkedGymnasts, gymnastId]);

  // Check permission scopes for each tab
  const canViewAttendance = useMemo(() => {
    const scope = getPermissionScope('attendance');
    if (scope === 'all') return true;
    if (scope === 'own' && isParent()) {
      return linkedGymnasts.some(g => g.id === gymnastId);
    }
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
    if (isParent()) {
      return linkedGymnasts.some(g => g.id === gymnastId);
    }
    return false;
  }, [isStaff, isParent, linkedGymnasts, gymnastId]);

  useEffect(() => {
    if (gymnastId && canAccess) {
      fetchGymnastData();
    } else if (!loading && !canAccess) {
      router.back();
    }
  }, [gymnastId, canAccess]);

  const fetchGymnastData = async () => {
    if (!gymnastId || !currentHub) return;

    try {
      // Fetch gymnast profile
      const { data: gymnastData, error: gymnastError } = await supabase
        .from('gymnast_profiles')
        .select('*')
        .eq('id', gymnastId)
        .single();

      if (gymnastError) throw gymnastError;
      setGymnast(gymnastData);

      // Initialize profile edit forms
      if (gymnastData) {
        setProfileForm({
          date_of_birth: gymnastData.date_of_birth || '',
          level: gymnastData.level || '',
          schedule_group: gymnastData.schedule_group || '',
          tshirt_size: gymnastData.tshirt_size || '',
          leo_size: gymnastData.leo_size || '',
        });
        setGuardianForm({
          guardian_1: {
            name: getGuardianName(gymnastData.guardian_1) || '',
            relationship: gymnastData.guardian_1?.relationship || '',
            phone: gymnastData.guardian_1?.phone || '',
            email: gymnastData.guardian_1?.email || '',
          },
          guardian_2: {
            name: getGuardianName(gymnastData.guardian_2) || '',
            relationship: gymnastData.guardian_2?.relationship || '',
            phone: gymnastData.guardian_2?.phone || '',
            email: gymnastData.guardian_2?.email || '',
          },
        });
        setEmergencyForm({
          emergency_contact_1: {
            name: gymnastData.emergency_contact_1?.name || '',
            relationship: gymnastData.emergency_contact_1?.relationship || '',
            phone: gymnastData.emergency_contact_1?.phone || '',
          },
          emergency_contact_2: {
            name: gymnastData.emergency_contact_2?.name || '',
            relationship: gymnastData.emergency_contact_2?.relationship || '',
            phone: gymnastData.emergency_contact_2?.phone || '',
          },
        });
        setMedicalForm({
          allergies: gymnastData.medical_info?.allergies || '',
          medications: gymnastData.medical_info?.medications || '',
          conditions: gymnastData.medical_info?.conditions || '',
          notes: gymnastData.medical_info?.notes || '',
        });
      }

      // Parallel fetch for other data
      const events = gymnastData?.gender === 'Female' ? WAG_EVENTS : MAG_EVENTS;
      const fetchStartDate = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
      const fetchEndDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const [scoresResult, skillsResult, attendanceResult, assignmentsResult, goalsResult, assessmentResult] = await Promise.all([
        // Recent scores
        supabase
          .from('competition_scores')
          .select(`
            id,
            event,
            score,
            competitions(name, start_date, season_id)
          `)
          .eq('gymnast_profile_id', gymnastId)
          .order('created_at', { ascending: false }),

        // Skills with hub_event_skill details
        supabase
          .from('gymnast_skills')
          .select('id, hub_event_skill_id, event, status, achieved_date, hub_event_skills(id, name, event)')
          .eq('gymnast_profile_id', gymnastId),

        // Attendance (last 6 months)
        canViewAttendance ? supabase
          .from('attendance_records')
          .select('*')
          .eq('hub_id', currentHub.id)
          .eq('gymnast_profile_id', gymnastId)
          .gte('attendance_date', fetchStartDate)
          .lte('attendance_date', fetchEndDate)
          .order('attendance_date', { ascending: false }) : Promise.resolve({ data: null }),

        // Assignments
        canViewAssignments ? supabase
          .from('gymnast_assignments')
          .select('id, date, vault, bars, beam, floor, strength, flexibility, conditioning, completed_items')
          .eq('gymnast_profile_id', gymnastId)
          .order('date', { ascending: false }) : Promise.resolve({ data: null }),

        // Goals with subgoals
        supabase
          .from('gymnast_goals')
          .select('*, subgoals:gymnast_subgoals(*)')
          .eq('gymnast_profile_id', gymnastId)
          .order('created_at', { ascending: false }),

        // Assessment
        supabase
          .from('gymnast_assessments')
          .select('*')
          .eq('gymnast_profile_id', gymnastId)
          .maybeSingle(),
      ]);

      // Process scores
      if (scoresResult.data) {
        const mapped = scoresResult.data.map((s: any) => ({
          id: s.id,
          event: s.event,
          score: s.score,
          competition_name: s.competitions?.name || 'Unknown',
          competition_date: s.competitions?.start_date || '',
          season_id: s.competitions?.season_id || null,
        }));
        setRecentScores(mapped);
      }

      // Process skills
      if (skillsResult.data) {
        const summary = events.map(event => {
          const eventSkills = skillsResult.data.filter((s: any) => s.event === event);
          return {
            event,
            total: eventSkills.length,
            compete_ready: eventSkills.filter((s: any) => s.status === 'compete_ready' || s.status === 'mastered').length,
          };
        });
        setSkillSummary(summary);

        // Set detailed skills for editing
        const detailed = skillsResult.data.map((s: any) => ({
          id: s.id,
          hub_event_skill_id: s.hub_event_skill_id,
          event: s.hub_event_skills?.event || s.event,
          name: s.hub_event_skills?.name || 'Unknown Skill',
          status: s.status,
          achieved_date: s.achieved_date,
        }));
        setDetailedSkills(detailed);
      }

      // Process attendance
      if (attendanceResult.data) {
        setAttendanceRecords(attendanceResult.data);
      }

      // Process assignments
      if (assignmentsResult.data) {
        setAssignments(assignmentsResult.data);
      }

      // Process goals
      if (goalsResult.data) {
        setGoals(goalsResult.data);
      }

      // Process assessment
      if (assessmentResult.data) {
        setAssessment(assessmentResult.data);
        setAssessmentForm({
          strengths: assessmentResult.data.strengths || '',
          weaknesses: assessmentResult.data.weaknesses || '',
          overall_plan: assessmentResult.data.overall_plan || '',
          injuries: assessmentResult.data.injuries || '',
        });
      }
    } catch (err) {
      console.error('Error fetching gymnast data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGymnastData();
  };

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    try {
      return differenceInYears(new Date(), parseISO(dob));
    } catch {
      return null;
    }
  };

  const getEventLabel = (event: string) => {
    const labels: Record<string, string> = {
      vault: 'VT',
      bars: 'UB',
      beam: 'BB',
      floor: 'FX',
      pommel: 'PH',
      rings: 'SR',
      pbars: 'PB',
      highbar: 'HB',
    };
    return labels[event] || event;
  };

  // Attendance stats
  const attendanceStats = useMemo(() => {
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const leftEarly = attendanceRecords.filter(r => r.status === 'left_early').length;
    const total = attendanceRecords.length;
    const attended = present + late + leftEarly;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

    return { present, late, absent, leftEarly, total, attended, percentage };
  }, [attendanceRecords]);

  // Monthly attendance trends (last 6 months)
  const monthlyTrends = useMemo(() => {
    const months: { key: string; label: string; present: number; total: number; percentage: number }[] = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const monthDate = subMonths(now, i);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM yyyy');
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

      const monthRecords = attendanceRecords.filter((r) => {
        const date = r.attendance_date;
        return date >= monthStart && date <= monthEnd;
      });

      const attended = monthRecords.filter(
        (r) => r.status === 'present' || r.status === 'late' || r.status === 'left_early'
      ).length;
      const total = monthRecords.length;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

      months.push({
        key: monthKey,
        label: monthLabel,
        present: attended,
        total,
        percentage,
      });
    }

    return months;
  }, [attendanceRecords]);

  // Filtered attendance records by selected month
  const filteredAttendanceRecords = useMemo(() => {
    if (!selectedMonth) return attendanceRecords;

    return attendanceRecords.filter((r) => {
      const recordMonth = format(parseISO(r.attendance_date), 'yyyy-MM');
      return recordMonth === selectedMonth;
    });
  }, [attendanceRecords, selectedMonth]);

  // Assignment stats (last 30 days)
  const assignmentStats = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    const filtered = assignments.filter(a => {
      const date = parseISO(a.date);
      return isAfter(date, cutoff) || format(date, 'yyyy-MM-dd') === format(cutoff, 'yyyy-MM-dd');
    });

    let totalExercises = 0;
    let totalCompleted = 0;

    filtered.forEach(assignment => {
      ASSIGNMENT_EVENTS.forEach(event => {
        const content = assignment[event as keyof Assignment] as string | undefined;
        if (!content || typeof content !== 'string') return;

        const exerciseCount = content.split('\n').filter(line => line.trim()).length;
        const completedCount = Math.min(
          (assignment.completed_items?.[event] || []).length,
          exerciseCount
        );

        totalExercises += exerciseCount;
        totalCompleted += completedCount;
      });
    });

    const completionRate = totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0;

    return { totalExercises, totalCompleted, completionRate, daysCount: filtered.length };
  }, [assignments]);

  // Get guardian display name
  const getGuardianName = (guardian: Guardian | null) => {
    if (!guardian) return null;
    if (guardian.name) return guardian.name;
    if (guardian.first_name || guardian.last_name) {
      return `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim();
    }
    return null;
  };

  // Goal CRUD functions
  const openAddGoalModal = () => {
    setEditingGoal(null);
    setGoalForm({ title: '', description: '', event: '', target_date: '' });
    setGoalModalVisible(true);
  };

  const openEditGoalModal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description || '',
      event: goal.event || '',
      target_date: goal.target_date || '',
    });
    setGoalModalVisible(true);
  };

  const saveGoal = async () => {
    if (!goalForm.title.trim() || !gymnastId) return;
    setSavingGoal(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (editingGoal) {
        // Update existing goal
        const { error } = await supabase
          .from('gymnast_goals')
          .update({
            title: goalForm.title.trim(),
            description: goalForm.description.trim() || null,
            event: goalForm.event || null,
            target_date: goalForm.target_date || null,
          })
          .eq('id', editingGoal.id);

        if (error) throw error;
      } else {
        // Create new goal
        const { error } = await supabase
          .from('gymnast_goals')
          .insert({
            gymnast_profile_id: gymnastId,
            title: goalForm.title.trim(),
            description: goalForm.description.trim() || null,
            event: goalForm.event || null,
            target_date: goalForm.target_date || null,
            created_by: user?.id || null,
          });

        if (error) throw error;
      }

      setGoalModalVisible(false);
      fetchGymnastData();
    } catch (err) {
      console.error('Error saving goal:', err);
      Alert.alert('Error', 'Failed to save goal');
    } finally {
      setSavingGoal(false);
    }
  };

  const deleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal? This will also delete all subgoals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('gymnast_goals')
                .delete()
                .eq('id', goalId);

              if (error) throw error;
              fetchGymnastData();
            } catch (err) {
              console.error('Error deleting goal:', err);
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const toggleGoalComplete = async (goal: Goal) => {
    try {
      const newCompletedAt = goal.completed_at ? null : new Date().toISOString();
      const { error } = await supabase
        .from('gymnast_goals')
        .update({ completed_at: newCompletedAt })
        .eq('id', goal.id);

      if (error) throw error;
      fetchGymnastData();
    } catch (err) {
      console.error('Error updating goal:', err);
    }
  };

  const toggleGoalExpanded = (goalId: string) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  // Subgoal functions
  const addSubgoal = async (goalId: string) => {
    const title = newSubgoalTitle[goalId]?.trim();
    if (!title) return;

    try {
      const { error } = await supabase
        .from('gymnast_subgoals')
        .insert({
          goal_id: goalId,
          title,
        });

      if (error) throw error;
      setNewSubgoalTitle(prev => ({ ...prev, [goalId]: '' }));
      fetchGymnastData();
    } catch (err) {
      console.error('Error adding subgoal:', err);
    }
  };

  const toggleSubgoalComplete = async (subgoal: Subgoal) => {
    try {
      const newCompletedAt = subgoal.completed_at ? null : new Date().toISOString();
      const { error } = await supabase
        .from('gymnast_subgoals')
        .update({ completed_at: newCompletedAt })
        .eq('id', subgoal.id);

      if (error) throw error;
      fetchGymnastData();
    } catch (err) {
      console.error('Error updating subgoal:', err);
    }
  };

  const deleteSubgoal = async (subgoalId: string) => {
    try {
      const { error } = await supabase
        .from('gymnast_subgoals')
        .delete()
        .eq('id', subgoalId);

      if (error) throw error;
      fetchGymnastData();
    } catch (err) {
      console.error('Error deleting subgoal:', err);
    }
  };

  // Assessment functions
  const saveAssessment = async () => {
    if (!gymnastId) return;
    setSavingAssessment(true);

    try {
      const { error } = await supabase
        .from('gymnast_assessments')
        .upsert({
          gymnast_profile_id: gymnastId,
          strengths: assessmentForm.strengths.trim() || null,
          weaknesses: assessmentForm.weaknesses.trim() || null,
          overall_plan: assessmentForm.overall_plan.trim() || null,
          injuries: assessmentForm.injuries.trim() || null,
        }, {
          onConflict: 'gymnast_profile_id',
        });

      if (error) throw error;
      setEditingAssessment(false);
      fetchGymnastData();
    } catch (err) {
      console.error('Error saving assessment:', err);
      Alert.alert('Error', 'Failed to save assessment');
    } finally {
      setSavingAssessment(false);
    }
  };

  // Profile section save functions
  const saveBasicInfo = async () => {
    if (!gymnastId) return;
    setSavingProfile(true);

    try {
      const { error } = await supabase
        .from('gymnast_profiles')
        .update({
          date_of_birth: profileForm.date_of_birth || null,
          level: profileForm.level || null,
          schedule_group: profileForm.schedule_group || null,
          tshirt_size: profileForm.tshirt_size || null,
          leo_size: profileForm.leo_size || null,
        })
        .eq('id', gymnastId);

      if (error) throw error;
      setEditingSection(null);
      fetchGymnastData();
    } catch (err) {
      console.error('Error saving basic info:', err);
      Alert.alert('Error', 'Failed to save basic info');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveGuardians = async () => {
    if (!gymnastId) return;
    setSavingProfile(true);

    try {
      const guardian1 = guardianForm.guardian_1.name
        ? {
            name: guardianForm.guardian_1.name.trim(),
            relationship: guardianForm.guardian_1.relationship.trim() || null,
            phone: guardianForm.guardian_1.phone.trim() || null,
            email: guardianForm.guardian_1.email.trim() || null,
          }
        : null;

      const guardian2 = guardianForm.guardian_2.name
        ? {
            name: guardianForm.guardian_2.name.trim(),
            relationship: guardianForm.guardian_2.relationship.trim() || null,
            phone: guardianForm.guardian_2.phone.trim() || null,
            email: guardianForm.guardian_2.email.trim() || null,
          }
        : null;

      const { error } = await supabase
        .from('gymnast_profiles')
        .update({
          guardian_1: guardian1,
          guardian_2: guardian2,
        })
        .eq('id', gymnastId);

      if (error) throw error;
      setEditingSection(null);
      fetchGymnastData();
    } catch (err) {
      console.error('Error saving guardians:', err);
      Alert.alert('Error', 'Failed to save guardian info');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveEmergencyContacts = async () => {
    if (!gymnastId) return;
    setSavingProfile(true);

    try {
      const ec1 = emergencyForm.emergency_contact_1.name
        ? {
            name: emergencyForm.emergency_contact_1.name.trim(),
            relationship: emergencyForm.emergency_contact_1.relationship.trim() || null,
            phone: emergencyForm.emergency_contact_1.phone.trim() || null,
          }
        : null;

      const ec2 = emergencyForm.emergency_contact_2.name
        ? {
            name: emergencyForm.emergency_contact_2.name.trim(),
            relationship: emergencyForm.emergency_contact_2.relationship.trim() || null,
            phone: emergencyForm.emergency_contact_2.phone.trim() || null,
          }
        : null;

      const { error } = await supabase
        .from('gymnast_profiles')
        .update({
          emergency_contact_1: ec1,
          emergency_contact_2: ec2,
        })
        .eq('id', gymnastId);

      if (error) throw error;
      setEditingSection(null);
      fetchGymnastData();
    } catch (err) {
      console.error('Error saving emergency contacts:', err);
      Alert.alert('Error', 'Failed to save emergency contacts');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveMedicalInfo = async () => {
    if (!gymnastId) return;
    setSavingProfile(true);

    try {
      const medicalInfo = {
        allergies: medicalForm.allergies.trim() || null,
        medications: medicalForm.medications.trim() || null,
        conditions: medicalForm.conditions.trim() || null,
        notes: medicalForm.notes.trim() || null,
      };

      // Only set if at least one field has a value
      const hasMedicalInfo = Object.values(medicalInfo).some((v) => v);

      const { error } = await supabase
        .from('gymnast_profiles')
        .update({
          medical_info: hasMedicalInfo ? medicalInfo : null,
        })
        .eq('id', gymnastId);

      if (error) throw error;
      setEditingSection(null);
      fetchGymnastData();
    } catch (err) {
      console.error('Error saving medical info:', err);
      Alert.alert('Error', 'Failed to save medical info');
    } finally {
      setSavingProfile(false);
    }
  };

  const cancelSectionEdit = (section: string) => {
    setEditingSection(null);
    // Reset form to current gymnast data
    if (gymnast) {
      if (section === 'basic') {
        setProfileForm({
          date_of_birth: gymnast.date_of_birth || '',
          level: gymnast.level || '',
          schedule_group: gymnast.schedule_group || '',
          tshirt_size: gymnast.tshirt_size || '',
          leo_size: gymnast.leo_size || '',
        });
      } else if (section === 'guardians') {
        setGuardianForm({
          guardian_1: {
            name: getGuardianName(gymnast.guardian_1) || '',
            relationship: gymnast.guardian_1?.relationship || '',
            phone: gymnast.guardian_1?.phone || '',
            email: gymnast.guardian_1?.email || '',
          },
          guardian_2: {
            name: getGuardianName(gymnast.guardian_2) || '',
            relationship: gymnast.guardian_2?.relationship || '',
            phone: gymnast.guardian_2?.phone || '',
            email: gymnast.guardian_2?.email || '',
          },
        });
      } else if (section === 'emergency') {
        setEmergencyForm({
          emergency_contact_1: {
            name: gymnast.emergency_contact_1?.name || '',
            relationship: gymnast.emergency_contact_1?.relationship || '',
            phone: gymnast.emergency_contact_1?.phone || '',
          },
          emergency_contact_2: {
            name: gymnast.emergency_contact_2?.name || '',
            relationship: gymnast.emergency_contact_2?.relationship || '',
            phone: gymnast.emergency_contact_2?.phone || '',
          },
        });
      } else if (section === 'medical') {
        setMedicalForm({
          allergies: gymnast.medical_info?.allergies || '',
          medications: gymnast.medical_info?.medications || '',
          conditions: gymnast.medical_info?.conditions || '',
          notes: gymnast.medical_info?.notes || '',
        });
      }
    }
  };

  // Skills editing functions
  const SKILL_STATUS_ORDER: (DetailedSkill['status'])[] = [null, 'achieved', 'compete_ready', 'mastered'];
  const SKILL_STATUS_LABELS: Record<string, string> = {
    'null': 'Not Started',
    'none': 'Not Started',
    'achieved': 'Achieved',
    'compete_ready': 'Compete Ready',
    'mastered': 'Mastered',
  };
  const SKILL_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    'null': { bg: colors.slate[100], text: colors.slate[500] },
    'none': { bg: colors.slate[100], text: colors.slate[500] },
    'achieved': { bg: colors.blue[100], text: colors.blue[700] },
    'compete_ready': { bg: colors.emerald[100], text: colors.emerald[700] },
    'mastered': { bg: colors.amber[100], text: colors.amber[700] },
  };

  const cycleSkillStatus = async (skill: DetailedSkill) => {
    if (!isStaff()) return;

    const currentIndex = SKILL_STATUS_ORDER.indexOf(skill.status);
    const nextIndex = (currentIndex + 1) % SKILL_STATUS_ORDER.length;
    const newStatus = SKILL_STATUS_ORDER[nextIndex];

    try {
      const achievedDate = newStatus && newStatus !== 'none' ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('gymnast_skills')
        .update({
          status: newStatus,
          achieved_date: achievedDate,
        })
        .eq('id', skill.id);

      if (error) throw error;
      fetchGymnastData();
    } catch (err) {
      console.error('Error updating skill status:', err);
      Alert.alert('Error', 'Failed to update skill status');
    }
  };

  const toggleSkillEventExpanded = (event: string) => {
    setExpandedSkillEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(event)) {
        newSet.delete(event);
      } else {
        newSet.add(event);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  if (!gymnast) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Gymnast not found</Text>
      </View>
    );
  }

  const age = getAge(gymnast.date_of_birth);

  // Build tabs based on permissions
  const availableTabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'goals', label: 'Goals' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'skills', label: 'Skills' },
    { key: 'scores', label: 'Scores' },
  ];
  if (canViewAttendance) {
    availableTabs.push({ key: 'attendance', label: 'Attendance' });
  }
  if (canViewAssignments) {
    availableTabs.push({ key: 'assignments', label: 'Assignments' });
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: gymnast.gender === 'Female' ? colors.pink[100] : colors.blue[100] },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: gymnast.gender === 'Female' ? colors.pink[600] : colors.blue[600] },
            ]}
          >
            {gymnast.first_name[0]}{gymnast.last_name[0]}
          </Text>
        </View>
        <Text style={styles.gymnastName}>
          {gymnast.first_name} {gymnast.last_name}
        </Text>
        <View style={styles.badgeRow}>
          {gymnast.level && <Badge label={gymnast.level} variant="primary" />}
          {age && <Badge label={`${age} years old`} variant="neutral" />}
          {gymnast.gender && <Badge label={gymnast.gender} variant="neutral" />}
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsContainer}
      >
        {availableTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && (
          <>
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Target size={20} color={colors.brand[600]} />
                <Text style={styles.statValue}>
                  {skillSummary.reduce((sum, s) => sum + s.compete_ready, 0)}
                </Text>
                <Text style={styles.statLabel}>Skills Ready</Text>
              </View>
              <View style={styles.statCard}>
                <BarChart3 size={20} color={colors.amber[600]} />
                <Text style={styles.statValue}>{recentScores.length}</Text>
                <Text style={styles.statLabel}>Recent Scores</Text>
              </View>
            </View>

            {/* Attendance Summary - if visible */}
            {canViewAttendance && attendanceRecords.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attendance (6 Months)</Text>
                <View style={styles.card}>
                  <View style={styles.attendanceSummaryRow}>
                    <View style={styles.attendanceSummaryItem}>
                      <TrendingUp size={16} color={colors.emerald[600]} />
                      <Text style={[styles.attendanceSummaryValue, { color: colors.emerald[600] }]}>
                        {attendanceStats.percentage}%
                      </Text>
                      <Text style={styles.attendanceSummaryLabel}>Rate</Text>
                    </View>
                    <View style={styles.attendanceSummaryItem}>
                      <UserCheck size={16} color={colors.emerald[600]} />
                      <Text style={styles.attendanceSummaryValue}>{attendanceStats.present}</Text>
                      <Text style={styles.attendanceSummaryLabel}>Present</Text>
                    </View>
                    <View style={styles.attendanceSummaryItem}>
                      <Clock size={16} color={colors.amber[600]} />
                      <Text style={styles.attendanceSummaryValue}>{attendanceStats.late}</Text>
                      <Text style={styles.attendanceSummaryLabel}>Late</Text>
                    </View>
                    <View style={styles.attendanceSummaryItem}>
                      <AlertTriangle size={16} color={colors.error[600]} />
                      <Text style={styles.attendanceSummaryValue}>{attendanceStats.absent}</Text>
                      <Text style={styles.attendanceSummaryLabel}>Absent</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Assignment Summary - if visible */}
            {canViewAssignments && assignments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Assignments (30 Days)</Text>
                <View style={styles.card}>
                  <View style={styles.assignmentSummaryRow}>
                    <View style={styles.assignmentSummaryItem}>
                      <Text style={[styles.assignmentSummaryValue, { color: colors.brand[600] }]}>
                        {assignmentStats.completionRate}%
                      </Text>
                      <Text style={styles.assignmentSummaryLabel}>Completion</Text>
                    </View>
                    <View style={styles.assignmentSummaryItem}>
                      <Text style={styles.assignmentSummaryValue}>{assignmentStats.totalCompleted}</Text>
                      <Text style={styles.assignmentSummaryLabel}>Completed</Text>
                    </View>
                    <View style={styles.assignmentSummaryItem}>
                      <Text style={styles.assignmentSummaryValue}>{assignmentStats.totalExercises}</Text>
                      <Text style={styles.assignmentSummaryLabel}>Total</Text>
                    </View>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${assignmentStats.completionRate}%`, backgroundColor: colors.brand[500] },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Guardian Info - Staff or own gymnast */}
            {canViewMedical && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Guardian Information</Text>
                  {isStaff() && (
                    <TouchableOpacity
                      style={styles.sectionEditBtn}
                      onPress={() => setEditingSection(editingSection === 'guardians' ? null : 'guardians')}
                    >
                      {editingSection === 'guardians' ? (
                        <X size={16} color={colors.slate[500]} />
                      ) : (
                        <Edit2 size={16} color={colors.slate[500]} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {editingSection === 'guardians' ? (
                  <View style={styles.card}>
                    <Text style={styles.editFormSubtitle}>Guardian 1</Text>
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Name"
                      placeholderTextColor={colors.slate[400]}
                      value={guardianForm.guardian_1.name}
                      onChangeText={(text) => setGuardianForm(prev => ({
                        ...prev,
                        guardian_1: { ...prev.guardian_1, name: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Relationship (e.g., Mother)"
                      placeholderTextColor={colors.slate[400]}
                      value={guardianForm.guardian_1.relationship}
                      onChangeText={(text) => setGuardianForm(prev => ({
                        ...prev,
                        guardian_1: { ...prev.guardian_1, relationship: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Phone"
                      placeholderTextColor={colors.slate[400]}
                      keyboardType="phone-pad"
                      value={guardianForm.guardian_1.phone}
                      onChangeText={(text) => setGuardianForm(prev => ({
                        ...prev,
                        guardian_1: { ...prev.guardian_1, phone: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Email"
                      placeholderTextColor={colors.slate[400]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={guardianForm.guardian_1.email}
                      onChangeText={(text) => setGuardianForm(prev => ({
                        ...prev,
                        guardian_1: { ...prev.guardian_1, email: text }
                      }))}
                    />

                    <Text style={[styles.editFormSubtitle, { marginTop: 16 }]}>Guardian 2</Text>
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Name"
                      placeholderTextColor={colors.slate[400]}
                      value={guardianForm.guardian_2.name}
                      onChangeText={(text) => setGuardianForm(prev => ({
                        ...prev,
                        guardian_2: { ...prev.guardian_2, name: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Relationship"
                      placeholderTextColor={colors.slate[400]}
                      value={guardianForm.guardian_2.relationship}
                      onChangeText={(text) => setGuardianForm(prev => ({
                        ...prev,
                        guardian_2: { ...prev.guardian_2, relationship: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Phone"
                      placeholderTextColor={colors.slate[400]}
                      keyboardType="phone-pad"
                      value={guardianForm.guardian_2.phone}
                      onChangeText={(text) => setGuardianForm(prev => ({
                        ...prev,
                        guardian_2: { ...prev.guardian_2, phone: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Email"
                      placeholderTextColor={colors.slate[400]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={guardianForm.guardian_2.email}
                      onChangeText={(text) => setGuardianForm(prev => ({
                        ...prev,
                        guardian_2: { ...prev.guardian_2, email: text }
                      }))}
                    />

                    <View style={styles.editFormButtons}>
                      <TouchableOpacity
                        style={styles.editCancelBtn}
                        onPress={() => cancelSectionEdit('guardians')}
                      >
                        <Text style={styles.editCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editSaveBtn, savingProfile && styles.editSaveBtnDisabled]}
                        onPress={saveGuardians}
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.editSaveText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (getGuardianName(gymnast.guardian_1) || getGuardianName(gymnast.guardian_2)) ? (
                  <View style={styles.card}>
                    {getGuardianName(gymnast.guardian_1) && (
                      <View style={styles.guardianItem}>
                        <Text style={styles.guardianName}>
                          {getGuardianName(gymnast.guardian_1)}
                          {gymnast.guardian_1?.relationship && (
                            <Text style={styles.guardianRelation}> ({gymnast.guardian_1.relationship})</Text>
                          )}
                        </Text>
                        {gymnast.guardian_1?.phone && (
                          <View style={styles.contactRow}>
                            <Phone size={14} color={colors.slate[400]} />
                            <Text style={styles.contactText}>{gymnast.guardian_1.phone}</Text>
                          </View>
                        )}
                        {gymnast.guardian_1?.email && (
                          <View style={styles.contactRow}>
                            <Mail size={14} color={colors.slate[400]} />
                            <Text style={styles.contactText}>{gymnast.guardian_1.email}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    {getGuardianName(gymnast.guardian_2) && (
                      <View style={[styles.guardianItem, { marginTop: 16 }]}>
                        <Text style={styles.guardianName}>
                          {getGuardianName(gymnast.guardian_2)}
                          {gymnast.guardian_2?.relationship && (
                            <Text style={styles.guardianRelation}> ({gymnast.guardian_2.relationship})</Text>
                          )}
                        </Text>
                        {gymnast.guardian_2?.phone && (
                          <View style={styles.contactRow}>
                            <Phone size={14} color={colors.slate[400]} />
                            <Text style={styles.contactText}>{gymnast.guardian_2.phone}</Text>
                          </View>
                        )}
                        {gymnast.guardian_2?.email && (
                          <View style={styles.contactRow}>
                            <Mail size={14} color={colors.slate[400]} />
                            <Text style={styles.contactText}>{gymnast.guardian_2.email}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ) : isStaff() && (
                  <View style={styles.card}>
                    <Text style={styles.emptyFieldText}>No guardian info added. Tap edit to add.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Emergency Contacts - Staff or own gymnast */}
            {canViewMedical && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Emergency Contacts</Text>
                  {isStaff() && (
                    <TouchableOpacity
                      style={styles.sectionEditBtn}
                      onPress={() => setEditingSection(editingSection === 'emergency' ? null : 'emergency')}
                    >
                      {editingSection === 'emergency' ? (
                        <X size={16} color={colors.slate[500]} />
                      ) : (
                        <Edit2 size={16} color={colors.slate[500]} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {editingSection === 'emergency' ? (
                  <View style={styles.card}>
                    <Text style={styles.editFormSubtitle}>Emergency Contact 1</Text>
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Name"
                      placeholderTextColor={colors.slate[400]}
                      value={emergencyForm.emergency_contact_1.name}
                      onChangeText={(text) => setEmergencyForm(prev => ({
                        ...prev,
                        emergency_contact_1: { ...prev.emergency_contact_1, name: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Relationship"
                      placeholderTextColor={colors.slate[400]}
                      value={emergencyForm.emergency_contact_1.relationship}
                      onChangeText={(text) => setEmergencyForm(prev => ({
                        ...prev,
                        emergency_contact_1: { ...prev.emergency_contact_1, relationship: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Phone"
                      placeholderTextColor={colors.slate[400]}
                      keyboardType="phone-pad"
                      value={emergencyForm.emergency_contact_1.phone}
                      onChangeText={(text) => setEmergencyForm(prev => ({
                        ...prev,
                        emergency_contact_1: { ...prev.emergency_contact_1, phone: text }
                      }))}
                    />

                    <Text style={[styles.editFormSubtitle, { marginTop: 16 }]}>Emergency Contact 2</Text>
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Name"
                      placeholderTextColor={colors.slate[400]}
                      value={emergencyForm.emergency_contact_2.name}
                      onChangeText={(text) => setEmergencyForm(prev => ({
                        ...prev,
                        emergency_contact_2: { ...prev.emergency_contact_2, name: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Relationship"
                      placeholderTextColor={colors.slate[400]}
                      value={emergencyForm.emergency_contact_2.relationship}
                      onChangeText={(text) => setEmergencyForm(prev => ({
                        ...prev,
                        emergency_contact_2: { ...prev.emergency_contact_2, relationship: text }
                      }))}
                    />
                    <TextInput
                      style={styles.profileInput}
                      placeholder="Phone"
                      placeholderTextColor={colors.slate[400]}
                      keyboardType="phone-pad"
                      value={emergencyForm.emergency_contact_2.phone}
                      onChangeText={(text) => setEmergencyForm(prev => ({
                        ...prev,
                        emergency_contact_2: { ...prev.emergency_contact_2, phone: text }
                      }))}
                    />

                    <View style={styles.editFormButtons}>
                      <TouchableOpacity
                        style={styles.editCancelBtn}
                        onPress={() => cancelSectionEdit('emergency')}
                      >
                        <Text style={styles.editCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editSaveBtn, savingProfile && styles.editSaveBtnDisabled]}
                        onPress={saveEmergencyContacts}
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.editSaveText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (gymnast.emergency_contact_1?.name || gymnast.emergency_contact_2?.name) ? (
                  <View style={styles.card}>
                    {gymnast.emergency_contact_1?.name && (
                      <View style={styles.guardianItem}>
                        <Text style={styles.guardianName}>
                          {gymnast.emergency_contact_1.name}
                          {gymnast.emergency_contact_1.relationship && (
                            <Text style={styles.guardianRelation}> ({gymnast.emergency_contact_1.relationship})</Text>
                          )}
                        </Text>
                        {gymnast.emergency_contact_1.phone && (
                          <View style={styles.contactRow}>
                            <Phone size={14} color={colors.slate[400]} />
                            <Text style={styles.contactText}>{gymnast.emergency_contact_1.phone}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    {gymnast.emergency_contact_2?.name && (
                      <View style={[styles.guardianItem, { marginTop: 16 }]}>
                        <Text style={styles.guardianName}>
                          {gymnast.emergency_contact_2.name}
                          {gymnast.emergency_contact_2.relationship && (
                            <Text style={styles.guardianRelation}> ({gymnast.emergency_contact_2.relationship})</Text>
                          )}
                        </Text>
                        {gymnast.emergency_contact_2.phone && (
                          <View style={styles.contactRow}>
                            <Phone size={14} color={colors.slate[400]} />
                            <Text style={styles.contactText}>{gymnast.emergency_contact_2.phone}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ) : isStaff() && (
                  <View style={styles.card}>
                    <Text style={styles.emptyFieldText}>No emergency contacts added. Tap edit to add.</Text>
                  </View>
                )}
              </View>
            )}

            {/* Medical Info - Staff or own gymnast */}
            {canViewMedical && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Medical Information</Text>
                  {isStaff() && (
                    <TouchableOpacity
                      style={styles.sectionEditBtn}
                      onPress={() => setEditingSection(editingSection === 'medical' ? null : 'medical')}
                    >
                      {editingSection === 'medical' ? (
                        <X size={16} color={colors.slate[500]} />
                      ) : (
                        <Edit2 size={16} color={colors.slate[500]} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {editingSection === 'medical' ? (
                  <View style={styles.card}>
                    <Text style={styles.editFormSubtitle}>Allergies</Text>
                    <TextInput
                      style={[styles.profileInput, styles.profileTextArea]}
                      placeholder="List any allergies"
                      placeholderTextColor={colors.slate[400]}
                      value={medicalForm.allergies}
                      onChangeText={(text) => setMedicalForm(prev => ({ ...prev, allergies: text }))}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />

                    <Text style={[styles.editFormSubtitle, { marginTop: 12 }]}>Medications</Text>
                    <TextInput
                      style={[styles.profileInput, styles.profileTextArea]}
                      placeholder="List any medications"
                      placeholderTextColor={colors.slate[400]}
                      value={medicalForm.medications}
                      onChangeText={(text) => setMedicalForm(prev => ({ ...prev, medications: text }))}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />

                    <Text style={[styles.editFormSubtitle, { marginTop: 12 }]}>Conditions</Text>
                    <TextInput
                      style={[styles.profileInput, styles.profileTextArea]}
                      placeholder="List any medical conditions"
                      placeholderTextColor={colors.slate[400]}
                      value={medicalForm.conditions}
                      onChangeText={(text) => setMedicalForm(prev => ({ ...prev, conditions: text }))}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />

                    <Text style={[styles.editFormSubtitle, { marginTop: 12 }]}>Notes</Text>
                    <TextInput
                      style={[styles.profileInput, styles.profileTextArea]}
                      placeholder="Additional notes"
                      placeholderTextColor={colors.slate[400]}
                      value={medicalForm.notes}
                      onChangeText={(text) => setMedicalForm(prev => ({ ...prev, notes: text }))}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />

                    <View style={styles.editFormButtons}>
                      <TouchableOpacity
                        style={styles.editCancelBtn}
                        onPress={() => cancelSectionEdit('medical')}
                      >
                        <Text style={styles.editCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editSaveBtn, savingProfile && styles.editSaveBtnDisabled]}
                        onPress={saveMedicalInfo}
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.editSaveText}>Save</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : gymnast.medical_info && (gymnast.medical_info.allergies || gymnast.medical_info.medications || gymnast.medical_info.conditions) ? (
                  <View style={styles.card}>
                    {gymnast.medical_info.allergies && (
                      <View style={styles.medicalItem}>
                        <Text style={styles.medicalLabel}>Allergies</Text>
                        <Text style={styles.medicalValue}>{gymnast.medical_info.allergies}</Text>
                      </View>
                    )}
                    {gymnast.medical_info.medications && (
                      <View style={styles.medicalItem}>
                        <Text style={styles.medicalLabel}>Medications</Text>
                        <Text style={styles.medicalValue}>{gymnast.medical_info.medications}</Text>
                      </View>
                    )}
                    {gymnast.medical_info.conditions && (
                      <View style={styles.medicalItem}>
                        <Text style={styles.medicalLabel}>Conditions</Text>
                        <Text style={styles.medicalValue}>{gymnast.medical_info.conditions}</Text>
                      </View>
                    )}
                  </View>
                ) : isStaff() && (
                  <View style={styles.card}>
                    <Text style={styles.emptyFieldText}>No medical info added. Tap edit to add.</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {activeTab === 'goals' && (
          <View style={styles.section}>
            {/* Add Goal Button - Staff or gymnast can add */}
            {(isStaff() || linkedGymnasts.some(g => g.id === gymnastId)) && (
              <TouchableOpacity style={styles.addButton} onPress={openAddGoalModal}>
                <Plus size={20} color={colors.white} />
                <Text style={styles.addButtonText}>Add Goal</Text>
              </TouchableOpacity>
            )}

            {goals.length > 0 ? (
              goals.map((goal) => {
                const isExpanded = expandedGoals.has(goal.id);
                const completedSubgoals = goal.subgoals?.filter(s => s.completed_at).length || 0;
                const totalSubgoals = goal.subgoals?.length || 0;
                const progress = totalSubgoals > 0 ? (completedSubgoals / totalSubgoals) * 100 : 0;

                return (
                  <View key={goal.id} style={styles.goalCard}>
                    <TouchableOpacity
                      style={styles.goalHeader}
                      onPress={() => toggleGoalExpanded(goal.id)}
                      activeOpacity={0.7}
                    >
                      <TouchableOpacity
                        style={[
                          styles.goalCheckbox,
                          goal.completed_at && styles.goalCheckboxChecked,
                        ]}
                        onPress={() => toggleGoalComplete(goal)}
                      >
                        {goal.completed_at && <CheckCircle size={16} color={colors.white} />}
                      </TouchableOpacity>
                      <View style={styles.goalContent}>
                        <View style={styles.goalTitleRow}>
                          <Text
                            style={[
                              styles.goalTitle,
                              goal.completed_at && styles.goalTitleCompleted,
                            ]}
                            numberOfLines={1}
                          >
                            {goal.title}
                          </Text>
                          {goal.event && (
                            <Badge label={getEventLabel(goal.event)} variant="neutral" size="sm" />
                          )}
                        </View>
                        {goal.target_date && (
                          <View style={styles.goalDateRow}>
                            <Calendar size={12} color={colors.slate[400]} />
                            <Text style={styles.goalDateText}>
                              {format(parseISO(goal.target_date), 'MMM d, yyyy')}
                            </Text>
                          </View>
                        )}
                        {totalSubgoals > 0 && (
                          <View style={styles.goalProgressRow}>
                            <View style={styles.progressBarSmall}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${progress}%`,
                                    backgroundColor: progress === 100 ? colors.success[500] : colors.brand[500],
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.goalProgressText}>
                              {completedSubgoals}/{totalSubgoals}
                            </Text>
                          </View>
                        )}
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={20} color={colors.slate[400]} />
                      ) : (
                        <ChevronDown size={20} color={colors.slate[400]} />
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.goalExpanded}>
                        {goal.description && (
                          <Text style={styles.goalDescription}>{goal.description}</Text>
                        )}

                        {/* Subgoals */}
                        {goal.subgoals && goal.subgoals.length > 0 && (
                          <View style={styles.subgoalsList}>
                            <Text style={styles.subgoalsTitle}>Milestones</Text>
                            {goal.subgoals.map((subgoal) => (
                              <View key={subgoal.id} style={styles.subgoalItem}>
                                <TouchableOpacity
                                  style={[
                                    styles.subgoalCheckbox,
                                    subgoal.completed_at && styles.subgoalCheckboxChecked,
                                  ]}
                                  onPress={() => toggleSubgoalComplete(subgoal)}
                                >
                                  {subgoal.completed_at && <CheckCircle size={12} color={colors.white} />}
                                </TouchableOpacity>
                                <Text
                                  style={[
                                    styles.subgoalTitle,
                                    subgoal.completed_at && styles.subgoalTitleCompleted,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {subgoal.title}
                                </Text>
                                {(isStaff() || linkedGymnasts.some(g => g.id === gymnastId)) && (
                                  <TouchableOpacity
                                    style={styles.subgoalDeleteBtn}
                                    onPress={() => deleteSubgoal(subgoal.id)}
                                  >
                                    <X size={14} color={colors.slate[400]} />
                                  </TouchableOpacity>
                                )}
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Add Subgoal Input */}
                        {(isStaff() || linkedGymnasts.some(g => g.id === gymnastId)) && (
                          <View style={styles.addSubgoalRow}>
                            <TextInput
                              style={styles.addSubgoalInput}
                              placeholder="Add milestone..."
                              placeholderTextColor={colors.slate[400]}
                              value={newSubgoalTitle[goal.id] || ''}
                              onChangeText={(text) =>
                                setNewSubgoalTitle(prev => ({ ...prev, [goal.id]: text }))
                              }
                              onSubmitEditing={() => addSubgoal(goal.id)}
                            />
                            <TouchableOpacity
                              style={styles.addSubgoalBtn}
                              onPress={() => addSubgoal(goal.id)}
                            >
                              <Plus size={16} color={colors.brand[600]} />
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Goal Actions */}
                        {(isStaff() || linkedGymnasts.some(g => g.id === gymnastId)) && (
                          <View style={styles.goalActions}>
                            <TouchableOpacity
                              style={styles.goalActionBtn}
                              onPress={() => openEditGoalModal(goal)}
                            >
                              <Edit2 size={14} color={colors.slate[600]} />
                              <Text style={styles.goalActionText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.goalActionBtn, styles.goalActionDelete]}
                              onPress={() => deleteGoal(goal.id)}
                            >
                              <Trash2 size={14} color={colors.error[600]} />
                              <Text style={[styles.goalActionText, { color: colors.error[600] }]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Target size={48} color={colors.slate[300]} />
                <Text style={styles.emptyTitle}>No Goals Set</Text>
                <Text style={styles.emptyTextCenter}>
                  Set goals to track progress and achievements
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'assessment' && (
          <View style={styles.section}>
            {/* Edit toggle for staff */}
            {isStaff() && (
              <View style={styles.assessmentHeader}>
                <Text style={styles.sectionTitle}>Coach Assessment</Text>
                <TouchableOpacity
                  style={styles.editToggleBtn}
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
                    <X size={18} color={colors.slate[600]} />
                  ) : (
                    <Edit2 size={18} color={colors.slate[600]} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {!isStaff() && <Text style={styles.sectionTitle}>Coach Assessment</Text>}

            {editingAssessment ? (
              // Edit Mode
              <View style={styles.assessmentEditForm}>
                <View style={styles.assessmentEditCard}>
                  <View style={[styles.assessmentEditHeader, { backgroundColor: colors.emerald[50] }]}>
                    <Zap size={18} color={colors.emerald[600]} />
                    <Text style={[styles.assessmentEditLabel, { color: colors.emerald[700] }]}>Strengths</Text>
                  </View>
                  <TextInput
                    style={styles.assessmentTextArea}
                    placeholder="Enter strengths..."
                    placeholderTextColor={colors.slate[400]}
                    value={assessmentForm.strengths}
                    onChangeText={(text) => setAssessmentForm(prev => ({ ...prev, strengths: text }))}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.assessmentEditCard}>
                  <View style={[styles.assessmentEditHeader, { backgroundColor: colors.amber[50] }]}>
                    <Activity size={18} color={colors.amber[600]} />
                    <Text style={[styles.assessmentEditLabel, { color: colors.amber[700] }]}>Areas to Improve</Text>
                  </View>
                  <TextInput
                    style={styles.assessmentTextArea}
                    placeholder="Enter areas to improve..."
                    placeholderTextColor={colors.slate[400]}
                    value={assessmentForm.weaknesses}
                    onChangeText={(text) => setAssessmentForm(prev => ({ ...prev, weaknesses: text }))}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.assessmentEditCard}>
                  <View style={[styles.assessmentEditHeader, { backgroundColor: colors.indigo[50] }]}>
                    <FileText size={18} color={colors.indigo[600]} />
                    <Text style={[styles.assessmentEditLabel, { color: colors.indigo[700] }]}>Training Plan</Text>
                  </View>
                  <TextInput
                    style={styles.assessmentTextArea}
                    placeholder="Enter training plan..."
                    placeholderTextColor={colors.slate[400]}
                    value={assessmentForm.overall_plan}
                    onChangeText={(text) => setAssessmentForm(prev => ({ ...prev, overall_plan: text }))}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.assessmentEditCard}>
                  <View style={[styles.assessmentEditHeader, { backgroundColor: colors.error[50] }]}>
                    <Heart size={18} color={colors.error[600]} />
                    <Text style={[styles.assessmentEditLabel, { color: colors.error[700] }]}>Injuries / Notes</Text>
                  </View>
                  <TextInput
                    style={styles.assessmentTextArea}
                    placeholder="Enter injury notes..."
                    placeholderTextColor={colors.slate[400]}
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
                      <View style={[styles.assessmentViewCard, { borderLeftColor: colors.emerald[500] }]}>
                        <View style={styles.assessmentViewHeader}>
                          <Zap size={16} color={colors.emerald[600]} />
                          <Text style={[styles.assessmentViewLabel, { color: colors.emerald[700] }]}>Strengths</Text>
                        </View>
                        <Text style={styles.assessmentViewText}>{assessmentForm.strengths}</Text>
                      </View>
                    )}

                    {assessmentForm.weaknesses && (
                      <View style={[styles.assessmentViewCard, { borderLeftColor: colors.amber[500] }]}>
                        <View style={styles.assessmentViewHeader}>
                          <Activity size={16} color={colors.amber[600]} />
                          <Text style={[styles.assessmentViewLabel, { color: colors.amber[700] }]}>Areas to Improve</Text>
                        </View>
                        <Text style={styles.assessmentViewText}>{assessmentForm.weaknesses}</Text>
                      </View>
                    )}

                    {assessmentForm.overall_plan && (
                      <View style={[styles.assessmentViewCard, { borderLeftColor: colors.indigo[500] }]}>
                        <View style={styles.assessmentViewHeader}>
                          <FileText size={16} color={colors.indigo[600]} />
                          <Text style={[styles.assessmentViewLabel, { color: colors.indigo[700] }]}>Training Plan</Text>
                        </View>
                        <Text style={styles.assessmentViewText}>{assessmentForm.overall_plan}</Text>
                      </View>
                    )}

                    {assessmentForm.injuries && (
                      <View style={[styles.assessmentViewCard, { borderLeftColor: colors.error[500] }]}>
                        <View style={styles.assessmentViewHeader}>
                          <Heart size={16} color={colors.error[600]} />
                          <Text style={[styles.assessmentViewLabel, { color: colors.error[700] }]}>Injuries / Notes</Text>
                        </View>
                        <Text style={styles.assessmentViewText}>{assessmentForm.injuries}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.emptyContainer}>
                    <FileText size={48} color={colors.slate[300]} />
                    <Text style={styles.emptyTitle}>No Assessment Yet</Text>
                    <Text style={styles.emptyTextCenter}>
                      {isStaff() ? 'Tap the edit button to add an assessment' : 'No assessment has been added by coaches yet'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'skills' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills by Event</Text>
            {isStaff() && (
              <Text style={styles.skillEditHint}>Tap a skill to change its status</Text>
            )}
            {skillSummary.map((summary) => {
              const isExpanded = expandedSkillEvents.has(summary.event);
              const eventSkills = detailedSkills.filter(s => s.event === summary.event);

              return (
                <View key={summary.event} style={styles.skillEventCard}>
                  <TouchableOpacity
                    style={styles.skillEventHeader}
                    onPress={() => toggleSkillEventExpanded(summary.event)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.skillEventName}>{getEventLabel(summary.event)}</Text>
                    <View style={styles.skillEventMeta}>
                      <Text style={styles.skillEventCount}>
                        {summary.compete_ready} / {summary.total} ready
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={18} color={colors.slate[400]} />
                      ) : (
                        <ChevronDown size={18} color={colors.slate[400]} />
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: summary.total > 0
                            ? `${(summary.compete_ready / summary.total) * 100}%`
                            : '0%',
                        },
                      ]}
                    />
                  </View>

                  {isExpanded && eventSkills.length > 0 && (
                    <View style={styles.skillsList}>
                      {eventSkills.map((skill) => {
                        const statusKey = String(skill.status || 'null');
                        const statusConfig = SKILL_STATUS_COLORS[statusKey] || SKILL_STATUS_COLORS['null'];
                        const statusLabel = SKILL_STATUS_LABELS[statusKey] || 'Not Started';

                        return (
                          <TouchableOpacity
                            key={skill.id}
                            style={styles.skillItem}
                            onPress={() => cycleSkillStatus(skill)}
                            disabled={!isStaff()}
                            activeOpacity={isStaff() ? 0.7 : 1}
                          >
                            <Text style={styles.skillName} numberOfLines={1}>
                              {skill.name}
                            </Text>
                            <View style={[styles.skillStatusBadge, { backgroundColor: statusConfig.bg }]}>
                              <Text style={[styles.skillStatusText, { color: statusConfig.text }]}>
                                {statusLabel}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
            {skillSummary.length === 0 && (
              <View style={styles.emptyContainer}>
                <Target size={48} color={colors.slate[300]} />
                <Text style={styles.emptyTitle}>No Skills Tracked</Text>
                <Text style={styles.emptyTextCenter}>
                  Skills will appear here once they are added to this gymnast
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'scores' && (
          <View style={styles.section}>
            {/* Season Picker */}
            {currentHub && (
              <View style={styles.seasonPickerContainer}>
                <SeasonPicker
                  hubId={currentHub.id}
                  selectedSeasonId={selectedSeasonId}
                  onSeasonChange={(seasonId) => setSelectedSeasonId(seasonId)}
                  showAllOption={true}
                  label="Season"
                />
              </View>
            )}

            <Text style={styles.sectionTitle}>Competition Scores</Text>
            {(() => {
              const filteredScores = selectedSeasonId
                ? recentScores.filter((s) => s.season_id === selectedSeasonId)
                : recentScores;

              return filteredScores.length > 0 ? (
                filteredScores.map((score) => (
                  <View key={score.id} style={styles.scoreCard}>
                    <View style={styles.scoreHeader}>
                      <Badge label={getEventLabel(score.event)} variant="neutral" size="sm" />
                      <Text style={styles.scoreValue}>{score.score.toFixed(3)}</Text>
                    </View>
                    <Text style={styles.scoreCompetition}>{score.competition_name}</Text>
                    {score.competition_date && (
                      <Text style={styles.scoreDate}>
                        {format(parseISO(score.competition_date), 'MMM d, yyyy')}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <BarChart3 size={48} color={colors.slate[300]} />
                  <Text style={styles.emptyTitle}>No Scores Found</Text>
                  <Text style={styles.emptyTextCenter}>
                    {selectedSeasonId ? 'No scores for this season' : 'No scores recorded yet'}
                  </Text>
                </View>
              );
            })()}
          </View>
        )}

        {activeTab === 'attendance' && canViewAttendance && (
          <View style={styles.section}>
            {/* Overall Stats */}
            <View style={styles.attendanceStatsGrid}>
              <View style={[styles.attendanceStatCard, { backgroundColor: colors.emerald[50] }]}>
                <TrendingUp size={20} color={colors.emerald[600]} />
                <Text style={[styles.attendanceStatValue, { color: colors.emerald[600] }]}>
                  {attendanceStats.percentage}%
                </Text>
                <Text style={styles.attendanceStatLabel}>6-Month Rate</Text>
              </View>
              <View style={[styles.attendanceStatCard, { backgroundColor: colors.emerald[50] }]}>
                <UserCheck size={20} color={colors.emerald[600]} />
                <Text style={styles.attendanceStatValue}>{attendanceStats.present}</Text>
                <Text style={styles.attendanceStatLabel}>Present</Text>
              </View>
              <View style={[styles.attendanceStatCard, { backgroundColor: colors.amber[50] }]}>
                <Clock size={20} color={colors.amber[600]} />
                <Text style={styles.attendanceStatValue}>{attendanceStats.late}</Text>
                <Text style={styles.attendanceStatLabel}>Late</Text>
              </View>
              <View style={[styles.attendanceStatCard, { backgroundColor: colors.error[50] }]}>
                <AlertTriangle size={20} color={colors.error[600]} />
                <Text style={styles.attendanceStatValue}>{attendanceStats.absent}</Text>
                <Text style={styles.attendanceStatLabel}>Absent</Text>
              </View>
            </View>

            {/* Monthly Trends */}
            {monthlyTrends.some((m) => m.total > 0) && (
              <View style={styles.monthlyTrendsSection}>
                <View style={styles.monthlyTrendsHeader}>
                  <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
                  {selectedMonth && (
                    <TouchableOpacity
                      style={styles.clearFilterBtn}
                      onPress={() => setSelectedMonth(null)}
                    >
                      <Text style={styles.clearFilterText}>Clear</Text>
                      <X size={14} color={colors.brand[600]} />
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.monthlyTrendsScroll}
                >
                  {monthlyTrends.map((month) => {
                    if (month.total === 0) return null;
                    const isSelected = selectedMonth === month.key;
                    const progressColor =
                      month.percentage >= 90
                        ? colors.emerald[500]
                        : month.percentage >= 70
                        ? colors.amber[500]
                        : colors.error[500];

                    return (
                      <TouchableOpacity
                        key={month.key}
                        style={[
                          styles.monthlyTrendCard,
                          isSelected && styles.monthlyTrendCardSelected,
                        ]}
                        onPress={() =>
                          setSelectedMonth(isSelected ? null : month.key)
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.monthlyTrendLabel,
                            isSelected && styles.monthlyTrendLabelSelected,
                          ]}
                        >
                          {month.label}
                        </Text>
                        <Text
                          style={[
                            styles.monthlyTrendPercent,
                            { color: progressColor },
                          ]}
                        >
                          {month.percentage}%
                        </Text>
                        <View style={styles.monthlyTrendProgressBar}>
                          <View
                            style={[
                              styles.monthlyTrendProgressFill,
                              {
                                width: `${month.percentage}%`,
                                backgroundColor: progressColor,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.monthlyTrendCount}>
                          {month.present}/{month.total} days
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Attendance Records */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              {selectedMonth
                ? `Records for ${monthlyTrends.find((m) => m.key === selectedMonth)?.label || selectedMonth}`
                : 'Recent Records'}
            </Text>
            {filteredAttendanceRecords.slice(0, 30).map((record) => {
              const config = STATUS_CONFIG[record.status] || STATUS_CONFIG.present;
              return (
                <View key={record.id} style={styles.attendanceRecordCard}>
                  <View style={styles.attendanceRecordHeader}>
                    <Text style={styles.attendanceRecordDate}>
                      {format(parseISO(record.attendance_date), 'EEEE, MMM d')}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
                      <Text style={[styles.statusText, { color: config.color }]}>
                        {config.label}
                      </Text>
                    </View>
                  </View>
                  {(record.check_in_time || record.check_out_time) && (
                    <View style={styles.attendanceTimeRow}>
                      {record.check_in_time && (
                        <Text style={styles.attendanceTimeText}>In: {record.check_in_time}</Text>
                      )}
                      {record.check_out_time && (
                        <Text style={styles.attendanceTimeText}>Out: {record.check_out_time}</Text>
                      )}
                    </View>
                  )}
                  {record.notes && (
                    <Text style={styles.attendanceNotes}>{record.notes}</Text>
                  )}
                </View>
              );
            })}
            {filteredAttendanceRecords.length === 0 && (
              <View style={styles.emptyContainer}>
                <UserCheck size={48} color={colors.slate[300]} />
                <Text style={styles.emptyTitle}>No Attendance Records</Text>
                <Text style={styles.emptyTextCenter}>
                  {selectedMonth ? 'No records for this month' : 'No attendance has been recorded yet'}
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'assignments' && canViewAssignments && (
          <View style={styles.section}>
            {/* Assignment Stats Card */}
            <View style={styles.assignmentStatsCard}>
              <View style={styles.assignmentStatsHeader}>
                <ClipboardList size={20} color={colors.brand[600]} />
                <Text style={styles.assignmentStatsTitle}>30-Day Statistics</Text>
              </View>
              <View style={styles.assignmentQuickStats}>
                <View style={styles.assignmentQuickStat}>
                  <Text style={styles.assignmentQuickStatValue}>{assignmentStats.totalExercises}</Text>
                  <Text style={styles.assignmentQuickStatLabel}>Assigned</Text>
                </View>
                <View style={styles.assignmentQuickStat}>
                  <Text style={[styles.assignmentQuickStatValue, { color: colors.brand[600] }]}>
                    {assignmentStats.totalCompleted}
                  </Text>
                  <Text style={styles.assignmentQuickStatLabel}>Completed</Text>
                </View>
                <View style={styles.assignmentQuickStat}>
                  <Text style={[styles.assignmentQuickStatValue, { color: colors.indigo[600] }]}>
                    {assignmentStats.completionRate}%
                  </Text>
                  <Text style={styles.assignmentQuickStatLabel}>Rate</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${assignmentStats.completionRate}%`, backgroundColor: colors.brand[500] },
                  ]}
                />
              </View>
            </View>

            {/* Recent Assignments */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Recent Assignments</Text>
            {assignments.slice(0, 10).map((assignment) => {
              let dayTotal = 0;
              let dayCompleted = 0;

              ASSIGNMENT_EVENTS.forEach(event => {
                const content = assignment[event as keyof Assignment] as string | undefined;
                if (!content || typeof content !== 'string') return;
                const exerciseCount = content.split('\n').filter(line => line.trim()).length;
                const completedCount = Math.min(
                  (assignment.completed_items?.[event] || []).length,
                  exerciseCount
                );
                dayTotal += exerciseCount;
                dayCompleted += completedCount;
              });

              const dayPercentage = dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0;

              return (
                <View key={assignment.id} style={styles.assignmentCard}>
                  <View style={styles.assignmentCardHeader}>
                    <Text style={styles.assignmentDate}>
                      {format(parseISO(assignment.date), 'EEEE, MMM d')}
                    </Text>
                    <View style={styles.assignmentPercentageContainer}>
                      <Text style={[
                        styles.assignmentPercentage,
                        { color: dayPercentage === 100 ? colors.success[600] : dayPercentage >= 80 ? colors.brand[600] : colors.slate[700] }
                      ]}>
                        {dayPercentage}%
                      </Text>
                      {dayPercentage === 100 && (
                        <CheckCircle size={16} color={colors.success[500]} />
                      )}
                    </View>
                  </View>
                  <View style={styles.progressBarSmall}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${dayPercentage}%`,
                          backgroundColor: dayPercentage === 100 ? colors.success[500] : dayPercentage >= 80 ? colors.brand[500] : colors.slate[400],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.assignmentExerciseCount}>
                    {dayCompleted} / {dayTotal} exercises
                  </Text>
                </View>
              );
            })}
            {assignments.length === 0 && (
              <View style={styles.emptyContainer}>
                <ClipboardList size={48} color={colors.slate[300]} />
                <Text style={styles.emptyTitle}>No Assignments Yet</Text>
                <Text style={styles.emptyTextCenter}>
                  Assignment history will appear here once exercises are assigned
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* Goal Modal */}
      <Modal
        visible={goalModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGoal ? 'Edit Goal' : 'Add Goal'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setGoalModalVisible(false)}
              >
                <X size={24} color={colors.slate[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter goal title"
                placeholderTextColor={colors.slate[400]}
                value={goalForm.title}
                onChangeText={(text) => setGoalForm(prev => ({ ...prev, title: text }))}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the goal"
                placeholderTextColor={colors.slate[400]}
                value={goalForm.description}
                onChangeText={(text) => setGoalForm(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>Event (optional)</Text>
              <View style={styles.eventPicker}>
                {(gymnast?.gender === 'Female' ? WAG_EVENTS : MAG_EVENTS).map((event) => (
                  <TouchableOpacity
                    key={event}
                    style={[
                      styles.eventOption,
                      goalForm.event === event && styles.eventOptionSelected,
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
                        goalForm.event === event && styles.eventOptionTextSelected,
                      ]}
                    >
                      {getEventLabel(event)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Target Date (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.slate[400]}
                value={goalForm.target_date}
                onChangeText={(text) => setGoalForm(prev => ({ ...prev, target_date: text }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setGoalModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!goalForm.title.trim() || savingGoal) && styles.saveButtonDisabled]}
                onPress={saveGoal}
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
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  gymnastName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabsScrollView: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.light.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[500],
  },
  tabTextActive: {
    color: theme.light.primary,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
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
  skillEventCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  skillEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillEventName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  skillEventCount: {
    fontSize: 14,
    color: colors.slate[500],
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.slate[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarSmall: {
    height: 4,
    backgroundColor: colors.slate[100],
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.emerald[500],
    borderRadius: 3,
  },
  scoreCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.slate[900],
  },
  scoreCompetition: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
  },
  scoreDate: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[400],
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 12,
    marginBottom: 4,
  },
  emptyTextCenter: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: 40,
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
  // Attendance Tab
  attendanceStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  attendanceStatCard: {
    width: '48%',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  attendanceStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
    marginTop: 6,
  },
  attendanceStatLabel: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  attendanceRecordCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  attendanceRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceRecordDate: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceTimeRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  attendanceTimeText: {
    fontSize: 12,
    color: colors.slate[500],
  },
  attendanceNotes: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Assignments Tab
  assignmentStatsCard: {
    backgroundColor: colors.brand[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  assignmentStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  assignmentStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[900],
  },
  assignmentQuickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  assignmentQuickStat: {
    alignItems: 'center',
  },
  assignmentQuickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.slate[900],
  },
  assignmentQuickStatLabel: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  assignmentCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  assignmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentDate: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
  },
  assignmentPercentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignmentPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  assignmentExerciseCount: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 6,
  },
  // Goals Tab Styles
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[600],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  goalCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  goalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCheckboxChecked: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  goalContent: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
    flex: 1,
  },
  goalTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.slate[400],
  },
  goalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  goalDateText: {
    fontSize: 12,
    color: colors.slate[500],
  },
  goalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  goalProgressText: {
    fontSize: 12,
    color: colors.slate[500],
    fontWeight: '500',
  },
  goalExpanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  goalDescription: {
    fontSize: 14,
    color: colors.slate[600],
    marginTop: 12,
    lineHeight: 20,
  },
  subgoalsList: {
    marginTop: 14,
  },
  subgoalsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[500],
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subgoalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  subgoalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  subgoalCheckboxChecked: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  subgoalTitle: {
    flex: 1,
    fontSize: 14,
    color: colors.slate[700],
  },
  subgoalTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.slate[400],
  },
  subgoalDeleteBtn: {
    padding: 4,
  },
  addSubgoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  addSubgoalInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  addSubgoalBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  goalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.slate[50],
  },
  goalActionDelete: {
    backgroundColor: colors.error[50],
  },
  goalActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  // Assessment Tab Styles
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
  // Modal Styles
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
  saveButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  // Season Picker
  seasonPickerContainer: {
    marginBottom: 16,
  },
  // Monthly Trends
  monthlyTrendsSection: {
    marginTop: 20,
  },
  monthlyTrendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.brand[50],
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.brand[600],
  },
  monthlyTrendsScroll: {
    gap: 10,
    paddingRight: 16,
  },
  monthlyTrendCard: {
    width: 110,
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    alignItems: 'center',
  },
  monthlyTrendCardSelected: {
    borderColor: colors.brand[500],
    backgroundColor: colors.brand[50],
  },
  monthlyTrendLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[600],
    marginBottom: 4,
  },
  monthlyTrendLabelSelected: {
    color: colors.brand[700],
  },
  monthlyTrendPercent: {
    fontSize: 22,
    fontWeight: '700',
  },
  monthlyTrendProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.slate[100],
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 6,
    overflow: 'hidden',
  },
  monthlyTrendProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  monthlyTrendCount: {
    fontSize: 11,
    color: colors.slate[500],
  },
  // Profile Editing Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionEditBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  editFormSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[600],
    marginBottom: 6,
  },
  profileInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate[900],
    marginBottom: 10,
  },
  profileTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editFormButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[600],
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
  },
  editSaveBtnDisabled: {
    backgroundColor: colors.slate[300],
  },
  editSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  emptyFieldText: {
    fontSize: 14,
    color: colors.slate[400],
    fontStyle: 'italic',
  },
  // Skills editing styles
  skillEditHint: {
    fontSize: 12,
    color: colors.slate[500],
    marginBottom: 12,
    fontStyle: 'italic',
  },
  skillEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingTop: 10,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  skillName: {
    flex: 1,
    fontSize: 14,
    color: colors.slate[800],
    marginRight: 10,
  },
  skillStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  skillStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
