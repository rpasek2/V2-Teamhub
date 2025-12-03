# TeamHub V2 Agent Guide

## Commands (Tool Definitions)
- **Dev Server:** `npm run dev` (Start local development server)
- **Build:** `npm run build` (Run after major edits to check for TypeScript/compilation errors)
- **Lint:** `npm run lint` (Check for code quality issues)
- **Preview:** `npm run preview` (Preview production build locally)

## Tech Stack
- **Framework:** React 19 with Vite 7
- **Routing:** React Router DOM v7 (use `useNavigate`, `useParams`, `Outlet`)
- **Styling:** Tailwind CSS 4 only. No CSS modules or inline styles.
- **UI Components:** Headless UI for modals/dialogs, Lucide React for icons
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Date Handling:** date-fns (use `format`, `parseISO`, `isSameDay`, etc.)
- **Utilities:** clsx + tailwind-merge for conditional classes (use `cn()` helper)

## Architecture Rules
- **File Structure:**
  - Pages go in `src/pages/`
  - Reusable components go in `src/components/`
  - Feature-specific components go in `src/components/{feature}/`
  - Context providers go in `src/context/`
  - Types go in `src/types/index.ts`
  - Supabase client is in `src/lib/supabase.ts`

- **Component Patterns:**
  - Use functional components with hooks
  - Export named functions, not default exports
  - Use TypeScript interfaces for props
  - Modals use `createPortal` to render at document.body

- **State Management:**
  - Use React Context for global state (AuthContext, HubContext)
  - Use useState/useEffect for local component state
  - No Redux or Zustand

- **Styling Conventions:**
  - Use Tailwind utility classes exclusively
  - Brand color is `brand-600` (primary), `brand-500` (hover)
  - Use slate color palette for grays
  - Mobile-first responsive design with `sm:`, `md:`, `lg:` breakpoints

## Supabase Patterns
- Always use the singleton client from `src/lib/supabase.ts`
- Use `.select()` with specific columns when possible
- Handle errors: `const { data, error } = await supabase...`
- Use RLS (Row Level Security) - don't bypass it in client code
- Storage buckets: `competition-documents`, `group-files`, `avatars`

## Database Schema (Key Tables)
- `hubs` - Team/organization containers
- `hub_members` - User membership with roles (owner, director, admin, coach, parent, gymnast)
- `profiles` - User profile data
- `gymnast_profiles` - Extended gymnast info (birthdate, level, etc.)
- `events` - Calendar events (types: practice, competition, meeting, social, other)
- `competitions` - Competition records
- `competition_gymnasts` - Gymnast-competition assignments
- `groups` - Team groups/channels
- `group_posts` - Posts within groups
- `channels` - DM/messaging channels
- `messages` - Chat messages

## Permission System
- Roles hierarchy: owner > director > admin > coach > parent > gymnast
- Check permissions via `currentRole` from `useHub()` context
- Example: `const canEdit = ['owner', 'director', 'admin'].includes(currentRole || '')`

## Common Mistakes to Avoid
- Do NOT use `any` type - fix the actual TypeScript error
- Do NOT use CSS modules or inline styles - use Tailwind only
- Do NOT import from wrong paths - check relative vs absolute imports
- Do NOT forget to handle loading and error states in data fetching
- Do NOT use `console.log` in production code (use `console.error` for errors only)
- Do NOT create new files unless absolutely necessary - prefer editing existing files
- Do NOT add features beyond what was requested - keep changes minimal

## Event Type Colors (for consistency)
```typescript
const EVENT_TYPE_COLORS = {
    practice: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    competition: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    meeting: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    social: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    other: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' }
};
```

## cn() Helper Pattern
```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}
```

## Modal Pattern
Use `createPortal` for modals to avoid z-index issues:
```typescript
import { createPortal } from 'react-dom';

if (!isOpen) return null;

return createPortal(
    <div className="fixed inset-0 z-50 ...">
        {/* Modal content */}
    </div>,
    document.body
);
```

## MCP Servers

### Supabase MCP
Full access to the Supabase project for database management.

**Available Tools:**
- `mcp__supabase__list_tables` - List all tables in the database
- `mcp__supabase__execute_sql` - Run SQL queries (SELECT, INSERT, UPDATE, DELETE)
- `mcp__supabase__apply_migration` - Apply DDL migrations (CREATE TABLE, ALTER, etc.)
- `mcp__supabase__list_migrations` - View migration history
- `mcp__supabase__get_logs` - Get logs by service (api, postgres, auth, storage, edge-function)
- `mcp__supabase__get_advisors` - Check for security/performance issues
- `mcp__supabase__generate_typescript_types` - Generate TypeScript types from schema

**Usage Guidelines:**
- Use `apply_migration` for schema changes (CREATE TABLE, ALTER, RLS policies)
- Use `execute_sql` for data queries and non-DDL operations
- Always check `get_advisors` after schema changes to catch missing RLS policies
- Project ref: `ofprsrlrikowbtjcusli`

### Context7 MCP
Fetches up-to-date documentation for any library.

**Available Tools:**
- `mcp__context7__resolve-library-id` - Find the Context7 library ID for a package
- `mcp__context7__get-library-docs` - Fetch documentation for a library

**Usage Guidelines:**
- Always call `resolve-library-id` first to get the correct library ID
- Use `topic` parameter to focus on specific features (e.g., "authentication", "hooks")
- Prefer high reputation sources with more code snippets

**Common Library IDs:**
- `/supabase/supabase-js` - Supabase JavaScript client
- `/supabase/supabase` - Supabase platform docs
- `/vercel/next.js` - Next.js framework
- `/facebook/react` - React library

### Chrome DevTools MCP
Browser automation and debugging tools.

**Available Tools:**
- `mcp__chrome-devtools__take_snapshot` - Get page accessibility tree
- `mcp__chrome-devtools__take_screenshot` - Capture page screenshot
- `mcp__chrome-devtools__click` / `fill` / `hover` - Interact with elements
- `mcp__chrome-devtools__navigate_page` - Navigate to URLs
- `mcp__chrome-devtools__list_console_messages` - View console logs
- `mcp__chrome-devtools__list_network_requests` - Monitor network activity

**Usage Guidelines:**
- Use `take_snapshot` to understand page structure before interacting
- Elements are identified by `uid` from the snapshot
- Useful for testing UI flows and debugging visual issues