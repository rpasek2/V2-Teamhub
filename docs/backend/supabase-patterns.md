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

## Storage Buckets
- `competition-documents`, `group-files`, `avatars`, `resources`, `Competitions`
