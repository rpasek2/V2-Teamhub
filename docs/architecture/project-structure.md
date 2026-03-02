# Project Structure

## Tech Stack
- **Framework:** React 19 + Vite 7
- **Routing:** React Router DOM v7 (`useNavigate`, `useParams`, `Outlet`)
- **Styling:** Tailwind CSS 4 only (Digital Gym design system). No CSS modules or inline styles.
- **UI Components:** Headless UI for modals/dialogs, Lucide React for icons
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Date Handling:** date-fns (`format`, `parseISO`, `isSameDay`, etc.)
- **Utilities:** clsx + tailwind-merge for conditional classes

## Web App (`src/`)
```
src/
├── App.tsx                    # Router + lazy loading (all pages)
├── index.css                  # Digital Gym design system
├── context/
│   ├── AuthContext.tsx        # Auth state (user, session, signOut)
│   ├── HubContext.tsx         # Hub data, permissions, linked gymnasts
│   └── NotificationContext.tsx # Realtime notification badges
├── pages/                     # 20+ page components
│   ├── Dashboard.tsx
│   ├── Roster.tsx
│   ├── GymnastDetails.tsx     # Gymnast profile with 7 tabs (/roster/:gymnastId)
│   ├── Calendar.tsx
│   ├── Messages.tsx
│   ├── Scores.tsx
│   ├── Skills.tsx
│   ├── Marketplace.tsx
│   ├── Mentorship.tsx
│   ├── Staff.tsx
│   ├── StaffDetails.tsx       # Staff profile (/staff/:staffUserId)
│   ├── Assignments.tsx        # Coach assignments with templates
│   ├── Resources.tsx          # Shared files and documents
│   ├── Schedule.tsx           # Practice times and rotation grid
│   ├── Attendance.tsx         # Daily attendance and metrics
│   ├── PrivateLessons.tsx     # Private lesson booking and management
│   ├── Settings.tsx
│   ├── UserSettings.tsx
│   ├── auth/                  # Login, Register
│   ├── competitions/          # Competitions, CompetitionDetails
│   ├── groups/                # Groups, GroupDetails
│   └── hubs/                  # HubSelection
├── components/                # 90+ components
│   ├── layout/
│   │   ├── HubLayout.tsx      # Main app shell (Sidebar + Outlet)
│   │   ├── RootLayout.tsx     # Root layout for hub selection
│   │   ├── Sidebar.tsx        # Sport-specific sidebar router
│   │   └── sports/GymnasticsSidebar.tsx  # Main navigation
│   ├── auth/                  # ProtectedRoute
│   ├── attendance/            # DailyAttendanceTab, AttendanceMetricsTab
│   ├── assignments/           # CoachDashboard, TemplatesManager
│   ├── calendar/              # CreateEventModal, EventDetailsModal
│   ├── competitions/          # Session, roster, coach management
│   ├── groups/                # Posts, attachments (polls, RSVPs, signups)
│   ├── gymnast/               # Profile tabs (Skills, Scores, Attendance), injury reports
│   ├── hubs/                  # Hub creation, member management
│   ├── marketplace/           # Item listings, hub linking
│   ├── mentorship/            # Pairing management, random assignment
│   ├── messages/              # AnonymousReportModal
│   ├── private-lessons/       # Lesson booking, coach setup, availability
│   ├── resources/             # Resource cards, category management
│   ├── roster/                # ManageLevelsModal
│   ├── schedule/              # WeeklyScheduleTab, RotationGrid
│   ├── scores/                # ScoresTable, InlineScoreCell, QualifyingBadge, ScoreMetrics
│   ├── settings/              # ChannelsSection, InviteCodesSection, ScoresSettings
│   ├── skills/                # Skills matrix
│   ├── staff/                 # Staff profiles, schedules
│   └── ui/                    # Modal, PageLoader, NotificationBadge
├── types/index.ts             # All TypeScript interfaces
├── hooks/                     # Custom React hooks
│   ├── useAssessments.ts      # Gymnast assessment data management
│   ├── useAssignments.ts      # Assignment CRUD operations
│   ├── useChannels.ts         # Channel management (CRUD)
│   ├── useGoals.ts            # Gymnast goals management
│   ├── useGymnastEditForm.ts  # Gymnast profile edit form state
│   ├── useInviteCodes.ts      # Invite code management
│   ├── useResources.ts        # Resource file management
│   ├── useRoleChecks.ts       # Memoized role checks (isOwner, isStaff, etc.)
│   ├── useStaffBulk.ts        # Bulk staff operations
│   ├── useStations.ts         # Rotation station management
│   └── useTemplates.ts        # Assignment template management
└── lib/
    ├── supabase.ts            # Supabase client singleton
    ├── permissions.ts         # Shared permission logic (used by HubContext)
    ├── qualifyingScores.ts    # Qualifying score thresholds and calculations
    └── seasons.ts             # Season utility functions
```

