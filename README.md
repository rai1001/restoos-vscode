# ChefOS

Integrated kitchen management platform for hotel F&B operations. Covers recipes, escandallos, events, procurement, inventory, labeling/traceability, APPCC, menu engineering, forecasting, operations, reporting, and a built-in feedback system — all from one dashboard.

**Stack:** Next.js 16 | React 19 | TypeScript 5 | Supabase | TanStack Query | Tailwind v4 | shadcn/ui | Recharts | Remotion | Vitest | Playwright

**Design system:** Stitch Matte Kitchen — dark-first, anti-gloss, instrument-grade UI (`#0A0A0A` surface, `#F97316` accent, Inter font).

---

## Arranque rapido

```bash
git clone <repo-url> chefos && cd chefos
cp .env.example .env.local
npm install
npm run dev
```

Abre `http://localhost:3000`. Sin Supabase, la app carga datos mock con rol ADMIN.

---

## Requisitos

| Herramienta | Version minima |
|-------------|---------------|
| Node.js     | 20.x          |
| npm         | 10.x          |

Supabase, Mistral, and Gemini are optional. The app runs fully on mock data without them.

---

## Variables de entorno

| Variable | Descripcion | Obligatoria |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | No* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave publica Supabase | No* |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave servicio (server-side) | No* |
| `MISTRAL_API_KEY` | Mistral Vision para OCR recetas/albaranes | No |
| `GEMINI_API_KEY` | Gemini para briefings AI | No |
| `RESEND_API_KEY` | Resend para emails | No |
| `NEXT_PUBLIC_SKIP_AUTH` | Bypass auth in dev (`true`) | No |

*Without Supabase everything works with in-memory mock data (does not persist across reloads).

---

## Scripts

```bash
npm run dev              # Dev server
npm run build            # Production build
npm start                # Start production build
npm run lint             # ESLint
npx vitest run           # 149 unit tests (~2s)
npx playwright test      # E2E tests
npm run remotion:studio  # Remotion Studio (video editor)
npm run remotion:render  # Render onboarding video to out/
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (dashboard)/              # 46 pages across 21 modules
│   │   ├── events/               # Calendar, detail, wizard production
│   │   ├── recipes/              # List, create, detail, escandallo, scaling
│   │   ├── menu-engineering/     # Boston matrix, KPIs, recommendations
│   │   ├── escandallo/           # Dynamic recipe costing
│   │   ├── procurement/          # Orders, requests, auto-suggestions
│   │   ├── inventory/            # Stock, lots, movements
│   │   ├── operations/           # Kanban, workflows, mise en place
│   │   ├── catalog/              # Products, categories, units, suppliers
│   │   ├── forecasting/          # 14-day demand forecast
│   │   ├── appcc/                # Food safety records
│   │   ├── staffing/             # Personnel and shifts
│   │   ├── automations/          # Jobs, dead-letter, integrations
│   │   ├── reports/              # Food cost, purchases, profitability, waste
│   │   ├── clients/              # Client management
│   │   ├── menus/                # Menus, sections, engineering view
│   │   ├── labeling/             # Prep labels + traceability inventory
│   │   ├── reservations/         # Reservation calendar (day/week/list)
│   │   ├── my-tickets/           # User's feedback tickets
│   │   ├── admin/tickets/        # Admin ticket management
│   │   └── settings/             # Hotel config, team
│   ├── api/
│   │   ├── briefing/             # POST — AI briefing (Gemini)
│   │   ├── ocr-albaran/          # POST — delivery note OCR (Mistral Vision)
│   │   ├── ocr-recipe/           # POST — recipe OCR (Mistral Vision)
│   │   └── notify-ticket/        # POST — ticket email notifications (Resend)
│   └── (auth)/login/
├── components/                   # Shared components (shadcn/ui + custom)
├── contracts/enums.ts            # Canonical enums (states, roles, types)
├── features/                     # Business modules (hooks, schemas, components)
│   ├── recipes/                  # Recipes
│   ├── events/                   # Events + production wizard
│   ├── procurement/              # Procurement + PO FSM
│   ├── catalog/                  # Catalog + allergens + aliases
│   ├── inventory/                # Inventory + waste + stock reservations
│   ├── menu-engineering/         # Menu engineering
│   ├── operations/               # Operations
│   ├── escandallo/               # Escandallo
│   ├── labeling/                 # Labeling — prep batches, label form, preview, alerts
│   ├── feedback/                 # Feedback — tickets (bug/design/feature), admin panel
│   ├── reservations/             # Reservations — calendar views, dialog
│   ├── dashboard/                # Dashboard — briefing widget, mock data
│   └── ...                       # reporting, staffing, automations, appcc
├── hooks/                        # use-role, use-voice-input
├── lib/
│   ├── calculations/             # 6 pure calculation engines
│   │   ├── costEngine.ts         # Recipe costing, sub-recipes, waste, allergens
│   │   ├── demandEngine.ts       # Menu explosion → ingredient demand
│   │   ├── procurementEngine.ts  # Demand vs stock, MOQ, urgency
│   │   ├── marginEngine.ts       # PVP by channel, Boston matrix, price impact
│   │   ├── scalingEngine.ts      # Recipe scaling, shopping list
│   │   ├── forecastEngine.ts     # 14-day forecast with seasonality
│   │   ├── types.ts              # Shared types
│   │   └── __tests__/            # 149 unit tests
│   ├── chart-config.ts           # Chart palette, theme, formatters (Recharts)
│   ├── mock-data.ts              # Complete mock dataset
│   ├── product-matcher.ts        # Fuzzy matching ingredients → catalog
│   ├── voice-parser.ts           # Voice parser
│   ├── rbac.ts                   # Role-based permissions
│   └── db/                       # Supabase client
├── remotion/                     # Remotion video compositions
│   ├── OnboardingVideo.tsx       # 19-scene onboarding (3m 18s)
│   ├── pitch/                    # 12-scene investor pitch (2m 35s)
│   ├── tutorials/                # 6 module tutorials (30–67s each)
│   │   ├── RecipesTutorial.tsx
│   │   ├── EventsTutorial.tsx
│   │   ├── ProcurementTutorial.tsx
│   │   ├── InventoryTutorial.tsx
│   │   ├── LabelingTutorial.tsx
│   │   └── ForecastTutorial.tsx
│   ├── scenes/                   # Shared onboarding scenes (19 scenes)
│   └── Root.tsx                  # Remotion entry — all compositions
└── types/                        # Global types
```

