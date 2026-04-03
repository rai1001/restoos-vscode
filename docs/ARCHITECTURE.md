# ChefOS — Architecture

## Overview

RestoOS is a multi-local restaurant management platform built as a single Next.js 16 application with 47 dashboard pages, 6 pure calculation engines, 7 AI agents (Supabase Edge Functions + Gemini 2.0 Flash), 8 Remotion video compositions, and a dark-first design system (Calm Darkness).

---

## Application Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # 47 pages, 22 modules (authenticated)
│   ├── (auth)/login/       # Login page
│   └── api/                # 4 API routes
├── components/             # Shared UI (shadcn/ui v4 + custom)
├── contracts/              # Canonical enums, schemas, document-vault types
├── features/               # Business modules (co-located hooks, schemas, components)
├── hooks/                  # Global hooks (use-role, use-voice-input)
├── lib/                    # Core logic
│   ├── calculations/       # 6 pure engines + 149 unit tests
│   ├── chart-config.ts     # Recharts palette, theme, formatters
│   ├── auth/               # Auth helpers
│   ├── db/                 # Supabase client
│   ├── mock-data.ts        # Complete mock dataset
│   ├── product-matcher.ts  # Fuzzy matching
│   ├── voice-parser.ts     # Voice input parser
│   ├── rbac/               # Role-based access control + module access
│   └── document-vault/     # Vault service, integrity checker (SHA-256)
├── remotion/               # Video compositions (Remotion 4)
│   ├── OnboardingVideo.tsx  # 19 scenes, 3m18s
│   ├── pitch/              # 12 scenes, 2m35s
│   ├── tutorials/          # 6 module tutorials (30-67s each)
│   └── scenes/             # Shared scene components
└── types/                  # Global TypeScript types
```

---

## Dashboard Modules (46 pages)

| Module | Route | Pages | Description |
|--------|-------|-------|-------------|
| Dashboard | `/` | 1 | KPIs, charts, alerts, quick actions, AI briefing widget |
| Recipes | `/recipes` | 4 | List, create, detail (with escandallo), new |
| Escandallo | `/escandallo` | 1 | Dynamic recipe costing |
| Events | `/events` | 3 | Calendar, detail, create with production wizard |
| Menu Engineering | `/menu-engineering` | 1 | Boston matrix, KPIs, recommendations |
| Menus | `/menus` | 4 | List, detail, create, engineering view |
| Procurement | `/procurement` | 4 | Orders (list/detail/create), purchase requests |
| Inventory | `/inventory` | 3 | Stock overview, lots, movements |
| Catalog | `/catalog` | 5 | Overview, products, categories, units, suppliers |
| Operations | `/operations` | 4 | Kanban, tasks, workflows, mise en place |
| Forecasting | `/forecasting` | 1 | 14-day demand forecast |
| APPCC | `/appcc` | 1 | Food safety records and charts |
| Staffing | `/staffing` | 1 | Personnel and shifts |
| Reports | `/reports` | 1 | Food cost, purchases, profitability, waste |
| Clients | `/clients` | 1 | Client management |
| Reservations | `/reservations` | 1 | Calendar (day/week/list views) |
| Labeling | `/labeling` | 2 | Label generator, traceability inventory |
| Feedback | `/my-tickets`, `/admin/tickets` | 2 | User tickets, admin ticket management |
| Automations | `/automations` | 4 | Overview, jobs, dead-letter, integrations |
| Documents | `/documents` | 1 | Document vault: invoices, delivery notes, APPCC records |
| Settings | `/settings` | 3 | Overview, hotel config, team management |

---

## Calculation Engines

6 pure-function engines in `src/lib/calculations/`. No side effects, no DB, no AI. Composable pipeline:

```
events + forecasts
       │
       ▼
  demandEngine  →  DemandLine[]
       │
       ▼
procurementEngine  →  PurchaseSuggestion[]
       │
       ▼
  Purchase Orders (FSM)
```

```
recipe + catalog + products
       │
       ▼
   costEngine  →  RecipeCostResult
       │
       ├──▶ marginEngine  →  PricingRecommendation[] + Boston matrix
       │
       └──▶ scalingEngine  →  ScaledRecipe + ShoppingList
```

```
history + events + stock
       │
       ▼
 forecastEngine  →  DailyForecast[] + ForecastSummary[]
