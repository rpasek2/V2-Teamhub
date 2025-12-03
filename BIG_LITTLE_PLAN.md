# Big/Little Sister Mentorship Feature Plan

## Overview
A mentorship program feature that pairs upper-level gymnasts ("Bigs") with lower-level gymnasts ("Littles") for mentorship. Includes pairing management and event scheduling that syncs with the hub calendar.

---

## Database Schema

### Table 1: `mentorship_pairs`
Stores the Big/Little pairings between gymnasts.

```sql
CREATE TABLE mentorship_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    big_gymnast_id UUID NOT NULL REFERENCES gymnast_profiles(id) ON DELETE CASCADE,
    little_gymnast_id UUID NOT NULL REFERENCES gymnast_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    paired_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate pairings and self-pairing
    UNIQUE(hub_id, big_gymnast_id, little_gymnast_id),
    CONSTRAINT different_gymnasts CHECK (big_gymnast_id != little_gymnast_id)
);
```

### Table 2: `mentorship_events`
Stores Big/Little specific events that auto-sync to the calendar.

```sql
CREATE TABLE mentorship_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Links to main calendar
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note:** When a mentorship event is created, a corresponding entry is created in the main `events` table with `type = 'social'` so it appears on the hub calendar. The `event_id` foreign key links them.

---

## TypeScript Types

```typescript
// Add to types/index.ts

export interface MentorshipPair {
    id: string;
    hub_id: string;
    big_gymnast_id: string;
    little_gymnast_id: string;
    status: 'active' | 'inactive';
    paired_date: string;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    big_gymnast?: GymnastProfile;
    little_gymnast?: GymnastProfile;
}

