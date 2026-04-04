# ChefOS — Changelog

> Historial completo de cambios para el equipo de desarrollo.
> Formato: [Tipo] Descripción | Archivos clave

---

## Sprint G5 - Agentes IA + CLARA + Security Hardening (2026-04-03)

### fix(security): complete auth hardening
Cierre completo de la auditoria de seguridad. Todas las edge functions y RPCs ahora verifican autenticacion y pertenencia al hotel antes de ejecutar.

**Auth guards en edge functions:**
- `verifyCallerHotelAccess()` en 11/11 edge functions (JWT + membership check)
- Previene IDOR: un usuario autenticado ya no puede acceder a datos de otro hotel

**RBAC en RPCs SQL:**
- `get_active_hotel`, `switch_hotel`: verifican `auth.uid() = p_user_id`
- `create_check_record`, `refresh_daily_closure`, `resolve_appcc_incident`: requieren `has_hotel_role`
- `get_appcc_daily_summaries`: requiere `has_hotel_access`
- `receive_goods`, `export_price_data_for_ml`: validacion de membership por rol
- `invite_member`, `change_member_role`: solo admin/superadmin pueden asignar admin
- `change_member_role`: bloquea self role change
- `REVOKE/GRANT` en todas las funciones: solo `authenticated` puede ejecutar

**CLARA reconciler mejorado:**
- Fuzzy matching para lineas OCR sin product_id (normaliza y compara descripciones)
- Nuevo enum `LineaSinConciliar` para lineas sin match (antes se ignoraban silenciosamente)

**Agent-inventario hardening:**
- FIFO stock deduction con optimistic concurrency (retry loop, max 3 intentos)
- Deduplicacion de alertas stock_low (no duplica si ya existe una activa)
- Purchase suggestions: upsert en vez de duplicar sugerencias pendientes
- Alerta `stock_shortage` cuando no hay stock suficiente

### fix(build): deploy a producción en Vercel
Primera puesta en producción de RestoOS.

- Proyecto Supabase `restoos` creado en eu-west-1
- Env vars configuradas en Vercel (production + development)
- Fix: placeholder Supabase URL para static export (pages pre-rendered at build time)
- Fix: lazy-init Supabase client en auth/service.ts (module-level → function-level)
- Fix: middleware tolerante a env vars faltantes durante build
- `.vercelignore` para excluir .agents/ del deploy (>100MB)
- URL producción: https://restoos-vscode-8sri.vercel.app/

### chore: code health cleanup (5.3 → 8.6/10)
Limpieza de calidad de codigo tras auditoria de seguridad.

- TypeScript: 10 errores → 0
- ESLint: 627 problemas → 5 warnings (excluido `.agents/` vendor)
- Tests: 186/186 pass (excluido `.agents/` de vitest, eliminados 71 false failures)
- Dead code: knip configurado, 91 → 21 unused files
- Herramientas: knip instalado, eslint/vitest/tsconfig configurados

---


### feat(agents): CLARA — agente de administracion financiera
Pipeline completo de gestion de facturas: recoge del email, extrae datos con OCR (Gemini Vision), concilia contra albaranes, y redacta incidencias para proveedores.

| Archivo | Descripcion |
|---------|-------------|
| `supabase/migrations/00000000000030_clara_agent.sql` | 5 tablas: facturas_recibidas, lineas_factura, discrepancias_clara, documentos_faltantes, clara_retry_queue |
| `supabase/functions/_shared/clara_types.ts` | Enums, interfaces BD, tipos Gemini, ClaraDeps inyectable |
| `supabase/functions/_shared/clara_prompts.ts` | 4 prompts Gemini (clasificacion, OCR, discrepancia, mensaje) |
| `supabase/functions/_shared/clara_utils.ts` | SHA-256, tokens, retry backoff, NIF validation, date parsing |
| `supabase/functions/_shared/clara_collector.ts` | Modulo 1: parsea email, clasifica adjuntos, sube a Storage |
| `supabase/functions/_shared/clara_ocr.ts` | Modulo 2: Gemini Vision, extraccion estructurada, validacion NIF |
| `supabase/functions/_shared/clara_reconciler.ts` | Modulo 3: cruza con goods_receipts, detecta discrepancias (+-2% precio, exacto cantidad) |
| `supabase/functions/_shared/clara_messenger.ts` | Modulo 4: redacta mensajes profesionales para proveedores |
| `supabase/functions/_shared/clara_agent.ts` | Orquestador runClara() — coordina 4 modulos secuencialmente |
| `supabase/functions/clara-*/index.ts` | 5 Edge Functions (adaptadores Supabase) |
| `scripts/test-clara.ts` | 6 tests automatizados |
| `scripts/test-clara-real.ts` | Test con factura real PNG |
| `scripts/generate-test-invoice.ts` | Genera factura espanola realista con Playwright |

