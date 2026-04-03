# RestoOS

SaaS de gestion operativa para grupos de restauracion multi-local. Control centralizado por grupo + operativa independiente por local + cocina central (obrador).

**Stack:** Next.js 16 · React 19 · TypeScript 5 · Supabase (PostgreSQL + RLS + Auth) · TanStack Query · Tailwind v4 · shadcn/ui · Recharts · Vitest

**Design system:** Calm Darkness — dark-first (`#090909` surface, `#B8906F` bronze accent).

---

## Arranque rapido

```bash
git clone <repo-url> restoos && cd restoos
cp .env.example .env.local          # editar con claves de supabase status
npm install
npx supabase start                  # PostgreSQL + Auth local
npx supabase db reset               # aplicar 30 migraciones
npm run dev                         # http://localhost:3000
```

### Cargar datos demo (Grupo Culuca — 4 locales)

```bash
# 1. Crear usuario demo
curl -X POST http://127.0.0.1:54321/auth/v1/admin/users \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"id":"cc000000-0000-0000-0000-000000000001","email":"chisco@culuca.com","password":"culuca2026","email_confirm":true}'

# 2. Cargar seeds
docker exec -i supabase_db_chefos psql -U postgres -d postgres < supabase/seeds/culuca_demo.sql
docker exec -i supabase_db_chefos psql -U postgres -d postgres < supabase/seeds/chisco_multilocal.sql
docker exec -i supabase_db_chefos psql -U postgres -d postgres < supabase/seeds/appcc_templates.sql

# 3. Crear membership
docker exec supabase_db_chefos psql -U postgres -d postgres -c \
  "INSERT INTO memberships (user_id, hotel_id, tenant_id, role, is_active, is_default)
   VALUES ('cc000000-0000-0000-0000-000000000001','bb000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001','direction',true,true)
   ON CONFLICT DO NOTHING;"
```

**Login:** `chisco@culuca.com` / `culuca2026` (rol: direction en 4 locales)

---

## Datos demo

| Entidad | Cantidad | Detalle |
|---------|----------|---------|
| Tenant | 1 | Grupo Culuca |
| Hotels | 4 | Culuca Cocina-Bar, Taberna da Galera, Taberna da Tabacalera, Culuca Obrador |
| Productos | 71 | Basados en cartas reales de los 3 restaurantes + obrador |
| Recetas | 24 | 9 Culuca + 6 Galera + 6 Tabacalera + 3 Obrador |
| Proveedores | 15 | Pescaderia O Porto, Carniceria Rial, Distribuciones Gallaecia, Lacteos do Campo |
| Supplier offers | 19 | Con diferencias de precio entre locales (el dolor) |
| APPCC templates | 40 | 16 Culuca + 8 Galera + 9 Tabacalera + 7 Obrador |

---

## Arquitectura multi-tenant

```
Tenant (grupo) → Hotels (locales)
                  ├── Culuca Cocina-Bar (restaurante)
                  ├── Taberna da Galera (tapeo + fusion)
                  ├── Taberna da Tabacalera (asador brasa)
                  └── Culuca Obrador (cocina central)
```

- **RLS** en todas las tablas por `hotel_id`
- Helper functions `has_hotel_access()` / `has_hotel_role()` (SECURITY DEFINER) evitan recursion en policies
- `has_tenant_access()` para queries cross-hotel (vista multi-local)
- 9 roles: superadmin, admin, direction, head_chef, cook, commercial, procurement, room, reception
- Permisos RBAC en `/src/lib/rbac/index.ts` (15 acciones incluyendo APPCC)

---

## Modulos

