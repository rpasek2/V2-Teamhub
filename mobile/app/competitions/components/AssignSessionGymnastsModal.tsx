import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Check, ChevronDown, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, theme } from '../../../src/constants/colors';
import { supabase } from '../../../src/services/supabase';

interface Gymnast {
  gymnast_profile_id: string;
  gymnast_profiles: {
    id: string;
    first_name: string;
    last_name: string;
    level: string | null;
  };
}

interface AssignSessionGymnastsModalProps {
  visible: boolean;
  onClose: () => void;
  onGymnastsAssigned: () => void;
  sessionId: string;
  sessionName: string;
  competitionId: string;
  currentGymnastIds: string[];
  hubLevels: string[];
}

interface Section {
  title: string;
  data: Gymnast[];
}

export function AssignSessionGymnastsModal({
  visible,
  onClose,
  onGymnastsAssigned,
  sessionId,
  sessionName,
  competitionId,
  currentGymnastIds,
  hubLevels,
}: AssignSessionGymnastsModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [roster, setRoster] = useState<Gymnast[]>([]);
  const [selectedGymnasts, setSelectedGymnasts] = useState<Set<string>>(new Set());
  const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      fetchCompetitionRoster();
      setSelectedGymnasts(new Set(currentGymnastIds));
    }
  }, [visible, competitionId, currentGymnastIds]);

  const fetchCompetitionRoster = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('competition_gymnasts')
      .select('gymnast_profile_id, gymnast_profiles(id, first_name, last_name, level)')
      .eq('competition_id', competitionId);

    if (error) {
      console.error('Error fetching competition roster:', error);
    } else if (data) {
      const mapped = data.map((d: { gymnast_profile_id: string; gymnast_profiles: { id: string; first_name: string; last_name: string; level: string | null } | { id: string; first_name: string; last_name: string; level: string | null }[] }) => ({
        gymnast_profile_id: d.gymnast_profile_id,
        gymnast_profiles: Array.isArray(d.gymnast_profiles) ? d.gymnast_profiles[0] : d.gymnast_profiles,
      }));
      setRoster(mapped as Gymnast[]);
    }
    setFetching(false);
  };

  // Group roster by level into sections
  const sections = useMemo(() => {
    const grouped: Record<string, Gymnast[]> = {};

    roster.forEach((gymnast) => {
      const level = gymnast.gymnast_profiles?.level || 'Unassigned';
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(gymnast);
    });

    // Sort levels based on hub settings order
    const sortedLevels = hubLevels.filter((l: string) => grouped[l]);
    const unlistedLevels = Object.keys(grouped).filter(
      (l) => !hubLevels.includes(l) && l !== 'Unassigned'
    );
    const orderedKeys = [...sortedLevels, ...unlistedLevels];
    if (grouped['Unassigned']) orderedKeys.push('Unassigned');

    return orderedKeys.map((level) => ({
      title: level,
      data: grouped[level].sort((a, b) =>
        (a.gymnast_profiles?.last_name || '').localeCompare(b.gymnast_profiles?.last_name || '')
      ),
    }));
  }, [roster, hubLevels]);

  const toggleLevelCollapse = (level: string) => {
    setCollapsedLevels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  const toggleGymnast = (gymnastProfileId: string) => {
    setSelectedGymnasts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(gymnastProfileId)) {
        newSet.delete(gymnastProfileId);
      } else {
        newSet.add(gymnastProfileId);
      }
      return newSet;
    });
  };

  const toggleLevel = (level: string) => {
    const levelGymnastIds = sections
      .find((s) => s.title === level)
      ?.data.map((g) => g.gymnast_profile_id) || [];

    const allSelected = levelGymnastIds.every((id) => selectedGymnasts.has(id));

    setSelectedGymnasts((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        // Deselect all in this level
        levelGymnastIds.forEach((id) => newSet.delete(id));
      } else {
        // Select all in this level
        levelGymnastIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  const isLevelFullySelected = (level: string) => {
    const levelGymnastIds = sections
      .find((s) => s.title === level)
      ?.data.map((g) => g.gymnast_profile_id) || [];
    return levelGymnastIds.length > 0 && levelGymnastIds.every((id) => selectedGymnasts.has(id));
  };

  const isLevelPartiallySelected = (level: string) => {
    const levelGymnastIds = sections
      .find((s) => s.title === level)
      ?.data.map((g) => g.gymnast_profile_id) || [];
    const selectedCount = levelGymnastIds.filter((id) => selectedGymnasts.has(id)).length;
    return selectedCount > 0 && selectedCount < levelGymnastIds.length;
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const currentSet = new Set(currentGymnastIds);
      const toAdd = [...selectedGymnasts].filter((id) => !currentSet.has(id));
      const toRemove = currentGymnastIds.filter((id) => !selectedGymnasts.has(id));

      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('session_gymnasts')
          .insert(toAdd.map((gymnastProfileId) => ({ session_id: sessionId, gymnast_profile_id: gymnastProfileId })));
        if (addError) throw addError;
      }

      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('session_gymnasts')
          .delete()
          .eq('session_id', sessionId)
          .in('gymnast_profile_id', toRemove);
        if (removeError) throw removeError;
      }

      onGymnastsAssigned();
      onClose();
    } catch (err) {
      console.error('Error assigning gymnasts:', err);
      Alert.alert('Error', 'Failed to assign gymnasts');
    } finally {
      setLoading(false);
    }
  };

  const renderSectionHeader = ({ section }: { section: Section }) => {
    const isCollapsed = collapsedLevels.has(section.title);
    const allSelected = isLevelFullySelected(section.title);
    const someSelected = isLevelPartiallySelected(section.title);
    const selectedCount = section.data.filter((g) => selectedGymnasts.has(g.gymnast_profile_id)).length;

    return (
      <View style={styles.sectionHeader}>
        <TouchableOpacity
          style={styles.collapseButton}
          onPress={() => toggleLevelCollapse(section.title)}
        >
          {isCollapsed ? (
            <ChevronRight size={18} color={colors.slate[500]} />
          ) : (
            <ChevronDown size={18} color={colors.slate[500]} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sectionHeaderContent}
          onPress={() => toggleLevel(section.title)}
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>
                {selectedCount}/{section.data.length}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.sectionCheckbox,
              allSelected && styles.sectionCheckboxSelected,
              someSelected && !allSelected && styles.sectionCheckboxPartial,
            ]}
          >
            {allSelected && <Check size={12} color={colors.white} />}
            {someSelected && !allSelected && <View style={styles.partialIndicator} />}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = useCallback(({ item, section }: { item: Gymnast; section: Section }) => {
    if (collapsedLevels.has(section.title)) {
      return null;
    }

    const isSelected = selectedGymnasts.has(item.gymnast_profile_id);
    return (
      <TouchableOpacity
        style={[styles.gymnastRow, isSelected && styles.gymnastRowSelected]}
        onPress={() => toggleGymnast(item.gymnast_profile_id)}
      >
        <Text style={styles.gymnastName}>
          {item.gymnast_profiles?.first_name} {item.gymnast_profiles?.last_name}
        </Text>
        <View style={[styles.gymnastCheckbox, isSelected && styles.gymnastCheckboxSelected]}>
          {isSelected && <Check size={14} color={colors.white} />}
        </View>
      </TouchableOpacity>
    );
  }, [collapsedLevels, selectedGymnasts, toggleGymnast]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <X size={24} color={colors.slate[600]} />
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>Assign Gymnasts</Text>
          <TouchableOpacity
            style={[styles.modalSaveButton, loading && styles.modalSaveButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.modalSaveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.modalSubtitleContainer}>
          <Text style={styles.modalSubtitle} numberOfLines={1}>
            {sessionName}
          </Text>
          <Text style={styles.selectedCountText}>
            {selectedGymnasts.size} selected
          </Text>
        </View>

        {fetching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.light.primary} />
          </View>
        ) : roster.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No gymnasts in competition roster</Text>
            <Text style={styles.emptySubtext}>Add gymnasts to the competition first</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.gymnast_profile_id}
            renderSectionHeader={renderSectionHeader}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.slate[900],
    textAlign: 'center',
    marginHorizontal: 8,
  },
  modalSaveButton: {
    backgroundColor: theme.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  modalSubtitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  modalSubtitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
  },
  selectedCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.light.primary,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[700],
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.slate[500],
    marginTop: 4,
  },
  listContent: {
    padding: 12,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  collapseButton: {
    padding: 10,
  },
  sectionHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
    paddingVertical: 10,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[900],
  },
  sectionCount: {
    backgroundColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[600],
  },
  sectionCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  sectionCheckboxSelected: {
    backgroundColor: theme.light.primary,
    borderColor: theme.light.primary,
  },
  sectionCheckboxPartial: {
    borderColor: theme.light.primary,
  },
  partialIndicator: {
    width: 8,
    height: 3,
    backgroundColor: theme.light.primary,
    borderRadius: 2,
  },

  // Gymnast row
  gymnastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 6,
    marginLeft: 28,
  },
  gymnastRowSelected: {
    borderColor: theme.light.primary,
    backgroundColor: colors.brand[50],
  },
  gymnastName: {
    fontSize: 14,
    color: colors.slate[900],
  },
  gymnastCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymnastCheckboxSelected: {
    backgroundColor: theme.light.primary,
    borderColor: theme.light.primary,
  },
});
