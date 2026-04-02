# RestoOS Design System

## Theme: Matte Kitchen ("The Tactical Monolith")

Dark-first design for professional kitchen environments. Designed for
low-light conditions, high-contrast readability, and one-handed use on
greasy screens.

## Color Tokens

All colors via CSS variables in `globals.css`. Never hardcode hex values.

### Surfaces (dark mode)
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#0A0A0A` | Page background |
| `--sidebar` | `#111111` | Sidebar background |
| `--card` | `#1A1A1A` | Card/panel background |
| `--card-hover` | `#222222` | Card hover state |
| `--accent` | `#2A2A2A` | Elevated surface, popovers |
| `--surface-elevated` | `#353534` | Highest elevation |

### Brand & Semantic
| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#F97316` | Primary accent (orange), CTAs, active states |
| `--primary-foreground` | `#0A0A0A` | Text on primary bg |
| `--foreground` | `#E5E2E1` | Primary text (warm off-white) |
| `--muted-foreground` | `#A78B7D` | Secondary text (warm terracotta) |
| `--destructive` | `#E24B4A` | Errors, destructive actions |
| `--border` | `rgba(88,66,55,0.15)` | Default border (ghost) |
| `--border-subtle` | `#333333` | Subtle borders |
| `--border-hover` | `#555555` | Border hover state |

### Semantic Status
| Color | Token | Usage |
|-------|-------|-------|
| Green | `text-green-400` / `bg-green-500/10` | Success, healthy, in-range |
| Red | `text-red-400` / `bg-red-500/10` | Error, critical, out-of-range |
| Yellow/Amber | `text-yellow-400` / `bg-yellow-500/10` | Warning, attention needed |
| Blue | `text-blue-400` / `bg-blue-500/10` | Info, neutral status |

## Typography

| Element | Class | Size | Weight |
|---------|-------|------|--------|
| Page title | `text-2xl font-bold` | 24px | 700 |
| Section label | `text-sm font-semibold uppercase tracking-widest text-muted-foreground` | 14px | 600 |
| Body text | `text-sm` | 14px | 400 |
| Table headers | `text-xs font-semibold uppercase tracking-widest` | 12px | 600 |
| Caption/meta | `text-xs text-muted-foreground` | 12px | 400 |
| KPI value | `text-2xl font-bold` or `text-3xl` | 24-30px | 700 |

Font: system-ui via Tailwind (Next.js Geist Sans when loaded).
Minimum body text: 14px. Minimum caption: 12px. Never use 10px.

## Spacing

Base: 4px (Tailwind default). Common values:
- `gap-2` (8px): tight groups
- `gap-3` (12px): default spacing
- `gap-4` (16px): section internal
- `gap-6` (24px): section separation
- `p-4` / `p-5`: card padding

## Border Radius

Scale defined in CSS:
- `--radius`: 0.625rem (10px base)
- Cards: `rounded-lg` (10px)
- Buttons: `rounded-md` (8px)
- Pills/badges: `rounded-full`

## Components

### Cards
- Background: `bg-card`
- Hover: `hover:bg-card-hover`
- No colored left borders (AI slop pattern, removed)
- KPI cards use tinted icon background instead

### Buttons
- Primary: `bg-primary text-primary-foreground hover:bg-primary/90`
- All buttons have `cursor: pointer` (global rule)
- Minimum touch target: 44px

### Section Headers
Use `SectionLabel` component (`src/app/(dashboard)/page.tsx`):
`text-sm font-semibold uppercase tracking-widest text-muted-foreground`

### Tables
- Header: `text-xs font-semibold uppercase tracking-widest text-muted-foreground`
- Rows: `border-b border-border hover:bg-card-hover transition-colors`
- Use tabular-nums for number columns

### Status Indicators
- Use tinted backgrounds (`bg-green-500/10`) not colored borders
- Always combine color with text label (accessibility)
- Dot indicators: `h-2 w-2 rounded-full bg-{color}`

## Accessibility

- Focus rings: `outline-ring/50` (auto from base layer)
- Touch targets: minimum 44px on all interactive elements
- Icon buttons: always include `aria-label`
- No `outline: none` without replacement
- Color never as sole indicator (always add text/icon)

## Layout

- Sidebar: fixed left, 64px collapsed / 256px expanded
- Content: scrollable main area with max-width
- Mobile: sidebar hidden, hamburger menu
- Grid: responsive with `sm:`, `md:`, `lg:` breakpoints

## Anti-Patterns (DO NOT)

1. No colored left-border on cards (`border-l-4 border-l-*`)
2. No hardcoded hex colors (use CSS tokens)
3. No text smaller than 12px
4. No emoji as design elements
5. No purple/violet gradients
6. No 3-column icon-in-circle feature grids
7. No `transition: all` (list properties explicitly)
