# Scores Tab Implementation Plan

## Overview
Add a "Scores" tab to the sidebar that displays gymnastics competition scores. The scores are linked to competitions created in the Competitions tab. Scores are displayed in a table format with gymnast names on the left and events as columns.

**Key Features:**
- Individual gymnast scores per event
- Auto-calculated All-Around (AA) for each gymnast
- **Team Scores** - Auto-calculated per level with top scores from each event
- Team AA Score - Sum of all team event scores

## Team Score Calculation Rules

### Levels 6-10 (Optional/Xcel)
- **Top 3 scores** from each event count toward team score
- Team AA = Sum of all team event scores
- Each level has its own team score

### Levels 1-5 (Compulsory)
- **Toggle between Top 3 or Top 5** scores per event
- Team AA = Sum of all team event scores
- Each level has its own team score
- Default: Top 3 (can switch to Top 5)

### Example Team Score Display
```
Level 7 Team Scores (Top 3)
+-------+------+------+-------+----------+
| VT    | UB   | BB   | FX    | Team AA  |
+-------+------+------+-------+----------+
| 27.75 | 27.10| 27.45| 28.05 | 110.35   |
+-------+------+------+-------+----------+
```

---

## Key Design Decisions (Need User Input)

### 1. Events by Gender
**Women's Artistic Gymnastics (WAG) - 4 events:**
- Vault (VT)
- Uneven Bars (UB)
- Balance Beam (BB)
- Floor Exercise (FX)

**Men's Artistic Gymnastics (MAG) - 6 events:**
- Floor Exercise (FX)
- Pommel Horse (PH)
- Still Rings (SR)
- Vault (VT)
- Parallel Bars (PB)
- High Bar (HB)

### 2. Score Structure Options
**Option A: Simple (just final score)**
- One score per event (0.000 - 10.000 or 16.000 depending on scoring system)

**Option B: Detailed (with breakdown)**
- Execution Score (E-score)
- Difficulty/Start Value (D-score/SV)
- Neutral Deductions
- Final Score (calculated)

**Recommendation:** Start with Option A (simple) - can add breakdown later if needed.

### 3. Score Entry Permissions
- **Staff (owner, director, admin, coach):** Can enter and edit all scores
- **Parents:** Read-only access to all scores in the competition

---

## Database Schema

### New Table: `competition_scores`
```sql
CREATE TABLE competition_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    gymnast_profile_id UUID NOT NULL REFERENCES gymnast_profiles(id) ON DELETE CASCADE,
    event TEXT NOT NULL,  -- 'vault', 'bars', 'beam', 'floor', 'pommel', 'rings', 'pbars', 'highbar'
    score DECIMAL(5,3),   -- e.g., 9.500 for WAG, 14.250 for MAG
    placement INTEGER,    -- 1, 2, 3, etc. (nullable - entered manually)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),

    -- Composite unique constraint: one score per gymnast per event per competition
    UNIQUE(competition_id, gymnast_profile_id, event)
);

-- RLS Policies
-- SELECT: Hub members can view scores for competitions in their hub
-- INSERT/UPDATE/DELETE: Staff roles only (owner, director, admin, coach)
```

### New Table: `competition_team_placements`
```sql
-- Store team placements per level/event (since these are entered, not calculated)
CREATE TABLE competition_team_placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    level TEXT NOT NULL,           -- 'Level 7', 'Gold', etc.
    gender TEXT NOT NULL,          -- 'Female', 'Male'
    event TEXT NOT NULL,           -- 'vault', 'bars', etc. or 'all_around' for team AA
    placement INTEGER,             -- 1, 2, 3, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(competition_id, level, gender, event)
);
```

### Event Type Constants
```typescript
export const WOMENS_EVENTS = ['vault', 'bars', 'beam', 'floor'] as const;
export const MENS_EVENTS = ['floor', 'pommel', 'rings', 'vault', 'pbars', 'highbar'] as const;

export const EVENT_LABELS: Record<string, string> = {
    vault: 'Vault',
    bars: 'Bars',
    beam: 'Beam',
    floor: 'Floor',
    pommel: 'Pommel Horse',
    rings: 'Rings',
    pbars: 'P. Bars',
    highbar: 'High Bar'
};

export const EVENT_ABBREVIATIONS: Record<string, string> = {
    vault: 'VT',
    bars: 'UB',
    beam: 'BB',
    floor: 'FX',
    pommel: 'PH',
    rings: 'SR',
    pbars: 'PB',
    highbar: 'HB'
};
```

---

## UI/UX Design

### Navigation
- Add "Scores" to sidebar navigation (after Competitions)
- Icon: `Award` or `Medal` from lucide-react

### Scores Page Layout

#### Header
- Title: "Scores"
- Competition selector dropdown (shows all competitions for the hub)

#### Score Table Layout (when competition selected)

**Score Display (grouped by level) - Team scores at TOP:**
```
Level 7                                              [Top 3 ▼] (toggle for L1-5 only)
+------------------+------------+------------+------------+------------+------------+
| TEAM TOTAL       | VT: 27.75  | UB: 27.10  | BB: 27.45  | FX: 27.90  | AA: 110.20 |
| TEAM PLACE       | 2nd        | 1st        | 3rd        | 1st        | 2nd        |
+------------------+------------+------------+------------+------------+------------+
| Gymnast          | VT   | Pl  | UB   | Pl  | BB   | Pl  | FX   | Pl  | AA   | Pl  |
+------------------+------+-----+------+-----+------+-----+------+-----+------+-----+
| Jane Smith       | 9.25*| 3rd | 8.90 | 8th | 9.10*| 2nd | 9.45*| 1st | 36.70| 2nd |
| Emily Davis      | 9.10*| 5th | 9.20*| 1st | 8.85 | 9th | 9.30*| 4th | 36.45| 4th |
| Sarah Wilson     | 9.40*| 1st | 9.00*| 5th | 9.20*| 1st | 9.15 | 7th | 36.75| 1st |
| Anna Brown       | 8.95 | 8th | 8.75 | 12th| 8.90 | 7th | 9.05 | 9th | 35.65| 8th |
+------------------+------+-----+------+-----+------+-----+------+-----+------+-----+
* = counts toward team score (top 3)
Pl = Placement
```

