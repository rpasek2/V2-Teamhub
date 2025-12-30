# Gymnast Profiles → TeamHub V2 Integration Plan

## Executive Summary

This plan outlines how to integrate the Gymnast Profiles app functionality into TeamHub V2. The integration distributes features across multiple locations based on their nature:

| Feature | Gymnast Profiles Location | TeamHub V2 Location |
|---------|--------------------------|---------------------|
| **Assignments/Checklists** | Coach Mode, Lesson Plans | **Assignments tab** (new) |
| **Station Assignments** | Coach Mode | **Assignments tab** (new) |
| **Goals & Subgoals** | Gymnast Profile | **GymnastProfileModal** (enhance existing) |
| **Assessment** | Gymnast Profile | **GymnastProfileModal** (enhance existing) |
| **Templates** | Templates Manager | **Assignments tab** (new) |
| **Dashboard/Stats** | Dashboard tab | **Assignments tab** (new) |
| **Parent/Gymnast Access** | Separate login system | Already exists in TeamHub |

---

## Part 1: Database Schema

### New Tables Required

#### 1. `gymnast_assignments` (replaces `lesson_plans`)
```sql
CREATE TABLE gymnast_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    gymnast_profile_id UUID NOT NULL REFERENCES gymnast_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Event-specific exercises (newline-separated text)
    vault TEXT DEFAULT '',
    bars TEXT DEFAULT '',
    beam TEXT DEFAULT '',
    floor TEXT DEFAULT '',
    strength TEXT DEFAULT '',
    flexibility TEXT DEFAULT '',
    conditioning TEXT DEFAULT '',

    -- Progress tracking
    completed_items JSONB DEFAULT '{}',
    -- Structure: { "vault": [0, 2, 4], "bars": [1, 3] } (indices of completed exercises)

    notes TEXT DEFAULT '',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(hub_id, gymnast_profile_id, date)
);
```

#### 2. `station_assignments`
```sql
CREATE TABLE station_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    level TEXT NOT NULL,
    event TEXT NOT NULL, -- vault, bars, beam, floor, strength, flexibility, conditioning

    -- Hierarchical stations structure
    stations JSONB DEFAULT '[]',
    -- Structure: [
    --   { "id": "uuid", "content": "Station 1 exercises...", "side_stations": [
    --     { "id": "uuid", "content": "Side station exercises..." }
    --   ]}
    -- ]

    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(hub_id, date, level, event)
);
```

#### 3. `assignment_templates`
```sql
CREATE TABLE assignment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    event TEXT NOT NULL, -- vault, bars, beam, floor, strength, flexibility, conditioning
    exercises TEXT NOT NULL, -- newline-separated
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. `gymnast_goals` (for GymnastProfileModal enhancement)
```sql
CREATE TABLE gymnast_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gymnast_profile_id UUID NOT NULL REFERENCES gymnast_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event TEXT, -- NULL = overall goal, or specific event
    target_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5. `gymnast_subgoals`
```sql
CREATE TABLE gymnast_subgoals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES gymnast_goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 6. `gymnast_assessments` (for GymnastProfileModal enhancement)
```sql
CREATE TABLE gymnast_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gymnast_profile_id UUID NOT NULL REFERENCES gymnast_profiles(id) ON DELETE CASCADE,
    strengths TEXT DEFAULT '',
    weaknesses TEXT DEFAULT '',
    overall_plan TEXT DEFAULT '',
    injuries TEXT DEFAULT '', -- Current active injuries (separate from injury_reports)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(gymnast_profile_id)
);
```

### RLS Policies
```sql
-- All tables: hub members can read/write based on hub membership
-- Parents can only see their own linked gymnasts' data
-- Staff (owner, director, admin, coach) have full access
```

---

## Part 2: Assignments Tab Implementation

### File Structure
```
src/
├── pages/
│   └── Assignments.tsx                    # Main page (replace skeleton)
├── components/
│   └── assignments/
│       ├── CoachModeView.tsx              # Main coach view (grouped by level)
│       ├── AssignmentCard.tsx             # Individual gymnast checklist card
│       ├── StationCard.tsx                # Level-wide station display
│       ├── MultiAssignmentModal.tsx       # Create assignments modal
│       ├── TemplatesManager.tsx           # Manage reusable templates
│       ├── AssignmentDashboard.tsx        # Stats and progress overview
│       └── DateNavigator.tsx              # Date selection component
├── hooks/
│   └── assignments/
│       ├── useAssignments.ts              # Fetch/upsert assignments
│       ├── useStations.ts                 # Fetch/upsert stations
│       └── useTemplates.ts                # Fetch/upsert templates
└── types/
    └── index.ts                           # Add assignment types
