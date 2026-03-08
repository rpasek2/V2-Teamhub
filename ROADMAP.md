# Roadmap

## Mobile

- **Schedule - Rotations Display** — Rotations section is a grid on web but just a flat list on mobile. Needs a reworked display for quickly scanning multiple groups' events.
- **Group Post Creation** — Add ability to create posts in groups from the mobile app (currently read/interact only).
- **Score Metrics** — Add detailed score charts and metrics to mobile (season bests, averages, trend lines, qualifying progress) to match the web experience.
- **Back Buttons** — Add explicit back buttons to screens that are missing them (currently relying on iOS swipe-from-left gesture).
## Web

- **Rotation Builder UX Overhaul** — Rotation creation/editing needs drag-and-drop reordering and a streamlined flow.
- **Dashboard Adjustments** — Review what's shown and what should be interactable.

## Major: New Season Wizard

Guided walkthrough triggered when the season rolls over (or manually from settings). Walks coaches through everything that changes between seasons:

1. **Level Changes** — Modal showing all gymnasts with their current level. Coaches move gymnasts up/down levels. Bulk actions for common promotions (e.g. "move all Level 3 → Level 4").
2. **Channel / Group Membership Sync** — After level changes, auto-move parents into correct level-based channels and groups. Archive old group posts from previous season (keep history but clear the feed).
3. **Schedule Updates** — Modal to adjust practice hours and group assignments for each level. Pre-populate from last season's schedule as a starting point.
4. **Skill Lists** — Create new skill checklists per level for the new season. Option to copy from previous season's lists and modify, or start fresh. Previous season's gymnast skill progress is archived (snapshot) before reset.
5. **Mentorship Pairings** — Review and update mentorship pairings. Option to keep, shuffle, or clear.
6. **Review & Confirm** — Summary of all changes before applying.

Currently season-aware: competitions, scores. This feature would make level-based channels, groups, skills, schedules, and mentorship season-aware too.

## Features

- **Skill List Templates** — Add skill list templates so coaches can quickly apply a reusable set of skills (e.g. level requirements, move-up criteria) instead of adding them one by one.
- **Add Comments to In-Progress Tasks** — Allow staff to add notes on tasks that are in progress.
- **Stale Assignments / Skills Indicator** — Surface assignments or skills that haven't been practiced in a while.
- **Progress Reports Enhancements** — Scheduled auto-reports, bulk generation per level, PDF export, per-section toggle during creation.

---

## Completed