## Mobile App (`mobile/`)
```
mobile/                        # React Native mobile app (Expo)
├── app/                       # File-based routing (Expo Router)
│   ├── _layout.tsx            # Root layout (SafeAreaProvider, QueryClient)
│   ├── hub-selection.tsx      # Hub picker after login
│   ├── (auth)/                # Auth screens (login, register, forgot-password)
│   ├── (tabs)/                # Main tab navigator
│   │   ├── _layout.tsx        # Tab bar config with safe area insets
│   │   ├── index.tsx          # Dashboard/Home
│   │   ├── calendar.tsx       # Calendar with events
│   │   ├── messages.tsx       # Direct messages
│   │   ├── groups.tsx         # Groups list
│   │   ├── roster.tsx         # Roster list
│   │   ├── scores.tsx         # Scores view
│   │   ├── skills.tsx         # Skills tracking
│   │   ├── competitions.tsx   # Competitions list
│   │   ├── assignments.tsx    # Assignments view
│   │   ├── attendance.tsx     # Attendance tracking
│   │   └── more.tsx           # More menu (feature links)
│   ├── chat/[channelId].tsx   # Chat conversation
│   ├── group/[groupId].tsx    # Group details + posts
│   ├── roster/                # Roster screens
│   ├── competitions/          # Competitions screens
│   ├── scores/                # Scores screens
│   ├── skills/                # Skills screens
│   ├── attendance/            # Attendance screens
│   ├── assignments/           # Assignments screens
│   ├── staff/                 # Staff screens
│   ├── schedule/              # Schedule screens
│   ├── mentorship/            # Mentorship screens
│   ├── marketplace/           # Marketplace screens
│   ├── resources/             # Resources screens
│   ├── private-lessons/       # Private lesson screens
│   ├── hub-settings/          # Hub settings (invite codes, levels, permissions)
│   ├── settings/              # User settings
│   └── anonymous-reports.tsx  # Anonymous report viewing
├── android/                   # Native Android project (Gradle builds)
│   ├── build.gradle           # Root Gradle config
│   ├── app/build.gradle       # App-level Gradle config (APK builds)
│   ├── gradlew               # Gradle wrapper (use for APK builds, NOT Expo EAS)
│   └── app/src/               # Native Android source
├── src/
│   ├── stores/                # Zustand state management
│   │   ├── authStore.ts       # Auth state (user, session, initialize)
│   │   ├── hubStore.ts        # Hub data, linked gymnasts, role checks
│   │   ├── notificationStore.ts # Badge counts, polling
│   │   └── tabPreferencesStore.ts # Tab visibility preferences
│   ├── components/
│   │   ├── ui/                # Button, Card, Badge, Input
│   │   ├── calendar/          # CreateEventModal, EventDetailsModal
│   │   ├── groups/            # PostCard
│   │   ├── messages/          # AnonymousReportModal, CreateChannelModal, NewDMModal
│   │   ├── scores/            # QualifyingBadge
│   │   └── settings/          # CustomizeTabsModal
│   ├── constants/colors.ts    # Brand colors (matches web)
│   ├── lib/
│   │   ├── permissions.ts     # Shared permission logic (mirrors web)
│   │   ├── qualifyingScores.ts # Qualifying score logic (mirrors web)
│   │   └── supabase.ts        # Supabase client
│   └── services/supabase.ts   # Supabase client (legacy)
└── package.json
```
