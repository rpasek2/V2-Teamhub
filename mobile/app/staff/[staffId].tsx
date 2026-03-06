import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Clock,
  FileText,
  AlertCircle,
  CheckSquare,
  Award,
  Shield,
  CalendarOff,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  X,
  Check,
} from 'lucide-react-native';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';

// Parse date-only strings (YYYY-MM-DD) as local dates, not UTC
const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { isTabEnabled } from '../../src/lib/permissions';

interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

interface StaffMember {
  user_id: string;
  role: string;
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  staff_profile?: {
    id: string;
    title: string | null;
    bio: string | null;
    phone: string | null;
    email: string | null;
    hire_date: string | null;
    status: string;
    emergency_contact: EmergencyContact | null;
  } | null;
}

interface StaffSchedule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface StaffResponsibility {
  id: string;
  title: string;
  description: string | null;
  category: string;
}

interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
}

interface StaffCertification {
  id: string;
  name: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
}

interface StaffTimeOff {
  id: string;
  start_date: string;
  end_date: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
  notes: string | null;
  status: 'pending' | 'approved' | 'denied';
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_OFF_TYPES: Record<string, { label: string; color: string }> = {
  vacation: { label: 'Vacation', color: colors.blue[500] },
  sick: { label: 'Sick', color: colors.error[500] },
  personal: { label: 'Personal', color: colors.purple[500] },
  other: { label: 'Other', color: colors.slate[500] },
};

export default function StaffDetailScreen() {
  const { t, isDark } = useTheme();
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [responsibilities, setResponsibilities] = useState<StaffResponsibility[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [certifications, setCertifications] = useState<StaffCertification[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<StaffTimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentHub = useHubStore((state) => state.currentHub);
  const currentMember = useHubStore((state) => state.currentMember);
  const currentRole = currentMember?.role;

  // Check if user is staff
  const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
  const canManage = ['owner', 'director', 'admin'].includes(currentRole || '');

  // Modal states
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [showAddTimeOffModal, setShowAddTimeOffModal] = useState(false);

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });
  const [certForm, setCertForm] = useState({
    name: '',
    issuer: '',
    issue_date: '',
    expiry_date: '',
  });
  const [timeOffForm, setTimeOffForm] = useState({
    start_date: '',
    end_date: '',
    type: 'vacation' as 'vacation' | 'sick' | 'personal' | 'other',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentHub?.id && staffId) {
      fetchStaffDetails();
    }
  }, [currentHub?.id, staffId]);

