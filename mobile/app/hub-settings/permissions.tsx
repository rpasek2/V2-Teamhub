import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface Permission {
  feature: string;
  label: string;
  description: string;
}

interface RolePermissions {
  [feature: string]: 'all' | 'own' | 'none';
}

const FEATURES: Permission[] = [
  { feature: 'roster', label: 'Roster', description: 'View and manage gymnast roster' },
  { feature: 'calendar', label: 'Calendar', description: 'View and manage calendar events' },
  { feature: 'messages', label: 'Messages', description: 'Access direct messages' },
  { feature: 'groups', label: 'Groups', description: 'View and manage groups' },
  { feature: 'scores', label: 'Scores', description: 'View and manage scores' },
  { feature: 'skills', label: 'Skills', description: 'View and manage skills tracking' },
  { feature: 'attendance', label: 'Attendance', description: 'View and manage attendance' },
  { feature: 'assignments', label: 'Assignments', description: 'View and manage assignments' },
  { feature: 'schedule', label: 'Schedule', description: 'View and manage schedule' },
  { feature: 'marketplace', label: 'Marketplace', description: 'Access marketplace' },
];

const ROLES = ['director', 'admin', 'coach', 'parent', 'athlete'];
const SCOPES = ['all', 'own', 'none'] as const;

const SCOPE_LABELS: Record<string, string> = {
  all: 'All',
  own: 'Own Only',
  none: 'None',
};

export default function PermissionsScreen() {
  const { currentHub, currentRole } = useHubStore();

  const [permissions, setPermissions] = useState<Record<string, RolePermissions>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(['coach', 'parent']));

  const isOwner = currentRole === 'owner';

  useEffect(() => {
    if (currentHub) {
      fetchPermissions();
    }
  }, [currentHub]);

  const fetchPermissions = async () => {
    if (!currentHub) return;

    try {
      const { data, error } = await supabase
        .from('hubs')
        .select('settings')
        .eq('id', currentHub.id)
        .single();

      if (error) throw error;

      // Get permissions from settings or use defaults
      const hubPermissions = data?.settings?.permissions || {};

      // Build initial permissions object with defaults
      const defaultPerms: Record<string, RolePermissions> = {};
      ROLES.forEach((role) => {
        defaultPerms[role] = {};
        FEATURES.forEach((f) => {
          // Default: staff roles get 'all', parents get 'own', athletes get 'own'
          const defaultScope =
            ['director', 'admin', 'coach'].includes(role)
              ? 'all'
              : role === 'parent'
              ? 'own'
              : 'own';
          defaultPerms[role][f.feature] = hubPermissions[role]?.[f.feature] || defaultScope;
        });
      });

      setPermissions(defaultPerms);
    } catch (err) {
      console.error('Error fetching permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (role: string, feature: string, scope: typeof SCOPES[number]) => {
    if (!currentHub || !isOwner) return;

    setSaving(true);

    try {
      const newPermissions = {
        ...permissions,
        [role]: {
          ...permissions[role],
          [feature]: scope,
        },
      };

      // Get current settings
      const { data: hubData } = await supabase
        .from('hubs')
        .select('settings')
        .eq('id', currentHub.id)
        .single();

      const currentSettings = hubData?.settings || {};

      const { error } = await supabase
        .from('hubs')
        .update({
          settings: {
            ...currentSettings,
            permissions: newPermissions,
          },
        })
        .eq('id', currentHub.id);

      if (error) throw error;
      setPermissions(newPermissions);
    } catch (err) {
      console.error('Error updating permission:', err);
      Alert.alert('Error', 'Failed to update permission');
    } finally {
      setSaving(false);
    }
  };

  const toggleRoleExpanded = (role: string) => {
    setExpandedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  };

  const cycleScope = (role: string, feature: string) => {
    const currentScope = permissions[role]?.[feature] || 'all';
    const currentIndex = SCOPES.indexOf(currentScope as typeof SCOPES[number]);
    const nextIndex = (currentIndex + 1) % SCOPES.length;
    updatePermission(role, feature, SCOPES[nextIndex]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={styles.loadingContainer}>
        <Shield size={48} color={colors.slate[300]} />
        <Text style={styles.errorTitle}>Owner Access Required</Text>
        <Text style={styles.errorText}>
          Only the hub owner can manage permissions
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Configure what each role can access. Tap a permission to cycle through All, Own Only, and
          None.
        </Text>

        {ROLES.map((role) => {
          const isExpanded = expandedRoles.has(role);
          const rolePermissions = permissions[role] || {};

          return (
            <View key={role} style={styles.roleCard}>
              <TouchableOpacity
                style={styles.roleHeader}
                onPress={() => toggleRoleExpanded(role)}
              >
                <Text style={styles.roleName}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
                {isExpanded ? (
                  <ChevronUp size={20} color={colors.slate[400]} />
                ) : (
                  <ChevronDown size={20} color={colors.slate[400]} />
                )}
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.permissionsList}>
                  {FEATURES.map((feature) => {
                    const scope = rolePermissions[feature.feature] || 'all';
                    const scopeColor =
                      scope === 'all'
                        ? colors.emerald[600]
                        : scope === 'own'
                        ? colors.amber[600]
                        : colors.slate[400];

                    return (
                      <TouchableOpacity
                        key={feature.feature}
                        style={styles.permissionItem}
                        onPress={() => cycleScope(role, feature.feature)}
                        disabled={saving}
                      >
                        <View style={styles.permissionInfo}>
                          <Text style={styles.permissionLabel}>{feature.label}</Text>
                        </View>
                        <View
                          style={[
                            styles.scopeBadge,
                            {
                              backgroundColor:
                                scope === 'all'
                                  ? colors.emerald[100]
                                  : scope === 'own'
                                  ? colors.amber[100]
                                  : colors.slate[100],
                            },
                          ]}
                        >
                          <Text style={[styles.scopeText, { color: scopeColor }]}>
                            {SCOPE_LABELS[scope]}
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

        <View style={{ height: 20 }} />
      </ScrollView>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
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
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 16,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.slate[600],
    lineHeight: 20,
    marginBottom: 20,
  },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 12,
    overflow: 'hidden',
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.slate[50],
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  permissionsList: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  permissionInfo: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 14,
    color: colors.slate[800],
  },
  scopeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  scopeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  savingOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.slate[800],
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  savingText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
});
