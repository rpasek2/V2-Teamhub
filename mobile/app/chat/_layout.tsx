import { Stack } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';

export default function ChatLayout() {
  const { t } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: t.surface,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: t.text,
        },
        headerTintColor: t.text,
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