  const fetchStaffDetails = async () => {
    if (!currentHub || !staffId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch hub member with profile
      const { data: memberData, error: memberError } = await supabase
        .from('hub_members')
        .select(`
          user_id,
          role,
          profile:profiles(id, full_name, email, avatar_url)
        `)
        .eq('hub_id', currentHub.id)
        .eq('user_id', staffId)
        .in('role', ['owner', 'director', 'admin', 'coach'])
        .single();

      if (memberError) {
        console.error('Error fetching staff member:', memberError);
        setLoading(false);
        return;
      }

      // Fetch additional data in parallel
      const [
        staffProfileResult,
        schedulesResult,
        responsibilitiesResult,
        tasksResult,
        certificationsResult,
        timeOffResult,
      ] = await Promise.all([
        supabase
          .from('staff_profiles')
          .select('id, title, bio, phone, email, hire_date, status, emergency_contact')
          .eq('hub_id', currentHub.id)
          .eq('user_id', staffId)
          .maybeSingle(),
        supabase
          .from('staff_schedules')
          .select('id, day_of_week, start_time, end_time')
          .eq('hub_id', currentHub.id)
          .eq('staff_user_id', staffId)
          .order('day_of_week'),
        supabase
          .from('staff_responsibilities')
          .select('id, title, description, category')
          .eq('hub_id', currentHub.id)
          .eq('staff_user_id', staffId)
          .order('category'),
        supabase
          .from('staff_tasks')
          .select('id, title, description, status, priority, due_date')
          .eq('hub_id', currentHub.id)
          .eq('staff_user_id', staffId)
          .in('status', ['pending', 'in_progress'])
          .order('due_date'),
        supabase
          .from('staff_certifications')
          .select('id, name, issuer, issue_date, expiry_date')
          .eq('hub_id', currentHub.id)
          .eq('staff_user_id', staffId)
          .order('expiry_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('staff_time_off')
          .select('id, start_date, end_date, type, notes, status')
          .eq('hub_id', currentHub.id)
          .eq('staff_user_id', staffId)
          .order('start_date', { ascending: false })
          .limit(10),
      ]);

      const profileData = Array.isArray(memberData.profile)
        ? memberData.profile[0]
        : memberData.profile;

      setStaffMember({
        user_id: memberData.user_id,
        role: memberData.role,
        profile: profileData as StaffMember['profile'],
        staff_profile: staffProfileResult.data || null,
      });

      setSchedules(schedulesResult.data || []);
      setResponsibilities(responsibilitiesResult.data || []);
      setTasks(tasksResult.data || []);
      setCertifications(certificationsResult.data || []);
      setTimeOffRequests(timeOffResult.data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStaffDetails();
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return { bg: isDark ? colors.amber[700] + '30' : colors.amber[100], text: isDark ? colors.amber[500] : colors.amber[700] };
      case 'director':
        return { bg: isDark ? colors.purple[700] + '30' : colors.purple[100], text: isDark ? colors.purple[400] : colors.purple[700] };
      case 'admin':
        return { bg: isDark ? colors.blue[700] + '30' : colors.blue[100], text: isDark ? colors.blue[400] : colors.blue[700] };
      case 'coach':
        return { bg: isDark ? colors.success[700] + '30' : colors.success[100], text: isDark ? colors.success[500] : colors.success[700] };
      default:
        return { bg: isDark ? colors.slate[700] : colors.slate[100], text: isDark ? colors.slate[400] : colors.slate[600] };
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.error[500];
      case 'medium':
        return colors.warning[500];
      default:
        return colors.slate[400];
    }
  };

  const getCertStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: 'valid', label: 'No Expiry', color: isDark ? colors.slate[400] : colors.slate[500], bg: isDark ? colors.slate[700] : colors.slate[100] };

    const expiry = parseISO(expiryDate);
    if (isPast(expiry)) {
      return { status: 'expired', label: 'Expired', color: isDark ? colors.error[400] : colors.error[600], bg: isDark ? colors.error[700] + '30' : colors.error[100] };
    }

    const daysUntil = differenceInDays(expiry, new Date());
    if (daysUntil <= 30) {
      return { status: 'expiring', label: `${daysUntil}d left`, color: isDark ? colors.warning[500] : colors.warning[600], bg: isDark ? colors.warning[700] + '30' : colors.warning[100] };
    }

    return { status: 'valid', label: 'Valid', color: isDark ? colors.success[500] : colors.success[600], bg: isDark ? colors.success[700] + '30' : colors.success[100] };
  };

