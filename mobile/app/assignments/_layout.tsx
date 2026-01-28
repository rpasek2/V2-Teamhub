import { Stack } from 'expo-router';
import { colors } from '../../src/constants/colors';

export default function AssignmentsLayout() {
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
          title: 'Assignments',
        }}
      />
    </Stack>
  );
}
