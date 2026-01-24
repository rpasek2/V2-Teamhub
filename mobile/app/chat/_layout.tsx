import { Stack } from 'expo-router';
import { colors } from '../../src/constants/colors';

export default function ChatLayout() {
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
        name="[channelId]"
        options={{
          title: 'Chat',
        }}
      />
    </Stack>
  );
}