```

### Types to Add
```typescript
// Assignment event types (includes conditioning, not pommel/rings/etc for assignments)
export type AssignmentEventType =
    | 'vault' | 'bars' | 'beam' | 'floor'
    | 'strength' | 'flexibility' | 'conditioning';

export const ASSIGNMENT_EVENTS: AssignmentEventType[] = [
    'vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'
];

export const ASSIGNMENT_EVENT_LABELS: Record<AssignmentEventType, string> = {
    vault: 'Vault',
    bars: 'Bars',
    beam: 'Beam',
    floor: 'Floor',
    strength: 'Strength',
    flexibility: 'Flexibility',
    conditioning: 'Conditioning'
};

export const ASSIGNMENT_EVENT_COLORS: Record<AssignmentEventType, { bg: string; border: string }> = {
    vault: { bg: 'bg-emerald-900/30', border: 'border-emerald-700/50' },
    bars: { bg: 'bg-sky-900/30', border: 'border-sky-700/50' },
    beam: { bg: 'bg-pink-900/30', border: 'border-pink-700/50' },
    floor: { bg: 'bg-slate-800', border: 'border-slate-600' },
    strength: { bg: 'bg-amber-900/30', border: 'border-amber-700/50' },
    flexibility: { bg: 'bg-violet-900/30', border: 'border-violet-700/50' },
    conditioning: { bg: 'bg-cyan-900/30', border: 'border-cyan-700/50' }
};

export interface CompletedItems {
    [key: string]: number[]; // event key -> indices of completed exercises
}

export interface GymnastAssignment {
    id: string;
    hub_id: string;
    gymnast_profile_id: string;
    date: string;
    vault: string;
    bars: string;
    beam: string;
    floor: string;
    strength: string;
    flexibility: string;
    conditioning: string;
    completed_items: CompletedItems;
    notes: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    gymnast_profiles?: GymnastProfile;
}

export interface SideStation {
    id: string;
    content: string;
}

export interface MainStation {
    id: string;
    content: string;
    side_stations: SideStation[];
}

