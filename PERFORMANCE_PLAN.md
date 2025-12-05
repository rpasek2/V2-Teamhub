# TeamHub V2 Performance Optimization Plan

## Overview

This document outlines a comprehensive performance optimization plan organized into 7 phases. Each phase targets specific bottlenecks identified in the performance audit.

---

## Phase 1: Route-Based Code Splitting (Priority: CRITICAL)
**Estimated Impact: 30-40% faster initial load**

### Problem
- Single 1MB+ JavaScript bundle loads on every page
- All 18+ page components imported statically in App.tsx
- Users download code for pages they may never visit

### Changes Required

#### File: `src/App.tsx`

**Current Pattern:**
```typescript
import { Dashboard } from './pages/Dashboard';
import { Roster } from './pages/Roster';
import { Calendar } from './pages/Calendar';
// ... 15+ more static imports
```

**New Pattern:**
```typescript
import { lazy, Suspense } from 'react';

// Lazy load all page components
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Roster = lazy(() => import('./pages/Roster').then(m => ({ default: m.Roster })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Messages = lazy(() => import('./pages/Messages'));
const Groups = lazy(() => import('./pages/groups/Groups'));
const GroupDetails = lazy(() => import('./pages/groups/GroupDetails'));
const Competitions = lazy(() => import('./pages/competitions/Competitions').then(m => ({ default: m.Competitions })));
const CompetitionDetails = lazy(() => import('./pages/competitions/CompetitionDetails').then(m => ({ default: m.CompetitionDetails })));
const Scores = lazy(() => import('./pages/Scores').then(m => ({ default: m.Scores })));
const Skills = lazy(() => import('./pages/Skills').then(m => ({ default: m.Skills })));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Mentorship = lazy(() => import('./pages/Mentorship').then(m => ({ default: m.Mentorship })));
const Staff = lazy(() => import('./pages/Staff').then(m => ({ default: m.Staff })));
const Assignments = lazy(() => import('./pages/Assignments').then(m => ({ default: m.Assignments })));
const Resources = lazy(() => import('./pages/Resources').then(m => ({ default: m.Resources })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const UserSettings = lazy(() => import('./pages/UserSettings').then(m => ({ default: m.UserSettings })));
```

#### File: `src/components/ui/PageLoader.tsx` (NEW)

Create a loading fallback component:
```typescript
import { Loader2 } from 'lucide-react';

export function PageLoader() {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
    );
}
```

#### File: `src/components/layout/HubLayout.tsx`

Wrap Outlet with Suspense:
```typescript
import { Suspense } from 'react';
import { PageLoader } from '../ui/PageLoader';

// In render:
<Suspense fallback={<PageLoader />}>
    <Outlet />
</Suspense>
```

### Implementation Steps
1. Create `PageLoader.tsx` component
2. Update `App.tsx` with lazy imports
3. Wrap route outlets with Suspense
4. Update `HubLayout.tsx` to include Suspense wrapper
5. Test each route loads correctly
6. Verify bundle is split into chunks (check build output)

---

## Phase 2: SVG Logo Optimization (Priority: CRITICAL)
**Estimated Impact: 25% faster page load**

### Problem
- `teamhub-logo.svg` is 1,026 KB (755 KB gzipped)
- Larger than the entire JavaScript bundle
- Loaded on every page

### Changes Required

#### Option A: Compress SVG (Recommended)

1. Use SVGO to compress the logo:
   - Remove metadata, comments, unused elements
   - Optimize paths
   - Target: <50KB

2. If SVG remains large, convert to optimized PNG/WebP:
   - Create multiple sizes for responsive loading
   - `teamhub-logo-sm.webp` (100x100, ~5KB)
   - `teamhub-logo-md.webp` (200x200, ~15KB)
   - `teamhub-logo-lg.webp` (400x400, ~30KB)

#### Option B: External CDN (Alternative)
- Host logo on CDN with caching
- Use `loading="lazy"` attribute

### Implementation Steps
1. Analyze current SVG structure
2. Run through SVGO optimization
3. If still large, convert to WebP with multiple sizes
4. Update all logo imports to use optimized version
5. Add `loading="lazy"` to non-critical logo placements

---

## Phase 3: Context Optimization (Priority: CRITICAL)
**Estimated Impact: 20-30% fewer re-renders**

### Problem
- HubContext contains 12+ values in a single context
- Functions recreated every render (not wrapped in useCallback)
- Context value object recreated every render (not wrapped in useMemo)
- AuthContext value also not memoized

### Changes Required

#### File: `src/context/AuthContext.tsx`

**Current (line 42-44):**
```typescript
return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
```