**Arquitectura:** Logica pura en `_shared/clara_*.ts` (portable a VPS Node.js). Adaptadores finos en `clara-*/index.ts`.
**Coste medido:** $0.0007/factura (2.639 tokens in + 1.004 tokens out). $0.07/mes para 100 facturas.
**Tests:** 6/6 pass (factura correcta, precio incorrecto, cantidad incorrecta, sin albaran, baja calidad, no es factura).

### fix(migration): migracion 026 idempotente
Arreglado conflicto pre-existente donde `reservations` y `product_aliases` se intentaban recrear con schema diferente al original. Ahora usa `ALTER TABLE ADD COLUMN IF NOT EXISTS`.

---

## Sprint G4 - Stabilization pass (2026-03-31)

### fix: repo stabilization, strict TS, Next 16 proxy migration
Pasada de estabilizacion tecnica sobre el repo activo `C:\RestoOsvscode`.

| Archivo | Descripcion |
|---------|-------------|
| `src/components/command-palette.tsx` | Se quitan resets de estado desde effects y se simplifica cierre/reset |
| `src/components/theme-toggle.tsx` | Se reemplaza init por effect con `useSyncExternalStore` |
| `src/components/pwa-install-prompt.tsx` | Se mueve la deteccion inicial fuera de effect |
| `src/components/product-combobox.tsx` | Se elimina estado derivado sincronizado por effect |
| `src/lib/sidebar-context.tsx` | Se inicializa desde `localStorage` con lazy init |
| `src/lib/auth/hooks.ts` | Se endurece el manejo de cliente Supabase y loading state |
| `src/app/(dashboard)/inventory/lots/page.tsx` | Se elimina `Date.now()` desde render |
| `src/app/(dashboard)/menu-engineering/page.tsx` | Se extraen helpers para evitar componentes inline en render |
| `src/lib/rbac/module-access.ts` | Se corrige naming reservado |
| `src/lib/calculations/costEngine.ts` | Se elimina fallback inseguro con `any` |
| `src/lib/calculations/demandEngine.ts` | Se elimina fallback inseguro con `any` |
| `src/lib/calculations/__tests__/*.test.ts` | Se ajustan tests para `noUncheckedIndexedAccess` |
| `src/proxy.ts` | Nueva convencion de Next 16 en lugar de `src/middleware.ts` |
| `eslint.config.mjs` | Se retiran overrides temporales que ocultaban errores |

**Verificacion:** `npm run lint` OK sin errores, `npx tsc --noEmit` OK, `npm run build` OK, `npx vitest run` OK (`149/149`).
**Pendiente:** quedan warnings no bloqueantes por imports muertos, `img` sin `next/image` y un warning del compilador React en feedback.

---
## Sprint G3 — IA & Automatización (2026-03-17)

### ✨ OCR Albaranes (`feat: OCR albaranes — Mistral Vision`)
Escanea albaranes de proveedor con IA y auto-rellena órdenes de compra.

| Archivo | Descripción |
|---------|-------------|
| `src/app/api/ocr-albaran/route.ts` | Endpoint POST — Mistral pixtral-12b-2409, mock si no hay API key |
| `src/features/procurement/components/ocr-albaran-dialog.tsx` | Dialog drag&drop, preview imagen, tabla de resultados |
| `src/app/(dashboard)/procurement/orders/page.tsx` | Botón "OCR Albarán" añadido al header |

**Uso:** Botón "OCR Albarán" en `/procurement/orders` → arrastra foto del albarán → IA extrae proveedor, productos, cantidades, precios → "Aplicar al pedido".
**API key requerida:** `MISTRAL_API_KEY` en `.env.local`. Sin ella, usa datos de demo.

### ✨ Briefing Diario IA (`feat: briefing diario IA — Gemini`)
Genera un resumen ejecutivo de cocina bajo demanda.

| Archivo | Descripción |
|---------|-------------|
| `src/app/api/briefing/route.ts` | Endpoint POST — Gemini 1.5 Flash, mock si no hay API key |
| `src/features/dashboard/components/briefing-widget.tsx` | Widget con botón "Generar briefing" |
| `src/app/(dashboard)/page.tsx` | BriefingWidget añadido al dashboard |

