import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { X, RotateCcw } from 'lucide-react-native';
import {
  Home,
  Calendar,
  MessageCircle,
  Users,
  Menu,
  ClipboardList,
  CheckSquare,
  Trophy,
  Target,
  BarChart,
  Contact,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, theme } from '../../constants/colors';
import {
  useTabPreferencesStore,
  AVAILABLE_TABS,
  TabId,
} from '../../stores/tabPreferencesStore';

// Map of all available tab icons
const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  calendar: Calendar,
  messages: MessageCircle,
  groups: Users,
  roster: Contact,
  assignments: ClipboardList,
  attendance: CheckSquare,
  competitions: Trophy,
  scores: BarChart,
  skills: Target,
};

interface CustomizeTabsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomizeTabsModal({ isOpen, onClose }: CustomizeTabsModalProps) {
  const { selectedTabs, setSelectedTabs, resetToDefault } = useTabPreferencesStore();
  const [localSelection, setLocalSelection] = useState<TabId[]>([]);

  // Initialize local selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelection([...selectedTabs]);
    }
  }, [isOpen, selectedTabs]);

  const handleToggleTab = (tabId: TabId) => {
    if (localSelection.includes(tabId)) {
      // Remove tab (only if we have more than 3)
      if (localSelection.length > 3) {
        setLocalSelection(localSelection.filter((t) => t !== tabId));
      } else {
        // Just remove it, user needs to select another
        setLocalSelection(localSelection.filter((t) => t !== tabId));
      }
    } else {
      // Add tab (only if we have less than 3)
      if (localSelection.length < 3) {
        setLocalSelection([...localSelection, tabId]);
      } else {
        Alert.alert(
          'Maximum 3 Tabs',
          'You can only have 3 tabs in the bottom bar. Remove one first to add another.'
        );
      }
    }
  };

  const handleSave = async () => {
    if (localSelection.length !== 3) {
      Alert.alert('Select 3 Tabs', 'Please select exactly 3 tabs for your bottom bar.');
      return;
    }
    await setSelectedTabs(localSelection);
    onClose();
  };

  const handleReset = () => {
    Alert.alert('Reset to Default?', 'This will restore Calendar, Messages, and Groups.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: async () => {
          await resetToDefault();
          setLocalSelection(['calendar', 'messages', 'groups']);
        },
      },
    ]);
  };

  const handleClose = () => {
    setLocalSelection([...selectedTabs]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <X size={24} color={colors.slate[600]} />
          </TouchableOpacity>
          <Text style={styles.title}>Customize Bottom Bar</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={localSelection.length !== 3}
            style={[styles.saveButton, localSelection.length !== 3 && styles.saveButtonDisabled]}
          >
            <Text
              style={[
                styles.saveButtonText,
                localSelection.length !== 3 && styles.saveButtonTextDisabled,
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Select 3 tabs to show in your bottom navigation bar.
          </Text>
          <Text style={styles.selectionCount}>
            {localSelection.length}/3 selected
          </Text>
        </View>

        {/* Preview */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewLabel}>Preview</Text>
          <View style={styles.preview}>
            <View style={styles.previewTab}>
              <Home size={20} color={colors.slate[400]} />
              <Text style={styles.previewTabLabel}>Home</Text>
            </View>
            {localSelection.map((tabId) => {
              const tab = AVAILABLE_TABS.find((t) => t.id === tabId);
              const Icon = TAB_ICONS[tabId] || Users;
              return (
                <View key={tabId} style={styles.previewTab}>
                  <Icon size={20} color={theme.light.primary} />
                  <Text style={[styles.previewTabLabel, styles.previewTabLabelActive]}>
                    {tab?.label || tabId}
                  </Text>
                </View>
              );
            })}
            {/* Placeholder slots */}
            {Array.from({ length: Math.max(0, 3 - localSelection.length) }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.previewTabEmpty}>
                <View style={styles.previewTabPlaceholder} />
                <Text style={styles.previewTabLabel}>---</Text>
              </View>
            ))}
            <View style={styles.previewTab}>
              <Menu size={20} color={colors.slate[400]} />
              <Text style={styles.previewTabLabel}>More</Text>
            </View>
          </View>
        </View>

        {/* Tab Options */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.optionsGrid}>
            {AVAILABLE_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.id] || Users;
              const isSelected = localSelection.includes(tab.id);
              const selectionIndex = localSelection.indexOf(tab.id);

              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => handleToggleTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.optionIcon, isSelected && styles.optionIconSelected]}
                  >
                    <Icon size={24} color={isSelected ? colors.white : colors.slate[600]} />
                  </View>
                  <Text
                    style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
                  >
                    {tab.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.selectionBadge}>
                      <Text style={styles.selectionBadgeText}>{selectionIndex + 1}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Reset Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <RotateCcw size={18} color={colors.slate[600]} />
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  headerButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  saveButton: {
    backgroundColor: theme.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: colors.slate[200],
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  saveButtonTextDisabled: {
    color: colors.slate[400],
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  instructionText: {
    fontSize: 14,
    color: colors.slate[600],
    flex: 1,
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.light.primary,
    marginLeft: 12,
  },
  previewContainer: {
    padding: 16,
    backgroundColor: colors.white,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[500],
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  preview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 8,
    paddingVertical: 12,
  },
  previewTab: {
    alignItems: 'center',
    gap: 4,
  },
  previewTabEmpty: {
    alignItems: 'center',
    gap: 4,
    opacity: 0.4,
  },
  previewTabPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.slate[300],
    borderStyle: 'dashed',
  },
  previewTabLabel: {
    fontSize: 10,
    color: colors.slate[500],
  },
  previewTabLabelActive: {
    color: theme.light.primary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: theme.light.primary,
    backgroundColor: colors.brand[50],
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionIconSelected: {
    backgroundColor: theme.light.primary,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[700],
  },
  optionLabelSelected: {
    color: theme.light.primary,
    fontWeight: '600',
  },
  selectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  resetButtonText: {
    fontSize: 14,
    color: colors.slate[600],
  },
});
