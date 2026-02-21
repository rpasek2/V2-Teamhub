# Operations Runbook

> **Last Updated:** 2026-02-21

## Deployment

### Web App (Firebase Hosting)

```bash
# 1. Build
npm run build

# 2. Deploy
npx firebase deploy --only hosting
```

**Pre-deployment Checklist:**
- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Lint clean (`npm run lint`)
- [ ] Tested in preview (`npm run preview`)

### Mobile App (Expo + Gradle)

#### Development Builds
```bash
cd mobile
npx expo start --android  # Android emulator
npx expo start --ios      # iOS simulator
```

#### Production Builds (Gradle)
```bash
# Android AAB (for Play Store)
cd mobile/android && ./gradlew bundleRelease

# Android APK (for direct install)
cd mobile/android && ./gradlew assembleRelease

# Debug APK
cd mobile/android && ./gradlew assembleDebug
```

**Output locations:**
- AAB: `mobile/android/app/build/outputs/bundle/release/app-release.aab`
- Release APK: `mobile/android/app/build/outputs/apk/release/app-release.apk`
- Debug APK: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

**Pre-build Checklist:**
- [ ] Bump `versionCode` and `versionName` in `mobile/android/app/build.gradle`
- [ ] Update `version` in `mobile/app.json` to match
- [ ] Ensure `google-services.json` is in `mobile/android/app/`
- [ ] Test on device/emulator before building release

#### Play Store Submission
Upload the AAB file from `mobile/android/app/build/outputs/bundle/release/` to the Google Play Console.

## Monitoring

### Supabase Dashboard
- **URL:** https://supabase.com/dashboard/project/{project-id}
- **Key Metrics:**
  - Database connections
  - API requests/second
  - Storage usage
  - Auth sessions

### Logs

```bash
# Get API logs
mcp__supabase__get_logs --service api

# Get Auth logs
mcp__supabase__get_logs --service auth

# Get Database logs
mcp__supabase__get_logs --service postgres
```

### Health Checks
- API: `GET /rest/v1/` should return 200
- Auth: `GET /auth/v1/health` should return 200

## Common Issues

### Issue: 406 Not Acceptable Error
**Symptom:** Supabase queries return 406 status
**Cause:** Using `.single()` when 0 or 2+ rows returned
**Fix:** Use `.maybeSingle()` for optional single results

### Issue: RLS Policy Blocking Access
**Symptom:** Queries return empty or 403
**Cause:** Missing or incorrect RLS policy
**Debug:**
```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- Test as user
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "user-uuid"}';
SELECT * FROM table_name;
```

### Issue: Auth Session Expired
**Symptom:** User logged out unexpectedly
**Cause:** Token refresh failed
**Fix:** Check `supabase.auth.onAuthStateChange` handler

### Issue: Mobile App Crash on Launch
**Symptom:** App crashes immediately
**Debug:**
```bash
# View logs
npx expo start --dev-client
adb logcat *:E  # Android
```
**Common Causes:**
- Missing environment variables
- Invalid Supabase credentials
- Incompatible native module

### Issue: Build Fails with TypeScript Error
**Symptom:** `npm run build` fails
**Debug:**
```bash
npx tsc --noEmit
```
**Fix:** Resolve type errors shown in output

### Issue: Slow Database Queries
**Symptom:** Pages load slowly
**Debug:**
```sql
-- Check for missing indexes
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;

-- Analyze slow queries
EXPLAIN ANALYZE SELECT ...;
```
**Fix:** Add appropriate indexes

## Rollback Procedures

### Web App Rollback

```bash
# List previous deploys
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:clone --from PREVIOUS_VERSION --to live
```

### Database Rollback

**Option 1: Point-in-time Recovery (PITR)**
- Available in Supabase Pro plan
- Restore to any point in last 7 days

**Option 2: Manual Rollback Migration**
```sql
-- Create rollback migration
-- migration_name: rollback_feature_xyz

-- Undo changes here
ALTER TABLE ... DROP COLUMN ...;
```

### Mobile App Rollback

**Play Store:** Upload previous AAB version to Google Play Console

**Development:**
```bash
git checkout <previous-commit>
cd mobile
npx expo start
```

## Security Procedures

### Rotate Supabase Keys
1. Generate new anon key in Supabase dashboard
2. Update `.env` files
3. Deploy web and mobile apps
4. Invalidate old key

### Check Security Advisors
```bash
mcp__supabase__get_advisors --type security
```

### Review RLS Policies
```bash
mcp__supabase__get_advisors --type performance
```

## Backup Procedures

### Database Backups
- **Automatic:** Supabase handles daily backups
- **Manual Export:**
  ```bash
  pg_dump $DATABASE_URL > backup.sql
  ```

### Storage Backups
- Download from Supabase dashboard
- Or use Supabase CLI:
  ```bash
  supabase storage download bucket-name
  ```

## Scaling

### Database
- Upgrade Supabase plan for more connections
- Add read replicas for heavy read loads
- Optimize queries with EXPLAIN ANALYZE

### API
- Implement pagination for large lists
- Add caching for static data
- Use connection pooling

### Storage
- Upgrade storage tier as needed
- Implement client-side image compression
- Clean up unused files periodically

## Emergency Contacts

| Role | Contact |
|------|---------|
| Primary Dev | [your-contact] |
| Supabase Support | support@supabase.io |
| Firebase Support | firebase.google.com/support |

## Maintenance Windows

- **Supabase:** Check status at status.supabase.com
- **Firebase:** Check status at status.firebase.google.com
- **Preferred Update Time:** Weekdays 2-6 AM local time
