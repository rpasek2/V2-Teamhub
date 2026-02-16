import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Plus,
  Copy,
  Trash2,
  X,
  Check,
  Users,
  Calendar,
  Link2,
} from 'lucide-react-native';
import { format, addDays } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';

interface InviteCode {
  id: string;
  code: string;
  role: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLES = [
  { value: 'coach', label: 'Coach' },
  { value: 'parent', label: 'Parent' },
  { value: 'athlete', label: 'Athlete' },
];

export default function InviteCodesScreen() {
  const currentHub = useHubStore((state) => state.currentHub);
  const currentRole = useHubStore((state) => state.currentRole);
  const user = useAuthStore((state) => state.user);

  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [newCodeRole, setNewCodeRole] = useState('parent');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState('');
  const [newCodeExpiresIn, setNewCodeExpiresIn] = useState('7'); // days

  const isAdmin = ['owner', 'director', 'admin'].includes(currentRole || '');

  useEffect(() => {
    if (currentHub) {
      fetchCodes();
    }
  }, [currentHub]);

  const fetchCodes = async () => {
    if (!currentHub) return;

    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('id, code, role, max_uses, uses, expires_at, is_active, created_at')
        .eq('hub_id', currentHub.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (err) {
      console.error('Error fetching invite codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createCode = async () => {
    if (!currentHub || !user) return;
    setCreating(true);

    try {
      const code = generateCode();
      const maxUses = newCodeMaxUses ? parseInt(newCodeMaxUses, 10) : null;
      const expiresAt = newCodeExpiresIn
        ? addDays(new Date(), parseInt(newCodeExpiresIn, 10)).toISOString()
        : null;

      const { error } = await supabase.from('invite_codes').insert({
        hub_id: currentHub.id,
        code,
        role: newCodeRole,
        max_uses: maxUses,
        expires_at: expiresAt,
        created_by: user.id,
        is_active: true,
        uses: 0,
      });

      if (error) throw error;

      setShowCreateModal(false);
      setNewCodeRole('parent');
      setNewCodeMaxUses('');
      setNewCodeExpiresIn('7');
      fetchCodes();

      Alert.alert('Success', `Invite code created: ${code}`);
    } catch (err) {
      console.error('Error creating invite code:', err);
      Alert.alert('Error', 'Failed to create invite code');
    } finally {
      setCreating(false);
    }
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', 'Invite code copied to clipboard');
  };

  const toggleCodeActive = async (codeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({ is_active: !isActive })
        .eq('id', codeId);

      if (error) throw error;
      fetchCodes();
    } catch (err) {
      console.error('Error toggling code:', err);
    }
  };

  const deleteCode = (codeId: string) => {
    Alert.alert(
      'Delete Code',
      'Are you sure you want to delete this invite code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('invite_codes')
                .delete()
                .eq('id', codeId);

              if (error) throw error;
              fetchCodes();
            } catch (err) {
              console.error('Error deleting code:', err);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Create Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color={colors.white} />
          <Text style={styles.createButtonText}>Create Invite Code</Text>
        </TouchableOpacity>

        {/* Codes List */}
        {codes.length > 0 ? (
          codes.map((code) => {
            const isExpired = !!(code.expires_at && new Date(code.expires_at) < new Date());
            const isMaxed = !!(code.max_uses && code.uses >= code.max_uses);
            const isDisabled = !code.is_active || isExpired || isMaxed;

            return (
              <View
                key={code.id}
                style={[styles.codeCard, isDisabled && styles.codeCardDisabled]}
              >
                <View style={styles.codeHeader}>
                  <View style={styles.codeMain}>
                    <Text style={[styles.codeText, isDisabled && styles.codeTextDisabled]}>
                      {code.code}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyBtn}
                      onPress={() => copyCode(code.code)}
                    >
                      <Copy size={16} color={colors.brand[600]} />
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: isDisabled ? colors.slate[100] : colors.brand[100] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        { color: isDisabled ? colors.slate[500] : colors.brand[700] },
                      ]}
                    >
                      {code.role.charAt(0).toUpperCase() + code.role.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.codeStats}>
                  <View style={styles.codeStat}>
                    <Users size={14} color={colors.slate[400]} />
                    <Text style={styles.codeStatText}>
                      {code.uses}{code.max_uses ? `/${code.max_uses}` : ''} uses
                    </Text>
                  </View>
                  {code.expires_at && (
                    <View style={styles.codeStat}>
                      <Calendar size={14} color={isExpired ? colors.error[500] : colors.slate[400]} />
                      <Text
                        style={[
                          styles.codeStatText,
                          isExpired && { color: colors.error[500] },
                        ]}
                      >
                        {isExpired
                          ? 'Expired'
                          : `Expires ${format(new Date(code.expires_at), 'MMM d')}`}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.codeActions}>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      code.is_active ? styles.toggleBtnActive : styles.toggleBtnInactive,
                    ]}
                    onPress={() => toggleCodeActive(code.id, code.is_active)}
                  >
                    {code.is_active ? (
                      <>
                        <Check size={14} color={colors.emerald[600]} />
                        <Text style={[styles.toggleText, { color: colors.emerald[600] }]}>
                          Active
                        </Text>
                      </>
                    ) : (
                      <>
                        <X size={14} color={colors.slate[500]} />
                        <Text style={[styles.toggleText, { color: colors.slate[500] }]}>
                          Inactive
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteCode(code.id)}
                  >
                    <Trash2 size={16} color={colors.error[600]} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Link2 size={40} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>No Invite Codes</Text>
            <Text style={styles.emptyText}>
              Create invite codes to allow others to join this hub
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Invite Code</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={colors.slate[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Role Selection */}
              <Text style={styles.inputLabel}>Role</Text>
              <View style={styles.rolePicker}>
                {ROLES.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleOption,
                      newCodeRole === role.value && styles.roleOptionSelected,
                    ]}
                    onPress={() => setNewCodeRole(role.value)}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newCodeRole === role.value && styles.roleOptionTextSelected,
                      ]}
                    >
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Max Uses */}
              <Text style={styles.inputLabel}>Max Uses (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Unlimited"
                placeholderTextColor={colors.slate[400]}
                keyboardType="number-pad"
                value={newCodeMaxUses}
                onChangeText={setNewCodeMaxUses}
              />

              {/* Expires In */}
              <Text style={styles.inputLabel}>Expires In (days)</Text>
              <View style={styles.expiryPicker}>
                {['7', '14', '30', ''].map((days) => (
                  <TouchableOpacity
                    key={days || 'never'}
                    style={[
                      styles.expiryOption,
                      newCodeExpiresIn === days && styles.expiryOptionSelected,
                    ]}
                    onPress={() => setNewCodeExpiresIn(days)}
                  >
                    <Text
                      style={[
                        styles.expiryOptionText,
                        newCodeExpiresIn === days && styles.expiryOptionTextSelected,
                      ]}
                    >
                      {days ? `${days} days` : 'Never'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, creating && styles.confirmBtnDisabled]}
                onPress={createCode}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>Create Code</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scrollView: {
    flex: 1,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand[600],
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  codeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  codeCardDisabled: {
    opacity: 0.6,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  codeTextDisabled: {
    color: colors.slate[400],
  },
  copyBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.brand[50],
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  codeStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  codeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  codeStatText: {
    fontSize: 13,
    color: colors.slate[500],
  },
  codeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.emerald[50],
  },
  toggleBtnInactive: {
    backgroundColor: colors.slate[100],
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.error[50],
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
    marginBottom: 8,
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
  rolePicker: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  roleOptionSelected: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[600],
  },
  roleOptionTextSelected: {
    color: colors.white,
  },
  expiryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  expiryOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  expiryOptionSelected: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  expiryOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  expiryOptionTextSelected: {
    color: colors.white,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[600],
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: colors.slate[300],
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