```

| Engine | Functions | Tests | Purpose |
|--------|-----------|-------|---------|
| costEngine | `calculateRecipeCost`, `calculateSuggestedPvp`, `collectAllergens` | 24 | Recipe costing with sub-recipes, waste, allergens |
| demandEngine | `calculateDemand` | 10 | Menu explosion to ingredient demand |
| procurementEngine | `generatePurchaseSuggestions`, `adjustToMoqAndPacks` | 21 | Demand vs stock, MOQ, urgency |
| marginEngine | `calculatePricingByChannel`, `classifyDish`, `analyzeMenu`, `calculatePriceImpact` | 27 | Channel pricing, Boston matrix |
| scalingEngine | `scaleRecipe`, `generateShoppingList` | 14 | Recipe scaling, shopping lists |
| forecastEngine | `generateForecast` | 13 | 14-day demand forecast with seasonality |

**Total: 186 unit tests** (Vitest, ~4s).

---

## AI Agents (Supabase Edge Functions)

7 agents in `supabase/functions/`, all using Gemini 2.0 Flash. Business logic separated from Supabase adapter for VPS portability. All 11 edge functions protected with `verifyCallerHotelAccess` (JWT + membership check).

```
supabase/functions/
├── _shared/              # Pure business logic (portable to Node.js)
│   ├── utils.ts          # Shared: supabaseClient, callGemini, logAgent, verifyCallerHotelAccess
│   ├── types.ts          # Shared agent types
│   ├── clara_types.ts    # CLARA types + ClaraDeps (injectable)
│   ├── clara_prompts.ts  # 4 Gemini prompts (JSON-only output)
│   ├── clara_utils.ts    # SHA-256, NIF validation, retry, token estimation
│   ├── clara_collector.ts  # Module 1: email parsing, classification
│   ├── clara_ocr.ts        # Module 2: Gemini Vision extraction
│   ├── clara_reconciler.ts # Module 3: invoice vs receipt matching
│   ├── clara_messenger.ts  # Module 4: supplier message drafting
│   └── clara_agent.ts      # Orchestrator: runClara()
├── agent-escandallo/     # Recipe cost recalculation
├── agent-menu-engineering/ # BCG matrix analysis
├── agent-ocr/            # Invoice OCR (standalone)
├── agent-appcc/          # Daily APPCC closure
├── agent-integrity/      # Document vault integrity verification (daily)
├── agent-inventario/     # FIFO stock (optimistic concurrency) + purchase suggestions
├── clara-agent/          # CLARA orchestrator (thin adapter)
├── clara-collector/      # CLARA module 1 adapter
├── clara-ocr/            # CLARA module 2 adapter
├── clara-reconciler/     # CLARA module 3 adapter
└── clara-messenger/      # CLARA module 4 adapter
```

CLARA pipeline: email/document -> classify -> OCR Vision -> reconcile vs goods_receipts -> draft supplier messages. Cost: $0.0007/invoice.

---

## Feature Modules

Co-located business logic in `src/features/`:

| Feature | Contents |
|---------|----------|
| recipes | Hooks, schemas, RecipeStatusBadge, TechSheetDialog, ImportRecipeModal |
| events | Mock data, event FSM (`event-fsm.ts`) |
| procurement | PO FSM (`po-fsm.ts`), schemas, hooks, OCR albaran dialog, status badges |
| catalog | Allergen types/editor, product aliases, schemas, hooks, services |
| inventory | Waste types, stock reservations, waste record form, schemas, hooks |
| operations | Task status badge, schemas, hooks, services |
| menu-engineering | Mock data, types, hook |
| escandallo | Types, mock data, hook |
| labeling | Label form, label preview, prep alerts widget, prep batch hooks, mock data |
| feedback | Feedback button, schemas (ticket types/status/priority), hooks, mock data |
| reservations | Reservation dialog, schemas, hooks |
| dashboard | Briefing widget, dashboard mock data |
| reporting | Schemas, services, hooks, mock data |
| staffing | Types, mock data, hook |
| automations | Schemas, services, hooks, job status badge |
| appcc | Types, mock data, hook |

---

## API Routes

| Route | Method | Service | Description |
|-------|--------|---------|-------------|
| `/api/ocr-recipe` | POST | Mistral Vision | Extract recipe from image |
| `/api/ocr-albaran` | POST | Mistral Vision | Extract delivery note from image |
| `/api/ocr` | POST | Gemini Vision | Invoice OCR extraction |
| `/api/briefing` | POST | Google Gemini | Generate operational AI briefing |
| `/api/digest` | POST | Internal | Daily digest generation |
| `/api/notify-ticket` | POST | Resend | Send feedback ticket email (identity from JWT, not body) |

All routes return mock data when the corresponding API key is absent.

---

## Remotion Videos

Video compositions in `src/remotion/`, all 1920x1080 @ 30fps:

| Composition ID | Component | Duration | Scenes |
|----------------|-----------|----------|--------|
| `OnboardingVideo` | `OnboardingVideo.tsx` | 5940 frames (3m 18s) | 19 |
| `PitchVideo` | `pitch/PitchVideo.tsx` | 4635 frames (2m 35s) | 12 |
| `Tutorial-Recetas` | `tutorials/RecipesTutorial.tsx` | 2025 frames (~67s) | 8 |
| `Tutorial-Eventos` | `tutorials/EventsTutorial.tsx` | 1170 frames (~39s) | 5 |
| `Tutorial-Compras` | `tutorials/ProcurementTutorial.tsx` | 1170 frames (~39s) | 5 |
| `Tutorial-Inventario` | `tutorials/InventoryTutorial.tsx` | 1170 frames (~39s) | 5 |
| `Tutorial-Etiquetado` | `tutorials/LabelingTutorial.tsx` | 1170 frames (~39s) | 5 |
| `Tutorial-Prevision` | `tutorials/ForecastTutorial.tsx` | 885 frames (~30s) | 4 |

Shared building blocks: `TutorialIntro`, `TutorialStep`, `TutorialOutro` for tutorials; `scenes/` directory with 19 onboarding scenes + `helpers.tsx`.

---

## Design System: Stitch Matte Kitchen

Dark-first, anti-gloss, instrument-grade design. Full reference in `docs/STITCH-DESIGN-REFERENCE.md`.

### Color Tokens

| Token | Hex |
|-------|-----|
| Surface (bg) | `#0A0A0A` |
| Sidebar | `#111111` |
| Cards | `#1A1A1A` |
| Interactive | `#2A2A2A` |
| Modals | `#353534` |
| Primary accent | `#B8906F` (bronze) |
| Text primary | `#E5E2E1` |
| Text secondary | `#A78B7D` |
| Ghost border | `#584237` at 15% opacity |

