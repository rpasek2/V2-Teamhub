# Permissions & Authentication

## Role Hierarchy
Roles are hierarchical: `owner > director > admin > coach > parent > athlete`

## Permission Scopes
- `all` — Full access to all data
- `own` — Access only to linked/owned data
- `none` — No access

## Access Rules
- **Owner:** Always has full access (hardcoded, not configurable)
- **All other roles:** Configurable by hub owner via Settings > Permissions
- **Shared logic:** `src/lib/permissions.ts` (web) and `mobile/src/lib/permissions.ts`

## Checking Permissions

### Via HubContext
```typescript
const { currentRole, hasPermission, getPermissionScope } = useHub();

// Check if user can access a feature
hasPermission('scores');          // boolean
getPermissionScope('roster');     // 'all' | 'own' | 'none'
```

### Via useRoleChecks Hook
```typescript
import { useRoleChecks } from '../hooks/useRoleChecks';
const { isOwner, isStaff, canManage, isAthlete, isParent } = useRoleChecks();
```

### Direct Role Checks
```typescript
const canManage = ['owner', 'director', 'admin'].includes(currentRole || '');
const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
```

## Route Guards

### Web: TabGuard
Wraps feature pages to redirect users with `'none'` scope or disabled tabs:
```tsx
<TabGuard tabId="scores">{children}</TabGuard>
```
- Checks both `isTabEnabled()` (hub feature toggle) and `hasPermission()` (role scope)
- Redirects to hub dashboard if either fails
- Uses `TAB_TO_FEATURE` mapping for mismatched IDs: `private_lessons` → `privateLessons`, `progress_reports` → `progressReports`

### Mobile: MobileTabGuard
Same concept, shows a blocked message instead of redirecting:
```tsx
<MobileTabGuard tabId="scores">{children}</MobileTabGuard>
```
- Passes through children while hub is loading (avoids false blocks)
- Shows distinct messages for disabled tabs vs permission blocks
- Applied to all feature routes: marketplace, resources, mentorship, private-lessons, progress-reports, staff, schedule

### Mobile Tab Bar
`isTabVisible()` in `(tabs)/_layout.tsx` hides tabs when `hasPermission()` returns false.

### Dashboard Sections
Both web (`ParentDashboardSections`) and mobile (`(tabs)/index`) gate widgets with `hasPermission()` checks for their respective features.

## Default Permissions
Defined in `src/lib/permissions.ts` and `mobile/src/lib/permissions.ts`. Features: `roster`, `calendar`, `messages`, `groups`, `assignments`, `attendance`, `skills`, `scores`, `competitions`, `schedule`, `staff`, `marketplace`, `mentorship`, `resources`, `settings`, `privateLessons`, `progressReports`.

## Auth State

### Web (React Context)
- **AuthContext** provides: `user`, `session`, `loading`, `signOut`
- **HubContext** provides: hub data, `currentRole`, permissions, `linkedGymnasts`

### Mobile (Zustand)
- **authStore** provides: `user`, `session`, `loading`, `initialize()`
- **hubStore** provides: hub data, linked gymnasts, role checks