**New:**
```typescript
import { useMemo, useCallback } from 'react';

// Memoize signOut
const signOut = useCallback(async () => {
    await supabase.auth.signOut();
}, []);

// Memoize context value
const contextValue = useMemo(() => ({
    user,
    session,
    loading,
    signOut
}), [user, session, loading, signOut]);

return (
    <AuthContext.Provider value={contextValue}>
```

#### File: `src/context/HubContext.tsx`

**Changes needed:**

1. **Memoize permission functions (lines 120-157):**
```typescript
const getPermissionScope = useCallback((feature: string): PermissionScope => {
    if (!hub || !currentRole) return 'none';
    if (currentRole === 'owner' || currentRole === 'director') return 'all';
    // ... rest of logic
}, [hub, currentRole]);

const hasPermission = useCallback((feature: string): boolean => {
    const scope = getPermissionScope(feature);
    return scope === 'all' || scope === 'own';
}, [getPermissionScope]);
```

2. **Memoize derived values (lines 116-118):**
```typescript
const currentRole = useMemo(() => member?.role || null, [member]);
const levels = useMemo(() => hub?.settings?.levels || [], [hub?.settings?.levels]);
const sportConfig = useMemo(() => SPORT_CONFIGS[hub?.sport_type || 'gymnastics'], [hub?.sport_type]);
```

3. **Memoize context value (lines 159-173):**
```typescript
const contextValue = useMemo(() => ({
    hub,
    member,
    user,
    currentRole,
    linkedGymnasts,
    levels,
    sportConfig,
    hasPermission,
    getPermissionScope,
    refreshHub,
    loading,
    error
}), [hub, member, user, currentRole, linkedGymnasts, levels, sportConfig,
     hasPermission, getPermissionScope, refreshHub, loading, error]);

return (
    <HubContext.Provider value={contextValue}>
```

### Implementation Steps
1. Update AuthContext.tsx with memoization
2. Update HubContext.tsx with memoization
3. Test that context updates still work correctly
4. Verify re-render count reduced using React DevTools

---

## Phase 4: Parallelize Database Queries (Priority: HIGH)
**Estimated Impact: 40-60% faster page loads**

### Problem
- Many pages run sequential database queries
- Dashboard runs 8+ queries one after another
- Staff page runs 4 queries sequentially

### Changes Required

#### File: `src/pages/Staff.tsx` (lines 54-96)

**Current:**
```typescript
const { data: membersData } = await supabase...  // Query 1
const { data: staffProfiles } = await supabase... // Query 2 (waits for 1)
const { data: timeOffCounts } = await supabase... // Query 3 (waits for 2)
const { data: taskCounts } = await supabase...    // Query 4 (waits for 3)
```

**New:**
```typescript
const fetchStaffMembers = async () => {
    setLoading(true);

    // Run first query to get user IDs
    const { data: membersData, error: membersError } = await supabase
        .from('hub_members')
        .select(`user_id, role, profile:profiles(id, full_name, email, avatar_url)`)
        .eq('hub_id', hubId)
        .in('role', ['owner', 'director', 'admin', 'coach']);

    if (membersError) {
        console.error('Error fetching staff members:', membersError);
        setLoading(false);
        return;
    }

    const userIds = membersData?.map(m => m.user_id) || [];

    // Run remaining 3 queries in parallel
    const [staffProfilesResult, timeOffResult, tasksResult] = await Promise.all([
        supabase
            .from('staff_profiles')
            .select('*')
            .eq('hub_id', hubId)
            .in('user_id', userIds),
        supabase
            .from('staff_time_off')
            .select('staff_user_id')
            .eq('hub_id', hubId)
            .eq('status', 'pending'),
        supabase
            .from('staff_tasks')
            .select('staff_user_id')
            .eq('hub_id', hubId)
            .in('status', ['pending', 'in_progress'])
    ]);

    const staffProfiles = staffProfilesResult.data;
    const timeOffCounts = timeOffResult.data;
    const taskCounts = tasksResult.data;

    // ... rest of combining logic
};
```

#### File: `src/pages/Dashboard.tsx` (lines 50-245)

**Current:** 8+ sequential queries

