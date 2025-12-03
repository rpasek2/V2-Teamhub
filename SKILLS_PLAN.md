# Skills Tab Implementation Plan

## Overview
The Skills tab allows coaches to track which gymnastics skills each gymnast has mastered for each event. It provides a matrix view where gymnasts are listed on the left and skills are columns, with checkmarks/status indicators showing proficiency.

## Core Features

### 1. Gender Toggle (Top of Page)
- Toggle between Boys (MAG) and Girls (WAG)
- Same pattern as Scores tab
- Remembers selection in state

### 2. Level Selection (Button Row)
- Horizontal row of buttons for each level in the hub
- Levels come from `hub.settings.levels`
- Clicking a level shows gymnasts at that level
- Active level is highlighted

### 3. Event Selection (Secondary Button Row)
- Shows events relevant to selected gender:
  - **Girls (WAG):** Vault, Bars, Beam, Floor
  - **Boys (MAG):** Floor, Pommel, Rings, Vault, P-Bars, High Bar
- Option to add custom events (future enhancement)
- Clicking an event shows skills for that event

### 4. Skills Matrix Table
- **Rows:** Gymnasts at the selected level (sorted alphabetically)
- **Columns:** Skills for the selected event (manually entered by coaches)
- **Cells:** Skill status indicator (click to cycle)

### 5. Skill Status Options (Click to Cycle)
- Empty (not started) → Click →
- Learning (in progress) - yellow/orange indicator → Click →
- Achieved (can do it) - green checkmark → Click →
- Mastered (consistent) - gold star → Click →
- Back to Empty

## Database Schema

### Table: `hub_event_skills` (Skills catalog per hub/level)
```sql
CREATE TABLE hub_event_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id UUID NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    level TEXT NOT NULL, -- Skills are level-specific
    event TEXT NOT NULL, -- 'vault', 'bars', 'beam', 'floor', etc.
    skill_name TEXT NOT NULL,
    skill_order INTEGER DEFAULT 0, -- For custom ordering (coaches can reorder)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),

    UNIQUE(hub_id, level, event, skill_name)
);
```

### Table: `gymnast_skills` (Gymnast progress)
```sql
CREATE TABLE gymnast_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gymnast_profile_id UUID NOT NULL REFERENCES gymnast_profiles(id) ON DELETE CASCADE,
    hub_event_skill_id UUID NOT NULL REFERENCES hub_event_skills(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'none', -- 'none', 'learning', 'achieved', 'mastered'
    notes TEXT,
    achieved_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id),

    UNIQUE(gymnast_profile_id, hub_event_skill_id)
);
```

## Skills Management
- **No default skills** - All skills are manually entered by coaches
- Skills are **level-specific** (Level 3 Vault skills may differ from Level 5 Vault skills)
- Coaches can **reorder skills** via drag-and-drop or up/down arrows
- Skills can be added/edited/deleted by coaches and above

## UI Components

### 1. Skills.tsx (Main Page)
```
/src/pages/Skills.tsx
```
- Hub context for permissions
- Gender toggle state
- Level selection state
- Event selection state
- Fetch gymnasts for level
- Fetch skills for event
- Render SkillsTable component

### 2. SkillsTable.tsx
```
/src/components/skills/SkillsTable.tsx
```
- Receives: gymnasts, skills, canEdit
- Renders matrix table
- Handles skill status updates
- Inline editing for notes

### 3. ManageSkillsModal.tsx
```
/src/components/skills/ManageSkillsModal.tsx
```
- Add/remove/reorder skills for an event at a specific level
- Edit skill names
- Drag-and-drop or up/down arrows for reordering
- Only accessible by coaches and above

## Permissions
- **View:** All hub members (respects tab toggle in settings)
- **Edit skill status:** Coaches and above
- **Manage skills catalog (add/edit/delete/reorder):** Coaches and above

## File Changes Required

### New Files
1. `src/pages/Skills.tsx` - Main page component
2. `src/components/skills/SkillsTable.tsx` - Table component
3. `src/components/skills/ManageSkillsModal.tsx` - Skill catalog management
4. `supabase/migrations/016_skills.sql` - Database tables

### Modified Files
1. `src/types/index.ts` - Add 'skills' to HubFeatureTab, add Skill types
2. `src/App.tsx` - Add route for Skills page
3. `src/components/layout/sports/GymnasticsSidebar.tsx` - Already has Skills (verify)

## Implementation Phases

### Phase 1: Foundation
1. Create database migration with tables and RLS policies
2. Add types to index.ts
3. Create basic Skills.tsx page with gender/level/event selectors
4. Wire up routing

### Phase 2: Core Functionality
1. Create SkillsTable component
2. Implement skill status toggling (click to cycle through statuses)
3. Add skill status persistence to database

### Phase 3: Management
1. Create ManageSkillsModal
2. Add/edit/delete skills for each level/event combination
3. Implement skill reordering (drag-and-drop or up/down arrows)

### Phase 4: Enhancements (Future)
1. Skill progress history
2. Export skill charts
3. Parent view (read-only)
4. Gymnast self-assessment option

## UI Mockup (Text)

```
+------------------------------------------------------------------+
| Skills                                              [Girls] [Boys] |
+------------------------------------------------------------------+
| [Level 1] [Level 2] [Level 3] [Level 4] [Level 5] [+ Add Level]   |
+------------------------------------------------------------------+
| [Vault] [Bars] [Beam] [Floor]                    [Manage Skills]  |
+------------------------------------------------------------------+
|                                                                    |
| Level 3 Gymnasts - Beam                                           |
+------------------------------------------------------------------+
| Gymnast          | Jump | Leap | Cart | BWO | BHS | Tuck | ...   |
+------------------------------------------------------------------+
| Sarah Anderson   |  ✓   |  ✓   |  ✓   |  ◐  |     |      |       |
| Emily Brown      |  ✓   |  ✓   |  ✓   |  ✓  |  ◐  |      |       |
| Jessica Chen     |  ✓   |  ◐   |  ✓   |     |     |      |       |
| ...              |      |      |      |     |     |      |       |
+------------------------------------------------------------------+

Legend: ✓ = Achieved, ★ = Mastered, ◐ = Learning, (empty) = Not started
```

## Status Indicators
- **Empty cell:** Not started (click to mark as learning)
- **◐ (half circle) / Yellow:** Learning/in progress
- **✓ (checkmark) / Green:** Achieved
- **★ (star) / Gold:** Mastered

Clicking cycles through: Empty → Learning → Achieved → Mastered → Empty

## Notes
- Skills are customizable per hub - not all gyms teach the same progressions
- **No default skills** - coaches manually enter all skills for their specific levels
- Skills are **level-specific** - each level has its own set of skills per event
- Skills are orderable (drag-and-drop or up/down arrows) for logical progression
- Consider adding skill prerequisites in the future (must have X to learn Y)
