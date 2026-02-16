import { Stack } from 'expo-router';
import { colors } from '../../src/constants/colors';

export default function RosterLayout() {
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
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Roster',
        }}
      />
      <Stack.Screen
        name="[gymnastId]"
        options={{
          title: 'Gymnast Profile',
        }}
      />
      <Stack.Screen
        name="floor-music"
        options={{
          title: 'All Floor Music',
        }}
      />
    </Stack>
  );
}