---

## Motores de calculo

6 engines in `src/lib/calculations/`. Pure functions — no side effects, no DB, no AI. Accept typed data, return deterministic results.

### costEngine

```typescript
import { calculateRecipeCost, calculateSuggestedPvp, collectAllergens } from "@/lib/calculations";

const result = calculateRecipeCost(recipe, recipes, products, catalog, config);
// → { total_cost, cost_per_serving, food_cost_pct, suggested_pvp, margin_gross, allergens, lines }
```

| Funcion | Parametros | Retorno |
|---------|-----------|---------|
| `calculateRecipeCost` | `recipe: RecipeCalc, recipes: RecipeMap, products: ProductMap, catalog: CatalogMap, config: PricingConfig` | `RecipeCostResult` |
| `calculateSuggestedPvp` | `costPerServing: number, targetFoodCostPct: number, commercialRounding: number` | `number` |
| `collectAllergens` | `result: RecipeCostResult, products: ProductMap` | `AllergenCode[]` |

### demandEngine

```typescript
const demandLines = calculateDemand(events, forecasts, recipes, products);
// → DemandLine[] { product_id, total_qty_needed, breakdown }
```

### procurementEngine

```typescript
const suggestions = generatePurchaseSuggestions(demand, stock, catalog);
// → PurchaseSuggestion[] { product_id, qty_to_order, supplier, estimated_cost, urgency }
```

### marginEngine

```typescript
// PVP por canal con comisiones
const pricing = calculatePricingByChannel(costPerServing, config);
// → PricingRecommendation[] { channel, pvp_recommended, effective_margin_pct }

// Boston matrix
const analysis = analyzeMenu(dishes);
// → MenuEngineeringItem[] { category: "star"|"workhorse"|"puzzle"|"dog", recommendation }

// Impacto cambio de precio
const impact = calculatePriceImpact(recipes, ingredientId, oldPrice, newPrice, target);
```

### scalingEngine

