import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function HubSettingsLayout() {
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
        contentStyle: {
          backgroundColor: t.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Hub Settings',
        }}
      />
      <Stack.Screen
        name="permissions"
        options={{
          title: 'Permissions',
        }}
      />
      <Stack.Screen
        name="levels"
        options={{
          title: 'Manage Levels',
        }}
      />
      <Stack.Screen
        name="invite-codes"
        options={{
          title: 'Invite Codes',
        }}
      />
    </Stack>
  );
}
