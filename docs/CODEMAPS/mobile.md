# Mobile App Codemap

> **Last Updated:** 2026-02-20

## Tech Stack

- Expo SDK 52
- React Native
- Expo Router (file-based routing)
- Zustand (state management)
- Lucide React Native (icons)
- React Native Safe Area Context
- Expo Notifications + FCM (push notifications, Android)
- Expo AV (audio playback)
- Expo File System (offline storage)

## Entry Points

| File | Purpose |
|------|---------|
| `mobile/app/_layout.tsx` | Root layout, providers |
| `mobile/app/(tabs)/_layout.tsx` | Tab bar config |

## Zustand Stores (`mobile/src/stores/`)

| Store | Purpose |
|-------|---------|
| `authStore.ts` | User, session, initialize, push token deregistration on sign-out |
| `hubStore.ts` | Active hub, role, linked gymnasts |
| `notificationStore.ts` | Badge counts, polling |
| `tabPreferencesStore.ts` | Custom tab order |
| `pushNotificationStore.ts` | Push token registration, permission handling, notification listeners |
| `activityFeedStore.ts` | Activity feed items, notification types, deep linking |
| `musicPlayerStore.ts` | Global audio playback (play/pause/stop/seek, position tracking) |
| `offlineMusicStore.ts` | Floor music offline download, progress tracking, bulk download |

## Screen Structure

### Auth Screens (`mobile/app/(auth)/`)
- `login.tsx`
- `register.tsx`
- `forgot-password.tsx`

### Hub Selection
- `mobile/app/hub-selection.tsx`

### Tab Screens (`mobile/app/(tabs)/`)

| Tab | File | Description |
|-----|------|-------------|
| Home | `index.tsx` | Dashboard |
| Calendar | `calendar.tsx` | Events |
| Messages | `messages.tsx` | DM list |
| Groups | `groups.tsx` | Group list |
| More | `more.tsx` | Feature links |

### Feature Screens

| Feature | Files | Description |
|---------|-------|-------------|
| Roster | `roster/index.tsx`, `roster/[gymnastId].tsx` | Gymnast list + profile |
| Competitions | `competitions/index.tsx`, `competitions/[competitionId].tsx` | Meets |
| Scores | `scores/index.tsx` | Score viewing |
| Skills | `skills/index.tsx` | Skills matrix |
| Assignments | `assignments/index.tsx` | Practice assignments |
| Attendance | `attendance/index.tsx` | Daily attendance |
| Schedule | `schedule/index.tsx` | Practice times |
| Staff | `staff/index.tsx`, `staff/[staffId].tsx` | Staff list + profile |
| Mentorship | `mentorship/index.tsx` | Big/Little |
| Marketplace | `marketplace/index.tsx`, `marketplace/[itemId].tsx` | Used gear |
| Resources | `resources/index.tsx` | Documents |
| Private Lessons | `private-lessons/index.tsx` | Booking |

### Settings Screens

| Screen | File |
|--------|------|
| User Settings | `settings/index.tsx` |
| Notification Preferences | `settings/notifications.tsx` |
| Hub Settings | `hub-settings/index.tsx` |
| Levels | `hub-settings/levels.tsx` |
| Invite Codes | `hub-settings/invite-codes.tsx` |
| Permissions | `hub-settings/permissions.tsx` |

### Notifications
- `notifications/index.tsx` - Activity feed with notification types and deep linking

### Other Screens
- `chat/[channelId].tsx` - Chat conversation
- `group/[groupId].tsx` - Group details
- `group/create-post.tsx` - New post
- `anonymous-reports.tsx` - Report viewer
- `roster/floor-music.tsx` - All floor music with offline download and playback

## Competition Components (`mobile/app/competitions/components/`)

| Component | Purpose |
|-----------|---------|
| `RosterTab.tsx` | Competition roster view |
| `SessionsTab.tsx` | Sessions list |
| `ManageRosterModal.tsx` | Add/remove gymnasts |
| `CreateSessionModal.tsx` | Add session |
| `AssignSessionGymnastsModal.tsx` | Assign to session |

## Mobile Components (`mobile/src/components/`)

| Directory | Key Components |
|-----------|----------------|
| `ui/` | Button, Card, Badge, Input |
| `calendar/` | EventDetailsModal |
| `dashboard/` | MyTasksSection |
| `groups/` | PostCard |
| `messages/` | AnonymousReportCard |
| `notifications/` | NotificationBell |
| `settings/` | TabReorderSection |
| (root) | MiniMusicPlayer (global floating audio player) |

## Shared Utilities (`mobile/src/lib/`)

| File | Purpose |
|------|---------|
| `permissions.ts` | Permission helpers (mirrors web) |
| `qualifyingScores.ts` | Score threshold logic |

## Services (`mobile/src/services/`)

| File | Purpose |
|------|---------|
| `supabase.ts` | Supabase client |

## Constants (`mobile/src/constants/`)

| File | Purpose |
|------|---------|
| `colors.ts` | Brand colors, theme |

## Safe Area Patterns

```typescript
// Full screen with safe area
<SafeAreaView style={styles.container} edges={['top', 'bottom']}>

// Dynamic measurements
const insets = useSafeAreaInsets();
const tabBarHeight = 60 + Math.max(insets.bottom, 8);
```

## State vs Web Differences

| Aspect | Web | Mobile |
|--------|-----|--------|
| State Management | React Context | Zustand |
| Styling | Tailwind CSS | StyleSheet.create() |
| Routing | React Router | Expo Router |
| Safe Areas | N/A | SafeAreaView |
| Icons | lucide-react | lucide-react-native |

## Feature Parity Status

| Feature | Web | Mobile |
|---------|-----|--------|
| Roster viewing | ✅ | ✅ |
| Roster editing | ✅ | ✅ |
| Competition management | ✅ | ✅ |
| Score entry | ✅ | ✅ |
| Skills tracking | ✅ | ✅ |
| Attendance | ✅ | ✅ |
| Messages | ✅ | ✅ |
| Groups/Posts | ✅ | ✅ |
| User settings | ✅ | ✅ |
| Hub settings | ✅ | ✅ |
| Schedule viewing | ✅ | ✅ |
| Rotation editing | ✅ | ❌ |
| Push notifications | N/A | ✅ (Android) |
| In-app notifications | ✅ | ✅ |
| Notification preferences | ✅ | ✅ |
| Floor music playback | ✅ | ✅ |
| Floor music offline | N/A | ✅ |
| Media player controls | ✅ (HTML5) | ✅ (MiniMusicPlayer) |
| Coach tasks dashboard | ✅ | ✅ |
