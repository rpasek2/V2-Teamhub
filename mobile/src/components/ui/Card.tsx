import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  showChevron?: boolean;
}

export function Card({ children, style, onPress, showChevron }: CardProps) {
  const { t } = useTheme();
  const content = (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>
      <View style={styles.content}>{children}</View>
      {showChevron && onPress && (
        <ChevronRight size={20} color={t.textFaint} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  const { t } = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: t.textMuted }]}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

interface CardSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function CardSection({ title, children }: CardSectionProps) {
  const { t } = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: t.borderSubtle }]}>
      {title && <Text style={[styles.sectionTitle, { color: t.textMuted }]}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  subtitle: {
    fontSize: 14,
    color: colors.slate[500],
    marginTop: 2,
  },
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
});
