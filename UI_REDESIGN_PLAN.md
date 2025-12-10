# TeamHub V2 UI Redesign Plan

## Brand Identity: "Tech-Naturalism"

**Core Philosophy:** *"Building the hidden structures that allow magic to happen."*

**The Vibe:** High-tech engineering discovered in an ancient forest. Bridging the organic (human movement in gymnastics, storytelling) and the rigid (code, physics, rulesets).

**Archetype:** The Sage & The Builder - wisdom to ask "why" and tools to build the "how"

---

## Design System Foundation

### Color Palette

```css
/* Primary: Deep Canopy Green - wisdom, growth, nature */
--canopy-50: #f0fdf4
--canopy-100: #dcfce7
--canopy-200: #bbf7d0
--canopy-300: #86efac
--canopy-400: #4ade80
--canopy-500: #22c55e
--canopy-600: #16a34a
--canopy-700: #15803d
--canopy-800: #166534
--canopy-900: #14532d    /* Primary brand color */
--canopy-950: #052e16    /* Deepest forest */

/* Secondary: Slate/Mithril Grey - hardware, code, steel equipment */
--mithril-50: #f8fafc
--mithril-100: #f1f5f9
--mithril-200: #e2e8f0
--mithril-300: #cbd5e1
--mithril-400: #94a3b8
--mithril-500: #64748b
--mithril-600: #475569
--mithril-700: #334155
--mithril-800: #1e293b
--mithril-900: #0f172a
--mithril-950: #020617

/* Accent: Arcane Gold - magic, perfect routines, critical moments */
--arcane-300: #fcd34d
--arcane-400: #fbbf24
--arcane-500: #f59e0b
--arcane-600: #d97706

/* Accent Alt: Ether Blue - for secondary CTAs, links */
--ether-400: #60a5fa
--ether-500: #3b82f6
--ether-600: #2563eb

/* Backgrounds: Paper/Parchment tones */
--paper-white: #fefdfb
--paper-cream: #faf9f7
--paper-warm: #f5f4f1

/* Semantic Colors */
--success: var(--canopy-600)
--warning: var(--arcane-500)
--error: #dc2626
--info: var(--ether-500)
```

### Typography

```css
/* Headings: Spectral - academic, philosophical, fantasy literature */
@import url('https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600;700&display=swap');

/* Body/UI: JetBrains Mono - clean, technical, "I wrote this code" */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

/* Alternative Body: Inter - for longer text blocks */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

--font-display: 'Spectral', Georgia, serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-body: 'Inter', system-ui, sans-serif;

/* Type Scale */
--text-display: 3rem      /* Hero headings - Spectral */
--text-h1: 2.25rem        /* Page titles - Spectral */
--text-h2: 1.75rem        /* Section headers - Spectral */
--text-h3: 1.25rem        /* Card titles - Spectral */
--text-h4: 1.125rem       /* Subsections */
--text-body: 1rem         /* Body text - Inter */
--text-sm: 0.875rem       /* Secondary text */
--text-xs: 0.75rem        /* Labels - JetBrains Mono */
--text-mono: 0.875rem     /* Code/data - JetBrains Mono */
```

### Glassmorphism System

```css
/* Frosted glass panels - premium, ethereal (like Rivendell) */
--glass-bg: rgba(255, 255, 255, 0.7);
--glass-border: rgba(255, 255, 255, 0.3);
--glass-blur: 12px;

/* Dark glass variant */
--glass-dark-bg: rgba(15, 23, 42, 0.8);
--glass-dark-border: rgba(255, 255, 255, 0.1);

/* Glass panel class */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
}
```

### Shadow & Depth

```css
/* Organic shadows - softer, more natural */
--shadow-xs: 0 1px 2px rgba(5, 46, 22, 0.04);
--shadow-sm: 0 2px 4px rgba(5, 46, 22, 0.06), 0 1px 2px rgba(5, 46, 22, 0.04);
--shadow-md: 0 4px 12px rgba(5, 46, 22, 0.08), 0 2px 4px rgba(5, 46, 22, 0.04);
--shadow-lg: 0 8px 24px rgba(5, 46, 22, 0.1), 0 4px 8px rgba(5, 46, 22, 0.06);
--shadow-xl: 0 20px 48px rgba(5, 46, 22, 0.12), 0 8px 16px rgba(5, 46, 22, 0.08);

/* Glowing accents for magical moments */
--glow-gold: 0 0 20px rgba(245, 158, 11, 0.3);
--glow-ether: 0 0 20px rgba(59, 130, 246, 0.3);
--glow-canopy: 0 0 20px rgba(22, 163, 74, 0.3);
```