export interface MentorshipEvent {
    id: string;
    hub_id: string;
    event_id: string | null;
    title: string;
    description: string | null;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
```

---

## Feature Tab Integration

### 1. Update `HubFeatureTab` type
```typescript
export type HubFeatureTab = 'roster' | 'calendar' | 'messages' | 'competitions' | 'scores' | 'marketplace' | 'groups' | 'mentorship';
```

### 2. Update `HUB_FEATURE_TABS` array
```typescript
{ id: 'mentorship', label: 'Big/Little', description: 'Manage big sister/little sister mentorship pairings' },
```

### 3. Add to sidebar navigation
```typescript
{ name: 'Big/Little', href: `/hub/${hubId}/mentorship`, icon: HeartHandshake, permission: 'mentorship', tabId: 'mentorship' as HubFeatureTab },
```

### 4. Add route in App.tsx
```typescript
<Route path="mentorship" element={<Mentorship />} />
```

---

## UI Components

### Page Structure: `src/pages/Mentorship.tsx`

**Desktop Layout (Side-by-Side):**
```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ Big/Little Program                                                                  │
│ Manage your team's mentorship pairings and events                                   │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ ┌─────────────────────────────────────────────┐  ┌────────────────────────────────┐│
│ │ PAIRINGS                  [+ Create Pairing]│  │ UPCOMING EVENTS  [+ Add Event] ││
│ ├─────────────────────────────────────────────┤  ├────────────────────────────────┤│
│ │ Search...              [Filter: Active ▼]  │  │                                ││
│ ├─────────────────────────────────────────────┤  │ ┌────────────────────────────┐ ││
│ │                                             │  │ │ Dec 15                     │ ││
│ │ ┌───────────────┐ ┌───────────────┐        │  │ │ Holiday Gift Exchange      │ ││
│ │ │ Sarah M.      │ │ Emma J.       │        │  │ │ 📍 Main Lobby  ⏰ 4:00 PM  │ ││
│ │ │ Level 7       │ │ Level 8       │        │  │ └────────────────────────────┘ ││
│ │ │ 🎂 Mar 15     │ │ 🎂 Jun 22     │        │  │                                ││
│ │ │ 🏆 State Dec 8│ │ 🏆 Regionals  │        │  │ ┌────────────────────────────┐ ││
│ │ │      ↕        │ │      ↕        │        │  │ │ Jan 10                     │ ││
│ │ │ Lily R.       │ │ Ava S.        │        │  │ │ Ice Skating Outing         │ ││
│ │ │ Level 4       │ │ Level 3       │        │  │ │ 📍 Ice Rink    ⏰ 2:00 PM  │ ││
│ │ │ 🎂 Sep 8      │ │ 🎂 Dec 1      │        │  │ └────────────────────────────┘ ││
│ │ │ 🏆 Invite Nov │ │               │        │  │                                ││
│ │ └───────────────┘ └───────────────┘        │  │ ┌────────────────────────────┐ ││
│ │                                             │  │ │ Feb 14                     │ ││
│ │ ┌───────────────┐ ┌───────────────┐        │  │ │ Valentine's Day Party      │ ││
│ │ │ Olivia K.     │ │ Megan T.      │        │  │ │ 📍 Gym Studio  ⏰ 5:00 PM  │ ││
│ │ │ Level 9       │ │ Level 10      │        │  │ └────────────────────────────┘ ││
│ │ │ 🎂 Jan 20     │ │ 🎂 Apr 5      │        │  │                                ││
│ │ │ 🏆 Nationals  │ │ 🏆 Classic    │        │  │ ─────── Past Events ───────   ││
│ │ │      ↕        │ │      ↕        │        │  │ (collapsible)                  ││
│ │ │ Mia P.        │ │ Sophie L.     │        │  │                                ││
│ │ │ Level 5       │ │ Level 5       │        │  │                                ││
│ │ │ 🎂 Nov 30     │ │ 🎂 Jul 14     │        │  │                                ││
│ │ └───────────────┘ └───────────────┘        │  │                                ││
│ │                                             │  │                                ││
│ └─────────────────────────────────────────────┘  └────────────────────────────────┘│
│                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Mobile Layout (Stacked with Tabs):**
```
┌─────────────────────────────────────┐
│ Big/Little Program                  │
│ Manage mentorship pairings          │
├─────────────────────────────────────┤
│ [Pairings] [Events]                 │
├─────────────────────────────────────┤
│                                     │
│ (Shows selected tab content)        │
│                                     │
└─────────────────────────────────────┘
```

**Responsive Behavior:**
- **Desktop (lg+)**: Side-by-side layout with Pairings (2/3 width) and Events (1/3 width)
- **Tablet (md)**: Side-by-side with equal widths
- **Mobile (sm-)**: Stacked with tab navigation to switch between views

### Components to Create:

1. **`src/pages/Mentorship.tsx`** - Main page with responsive side-by-side/tabbed layout
2. **`src/components/mentorship/PairingsSection.tsx`** - Left panel with pairing cards grid
3. **`src/components/mentorship/EventsSection.tsx`** - Right panel with events list
4. **`src/components/mentorship/CreatePairingModal.tsx`** - Modal to create new pairing
5. **`src/components/mentorship/PairingCard.tsx`** - Card displaying a Big/Little pair
6. **`src/components/mentorship/CreateMentorshipEventModal.tsx`** - Modal to create events
7. **`src/components/mentorship/MentorshipEventCard.tsx`** - Card for event display

---

## Key Features

### Pairings Management

1. **Create Pairing**
   - Select "Big" gymnast from roster (filtered by level if desired)
   - Select "Little" gymnast from roster
   - Set paired date
   - Add optional notes
   - A gymnast can be a Big to multiple Littles
   - A gymnast can be a Little to multiple Bigs
   - Validation: Cannot pair gymnast with themselves

2. **View Pairings**
   - Card-based grid layout showing Big ↔ Little pairs
   - Filter by status (Active/Inactive/All)
   - Search by gymnast name
   - Show gymnast level and photo (if available)
   - Display birthday (month/day only, e.g., "Mar 15") for gift planning
   - Show next upcoming competition (if gymnast is assigned to one)

3. **Edit/Remove Pairing**
   - Change status (active/inactive)
   - Edit notes
   - Delete pairing

### Events Management

1. **Create Big/Little Event**
   - Title, description
   - Date, start time, end time
   - Location
   - Auto-creates entry in main `events` table with `type = 'social'`

2. **View Events**
   - List of upcoming events
   - Past events section (collapsible)
   - Click to view/edit details

3. **Calendar Integration**
   - Events appear on main hub calendar
   - Calendar shows "Big/Little: [Event Title]" format
   - RSVP enabled for Big/Little events

---

## Permission Model

| Role | View Pairings | Create/Edit Pairings | View Events | Create/Edit Events |
|------|---------------|----------------------|-------------|-------------------|
| Owner | Yes | Yes | Yes | Yes |
| Director | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes |
| Coach | Yes | Yes | Yes | Yes |
| Parent | Own child only | No | Yes | No |
| Gymnast | Own pairing only | No | Yes | No |

---

## Implementation Steps

### Phase 1: Database & Types
1. [ ] Create database migration for `mentorship_pairs` table
2. [ ] Create database migration for `mentorship_events` table
3. [ ] Add RLS policies for both tables
4. [ ] Add TypeScript types to `types/index.ts`
5. [ ] Add `mentorship` to `HubFeatureTab` type and `HUB_FEATURE_TABS` array

### Phase 2: Core UI
6. [ ] Add route in `App.tsx`
7. [ ] Add navigation item in `GymnasticsSidebar.tsx`
8. [ ] Create `src/pages/Mentorship.tsx` with tab structure
9. [ ] Create `PairingCard.tsx` component
10. [ ] Create `CreatePairingModal.tsx` component

### Phase 3: Pairings Functionality
11. [ ] Implement fetching pairings with gymnast profile joins
12. [ ] Implement create pairing functionality
13. [ ] Implement edit/delete pairing functionality
14. [ ] Add search and filter functionality

### Phase 4: Events
15. [ ] Create `CreateMentorshipEventModal.tsx`
16. [ ] Create `MentorshipEventRow.tsx` component
17. [ ] Implement event CRUD operations
18. [ ] Add trigger/function to auto-create calendar event when mentorship event is created
19. [ ] Add trigger to sync updates/deletes to calendar

### Phase 5: Polish
20. [ ] Add empty states
21. [ ] Add loading states
22. [ ] Test all permission scenarios
23. [ ] Mobile responsiveness

---

## Database Trigger for Calendar Sync

```sql
-- When a mentorship event is created, also create a calendar event
CREATE OR REPLACE FUNCTION sync_mentorship_event_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
    new_event_id UUID;
BEGIN
    -- Create the calendar event
    INSERT INTO events (
        hub_id,
        title,
        description,
        start_time,
        end_time,
        location,
        type,
        rsvp_enabled,
        created_by
    ) VALUES (
        NEW.hub_id,
        'Big/Little: ' || NEW.title,
        NEW.description,
        (NEW.event_date || ' ' || COALESCE(NEW.start_time, '00:00:00'))::TIMESTAMPTZ,
        (NEW.event_date || ' ' || COALESCE(NEW.end_time, '23:59:59'))::TIMESTAMPTZ,
        NEW.location,
        'social',
        true,
        NEW.created_by
    )
    RETURNING id INTO new_event_id;

    -- Update the mentorship event with the calendar event ID
    NEW.event_id := new_event_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_mentorship_event
    BEFORE INSERT ON mentorship_events
    FOR EACH ROW
    EXECUTE FUNCTION sync_mentorship_event_to_calendar();
```

---

## Questions to Clarify

1. **Terminology**: Should we use "Big/Little" or "Big Sister/Little Sister"? (The term "Sister" might not apply to all gymnasts)
   - Recommendation: Use "Big/Little" as it's gender-neutral

2. **Multiple Pairings**: Confirm that:
   - One Big can have multiple Littles ✓
   - One Little can have multiple Bigs ✓ (less common but possible)

3. **Visibility**: Should parents see all pairings or only their child's pairing?
   - Recommendation: Parents see only their child's pairings

4. **Historical Data**: Keep inactive pairings for historical reference or allow deletion?
   - Recommendation: Keep inactive pairings, allow full deletion for staff

5. **Event RSVP**: Should Big/Little events have RSVP?
   - Recommendation: Yes, enabled by default