  const getTimeOffStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: isDark ? colors.success[700] + '30' : colors.success[100], text: isDark ? colors.success[500] : colors.success[700], icon: CheckCircle };
      case 'denied':
        return { bg: isDark ? colors.error[700] + '30' : colors.error[100], text: isDark ? colors.error[400] : colors.error[700], icon: XCircle };
      default:
        return { bg: isDark ? colors.warning[700] + '30' : colors.warning[100], text: isDark ? colors.warning[500] : colors.warning[700], icon: Clock };
    }
  };

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  // Add Task
  const handleAddTask = async () => {
    if (!taskForm.title.trim() || !currentHub || !staffId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('staff_tasks').insert({
        hub_id: currentHub.id,
        staff_user_id: staffId,
        assigned_by: currentMember?.user_id,
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        status: 'pending',
      });

      if (error) throw error;

      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' });
      setShowAddTaskModal(false);
      fetchStaffDetails();
    } catch (err) {
      console.error('Error adding task:', err);
      Alert.alert('Error', 'Failed to add task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('staff_tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;
      fetchStaffDetails();
    } catch (err) {
      console.error('Error updating task:', err);
      Alert.alert('Error', 'Failed to update task status.');
    }
  };

  // Add Certification
  const handleAddCertification = async () => {
    if (!certForm.name.trim() || !currentHub || !staffId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('staff_certifications').insert({
        hub_id: currentHub.id,
        staff_user_id: staffId,
        name: certForm.name.trim(),
        issuer: certForm.issuer.trim() || null,
        issue_date: certForm.issue_date || null,
        expiry_date: certForm.expiry_date || null,
      });

      if (error) throw error;

      setCertForm({ name: '', issuer: '', issue_date: '', expiry_date: '' });
      setShowAddCertModal(false);
      fetchStaffDetails();
    } catch (err) {
      console.error('Error adding certification:', err);
      Alert.alert('Error', 'Failed to add certification. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Add Time Off Request
  const handleAddTimeOff = async () => {
    if (!timeOffForm.start_date || !timeOffForm.end_date || !currentHub || !staffId) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('staff_time_off').insert({
        hub_id: currentHub.id,
        staff_user_id: staffId,
        start_date: timeOffForm.start_date,
        end_date: timeOffForm.end_date,
        type: timeOffForm.type,
        notes: timeOffForm.notes.trim() || null,
        status: 'pending',
      });

      if (error) throw error;

      setTimeOffForm({ start_date: '', end_date: '', type: 'vacation', notes: '' });
      setShowAddTimeOffModal(false);
      fetchStaffDetails();
    } catch (err) {
      console.error('Error adding time off:', err);
      Alert.alert('Error', 'Failed to submit time off request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Approve/Deny Time Off
  const handleTimeOffDecision = async (requestId: string, decision: 'approved' | 'denied') => {
    Alert.alert(
      decision === 'approved' ? 'Approve Request' : 'Deny Request',
      `Are you sure you want to ${decision === 'approved' ? 'approve' : 'deny'} this time off request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Approve' : 'Deny',
          style: decision === 'denied' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('staff_time_off')
                .update({ status: decision, updated_at: new Date().toISOString() })
                .eq('id', requestId);

              if (error) throw error;
              fetchStaffDetails();
            } catch (err) {
              console.error('Error updating time off:', err);
              Alert.alert('Error', 'Failed to update time off request.');
            }
          },
        },
      ]
    );
  };

  if (!isStaff) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: t.background }]}>
        <User size={48} color={t.textFaint} />
        <Text style={[styles.permissionText, { color: t.textFaint }]}>You don't have permission to view this page.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (!staffMember) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: t.background }]}>
        <AlertCircle size={48} color={t.textFaint} />
        <Text style={[styles.permissionText, { color: t.textFaint }]}>Staff member not found.</Text>
      </View>
    );
  }

  const roleBadge = getRoleBadgeStyle(staffMember.role);
  const contactEmail = staffMember.staff_profile?.email || staffMember.profile?.email;
  const contactPhone = staffMember.staff_profile?.phone;

  return (
    <>
      <Stack.Screen
        options={{
          title: staffMember.profile?.full_name || 'Staff Profile',
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: t.background }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.textMuted} />}
      >
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          {/* Avatar */}
          {staffMember.profile?.avatar_url ? (
            <Image source={{ uri: staffMember.profile.avatar_url, cache: 'force-cache' }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? `${t.primary}20` : colors.brand[100] }]}>
              <Text style={[styles.avatarText, { color: t.primary }]}>
                {getInitials(staffMember.profile?.full_name || '??')}
              </Text>
            </View>
          )}

          {/* Name & Role */}
          <Text style={[styles.staffName, { color: t.text }]}>{staffMember.profile?.full_name || 'Unknown'}</Text>
          {staffMember.staff_profile?.title && (
            <Text style={[styles.staffTitle, { color: t.textMuted }]}>{staffMember.staff_profile.title}</Text>
          )}
          <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleBadge.text }]}>
              {staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)}
            </Text>
          </View>

          {/* Contact Actions */}
          <View style={styles.contactActions}>
            {contactEmail && (
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: isDark ? `${t.primary}15` : colors.brand[50] }]}
                onPress={() => handleEmailPress(contactEmail)}
              >
                <Mail size={20} color={t.primary} />
                <Text style={[styles.contactButtonText, { color: t.primary }]}>Email</Text>
              </TouchableOpacity>
            )}
            {contactPhone && (
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: isDark ? `${t.primary}15` : colors.brand[50] }]}
                onPress={() => handlePhonePress(contactPhone)}
              >
                <Phone size={20} color={t.primary} />
                <Text style={[styles.contactButtonText, { color: t.primary }]}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bio */}
        {staffMember.staff_profile?.bio && (
          <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color={t.textMuted} />
              <Text style={[styles.sectionTitle, { color: t.text }]}>About</Text>
            </View>
            <Text style={[styles.bioText, { color: t.textSecondary }]}>{staffMember.staff_profile.bio}</Text>
          </View>
        )}

        {/* Details */}
        <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.sectionHeader}>
            <Briefcase size={18} color={t.textMuted} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>Details</Text>
          </View>
          <View style={styles.detailsList}>
            {contactEmail && (
              <View style={styles.detailRow}>
                <Mail size={16} color={t.textFaint} />
                <Text style={[styles.detailText, { color: t.textSecondary }]}>{contactEmail}</Text>
              </View>
            )}
            {contactPhone && (
              <View style={styles.detailRow}>
                <Phone size={16} color={t.textFaint} />
                <Text style={[styles.detailText, { color: t.textSecondary }]}>{contactPhone}</Text>
              </View>
            )}
            {staffMember.staff_profile?.hire_date ? (
              <View style={styles.detailRow}>
                <Calendar size={16} color={t.textFaint} />
                <Text style={[styles.detailText, { color: t.textSecondary }]}>
                  Hired {format(parseISO(staffMember.staff_profile.hire_date), 'MMM d, yyyy')}
                </Text>
              </View>
            ) : (
              <View style={styles.detailRow}>
                <Calendar size={16} color={t.textFaint} />
                <Text style={[styles.detailTextMuted, { color: t.textFaint }]}>No hire date set</Text>
              </View>
            )}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={18} color={colors.error[500]} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>Emergency Contact</Text>
          </View>
          {staffMember.staff_profile?.emergency_contact?.name ? (
            <View style={[styles.emergencyCard, { backgroundColor: isDark ? colors.error[700] + '15' : colors.error[50] }]}>
              <Text style={[styles.emergencyName, { color: t.text }]}>
                {staffMember.staff_profile.emergency_contact.name}
              </Text>
              {staffMember.staff_profile.emergency_contact.relationship && (
                <Text style={[styles.emergencyRelation, { color: t.textMuted }]}>
                  {staffMember.staff_profile.emergency_contact.relationship}
                </Text>
              )}
              {staffMember.staff_profile.emergency_contact.phone && (
                <TouchableOpacity
                  style={styles.emergencyRow}
                  onPress={() =>
                    handlePhonePress(staffMember.staff_profile!.emergency_contact!.phone)
                  }
                >
                  <Phone size={14} color={t.textFaint} />
                  <Text style={[styles.emergencyText, { color: t.textSecondary }]}>
                    {staffMember.staff_profile.emergency_contact.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: t.textFaint }]}>No emergency contact on file</Text>
          )}
        </View>

        {/* Schedule */}
        {isTabEnabled('schedule', currentHub?.settings?.enabledTabs) && (
        <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color={t.textMuted} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>Work Schedule</Text>
          </View>
          {schedules.length > 0 ? (
            <View style={styles.scheduleList}>
              {schedules.map((schedule) => (
                <View key={schedule.id} style={[styles.scheduleRow, { borderBottomColor: t.borderSubtle }]}>
                  <Text style={[styles.scheduleDay, { color: t.textSecondary }]}>{DAYS_OF_WEEK[schedule.day_of_week]}</Text>
                  <Text style={[styles.scheduleTime, { color: t.textMuted }]}>
                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: t.textFaint }]}>No schedule set</Text>
          )}
        </View>
        )}

        {/* Certifications */}
        <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.sectionHeaderWithAction}>
            <View style={styles.sectionHeaderLeft}>
              <Shield size={18} color={t.textMuted} />
              <Text style={[styles.sectionTitle, { color: t.text }]}>Certifications</Text>
            </View>
            {canManage && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: isDark ? `${t.primary}15` : colors.brand[50] }]}
                onPress={() => setShowAddCertModal(true)}
              >
                <Plus size={16} color={t.primary} />
                <Text style={[styles.addButtonText, { color: t.primary }]}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {certifications.length > 0 ? (
            <View style={styles.certificationsList}>
              {certifications.map((cert) => {
                const status = getCertStatus(cert.expiry_date);
                return (
                  <View key={cert.id} style={[styles.certificationItem, { borderBottomColor: t.borderSubtle }]}>
                    <View style={styles.certificationInfo}>
                      <Text style={[styles.certificationName, { color: t.text }]}>{cert.name}</Text>
                      {cert.issuer && (
                        <Text style={[styles.certificationIssuer, { color: t.textMuted }]}>{cert.issuer}</Text>
                      )}
                      {cert.expiry_date && (
                        <Text style={[styles.certificationDate, { color: t.textFaint }]}>
                          Expires {format(parseISO(cert.expiry_date), 'MMM d, yyyy')}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.certStatusBadge, { backgroundColor: status.bg }]}>
                      {status.status === 'expired' ? (
                        <AlertTriangle size={12} color={status.color} />
                      ) : status.status === 'expiring' ? (
                        <AlertTriangle size={12} color={status.color} />
                      ) : (
                        <CheckCircle size={12} color={status.color} />
                      )}
                      <Text style={[styles.certStatusText, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: t.textFaint }]}>No certifications on file</Text>
          )}
        </View>

        {/* Time Off */}
        <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.sectionHeaderWithAction}>
            <View style={styles.sectionHeaderLeft}>
              <CalendarOff size={18} color={t.textMuted} />
              <Text style={[styles.sectionTitle, { color: t.text }]}>Time Off</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: isDark ? `${t.primary}15` : colors.brand[50] }]}
              onPress={() => setShowAddTimeOffModal(true)}
            >
              <Plus size={16} color={t.primary} />
              <Text style={[styles.addButtonText, { color: t.primary }]}>Request</Text>
            </TouchableOpacity>
          </View>
          {timeOffRequests.length > 0 ? (
            <View style={styles.timeOffList}>
              {timeOffRequests.map((request) => {
                const statusStyle = getTimeOffStatusStyle(request.status);
                const typeInfo = TIME_OFF_TYPES[request.type] || TIME_OFF_TYPES.other;
                const StatusIcon = statusStyle.icon;
                return (
                  <View key={request.id} style={[styles.timeOffItem, { borderBottomColor: t.borderSubtle }]}>
                    <View style={styles.timeOffInfo}>
                      <View style={styles.timeOffHeader}>
                        <View style={[styles.timeOffTypeBadge, { backgroundColor: `${typeInfo.color}20` }]}>
                          <Text style={[styles.timeOffTypeText, { color: typeInfo.color }]}>
                            {typeInfo.label}
                          </Text>
                        </View>
                        <View style={[styles.timeOffStatusBadge, { backgroundColor: statusStyle.bg }]}>
                          <StatusIcon size={12} color={statusStyle.text} />
                          <Text style={[styles.timeOffStatusText, { color: statusStyle.text }]}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.timeOffDates, { color: t.textSecondary }]}>
                        {format(parseLocalDate(request.start_date), 'MMM d')} -{' '}
                        {format(parseLocalDate(request.end_date), 'MMM d, yyyy')}
                      </Text>
                      {request.notes && (
                        <Text style={[styles.timeOffNotes, { color: t.textMuted }]} numberOfLines={2}>
                          {request.notes}
                        </Text>
                      )}
                      {/* Approve/Deny actions for managers on pending requests */}
                      {canManage && request.status === 'pending' && (
                        <View style={styles.timeOffActions}>
                          <TouchableOpacity
                            style={[styles.approveButton, { backgroundColor: isDark ? colors.success[700] + '20' : colors.success[50] }]}
                            onPress={() => handleTimeOffDecision(request.id, 'approved')}
                          >
                            <CheckCircle size={14} color={isDark ? colors.success[500] : colors.success[600]} />
                            <Text style={[styles.approveButtonText, { color: isDark ? colors.success[500] : colors.success[600] }]}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.denyButton, { backgroundColor: isDark ? colors.error[700] + '20' : colors.error[50] }]}
                            onPress={() => handleTimeOffDecision(request.id, 'denied')}
                          >
                            <XCircle size={14} color={isDark ? colors.error[400] : colors.error[600]} />
                            <Text style={[styles.denyButtonText, { color: isDark ? colors.error[400] : colors.error[600] }]}>Deny</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: t.textFaint }]}>No time off requests</Text>
          )}
        </View>

        {/* Responsibilities */}
        <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.sectionHeader}>
            <Award size={18} color={t.textMuted} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>Responsibilities</Text>
          </View>
          {responsibilities.length > 0 ? (
            <View style={styles.responsibilitiesList}>
              {responsibilities.map((resp) => (
                <View key={resp.id} style={styles.responsibilityItem}>
                  <View style={[styles.responsibilityBullet, { backgroundColor: t.primary }]} />
                  <View style={styles.responsibilityContent}>
                    <Text style={[styles.responsibilityTitle, { color: t.text }]}>{resp.title}</Text>
                    {resp.description && (
                      <Text style={[styles.responsibilityDesc, { color: t.textMuted }]}>{resp.description}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: t.textFaint }]}>No responsibilities assigned</Text>
          )}
        </View>

        {/* Active Tasks (only for managers) */}
        {canManage && (
          <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.sectionHeaderWithAction}>
              <View style={styles.sectionHeaderLeft}>
                <CheckSquare size={18} color={t.textMuted} />
                <Text style={[styles.sectionTitle, { color: t.text }]}>Active Tasks</Text>
              </View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: isDark ? `${t.primary}15` : colors.brand[50] }]}
                onPress={() => setShowAddTaskModal(true)}
              >
                <Plus size={16} color={t.primary} />
                <Text style={[styles.addButtonText, { color: t.primary }]}>Add</Text>
              </TouchableOpacity>
            </View>
            {tasks.length > 0 ? (
              <View style={styles.tasksList}>
                {tasks.map((task) => (
                  <View key={task.id} style={[styles.taskItem, { borderBottomColor: t.borderSubtle }]}>
                    <TouchableOpacity
                      style={[styles.taskCheckbox, { borderColor: t.border }, task.status === 'completed' && styles.taskCheckboxDone]}
                      onPress={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                    >
                      {task.status === 'completed' && <Check size={12} color={colors.white} />}
                    </TouchableOpacity>
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, { color: t.text }, task.status === 'completed' && styles.taskTitleDone]}>
                        {task.title}
                      </Text>
                      {task.due_date && (
                        <Text style={[styles.taskDue, { color: t.textMuted }]}>
                          Due {format(parseISO(task.due_date), 'MMM d')}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(task.priority)}20` }]}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                      <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                        {task.priority}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: t.textFaint }]}>No active tasks</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal
        visible={showAddTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddTaskModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { backgroundColor: t.overlay }]}
        >
          <View style={[styles.modalContent, { backgroundColor: t.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.text }]}>Assign Task</Text>
              <TouchableOpacity onPress={() => setShowAddTaskModal(false)}>
                <X size={24} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { marginTop: 0, color: t.textSecondary }]}>Task Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="Enter task title"
                placeholderTextColor={t.textFaint}
                value={taskForm.title}
                onChangeText={(text) => setTaskForm({ ...taskForm, title: text })}
              />

              <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="Enter task description"
                placeholderTextColor={t.textFaint}
                value={taskForm.description}
                onChangeText={(text) => setTaskForm({ ...taskForm, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Priority</Text>
              <View style={styles.priorityOptions}>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      { borderColor: t.border },
                      taskForm.priority === p && [styles.priorityOptionActive, { backgroundColor: t.surfaceSecondary }],
                      taskForm.priority === p && { borderColor: getPriorityColor(p) },
                    ]}
                    onPress={() => setTaskForm({ ...taskForm, priority: p })}
                  >
                    <View style={[styles.priorityDotSmall, { backgroundColor: getPriorityColor(p) }]} />
                    <Text
                      style={[
                        styles.priorityOptionText,
                        { color: t.textSecondary },
                        taskForm.priority === p && { color: getPriorityColor(p) },
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Due Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="e.g., 2024-02-15"
                placeholderTextColor={t.textFaint}
                value={taskForm.due_date}
                onChangeText={(text) => setTaskForm({ ...taskForm, due_date: text })}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: t.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: t.surfaceSecondary }]}
                onPress={() => setShowAddTaskModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: t.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: t.primary }, (!taskForm.title.trim() || saving) && { backgroundColor: isDark ? colors.slate[600] : colors.slate[300] }]}
                onPress={handleAddTask}
                disabled={!taskForm.title.trim() || saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Assign Task'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Certification Modal */}
      <Modal
        visible={showAddCertModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddCertModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { backgroundColor: t.overlay }]}
        >
          <View style={[styles.modalContent, { backgroundColor: t.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.text }]}>Add Certification</Text>
              <TouchableOpacity onPress={() => setShowAddCertModal(false)}>
                <X size={24} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { marginTop: 0, color: t.textSecondary }]}>Certification Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="e.g., CPR/First Aid"
                placeholderTextColor={t.textFaint}
                value={certForm.name}
                onChangeText={(text) => setCertForm({ ...certForm, name: text })}
              />

              <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Issuing Organization</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="e.g., American Red Cross"
                placeholderTextColor={t.textFaint}
                value={certForm.issuer}
                onChangeText={(text) => setCertForm({ ...certForm, issuer: text })}
              />

              <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Issue Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="e.g., 2024-01-15"
                placeholderTextColor={t.textFaint}
                value={certForm.issue_date}
                onChangeText={(text) => setCertForm({ ...certForm, issue_date: text })}
              />

              <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="e.g., 2026-01-15"
                placeholderTextColor={t.textFaint}
                value={certForm.expiry_date}
                onChangeText={(text) => setCertForm({ ...certForm, expiry_date: text })}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: t.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: t.surfaceSecondary }]}
                onPress={() => setShowAddCertModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: t.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: t.primary }, (!certForm.name.trim() || saving) && { backgroundColor: isDark ? colors.slate[600] : colors.slate[300] }]}
                onPress={handleAddCertification}
                disabled={!certForm.name.trim() || saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Add Certification'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Time Off Modal */}
      <Modal
        visible={showAddTimeOffModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddTimeOffModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { backgroundColor: t.overlay }]}
        >
          <View style={[styles.modalContent, { backgroundColor: t.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
              <Text style={[styles.modalTitle, { color: t.text }]}>Request Time Off</Text>
              <TouchableOpacity onPress={() => setShowAddTimeOffModal(false)}>
                <X size={24} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { marginTop: 0, color: t.textSecondary }]}>Type</Text>
              <View style={styles.typeOptions}>
                {(['vacation', 'sick', 'personal', 'other'] as const).map((tp) => {
                  const typeInfo = TIME_OFF_TYPES[tp];
                  return (
                    <TouchableOpacity
                      key={tp}
                      style={[
                        styles.typeOption,
                        { borderColor: t.border },
                        timeOffForm.type === tp && [styles.typeOptionActive, { backgroundColor: t.surfaceSecondary }],
                        timeOffForm.type === tp && { borderColor: typeInfo.color },
                      ]}
                      onPress={() => setTimeOffForm({ ...timeOffForm, type: tp })}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          { color: t.textSecondary },
                          timeOffForm.type === tp && { color: typeInfo.color },
                        ]}
                      >
                        {typeInfo.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Start Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="e.g., 2024-02-01"
                placeholderTextColor={t.textFaint}
                value={timeOffForm.start_date}
                onChangeText={(text) => setTimeOffForm({ ...timeOffForm, start_date: text })}
              />

              <Text style={[styles.inputLabel, { color: t.textSecondary }]}>End Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="e.g., 2024-02-05"
                placeholderTextColor={t.textFaint}
                value={timeOffForm.end_date}
                onChangeText={(text) => setTimeOffForm({ ...timeOffForm, end_date: text })}
              />

              <Text style={[styles.inputLabel, { color: t.textSecondary }]}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder="Add any notes..."
                placeholderTextColor={t.textFaint}
                value={timeOffForm.notes}
                onChangeText={(text) => setTimeOffForm({ ...timeOffForm, notes: text })}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: t.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: t.surfaceSecondary }]}
                onPress={() => setShowAddTimeOffModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: t.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: t.primary },
                  (!timeOffForm.start_date || !timeOffForm.end_date || saving) && { backgroundColor: isDark ? colors.slate[600] : colors.slate[300] },
                ]}
                onPress={handleAddTimeOff}
                disabled={!timeOffForm.start_date || !timeOffForm.end_date || saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Submitting...' : 'Submit Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: colors.slate[400],
    marginTop: 16,
    textAlign: 'center',
  },

  // Header Card
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brand[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.brand[700],
  },
  staffName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
    marginBottom: 4,
    textAlign: 'center',
  },
  staffTitle: {
    fontSize: 16,
    color: colors.slate[500],
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 20,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.brand[50],
    borderRadius: 10,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand[600],
  },

  // Sections
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.brand[50],
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.brand[600],
  },
  bioText: {
    fontSize: 15,
    color: colors.slate[600],
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[400],
    fontStyle: 'italic',
  },

  // Details
  detailsList: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 15,
    color: colors.slate[700],
    flex: 1,
  },
  detailTextMuted: {
    fontSize: 15,
    color: colors.slate[400],
    flex: 1,
    fontStyle: 'italic',
  },

  // Emergency Contact
  emergencyCard: {
    backgroundColor: colors.error[50],
    borderRadius: 10,
    padding: 12,
  },
  emergencyName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 2,
  },
  emergencyRelation: {
    fontSize: 13,
    color: colors.slate[500],
    marginBottom: 8,
  },
  emergencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: colors.slate[700],
  },

  // Schedule
  scheduleList: {
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  scheduleDay: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[700],
  },
  scheduleTime: {
    fontSize: 14,
    color: colors.slate[500],
  },

  // Certifications
  certificationsList: {
    gap: 10,
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  certificationInfo: {
    flex: 1,
  },
  certificationName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[800],
  },
  certificationIssuer: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  certificationDate: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 2,
  },
  certStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  certStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Time Off
  timeOffList: {
    gap: 10,
  },
  timeOffItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  timeOffInfo: {
    gap: 6,
  },
  timeOffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeOffTypeBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  timeOffTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeOffStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  timeOffStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeOffDates: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
  },
  timeOffNotes: {
    fontSize: 13,
    color: colors.slate[500],
  },

  // Responsibilities
  responsibilitiesList: {
    gap: 12,
  },
  responsibilityItem: {
    flexDirection: 'row',
    gap: 10,
  },
  responsibilityBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand[600],
    marginTop: 6,
  },
  responsibilityContent: {
    flex: 1,
  },
  responsibilityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[800],
  },
  responsibilityDesc: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },

  // Tasks
  tasksList: {
    gap: 10,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckboxDone: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[800],
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.slate[400],
  },
  taskDue: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  taskStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.slate[100],
  },
  taskStatusActive: {
    backgroundColor: colors.brand[100],
  },
  taskStatusText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.slate[600],
  },
  taskStatusTextActive: {
    color: colors.brand[700],
  },

  // Time Off Actions
  timeOffActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.success[50],
    borderRadius: 8,
  },
  approveButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.success[600],
  },
  denyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.error[50],
    borderRadius: 8,
  },
  denyButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.error[600],
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.slate[900],
    backgroundColor: colors.white,
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 8,
  },
  priorityOptionActive: {
    backgroundColor: colors.slate[50],
    borderWidth: 2,
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 8,
  },
  typeOptionActive: {
    backgroundColor: colors.slate[50],
    borderWidth: 2,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[600],
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.brand[600],
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
