import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function SettingsLayout() {
  const { t } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: t.surface,
        },
        headerTintColor: t.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackVisible: true,
        headerBackTitle: 'Back',
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: t.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
        }}
      />
    </Stack>
  );
}
