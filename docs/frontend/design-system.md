# Digital Gym Design System (Light Theme)

## Core Palette
- **Background:** `slate-50` (main content), `white` (cards, sidebars, modals)
- **Text:** `slate-900` (headings), `slate-700` (body), `slate-500` (muted/labels)
- **Primary Accent:** `brand-500` to `brand-700` (buttons, links, active states)
- **Secondary:** `indigo-500` to `indigo-700` (info, selected items)
- **Semantic:** `success-*`, `error-*`, `warning-*`, `amber-*`

## Color Reference
```
Page background:    bg-slate-50
Cards/modals:       bg-white border border-slate-200
Card headers:       bg-slate-50 border-b border-slate-200
Headings:           text-slate-900
Body text:          text-slate-700
Muted text:         text-slate-500
Links:              text-brand-600 hover:text-brand-700
Active tabs:        border-brand-500 text-brand-600
Inactive tabs:      text-slate-500 hover:text-slate-900
Icon backgrounds:   bg-brand-50, bg-purple-50, bg-blue-50, bg-emerald-50
Icon colors:        text-brand-600, text-purple-600, text-blue-600
Badges:             bg-brand-100 text-brand-700 (primary)
                    bg-slate-100 text-slate-600 (neutral)
Inputs:             border-slate-300 focus:border-brand-500 focus:ring-brand-500
```

## Component Classes
```css
.btn-primary    /* Brand background, white text */
.btn-secondary  /* Outlined, slate border, white bg */
.btn-ghost      /* Text only, hover background */
.btn-danger     /* Red/error color */
.card           /* white bg, rounded-xl, slate-200 border */
.input          /* Light input with brand focus ring */
.badge-mint     /* Green/success badge */
.badge-indigo   /* Blue/info badge */
.badge-slate    /* Neutral badge */
```

## Pill Toggle Pattern
Used for view mode switches (e.g., By Meet / Metrics, Daily / Metrics):
```
bg-slate-100 rounded-lg p-1 w-fit
```
Active pill: `bg-white text-slate-900 shadow-sm`
Inactive pill: `text-slate-500 hover:text-slate-900` or `text-slate-600 hover:text-slate-900`

## Rules
- Tailwind CSS 4 only — no CSS modules or inline styles
- Use `brand-*` instead of `mint-*` for consistency
- Do NOT use dark theme colors (`slate-800/900` backgrounds, `chalk-50`) — the app uses a light theme
- Use `clsx` + `tailwind-merge` for conditional class composition
