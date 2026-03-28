# ChefOS — Master Task List

## Snapshot: 2026-03-17
**Overall Progress**: ~75% toward v1 production
**TypeScript**: 0 errors | **Build**: OK | **Tests**: Vitest unit + Playwright E2E configured
**Supabase**: Mock data (cloud connection pending)
**Stack**: Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · shadcn/ui (base-ui) · React Hook Form · Zod v4 · TanStack Query · Supabase · PostgreSQL

---

## ✅ Completed Modules

### UI & UX
- [x] Dark mode (next-themes, ThemeToggle in sidebar)
- [x] TableSkeleton + EmptyState on all 12 list pages
- [x] Synthetic mock data on all pages (dev fallback when no Supabase)
- [x] Events calendar: monthly/weekly/list views, color-coded pills

### New Modules (from competitor analysis)
- [x] APPCC/HACCP digital module: 8 templates, daily records, 7-day history chart
- [x] Menu engineering matrix: Boston 2x2 (estrella/vaca/enigma/perro)
- [x] Staff/shifts planning per event: roster, weekly Gantt, assign dialog
- [x] Escandallo dinámico: ingredient cost breakdown, yield, price alerts
- [x] Executive dashboard: KPI cards, revenue/food-cost charts, alerts panel

### Security & Workflows
- [x] RBAC RoleGate: 19 permissions, 6 roles (admin/jefe_cocina/cocinero/maitre/compras/viewer)
- [x] Event FSM: pendiente→confirmado→en_preparacion→completado/cancelado + status bar
- [x] PO FSM: borrador→enviada→recibida/cancelada + POStatusBadge + POStatusActions
- [x] AlertDialog component (state-controlled, base-ui compatible)

### Inventory
- [x] Waste recording form (WasteRecordForm): product, quantity, reason, cost calculation
- [x] Stock reservations view grouped by event with status badges

### Catalog
- [x] AllergenEditor: 14 EU allergens (Reg. 1169/2011), interactive toggle grid
- [x] ProductAliases: per-supplier aliases with reference codes
- [x] Product detail Sheet: opens on row click, shows allergens + aliases

### Voice Input (G2 sprint)
- [x] useVoiceInput hook: Web Speech API, es-ES, interim results
- [x] VoiceMicButton component: animated mic, pulsing when listening
- [x] voice-parser.ts: Spanish NLP for recipes, ingredients, inventory
- [x] Voice in new recipe form: auto-fills name, category, servings, times
- [x] Voice in escandallo: dictate ingredient "300 gramos de harina"
- [x] Voice in waste record form: dictate "2 kilos de ternera por caducidad"

### Tests & CI
- [x] Vitest unit tests configured
- [x] Playwright E2E: auth, navigation, dashboard, recipes, events specs
- [x] GitHub Actions CI: typecheck + build + vitest + playwright (4 jobs)

---

## 🔄 Sprint G2 — PWA + Tablet + Realtime [IN PROGRESS]

- [ ] **G2.1** PWA manifest + service worker + offline cache (next-pwa or custom)
- [ ] **G2.2** Tablet UX: collapsible sidebar, FAB button, swipe actions on mobile
- [ ] **G2.3** Supabase Realtime: Kanban tasks + Alerts live updates

---

## 📋 Sprint G3 — AI & Automation [PLANNED]

- [ ] **G3.1** OCR albaranes: photo → data (Mistral Vision API)
  - Edge function: POST /api/ocr-albaran
  - UI: drag & drop photo in PO receipt dialog
  - Auto-fill: supplier, products, quantities, prices
- [ ] **G3.2** Briefing diario IA (Gemini): generates daily kitchen summary
  - Today's events, pending tasks, expiring stock, alerts
  - Sent at 7am or on-demand from dashboard
- [ ] **G3.3** Email notifications (Resend)
  - Event confirmation → client email
  - PO sent → supplier email
  - Low stock alert → jefe_cocina email
- [ ] **G3.4** Webhook dispatcher (Make/n8n integration)

---

## 📊 Sprint G4 — Business Intelligence [PLANNED]

- [ ] **G4.1** Reports PDF/CSV
  - Food cost report (by period, by event, by recipe)
  - Purchase report (by supplier, by category)
  - Profitability report (revenue vs cost per event)
  - Waste report (by reason, by product)
- [ ] **G4.2** Forecasting engine
  - Demand prediction from historical events
  - Auto-generate purchase requests
- [ ] **G4.3** Price tracking with alerts
  - Track supplier price changes
  - Alert when price increases >10%
  - Update escandallo costs automatically
- [ ] **G4.4** Command palette ⌘K
  - Search recipes, events, products, suppliers
  - Quick actions: new recipe, new event, new PO
  - Keyboard shortcut: Cmd+K / Ctrl+K
- [ ] **G4.5** Multi-hotel dashboard
  - Compare KPIs across hotels
  - Consolidated food cost view

---

## 🚀 Sprint G5 — Deploy & Production [PLANNED]

- [ ] **G5.1** Supabase Cloud connection
  - Apply all migrations to cloud
  - Run seed data
  - Configure .env.local with cloud keys
- [ ] **G5.2** Vercel deploy
  - Configure Vercel project
  - Set environment variables
  - Deploy and verify on public URL
- [ ] **G5.3** Custom domain
- [ ] **G5.4** Error monitoring (Sentry)
- [ ] **G5.5** Analytics (Vercel Analytics)

---

## 🏗️ Sprint G6 — Enterprise [FUTURE]

- [ ] i18n (English + French)
- [ ] ERP integration (SAP/Navision)
- [ ] Marketplace (recipe templates between hotels)
- [ ] Mobile app (React Native / Expo)

---

## Work Rules

1. **Database-first**: Transactional logic in RPC/SQL
2. **Audit everywhere**: Every mutation in `audit_logs`
3. **Reliability**: Every change in `lib/calculations` requires tests
4. **Mock-first**: All new features work with mock data first, Supabase second
5. **Order**: Schema → RPC → Validation → UI → Tests → Docs
6. **TypeScript**: 0 errors enforced on every commit
7. **Accessibility**: All interactive elements keyboard-navigable

---

## Architecture

```
src/
├── app/(dashboard)/     # Page routes
├── features/            # Feature modules (types, hooks, services, components)
│   ├── appcc/          # APPCC/HACCP
│   ├── catalog/        # Products, suppliers, categories, units
│   ├── dashboard/      # KPIs and executive dashboard
│   ├── escandallo/     # Dynamic cost breakdown
│   ├── events/         # Events + FSM + calendar
│   ├── inventory/      # Stock, lots, movements, waste
│   ├── menu-engineering/ # Boston matrix
│   ├── operations/     # Kanban, tasks, staff
│   ├── procurement/    # POs + FSM
│   ├── recipes/        # Recipes + ingredients
│   ├── reporting/      # PDF/CSV reports
│   └── staffing/       # Staff shifts per event
├── components/         # Shared UI components
│   ├── ui/            # shadcn/ui base components
│   ├── role-gate.tsx  # RBAC wrapper
│   ├── voice-mic-button.tsx  # Voice input button
│   └── ...
├── hooks/              # Shared hooks (useVoiceInput, useRole)
├── lib/               # Utilities (rbac, voice-parser, utils)
└── contracts/         # Enums and shared types
```