export interface StationAssignment {
    id: string;
    hub_id: string;
    date: string;
    level: string;
    event: AssignmentEventType;
    stations: MainStation[];
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface AssignmentTemplate {
    id: string;
    hub_id: string;
    name: string;
    event: AssignmentEventType;
    exercises: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
```

### Page Tabs Structure
The Assignments page will have tabs similar to Gymnast Profiles' HomePage:

1. **Coach Mode** (default) - View/track assignments by date/event/level
2. **Templates** - Manage reusable exercise templates
3. **Dashboard** - Statistics and progress tracking

### Key Components

#### Assignments.tsx (Main Page)
- Tab navigation (Coach Mode, Templates, Dashboard)
- Gender toggle (Girls/Boys) similar to Skills page
- Permission checks (staff can manage, parents view only)

#### CoachModeView.tsx
- Date navigator (prev/next/today)
- Event selector pills
- Level filter
- "New Assignment" button
- Groups content by level showing:
  - Station cards (if any)
  - Individual gymnast assignment cards

#### MultiAssignmentModal.tsx
- Step 1: Select assignment type (Checklist vs Stations)
- Step 2 (Checklist): Select gymnasts by level with checkboxes
- Step 2 (Stations): Select single level
- Step 3: Enter exercises with template support
- Date selector
- Notes field

#### AssignmentCard.tsx
- Shows gymnast name
- Checkbox list of exercises
- Progress count (X/Y completed)
- Trophy/celebration on 100% completion
- Menu: Mark absent, Delete

---

## Part 3: GymnastProfileModal Enhancement

### New Sections to Add

#### Goals Section
- Add collapsible "Goals" card to GymnastProfileModal
- Show list of goals with:
  - Goal title and description
  - Target date
  - Event category (or "Overall")
  - Completion status
  - Subgoals with checkboxes
- "Add Goal" button for staff
- Inline editing

#### Assessment Section
- Add collapsible "Coach Assessment" card (staff-only view)
- Text areas for:
  - Strengths
  - Weaknesses
  - Current Injuries
  - Overall Training Plan
- Auto-save on blur
- Staff can edit, parents cannot see

### Component Changes
```
src/components/gymnast/
├── GymnastProfileModal.tsx        # Enhance with Goals + Assessment
├── GymnastGoalsSection.tsx        # New: Goals display/edit
├── GymnastAssessmentSection.tsx   # New: Assessment display/edit
└── AddGoalModal.tsx               # New: Create/edit goal
```

---

## Part 4: Features NOT Being Migrated

| Feature | Reason |
|---------|--------|
| **Parent sharing settings** | TeamHub already has role-based permissions |
| **Parent/Gymnast login flow** | TeamHub already handles this via hub invites |
| **Invite codes** | TeamHub has hub_invites table |
| **Separate user_profiles table** | TeamHub uses hub_members.role |
| **Calendar component** | TeamHub has full calendar |

---

## Part 5: Implementation Order

### Phase 1: Database (Day 1)
1. Create migration for new tables
2. Add RLS policies
3. Generate TypeScript types

### Phase 2: Types & Hooks (Day 1-2)
1. Add types to `src/types/index.ts`
2. Create hooks:
   - `useAssignments.ts`
   - `useStations.ts`
   - `useTemplates.ts`
   - `useGoals.ts`
   - `useAssessment.ts`

### Phase 3: Assignments Tab (Day 2-4)
1. Replace Assignments.tsx skeleton
2. Build CoachModeView
3. Build MultiAssignmentModal
4. Build AssignmentCard
5. Build StationCard
6. Build TemplatesManager
7. Build AssignmentDashboard

### Phase 4: GymnastProfileModal Enhancement (Day 4-5)
1. Create GymnastGoalsSection
2. Create GymnastAssessmentSection
3. Create AddGoalModal
4. Integrate into GymnastProfileModal

### Phase 5: Testing & Polish (Day 5-6)
1. Test all CRUD operations
2. Test permission scopes
3. Test parent view
4. Apply Digital Gym dark theme styling
5. Add loading states
6. Add empty states

---

## Part 6: Design Considerations

### Dark Theme Adaptation
All components from Gymnast Profiles use a light theme. They need to be converted to Digital Gym dark theme:

| Light Theme | Dark Theme |
|-------------|------------|
| `bg-white` | `bg-slate-800` |
| `bg-slate-50` | `bg-slate-800/50` |
| `bg-emerald-50` | `bg-emerald-900/30` |
| `border-slate-200` | `border-slate-700/50` |
| `text-slate-900` | `text-chalk-50` |
| `text-slate-600` | `text-chalk-400` |
| `text-slate-500` | `text-slate-400` |

### Responsive Design
- Keep mobile-first approach
- Use existing TeamHub patterns for responsive breakpoints

### Animations
- Use existing TeamHub animation classes
- Consider adding Fireworks component for celebration (optional)

---

## Part 7: Permission Matrix

| Action | Owner | Director | Admin | Coach | Parent | Gymnast |
|--------|-------|----------|-------|-------|--------|---------|
| View all assignments | ✓ | ✓ | ✓ | ✓ | Linked only | Own only |
| Create assignments | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit assignments | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Delete assignments | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Toggle completion | ✓ | ✓ | ✓ | ✓ | Linked only | Own only |
| Manage templates | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| View assessments | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit assessments | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| View goals | ✓ | ✓ | ✓ | ✓ | Linked only | Own only |
| Edit goals | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |

---

---

## Part 8: Coach View vs Parent View

The Assignments tab will display **completely different interfaces** based on user role.

### Coach View (Staff: owner, director, admin, coach)

**Layout:** Full management interface with tabs
- **Coach Mode Tab** - Main assignment management
  - Date navigator with prev/today/next
  - Event selector pills (Vault, Bars, Beam, etc.)
  - Level filter dropdown
  - "New Assignment" button
  - Grouped by level showing:
    - Station cards (level-wide)
    - Individual gymnast cards with checkboxes
  - Can toggle completion for any gymnast
  - Can edit/delete assignments
- **Templates Tab** - Manage reusable templates
- **Dashboard Tab** - Stats across all gymnasts

**Key Actions:**
- Create assignments (individual checklists or level-wide stations)
- Edit/delete assignments
- Toggle completion status
- Manage templates
- View all statistics

---

### Parent View (role: parent)

**Philosophy:** Parents see a **personalized dashboard** focused entirely on their linked gymnasts. This follows TeamHub's existing pattern where parents only see data relevant to their own children.

**Layout:** Personal dashboard with their gymnasts' assignments and stats

```
┌─────────────────────────────────────────────────────┐
│  Assignments                                        │
│  ◀ Dec 17    Today, Dec 18    Dec 19 ▶             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👤 Emma Smith                    72%        │   │
│  │    Level 5                       18/25      │   │
│  │ ┌─────────────────────────────────────────┐ │   │
│  │ │████████████████████░░░░░░░░░│           │ │   │
│  │ └─────────────────────────────────────────┘ │   │
│  │                                             │   │
│  │ [Vault 5/5 ✓] [Bars 4/6] [Beam 3/5]       │   │
│  │ [Floor 2/4] [Strength 4/5]                 │   │
│  │                                             │   │
│  │                        View Details →       │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👤 Olivia Smith                  45%        │   │
│  │    Level 3                       9/20       │   │
│  │ ...                                         │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  No assignments today                              │
│  [Sophie Smith - Level 2]                          │
│                                                     │
├─────────────────────────────────────────────────────┤
│  📊 My Kids' Progress (All-Time)                   │
│                                                     │
│  Total Exercises: 1,247    Completed: 892 (72%)   │
│                                                     │
│  Emma Smith     ████████████████░░░░  78%         │
│  Olivia Smith   ████████████░░░░░░░░  62%         │
│  Sophie Smith   ██████████████████░░  89%         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Parent View Features:**

1. **Today's Assignments** (default view)
   - Card for each linked gymnast with assignments today
   - Progress bar and completion percentage
   - Event summary badges (Vault 5/5 ✓, Bars 3/6, etc.)
   - Click to expand/view full assignment details
   - Section for gymnasts with no assignments today

2. **Assignment Detail View** (expanded card or click-through)
   - Full list of exercises per event
   - Visual completion status (checkmark vs empty circle)
   - Can toggle completion if hub allows (see settings below)
   - Coach notes visible

3. **My Kids' Progress Stats** (bottom section)
   - All-time stats scoped to ONLY their linked gymnasts
   - Total exercises assigned vs completed
   - Per-child completion rates
   - Per-event breakdown for each child

4. **Date Navigation**
   - View past/future assignments
   - See what was assigned on previous days

**What Parents DON'T See:**
- Other gymnasts' assignments or progress
- Team-wide statistics
- Templates
- Ability to create/edit/delete assignments

**Key Differences from Coach View:**
| Feature | Coach View | Parent View |
|---------|-----------|-------------|
| See all gymnasts | ✓ | Only linked |
| Create assignments | ✓ | ✗ |
| Delete assignments | ✓ | ✗ |
| Edit exercises | ✓ | ✗ |
| Toggle completion | ✓ | Configurable |
| Manage templates | ✓ | ✗ |
| View dashboard stats | All gymnasts | Own kids only |
| View station assignments | ✓ | ✓ (their kid's level) |

---

### Gymnast View (role: gymnast)

Similar to Parent View but shows only their own profile:
- Single gymnast card (themselves)
- Click to see full assignment
- Can toggle completion (if hub allows)

---

### Hub Setting: Parent/Gymnast Can Toggle Completion

Add a new hub setting to control whether parents/gymnasts can mark exercises complete:

```typescript
// In hub.settings
{
  assignments?: {
    allowParentToggle: boolean;   // default: true
    allowGymnastToggle: boolean;  // default: true
  }
}
```

**Use Cases:**
- `allowParentToggle: true` - Parents can check off homework their child completed at home
- `allowParentToggle: false` - Only coaches can mark completion (for in-gym tracking only)

---

### Component Structure for Views

```
src/components/assignments/
├── coach/
│   ├── CoachModeView.tsx          # Main coach interface
│   ├── AssignmentCard.tsx         # Editable gymnast card
│   ├── StationCard.tsx            # Station display
│   ├── MultiAssignmentModal.tsx   # Create assignments
│   ├── TemplatesManager.tsx       # Template CRUD
│   └── AssignmentDashboard.tsx    # Stats view
│
├── parent/
│   ├── ParentAssignmentsView.tsx  # Parent dashboard
│   ├── ParentAssignmentCard.tsx   # Read-only or toggle-only card
│   ├── AssignmentDetailView.tsx   # Full exercise list
│   └── ParentStationCard.tsx      # Level-wide station display
│
└── shared/
    ├── DateNavigator.tsx          # Date selection
    ├── EventBadge.tsx             # Event pills with progress
    ├── ProgressBar.tsx            # Visual progress indicator
    └── ExerciseList.tsx           # Checkbox/display list
```

---

### Page Logic (Assignments.tsx)

```typescript
export function Assignments() {
  const { currentRole } = useHub();

  const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');

  if (isStaff) {
    return <CoachAssignmentsView />;
  }

  // Parent or gymnast view
  return <ParentAssignmentsView />;
}
```

---

## Summary

This integration will:
1. Add a full-featured **Assignments tab** with:
   - **Coach View**: Full management (Coach Mode, Templates, Dashboard tabs)
   - **Parent View**: Simplified dashboard showing their linked gymnasts' assignments
   - **Gymnast View**: Personal assignment view
2. Enhance **GymnastProfileModal** with Goals and Assessment sections
3. Leverage existing TeamHub patterns (permissions, dark theme, components)
4. NOT duplicate functionality that already exists (auth, invites, calendar)
5. Add hub settings for parent/gymnast completion toggle permissions

Total estimated effort: **6-7 days** for a complete implementation.
