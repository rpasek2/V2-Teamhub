Guidance for Claude Code on TeamHub V2 (Two Trees Software LLC).

## Role

Expert software engineer: TypeScript, React, React Native (Expo), Supabase. Be concise. Verify actions. Ask if ambiguous.

## Workflow

1. Analyze the request.
2. For non-trivial tasks: read relevant docs from `docs/` (run `find docs/ -name "*.md" | sort` if unsure what's available). Skip for quick fixes.
3. For multi-step features: formulate a plan as a todo list and get approval. For small changes (swap icon, add border, fix typo): just do it.
4. Execute. Keep changes minimal — don't refactor or add features beyond what was asked.
5. Deploy when asked: `npm run build && npx firebase deploy --only hosting`

## Tech Stack

- **Web:** React + Tailwind CSS 4 + Supabase client
- **Mobile:** Expo (React Native) + Supabase client
- **DB:** Supabase (Postgres + RLS). Use Supabase MCP tools for migrations and SQL.
- **Hosting:** Firebase Hosting (web), EAS Build (mobile)

## Style Rules

- Use **semantic token classes** for all surfaces/text: `bg-surface`, `text-heading`, `text-body`, `text-muted`, `border-line`, etc. These auto-swap for dark mode. See `docs/frontend/design-system.md`.
- Use `accent-*` for the hub's primary color (runtime-swappable per hub). Never hardcode `brand-*` or `mint-*`.
- Raw Tailwind colors (`red-500`, `blue-600`, `amber-500`) are fine for fixed-meaning elements (badges, alerts, status indicators).
- Never use the TypeScript `any` keyword — fix the actual type.
- Icons: `lucide-react` (web), `lucide-react-native` (mobile).
- Modals: `createPortal` to `document.body` (web), `<Modal presentationStyle="pageSheet">` (mobile).

## Key Docs

Only read when relevant to the current task:

| Topic | File |
|-------|------|
| Design system / tokens | `docs/frontend/design-system.md` |
| Component patterns | `docs/frontend/component-patterns.md` |
| DB schema | `docs/architecture/database-schema.md` |
| Project structure | `docs/architecture/project-structure.md` |
| Supabase / RLS patterns | `docs/backend/supabase-patterns.md` |
| Permissions & auth | `docs/backend/permissions-and-auth.md` |
| Mobile patterns | `docs/mobile/react-native-patterns.md` |
| Gymnastics domain rules | `docs/domain/gymnastics-rules.md` |
| Deploy & commands | `docs/commands-and-deployment.md` |

## Conventions

- `useHub()` for hub context, `useAuth()` for auth, `useRoleChecks()` for permission booleans (web)
- `useHubStore()` for hub/member state, `useAuthStore()` for auth (mobile)
- Staff roles: owner, director, admin, coach. Non-staff: parent, athlete.
- See `docs/backend/supabase-patterns.md` for FK join and RLS gotchas
- See `docs/mobile/react-native-patterns.md` for theme system and modal patterns
