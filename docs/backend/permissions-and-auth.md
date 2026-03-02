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

## Auth State

### Web (React Context)
- **AuthContext** provides: `user`, `session`, `loading`, `signOut`
- **HubContext** provides: hub data, `currentRole`, permissions, `linkedGymnasts`

### Mobile (Zustand)
- **authStore** provides: `user`, `session`, `loading`, `initialize()`
- **hubStore** provides: hub data, linked gymnasts, role checks
