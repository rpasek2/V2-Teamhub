# Supabase Patterns

## Client
- Use singleton client from `src/lib/supabase.ts` (web) or `mobile/src/lib/supabase.ts` (mobile)
- Use `.select()` with specific columns when possible
- Use RLS — don't bypass in client code
- Supabase RLS upserts can silently fail — use SECURITY DEFINER RPCs for critical writes

## Data Fetching Pattern
```typescript
useEffect(() => {
    if (hub) {
        fetchData();
    }
}, [hub]);

const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('table')
        .select('col1, col2')
        .eq('hub_id', hub.id);

    if (error) console.error('Error:', error);
    else setData(data || []);
    setLoading(false);
};
```

## Parallel Queries
```typescript
const [result1, result2] = await Promise.all([
    supabase.from('table1').select('*').eq('hub_id', hub.id),
    supabase.from('table2').select('*').eq('hub_id', hub.id)
]);
```

## Error Handling
- Always destructure: `const { data, error } = await supabase...`
- Log errors with `console.error` (never `console.log`)
- Always handle loading and error states in UI

## FK Join Gotchas
- `hub_members.user_id` FKs to `auth.users(id)`, NOT `profiles(id)` — PostgREST can't resolve `.select('profile:profiles(...)')` from this table. Workaround: two-step query (fetch user_ids, then query profiles separately).
- Supabase PostgREST returns FK joins as arrays in TypeScript types, not single objects. Use `[0]` accessors or `Array.isArray()` guards.

## RLS Policy Gotchas
- Self-referencing policies cause infinite recursion (error 42P17). Example: a `channel_members` SELECT policy that queries `channel_members` to check membership.
- Fix: use a SECURITY DEFINER function (e.g., `is_user_channel_member(channel_id, user_id)`) instead of self-referencing EXISTS clauses.
- SECURITY DEFINER functions bypass RLS — safe to call from within policies.

## SECURITY DEFINER Function Rules

**CRITICAL: SECURITY DEFINER functions bypass ALL RLS policies.** They run as the function owner (superuser), not the calling user. Every such function is a potential data leak if not carefully written.

### Mandatory checklist before creating/modifying any SECURITY DEFINER function:

1. **Must filter by user** — Every SELECT in the function MUST include a WHERE clause filtering by `auth.uid()` or a `p_user_id` parameter. Never return unfiltered rows.
2. **Minimize usage** — Only use SECURITY DEFINER when you genuinely need to bypass RLS (e.g., upserting `channel_members` in `mark_channel_read`). For read-only queries, prefer regular functions that inherit RLS automatically.
3. **Channel/message visibility rules** — Any function returning channels or messages must enforce:
   - `type='public'`: user must be a hub member
   - `type='private'`: user must have a `channel_members` row
   - DMs (`dm_participant_ids IS NOT NULL`): user's ID must be in `dm_participant_ids`
4. **Group visibility rules** — Any function returning groups or group posts must verify the user has a `group_members` row for that group.
5. **Never use service_role key on frontend** — Web and mobile clients must only use the anon key. The service_role key bypasses RLS entirely and must never appear in client-side code or `.env` files accessible to the frontend.
6. **Test with a restricted role** — After writing a SECURITY DEFINER function, mentally (or actually) test: "If I call this as a parent user, can I see another user's DMs? Another group's posts? A private channel I'm not in?" If yes, the function is broken.

### Common mistakes that cause data leaks:
- Joining `channels` or `messages` without checking membership/participant arrays
- Using LEFT JOIN on membership tables (returns rows even without membership) — use INNER JOIN or EXISTS
- Returning aggregate counts (unread badges) for channels/groups the user shouldn't know about
- Forgetting that `type='private'` channels need `channel_members` check (not just "is hub member")

## Migrations
Use the Supabase MCP `apply_migration` tool for DDL operations (CREATE TABLE, ALTER, policies, triggers). Use `execute_sql` for data queries.

## Storage Buckets
- `competition-documents`, `group-files`, `avatars`, `resources`, `Competitions`
