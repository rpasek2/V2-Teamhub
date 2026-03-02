# TeamHub V2 Architecture

> **Last Updated:** 2026-02-20

## Overview

TeamHub V2 is a full-stack team management platform for gymnastics programs. It consists of:
- **Web App** - React 19 + Vite 7 SPA, hosted on Firebase
- **Mobile App** - React Native (Expo SDK 52), Android builds via Gradle
- **Backend** - Supabase (PostgreSQL + Auth + Storage + Realtime + pg_net for push notifications)

## High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Web App       │     │   Mobile App    │
│   React 19      │     │   Expo/RN       │
│   Vite 7        │     │   Expo Router   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │      Supabase         │
         │  ┌─────────────────┐  │
         │  │   PostgreSQL    │  │
         │  │   + RLS         │  │
         │  └─────────────────┘  │
         │  ┌─────────────────┐  │
         │  │   Auth          │  │
         │  └─────────────────┘  │
         │  ┌─────────────────┐  │
         │  │   Storage       │  │
         │  └─────────────────┘  │
         │  ┌─────────────────┐  │
         │  │   Realtime      │  │
         │  └─────────────────┘  │
         └───────────────────────┘
```

## Key Technologies

| Layer | Web | Mobile |
|-------|-----|--------|
| Framework | React 19 | React Native (Expo 52) |
| Routing | React Router v7 | Expo Router |
| State | Context API | Zustand |
| Styling | Tailwind CSS 4 | StyleSheet |
| Backend | Supabase JS | Supabase JS |
| Icons | Lucide React | Lucide React Native |

## Directory Structure

```
teamhub-v2/
├── src/                    # Web app source
│   ├── App.tsx             # Router + lazy loading
│   ├── context/            # React contexts (3)
│   ├── pages/              # Page components (25)
│   ├── components/         # Reusable components (100+)
│   ├── hooks/              # Custom hooks (11)
│   ├── lib/                # Utilities (supabase, permissions)
│   └── types/              # TypeScript definitions
├── mobile/                 # Mobile app source
│   ├── app/                # Expo Router screens (65+)
│   └── src/                # Shared code
│       ├── stores/         # Zustand stores (7)
│       ├── components/     # Mobile components
│       ├── constants/      # Colors, config
│       └── lib/            # Shared utilities
└── supabase/               # Database migrations
```

## Feature Modules

| Module | Description | Web | Mobile |
|--------|-------------|-----|--------|
| Roster | Gymnast profiles, levels | ✅ | ✅ |
| Calendar | Events, RSVP | ✅ | ✅ |
| Messages | DM channels | ✅ | ✅ |
| Groups | Team groups, posts | ✅ | ✅ |
| Competitions | Meets, sessions, rosters | ✅ | ✅ |
| Scores | Competition scores | ✅ | ✅ |
| Skills | Skill tracking by event | ✅ | ✅ |
| Assignments | Practice assignments | ✅ | ✅ |
| Attendance | Daily attendance | ✅ | ✅ |
| Schedule | Practice times, rotations | ✅ | ✅ |
| Staff | Staff profiles | ✅ | ✅ |
| Mentorship | Big/Little program | ✅ | ✅ |
| Marketplace | Used gear trading | ✅ | ✅ |
| Resources | Team documents | ✅ | ✅ |
| Private Lessons | Booking system | ✅ | ✅ |
| Settings | Hub & user settings | ✅ | ✅ |

## Security Model

- **Authentication:** Supabase Auth (email/password)
- **Authorization:** Row Level Security (RLS) on all tables
- **Roles:** owner > director > admin > coach > parent > athlete
- **Permissions:** Configurable per-feature scopes (all/own/none)

## Data Flow

1. User authenticates via Supabase Auth
2. App fetches user's hubs via `hub_members`
3. User selects active hub
4. All queries scoped to `hub_id`
5. RLS policies enforce permissions
6. Realtime subscriptions for live updates

## Push Notification Flow

```
DB trigger fires on INSERT to messages/posts/etc.
  → Existing trigger inserts row into `notifications` table
    → Trigger on `notifications` INSERT fires `send_push_notification()`
      → Function looks up user's push tokens + notification preferences
        → pg_net HTTP POST to Expo Push API
          → Expo routes to FCM → Android device
```