**Uso:** Dashboard → "Generar briefing" → análisis de eventos, tareas, stock, food cost del día.
**API key requerida:** `GEMINI_API_KEY` en `.env.local`.

---

## Sprint G2 — PWA + Tablet UX (2026-03-17)

### ✨ Reports PDF/CSV (`feat: reports PDF/CSV`)
4 tipos de informes exportables como CSV o imprimibles como PDF.

| Archivo | Descripción |
|---------|-------------|
| `src/app/(dashboard)/reports/page.tsx` | Página con 4 tabs de informes |
| `src/features/reporting/report-mock-data.ts` | Datos mock tipados (sustituir por Supabase) |
| `src/lib/reports.ts` | `exportCSV()`, `printReport()`, `formatCurrency()` |

**Informes disponibles:**
- **Food Cost** — por período, con % color-coded (verde ≤30%, amarillo ≤35%, rojo >35%)
- **Compras** — por proveedor y categoría
- **Rentabilidad eventos** — coste teórico vs real, margen
- **Mermas** — por producto y motivo

### ✨ Tablet UX (`feat: tablet UX`)
Sidebar colapsable, FAB y header móvil.

| Archivo | Descripción |
|---------|-------------|
| `src/lib/sidebar-context.tsx` | Context `collapsed` + `mobileOpen`, persiste en localStorage |
| `src/components/sidebar.tsx` | Modo icon-only (w-16) con tooltips, overlay móvil |
| `src/components/dashboard-shell.tsx` | Shell cliente que ajusta `pl-64↔pl-16` dinámicamente |
| `src/components/mobile-header.tsx` | Header hamburger para móvil/tablet (`lg:hidden`) |
| `src/components/fab.tsx` | FAB naranja con 3 acciones rápidas (`lg:hidden`) |
| `src/app/(dashboard)/layout.tsx` | Envuelve con `SidebarProvider` |

**Comportamiento:**
- **Desktop (lg+):** Sidebar fijo, botón ChevronLeft para colapsar a iconos
- **Tablet (md-lg):** Sidebar colapsado por defecto, hover expande
- **Móvil (<md):** Sidebar oculto, hamburger lo abre como overlay

### ✨ PWA (`feat: command palette + PWA`)
ChefOS instalable como app nativa en iPad/Android.

| Archivo | Descripción |
|---------|-------------|
| `public/manifest.json` | Web App Manifest con shortcuts |
| `public/sw.js` | Service Worker — network-first nav, cache-first assets |
| `public/icons/icon.svg` | Icono SVG (chef hat naranja sobre fondo oscuro) |
| `src/components/pwa-register.tsx` | Registra SW, toast de actualización disponible |
| `src/components/pwa-install-prompt.tsx` | Banner "Instalar ChefOS" en móvil/tablet |
| `src/app/layout.tsx` | Metadata manifest + appleWebApp, PWA components |

**Nota:** Genera `public/icons/icon-192.png` y `icon-512.png` con squoosh.app o sharp para máxima compatibilidad.

### ✨ Command Palette ⌘K (`feat: command palette`)
Búsqueda y navegación global por teclado.

| Archivo | Descripción |
|---------|-------------|
| `src/components/command-palette.tsx` | Overlay con búsqueda fuzzy, 8 resultados |
| `src/components/command-palette-provider.tsx` | Context + shortcut global `Ctrl+K`/`Cmd+K` |
| `src/lib/command-palette-data.ts` | 23 rutas de navegación + 5 recetas mock |
| `src/lib/providers.tsx` | `CommandPaletteProvider` añadido |
| `src/components/sidebar.tsx` | Botón "Buscar..." con hint `⌘K` |

**Atajos:** `Ctrl+K` / `Cmd+K` abre · `↑↓` navega · `Enter` abre · `Esc` cierra

---

## Sprint G1 completado (2026-03-17)

### ✨ Voz en formularios (`feat: voice input`)
Web Speech API para dictado en español sin API key.

| Archivo | Descripción |
|---------|-------------|
| `src/hooks/use-voice-input.ts` | Hook SpeechRecognition, es-ES, tipos inline |
| `src/lib/voice-parser.ts` | Parser NLP español: recetas, ingredientes, inventario |
| `src/components/voice-mic-button.tsx` | Botón micrófono animado, graceful degradation |
| `src/app/(dashboard)/recipes/new/page.tsx` | Panel de dictado → rellena campos del form |
| `src/app/(dashboard)/escandallo/page.tsx` | "Dictar ingrediente" en DetailDialog |
| `src/features/inventory/components/waste-record-form.tsx` | "Dictar merma" en dialog |