```typescript
const scaled = scaleRecipe(4, 80, ingredients, catalog);
// → { scale_factor: 20, lines, total_cost, cost_per_serving }

const list = generateShoppingList(scaled, catalog, ingredients);
// → ShoppingListItem[] { product_name, qty_needed, qty_to_order, packs, supplier, estimated_cost }
```

### forecastEngine

```typescript
const { daily, summary } = generateForecast(history, events, stock, 14);
// daily  → DailyForecast[] (demanda por producto por dia, estacionalidad, eventos)
// summary → ForecastSummary[] (deficit, urgency: critical|warning|ok, suggested_order_qty)
```

---

## API Routes

### POST `/api/ocr-recipe`

Extracts recipe data from an image via Mistral Vision.

**Request:** `multipart/form-data` with `file` field (JPG/PNG).

**Response 200:**
```json
{
  "name": "Risotto de setas silvestres",
  "category": "principal",
  "servings": 4,
  "ingredients": [
    { "name": "Arroz arborio", "quantity": 320, "unit": "g" }
  ],
  "steps": [
    { "instruction": "Rehogar la cebolla...", "duration_min": 5 }
  ]
}
```

Without `MISTRAL_API_KEY` returns mock data.

### POST `/api/ocr-albaran`

Extracts delivery note data. Same mechanism as recipe OCR.

### POST `/api/briefing`

Generates operational briefing with AI (Gemini). Requires `GEMINI_API_KEY`.

### POST `/api/notify-ticket`

Sends email notifications for feedback tickets via Resend. Requires `RESEND_API_KEY`.

---

## Tests

```bash
# All unit tests
npx vitest run

# Watch mode
npx vitest

# Specific engine
npx vitest run src/lib/calculations/__tests__/costEngine.test.ts

# E2E (requires running server)
npx playwright test
```

| Suite | Tests | Cobertura |
|-------|-------|-----------|
| costEngine | 24 | Costeo, sub-recetas, waste, alergenos, PVP |
| demandEngine | 10 | Explosion menus, agregacion, pax |
| procurementEngine | 21 | MOQ, packs, urgencia, proveedores |
| marginEngine | 27 | PVP canal, Boston matrix, price impact |
| scalingEngine | 14 | Escalado, lista compra |
| forecastEngine | 13 | Prevision, estacionalidad, eventos |
| product-matcher | 11 | Fuzzy matching, acentos, articulos |
| voice-parser | 15 | Parsing voz recetas e ingredientes |
| **Total** | **149** | |

---

## Labeling (Etiquetado)

Traceability-first labeling system in `src/features/labeling/` with 2 pages (`labeling/` + `labeling/inventory/`).

- **Label generator**: Create prep labels with batch ID, product, elaboration/expiry dates, operator, allergens, QR code, and barcode.
- **Inventory view**: Track all active prep batches with expiry status (ok/warning/expired), filterable by status/product/date.
- **Alert widget**: Dashboard widget showing batches nearing expiry.
- **Print support**: Labels printable via `react-to-print` with barcode (`react-barcode`) and QR (`qrcode.react`).

---

## Feedback System

Built-in ticket system in `src/features/feedback/` with 2 pages (`my-tickets/` + `admin/tickets/`).

- **Ticket types**: bug, design, feature, other.
- **Ticket statuses**: open, in_progress, resolved, needs_info.
- **Priority levels**: low, medium, high.
- **Floating button**: `FeedbackButton` component injected in the dashboard layout for quick ticket creation.
- **Email notifications**: `/api/notify-ticket` sends emails via Resend when tickets are created or updated.
- **Admin panel**: Full ticket management at `/admin/tickets` with filtering and status transitions.

---

## Remotion Videos

Video compositions in `src/remotion/`, rendered at 1920x1080 @ 30fps.

