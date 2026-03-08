import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import type { Tab } from './types';

interface Props {
  tabs: { key: Tab; label: string }[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function GymnastTabBar({ tabs, activeTab, onTabChange }: Props) {
  const { t } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.tabsScrollView, { backgroundColor: t.surface, borderBottomColor: t.border }]}
      contentContainerStyle={styles.tabsContainer}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && { borderBottomColor: t.primary }]}
          onPress={() => onTabChange(tab.key)}
        >
          <Text style={[styles.tabText, { color: t.textMuted }, activeTab === tab.key && { color: t.primary, fontWeight: '600' }]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabsScrollView: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[500],
  },
});