### Chart Palette (from `src/lib/chart-config.ts`)

| Name | Hex | Usage |
|------|-----|-------|
| Blue | `#378ADD` | KPIs, primary series |
| Green | `#1D9E75` | Stock ok, profit, success |
| Orange | `#D85A30` | Moderate warnings |
| Amber | `#BA7517` | Attention required |
| Red | `#E24B4A` | Critical alerts, errors |
| Gray | `#888780` | Secondary text, neutral |

### Design Rules

- No borders — tonal shift only
- No shadows — value-based elevation
- No gradients — matte surfaces only
- No pure white — use `#E5E2E1`
- No dividers — spacing gaps
- KPIs: 4px left accent bar (orange/green/red)
- Corner radius: `sm` (0.125rem) or none
- Labels: 0.6875rem, ALL CAPS, tracking +0.05em
- Font: Inter

---

## Data Layer

### Supabase (optional)

- Client in `src/lib/db/`
- Auth via `@supabase/ssr`
- RPC calls for mutations
- When absent, all hooks fall back to mock data (`src/lib/mock-data.ts`)

### Mock Fallback Pattern

```typescript
if (!hotelId && isDev) {
  return mockData;  // In-memory, no persistence
}
return supabase.rpc("procedure", data);
```

### State Machines

- **Events**: `features/events/event-fsm.ts`
- **Purchase Orders**: `features/procurement/po-fsm.ts`
- Valid transitions defined via typed FSM patterns

---

## RBAC

8 roles defined in `src/lib/rbac.ts`:

| Role | Access Level |
|------|-------------|
| `superadmin` / `admin` | Full access |
| `direction` | Everything except delete recipes |
| `head_chef` | Recipes, inventory, staff, catalog |
| `cook` | Create/edit recipes, waste |
| `commercial` | Events, clients |
| `procurement` | Orders, catalog |
| `room` | Edit events, clients |
| `reception` | Read-only |

Dev mode bypasses auth with role = ADMIN (`NEXT_PUBLIC_SKIP_AUTH=true`).

---

## Key Dependencies

| Category | Package | Version |
|----------|---------|---------|
| Framework | next | 16.1.7 |
| UI | react / react-dom | 19.2.3 |
| Components | shadcn (v4) | 4.0.8 |
| CSS | tailwindcss | v4 |
| Backend | @supabase/supabase-js | 2.99.2 |
| Data | @tanstack/react-query | 5.90.21 |
| Forms | react-hook-form + zod | 7.71 / 4.3.6 |
| Charts | recharts | 3.8.0 |
| Videos | remotion + @remotion/transitions | 4.0.436 |
| Labeling | react-barcode, qrcode.react, react-to-print | 1.6.1 / 4.2.0 / 3.3.0 |
| Dates | date-fns | 4.1.0 |
| Icons | lucide-react | 0.577.0 |
| Tests | vitest, @playwright/test | 4.1.0 / 1.49.0 |
