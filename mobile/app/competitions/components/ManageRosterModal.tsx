import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, theme } from '../../../src/constants/colors';
import { AllGymnast } from './types';

interface ManageRosterModalProps {
  visible: boolean;
  onClose: () => void;
  allGymnasts: AllGymnast[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSave: () => void;
  saving: boolean;
  hubLevels: string[];
}

interface Section {
  title: string;
  data: AllGymnast[];
  selectedCount: number;
}

export function ManageRosterModal({
  visible,
  onClose,
  allGymnasts,
  selectedIds,
  onToggleSelection,
  onSave,
  saving,
  hubLevels,
}: ManageRosterModalProps) {
  // Group gymnasts by level
  const sections = useMemo(() => {
    const grouped: Record<string, AllGymnast[]> = {};

    allGymnasts.forEach((gymnast) => {
      const level = gymnast.level || 'Unassigned';
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

    return orderedKeys.map((level) => {
      const gymnasts = grouped[level].sort((a, b) =>
        (a.last_name || '').localeCompare(b.last_name || '')
      );
      const selectedCount = gymnasts.filter((g) => selectedIds.has(g.id)).length;
      return {
        title: level,
        data: gymnasts,
        selectedCount,
      };
    });
  }, [allGymnasts, hubLevels, selectedIds]);

  // Select/deselect all in a level
  const toggleLevel = (levelGymnasts: AllGymnast[]) => {
    const allSelected = levelGymnasts.every((g) => selectedIds.has(g.id));
    levelGymnasts.forEach((g) => {
      if (allSelected) {
        // Deselect all if all are selected
        if (selectedIds.has(g.id)) {
          onToggleSelection(g.id);
        }
      } else {
        // Select all if not all are selected
        if (!selectedIds.has(g.id)) {
          onToggleSelection(g.id);
        }
      }
    });
  };

  const renderSectionHeader = ({ section }: { section: Section }) => {
    const allSelected = section.data.every((g) => selectedIds.has(g.id));
    const someSelected = section.data.some((g) => selectedIds.has(g.id));

    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleLevel(section.data)}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCount}>
            <Text style={styles.sectionCountText}>
              {section.selectedCount}/{section.data.length}
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
          {allSelected && <Check size={14} color={colors.white} />}
          {someSelected && !allSelected && (
            <View style={styles.partialIndicator} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: AllGymnast }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.modalGymnastRow,
          isSelected && styles.modalGymnastRowSelected,
        ]}
        onPress={() => onToggleSelection(item.id)}
      >
        <View style={styles.modalGymnastInfo}>
          <View
            style={[
              styles.modalGymnastAvatar,
              isSelected && styles.modalGymnastAvatarSelected,
            ]}
          >
            <Text
              style={[
                styles.modalGymnastAvatarText,
                isSelected && styles.modalGymnastAvatarTextSelected,
              ]}
            >
              {item.first_name?.[0] || ''}
              {item.last_name?.[0] || ''}
            </Text>
          </View>
          <View>
            <Text style={styles.modalGymnastName}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.modalGymnastGender}>
              {item.gender || 'Unknown'}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.modalCheckbox,
            isSelected && styles.modalCheckboxSelected,
          ]}
        >
          {isSelected && <Check size={16} color={colors.white} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={onClose}
          >
            <X size={24} color={colors.slate[600]} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Manage Roster</Text>
          <TouchableOpacity
            style={[
              styles.modalSaveButton,
              saving && styles.modalSaveButtonDisabled,
            ]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.modalSaveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.modalSubtitleContainer}>
          <Text style={styles.modalSubtitle}>
            Select gymnasts to include in this competition
          </Text>
          <Text style={styles.selectedCountText}>
            {selectedIds.size} selected
          </Text>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.modalList}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyText}>No gymnasts in this hub</Text>
            </View>
          }
        />
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
    fontSize: 17,
    fontWeight: '600',
    color: colors.slate[900],
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
    fontSize: 13,
    color: colors.slate[500],
  },
  selectedCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.light.primary,
  },
  modalList: {
    padding: 12,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[100],
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 4,
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
    width: 22,
    height: 22,
    borderRadius: 6,
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
    width: 10,
    height: 3,
    backgroundColor: theme.light.primary,
    borderRadius: 2,
  },

  // Gymnast row
  modalGymnastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    marginLeft: 8,
  },
  modalGymnastRowSelected: {
    borderColor: theme.light.primary,
    backgroundColor: colors.brand[50],
  },
  modalGymnastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalGymnastAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGymnastAvatarSelected: {
    backgroundColor: colors.brand[100],
  },
  modalGymnastAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[500],
  },
  modalGymnastAvatarTextSelected: {
    color: colors.brand[700],
  },
  modalGymnastName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  modalGymnastGender: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  modalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCheckboxSelected: {
    backgroundColor: theme.light.primary,
    borderColor: theme.light.primary,
  },
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: colors.slate[500],
  },
});
