import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const VARIANT_COLORS = {
  primary: { light: { bg: colors.brand[100], text: colors.brand[700] }, dark: { bg: colors.brand[700] + '30', text: colors.brand[400] } },
  success: { light: { bg: colors.success[100], text: colors.success[700] }, dark: { bg: colors.success[700] + '30', text: colors.success[500] } },
  warning: { light: { bg: colors.warning[100], text: colors.warning[700] }, dark: { bg: colors.warning[700] + '30', text: colors.warning[500] } },
  error: { light: { bg: colors.error[100], text: colors.error[700] }, dark: { bg: colors.error[700] + '30', text: colors.error[400] } },
  neutral: { light: { bg: colors.slate[100], text: colors.slate[600] }, dark: { bg: colors.slate[700], text: colors.slate[300] } },
};

export function Badge({ label, variant = 'neutral', size = 'md' }: BadgeProps) {
  const { isDark } = useTheme();
  const mode = isDark ? 'dark' : 'light';
  const c = VARIANT_COLORS[variant][mode];

  return (
    <View style={[styles.badge, styles[`size_${size}`], { backgroundColor: c.bg }]}>
      <Text style={[styles.text, styles[`text_${size}`], { color: c.text }]}>
        {label}
      </Text>
    </View>
  );
}

interface NotificationBadgeProps {
  count?: number;
  showDot?: boolean;
}

export function NotificationBadge({ count, showDot }: NotificationBadgeProps) {
  if (!count && !showDot) return null;

  if (showDot && !count) {
    return <View style={styles.dot} />;
  }

  return (
    <View style={styles.notificationBadge}>
      <Text style={styles.notificationText}>
        {count && count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },

  // Sizes
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  size_md: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },

  // Text
  text: {
    fontWeight: '500',
  },
  text_sm: {
    fontSize: 11,
  },
  text_md: {
    fontSize: 12,
  },

  // Notification badge
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error[500],
    position: 'absolute',
    top: -2,
    right: -2,
  },
  notificationBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    position: 'absolute',
    top: -4,
    right: -4,
  },
  notificationText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
});
