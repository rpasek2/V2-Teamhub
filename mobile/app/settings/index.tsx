import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Camera,
  Lock,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/authStore';

export default function UserSettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [profile, setProfile] = useState<{
    full_name: string;
    organization: string;
    avatar_url: string | null;
    created_at: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');

  // Password section
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, organization, avatar_url, created_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFullName(data.full_name || '');
      setOrganization(data.organization || '');
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          organization: organization.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      fetchProfile();
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos to upload an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploadingAvatar(true);

      const asset = result.assets[0];
      const fileExt = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.id}/avatar-${Date.now()}.${fileExt}`;

      // Fetch the image as a blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // Convert blob to arraybuffer
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      fetchProfile();
      Alert.alert('Success', 'Avatar updated successfully');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      Alert.alert('Error', 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      console.error('Error changing password:', err);
      Alert.alert('Error', err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              // Delete profile (cascade should handle related data)
              const { error: deleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user?.id);

              if (deleteError) throw deleteError;

              // Sign out
              await supabase.auth.signOut();
              router.replace('/');
            } catch (err) {
              console.error('Error deleting account:', err);
              Alert.alert('Error', 'Failed to delete account');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Password requirements check
  const passwordRequirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(newPassword) },
    { label: 'Contains a letter', met: /[a-zA-Z]/.test(newPassword) },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          {/* Avatar */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickAndUploadAvatar}
            disabled={uploadingAvatar}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={40} color={colors.slate[400]} />
              </View>
            )}
            <View style={styles.avatarOverlay}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Camera size={20} color={colors.white} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>

          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={colors.slate[400]}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Organization */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Organization</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your organization"
              placeholderTextColor={colors.slate[400]}
              value={organization}
              onChangeText={setOrganization}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setShowPasswordSection(!showPasswordSection)}
        >
          <View style={styles.sectionHeaderLeft}>
            <Lock size={20} color={colors.slate[600]} />
            <Text style={styles.sectionTitle}>Change Password</Text>
          </View>
          {showPasswordSection ? (
            <ChevronUp size={20} color={colors.slate[400]} />
          ) : (
            <ChevronDown size={20} color={colors.slate[400]} />
          )}
        </TouchableOpacity>

        {showPasswordSection && (
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={colors.slate[400]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={colors.slate[400]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsList}>
              {passwordRequirements.map((req, index) => (
                <View key={index} style={styles.requirementItem}>
                  {req.met ? (
                    <Check size={14} color={colors.emerald[600]} />
                  ) : (
                    <X size={14} color={colors.slate[400]} />
                  )}
                  <Text
                    style={[
                      styles.requirementText,
                      req.met && styles.requirementMet,
                    ]}
                  >
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (changingPassword || newPassword.length < 8 || newPassword !== confirmPassword) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={changePassword}
              disabled={changingPassword || newPassword.length < 8 || newPassword !== confirmPassword}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Account Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Info</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User size={16} color={colors.slate[500]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.id || '-'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Mail size={16} color={colors.slate[500]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || '-'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoIcon}>
              <Calendar size={16} color={colors.slate[500]} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoValue}>
                {profile?.created_at
                  ? format(new Date(profile.created_at), 'MMMM d, yyyy')
                  : '-'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setShowDeleteSection(!showDeleteSection)}
        >
          <View style={styles.sectionHeaderLeft}>
            <AlertTriangle size={20} color={colors.error[600]} />
            <Text style={[styles.sectionTitle, { color: colors.error[600] }]}>
              Danger Zone
            </Text>
          </View>
          {showDeleteSection ? (
            <ChevronUp size={20} color={colors.slate[400]} />
          ) : (
            <ChevronDown size={20} color={colors.slate[400]} />
          )}
        </TouchableOpacity>

        {showDeleteSection && (
          <View style={[styles.card, styles.dangerCard]}>
            <Text style={styles.dangerTitle}>Delete Account</Text>
            <Text style={styles.dangerText}>
              Once you delete your account, there is no going back. This will permanently delete all
              your data including hub memberships, posts, and settings.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type DELETE to confirm</Text>
              <TextInput
                style={[styles.input, styles.dangerInput]}
                placeholder="DELETE"
                placeholderTextColor={colors.slate[400]}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                (deleting || deleteConfirmText !== 'DELETE') && styles.deleteButtonDisabled,
              ]}
              onPress={deleteAccount}
              disabled={deleting || deleteConfirmText !== 'DELETE'}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 12,
    color: colors.slate[500],
    textAlign: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 6,
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
  saveButton: {
    backgroundColor: colors.brand[600],
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  requirementsList: {
    marginBottom: 16,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
    color: colors.slate[500],
  },
  requirementMet: {
    color: colors.emerald[600],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.slate[500],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: colors.slate[900],
  },
  dangerCard: {
    borderColor: colors.error[200],
    backgroundColor: colors.error[50],
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error[700],
    marginBottom: 8,
  },
  dangerText: {
    fontSize: 14,
    color: colors.error[600],
    lineHeight: 20,
    marginBottom: 16,
  },
  dangerInput: {
    borderColor: colors.error[300],
  },
  deleteButton: {
    backgroundColor: colors.error[600],
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonDisabled: {
    backgroundColor: colors.error[300],
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
