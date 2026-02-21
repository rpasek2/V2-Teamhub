# Roadmap

## Mobile

### ~~Push Notifications (Device Alerts)~~ (DONE)
Device push notifications implemented via expo-notifications + FCM (Android). Database trigger on `notifications` INSERT calls `send_push_notification()` which looks up active tokens in `user_push_tokens`, checks user preferences, and sends via Expo Push API through `pg_net`. Mobile app registers token on login, deregisters on sign out. Notification taps deep link to the relevant screen. Preferences respected per notification type.

### Schedule - Rotations Display
The schedule tab has a rotations section. On web this is shown as a grid, but on mobile it's just a list sorted by level showing the day's rotations. Makes it hard to determine multiple groups' events quickly. Needs a reworked display.

## WEB

### Dashboard Adjustments
Dashboard has basic info, need to look at what i want shown here and what is interactable

## General

### ~~Parent Auto-Inclusion in Athlete Messages~~ (DONE)
Auto-inclusion implemented. When someone DMs an athlete, the primary guardian (guardian_1) is automatically added as a 3rd participant. When an athlete is added to a private channel, their guardian is auto-added via database trigger. Both web and mobile display multi-participant DMs correctly.

### ~~Channels RLS Infinite Recursion~~ (DONE)
Messages tab was broken with "infinite recursion detected in policy for relation channels" error. Caused by circular RLS dependency between channels and channel_members tables. Fixed by creating SECURITY DEFINER helper functions to bypass RLS for inner lookups, and added creator visibility for private channels.

### ~~Coach Task Notifications & Dashboard~~ (DONE)
Tasks assigned to coaches now trigger in-app notifications (bell dropdown + sidebar badge on Staff tab). Coaches see a "My Tasks" widget on both web and mobile dashboards with inline status toggling (pending → in progress → completed). Notification preferences toggle available in settings. Bulk task assignment also sends notifications to each assignee.

### Edit Staff Schedules in Team View
Add the ability to edit staff schedules directly from the team view in the staff tab.

### Progress Reports for Parents
Generate progress reports to send to parents. Should support both on-demand sending and scheduled automatic reports on a specific date and time interval. Coaches should be able to pick which stats are included and which tabs (skills, scores, attendance, assessments, etc.) the reports pull data from.

### ~~Floor Music Offline Availability~~ (DONE)
Offline download system implemented for mobile. Coaches can download individual or all floor music files from both the floor music list and gymnast profiles. Files persist in device storage (documentDirectory) with AsyncStorage metadata. Playback prefers local files, falls back to streaming. Staleness detection re-prompts download when music is re-uploaded. Bulk download with progress tracking and cancel support.

### Floor Music Offline - Roster/List Not Cached
Downloaded floor music files are saved locally but the roster/floor music list data (gymnast names, levels, file URLs) is fetched from Supabase on every load. When offline (airplane mode), nothing renders even though the music files exist on device. Need to cache the gymnast list data (e.g. via AsyncStorage) so the floor music screen and roster still show downloaded gymnasts when offline. Other screens can show a "connect to view" message.

### Music Player Safe Area
The mini music player bar at the bottom of the screen needs safe area inset checks so it doesn't overlap with the system navigation bar / home indicator on devices with gesture navigation.

### Score Metrics
Add score metrics/analytics to the main Scores tab and to the Scores section within individual gymnast profiles. Should show trends, averages, highs/lows, and other useful statistical breakdowns of competition scores.
