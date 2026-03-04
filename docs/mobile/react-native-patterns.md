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

## Theme & Colors
Use `useTheme()` for all runtime colors. It returns `{ t, isDark }` where `t` has semantic tokens that swap for dark mode:

```typescript
import { useTheme } from '../../src/hooks/useTheme';
import { colors } from '../../src/constants/colors';

const { t, isDark } = useTheme();

// Semantic tokens (auto-swap light/dark):
t.surface         // card/modal background
t.surfaceSecondary // slightly contrasted bg
t.background      // page background
t.text            // primary text
t.textSecondary   // secondary labels
t.textMuted       // tertiary/descriptions
t.textFaint       // placeholder/hint
t.border          // dividers
t.primary         // hub accent color
```

Use `t.*` tokens for surfaces, text, and borders. Use raw `colors.*` (from `mobile/src/constants/colors.ts`) only for fixed-meaning elements like status badges or qualifying indicators:
```typescript
// Good: semantic surface
{ backgroundColor: t.surface, borderColor: t.border }

// Good: fixed-meaning badge
{ backgroundColor: isDark ? colors.blue[700] + '30' : colors.blue[100] }

// Bad: hardcoded surface color
{ backgroundColor: colors.white }
{ backgroundColor: colors.slate[900] }
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

## Modal Pattern
```typescript
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

<Modal
  visible={isOpen}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={onClose}
>
  <SafeAreaView style={[styles.container, { backgroundColor: t.surface }]} edges={['top']}>
    {/* Header: X button (left), title (center), action button (right) */}
    {/* Content: ScrollView or SectionList */}
  </SafeAreaView>
</Modal>
```

## Checkbox Pattern
Used in gymnast selection modals (AssignSessionGymnastsModal, QuickChecklistModal, etc.):
```typescript
// State: Set<string> of selected IDs
const [selected, setSelected] = useState<Set<string>>(new Set());

// Checkbox style:
{ width: 20, height: 20, borderRadius: 4, borderWidth: 2 }
// Checked: { backgroundColor: t.primary, borderColor: t.primary }
// Unchecked: { borderColor: isDark ? colors.slate[500] : colors.slate[300] }
```

## Known Gotchas
- Expo Go (SDK 53+) doesn't support push notifications — lazy-load `expo-notifications` to avoid crash
- Use `recentlyReadChannelIds` ref to prevent `useFocusEffect` re-fetch from resurrecting cleared badges
- Persist `recentlyReadChannelIds` to AsyncStorage so it survives app restarts
- Supabase FK joins return arrays in mobile types — use `[0]` accessors or `Array.isArray()` guard
