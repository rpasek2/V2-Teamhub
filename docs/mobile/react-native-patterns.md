# Mobile App Patterns (Expo / React Native)

## Tech Stack
- **Framework:** Expo SDK 52 + React Native
- **Routing:** Expo Router (file-based, similar to Next.js)
- **State:** Zustand stores (authStore, hubStore, notificationStore)
- **Styling:** React Native StyleSheet (not Tailwind)
- **Icons:** lucide-react-native
- **Backend:** Same Supabase instance as web app

## Safe Area Handling
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// For full screens
<SafeAreaView style={styles.container} edges={['top', 'bottom']}>
  {/* content */}
</SafeAreaView>

// For dynamic measurements (e.g., tab bar)
const insets = useSafeAreaInsets();
const tabBarHeight = 60 + Math.max(insets.bottom, 8);
```

## Zustand Store Pattern
```typescript
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({ user: data.session?.user ?? null, loading: false });
  },
}));
```

## Colors
Use the shared color constants from `mobile/src/constants/colors.ts`:
```typescript
import { colors, theme } from '../../src/constants/colors';

// Use colors.brand, colors.slate, colors.error, etc.
// Use theme.light.primary, theme.light.text, etc.
```

## Mobile vs Web Differences
| Concern | Web | Mobile |
|---------|-----|--------|
| State | React Context | Zustand stores |
| Styling | Tailwind CSS | StyleSheet.create() |
| Routing | React Router | Expo Router |
| Safe Areas | Not needed | SafeAreaView required |
| Icons | lucide-react | lucide-react-native |
| Push Notifications | N/A | expo-notifications (lazy-load in Expo Go) |

## Known Gotchas
- Expo Go (SDK 53+) doesn't support push notifications — lazy-load `expo-notifications` to avoid crash
- Use `recentlyReadChannelIds` ref to prevent `useFocusEffect` re-fetch from resurrecting cleared badges
- Persist `recentlyReadChannelIds` to AsyncStorage so it survives app restarts
