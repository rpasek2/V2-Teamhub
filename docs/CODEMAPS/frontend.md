# Frontend (Web) Codemap

> **Last Updated:** 2026-02-21

## Tech Stack

- React 19 + Vite 7
- React Router v7
- Tailwind CSS 4
- Headless UI (modals/dialogs)
- Lucide React (icons)
- date-fns (date handling)

## Entry Points

| File | Purpose |
|------|---------|
| `src/main.tsx` | App bootstrap |
| `src/App.tsx` | Router + lazy loading |
| `src/index.css` | Design system |

## Context Providers

| Context | File | Purpose |
|---------|------|---------|
| AuthContext | `src/context/AuthContext.tsx` | User session, auth state |
| HubContext | `src/context/HubContext.tsx` | Active hub, role, permissions |
| NotificationContext | `src/context/NotificationContext.tsx` | Badge counts, realtime |

## Pages (25)

### Auth
- `src/pages/auth/Login.tsx`
- `src/pages/auth/Register.tsx`

### Hub Selection
- `src/pages/hubs/HubSelection.tsx`

### Main Features
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Hub overview |
| Roster | `/roster` | Gymnast list |
| GymnastDetails | `/roster/:gymnastId` | 7-tab gymnast profile |
| Calendar | `/calendar` | Events + RSVP |
| Messages | `/messages` | DM channels |
| Groups | `/groups` | Team groups |
| GroupDetails | `/groups/:groupId` | Group feed |
| Competitions | `/competitions` | Meet list |
| CompetitionDetails | `/competitions/:id` | Meet details |
| Scores | `/scores` | Score entry |
| Skills | `/skills` | Skill matrix |
| Assignments | `/assignments` | Practice assignments |
| Attendance | `/attendance` | Daily check-in |
| Schedule | `/schedule` | Practice times |
| Staff | `/staff` | Staff list |
| StaffDetails | `/staff/:staffUserId` | Staff profile |
| Mentorship | `/mentorship` | Big/Little |
| Marketplace | `/marketplace` | Used gear |
| Resources | `/resources` | Team docs |
| PrivateLessons | `/private-lessons` | Booking |
| Settings | `/settings` | Hub settings |
| UserSettings | `/user-settings` | Profile settings |

## Layouts

| Layout | File | Purpose |
|--------|------|---------|
| RootLayout | `src/components/layout/RootLayout.tsx` | Auth wrapper |
| HubLayout | `src/components/layout/HubLayout.tsx` | Sidebar + content |
| Sidebar | `src/components/layout/Sidebar.tsx` | Sport router |
| GymnasticsSidebar | `src/components/layout/sports/GymnasticsSidebar.tsx` | Main nav |

## Component Categories

### UI Components (`src/components/ui/`)
- `Modal.tsx` - Portal-based modal
- `PageLoader.tsx` - Loading spinner
- `NotificationBadge.tsx` - Badge counts
- `CollapsibleSection.tsx` - Expandable sections
- `SeasonPicker.tsx` - Season selector
- `AddressAutocomplete.tsx` - Google Places

### Feature Components

| Directory | Count | Key Components |
|-----------|-------|----------------|
| `assignments/` | 12 | CoachDashboard, TemplatesManager, AssignmentCard |
| `attendance/` | 2 | DailyAttendanceTab, AttendanceMetricsTab |
| `calendar/` | 2 | CreateEventModal, EventDetailsModal |
| `competitions/` | 6 | CreateSessionModal, ManageCompetitionRosterModal |
| `groups/` | 10 | PostCard, CreatePostModal, GroupSettings |
| `gymnast/` | 5 | GoalsSection, AssessmentSection, AddGoalModal |
| `hubs/` | 4 | CreateHubModal, JoinHubModal, AddMemberModal |
| `marketplace/` | 5 | CreateItemModal, ItemDetailModal |
| `mentorship/` | 4 | CreatePairingModal, RandomAssignModal |
| `dashboard/` | 1 | MyTasksSection |
| `messages/` | 1 | AnonymousReportModal |
| `notifications/` | 2 | NotificationBell, NotificationSettings |
| `private-lessons/` | 8 | BookLessonModal, LessonCalendar |
| `resources/` | 3 | CreateResourceModal, ResourceCard |
| `roster/` | 1 | ManageLevelsModal |
| `schedule/` | 7 | RotationGrid, EventPalette, WeeklyScheduleTab |
| `settings/` | 1 | InviteCodesSection |
| `skills/` | 2 | SkillsTable, ManageSkillsModal |
| `staff/` | 10 | StaffCard, TeamViewDashboard |

## Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useRoleChecks` | Memoized role checks |
| `useChannels` | Channel CRUD |
| `useInviteCodes` | Invite code management |
| `useAssignments` | Assignment data |
| `useTemplates` | Assignment templates |
| `useStations` | Station assignments |
| `useGoals` | Gymnast goals |
| `useAssessments` | Gymnast assessments |
| `useResources` | Hub resources |
| `useStaffBulk` | Bulk staff operations |
| `useGymnastEditForm` | Gymnast form state |

## Lib Utilities (`src/lib/`)

| File | Purpose |
|------|---------|
| `supabase.ts` | Supabase client singleton |
| `permissions.ts` | Permission helpers |
| `notifications.ts` | Notification utility functions |
| `qualifyingScores.ts` | Qualifying score thresholds |
| `seasons.ts` | Season utilities |

## Types (`src/types/index.ts`)

Defines all TypeScript interfaces:
- Core: `Hub`, `HubMember`, `Profile`
- Features: `GymnastProfile`, `Event`, `Competition`, `Group`
- Config: `HubFeatureTab`, `HUB_FEATURE_TABS`
- Constants: `WAG_EVENTS`, `MAG_EVENTS`, `DAYS_OF_WEEK`

## Design System

### Colors (Light Theme)
```
Background:     bg-slate-50
Cards:          bg-white border-slate-200
Text Primary:   text-slate-900
Text Secondary: text-slate-700
Text Muted:     text-slate-500
Brand Primary:  brand-500 to brand-700
```

### Component Classes
```css
.btn-primary    /* Brand button */
.btn-secondary  /* Outlined button */
.btn-ghost      /* Text button */
.btn-danger     /* Red button */
.card           /* Card container */
.input          /* Form input */
.badge-*        /* Status badges */
```
