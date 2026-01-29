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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  GripVertical,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

export default function LevelsScreen() {
  const router = useRouter();
  const { currentHub, currentRole } = useHubStore();

  const [levels, setLevels] = useState<string[]>([]);
  const [newLevel, setNewLevel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = ['owner', 'director', 'admin'].includes(currentRole || '');

  useEffect(() => {
    if (currentHub) {
      fetchLevels();
    }
  }, [currentHub]);

  const fetchLevels = async () => {
    if (!currentHub) return;

    try {
      const { data, error } = await supabase
        .from('hubs')
        .select('settings')
        .eq('id', currentHub.id)
        .single();

      if (error) throw error;
      setLevels(data?.settings?.levels || []);
    } catch (err) {
      console.error('Error fetching levels:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveLevels = async (newLevels: string[]) => {
    if (!currentHub || !isAdmin) return;
    setSaving(true);

    try {
      const { data: hubData } = await supabase
        .from('hubs')
        .select('settings')
        .eq('id', currentHub.id)
        .single();

      const currentSettings = hubData?.settings || {};

      const { error } = await supabase
        .from('hubs')
        .update({
          settings: { ...currentSettings, levels: newLevels },
        })
        .eq('id', currentHub.id);

      if (error) throw error;
      setLevels(newLevels);
    } catch (err) {
      console.error('Error saving levels:', err);
      Alert.alert('Error', 'Failed to save levels');
    } finally {
      setSaving(false);
    }
  };

  const addLevel = () => {
    const trimmed = newLevel.trim();
    if (!trimmed) return;

    if (levels.includes(trimmed)) {
      Alert.alert('Error', 'This level already exists');
      return;
    }

    const newLevels = [...levels, trimmed];
    saveLevels(newLevels);
    setNewLevel('');
  };

  const removeLevel = (index: number) => {
    Alert.alert(
      'Remove Level',
      `Are you sure you want to remove "${levels[index]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const newLevels = levels.filter((_, i) => i !== index);
            saveLevels(newLevels);
          },
        },
      ]
    );
  };

  const moveLevel = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= levels.length) return;

    const newLevels = [...levels];
    const [removed] = newLevels.splice(fromIndex, 1);
    newLevels.splice(toIndex, 0, removed);
    saveLevels(newLevels);
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
        <Text style={styles.description}>
          Competition levels are used to categorize gymnasts and filter them in competitions and
          reports. Drag to reorder levels.
        </Text>

        {/* Add New Level */}
        <View style={styles.addSection}>
          <TextInput
            style={styles.addInput}
            placeholder="Enter new level (e.g., Level 3)"
            placeholderTextColor={colors.slate[400]}
            value={newLevel}
            onChangeText={setNewLevel}
            onSubmitEditing={addLevel}
          />
          <TouchableOpacity
            style={[styles.addButton, (!newLevel.trim() || saving) && styles.addButtonDisabled]}
            onPress={addLevel}
            disabled={!newLevel.trim() || saving}
          >
            <Plus size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Levels List */}
        {levels.length > 0 ? (
          <View style={styles.levelsCard}>
            {levels.map((level, index) => (
              <View key={level} style={styles.levelItem}>
                <View style={styles.levelDrag}>
                  <TouchableOpacity
                    onPress={() => moveLevel(index, index - 1)}
                    disabled={index === 0}
                    style={{ opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <GripVertical size={20} color={colors.slate[400]} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.levelText}>{level}</Text>
                <View style={styles.levelActions}>
                  <TouchableOpacity
                    style={styles.levelActionBtn}
                    onPress={() => removeLevel(index)}
                  >
                    <Trash2 size={18} color={colors.error[600]} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Levels Configured</Text>
            <Text style={styles.emptyText}>
              Add competition levels above to get started
            </Text>
          </View>
        )}

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
  },
  description: {
    fontSize: 14,
    color: colors.slate[600],
    lineHeight: 20,
    marginBottom: 20,
  },
  addSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.slate[900],
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
  levelsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  levelDrag: {
    marginRight: 12,
  },
  levelText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[900],
  },
  levelActions: {
    flexDirection: 'row',
    gap: 8,
  },
  levelActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[50],
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
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