| Modulo | Tablas | Estado | Paginas |
|--------|--------|--------|---------|
| Identidad (M0) | tenants, hotels, profiles, memberships, audit_logs, domain_events | Completo | /login, /settings/team |
| Catalogo (M3) | categories, units, products, suppliers, supplier_offers, product_aliases | Completo | /catalog/* |
| Comercial (M1) | clients, restaurant_tables, turns, reservations | Completo | /reservations, /clients |
| Recetas (M2) | recipes, recipe_ingredients, recipe_steps, recipe_versions, menus, menu_sections, menu_section_recipes | Completo | /recipes/*, /menus/*, /escandallo, /menu-engineering |
| Compras (M4) | purchase_requests/lines, purchase_orders/lines, goods_receipts/lines | Completo | /procurement/* |
| Inventario (M5) | stock_lots, stock_movements | Completo | /inventory/* |
| Direccion (M7) | kpi_snapshots, alerts, alert_rules | Completo | /, /multi-local |
| APPCC (M8) | check_templates, check_records, appcc_daily_closures, appcc_incidents | Completo | /appcc, /kitchen-mode |
| Etiquetado (M9) | prep_batches, prep_alerts | Completo | /labeling/* |
| Feedback (M10) | feedback_tickets | Completo | /my-tickets, /admin/tickets |

---

## Migraciones (30)

```
00000000000000  base_functions
00000000000001  base0_identity (tenants, hotels, profiles, memberships, audit, events)
00000000000002  base0_rpcs (get_active_hotel, switch, invite, roles)
00000000000003  m3_catalog (products, suppliers, categories, units, offers, aliases)
00000000000004  m3_rpcs (upsert, search, match_alias, preferred_offer)
00000000000005  m1_commercial (clients, tables, turns, reservations)
00000000000006  m1_rpcs (event lifecycle, calendar)
00000000000007  m2_recipes (recipes, ingredients, steps, versions, menus)
00000000000008  m2_rpcs (create/approve/cost/tech_sheet, menu cost)
00000000000011  m4_procurement (requests, orders, receipts)
00000000000012  m5_inventory (stock_lots FIFO, stock_movements ledger)
00000000000013  m4m5_rpcs (purchase flow, receive_goods, record_waste, stock_levels)
00000000000016  m7_direction (kpi_snapshots, alerts, alert_rules)
00000000000017  m7_rpcs (dashboard, snapshots, alert thresholds)
00000000000018  m9_labeling (prep_batches, prep_alerts)
00000000000019  m10_feedback (feedback_tickets)
00000000000020  m8_appcc (check_templates, check_records, closures, incidents + RLS helpers)
00000000000021  m8_appcc_rpcs (create_check_record, validate_closure, summaries, resolve_incident)
00000000000022  fix_rls_recursion (63 policies reescritas con helper functions)
00000000000023  multilocal_rpcs (get_tenant_overview, get_price_comparisons)
00000000000024  hotels_type_and_transfers
00000000000025  transfer_rpcs
00000000000026  reservations_staffing_sales_aliases (extend reservations + product_aliases + staff + sales_data)
00000000000027  agent_infrastructure (agent_logs, invoice_discrepancies, menu_engineering_reports, purchase_suggestions)
00000000000028  receipt_incidents
00000000000029  price_history
00000000000030  clara_agent (facturas_recibidas, lineas_factura, discrepancias_clara, documentos_faltantes, clara_retry_queue)
```

---

## API Endpoints (7)

Todos requieren autenticacion via `requireAuth()`.

| Endpoint | Metodo | Integracion |
|----------|--------|-------------|
| `/api/briefing` | POST | Gemini AI (fallback mock) |
| `/api/chat` | POST | 6 motores de calculo |
| `/api/digest` | POST | Resend email |
| `/api/notify-ticket` | POST | Resend email |
| `/api/ocr-albaran` | POST | Mistral Vision |
| `/api/ocr-recipe` | POST | Mistral Vision |
| `/api/export` | POST | Local |

---

## Motores de calculo (6)

Pure functions en `/src/lib/calculations/`. Sin side effects, sin DB, sin AI.

| Motor | Funcion |
|-------|---------|
| costEngine | Coste receta con sub-recetas, yield/merma, alergenos |
| demandEngine | Agregacion forecast + reservas → demanda por producto |
| forecastEngine | DOW + estacionalidad mensual + eventos confirmados |
| marginEngine | Food cost %, margen bruto, Boston matrix |
| procurementEngine | Forecast + stock + lead time → cantidad a comprar |
| scalingEngine | Receta x factor → nuevas cantidades |

---

## Variables de entorno

| Variable | Descripcion | Obligatoria |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | Si |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave publica | Si |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave servicio | Si |
| `MISTRAL_API_KEY` | OCR recetas/albaranes | No |
| `GEMINI_API_KEY` | Briefings AI + agentes (OCR, CLARA, menu-engineering) | No |
| `RESEND_API_KEY` | Emails | No |
| `SKIP_AUTH` | Bypass auth en dev | No (solo dev) |

---

## Scripts

```bash
npm run dev                           # Dev server (http://localhost:3000)
npm run build                         # Build produccion
npx vitest run                        # Tests unitarios
npx playwright test                   # Tests e2e
npx tsc --noEmit                      # Type check
npx tsx scripts/test-agents.ts        # Tests 5 agentes IA
npx tsx scripts/test-clara.ts         # Tests CLARA (6 escenarios)
npx tsx scripts/test-clara-real.ts    # Test CLARA con factura real PNG
```

---

## Agentes IA (6 Supabase Edge Functions + Gemini 2.0 Flash)

Todos en `supabase/functions/`. Logica de negocio pura en `_shared/`, adaptadores finos en `agent-*/` y `clara-*/`.

| Agente | Funcion | Trigger |
|--------|---------|---------|
| agent-escandallo | Recalcula costes receta cuando cambian precios | Cambio de precio producto |
| agent-menu-engineering | Matriz BCG semanal con recomendaciones Gemini | Semanal |
| agent-ocr | OCR facturas con Gemini Vision + validacion NIF | Subida de imagen |
| agent-appcc | Cierre diario APPCC con SHA-256 + anomalias | Diario |
| agent-inventario | Stock FIFO + sugerencias compra por proveedor | Venta registrada |
| **clara-agent** | **Pipeline completo: email/doc -> OCR -> conciliacion albaranes -> redaccion incidencias** | **Email o subida documento** |

**CLARA** (agente #6) coordina 4 modulos: `clara-collector` (clasificacion email), `clara-ocr` (extraccion Gemini Vision), `clara-reconciler` (cruce con albaranes +-7 dias, tolerancia 2% precio), `clara-messenger` (redaccion profesional para proveedores).

Coste medido: $0.0007/factura, $0.07/mes para 100 facturas.

```bash
# Test agentes
npx supabase functions serve --env-file .env.local
npx tsx scripts/test-agents.ts        # 5 agentes originales
npx tsx scripts/test-clara.ts         # 6 tests CLARA
npx tsx scripts/test-clara-real.ts    # Test con factura real PNG
```

---

## Flujo e2e verificado

El siguiente recorrido funciona contra Supabase real sin mocks:

1. Login con credenciales reales
2. Ver 4 locales del grupo
3. Crear producto en catalogo
4. Crear receta con ingredientes
5. Calcular escandallo (coste por porcion)
6. Registrar control APPCC (auto-status segun limites)
7. Crear y enviar pedido de compra
8. Recibir mercancia (lotes FIFO + movimientos)
9. Ver niveles de stock
10. Registrar merma (descuenta de lote)
11. Revisar dashboard (KPIs en vivo)
12. Cambiar a otro local del grupo
