import { Stack, router } from 'expo-router';
import { TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
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
        headerBackVisible: true,
        headerBackTitle: 'Back',
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Platform.OS === 'ios' ? 0 : 16 }}>
            <ChevronLeft size={28} color={t.text} />
          </TouchableOpacity>
        ),
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
