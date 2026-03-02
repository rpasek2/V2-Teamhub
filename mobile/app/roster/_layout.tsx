import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function RosterLayout() {
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
