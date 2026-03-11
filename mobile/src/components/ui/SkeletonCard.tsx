import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../src/hooks/useTheme';

function ShimmerBlock({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const { t } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius: 8, backgroundColor: t.borderSubtle, opacity },
        style,
      ]}
    />
  );
}

/** Generic skeleton card with configurable height */
export function SkeletonCard({ height = 100, style }: { height?: number; style?: object }) {
  const { t } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.borderSubtle }, style]}>
      <ShimmerBlock width="100%" height={height - 32} />
    </View>
  );
}

/** Skeleton for a stats row (2-3 stat boxes) */
export function SkeletonStatsRow({ count = 3 }: { count?: number }) {
  const { t } = useTheme();

  return (
    <View style={[styles.statsRow, { backgroundColor: t.surface, borderBottomColor: t.borderSubtle }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.statItem}>
          <ShimmerBlock width={40} height={24} />
          <ShimmerBlock width={60} height={12} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

/** Skeleton for a section with title + cards */
export function SkeletonSection({ cards = 2, cardHeight = 80 }: { cards?: number; cardHeight?: number }) {
  return (
    <View style={styles.section}>
      <ShimmerBlock width={120} height={16} style={{ marginBottom: 12 }} />
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} height={cardHeight} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  section: {
    padding: 16,
  },
});