---

## Phase 1: Design Foundation

### 1.1 Update index.css
- Add font imports (Spectral, JetBrains Mono, Inter)
- Define CSS custom properties for colors
- Create glass utility classes
- Set paper-white backgrounds
- Define shadow system

### 1.2 Update tailwind.config.js
- Extend colors with canopy, mithril, arcane, ether
- Add font families
- Add custom shadows

**Files:**
- `src/index.css`
- `tailwind.config.js` (if exists, or vite config)

---

## Phase 2: Core Components

### 2.1 Sidebar Redesign
**Concept:** Glassmorphism panel with organic touches

- Frosted glass background over subtle forest texture/gradient
- Logo area: Two Trees concept (|| branching to canopy)
- Nav items: Mithril grey, canopy green active state with gold accent line
- User section: Avatar with subtle glow ring
- Collapse animation: Smooth, organic easing

**File:** `src/components/layout/sports/GymnasticsSidebar.tsx`

### 2.2 Stat-Block Cards (D&D Character Sheet Style)
**Concept:** Data presented like RPG stat blocks

```
┌─────────────────────────────┐
│ ▣ ROSTER                    │  <- Header with icon
├─────────────────────────────┤
│  TOTAL        ACTIVE    NEW │  <- Stat labels (mono font)
│   42            38       4  │  <- Big numbers (Spectral)
│                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━  │  <- Decorative divider
│  +3 this month              │  <- Flavor text
└─────────────────────────────┘
```

- Clear boxes with distinct borders
- Bold numbers in Spectral
- Labels in JetBrains Mono (small caps feel)
- Subtle paper texture background

**File:** Create `src/components/ui/StatBlock.tsx`

### 2.3 Progress & Level-Up Visualization
**Concept:** Gamified progress bars

- Gymnast skill progression as "experience bars"
- Level badges (like D&D levels)
- Milestone markers with gold accents
- "Level Up" celebration animation

**File:** Create `src/components/ui/ProgressBar.tsx`

### 2.4 Button System
**Variants:**
- **Primary:** Canopy green gradient, gold glow on hover
- **Secondary:** Mithril outlined, fills on hover
- **Ghost:** Transparent, subtle hover
- **Arcane:** Gold accent for special actions

**File:** Create `src/components/ui/Button.tsx`

### 2.5 Input System
- Paper-textured backgrounds
- Canopy green focus rings
- JetBrains Mono for input text (technical feel)
- Floating labels with Spectral font

**File:** Create `src/components/ui/Input.tsx`

### 2.6 Modal Enhancement
- Glassmorphism backdrop
- Paper-white modal with subtle shadow
- Header with Spectral typography
- Organic corner accents (subtle branch motifs?)

**File:** `src/components/ui/Modal.tsx`

### 2.7 Badge System
**Variants:**
- Role badges: Canopy (owner), Mithril (admin), etc.
- Level badges: Gold accented
- Status badges: Semantic colors

**File:** Create `src/components/ui/Badge.tsx`

---

## Phase 3: Page Redesigns

