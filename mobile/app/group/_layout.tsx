import { Stack, router } from 'expo-router';
import { TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';

export default function GroupLayout() {
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
        headerBackVisible: true,
        headerBackTitle: 'Back',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Platform.OS === 'ios' ? 0 : 16 }}>
            <ChevronLeft size={28} color={t.text} />
          </TouchableOpacity>
        ),
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
      <Stack.Screen
        name="post-detail"
        options={{
          title: 'Post',
        }}
      />
    </Stack>
  );
}
