import { Stack, router } from 'expo-router';
import { TouchableOpacity, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../src/hooks/useTheme';

export default function SkillsLayout() {
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
        name="index"
        options={{
          title: 'Skills',
        }}
      />
    </Stack>
  );
}
