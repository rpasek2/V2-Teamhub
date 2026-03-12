export interface Guardian {
  name?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  first_name?: string;
  last_name?: string;
}

export interface MedicalInfo {
  allergies?: string;
  medications?: string;
  conditions?: string;
  notes?: string;
}

export interface EmergencyContact {
  name?: string;
  phone?: string;
  relationship?: string;
}

export interface GymnastProfile {
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
  avatar_url: string | null;
  floor_music_url: string | null;
  floor_music_name: string | null;
}

export interface RecentScore {
  id: string;
  event: string;
  score: number;
  competition_id: string;
  competition_name: string;
  competition_date: string;
  season_id: string | null;
}

export interface SkillSummary {
  event: string;
  eventLabel: string;
  total: number;
  compete_ready: number;
}

export interface DetailedSkill {
  id: string;
  hub_event_skill_id: string;
  event: string;
  name: string;
  status: 'none' | 'learning' | 'achieved' | 'mastered' | 'injured' | null;
  achieved_date: string | null;
}

export interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: 'present' | 'late' | 'absent' | 'left_early';
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string | null;
}

export interface Assignment {
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

export interface Subgoal {
  id: string;
  goal_id: string;
  title: string;
  target_date: string | null;
  completed_at: string | null;
}

export interface Goal {
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

export interface Assessment {
  id: string;
  gymnast_profile_id: string;
  strengths: string | null;
  weaknesses: string | null;
  overall_plan: string | null;
  injuries: string | null;
}

export type Tab = 'overview' | 'goals' | 'assessment' | 'skills' | 'scores' | 'attendance' | 'assignments' | 'progress_reports';

export interface AttendanceStats {
  present: number;
  late: number;
  absent: number;
  leftEarly: number;
  total: number;
  attended: number;
  percentage: number;
}

export interface MonthlyTrend {
  key: string;
  label: string;
  present: number;
  total: number;
  percentage: number;
}

export interface AssignmentStats {
  totalExercises: number;
  totalCompleted: number;
  completionRate: number;
  daysCount: number;
}
