# How to Write Documentation

Guidelines for Claude when creating or updating documentation files in `docs/`.

## When to Create or Update Docs
- When a new pattern is established and confirmed working across multiple files
- When a new database table, function, or trigger is created
- When a new component convention emerges (e.g., a reusable pattern like pill toggles)
- When a known gotcha or workaround is discovered (e.g., Recharts `minWidth` fix)

## When NOT to Update Docs
- For session-specific or in-progress work — wait until it's confirmed and deployed
- For one-off implementations that won't be reused
- For speculative patterns that haven't been validated

## File Organization
Each doc file covers a specific domain. Place content in the most relevant file:

| File | Covers |
|------|--------|
| `commands-and-deployment.md` | CLI commands, build steps, deploy instructions |
| `architecture/project-structure.md` | Folder trees, tech stack, file locations |
| `architecture/database-schema.md` | Tables, columns, relationships, RPC functions |
| `backend/permissions-and-auth.md` | Roles, scopes, permission checks |
| `backend/supabase-patterns.md` | Supabase client usage, queries, storage |
| `frontend/design-system.md` | Colors, Tailwind classes, component CSS |
| `frontend/component-patterns.md` | React patterns, state management, modals |
| `mobile/react-native-patterns.md` | Expo, Zustand, SafeArea, mobile-specific |
| `domain/gymnastics-rules.md` | Events, scoring, levels, gymnast data |
| `agents/claude-tools.md` | MCP servers, agents, slash commands |

## Format Guidelines
- Use Markdown headers (`##`, `###`) for sections
- Include code snippets with TypeScript syntax highlighting when showing patterns
- Keep descriptions concise — reference file paths instead of duplicating large code blocks
- Use tables for comparisons or reference lookups
- Note known gotchas with "Note:" prefix
