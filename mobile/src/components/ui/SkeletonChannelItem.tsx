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
        { width: width as any, height, borderRadius: 6, backgroundColor: t.borderSubtle, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonChannelItem() {
  const { t } = useTheme();

  return (
    <View style={[styles.item, { backgroundColor: t.surface, borderBottomColor: t.borderSubtle }]}>
      {/* Avatar circle */}
      <ShimmerBlock width={44} height={44} style={{ borderRadius: 22, marginRight: 12 }} />
      <View style={styles.content}>
        <View style={styles.row}>
          <ShimmerBlock width={120} height={14} />
          <ShimmerBlock width={40} height={12} />
        </View>
        <ShimmerBlock width={200} height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonChannelList({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonChannelItem key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
