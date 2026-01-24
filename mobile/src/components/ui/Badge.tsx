import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({ label, variant = 'neutral', size = 'md' }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[variant], styles[`size_${size}`]]}>
      <Text style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`]]}>
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

  // Variants
  primary: {
    backgroundColor: colors.brand[100],
  },
  success: {
    backgroundColor: colors.success[100],
  },
  warning: {
    backgroundColor: colors.warning[100],
  },
  error: {
    backgroundColor: colors.error[100],
  },
  neutral: {
    backgroundColor: colors.slate[100],
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
  text_primary: {
    color: colors.brand[700],
  },
  text_success: {
    color: colors.success[700],
  },
  text_warning: {
    color: colors.warning[700],
  },
  text_error: {
    color: colors.error[700],
  },
  text_neutral: {
    color: colors.slate[600],
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
