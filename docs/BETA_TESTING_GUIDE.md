# Beta Testing Guide

Instructions and test items for gyms testing TeamHub. Work through each section and report any bugs, confusing flows, or missing features.

---

## Getting Started

- [ ] Create your hub and set a display name
- [ ] Generate invite codes for each role (owner, director, admin, coach, parent, athlete)
- [ ] Have staff and parents join using invite codes
- [ ] Verify each person lands on the correct role after joining
- [ ] Configure which tabs are enabled for your gym in Settings > Feature Tabs

---

## Dashboard

- [ ] Does the dashboard load without errors?
- [ ] Staff: Do you see stat cards, pending tasks, and recent activity?
- [ ] Parents: Do you see your linked gymnasts and upcoming events?
- [ ] Are announcements displayed prominently?
- [ ] Do widgets link to the correct pages when clicked?
- [ ] Is anything missing that you'd expect to see at a glance?

---

## Roster

- [ ] Add a gymnast with full details (name, DOB, level, gender, guardian info)
- [ ] Edit a gymnast's profile — do changes save correctly?
- [ ] Upload floor music for a gymnast — does it play back?
- [ ] Try sorting/filtering the roster by level, name, role
- [ ] Can parents only see their own gymnast's info?
- [ ] Add emergency contacts — do they display correctly?
- [ ] Add medical info (allergies, medications, conditions) — is it visible to staff only?
- [ ] Try managing levels (add, remove, reorder) — does the roster update?
- [ ] Does the gymnast detail page show all 7 tabs (Profile, Medical, Assessments, Goals, Skills, Attendance, Floor Music)?

---

## Calendar

- [ ] Create events of each type (practice, competition, meeting, social, camp, fundraiser, clinic)
- [ ] Create an all-day event — does it display correctly?
- [ ] Enable RSVP on an event — can parents respond (going/maybe/not going)?
- [ ] Create a save-the-date event — does it appear in the save-the-dates view?
- [ ] Do competition events auto-create when you add a meet in Competitions?
- [ ] Does the competition calendar event link back to the competition details?
- [ ] If birthdays are enabled in settings, do they show on the calendar?
- [ ] Can only staff create/edit/delete events?
- [ ] Do events show the correct time and timezone?

---

## Messages

- [ ] Send a DM to another member — does it arrive in real time?
- [ ] Create a group channel — can you add/remove members?
- [ ] Send messages with text, images, and file attachments
- [ ] Are unread badges accurate? Do they clear after reading?
- [ ] DM an athlete — is their parent auto-included in the conversation?
- [ ] If anonymous reports are enabled, can a member send one? Does it go to the hub owner?
- [ ] Do push notifications arrive on mobile for new messages?
- [ ] Are notifications consolidated when multiple messages come in quickly?
- [ ] Can you delete your own messages?

---

## Groups

- [ ] Create a group (public and private) — do the right people have access?
- [ ] Create a text post with images — does it display correctly?
- [ ] Create a poll — can members vote? Do results show correctly?
- [ ] Create a sign-up with slots — can members sign up? Can they add custom slots?
- [ ] Create an RSVP post — do going/maybe/not going counts work?
- [ ] Attach files and links to a post — do they open correctly?
- [ ] Pin a post — does it stay at the top?
- [ ] Comment on a post — do comment threads work?
- [ ] Can only staff create groups?
- [ ] Are level-based groups showing the correct members?

---

## Competitions

- [ ] Create a competition with name, dates, location, and championship type
- [ ] Add gymnasts to the competition roster
- [ ] Create sessions and assign gymnasts to sessions
- [ ] Set warm-up and awards times for sessions
- [ ] Does the competition appear in the calendar automatically?
- [ ] Can you view past vs upcoming competitions correctly?
- [ ] For multi-day meets, does it stay in "upcoming" until after the last day?
- [ ] Try different championship types (state, regional, national, unsanctioned) — do qualifying badges display correctly?

---

## Scores

- [ ] Enter scores for gymnasts at a competition (all events)
- [ ] Do scores save correctly? Check decimal precision (e.g., 9.425)
- [ ] Switch between competitions using the dropdown — do scores update?
- [ ] Switch between seasons — do the correct competitions show?
- [ ] View the Metrics tab — do line charts display correctly?
- [ ] Are team scores (top 3 per event) calculated correctly?
- [ ] Do qualifying badges show for scores that meet the threshold?
- [ ] Can parents only see their own gymnast's scores?
- [ ] Enter scores for all events then check the all-around total — is it correct?
- [ ] With 5+ competitions in a season, do all scores still load in metrics? (Previously had a bug with 1000+ scores)

---

## Skills

- [ ] View the skill matrix for each level and event
- [ ] Update a gymnast's skill status (none → learning → achieved → mastered)
- [ ] Add a comment on a skill — does it save?
- [ ] Manage skill lists — add, remove, reorder skills for a level
- [ ] Are skill lists organized by event correctly?
- [ ] Can parents view their gymnast's skills but not edit them?
- [ ] Try marking a skill as "injured" — does it display differently?
- [ ] If you have custom skill events configured, do they appear?

---

## Assignments

