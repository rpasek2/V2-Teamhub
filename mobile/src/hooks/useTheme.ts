import { useMemo } from 'react';
import { theme, colors } from '../constants/colors';
import { ACCENT_PRESETS } from '../constants/accentColors';
import { useThemeStore } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';
import { useHubStore } from '../stores/hubStore';

export function useTheme() {
  const isDark = useThemeStore((s) => s.isDark);
  const toggleDark = useThemeStore((s) => s.toggleDark);
  const userId = useAuthStore((s) => s.user?.id);
  const accentName = useHubStore((s) => s.currentHub?.settings?.accentColor) || 'mint';

  const accent = ACCENT_PRESETS[accentName] || ACCENT_PRESETS.mint;
  const baseTheme = isDark ? theme.dark : theme.light;

  const t = useMemo(() => ({
    ...baseTheme,
    primary: accent[isDark ? '500' : '600'],
    primaryLight: accent[isDark ? '900' : '100'],
    primaryDark: accent[isDark ? '400' : '700'],
    borderFocus: accent['500'],
    tabIconSelected: accent[isDark ? '500' : '600'],
  }), [baseTheme, accent, isDark]);

  return {
    isDark,
    t,
    colors,
    accent,
    toggle: () => toggleDark(userId),
  };
}

/**
 * Returns themed screen options for Stack/Tabs navigators.
 * Usage: <Stack screenOptions={useThemedScreenOptions()} />
 */
export function useThemedScreenOptions() {
  const { t } = useTheme();
  return {
    headerStyle: { backgroundColor: t.surface },
    headerTintColor: t.text,
    headerTitleStyle: { fontWeight: '600' as const, color: t.text },
    headerShadowVisible: false,
    headerBackTitle: 'Back',
  };
}

/**
 * Returns a tinted background color for feature icons.
 * Light: 15% opacity, Dark: 25% opacity.
 */
export function iconBg(hexColor: string, isDark: boolean) {
  return `${hexColor}${isDark ? '40' : '18'}`;
}
