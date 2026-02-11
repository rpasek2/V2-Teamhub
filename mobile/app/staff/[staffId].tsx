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
import { colors, theme } from '../../src/constants/colors';
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
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [responsibilities, setResponsibilities] = useState<StaffResponsibility[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [certifications, setCertifications] = useState<StaffCertification[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<StaffTimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { currentHub, currentMember } = useHubStore();
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
        return { bg: colors.amber[100], text: colors.amber[700] };
      case 'director':
        return { bg: colors.purple[100], text: colors.purple[700] };
      case 'admin':
        return { bg: colors.blue[100], text: colors.blue[700] };
      case 'coach':
        return { bg: colors.success[100], text: colors.success[700] };
      default:
        return { bg: colors.slate[100], text: colors.slate[600] };
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
    if (!expiryDate) return { status: 'valid', label: 'No Expiry', color: colors.slate[500], bg: colors.slate[100] };

    const expiry = parseISO(expiryDate);
    if (isPast(expiry)) {
      return { status: 'expired', label: 'Expired', color: colors.error[600], bg: colors.error[100] };
    }

    const daysUntil = differenceInDays(expiry, new Date());
    if (daysUntil <= 30) {
      return { status: 'expiring', label: `${daysUntil}d left`, color: colors.warning[600], bg: colors.warning[100] };
    }

    return { status: 'valid', label: 'Valid', color: colors.success[600], bg: colors.success[100] };
  };

  const getTimeOffStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: colors.success[100], text: colors.success[700], icon: CheckCircle };
      case 'denied':
        return { bg: colors.error[100], text: colors.error[700], icon: XCircle };
      default:
        return { bg: colors.warning[100], text: colors.warning[700], icon: Clock };
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
      <View style={styles.permissionContainer}>
        <User size={48} color={colors.slate[300]} />
        <Text style={styles.permissionText}>You don't have permission to view this page.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  if (!staffMember) {
    return (
      <View style={styles.permissionContainer}>
        <AlertCircle size={48} color={colors.slate[300]} />
        <Text style={styles.permissionText}>Staff member not found.</Text>
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
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          {/* Avatar */}
          {staffMember.profile?.avatar_url ? (
            <Image source={{ uri: staffMember.profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {getInitials(staffMember.profile?.full_name || '??')}
              </Text>
            </View>
          )}

          {/* Name & Role */}
          <Text style={styles.staffName}>{staffMember.profile?.full_name || 'Unknown'}</Text>
          {staffMember.staff_profile?.title && (
            <Text style={styles.staffTitle}>{staffMember.staff_profile.title}</Text>
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
                style={styles.contactButton}
                onPress={() => handleEmailPress(contactEmail)}
              >
                <Mail size={20} color={theme.light.primary} />
                <Text style={styles.contactButtonText}>Email</Text>
              </TouchableOpacity>
            )}
            {contactPhone && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => handlePhonePress(contactPhone)}
              >
                <Phone size={20} color={theme.light.primary} />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bio */}
        {staffMember.staff_profile?.bio && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color={colors.slate[500]} />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Text style={styles.bioText}>{staffMember.staff_profile.bio}</Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Briefcase size={18} color={colors.slate[500]} />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
          <View style={styles.detailsList}>
            {contactEmail && (
              <View style={styles.detailRow}>
                <Mail size={16} color={colors.slate[400]} />
                <Text style={styles.detailText}>{contactEmail}</Text>
              </View>
            )}
            {contactPhone && (
              <View style={styles.detailRow}>
                <Phone size={16} color={colors.slate[400]} />
                <Text style={styles.detailText}>{contactPhone}</Text>
              </View>
            )}
            {staffMember.staff_profile?.hire_date ? (
              <View style={styles.detailRow}>
                <Calendar size={16} color={colors.slate[400]} />
                <Text style={styles.detailText}>
                  Hired {format(parseISO(staffMember.staff_profile.hire_date), 'MMM d, yyyy')}
                </Text>
              </View>
            ) : (
              <View style={styles.detailRow}>
                <Calendar size={16} color={colors.slate[300]} />
                <Text style={styles.detailTextMuted}>No hire date set</Text>
              </View>
            )}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={18} color={colors.error[500]} />
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
          </View>
          {staffMember.staff_profile?.emergency_contact?.name ? (
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyName}>
                {staffMember.staff_profile.emergency_contact.name}
              </Text>
              {staffMember.staff_profile.emergency_contact.relationship && (
                <Text style={styles.emergencyRelation}>
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
                  <Phone size={14} color={colors.slate[400]} />
                  <Text style={styles.emergencyText}>
                    {staffMember.staff_profile.emergency_contact.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={styles.emptyText}>No emergency contact on file</Text>
          )}
        </View>

        {/* Schedule */}
        {isTabEnabled('schedule', currentHub?.settings?.enabledTabs) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color={colors.slate[500]} />
            <Text style={styles.sectionTitle}>Work Schedule</Text>
          </View>
          {schedules.length > 0 ? (
            <View style={styles.scheduleList}>
              {schedules.map((schedule) => (
                <View key={schedule.id} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDay}>{DAYS_OF_WEEK[schedule.day_of_week]}</Text>
                  <Text style={styles.scheduleTime}>
                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No schedule set</Text>
          )}
        </View>
        )}

        {/* Certifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithAction}>
            <View style={styles.sectionHeaderLeft}>
              <Shield size={18} color={colors.slate[500]} />
              <Text style={styles.sectionTitle}>Certifications</Text>
            </View>
            {canManage && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddCertModal(true)}
              >
                <Plus size={16} color={theme.light.primary} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {certifications.length > 0 ? (
            <View style={styles.certificationsList}>
              {certifications.map((cert) => {
                const status = getCertStatus(cert.expiry_date);
                return (
                  <View key={cert.id} style={styles.certificationItem}>
                    <View style={styles.certificationInfo}>
                      <Text style={styles.certificationName}>{cert.name}</Text>
                      {cert.issuer && (
                        <Text style={styles.certificationIssuer}>{cert.issuer}</Text>
                      )}
                      {cert.expiry_date && (
                        <Text style={styles.certificationDate}>
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
            <Text style={styles.emptyText}>No certifications on file</Text>
          )}
        </View>

        {/* Time Off */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithAction}>
            <View style={styles.sectionHeaderLeft}>
              <CalendarOff size={18} color={colors.slate[500]} />
              <Text style={styles.sectionTitle}>Time Off</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddTimeOffModal(true)}
            >
              <Plus size={16} color={theme.light.primary} />
              <Text style={styles.addButtonText}>Request</Text>
            </TouchableOpacity>
          </View>
          {timeOffRequests.length > 0 ? (
            <View style={styles.timeOffList}>
              {timeOffRequests.map((request) => {
                const statusStyle = getTimeOffStatusStyle(request.status);
                const typeInfo = TIME_OFF_TYPES[request.type] || TIME_OFF_TYPES.other;
                const StatusIcon = statusStyle.icon;
                return (
                  <View key={request.id} style={styles.timeOffItem}>
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
                      <Text style={styles.timeOffDates}>
                        {format(parseISO(request.start_date), 'MMM d')} -{' '}
                        {format(parseISO(request.end_date), 'MMM d, yyyy')}
                      </Text>
                      {request.notes && (
                        <Text style={styles.timeOffNotes} numberOfLines={2}>
                          {request.notes}
                        </Text>
                      )}
                      {/* Approve/Deny actions for managers on pending requests */}
                      {canManage && request.status === 'pending' && (
                        <View style={styles.timeOffActions}>
                          <TouchableOpacity
                            style={styles.approveButton}
                            onPress={() => handleTimeOffDecision(request.id, 'approved')}
                          >
                            <CheckCircle size={14} color={colors.success[600]} />
                            <Text style={styles.approveButtonText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.denyButton}
                            onPress={() => handleTimeOffDecision(request.id, 'denied')}
                          >
                            <XCircle size={14} color={colors.error[600]} />
                            <Text style={styles.denyButtonText}>Deny</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>No time off requests</Text>
          )}
        </View>

        {/* Responsibilities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={18} color={colors.slate[500]} />
            <Text style={styles.sectionTitle}>Responsibilities</Text>
          </View>
          {responsibilities.length > 0 ? (
            <View style={styles.responsibilitiesList}>
              {responsibilities.map((resp) => (
                <View key={resp.id} style={styles.responsibilityItem}>
                  <View style={styles.responsibilityBullet} />
                  <View style={styles.responsibilityContent}>
                    <Text style={styles.responsibilityTitle}>{resp.title}</Text>
                    {resp.description && (
                      <Text style={styles.responsibilityDesc}>{resp.description}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No responsibilities assigned</Text>
          )}
        </View>

        {/* Active Tasks (only for managers) */}
        {canManage && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithAction}>
              <View style={styles.sectionHeaderLeft}>
                <CheckSquare size={18} color={colors.slate[500]} />
                <Text style={styles.sectionTitle}>Active Tasks</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddTaskModal(true)}
              >
                <Plus size={16} color={theme.light.primary} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {tasks.length > 0 ? (
              <View style={styles.tasksList}>
                {tasks.map((task) => (
                  <View key={task.id} style={styles.taskItem}>
                    <TouchableOpacity
                      style={[styles.taskCheckbox, task.status === 'completed' && styles.taskCheckboxDone]}
                      onPress={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                    >
                      {task.status === 'completed' && <Check size={12} color={colors.white} />}
                    </TouchableOpacity>
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, task.status === 'completed' && styles.taskTitleDone]}>
                        {task.title}
                      </Text>
                      {task.due_date && (
                        <Text style={styles.taskDue}>
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
              <Text style={styles.emptyText}>No active tasks</Text>
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
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Task</Text>
              <TouchableOpacity onPress={() => setShowAddTaskModal(false)}>
                <X size={24} color={colors.slate[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { marginTop: 0 }]}>Task Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter task title"
                placeholderTextColor={colors.slate[400]}
                value={taskForm.title}
                onChangeText={(text) => setTaskForm({ ...taskForm, title: text })}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="Enter task description"
                placeholderTextColor={colors.slate[400]}
                value={taskForm.description}
                onChangeText={(text) => setTaskForm({ ...taskForm, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityOptions}>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      taskForm.priority === p && styles.priorityOptionActive,
                      taskForm.priority === p && { borderColor: getPriorityColor(p) },
                    ]}
                    onPress={() => setTaskForm({ ...taskForm, priority: p })}
                  >
                    <View style={[styles.priorityDotSmall, { backgroundColor: getPriorityColor(p) }]} />
                    <Text
                      style={[
                        styles.priorityOptionText,
                        taskForm.priority === p && { color: getPriorityColor(p) },
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 2024-02-15"
                placeholderTextColor={colors.slate[400]}
                value={taskForm.due_date}
                onChangeText={(text) => setTaskForm({ ...taskForm, due_date: text })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddTaskModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!taskForm.title.trim() || saving) && styles.saveButtonDisabled]}
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
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Certification</Text>
              <TouchableOpacity onPress={() => setShowAddCertModal(false)}>
                <X size={24} color={colors.slate[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { marginTop: 0 }]}>Certification Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., CPR/First Aid"
                placeholderTextColor={colors.slate[400]}
                value={certForm.name}
                onChangeText={(text) => setCertForm({ ...certForm, name: text })}
              />

              <Text style={styles.inputLabel}>Issuing Organization</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., American Red Cross"
                placeholderTextColor={colors.slate[400]}
                value={certForm.issuer}
                onChangeText={(text) => setCertForm({ ...certForm, issuer: text })}
              />

              <Text style={styles.inputLabel}>Issue Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 2024-01-15"
                placeholderTextColor={colors.slate[400]}
                value={certForm.issue_date}
                onChangeText={(text) => setCertForm({ ...certForm, issue_date: text })}
              />

              <Text style={styles.inputLabel}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 2026-01-15"
                placeholderTextColor={colors.slate[400]}
                value={certForm.expiry_date}
                onChangeText={(text) => setCertForm({ ...certForm, expiry_date: text })}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddCertModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, (!certForm.name.trim() || saving) && styles.saveButtonDisabled]}
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
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Time Off</Text>
              <TouchableOpacity onPress={() => setShowAddTimeOffModal(false)}>
                <X size={24} color={colors.slate[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { marginTop: 0 }]}>Type</Text>
              <View style={styles.typeOptions}>
                {(['vacation', 'sick', 'personal', 'other'] as const).map((t) => {
                  const typeInfo = TIME_OFF_TYPES[t];
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeOption,
                        timeOffForm.type === t && styles.typeOptionActive,
                        timeOffForm.type === t && { borderColor: typeInfo.color },
                      ]}
                      onPress={() => setTimeOffForm({ ...timeOffForm, type: t })}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          timeOffForm.type === t && { color: typeInfo.color },
                        ]}
                      >
                        {typeInfo.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 2024-02-01"
                placeholderTextColor={colors.slate[400]}
                value={timeOffForm.start_date}
                onChangeText={(text) => setTimeOffForm({ ...timeOffForm, start_date: text })}
              />

              <Text style={styles.inputLabel}>End Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 2024-02-05"
                placeholderTextColor={colors.slate[400]}
                value={timeOffForm.end_date}
                onChangeText={(text) => setTimeOffForm({ ...timeOffForm, end_date: text })}
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="Add any notes..."
                placeholderTextColor={colors.slate[400]}
                value={timeOffForm.notes}
                onChangeText={(text) => setTimeOffForm({ ...timeOffForm, notes: text })}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddTimeOffModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!timeOffForm.start_date || !timeOffForm.end_date || saving) && styles.saveButtonDisabled,
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
    color: theme.light.primary,
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
    color: theme.light.primary,
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
    backgroundColor: theme.light.primary,
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
    backgroundColor: theme.light.primary,
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