### 3.1 Dashboard
**Concept:** Command center meets character sheet

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Good morning, Roger                            │
│  "Building the hidden structures..."            │
├──────────┬──────────┬──────────┬───────────────┤
│ MEMBERS  │ GYMNASTS │ EVENTS   │ COMPETITIONS  │
│   42     │   28     │   12     │      3        │
│ ▲ +3     │ ▲ +2     │ upcoming │   this season │
├──────────┴──────────┴──────────┴───────────────┤
│                                                 │
│  ▣ UPCOMING QUESTS (Events)                    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                   │
│  │ 📅 │ │ 🏆 │ │ 👥 │ │ ⚡ │  <- Horizontal   │
│  │Dec │ │Jan │ │Jan │ │Feb │     scroll cards │
│  └────┘ └────┘ └────┘ └────┘                   │
│                                                 │
│  ▣ RECENT ACTIVITY                             │
│  • New member joined...                         │
│  • Competition results posted...                │
│  • Practice schedule updated...                 │
└─────────────────────────────────────────────────┘
```

**File:** `src/pages/Dashboard.tsx`

### 3.2 Roster
**Concept:** Party roster / character list

- Card view with "character portraits" (avatars)
- Role displayed as class/title
- Level as progression indicator
- Quick stats visible (attendance, skills)
- Hover reveals more info (like hovering over a character in a game)

**File:** `src/pages/Roster.tsx`

### 3.3 Calendar
**Concept:** Quest log / campaign calendar

- Events as quests with type icons
- Today highlighted with arcane gold
- Month navigation with elegant transitions
- Event cards with stat-block styling

**File:** `src/pages/Calendar.tsx`

### 3.4 Settings
**Concept:** Configuration tome

- Sections as chapters
- Toggle switches with organic feel
- Danger zone with warning styling
- Clear hierarchy with Spectral headers

**File:** `src/pages/Settings.tsx`

### 3.5 Groups/Social
**Concept:** Tavern board / guild hall

- Posts as notices on a board
- Reactions with playful animations
- Comments threaded cleanly
- Rich media displays

**Files:** `src/pages/Groups.tsx`, `src/components/groups/PostCard.tsx`

---

## Phase 4: Motion & Polish

### 4.1 Transitions
- Page transitions: Fade with subtle scale
- Route changes: Organic easing curves
- Content reveal: Staggered fade-in

### 4.2 Micro-interactions
- Button press: Satisfying tactile feedback
- Card hover: Gentle lift with glow
- Toggle switches: Smooth slide
- Success states: Gold sparkle/glow

### 4.3 Loading States
- Skeleton screens with subtle shimmer
- Progress indicators with canopy green
- Spinner with organic movement

### 4.4 Level-Up Moments
- Achievement unlocked animations
- Progress milestones with celebration
- Score entries with impact feedback

---

## Phase 5: Final Polish

### 5.1 Empty States
- Illustrated empty states (forest/nature themed)
- Encouraging copy ("Your quest awaits...")
- Clear action prompts

### 5.2 Error Handling
- Friendly error messages
- Nature-themed 404 (lost in the forest?)
- Recovery suggestions

### 5.3 Responsive Design
- Mobile: Bottom navigation
- Tablet: Collapsed sidebar
- Desktop: Full experience

---

## Implementation Order

### Sprint 1: Foundation
1. `src/index.css` - Fonts, colors, variables, glass utilities
2. `tailwind.config.js` - Theme extensions
3. Base background/paper textures

### Sprint 2: Components
1. `src/components/ui/Button.tsx`
2. `src/components/ui/StatBlock.tsx`
3. `src/components/ui/Badge.tsx`
4. `src/components/ui/Input.tsx`
5. `src/components/ui/ProgressBar.tsx`
6. `src/components/ui/Modal.tsx` (enhance)
7. `src/components/layout/sports/GymnasticsSidebar.tsx`

### Sprint 3: Pages
1. `src/pages/Dashboard.tsx`
2. `src/pages/Roster.tsx`
3. `src/pages/Calendar.tsx`
4. `src/pages/Settings.tsx`
5. `src/pages/Groups.tsx`

### Sprint 4: Polish
1. Animations & transitions
2. Loading states
3. Empty states
4. Final refinements

---

## Files Summary

### New Files:
- `src/components/ui/Button.tsx`
- `src/components/ui/StatBlock.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/ProgressBar.tsx`
- `src/components/ui/Skeleton.tsx`

### Modified Files:
- `src/index.css`
- `tailwind.config.js`
- `src/components/layout/sports/GymnasticsSidebar.tsx`
- `src/components/ui/Modal.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Roster.tsx`
- `src/pages/Calendar.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Groups.tsx`
- `src/components/groups/PostCard.tsx`

---

## Brand Summary

| Element | Choice | Meaning |
|---------|--------|---------|
| Primary Color | Deep Canopy Green | Wisdom, growth, nature, Two Trees |
| Secondary Color | Mithril Grey | Code, hardware, steel equipment |
| Accent Color | Arcane Gold | Magic, perfect moments, achievements |
| Alt Accent | Ether Blue | Links, secondary actions |
| Heading Font | Spectral | Academic, philosophical, fantasy |
| UI Font | JetBrains Mono | Technical, coded, precise |
| Body Font | Inter | Clean readability |
| UI Style | Glassmorphism | Premium, ethereal, Rivendell-like |
| Data Display | Stat Blocks | D&D character sheet clarity |
| Progress | Level-Up Bars | Gamified, coach-focused |

*"Building the hidden structures that allow magic to happen."*