- ~~Progress Reports for Parents (V1)~~ — Create on web, view on web + mobile. JSONB snapshots, draft/published workflow, date range presets.
- ~~Consolidate Message Notifications~~ — Burst messages consolidated per channel into single notification row.
- ~~Member Announcements & Questionnaires~~ — Broadcast announcements/questionnaires with blocking overlay, targeting, CSV export.
- ~~Score Metrics~~ — Line charts per event, team scores (top 3), summary stats with trend indicators.
- ~~Push Notifications~~ — expo-notifications + FCM, DB trigger via pg_net, deep linking, preferences.
- ~~Message Badge Reappearing~~ — Persisted recentlyReadChannelIds to AsyncStorage.
- ~~Messages Scroll to Bottom~~ — inverted FlatList with descending order.
- ~~Parent Auto-Inclusion in Athlete Messages~~ — Guardian auto-added to DMs and private channels.
- ~~Channels RLS Infinite Recursion~~ — SECURITY DEFINER helpers to break circular RLS dependency.
- ~~Coach Task Notifications & Dashboard~~ — In-app notifications, "My Tasks" widget, inline status toggling.
- ~~Edit Staff Schedules in Team View~~ — Inline add/delete time blocks in grid cells.
- ~~Floor Music Offline~~ — Download, cache, staleness detection, bulk download with progress.
- ~~Floor Music Offline - Roster/List Not Cached~~ — AsyncStorage cache for gymnast list.
- ~~Music Player Safe Area~~ — Safe area insets for mini player.
- ~~iOS Compatibility & App Store Deployment~~ — Native modules, permissions, and UI verified on iOS. Successfully built and submitted to App Store.
- ~~Competitions Past/Upcoming Cutoff~~ — Use end_date instead of start_date for multi-day meets.
- ~~Lock Sidebar~~ — Pin button in sidebar header to lock it open, persisted in localStorage.
- ~~Feedback Reports~~ — Bug report / feature request form in web and mobile settings, saved to `feedback_reports` table.
- ~~Function Search Path Security~~ — Set `search_path = 'public'` on all 25 SECURITY DEFINER functions.
- ~~Injury Report Updates & Timestamps~~ — Timestamped update notes on injury reports, status changes with audit trail, and fixed mobile medical_info overwrite bug.
- ~~Message Reactions, DM Read Receipts, Post Views~~ — Reactions (like/heart/celebrate) on messages, "Seen" indicator on DMs, view counts on group posts. Web + mobile.
- ~~Dark Mode & Hub Accent Colors~~ — Full dark mode support with semantic token migration, runtime-swappable hub accent colors.
- ~~Admin Permission Restrictions (Web)~~ — Admins are now view-only on web. Can still message, post in groups, add calendar events, and post in marketplace.
- ~~Skills Gymnast Picker~~ — Parents with multiple linked gymnasts can switch between kids on the Skills page.
- ~~Birthday Timezone Fix~~ — Fixed off-by-one date display caused by UTC parsing of date-only strings.
- ~~Swap Regional and National Qualifying Badges~~ — Regional/National badge icons and colors were swapped; now correct.
- ~~Multiple Skill Lists (Web)~~ — Skill lists per hub with create, rename, duplicate, delete. Dropdown picker on Skills page and gymnast profile. Default list auto-created per hub with backfill migration.
- ~~Clickable Links in Group Posts & Comments (Web)~~ — Auto-detect URLs in post/comment text and render as clickable links via `LinkifiedText` component.
- ~~Edit Group Posts (Web)~~ — Post authors can edit their own posts via inline textarea from the post menu.
- ~~Admin Permission Restrictions (Mobile)~~ — Added `canEdit()` to hub store (owner/director/coach). Admin now view-only on Skills, Scores, Assignments, Roster editing, Competitions, Attendance, Mentorship. Hub Settings restricted to owner/director.
- ~~Announcement Require Acknowledgement Toggle~~ — Announcements can be set as requiring acknowledgement (blocking) or dismissible. Dark red theme in dark mode.
- ~~Staff-Only Calendar Events (Mobile)~~ — Non-staff users (parents/athletes) no longer see `staff_only` events on the mobile calendar.
- ~~Mentorship Parent RLS (Mobile)~~ — Verified: RLS policy allows parents via guardian email match, mobile filters by `linkedGymnasts` with `'own'` scope. No changes needed.
- ~~Mentorship Icon Legend (Mobile)~~ — Added birthday (cake) and next competition (trophy) icon legend below the search bar on the pairings tab.
- ~~Multiple Skill Lists (Mobile)~~ — Added skill list picker dropdown (shown when hub has multiple lists), `skill_list_id` filter on skills query, auto-selects default list.
- ~~Clickable Links in Group Posts & Comments (Mobile)~~ — Created `LinkifiedText` component using `Linking.openURL`, applied to post content and comment text in PostCard.
- ~~Edit Group Posts (Mobile)~~ — Post authors can edit their own posts via "Edit Post" in the post menu. Inline TextInput with save/cancel buttons.
- ~~Messages Not Appearing After Send (Mobile)~~ — `sendMessage` now returns the inserted row via `.select().single()` and adds it to local state optimistically. Realtime subscription INSERT handler has dedup check to prevent double messages.
- ~~Push Notification Deep Link to Message Thread (Mobile)~~ — Notification taps now store a pending deep link instead of navigating immediately. Hub is auto-selected from notification `hub_id`, then deep link navigates after tabs mount. Handles cold start via `getLastNotificationResponseAsync` and foreground taps via reactive effect.
- ~~Unread Badge Not Clearing on Auto-Selected Thread (Web)~~ — Auto-selected default channel now calls `markChannelAsRead` when it has unread messages, clearing the badge immediately.
