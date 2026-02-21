import { Platform } from 'react-native';
import { create } from 'zustand';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { supabase } from '../services/supabase';

// Lazy-load expo-notifications to avoid crashing in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

async function loadNotificationsModule() {
  if (!Notifications) {
    Notifications = await import('expo-notifications');
    // Configure how notifications appear when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return Notifications;
}

async function loadDeviceModule() {
  if (!Device) {
    Device = await import('expo-device');
  }
  return Device;
}

interface PushNotificationState {
  expoPushToken: string | null;
  permissionStatus: 'undetermined' | 'granted' | 'denied';

  registerForPushNotifications: (userId: string) => Promise<void>;
  deregisterPushToken: () => Promise<void>;
  setupNotificationListeners: () => () => void;
}

export const usePushNotificationStore = create<PushNotificationState>((set, get) => ({
  expoPushToken: null,
  permissionStatus: 'undetermined',

  registerForPushNotifications: async (userId: string) => {
    try {
      const DeviceMod = await loadDeviceModule();

      // Must be a physical device
      if (!DeviceMod.isDevice) {
        console.log('[Push] Not a physical device, skipping registration');
        return;
      }

      const NotifMod = await loadNotificationsModule();

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await NotifMod.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: NotifMod.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#14B8A6',
        });
      }

      // Check existing permissions
      const { status: existingStatus } = await NotifMod.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await NotifMod.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        set({ permissionStatus: 'denied' });
        console.log('[Push] Permission denied');
        return;
      }

      set({ permissionStatus: 'granted' });

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('[Push] No EAS projectId found. Run "npx eas init" in the mobile directory.');
        return;
      }

      const tokenData = await NotifMod.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      set({ expoPushToken: token });

      // Upsert token to Supabase
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token,
          platform: Platform.OS,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        });

      if (error) {
        console.error('[Push] Error saving token:', error);
      } else {
        console.log('[Push] Token registered successfully');
      }
    } catch (error) {
      console.error('[Push] Registration error:', error);
    }
  },

  deregisterPushToken: async () => {
    const token = get().expoPushToken;
    if (!token) return;

    try {
      const { error } = await supabase
        .from('user_push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('token', token);

      if (error) {
        console.error('[Push] Error deregistering token:', error);
      }
    } catch (error) {
      console.error('[Push] Deregistration error:', error);
    }

    set({ expoPushToken: null });
  },

  setupNotificationListeners: () => {
    // Load module synchronously from cache (registerForPushNotifications should have been called first)
    if (!Notifications) {
      // Module not loaded yet — schedule async setup
      let cleanupFn: (() => void) | null = null;
      loadNotificationsModule().then((NotifMod) => {
        cleanupFn = setupListeners(NotifMod);
      });
      return () => { cleanupFn?.(); };
    }

    return setupListeners(Notifications);
  },
}));

function setupListeners(NotifMod: typeof import('expo-notifications')): () => void {
  // Handle notification tap (app in background or killed)
  const responseSubscription = NotifMod.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      type?: string;
      reference_id?: string;
      hub_id?: string;
    };

    if (!data?.type) return;

    // Deep link based on notification type
    switch (data.type) {
      case 'message':
        if (data.reference_id) {
          router.push(`/chat/${data.reference_id}` as never);
        }
        break;
      case 'post':
        if (data.reference_id) {
          router.push(`/group/${data.reference_id}` as never);
        }
        break;
      case 'event':
        router.push('/(tabs)/calendar' as never);
        break;
      case 'competition':
        if (data.reference_id) {
          router.push(`/competitions/${data.reference_id}` as never);
        }
        break;
      case 'score':
        router.push('/(tabs)/scores' as never);
        break;
      case 'assignment':
        router.push('/(tabs)/assignments' as never);
        break;
      case 'marketplace_item':
        router.push('/(tabs)/more' as never);
        break;
      case 'resource':
        router.push('/(tabs)/more' as never);
        break;
      case 'staff_task':
      case 'staff_time_off':
        router.push('/staff/' as never);
        break;
      case 'private_lesson':
        router.push('/private-lessons/' as never);
        break;
      default:
        // Open to dashboard
        router.push('/(tabs)/' as never);
        break;
    }
  });

  // Handle notification received while app is in foreground
  const receivedSubscription = NotifMod.addNotificationReceivedListener((_notification) => {
    // Badge counts are handled by the existing polling in notificationStore/activityFeedStore
  });

  return () => {
    responseSubscription.remove();
    receivedSubscription.remove();
  };
}
