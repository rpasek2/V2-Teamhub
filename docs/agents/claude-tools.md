# Claude Tools & Agents

## MCP Servers

### Supabase MCP
- `mcp__supabase__list_tables` - List all tables
- `mcp__supabase__execute_sql` - Run queries (SELECT, INSERT, UPDATE, DELETE)
- `mcp__supabase__apply_migration` - DDL changes (CREATE TABLE, ALTER, RLS)
- `mcp__supabase__list_migrations` - View migration history
- `mcp__supabase__get_logs` - Get logs by service
- `mcp__supabase__get_advisors` - Security/performance checks
- `mcp__supabase__generate_typescript_types` - Generate types from schema

### Context7 MCP
- `mcp__context7__resolve-library-id` - Find library ID for docs
- `mcp__context7__get-library-docs` - Fetch documentation

### Chrome DevTools MCP
- `mcp__chrome-devtools__take_snapshot` - Get page accessibility tree
- `mcp__chrome-devtools__take_screenshot` - Capture screenshot
- `mcp__chrome-devtools__click` / `fill` / `hover` - Interact with elements
- `mcp__chrome-devtools__navigate_page` - Navigate to URLs
- `mcp__chrome-devtools__list_console_messages` - View console logs

## Specialized Agents (Everything Claude Code)

Use the Task tool with these `subagent_type` values:

| Agent | When to Use |
|-------|-------------|
| `everything-claude-code:planner` | Before implementing complex features - creates step-by-step plans |
| `everything-claude-code:code-reviewer` | After writing/modifying code - reviews for quality and issues |
| `everything-claude-code:security-reviewer` | For auth, user input, API endpoints, sensitive data handling |
| `everything-claude-code:database-reviewer` | For SQL queries, migrations, schema design (PostgreSQL/Supabase) |
| `everything-claude-code:build-error-resolver` | When builds fail or TypeScript errors occur |
| `everything-claude-code:tdd-guide` | For test-driven development - write tests first |
| `everything-claude-code:e2e-runner` | For end-to-end test generation with Playwright |
| `everything-claude-code:refactor-cleaner` | For removing dead code, consolidating duplicates |
| `everything-claude-code:doc-updater` | For updating documentation and codemaps |
| `everything-claude-code:architect` | For system design and architectural decisions |

## Available Skills (Slash Commands)
- `/plan` - Create implementation plan before coding
- `/tdd` - Enforce test-driven development workflow
- `/e2e` - Generate and run end-to-end tests
- `/instinct-status` - Show learned patterns with confidence levels
- `/skill-create` - Extract coding patterns from git history

## Recommended Workflow
1. **Planning:** Use `/plan` or `planner` agent for complex features
2. **Implementation:** Write code following TDD with `/tdd` when appropriate
3. **Review:** Use `code-reviewer` after significant changes
4. **Security:** Use `security-reviewer` for auth/input handling code
5. **Database:** Use `database-reviewer` for SQL/migrations
6. **Testing:** Use `e2e-runner` for critical user flows
