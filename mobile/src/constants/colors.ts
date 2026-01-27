// TeamHub brand colors - matching web app design system
export const colors = {
  // Brand colors (mint/teal)
  brand: {
    50: '#f0fdf9',
    100: '#ccfbef',
    200: '#99f6df',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },

  // Slate for text and backgrounds
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Additional color palettes for feature icons
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
  },

  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },

  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
  },

  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
  },

  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
  },

  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
  },

  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
  },

  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
  },

  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
  },

  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },

  // Base colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

// Theme configuration
export const theme = {
  light: {
    // Backgrounds
    background: colors.slate[50],
    surface: colors.white,
    surfaceSecondary: colors.slate[100],

    // Text
    text: colors.slate[900],
    textSecondary: colors.slate[700],
    textMuted: colors.slate[500],
    textInverse: colors.white,

    // Brand
    primary: colors.brand[600],
    primaryLight: colors.brand[100],
    primaryDark: colors.brand[700],

    // Borders
    border: colors.slate[200],
    borderFocus: colors.brand[500],

    // Tab bar
    tabBar: colors.white,
    tabIconDefault: colors.slate[400],
    tabIconSelected: colors.brand[600],

    // Status
    success: colors.success[600],
    error: colors.error[600],
    warning: colors.warning[600],
  },
  dark: {
    // Backgrounds
    background: colors.slate[900],
    surface: colors.slate[800],
    surfaceSecondary: colors.slate[700],

    // Text
    text: colors.slate[50],
    textSecondary: colors.slate[300],
    textMuted: colors.slate[400],
    textInverse: colors.slate[900],

    // Brand
    primary: colors.brand[500],
    primaryLight: colors.brand[900],
    primaryDark: colors.brand[400],

    // Borders
    border: colors.slate[700],
    borderFocus: colors.brand[500],

    // Tab bar
    tabBar: colors.slate[800],
    tabIconDefault: colors.slate[500],
    tabIconSelected: colors.brand[500],

    // Status
    success: colors.success[500],
    error: colors.error[500],
    warning: colors.warning[500],
  },
};

export type Theme = typeof theme.light;
