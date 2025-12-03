# Groups Feature Enhancement Plan

## Overview
Transform the Groups feature into a robust communication hub (Band replacement) with rich post capabilities including polls, images, files, sign-up forms, and surveys.

---

## Current State
- Basic groups with name, description, public/private type
- Simple posts with text + optional single image
- Comments on posts
- Group membership (admin/member roles)

---

## Enhanced Post System

### Post Structure
A post will have:
- **Text content** (required) - The main message
- **Attachments** (optional) - One or more of the following:

### Attachment Types

#### 1. Images (Existing - Enhance)
- Support multiple images per post (gallery)
- Image preview/lightbox when clicked
- Drag & drop upload

#### 2. Files/Documents
- PDF, Word, Excel, etc.
- File name and size display
- Download button
- Icon based on file type

#### 3. Poll
- Question text
- Multiple options (2-10)
- Single or multiple choice
- Optional: Show results before voting / after voting / always
- Optional: Allow changing vote
- Optional: End date/time
- Results display with percentages and vote counts

#### 4. Sign-Up Form (Event Sign-Up / Volunteer Slots)
- Title (e.g., "Snack Sign-Up for Saturday Meet")
- Description
- Multiple slots with:
  - Slot name (e.g., "Fruit", "Drinks", "Napkins")
  - Max sign-ups per slot (optional)
  - Current sign-ups shown
- Users can sign up for slots
- Option to allow multiple sign-ups per person

#### 5. Survey
- Title and description
- Multiple questions:
  - Text response
  - Single choice (radio)
  - Multiple choice (checkboxes)
  - Rating scale (1-5 or 1-10)
- Optional: Anonymous responses
- Optional: End date
- Results viewable by admins
- Export responses to CSV

#### 6. RSVP Request (Simple Yes/No/Maybe)
- Event/activity name
- Date/time (optional)
- Location (optional)
- Going / Not Going / Maybe buttons
- Shows who responded with what

#### 7. Link Preview (Auto-detect)
- When a URL is pasted, auto-fetch Open Graph data
- Show title, description, image preview
- Clickable to open in new tab

---

## Database Schema Changes

### New Tables

```sql
-- Enhanced posts table (modify existing)
ALTER TABLE posts ADD COLUMN attachments jsonb DEFAULT '[]';
-- attachments stores array of attachment objects

-- Poll responses
CREATE TABLE poll_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    option_indices integer[], -- array of selected option indices
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Sign-up slots
CREATE TABLE signup_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    slot_index integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id, slot_index)
);

-- Survey responses
CREATE TABLE survey_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    answers jsonb NOT NULL, -- { questionIndex: answer }
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- RSVP responses
CREATE TABLE rsvp_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL CHECK (status IN ('going', 'not_going', 'maybe')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id)
);
```

### Attachment JSON Structure

```typescript
// In posts.attachments (JSONB array)
type PostAttachment =
  | { type: 'images'; urls: string[] }
  | { type: 'files'; files: { url: string; name: string; size: number; mimeType: string }[] }
  | { type: 'poll'; question: string; options: string[]; settings: PollSettings }
  | { type: 'signup'; title: string; description?: string; slots: SignupSlot[] }
  | { type: 'survey'; title: string; description?: string; questions: SurveyQuestion[]; settings: SurveySettings }
  | { type: 'rsvp'; title: string; date?: string; time?: string; location?: string }
  | { type: 'link'; url: string; title?: string; description?: string; image?: string };

interface PollSettings {
  multipleChoice: boolean;
  showResultsBeforeVote: boolean;
  allowChangeVote: boolean;
  endDate?: string;
}

interface SignupSlot {
  name: string;
  maxSignups?: number;
}

interface SurveyQuestion {
  type: 'text' | 'single' | 'multiple' | 'rating';
  question: string;
  options?: string[]; // for single/multiple
  scale?: number; // for rating (5 or 10)
  required: boolean;
}

interface SurveySettings {
  anonymous: boolean;
  endDate?: string;
}
```

---

## UI Components Needed

### Post Creation
1. **CreatePostModal** (enhance existing)
   - Text area for content
   - Attachment toolbar with icons:
     - Image icon - opens image picker
     - Paperclip - opens file picker
     - Bar chart - opens poll creator
     - Clipboard/list - opens sign-up creator
     - Document/survey - opens survey creator
     - Calendar check - opens RSVP creator
   - Preview of attached items before posting
   - Only one "interactive" attachment per post (poll OR signup OR survey OR rsvp)
   - Can have images + files + one interactive

### Attachment Creators (Sub-modals/Panels)
1. **PollCreator** - Question + options list
2. **SignupCreator** - Title + slot list builder
3. **SurveyCreator** - Multi-question builder
4. **RSVPCreator** - Event details form

### Post Display Components
1. **PostCard** (enhance existing)
   - Render attachments based on type
   - Interactive elements inline

2. **ImageGallery** - Grid of images, lightbox on click
3. **FileList** - List of downloadable files
4. **PollDisplay** - Vote buttons, results bar chart
5. **SignupDisplay** - Slot list with sign-up buttons
6. **SurveyDisplay** - Form to fill out / results view
7. **RSVPDisplay** - Going/Not Going/Maybe buttons with counts
8. **LinkPreview** - Card with OG data

---

## Implementation Phases

### Phase 1: Database & Types
1. Create migration for new tables
2. Update TypeScript types
3. Update Post type with attachments

### Phase 2: Enhanced Images & Files
1. Multi-image upload
2. Image gallery component
3. File upload support
4. File list component

### Phase 3: Poll Feature
1. Poll creator UI
2. Poll display component
3. Vote handling
4. Results visualization

### Phase 4: Sign-Up Feature
1. Sign-up creator UI
2. Sign-up display component
3. Slot sign-up handling

### Phase 5: RSVP Feature
1. RSVP creator UI
2. RSVP display component
3. Response handling

### Phase 6: Survey Feature
1. Survey question builder
2. Survey display/fill-out form
3. Response collection
4. Results/export

### Phase 7: Link Previews
1. URL detection in content
2. OG data fetching (server-side or edge function)
3. Link preview card

### Phase 8: Polish & UX
1. Consistent styling matching new design system
2. Loading states
3. Error handling
4. Mobile responsiveness

---

## Additional Features to Consider

1. **Post Pinning** - Pin important posts to top
2. **Post Scheduling** - Schedule posts for future
3. **Notifications** - Email/push for new posts (future)
4. **Post Templates** - Save common post formats
5. **Mentions** - @mention users in posts
6. **Reactions** - Like/emoji reactions on posts (beyond comments)
7. **Read Receipts** - See who has viewed a post

---

## Questions to Clarify

1. Should polls/surveys have end dates that auto-close them?
2. Should sign-up slots show names of who signed up (public) or just counts?
3. Maximum file size for uploads?
4. Should surveys be anonymous by default?
5. Priority order for implementation?
