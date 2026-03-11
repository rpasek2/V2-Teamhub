import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function StaffLayout() {
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
        headerShadowVisible: false,
        headerBackVisible: true,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Staff',
        }}
      />
      <Stack.Screen
        name="[staffId]"
        options={{
          title: 'Staff Profile',
        }}
      />
    </Stack>
  );
}
