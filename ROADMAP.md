# Roadmap

## Mobile

### Schedule - Rotations Display
The schedule tab has a rotations section. On web this is shown as a grid, but on mobile it's just a list sorted by level showing the day's rotations. Makes it hard to determine multiple groups' events quickly. Needs a reworked display.

### iOS Compatibility Check
Audit the mobile app for iOS compatibility in preparation for App Store deployment. Verify all native modules, permissions, platform-specific code paths, and UI rendering work correctly on iOS devices and simulators.

## WEB

### Rotation Builder UX Overhaul
The rotation creation/editing UI on the Schedule tab needs to be simpler and more intuitive. Rotation blocks should be drag-and-drop moveable so coaches can easily reorder them. The overall flow for building a day's rotations should be streamlined.

### Dashboard Adjustments
Dashboard has basic info, need to look at what i want shown here and what is interactable

## General

### ~~Member Announcements & Questionnaires~~
*Moved to Completed*

### Progress Reports for Parents
Generate progress reports to send to parents. Should support both on-demand sending and scheduled automatic reports on a specific date and time interval. Coaches should be able to pick which stats are included and which tabs (skills, scores, attendance, assessments, etc.) the reports pull data from.

---

## Completed

### ~~Consolidate Message Notifications~~
Database trigger `notify_new_message()` now consolidates burst messages per channel into a single notification row. On each new message, checks for an existing unread notification for the same user+channel — if found, UPDATEs the count/title/body (no additional push). If not found, INSERTs a new row (triggers push). Titles display as "N new messages in #general" (channels) or "N new messages" (DMs) when count > 1. Bell badge and activity feed show consolidated entries instead of per-message duplicates.

### ~~Member Announcements & Questionnaires~~
Staff can broadcast announcements or questionnaires to targeted members (by role, level, or individual selection). A blocking overlay forces acknowledgement/completion on next login (web + mobile). Supports two types: simple announcements (acknowledge) and questionnaires (multiple choice + free text questions). Both types support link attachments. Staff dashboard card shows active announcements with completion progress bars, expandable spreadsheet-style response table for questionnaires, and CSV export. Management includes closing announcements and expiration dates. Database uses SECURITY DEFINER RPC for atomic recipient population based on targeting criteria.

### ~~Score Metrics~~
Score metrics/analytics added to the main Scores tab and gymnast profile Scores section. Line charts (recharts) show score trends across the season per event with toggleable event pills. Parent view shows individual gymnast graphs with selector. Coach view shows team score trends (top 3 per event per level). Summary stats include season high, average, latest score, and trend indicators.

### ~~Push Notifications (Device Alerts)~~
Device push notifications implemented via expo-notifications + FCM (Android). Database trigger on `notifications` INSERT calls `send_push_notification()` which looks up active tokens in `user_push_tokens`, checks user preferences, and sends via Expo Push API through `pg_net`. Mobile app registers token on login, deregisters on sign out. Notification taps deep link to the relevant screen. Preferences respected per notification type.

### ~~Message Badge Reappearing After Reopen~~
Fixed by persisting the `recentlyReadChannelIds` set to AsyncStorage so it survives app restarts. IDs auto-clean when the DB confirms unread count is 0.

### ~~Messages Should Scroll to Bottom~~
Fixed by using `inverted={true}` on the FlatList with descending message order — the standard React Native chat pattern that automatically shows newest messages at the bottom.

### ~~Parent Auto-Inclusion in Athlete Messages~~
Auto-inclusion implemented. When someone DMs an athlete, the primary guardian (guardian_1) is automatically added as a 3rd participant. When an athlete is added to a private channel, their guardian is auto-added via database trigger. Both web and mobile display multi-participant DMs correctly.

### ~~Channels RLS Infinite Recursion~~
Messages tab was broken with "infinite recursion detected in policy for relation channels" error. Caused by circular RLS dependency between channels and channel_members tables. Fixed by creating SECURITY DEFINER helper functions to bypass RLS for inner lookups, and added creator visibility for private channels.

### ~~Coach Task Notifications & Dashboard~~
Tasks assigned to coaches now trigger in-app notifications (bell dropdown + sidebar badge on Staff tab). Coaches see a "My Tasks" widget on both web and mobile dashboards with inline status toggling (pending → in progress → completed). Notification preferences toggle available in settings. Bulk task assignment also sends notifications to each assignee.

### ~~Edit Staff Schedules in Team View~~
Added inline add/delete controls to the TeamScheduleView grid. Each cell has a "+" button to add time blocks with start/end time and role label. Existing blocks show a delete icon on hover. Only visible to managers (owner/director/admin).

### ~~Floor Music Offline Availability~~
Offline download system implemented for mobile. Coaches can download individual or all floor music files from both the floor music list and gymnast profiles. Files persist in device storage (documentDirectory) with AsyncStorage metadata. Playback prefers local files, falls back to streaming. Staleness detection re-prompts download when music is re-uploaded. Bulk download with progress tracking and cancel support.

### ~~Floor Music Offline - Roster/List Not Cached~~
Gymnast list now cached in AsyncStorage via offlineMusicStore. On mount, cached data renders instantly while fresh data loads in background. On fetch failure (offline), falls back to cached list so downloaded music is still accessible.

### ~~Music Player Safe Area~~
Added `useSafeAreaInsets` to MiniMusicPlayer with bottom padding matching the tab bar pattern. Player no longer overlaps system navigation bar.

### ~~Competitions Past/Upcoming Cutoff~~
Mobile competitions filter now uses `end_date` instead of `start_date` to determine past/upcoming status. Multi-day meets stay in "Upcoming" until after the last day. Web already used `end_date` correctly.
