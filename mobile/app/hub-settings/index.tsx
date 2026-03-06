import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Shield,
  Layers,
  Link2,
  Gift,
  AlertCircle,
  ChevronRight,
  Cake,
  Building2,
  Trash2,
  Palette,
  Check,
  Loader2,
} from 'lucide-react-native';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { ACCENT_PRESETS, ACCENT_LABELS, ACCENT_PRESET_NAMES } from '../../src/constants/accentColors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface HubSettings {
  showBirthdays?: boolean;
  allowAnonymousReports?: boolean;
  levels?: string[];
}

export default function HubSettingsScreen() {
  const { t, isDark, accent } = useTheme();
  const router = useRouter();
  const currentHub = useHubStore((state) => state.currentHub);
  const currentRole = useHubStore((state) => state.currentRole);
  const refreshHub = useHubStore((state) => state.refreshHub);

  const [settings, setSettings] = useState<HubSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAccent, setSavingAccent] = useState(false);

  const isOwner = currentRole === 'owner';
  const canManageSettings = ['owner', 'director'].includes(currentRole || '');

  useEffect(() => {
    if (currentHub) {
      fetchSettings();
    }
  }, [currentHub]);

  const fetchSettings = async () => {
    if (!currentHub) return;

    try {
      const { data, error } = await supabase
        .from('hubs')
        .select('settings')
        .eq('id', currentHub.id)
        .single();

      if (error) throw error;
      setSettings(data?.settings || {});
    } catch (err) {
      console.error('Error fetching hub settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof HubSettings, value: any) => {
    if (!currentHub || !canManageSettings) return;
    setSaving(true);

    try {
      const newSettings = { ...settings, [key]: value };
      const { error } = await supabase
        .from('hubs')
        .update({ settings: newSettings })
        .eq('id', currentHub.id);

      if (error) throw error;
      setSettings(newSettings);
    } catch (err) {
      console.error('Error updating setting:', err);
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const handleAccentColorChange = async (preset: string) => {
    if (!currentHub || savingAccent) return;
    setSavingAccent(true);

    try {
      const updatedSettings = { ...currentHub.settings, accentColor: preset };
      const { error } = await supabase
        .from('hubs')
        .update({ settings: updatedSettings })
        .eq('id', currentHub.id);

      if (error) throw error;
      await refreshHub();
    } catch (err) {
      console.error('Error saving accent color:', err);
      Alert.alert('Error', 'Failed to save accent color');
    } finally {
      setSavingAccent(false);
    }
  };

  const handleDeleteHub = () => {
    Alert.alert(
      'Delete Hub',
      'Are you sure you want to delete this hub? This action cannot be undone and will delete all associated data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('hubs')
                .delete()
                .eq('id', currentHub?.id);

              if (error) throw error;
              router.replace('/hub-selection');
            } catch (err) {
              console.error('Error deleting hub:', err);
              Alert.alert('Error', 'Failed to delete hub');
            }
          },
        },
      ]
    );
  };

  if (!currentHub) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <Text style={[styles.errorText, { color: t.textMuted }]}>No hub selected</Text>
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} contentContainerStyle={styles.content}>
      {/* Hub Info */}
      <View style={styles.section}>
        <View style={[styles.hubInfoCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={[styles.hubIcon, { backgroundColor: `${t.primary}18` }]}>
            <Building2 size={28} color={t.primary} />
          </View>
          <Text style={[styles.hubName, { color: t.text }]}>{currentHub.name}</Text>
          <Text style={[styles.hubRole, { color: t.textMuted }]}>
            {currentRole?.charAt(0).toUpperCase()}{currentRole?.slice(1)}
          </Text>
        </View>
      </View>

      {/* Accent Color Picker - Admin only */}
      {canManageSettings && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.textMuted }]}>Appearance</Text>
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.accentSection}>
              <View style={styles.accentHeader}>
                <Palette size={16} color={t.textMuted} />
                <Text style={[styles.accentLabel, { color: t.text }]}>Accent Color</Text>
                {savingAccent && <ActivityIndicator size="small" color={t.primary} />}
              </View>
              <Text style={[styles.accentDescription, { color: t.textMuted }]}>
                Choose your team's accent color for buttons, badges, and highlights.
              </Text>
              <View style={styles.accentGrid}>
                {ACCENT_PRESET_NAMES.map((name) => {
                  const shades = ACCENT_PRESETS[name];
                  const isSelected = (currentHub?.settings?.accentColor || 'mint') === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={styles.accentOption}
                      onPress={() => handleAccentColorChange(name)}
                      disabled={savingAccent}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.accentSwatch,
                          { backgroundColor: shades['500'] },
                          isSelected && [styles.accentSwatchSelected, { borderColor: t.text }],
                        ]}
                      >
                        {isSelected && <Check size={14} color="#fff" />}
                      </View>
                      <Text
                        style={[
                          styles.accentName,
                          { color: isSelected ? t.text : t.textFaint },
                          isSelected && { fontWeight: '600' },
                        ]}
                      >
                        {ACCENT_LABELS[name]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Navigation Items */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.textMuted }]}>Settings</Text>
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          {/* Permissions - Owner only */}
          {isOwner && (
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => router.push('/hub-settings/permissions')}
            >
              <View style={[styles.navIcon, { backgroundColor: colors.brand[50] }]}>
                <Shield size={20} color={colors.brand[600]} />
              </View>
              <View style={styles.navContent}>
                <Text style={[styles.navLabel, { color: t.text }]}>Permissions</Text>
                <Text style={[styles.navDescription, { color: t.textMuted }]}>Manage role permissions</Text>
              </View>
              <ChevronRight size={20} color={t.textFaint} />
            </TouchableOpacity>
          )}

          {/* Levels */}
          {canManageSettings && (
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => router.push('/hub-settings/levels')}
            >
              <View style={[styles.navIcon, { backgroundColor: colors.amber[50] }]}>
                <Layers size={20} color={colors.amber[600]} />
              </View>
              <View style={styles.navContent}>
                <Text style={[styles.navLabel, { color: t.text }]}>Competition Levels</Text>
                <Text style={[styles.navDescription, { color: t.textMuted }]}>
                  {(settings.levels || []).length} levels configured
                </Text>
              </View>
              <ChevronRight size={20} color={t.textFaint} />
            </TouchableOpacity>
          )}

          {/* Invite Codes */}
          {canManageSettings && (
            <TouchableOpacity
              style={[styles.navItem, { borderBottomWidth: 0 }]}
              onPress={() => router.push('/hub-settings/invite-codes')}
            >
              <View style={[styles.navIcon, { backgroundColor: colors.indigo[50] }]}>
                <Link2 size={20} color={colors.indigo[600]} />
              </View>
              <View style={styles.navContent}>
                <Text style={[styles.navLabel, { color: t.text }]}>Invite Codes</Text>
                <Text style={[styles.navDescription, { color: t.textMuted }]}>Manage invite links</Text>
              </View>
              <ChevronRight size={20} color={t.textFaint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Toggles */}
      {canManageSettings && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: t.textMuted }]}>Quick Settings</Text>
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.toggleItem}>
              <View style={[styles.navIcon, { backgroundColor: colors.pink[50] }]}>
                <Cake size={20} color={colors.pink[600]} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={[styles.toggleLabel, { color: t.text }]}>Show Birthdays</Text>
                <Text style={[styles.toggleDescription, { color: t.textMuted }]}>Display upcoming birthdays</Text>
              </View>
              <Switch
                value={settings.showBirthdays ?? true}
                onValueChange={(value) => updateSetting('showBirthdays', value)}
                trackColor={{ false: isDark ? colors.slate[600] : colors.slate[200], true: `${t.primary}60` }}
                thumbColor={settings.showBirthdays ? t.primary : t.textFaint}
                disabled={saving}
              />
            </View>

            <View style={[styles.toggleItem, { borderBottomWidth: 0 }]}>
              <View style={[styles.navIcon, { backgroundColor: colors.purple[50] }]}>
                <AlertCircle size={20} color={colors.purple[600]} />
              </View>
              <View style={styles.toggleContent}>
                <Text style={[styles.toggleLabel, { color: t.text }]}>Anonymous Reports</Text>
                <Text style={[styles.toggleDescription, { color: t.textMuted }]}>Allow anonymous reporting</Text>
              </View>
              <Switch
                value={settings.allowAnonymousReports ?? false}
                onValueChange={(value) => updateSetting('allowAnonymousReports', value)}
                trackColor={{ false: isDark ? colors.slate[600] : colors.slate[200], true: `${t.primary}60` }}
                thumbColor={settings.allowAnonymousReports ? t.primary : t.textFaint}
                disabled={saving}
              />
            </View>
          </View>
        </View>
      )}

      {/* Danger Zone - Owner only */}
      {isOwner && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.error[600] }]}>Danger Zone</Text>
          <View style={[styles.card, styles.dangerCard]}>
            <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteHub}>
              <Trash2 size={20} color={colors.error[600]} />
              <Text style={styles.dangerButtonText}>Delete Hub</Text>
            </TouchableOpacity>
            <Text style={styles.dangerWarning}>
              This will permanently delete the hub and all associated data.
            </Text>
          </View>
        </View>
      )}

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
  errorText: {
    fontSize: 16,
    color: colors.slate[500],
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[500],
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  hubInfoCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  hubIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  hubName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.slate[900],
    marginBottom: 4,
  },
  hubRole: {
    fontSize: 14,
    color: colors.slate[500],
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navContent: {
    flex: 1,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  navDescription: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  toggleContent: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  accentSection: {
    padding: 16,
  },
  accentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  accentLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  accentDescription: {
    fontSize: 13,
    marginBottom: 14,
  },
  accentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accentOption: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  accentSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentSwatchSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  accentName: {
    fontSize: 10,
    fontWeight: '500',
  },
  dangerCard: {
    borderColor: colors.error[200],
    backgroundColor: colors.error[50],
    padding: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error[300],
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error[600],
  },
  dangerWarning: {
    fontSize: 12,
    color: colors.error[600],
    textAlign: 'center',
    marginTop: 10,
  },
});
