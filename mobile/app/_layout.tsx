import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { useAuthStore } from '../src/stores/authStore';
import { usePushNotificationStore, navigateToDeepLink } from '../src/stores/pushNotificationStore';
import { useHubStore } from '../src/stores/hubStore';
import { useThemeStore } from '../src/stores/themeStore';
import { useTheme } from '../src/hooks/useTheme';
import { MiniMusicPlayer } from '../src/components/MiniMusicPlayer';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  const initialized = useAuthStore((state) => state.initialized);
  const initialize = useAuthStore((state) => state.initialize);
  const registerForPushNotifications = usePushNotificationStore((s) => s.registerForPushNotifications);
  const setupNotificationListeners = usePushNotificationStore((s) => s.setupNotificationListeners);
  const checkInitialNotification = usePushNotificationStore((s) => s.checkInitialNotification);
  const pendingDeepLink = usePushNotificationStore((s) => s.pendingDeepLink);
  const consumeDeepLink = usePushNotificationStore((s) => s.consumeDeepLink);
  const currentHub = useHubStore((s) => s.currentHub);
  const segments = useSegments();
  const syncThemeFromDB = useThemeStore((s) => s.syncFromDB);
  const { isDark, t } = useTheme();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  // Register push notifications and sync theme when user is authenticated
  useEffect(() => {
    if (user) {
      registerForPushNotifications(user.id);
      cleanupRef.current = setupNotificationListeners();
      syncThemeFromDB(user.id);
      // Check for notification that launched the app (cold start)
      checkInitialNotification();
    }

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [user?.id]);

  // Navigate to deep link when app is already on tabs (foreground notification tap)
  useEffect(() => {
    // Only handle deep links when we're on the (tabs) screen — hub-selection handles its own flow
    if (!pendingDeepLink || !currentHub || segments[0] !== '(tabs)') return;
    if (!pendingDeepLink.hub_id || pendingDeepLink.hub_id === currentHub.id) {
      const link = consumeDeepLink();
      if (link) navigateToDeepLink(link);
    }
  }, [pendingDeepLink, currentHub, segments]);

  useEffect(() => {
    if (initialized && !loading) {
      if (user) {
        router.replace('/hub-selection');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading, initialized]);

  return (
    <View style={layoutStyles.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={layoutStyles.stackContainer}>
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.text,
            headerTitleStyle: { fontWeight: '600' },
            headerShadowVisible: false,
            headerBackVisible: true,
            headerBackTitle: 'Back',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="hub-selection" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="group" />
          <Stack.Screen name="roster" />
          <Stack.Screen name="competitions" />
          <Stack.Screen name="scores" />
          <Stack.Screen name="skills" />
          <Stack.Screen name="attendance" />
        </Stack>
      </View>
      <MiniMusicPlayer />
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stackContainer: {
    flex: 1,
  },
});