**Ejemplos de dictado:**
- Recetas: *"Risotto de setas, principal, cuatro raciones, 20 minutos de preparación"*
- Ingredientes: *"300 gramos de harina de trigo"*
- Mermas: *"2 kilos de ternera por caducidad"*

### ✨ E2E Tests + CI/CD (`feat: Playwright + GitHub Actions`)

| Archivo | Descripción |
|---------|-------------|
| `e2e/*.spec.ts` | 5 specs: auth, navigation, dashboard, recipes, events |
| `playwright.config.ts` | Config Chromium, port 3001, CI retries |
| `.github/workflows/ci.yml` | 4 jobs: typecheck → build → vitest → playwright |

**CI Pipeline:**
1. `TypeScript` — `tsc --noEmit`
2. `Lint + Build` — `next build` con env vars placeholder
3. `Unit Tests` — `vitest --run`
4. `E2E Tests` — Playwright Chromium (depende de build)

### ✨ Mermas + Reservas de stock + Alérgenos + Aliases

| Archivo | Descripción |
|---------|-------------|
| `src/features/inventory/components/waste-record-form.tsx` | Dialog mermas con cálculo de pérdida |
| `src/features/inventory/components/stock-reservations.tsx` | Vista reservas agrupadas por evento |
| `src/features/inventory/waste-types.ts` | `WasteReason`, `WasteRecord`, `StockReservation` types |
| `src/features/catalog/components/allergen-editor.tsx` | Grid 14 alérgenos EU (Reg. 1169/2011) |
| `src/features/catalog/components/product-aliases.tsx` | Aliases por proveedor con referencia |
| `src/app/(dashboard)/catalog/products/page.tsx` | Sheet lateral al clicar fila → alérgenos + aliases |
| `src/app/(dashboard)/inventory/page.tsx` | Tabs: Niveles stock / Reservas, botón merma en header |

### ✨ RBAC + Event FSM + PO FSM

| Archivo | Descripción |
|---------|-------------|
| `src/lib/rbac.ts` | 19 permisos, 6 roles, `hasPermission()` |
| `src/hooks/use-role.ts` | Hook `useRole()` — lee de auth metadata |
| `src/components/role-gate.tsx` | `<RoleGate permission="...">` wrapper |
| `src/features/events/event-fsm.ts` | FSM eventos: pendiente→confirmado→en_preparacion→completado/cancelado |
| `src/features/events/components/event-status-bar.tsx` | Barra de progreso visual por pasos |
| `src/features/events/components/event-status-actions.tsx` | Botones de transición + Dialog confirmación |
| `src/features/procurement/po-fsm.ts` | FSM POs: borrador→enviada→recibida/cancelada |
| `src/features/procurement/components/po-status-badge.tsx` | Badge color-coded por estado |
| `src/features/procurement/components/po-status-actions.tsx` | Botones send/receive/cancel |

**Permisos aplicados:** `recipe:create/approve`, `event:create`, `po:create`, `inventory:adjust`

### ✨ Dark Mode + Datos sintéticos

| Archivo | Descripción |
|---------|-------------|
| `src/components/theme-provider.tsx` | `ThemeProvider` de next-themes |
| `src/components/theme-toggle.tsx` | Botón Sol/Luna en sidebar |
| `src/lib/mock-data.ts` | 10 recetas, 8 clientes, 15 productos, 8 cats, 6 proveedores, 6 POs, 10 lotes, 12 movimientos, 10 tareas |

### ✨ Módulos del análisis competitivo

| Módulo | Ruta | Archivo |
|--------|------|---------|
| APPCC/HACCP | `/appcc` | `src/app/(dashboard)/appcc/page.tsx` |
| Ingeniería de menú | `/menu-engineering` | `src/app/(dashboard)/menu-engineering/page.tsx` |
| Escandallo dinámico | `/escandallo` | `src/app/(dashboard)/escandallo/page.tsx` |
| Planificación personal | `/staffing` | `src/app/(dashboard)/staffing/page.tsx` |
| Calendario eventos | `/events` | `src/features/events/components/events-calendar.tsx` |

### ✨ UI Polish (EmptyState + TableSkeleton)
`TableSkeleton` y `EmptyState` aplicados en las 12 páginas de listado.

