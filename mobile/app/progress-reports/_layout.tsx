import { Stack } from 'expo-router';
import { colors } from '../../src/constants/colors';

export default function ProgressReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.slate[900],
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Progress Reports' }} />
      <Stack.Screen name="[reportId]" options={{ title: 'Progress Report' }} />
    </Stack>
  );
}
