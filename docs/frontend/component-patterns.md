# Component Patterns (Web)

## General Rules
- Use functional components with hooks
- Export named functions, not default exports (except lazy-loaded pages)
- Use TypeScript interfaces for props
- Icons from `lucide-react`
- UI primitives from Headless UI (modals/dialogs)

## State Management
- **AuthContext** — Global auth (user, session, loading, signOut)
- **HubContext** — Hub data, member role, permissions, linked gymnasts
- **NotificationContext** — Realtime notification badges
- Local state via `useState` / `useEffect`
- No Redux (mobile uses Zustand)

## Modal Pattern
```typescript
import { createPortal } from 'react-dom';

if (!isOpen) return null;

return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="card p-6 max-w-md w-full mx-4">
            {/* Modal content */}
        </div>
    </div>,
    document.body
);
```

## Gymnast Profile Tabs (GymnastDetails.tsx)
The gymnast profile page uses a tab-based layout with 7 tabs:
- **Profile** — Basic info, guardians, emergency contacts, medical info, apparel sizes
- **Goals** — Gymnast-set goals with events, dates, and milestones
- **Assessment** — Editable assessment form with collapsible sections
- **Assignments** — Coach assignments with completion tracking
- **Skills** — Event-based skill tracking with status (GymnastSkillsTab)
- **Scores** — Competition scores by season with SeasonPicker (GymnastScoresTab)
- **Attendance** — 6-month attendance history with monthly trends (GymnastAttendanceTab)

```typescript
type PageTab = 'profile' | 'goals' | 'assessment' | 'assignments' | 'skills' | 'scores' | 'attendance';
```

Tab components receive gymnast data as props:
```typescript
<GymnastSkillsTab gymnastId={gymnast.id} gymnastLevel={gymnast.level} gymnastGender={gymnast.gender} />
<GymnastScoresTab gymnastId={gymnast.id} gymnastGender={gymnast.gender} />
<GymnastAttendanceTab gymnastId={gymnast.id} gymnastLevel={gymnast.level} scheduleGroup={gymnast.schedule_group || undefined} />
```

## Common Mistakes to Avoid
- Do NOT use `any` type — fix the actual TypeScript error
- Do NOT use CSS modules or inline styles — use Tailwind only
- Do NOT import from wrong paths — check relative vs absolute imports
- Do NOT forget loading and error states in data fetching
- Do NOT use `console.log` in production (use `console.error` for errors only)
- Do NOT create new files unless necessary — prefer editing existing files
- Do NOT add features beyond what was requested — keep changes minimal
- Do NOT use dark theme colors (slate-800/900, chalk-50) — the app uses a light theme
- Do NOT use `mint-*` colors directly — use `brand-*` instead for consistency
