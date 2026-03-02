import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function ProgressReportsLayout() {
  const { t } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.surface },
        headerTintColor: t.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Progress Reports' }} />
      <Stack.Screen name="[reportId]" options={{ title: 'Progress Report' }} />
    </Stack>
  );
}
