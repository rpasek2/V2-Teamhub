import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Award, Trophy, Medal } from 'lucide-react-native';
import { colors } from '../../constants/colors';

export type QualifyingLevel = 'state' | 'regional' | 'national';

interface QualifyingBadgeProps {
  level: QualifyingLevel;
  size?: 'sm' | 'md';
}

const BADGE_CONFIG: Record<QualifyingLevel, {
  Icon: typeof Award;
  bgColor: string;
  iconColor: string;
}> = {
  state: {
    Icon: Award,
    bgColor: colors.blue[100],
    iconColor: colors.blue[700],
  },
  regional: {
    Icon: Trophy,
    bgColor: colors.amber[100],
    iconColor: colors.amber[700],
  },
  national: {
    Icon: Medal,
    bgColor: colors.purple[100],
    iconColor: colors.purple[700],
  },
};

export function QualifyingBadge({ level, size = 'sm' }: QualifyingBadgeProps) {
  const config = BADGE_CONFIG[level];
  const { Icon } = config;
  const iconSize = size === 'sm' ? 10 : 14;
  const styles = size === 'sm' ? smallStyles : mediumStyles;

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Icon size={iconSize} color={config.iconColor} />
    </View>
  );
}

interface QualifyingBadgesProps {
  levels: QualifyingLevel[];
  size?: 'sm' | 'md';
}

export function QualifyingBadges({ levels, size = 'sm' }: QualifyingBadgesProps) {
  if (levels.length === 0) return null;

  return (
    <View style={baseStyles.container}>
      {levels.map((level) => (
        <QualifyingBadge key={level} level={level} size={size} />
      ))}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 2,
  },
});

const smallStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const mediumStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