| Composition | Duration | Scenes | Description |
|-------------|----------|--------|-------------|
| `OnboardingVideo` | 3m 18s (5940 frames) | 19 | Full product walkthrough for new hotel staff |
| `PitchVideo` | 2m 35s (4635 frames) | 12 | Investor/sales pitch (problem → solution → features → CTA) |
| `Tutorial-Recetas` | ~67s (2025 frames) | 8 | Recipe creation, costing, tech sheet |
| `Tutorial-Eventos` | ~39s (1170 frames) | 5 | Event setup, menu assignment, production |
| `Tutorial-Compras` | ~39s (1170 frames) | 5 | Purchase flow, suggestions, order tracking |
| `Tutorial-Inventario` | ~39s (1170 frames) | 5 | Stock management, lots, waste recording |
| `Tutorial-Etiquetado` | ~39s (1170 frames) | 5 | Label creation, expiry tracking, alerts |
| `Tutorial-Prevision` | ~30s (885 frames) | 4 | Demand forecasting, seasonality, alerts |

```bash
npm run remotion:studio   # Open Remotion Studio
npm run remotion:render   # Render OnboardingVideo → out/onboarding.mp4
```

---

## Chart Config

Centralized chart configuration in `src/lib/chart-config.ts`. Used across dashboard, reports, inventory, and menu engineering pages.

- **Palette**: `blue (#378ADD)`, `green (#1D9E75)`, `orange (#D85A30)`, `amber (#BA7517)`, `red (#E24B4A)`, `gray (#888780)`.
- **Theme**: Dark/light mode support with transparent backgrounds, tonal grid lines.
- **Formatters**: `formatCurrency`, `formatPercent`, `formatUnits`, `formatKg`.
- **Threshold helpers**: `getFoodCostColor`, `getMarginColor`, `getStockColor` — return semantic colors based on value ranges.

---

## Stitch Matte Kitchen Design System

Design direction documented in `docs/STITCH-DESIGN-REFERENCE.md`. Key tokens:

| Token | Value |
|-------|-------|
| Surface | `#0A0A0A` |
| Sidebar | `#111111` |
| Cards | `#1A1A1A` |
| Interactive | `#2A2A2A` |
| Primary accent | `#F97316` |
| Text primary | `#E5E2E1` |
| Text secondary | `#A78B7D` |
| Font | Inter |

**Rules**: No borders (tonal shift), no shadows, no gradients, no pure white, no dividers (spacing gaps). KPIs use 4px left accent bar.

---

## RBAC

| Rol | Permisos clave |
|-----|---------------|
| `superadmin` / `admin` | Full access |
| `direction` | Everything except delete recipes |
| `head_chef` | Recipes, inventory, staff, catalog |
| `cook` | Create/edit recipes, waste |
| `commercial` | Events, clients |
| `procurement` | Orders, catalog |
| `room` | Edit events, clients |
| `reception` | Read-only |

In dev mode, role = ADMIN automatically.

---

## Patrones

### Mock fallback

Hooks detect if Supabase is available. Without a connection, they return mock data:

```typescript
if (!hotelId && isDev) {
  return { recipe_id: crypto.randomUUID() }; // mock
}
return supabase.rpc("create_recipe", data);   // real
```

### Pure functions

All 6 engines are pure functions (no side effects). Enables deterministic testing, server/client reuse, and composition (demandEngine feeds procurementEngine).

### State machines (FSM)

Events, purchase orders, and recipes follow finite state machines with valid transitions defined in `contracts/enums.ts` and feature-level FSMs (`event-fsm.ts`, `po-fsm.ts`).

---

## Full Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js | 16.1.7 |
| UI | React | 19.2.3 |
| Language | TypeScript (strict) | 5.x |
| CSS | Tailwind CSS | v4 |
| Components | shadcn/ui | v4 |
| Backend | Supabase | 2.99.2 |
| Data fetching | TanStack Query | 5.90.21 |
| Forms | React Hook Form + Zod | 7.71 / 4.3.6 |
| Charts | Recharts | 3.8.0 |
| Videos | Remotion | 4.0.436 |
| Icons | Lucide React | 0.577.0 |
| Toasts | Sonner | 2.0.7 |
| Barcode | react-barcode | 1.6.1 |
| QR Code | qrcode.react | 4.2.0 |
| Print | react-to-print | 3.3.0 |
| OCR | Mistral Vision | API |
| AI Briefing | Google Gemini | API |
| Email | Resend | API |
| Tests unit | Vitest | 4.1.0 |
| Tests E2E | Playwright | 1.49.0 |
| Excel | read-excel-file | 7.0.2 |
| Dates | date-fns | 4.1.0 |
