import { Stack } from 'expo-router';
import { colors } from '../../src/constants/colors';

export default function HubSettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTintColor: colors.slate[900],
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.slate[50],
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