**For Levels 1-5:** Toggle dropdown in header to switch between "Top 3" and "Top 5"

**Gender Tabs at top of page:** `[ Women's ] [ Men's ]` - switches entire view

- **Gymnast column:** Name (level shown in section header)
- **Event columns:** Based on gender of gymnasts
- **AA column:** Individual All-Around (auto-calculated)
- **Team Total row:** Sum of top N scores per event + Team AA
- **Highlighted scores:** Visual indicator (asterisk or highlight) for scores counting toward team
- **Empty cells:** Show "-" for missing scores
- **Editable cells:** Staff can click to edit (inline or modal)

#### Features
1. **Group by Level:** Scores displayed in sections by level (Level 1, Level 2, etc.)
2. **Team Score Toggle (Levels 1-5):** Switch between Top 3 and Top 5 scoring
3. **Filter by Gender:** If hub has both male and female gymnasts, tabs or toggle
4. **Sort:** Click column headers to sort by that event score within each level
5. **Visual Indicators:** Highlight/mark scores that count toward team total
6. **Export:** Option to export scores as CSV/PDF (future enhancement)

### Score Entry Modal (Staff Only)
When staff clicks a cell or "Enter Scores" button:
- Modal with gymnast name and event
- Number input for score (with validation: 0.000 - 16.000)
- Save/Cancel buttons

### Empty States
- No competition selected: "Select a competition to view scores"
- No gymnasts in competition: "No gymnasts assigned to this competition"
- No scores entered: "No scores have been entered yet" + "Enter Scores" button (staff only)

---

## File Structure

```
src/
├── pages/
│   └── Scores.tsx                    # Main scores page
├── components/
│   └── scores/
│       ├── CompetitionSelector.tsx   # Dropdown to select competition
│       ├── ScoresTable.tsx           # Main scores table component
│       ├── ScoreCell.tsx             # Individual score cell (editable for staff)
│       └── EnterScoreModal.tsx       # Modal for entering/editing scores
└── types/
    └── index.ts                      # Add score-related types
```

---

## Implementation Steps

### Phase 1: Database Setup
1. Create `competition_scores` table migration
2. Add RLS policies for the table
3. Add TypeScript types to `src/types/index.ts`

### Phase 2: Basic Scores Page
1. Create `src/pages/Scores.tsx` with competition selector
2. Add "Scores" to sidebar navigation
3. Add route in App.tsx

### Phase 3: Scores Table (Read-Only)
1. Create `ScoresTable.tsx` component
2. Fetch gymnasts from `competition_gymnasts` with their profiles (including level & gender)
3. Fetch scores from `competition_scores`
4. Group gymnasts by level
5. Display table with auto-calculated Individual All-Around
6. Calculate and display Team Scores per level (top 3 or top 5)
7. Detect gender and show appropriate events

### Team Score Calculation Logic (Frontend)
```typescript
// Calculate team score for a specific level and event
function calculateTeamEventScore(
  scores: Score[],
  level: string,
  event: string,
  topN: number = 3
): number {
  // Filter scores for this level and event
  const eventScores = scores
    .filter(s => s.level === level && s.event === event && s.score !== null)
    .map(s => s.score)
    .sort((a, b) => b - a)  // Sort descending
    .slice(0, topN);        // Take top N

  return eventScores.reduce((sum, score) => sum + score, 0);
}

// Determine which scores count toward team
function getCountingScoreIds(
  scores: Score[],
  level: string,
  event: string,
  topN: number = 3
): string[] {
  return scores
    .filter(s => s.level === level && s.event === event && s.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => s.id);
}

// Get topN based on level
function getTopNForLevel(level: string): number {
  const levelNum = parseInt(level.replace(/\D/g, ''));
  // Levels 1-5: configurable (default 3, can be 5)
  // Levels 6-10+: always 3
  return 3; // Default, UI toggle can override for levels 1-5
}
```

### Phase 4: Score Entry (Staff)
1. Create `EnterScoreModal.tsx`
2. Add permission checks (canManageScores)
3. Implement score CRUD operations
4. Add inline editing or click-to-edit functionality

### Phase 5: Polish
1. Add level filtering
2. Add sorting by columns
3. Add empty states
4. Mobile responsive design

---

## Confirmed Requirements

- [x] Team scores auto-calculated per level
- [x] Levels 6-10: Top 3 scores per event
- [x] Levels 1-5: Toggle between Top 3 and Top 5
- [x] Team AA = Sum of team event scores
- [x] Visual indicator for counting scores
- [x] Each level displayed in its own section
- [x] **Score Format:** Women's max 10.000, Men's max 20.000
- [x] **Scores are per-competition** (not per-session)
- [x] **Gender tabs:** Separate WAG and MAG views with tab switch
- [x] **Placement fields:** Track placement (1st, 2nd, 3rd) for each event AND team scores
- [x] **Levels from settings:** Pull level names from hub settings (not hardcoded)