- [ ] Create an assignment for a gymnast with exercises for each event
- [ ] Create an assignment template — can you reuse it?
- [ ] Use Coach Mode for bulk editing across multiple gymnasts
- [ ] Can parents see their gymnast's assignments?
- [ ] Mark items as completed — does the checklist update?
- [ ] Add notes to an assignment — do they save?
- [ ] Try station assignments (main + side stations) — do they display correctly?
- [ ] Are assignments showing for the correct dates?

---

## Attendance

- [ ] Take attendance for a level (present, absent, late, left early)
- [ ] Add check-in and check-out times — do they save?
- [ ] View the metrics tab — are attendance percentages correct?
- [ ] Do consecutive absence alerts appear for frequently absent gymnasts?
- [ ] Add notes to an attendance record
- [ ] Can parents see their own gymnast's attendance but not others?
- [ ] If Schedule is disabled in settings, is Attendance also hidden?

---

## Schedule

- [ ] Set up weekly practice times for each level and group (A/B)
- [ ] Create rotation blocks and assign events to them
- [ ] Assign coaches to rotation blocks
- [ ] Add notes to a rotation block
- [ ] Are rotation colors and event names customizable?
- [ ] Does the team schedule view show correctly for all levels?
- [ ] Can non-managers see the schedule but not edit it?

---

## Staff

- [ ] Add a staff member with role, title, and contact info
- [ ] View a staff member's profile — is all info correct?
- [ ] Create and assign a task to a staff member — do they see it on their dashboard?
- [ ] Can staff toggle task status (pending → in progress → completed)?
- [ ] Submit a time-off request — can managers approve/deny it?
- [ ] Do staff task notifications arrive (in-app and push)?
- [ ] Is the work schedule displaying correctly?

---

## Marketplace

- [ ] Create a listing with images, price, condition, and category
- [ ] Search and filter listings by category, size, price
- [ ] Mark an item as sold — does it update?
- [ ] Edit a listing's price or description
- [ ] Delete a listing
- [ ] If linked marketplaces are enabled, can you see items from other hubs?
- [ ] Are all condition types working (new, like new, good, fair)?
- [ ] Do listing images display correctly?

---

## Mentorship

- [ ] Create a Big/Little pairing manually
- [ ] Try random pairing assignment — does it work?
- [ ] Toggle a pairing as active/inactive
- [ ] Schedule a mentorship event
- [ ] Can parents see their gymnast's pairing?

---

## Private Lessons

- [ ] Coach: Set up your lesson profile (events, levels, pricing)
- [ ] Coach: Configure weekly availability
- [ ] Coach: Create lesson packages
- [ ] Parent: Browse available coaches — does the list show correctly?
- [ ] Parent: Book a lesson — does it appear in your bookings?
- [ ] Parent: Cancel a booking — does it update?
- [ ] Does a booked lesson appear on the calendar?

---

## Progress Reports

- [ ] Staff: Create a progress report for a gymnast with a date range
- [ ] Does the report pull in correct skills, attendance, scores, and assessment data?
- [ ] Save as draft — can you come back and edit it?
- [ ] Publish the report — can the parent see it?
- [ ] Can parents only see reports for their own gymnasts?
- [ ] Try different date range presets (30 days, 90 days, this season)

---

## Announcements & Questionnaires

- [ ] Create an announcement targeted to a specific role or level
- [ ] Does the blocking overlay appear for recipients on next login?
- [ ] Can recipients acknowledge the announcement?
- [ ] Create a questionnaire with multiple choice and free text questions
- [ ] Do responses show in the staff dashboard with progress bars?
- [ ] Can you export responses as CSV?
- [ ] Add a link attachment to an announcement — does it work?
- [ ] Set an expiration date — does the announcement close automatically?
- [ ] Test on both web and mobile — does the overlay appear on both?

---

## Settings

- [ ] Enable/disable individual tabs — do they hide from navigation?
- [ ] Configure permissions per role — are they enforced correctly?
- [ ] Create invite codes with usage limits — do they cap correctly?
- [ ] Toggle invite codes active/inactive
- [ ] Add/remove/reorder levels — does the rest of the app reflect the changes?
- [ ] Configure season start month/day
- [ ] Set qualifying score thresholds — do badges appear in Scores?
- [ ] Create hub channels — do they show in Messages?
- [ ] Adjust privacy settings (as parent) — is your info hidden from other parents?

---

## Mobile App

- [ ] Do all tabs load and display correctly?
- [ ] Does push notification tapping deep link to the correct screen?
- [ ] Download floor music for offline playback — does it work without internet?
- [ ] Is the mini music player working (play/pause/seek)?
- [ ] Do unread message badges show and clear correctly?
- [ ] Can you RSVP to events from mobile?
- [ ] Do group posts with polls, sign-ups, and RSVPs work on mobile?
- [ ] Are announcements blocking on mobile just like web?
- [ ] Does the app handle being offline gracefully?
- [ ] Test on both Android and iOS — any platform-specific issues?

---

## General

- [ ] Is the app responsive on different screen sizes (phone, tablet, desktop)?
- [ ] Do page loads feel fast or are there noticeable delays?
- [ ] Are there any broken links or dead-end pages?
- [ ] Is any text cut off, overlapping, or hard to read?
- [ ] Are error messages helpful when something goes wrong?
- [ ] Does anything behave differently than you'd expect as a coach?
- [ ] What features are missing that your gym needs?
- [ ] What's confusing or takes too many clicks to accomplish?
