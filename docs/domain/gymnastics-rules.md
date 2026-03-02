# Gymnastics Domain Rules

## Events
```typescript
const WAG_EVENTS = ['vault', 'bars', 'beam', 'floor'];       // Women's Artistic Gymnastics
const MAG_EVENTS = ['floor', 'pommel', 'rings', 'vault', 'pbars', 'highbar']; // Men's Artistic Gymnastics
```

Note: `vault` and `floor` appear in **both** WAG and MAG. Always filter by gymnast gender, not just event name.

## Event Labels (Abbreviations)
```typescript
const EVENT_LABELS = {
    vault: 'VT', bars: 'UB', beam: 'BB', floor: 'FX',
    pommel: 'PH', rings: 'SR', pbars: 'PB', highbar: 'HB'
};
```

Full names are available via `EVENT_FULL_NAMES` from `src/types/index.ts`.

## GymEvent Type
```typescript
type GymEvent = 'vault' | 'bars' | 'beam' | 'floor' | 'pommel' | 'rings' | 'pbars' | 'highbar';
```

Note: `'all_around'` is NOT a GymEvent. When comparing against it, use `GymEvent | 'all_around'` union type.

## Scoring
- **Individual scores:** Stored in `competition_scores` with `event`, `score` (decimal), `placement` (integer)
- **Team scores:** Sum of top N scores per event per level (calculated client-side, not stored)
- **All-Around:** Sum of all event scores for a gymnast (calculated client-side)
- **Qualifying scores:** Thresholds defined in `hub.settings.qualifyingScores`, logic in `src/lib/qualifyingScores.ts`
- **Championship types:** Competitions can have a `championship_type` that affects qualifying score thresholds

## Score Metrics (recharts)
- Line charts with `ResponsiveContainer` — requires `minWidth={0}` on wrapper div and `minWidth={0}` prop to prevent -1 dimension errors in flex layouts
- Event toggle pills for showing/hiding individual event lines
- Parent view: individual gymnast charts with gymnast selector
- Coach view: team score trends by level (top 3 per event)

## Levels
- Defined per hub in `hub.settings.levels` (string array, e.g. `['Level 3', 'Level 4', 'Xcel Gold']`)
- Used for filtering scores, grouping gymnasts, and team score calculation