**New:** Group independent queries with Promise.all:
```typescript
const fetchDashboardData = async () => {
    if (!hub || !user) return;
    setLoadingStats(true);

    try {
        const now = new Date().toISOString();

        // Group 1: Stats queries (all independent)
        const [memberCountResult, gymnastCountResult, eventsResult, competitionsResult] = await Promise.all([
            supabase.from('hub_members').select('*', { count: 'exact', head: true }).eq('hub_id', hub.id),
            supabase.from('gymnast_profiles').select('*', { count: 'exact', head: true }).eq('hub_id', hub.id),
            supabase.from('events').select('id, title, start_time, type', { count: 'exact' })
                .eq('hub_id', hub.id).gte('start_time', now).order('start_time', { ascending: true }).limit(5),
            supabase.from('competitions').select('id, name, start_date, end_date', { count: 'exact' })
                .eq('hub_id', hub.id).gte('end_date', now.split('T')[0]).order('start_date', { ascending: true }).limit(5)
        ]);

        // Group 2: Activity queries (all independent)
        const [recentEventsResult, recentCompsResult, groupAccessResult] = await Promise.all([
            supabase.from('events').select('id, title, created_at')
                .eq('hub_id', hub.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('competitions').select('id, name, created_at')
                .eq('hub_id', hub.id).order('created_at', { ascending: false }).limit(5),
            isStaff
                ? supabase.from('groups').select('id').eq('hub_id', hub.id)
                : supabase.from('group_members').select('group_id, groups!inner(hub_id)')
                    .eq('user_id', user.id).eq('groups.hub_id', hub.id)
        ]);

        // ... process results
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    } finally {
        setLoadingStats(false);
    }
};
```

#### File: `src/pages/Roster.tsx` (lines 86-111)

**Current:** 2 sequential queries

**New:**
```typescript
const fetchMembers = async () => {
    try {
        // Run both queries in parallel
        const [hubMembersResult, gymnastProfilesResult] = await Promise.all([
            supabase.from('hub_members')
                .select(`user_id, role, profile:profiles(full_name, email)`)
                .eq('hub_id', hub?.id),
            supabase.from('gymnast_profiles')
                .select('*')
                .eq('hub_id', hub?.id)
                .order('gymnast_id', { ascending: true })
        ]);

        if (hubMembersResult.error) throw hubMembersResult.error;
        if (gymnastProfilesResult.error) throw gymnastProfilesResult.error;

        // ... combine results
    } catch (error) {
        console.error('Error fetching members:', error);
    } finally {
        setLoading(false);
    }
};
```

### Implementation Steps
1. Update Staff.tsx with Promise.all for parallel queries
2. Update Dashboard.tsx with Promise.all for parallel queries
3. Update Roster.tsx with Promise.all for parallel queries
4. Apply same pattern to other pages (Calendar, Scores, Messages)
5. Test that all data still loads correctly

---

## Phase 5: Memoize Expensive Computations (Priority: HIGH)
**Estimated Impact: 15-20% less CPU usage on large lists**

### Problem
- Filtering and sorting happens inline on every render
- Calendar holiday calculations run on every date change
- No useMemo for derived data

### Changes Required

#### File: `src/pages/Roster.tsx` (lines 210-279)

**Current:**
```typescript
const filteredMembers = members.filter((member) => {
    // Complex filtering logic
}).sort((a, b) => {
    // Complex sorting logic
});
```

**New:**
```typescript
const filteredMembers = useMemo(() => {
    return members.filter((member) => {
        const scope = getPermissionScope('roster');
        if (scope === 'none') return false;

        if (scope === 'own') {
            if (member.type === 'gymnast_profile') {
                const isLinked = linkedGymnasts.some(g => g.id === member.id);
                if (!isLinked) return false;
            } else {
                if (member.id !== user?.id) return false;
            }
        }

        const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (activeTab === 'All') return true;
        const currentTabRoles = tabs.find(t => t.name === activeTab)?.roles || [];
        return currentTabRoles.includes(member.role);
    }).sort((a, b) => {
        // sorting logic
    });
}, [members, searchTerm, activeTab, sortColumn, sortDirection, getPermissionScope, linkedGymnasts, user?.id, hub?.settings?.levels]);
```

#### File: `src/pages/Calendar.tsx` (lines 167-177)

**Current:** Recalculates 3 years of holidays on every currentDate change

