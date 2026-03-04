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

## Migrations
Use the Supabase MCP `apply_migration` tool for DDL operations (CREATE TABLE, ALTER, policies, triggers). Use `execute_sql` for data queries.

## Storage Buckets
- `competition-documents`, `group-files`, `avatars`, `resources`, `Competitions`
