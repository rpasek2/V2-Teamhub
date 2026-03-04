# Digital Gym Design System

## Theme Architecture
The app supports **light mode** and **dark mode** via CSS custom properties defined in `src/index.css`. All UI should use **semantic token classes** so colors automatically adapt to the active theme. Never hardcode `slate-800` or `white` for surfaces/text — use the tokens below.

Hub accent colors are also runtime-swappable (owner picks a color in Settings).

## Semantic Token Reference
These map to `--th-*` CSS variables that swap between light/dark:

```
Surfaces:
  bg-surface          — main card/modal background
  bg-surface-alt      — slightly contrasted (sidebar, footer)
  bg-surface-hover    — hover state
  bg-surface-active   — active/pressed state

Text:
  text-heading        — h1/h2/h3, primary emphasis
  text-body           — default body text
  text-subtle         — secondary labels
  text-muted          — tertiary, descriptions
  text-faint          — placeholder, hint text

Borders:
  border-line         — default dividers, card borders
  border-line-strong  — higher contrast borders

Accent (hub color):
  bg-accent-50 .. bg-accent-900
  text-accent-500 .. text-accent-700
  border-accent-500
```

## When to Use Raw Tailwind Colors
Semantic colors like `red-500`, `blue-600`, `amber-500`, `purple-600` are fine for **status badges, alerts, and qualifying indicators** — things that should look the same in both themes. Use them alongside semantic tokens:
```
bg-red-500/10 border border-red-500/20 text-red-600    — error alert
bg-blue-500/15 text-blue-600                           — state qualifier badge
bg-amber-500/15 text-amber-600                         — national qualifier badge
```

## Component Classes
```css
.btn-primary    /* Accent background, white text */
.btn-secondary  /* Outlined, border-line, bg-surface */
.btn-ghost      /* Text only, hover bg-surface-hover */
.btn-danger     /* Red/error color */
.card           /* bg-surface, rounded-xl, border-line */
.input          /* bg-input, border-line, accent focus ring */
.badge-mint     /* Green/success badge */
.badge-indigo   /* Blue/info badge */
.badge-slate    /* Neutral badge */
```

## Pill Toggle Pattern
Used for view mode switches (e.g., By Meet / Metrics):
```
Container: bg-surface-hover rounded-lg p-1 w-fit
Active:    bg-surface text-heading shadow-sm
Inactive:  text-muted hover:text-body
```

## Rules
- Tailwind CSS 4 only — no CSS modules or inline styles
- Always use semantic tokens (`bg-surface`, `text-heading`, etc.) for surfaces and text
- Use `accent-*` for the hub's primary color, NOT `brand-*` or `mint-*` directly
- Raw color scales (slate-*, blue-*, etc.) are OK for fixed-meaning elements (badges, alerts)
- Use `clsx` + `tailwind-merge` for conditional class composition