**New:** Move to module-level constant (holidays don't change):
```typescript
// At module level (outside component)
const ALL_HOLIDAYS = new Map<string, Holiday>();
for (let year = 2020; year <= 2030; year++) {
    const yearHolidays = getUSHolidays(year);
    yearHolidays.forEach((holiday, key) => ALL_HOLIDAYS.set(key, holiday));
}

// In component:
const getHolidayForDay = (day: Date): Holiday | undefined => {
    const key = format(day, 'yyyy-MM-dd');
    return ALL_HOLIDAYS.get(key);
};
```

#### File: `src/pages/Staff.tsx` (lines 130-138)

**Current:**
```typescript
const filteredStaff = staffMembers.filter(member => {
    // filtering logic
});
```

**New:**
```typescript
const filteredStaff = useMemo(() => {
    return staffMembers.filter(member => {
        const matchesSearch = searchQuery === '' ||
            member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.staff_profile?.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
        return matchesSearch && matchesRole;
    });
}, [staffMembers, searchQuery, roleFilter]);
```

### Implementation Steps
1. Update Roster.tsx with useMemo for filtering/sorting
2. Move Calendar holidays to module-level constant
3. Update Staff.tsx with useMemo for filtering
4. Apply to other pages with filtering (Groups, Marketplace, Messages)

---

## Phase 6: Optimize Supabase Queries (Priority: MEDIUM)
**Estimated Impact: 10-15% smaller network payloads**

### Problem
- Many queries use `select('*')` fetching unnecessary columns
- Some queries fetch nested data not needed
- Parent guardian filtering done client-side

### Changes Required

#### File: `src/context/HubContext.tsx` (lines 84-87)

**Current:**
```typescript
const { data: allProfiles } = await supabase
    .from('gymnast_profiles')
    .select('*')
    .eq('hub_id', hubId);
```

**Optimized:**
```typescript
// Only fetch columns needed for linked gymnast matching
const { data: allProfiles } = await supabase
    .from('gymnast_profiles')
    .select('id, first_name, last_name, level, guardian_1, guardian_2, hub_id')
    .eq('hub_id', hubId);
```

#### File: `src/pages/Roster.tsx` (lines 104-108)

**Current:**
```typescript
const { data: gymnastProfilesData } = await supabase
    .from('gymnast_profiles')
    .select('*')
    .eq('hub_id', hub?.id);
```

**Optimized:**
```typescript
const { data: gymnastProfilesData } = await supabase
    .from('gymnast_profiles')
    .select('id, gymnast_id, first_name, last_name, level, guardian_1, hub_id')
    .eq('hub_id', hub?.id)
    .order('gymnast_id', { ascending: true });
```

#### File: `src/pages/Staff.tsx` (lines 77-81)

**Current:**
```typescript
const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('hub_id', hubId)
    .in('user_id', userIds);
```

**Optimized:**
```typescript
const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select('id, user_id, title, bio, phone, email, hire_date, status')
    .eq('hub_id', hubId)
    .in('user_id', userIds);
```

### Implementation Steps
1. Audit all Supabase queries in pages
2. Replace `select('*')` with specific columns needed
3. Test that all features still work with reduced data

---

## Phase 7: Add useCallback for Event Handlers (Priority: LOW)
**Estimated Impact: 5-10% fewer unnecessary child re-renders**

### Problem
- Event handler functions recreated every render
- Causes unnecessary re-renders in memoized child components

### Changes Required

#### File: `src/pages/Roster.tsx`

**Current (line 154):**
```typescript
const handleDeleteMember = async (member: DisplayMember) => { ... };
```

**New:**
```typescript
const handleDeleteMember = useCallback(async (member: DisplayMember) => {
    const confirmMessage = member.type === 'gymnast_profile'
        ? `Are you sure you want to remove ${member.name}...`
        : `Are you sure you want to remove ${member.name}...`;

    if (!confirm(confirmMessage)) return;
    // ... rest of logic
}, [hub?.id, fetchMembers]);
```

#### File: `src/pages/Calendar.tsx`

**Current (line 282):**
```typescript
const handleDayClick = (day: Date) => { ... };
```

**New:**
```typescript
const handleDayClick = useCallback((day: Date) => {
    if (isMobile) {
        setSelectedDayForMobile(day);
    } else if (canAddEvents) {
        setSelectedDate(day);
        setIsCreateModalOpen(true);
    }
}, [isMobile, canAddEvents]);
```

### Implementation Steps
1. Identify all event handlers in major pages
2. Wrap each with useCallback with appropriate dependencies
3. Test that handlers still work correctly

---

## Implementation Order

| Phase | Priority | Effort | Impact |
|-------|----------|--------|--------|
| Phase 1: Code Splitting | CRITICAL | Medium | 30-40% |
| Phase 2: SVG Optimization | CRITICAL | Low | 25% |
| Phase 3: Context Memoization | CRITICAL | Medium | 20-30% |
| Phase 4: Parallel Queries | HIGH | Medium | 40-60% |
| Phase 5: useMemo Computations | HIGH | Medium | 15-20% |
| Phase 6: Query Optimization | MEDIUM | Low | 10-15% |
| Phase 7: useCallback Handlers | LOW | Low | 5-10% |

**Recommended Order:** 1 → 2 → 4 → 3 → 5 → 6 → 7

Start with code splitting (immediate visual improvement), then SVG (quick win), then parallel queries (biggest impact on tab switching), then context optimization.

---

## Testing Checklist

After each phase:
- [ ] Build succeeds with no TypeScript errors
- [ ] All pages load correctly
- [ ] Data fetches work as expected
- [ ] No console errors
- [ ] Tab switching feels snappier

Final verification:
- [ ] Check build output for chunk sizes
- [ ] Measure Time to Interactive (TTI) before/after
- [ ] Test on slow network (3G throttling)
- [ ] Verify React DevTools shows fewer re-renders
