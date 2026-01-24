import { Stack } from 'expo-router';
import { colors } from '../../src/constants/colors';

export default function GroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: colors.slate[900],
        },
        headerTintColor: colors.slate[900],
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="[groupId]"
        options={{
          title: 'Group',
        }}
      />
      <Stack.Screen
        name="create-post"
        options={{
          title: 'Create Post',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
