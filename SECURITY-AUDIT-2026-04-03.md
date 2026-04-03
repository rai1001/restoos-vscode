# RestoOS — Security Audit Report
**Fecha:** 2026-04-03
**Auditor:** OpenAI Codex (Principal Application Security Engineer)
**Validador:** Claude Code (cross-model verification)
**Tipo:** Revisión hostil de SaaS multicliente
**Alcance:** Repositorio completo (código, migrations, Edge Functions, RPCs, RLS, scripts)

---

## FASE 1 — Threat Model y Attack Surface

### 1. Trust Boundaries

```
[Browser / React UI]
  |
  | 1. Supabase Auth session in SSR cookies + browser auth state
  v
[Next.js middleware + server routes]
  - Session refresh / redirect: middleware.ts (line 4)
  - API auth boundary: require-auth.ts (line 8)
  |
  | 2. Two client types leave Next.js:
  |    a) browser anon client with user JWT
  |    b) server anon client with SSR cookies
  v
[Supabase Auth + PostgREST / RPC]
  - Browser client: client.ts (line 1)
  - Server client: server.ts (line 1)
  |
  | 3. Data boundary
  v
[PostgreSQL shared DB / shared schema]
  - RLS helper boundary: 00000000000022_fix_rls_recursion.sql (line 7)
  - SECURITY DEFINER RPC boundary: 00000000000002_base0_rpcs.sql (line 12)
  - Document Vault RPCs: 00000000000032_document_vault_rpcs.sql (line 12)
  |
  | 4. Privileged compute boundary
  v
[Supabase Edge Functions]
  - service_role client factory: utils.ts (line 9)
  - optional JWT + membership verification: utils.ts (line 143)
  |
  | 5. Object storage boundary
  v
[Supabase Storage buckets]
  - documentos
  - document-vault
  - document-vault-backup
  - Bucket usage: clara_collector.ts (line 228), vault-service.ts (line 18)
  |
  | 6. Third-party outbound boundary
  v
[External APIs]
  - Gemini: briefing/route.ts (line 58), utils.ts (line 37)
  - Mistral: ocr-albaran/route.ts (line 70), ocr-recipe/route.ts (line 81)
  - Resend: digest/route.ts (line 19), notify-ticket/route.ts (line 160)

[Operator / internal tooling boundary]
  - service-role scripts: seed-synthetic.ts (line 22), test-agents.ts (line 15),
    test-clara-real.ts (line 16)
```

### 2. Tenant Context Flow

El contexto nace en `memberships(user_id, hotel_id, tenant_id, role, is_active)` y en el hotel activo del usuario. Base de identidad y jerarquia en `00000000000001_base0_identity.sql` (lines 28, 88).

La sesion entra por cookies SSR de Supabase. Next.js refresca/propaga esa sesion en `middleware.ts` (line 4) y crea clientes SSR/browser en `server.ts` (line 1) y `client.ts` (line 1).

El frontend resuelve `hotel_id`, `tenant_id` y `role` del usuario llamando a la RPC `get_active_hotel(p_user_id)` desde `hooks.ts` (line 75) y `service.ts` (line 57). El selector de hotel tambien propaga `p_user_id` y `p_hotel_id` en `hotel-switcher.tsx` (line 56).

El contexto se cachea en cliente en React state y en claves de React Query:
- `hotel_id` en `use-products.ts` (line 11), `use-procurement.ts` (line 13), `use-recipes.ts` (line 12)
- `tenant_id` en `use-multi-local.ts` (line 7) y `use-transfers.ts` (line 7)

El contexto se serializa y transmite de varias formas:
- como parametros RPC `p_hotel_id`, `p_tenant_id`, `p_user_id`
- como body JSON en Edge Functions, e.g. `hotel_id` en `clara-agent/index.ts` (line 27) y `agent-appcc/index.ts` (line 75)
- como prefijo de storage path, e.g. `${hotel_id}/...` en `vault-service.ts` (line 33) y `facturas/${hotelId}/...` en `clara_collector.ts` (line 228)

El contexto se aplica en datos principalmente por RLS helper functions:
- `has_hotel_access(p_hotel_id)` en `00000000000022_fix_rls_recursion.sql` (line 7)
- `has_hotel_role(p_hotel_id, p_roles)` en `00000000000022_fix_rls_recursion.sql` (line 11)
- `has_tenant_access(p_tenant_id)` en `00000000000022_fix_rls_recursion.sql` (line 16)

En Edge Functions el contexto llega explicitamente desde el caller. Cuando la function valida JWT+membresia lo hace con `verifyCallerHotelAccess(req, hotelId, serviceClient)` en `utils.ts` (line 143). Cuando no aparece esa llamada, el scoping queda delegado al resto del handler.

El contexto tambien se persiste en sinks de auditoria e integridad:
- `audit_logs(hotel_id, actor_user_id)` en `00000000000001_base0_identity.sql` (line 116)
- `domain_events(hotel_id)` en `00000000000001_base0_identity.sql` (line 138)
- `document_custody_log(document_id, actor_user_id)` en `00000000000031_document_vault.sql` (line 91)

### 3. Privileged Paths Inventory

#### SECURITY DEFINER helpers y RPCs

**Identidad:**
- `get_active_hotel` — `00000000000002_base0_rpcs.sql` (line 12)
- `switch_active_hotel` — `00000000000002_base0_rpcs.sql` (line 71)
- `create_hotel` — `00000000000002_base0_rpcs.sql` (line 119)
- `invite_member` — `00000000000002_base0_rpcs.sql` (line 180)
- `update_member_role` — `00000000000002_base0_rpcs.sql` (line 266)
- `deactivate_member` — `00000000000002_base0_rpcs.sql` (line 339)

**RLS helpers:**
- `has_hotel_access` — `00000000000022_fix_rls_recursion.sql` (line 7)
- `has_hotel_role` — `00000000000022_fix_rls_recursion.sql` (line 11)
- `has_tenant_access` — `00000000000022_fix_rls_recursion.sql` (line 16)
- `is_admin_user` — `00000000000022_fix_rls_recursion.sql` (line 298)

**Catalogo:**
- `upsert_product`, `upsert_supplier`, `set_preferred_offer`, `search_products`, `match_product_by_alias`, `get_product_with_offers` — `00000000000004_m3_rpcs.sql` (line 8)

**Comercial/eventos:**
- `create_event`, `update_event`, `confirm_event`, `cancel_event`, `start_event_operation`, `complete_event`, `get_events_calendar` — `00000000000006_m1_rpcs.sql` (line 7)

**Recetas/costes:**
- `create_recipe`, `update_recipe`, `submit_recipe_for_review`, `approve_recipe`, `deprecate_recipe`, `calculate_recipe_cost`, `calculate_menu_cost`, `get_recipe_tech_sheet` — `00000000000008_m2_recipes_rpcs.sql` (line 7)

**Compras/inventario:**
- `create_purchase_request`, `approve_purchase_request`, `generate_purchase_order`, `send_purchase_order`, `receive_goods`, `record_waste`, `get_stock_levels`, `check_stock_alerts` — `00000000000013_m4_rpcs.sql` (line 7)

**Direccion/reporting:**
- `generate_daily_snapshot`, `get_dashboard_data`, `check_alert_thresholds`, `dismiss_alert` — `00000000000015_m6_dashboard_rpcs.sql` (line 7)

**APPCC:**
- `create_check_record`, `refresh_daily_closure`, `validate_daily_closure`, `get_appcc_daily_summaries`, `resolve_appcc_incident` — `00000000000021_m8_appcc_rpcs.sql` (line 7)

**Multi-local / transfers:**
- `get_tenant_overview`, `get_price_comparisons` — `00000000000023_multilocal_rpcs.sql` (line 7)
- `create_stock_transfer`, `confirm_stock_transfer`, `receive_stock_transfer` — `00000000000025_transfer_rpcs.sql` (line 7)

**ML/export:**
- `export_price_data_for_ml` — `00000000000029_ml_price_history.sql` (line 173)

**Document Vault:**
- `store_document`, `verify_document_integrity`, `get_document_with_custody`, `get_documents_needing_verification`, `get_missing_documents_report`, `get_retention_compliance`, `cross_reference_documents`, `get_vault_stats` — `00000000000032_document_vault_rpcs.sql` (line 12)

#### Edge Functions con service_role

**Cliente privilegiado comun:** `utils.ts` (line 9)

**Con verificacion explicita JWT+membresia:**
- `clara-agent/index.ts` (line 27)
- `agent-ocr/index.ts` (line 185)
- `agent-inventario/index.ts` (line 479)

**Sin llamada visible a verifyCallerHotelAccess en el entrypoint:**
- `agent-appcc/index.ts` (line 75)
- `agent-escandallo/index.ts` (line 58)
- `agent-menu-engineering/index.ts` (line 76)
- `agent-integrity/index.ts` (line 49)
- `clara-collector/index.ts` (line 24)
- `clara-ocr/index.ts` (line 24)
- `clara-reconciler/index.ts` (line 23)
- `clara-messenger/index.ts` (line 24)

#### Rutas/admin surfaces

- UI RBAC de modulos admin: `/admin/tickets`, `/admin/setup-status`, `/admin/audit-log` en `module-access.ts` (line 43)
- Scripts internos con `SUPABASE_SERVICE_ROLE_KEY`: `seed-synthetic.ts` (line 22), `test-agents.ts` (line 15), `test-clara.ts` (line 15), `test-clara-real.ts` (line 16)

### 4. Sensitive Assets Map

| Asset | Storage | Encryption | Access control | Exposure risk |
|---|---|---|---|---|
| Auth session / JWT | Browser cookies + Supabase Auth session | TLS in transit assumed | Supabase Auth + middleware + requireAuth() | Session propagation boundary |
| Profiles PII | profiles table | At-rest not visible in repo | Own-row RLS | User identity and contact data |
| Supplier PII / tax data | suppliers table | Not visible in repo | Hotel RLS via helpers | Financial/vendor privacy |
| Clients PII | clients table | Not visible in repo | Hotel RLS | Reservations/commercial exposure |
| Purchase orders / goods receipts | procurement tables | Not visible in repo | Hotel RLS + procurement RPCs | Finance / supply chain |
| Stock lots / movements | inventory tables | Not visible in repo | Hotel RLS | Operational inventory |
| Recipes / margins / costing | recipes + costing RPCs | Not visible in repo | Hotel RLS + role-aware RPCs | Margin/IP sensitivity |
| APPCC records / incidents | APPCC tables and RPCs | Not visible in repo | Hotel RLS + APPCC RPCs/agents | Food safety compliance |
| document_vault ledger | document_vault, custody_log, integrity_checks | SHA-256 hash stored | RLS + RPCs + storage bucket pathing | Legal/compliance records |
| Raw invoices / backups | Storage buckets | TLS in transit | Policies not versioned; path prefix includes hotel_id | Primary file exfiltration surface |
| Audit trails | audit_logs, domain_events | Not visible in repo | Select policies via hotel access | High-value forensic data |
| AI / email payloads | Outbound HTTP bodies | HTTPS | Route-level auth only | Potentially carries PII outside platform |
| Secrets | Env vars | Platform secret stores | Server-only by convention | Highest blast-radius credentials |

### 5. Exposed Surfaces Inventory

| Surface | Auth method | Authz method | Tenant scoping | Client type | Risk notes |
|---|---|---|---|---|---|
| /api/briefing | requireAuth() | Authenticated user only | Implicito | Server + Gemini | LLM proxy surface |
| /api/chat | requireAuth() | Authenticated user only | Implicito | Server route | Mock/chat assistant |
| /api/digest POST | requireAuth() | Authenticated user only | Implicito | Server + Resend | Email/report surface |
| /api/digest GET | requireAuth() | Authenticated user only | Implicito | Server route | Preview/report surface |
| /api/notify-ticket | supabase.auth.getUser() | Authenticated user only | Implicito | Server + Resend | Support/email surface |
| /api/ocr | requireAuth() | Authenticated user only | Implicito | Server + file upload | OCR upload surface |
| /api/ocr-albaran | requireAuth() | Authenticated user only | Implicito | Server + Mistral | OCR upload surface |
| /api/ocr-recipe | requireAuth() | Authenticated user only | Implicito | Server + Mistral | OCR upload surface |
| clara-agent | Bearer JWT | verifyCallerHotelAccess | Explicito | service_role | Gate explicito |
| agent-ocr | Bearer JWT | verifyCallerHotelAccess | Explicito | service_role | Gate explicito |
| agent-inventario | Bearer JWT | verifyCallerHotelAccess | Explicito | service_role | Gate explicito |
| agent-appcc | No visible | No visible | Explicito por hotel_id | service_role | Requiere auditoria |
| agent-escandallo | No visible | No visible | Explicito por hotel_id | service_role | Requiere auditoria |
| agent-menu-engineering | No visible | No visible | Explicito por hotel_id | service_role | Requiere auditoria |
| agent-integrity | No visible | No visible | Espera contexto hotel/doc | service_role | Requiere auditoria |
| clara-collector | No visible | No visible | Explicito por hotel_id | service_role | Ingesta documental |
| clara-ocr | No visible | No visible | Explicito por hotel_id | service_role | OCR pipeline |
| clara-reconciler | No visible | No visible | Explicito por hotel_id | service_role | Reconciliation pipeline |
| clara-messenger | No visible | No visible | Explicito por hotel_id | service_role | Messaging pipeline |
| PostgREST RPCs | JWT via anon client | Logica RPC + RLS helpers | Generalmente explicito | Browser/server anon | Superficie amplia |
| Storage buckets | No visible en repo | No visible en repo | Path prefix por hotel_id | Browser, server, functions | Policies no versionadas |

### 6. Attacker Models

**a) Atacante externo no autenticado**
- Puede alcanzar el borde HTTP publico de Next.js y observar redirecciones del middleware
- Puede intentar invocar URLs publicas de Edge Functions si estan expuestas por Supabase
- Puede enumerar existencia y comportamiento basico de rutas API aunque fallen por requireAuth()
- Puede dirigirse al flujo de login/reset/invite propio de Supabase Auth
- Superficies prioritarias: Edge Functions sin auth visible, buckets/storage si existen URLs publicas

**b) Usuario autenticado de otro tenant**
- Tiene un JWT valido y puede usar Supabase JS directo contra tablas/RPCs
- Puede llamar las RPCs de identidad y cambio de contexto
- Puede invocar cualquier RPC SECURITY DEFINER concedida a authenticated
- Puede invocar rutas Next.js autenticadas y Edge Functions con Bearer JWT
- Targets: document vault, multi-local, procurement, APPCC y agentes IA

**c) Usuario de bajo privilegio del mismo tenant**
- Comparte tenant_id y normalmente un hotel_id activo, pero su role puede ser cook, room, reception
- Puede usar el mismo browser client, rutas autenticadas y buena parte de las RPCs
- Targets: finanzas/procurement, APPCC RPCs de cierre/incidentes, document vault, admin/support pages
- Debe revisarse si el cambio de hotel deja residuos en cache

**d) Cuenta admin/superadmin comprometida**
- Mayor alcance en memberships, pantallas admin, soporte y funciones tenant-wide
- Puede usar RPCs de gestion de miembros/hoteles, multi-local, transfers y reporting
- Si dispone de tooling interno o secretos operativos, blast radius se amplia a Edge Functions con service_role
- Debe separarse claramente dano intra-tenant vs lateral fuera de su tenant

### 7. Identifier Trace Matrix

| Identifier | Where accepted as input | Where enforced | Where NOT enforced | Gap risk |
|---|---|---|---|---|
| tenant_id | Multi-local hooks/services, document vault service | has_tenant_access(), tenant-scoped queries | No scoping en API routes; storage policies no visibles | Riesgo en agregaciones tenant-wide |
| hotel_id | RPCs de casi todos los dominios; Edge Functions; storage paths; hotel switcher | has_hotel_access(), has_hotel_role(), verifyCallerHotelAccess() | Varias Edge Functions solo muestran ensureHotelId(); API routes no suelen transportar hotel_id | Identificador central de aislamiento |
| user_id | get_active_hotel, switch_active_hotel, member-management RPCs | RLS sobre profiles, memberships, auth.uid() en policies | Los contratos RPC aceptan p_user_id explicito sin derivar de sesion | Riesgo en cambio de contexto |
| supplier_id | Catalogo/procurement services, CLARA OCR/reconciler, document vault metadata | RLS hotel-scoped en tablas de catalogo/procurement | No hay capa unica de validacion server-side | Riesgo de BOLA |
| product_id | Catalogo, recetas, inventario, escandallo, menu engineering | RLS hotel-scoped y joins por dominio | Muchas llamadas aceptan el id directamente desde cliente/body | Riesgo en cruces catalogo-receta-stock |
| recipe_id | Hooks de recetas, tech sheet RPC, inventory agent, menu engineering | RLS y funciones de recetas | No enforcement uniforme en todas las capas | Riesgo en costes y margenes |
| order_id | Esquema usa purchase_order_id; hooks como use-procurement.ts | Procurement RLS | No existe como identificador transversal primario | Revisar como alias |
| receipt_id | Goods receipts y CLARA reconciliation | Hotel-scoped tables/RLS | No capa unificada visible en handlers | Riesgo en conciliacion |
| document_id | Vault RPCs, custody/integrity flows | RPCs y joins al document_vault | Storage/object policy no visible | Riesgo en descarga, custody, backup |
| membership_id | Gestion de membresias y vistas de equipo | memberships RLS + admin helper logic | No aparece como boundary fuerte en routes | Riesgo en operaciones admin/soporte |

### 8. Preliminary Risk Areas

1. RPCs SECURITY DEFINER de identidad y cambio de contexto
2. Edge Functions con service_role — bifurcacion entre con/sin verifyCallerHotelAccess
3. Document Vault completo (tabla legal, custody log, integrity checks, RPCs, uploads, bucket backup)
4. Storage buckets y politicas de storage.objects (no versionadas)
5. Multi-local / tenant-wide analytics y transfers
6. Flujos de soporte/admin (tickets, notify-ticket, audit log, setup-status)
7. OCR / LLM / email proxy routes
8. Cache y cambio de hotel (useActiveHotel, hotel-switcher, React Query keys)
9. Scripts internos con SUPABASE_SERVICE_ROLE_KEY
10. Logging, audit y domain events

---

## FASE 2 — Auditoria profunda de aislamiento y authz

### Hallazgos

#### [RO-APPSEC-201] feedback_tickets rompe el aislamiento entre tenants
- **Severidad:** Critical
- **Confianza:** High
- **Categoria:** Broken tenant isolation / broken authorization
- **CWE/OWASP:** CWE-284, CWE-285, OWASP A01:2021
- **Archivos:** `00000000000019_m10_feedback.sql` (lines 4-21, 38-72), `00000000000022_fix_rls_recursion.sql` (lines 297-304)
- **Evidencia:** La tabla no tiene `hotel_id` ni `tenant_id`. Las policies admin dependen de `is_admin_user()`, que solo verifica "alguna membership activa" sin scope de hotel.
- **Escenario:** Un admin del tenant A ejecuta `select * from feedback_tickets` y obtiene tickets, emails, nombres y screenshots del tenant B; ademas puede modificarlos o borrarlos.
- **Impacto multicliente:** Lectura y escritura cross-tenant real.
- **Impacto de negocio:** Exposicion de PII, capturas sensibles, manipulacion/borrado de incidencias.
- **PoC:** `await supabase.from("feedback_tickets").select("*")`
- **Estado:** Verified

#### [RO-APPSEC-202] Varias Edge Functions usan service_role sin verifyCallerHotelAccess
- **Severidad:** Critical
- **Confianza:** Medium
- **Categoria:** Authorization bypass / privileged backend misuse
- **CWE/OWASP:** CWE-306, CWE-862, OWASP A01:2021
- **Archivos:** `utils.ts` (lines 9-13, 143-188), `agent-appcc/index.ts` (line 75), `agent-escandallo/index.ts` (line 52), `agent-menu-engineering/index.ts` (line 76), `agent-integrity/index.ts` (line 49), `clara-collector/index.ts` (line 24), `clara-ocr/index.ts` (line 24), `clara-reconciler/index.ts` (line 23), `clara-messenger/index.ts` (line 24)
- **Contraste protegido:** `clara-agent/index.ts` (line 28), `agent-ocr/index.ts` (line 186), `agent-inventario/index.ts` (line 480)
- **Evidencia:** `getSupabaseClient()` crea un cliente con `SUPABASE_SERVICE_ROLE_KEY`. Los handlers listados aceptan `hotel_id` del body y operan sin llamar a `verifyCallerHotelAccess()`.
- **Escenario:** Atacante invoca la function con `hotel_id` ajeno y fuerza lecturas/escrituras cross-tenant.
- **Impacto multicliente:** Potencial lectura/escritura cross-tenant en tablas sensibles.
- **Impacto de negocio:** Corrupcion de inventario/costes/APPCC, exfiltracion de datos, consumo abusivo de IA.
- **PoC:** `curl -X POST https://<project>.functions.supabase.co/agent-menu-engineering -d '{"hotel_id":"<victim>"}'`
- **Estado:** Plausible but needs runtime verification

#### [RO-APPSEC-203] receive_goods() elimino toda validacion del caller
- **Severidad:** Critical
- **Confianza:** High
- **Categoria:** Unauthorized state-changing RPC / inventory integrity
- **CWE/OWASP:** CWE-862, CWE-732, OWASP A01:2021
- **Archivos:** `00000000000013_m4m5_rpcs.sql` (line 185), `00000000000028_receipt_incidents.sql` (line 39), `00000000000029_price_history.sql` (line 39)
- **Evidencia:** La version original validaba membership activa. Las redefiniciones posteriores solo comprueban que el pedido existe y esta receivable; no hay `REVOKE/GRANT` especifico.
- **Escenario:** Un usuario de bajo privilegio marca mercancia como recibida y altera stock, movimientos y estado del pedido.
- **Impacto multicliente:** Cross-tenant si los IDs se filtran; same-tenant low-priv inmediato.
- **Impacto de negocio:** Corrupcion de inventario y contabilidad, creacion falsa de lotes y movimientos.
- **PoC:** `await supabase.rpc("receive_goods", { p_hotel_id: myHotel, p_order_id: orderId, p_lines: [...] })`
- **Estado:** Verified

#### [RO-APPSEC-204] get_appcc_daily_summaries() publica sin control de acceso
- **Severidad:** Critical
- **Confianza:** High
- **Categoria:** Broken authorization / sensitive data exposure
- **CWE/OWASP:** CWE-862, CWE-200, OWASP A01:2021
- **Archivos:** `00000000000021_m8_appcc_rpcs.sql` (line 238)
- **Evidencia:** La funcion acepta `p_hotel_id` y devuelve cierres APPCC historicos. No contiene `auth.uid()`, membership check ni control de rol. No hay `REVOKE/GRANT` explicitos.
- **Escenario:** Un usuario de otro tenant descarga el dataset completo de compliance APPCC.
- **Impacto multicliente:** Lectura cross-tenant de informacion de compliance.
- **Impacto de negocio:** Exposicion de postura APPCC y trazabilidad operacional.
- **PoC:** `await supabase.rpc("get_appcc_daily_summaries", { p_hotel_id: victimHotelId, p_days_back: 30 })`
- **Estado:** Verified

#### [RO-APPSEC-205] RPCs APPCC mutadoras sin autorizacion efectiva
- **Severidad:** Critical
- **Confianza:** High
- **Categoria:** Broken authorization / compliance data tampering
- **CWE/OWASP:** CWE-862, CWE-732, OWASP A01:2021
- **Archivos:** `00000000000021_m8_appcc_rpcs.sql` (lines 7, 91, 274)
- **Evidencia:** `refresh_daily_closure` no comprueba caller. `resolve_appcc_incident` actualiza sin membership/rol. `create_check_record` inserta sin validar membership/rol, aunque las tablas APPCC si tienen policies mas estrictas — que se bypasean por ser SECURITY DEFINER.
- **Escenario:** Un actor recalcula/corrompe cierres APPCC, cierra incidentes ajenos, o crea checks fuera de su rol.
- **Impacto multicliente:** Cross-tenant si IDs se conocen; same-tenant low-priv inmediato.
- **Impacto de negocio:** Manipulacion de registros sanitarios y trazabilidad de cumplimiento.
- **PoC:** `await supabase.rpc("refresh_daily_closure", { p_hotel_id: victimHotelId, p_date: "2026-04-02" })`
- **Estado:** Verified

#### [RO-APPSEC-206] export_price_data_for_ml() exfiltra pricing historico sin authz
- **Severidad:** Critical
- **Confianza:** High
- **Categoria:** Sensitive data exfiltration
- **CWE/OWASP:** CWE-200, CWE-862, OWASP A01:2021
- **Archivos:** `00000000000029_price_history.sql` (line 173)
- **Evidencia:** La funcion devuelve `product_name`, `supplier_name`, `unit_price`, `quantity`, series moviles y desviaciones para cualquier `p_hotel_id`. No hay `auth.uid()` ni membership/role check, ni `REVOKE/GRANT`.
- **Escenario:** Un usuario de otro tenant descarga el dataset completo de pricing historico.
- **Impacto multicliente:** Exfiltracion cross-tenant.
- **Impacto de negocio:** Perdida de inteligencia de compras y condiciones comerciales.
- **PoC:** `await supabase.rpc("export_price_data_for_ml", { p_hotel_id: victimHotelId })`
- **Estado:** Verified

#### [RO-APPSEC-207] document_vault no es inmutable
- **Severidad:** High
- **Confianza:** High
- **Categoria:** Data integrity / authorization flaw
- **CWE/OWASP:** CWE-285, CWE-693, OWASP A01:2021
- **Archivos:** `00000000000031_document_vault.sql` (line 178), `vault-service.ts` (line 149)
- **Evidencia:** `vault_update_status` permite UPDATE con WITH CHECK tautologico (`doc_type = doc_type`, `file_hash_sha256 = file_hash_sha256`, `storage_path = storage_path`). `document_custody_log` permite inserts a cualquier miembro.
- **Escenario:** Un usuario de bajo privilegio modifica `storage_path`, `file_hash_sha256`, `total_amount` o anade eventos de custodia falsos.
- **Impacto multicliente:** No rompe tenants directamente, pero destruye la integridad de un ledger legal.
- **Impacto de negocio:** Fraude interno, perdida de cadena de custodia, valor probatorio.
- **PoC:** `await supabase.from("document_vault").update({ storage_path: "evil.pdf", file_hash_sha256: "00" }).eq("id", documentId)`
- **Estado:** Verified

#### [RO-APPSEC-208] store_document() permite falsificar tenant_id
- **Severidad:** High
- **Confianza:** High
- **Categoria:** Tenant context integrity failure
- **CWE/OWASP:** CWE-639, CWE-20, OWASP A01:2021
- **Archivos:** `00000000000032_document_vault_rpcs.sql` (line 12), `00000000000001_base0_identity.sql` (line 28), `vault-service.ts` (line 44)
- **Evidencia:** La funcion solo valida `has_hotel_access(p_hotel_id)` y luego inserta `tenant_id = p_tenant_id` recibido del caller.
- **Escenario:** Un miembro del hotel A crea documentos ligados a hotel A pero a tenant B, contaminando consultas/informes tenant-wide.
- **Impacto multicliente:** Corrupcion real del boundary tenant en tabla sensible.
- **Impacto de negocio:** Datos mal atribuidos, reporting/legal hold erroneos.
- **PoC:** `await supabase.rpc("store_document", { p_hotel_id: myHotel, p_tenant_id: otherTenant, ... })`
- **Estado:** Verified

#### [RO-APPSEC-209] get/switch_active_hotel aceptan user_id arbitrario
- **Severidad:** Medium
- **Confianza:** High
- **Categoria:** Horizontal authorization bypass
- **CWE/OWASP:** CWE-639, CWE-285, OWASP A01:2021
- **Archivos:** `00000000000002_base0_rpcs.sql` (lines 12, 71), `hooks.ts` (line 75), `service.ts` (line 57)
- **Evidencia:** Ambas funciones operan sobre memberships usando `p_user_id` del caller sin comparar con `auth.uid()`.
- **Escenario:** Un usuario autenticado llama `get_active_hotel(victimUser)` para obtener hotel_id/tenant_id/role o `switch_active_hotel(victimUser, victimHotel)` para cambiarle el contexto.
- **Impacto multicliente:** Fuga de metadatos y alteracion de contexto cross-tenant.
- **Impacto de negocio:** Context hijack, lateral discovery, confusion operativa.
- **PoC:** `await supabase.rpc("get_active_hotel", { p_user_id: victimUserId })`
- **Estado:** Verified

#### [RO-APPSEC-210] direction puede autoelevarse a admin
- **Severidad:** High
- **Confianza:** High
- **Categoria:** Privilege escalation / RBAC flaw
- **CWE/OWASP:** CWE-269, CWE-285, OWASP A01:2021
- **Archivos:** `00000000000002_base0_rpcs.sql` (lines 196, 279), `settings/team/page.tsx` (line 176), `module-access.ts` (line 43)
- **Evidencia:** `invite_member` autoriza a `direction` y acepta `p_role='admin'`. `update_member_role` tambien autoriza a `direction`, permite `p_new_role='admin'` y no impide auto-target. La UI solo excluye `superadmin`, no `admin`.
- **Escenario:** Un usuario `direction` se promueve a `admin` o invita un segundo usuario como `admin`.
- **Impacto multicliente:** Escalada same-tenant; acceso a tooling admin.
- **Impacto de negocio:** Acceso no autorizado a administracion, auditoria y soporte.
- **PoC:** `await supabase.rpc("update_member_role", { p_hotel_id: myHotel, p_target_user_id: myUserId, p_new_role: "admin" })`
- **Estado:** Verified

#### [RO-APPSEC-211] Procurement/catalog accesible a cualquier miembro
- **Severidad:** High
- **Confianza:** High
- **Categoria:** Privilege escalation / object-level authorization
- **CWE/OWASP:** CWE-285, CWE-639, OWASP A01:2021
- **Archivos:** `00000000000003_m3_catalog.sql` (line 157), `00000000000011_m4_procurement.sql` (line 107), `00000000000013_m4m5_rpcs.sql` (line 20), `module-access.ts` (line 26)
- **Evidencia:** `suppliers`, `supplier_offers`, `purchase_orders`, `purchase_order_lines`, `goods_receipts` y `goods_receipt_lines` tienen policies basadas solo en membership activa. Varias RPCs de procurement solo validan membership, no rol.
- **Escenario:** Un `cook` o `room` lee pedidos, proveedores y precios; modifica datos de proveedor o crea pedidos.
- **Impacto multicliente:** No rompe tenants, pero si el aislamiento por rol.
- **Impacto de negocio:** Exposicion de PII de proveedores, fraude interno, manipulacion de compras.
- **PoC:** `await supabase.from("purchase_orders").select("*").eq("hotel_id", myHotel)`
- **Estado:** Verified

#### [RO-APPSEC-212] audit_logs y domain_events exponen PII a cualquier miembro
- **Severidad:** High
- **Confianza:** High
- **Categoria:** Sensitive data exposure / logging abuse
- **CWE/OWASP:** CWE-200, CWE-532, OWASP A09:2021
- **Archivos:** `00000000000001_base0_identity.sql` (line 209), `00000000000002_base0_rpcs.sql` (line 241), `00000000000004_m3_rpcs.sql` (line 145)
- **Evidencia:** `audit_logs_select` y `domain_events_select` solo piden membership activa. `invite_member` registra `email` en `after_json`; `upsert_supplier` vuelca la fila completa con contacto, telefono, direccion y `tax_id`.
- **Escenario:** Un usuario de bajo privilegio consulta `audit_logs` para ver PII y workflow intelligence.
- **Impacto multicliente:** Same-hotel data exfiltration; util para ataques posteriores.
- **Impacto de negocio:** Fuga de PII e inteligencia interna.
- **PoC:** `await supabase.from("audit_logs").select("*").eq("hotel_id", myHotel)`
- **Estado:** Verified

#### [RO-APPSEC-213] Multi-local analytics sin restriccion de rol
- **Severidad:** High
- **Confianza:** High
- **Categoria:** Privilege escalation / lateral data exposure
- **CWE/OWASP:** CWE-285, CWE-862, OWASP A01:2021
- **Archivos:** `00000000000023_multilocal_rpcs.sql` (line 7), `00000000000017_m7_rpcs.sql` (line 6), `00000000000016_m7_direction.sql` (line 21), `multi-local/page.tsx` (line 78), `module-access.ts` (line 56)
- **Evidencia:** `get_tenant_overview` y `get_price_comparisons` solo exigen pertenecer al tenant. Dashboard RPCs solo exigen membership al hotel. `kpi_snapshots`/`alerts` visibles/mutables para cualquier miembro. `/multi-local` no esta en MODULE_ACCESS; `canAccessModule()` permite por defecto toda ruta no listada.
- **Escenario:** Un `reception` obtiene stock, merma, precios, APPCC y alertas de todos los hoteles del grupo.
- **Impacto multicliente:** Lateralidad entre hoteles del mismo tenant, fuga de management data.
- **Impacto de negocio:** Exposicion de KPIs, precios comparados y senales operativas.
- **PoC:** `await supabase.rpc("get_tenant_overview", { p_tenant_id: tenantId })`
- **Estado:** Verified

#### [RO-APPSEC-214] notify-ticket como relay de email con spoofing logico
- **Severidad:** Medium
- **Confianza:** High
- **Categoria:** Integration abuse / insufficient authorization
- **CWE/OWASP:** CWE-441, CWE-345, OWASP A04:2021
- **Archivos:** `notify-ticket/route.ts` (line 142), `FeedbackButton.tsx` (line 111)
- **Evidencia:** La ruta solo verifica que exista user; toma `created_by_name`, `created_by_email` del body y envia un email con `RESEND_API_KEY` a `NOTIFY_EMAIL`.
- **Escenario:** Un usuario envia tickets haciendose pasar por otra persona/cliente.
- **Impacto multicliente:** No rompe RLS, pero si el canal de soporte centralizado.
- **Impacto de negocio:** Phishing interno, spam, fatiga operativa.
- **PoC:** `curl -X POST .../api/notify-ticket -d '{"created_by_email":"ceo@victim.com",...}'`
- **Estado:** Verified

### Executive Summary (Fase 2)

La revision encuentra fallos reales y explotables en las dos fronteras mas criticas del sistema: aislamiento multicliente y autorizacion. Hay varios caminos SECURITY DEFINER/service_role que ignoran o degradan el contexto hotel_id/tenant_id, incluyendo RPCs publicas sin checks de acceso y Edge Functions privilegiadas que aceptan hotel_id del body.

Los impactos mas graves son: lectura/escritura cross-tenant en feedback_tickets, RPCs publicas de APPCC y pricing export, mutacion no autorizada de stock mediante receive_goods(), y bypasses sistémicos del modelo de roles.

### Top 10 Riesgos (Fase 2)

1. `feedback_tickets` sin `hotel_id/tenant_id` con policies globales para admins/direction
2. `receive_goods()` redefinida sin authz y publica por defecto
3. `get_appcc_daily_summaries()` publica sin control de acceso
4. `refresh_daily_closure` / `resolve_appcc_incident` / `create_check_record` sin authz APPCC
5. `export_price_data_for_ml()` publica sin authz, exfiltrando pricing historico
6. Edge Functions con `service_role` sin `verifyCallerHotelAccess()`
7. `document_vault` mutable pese a declararse inmutable
8. `store_document()` acepta `tenant_id` controlado por el caller
9. RLS de procurement/catalog permite a cualquier miembro leer/modificar proveedores, ofertas, pedidos y recepciones
10. `direction` puede elevarse a `admin` o crear admins

### Blind Spots (Fase 2)

- Policies de `storage.objects` y visibilidad real de los buckets
- Exposicion real de cada Edge Function en Supabase y si existe API gateway/secreto externo
- Estado real de grants en una base ya desplegada si alguien modifico privilegios manualmente
- Enumerabilidad practica de UUIDs en produccion
- Rate limiting, WAF o protecciones perimetrales fuera del repositorio

---

## FASE 3 — Validacion de hallazgos y patches

### Nota de validacion
Validacion estatica sobre el codigo y las migrations del repo. No hubo un entorno Supabase/Vercel real para ejecutar las Functions o comprobar controles perimetrales externos.

### [RO-APPSEC-201]
**Estado:** CONFIRMED
**Validacion:** Lei `00000000000019_m10_feedback.sql` lines 4-21 y 38-72, y `00000000000022_fix_rls_recursion.sql` lines 297-304. `feedback_tickets` no tiene `hotel_id` ni `tenant_id`, y las policies admin dependen de `is_admin_user()`, que solo verifica "alguna membership activa" sin scope de hotel. No hay otra policy o middleware que vuelva a introducir tenant scoping.
**Severidad ajustada:** Critical

#### Patch
```sql
ALTER TABLE feedback_tickets
  ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES hotels(id),
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

WITH preferred_membership AS (
  SELECT DISTINCT ON (m.user_id)
    m.user_id,
    m.hotel_id,
    m.tenant_id
  FROM memberships m
  WHERE m.is_active = true
  ORDER BY m.user_id, m.is_default DESC, m.created_at ASC
)
UPDATE feedback_tickets ft
SET hotel_id = pm.hotel_id,
    tenant_id = pm.tenant_id
FROM preferred_membership pm
WHERE ft.created_by = pm.user_id
  AND ft.hotel_id IS NULL
  AND ft.tenant_id IS NULL;

DROP POLICY IF EXISTS "Users can create feedback tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON feedback_tickets;

CREATE POLICY "feedback_insert_scoped"
  ON feedback_tickets FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND has_hotel_access(hotel_id)
    AND tenant_id = (SELECT h.tenant_id FROM hotels h WHERE h.id = feedback_tickets.hotel_id)
  );

CREATE POLICY "feedback_select_own"
  ON feedback_tickets FOR SELECT
  USING (
    created_by = auth.uid()
    AND has_hotel_access(hotel_id)
  );

CREATE POLICY "feedback_admin_select"
  ON feedback_tickets FOR SELECT
  USING (
    has_hotel_role(hotel_id, ARRAY['superadmin','admin'])
  );

CREATE POLICY "feedback_admin_update"
  ON feedback_tickets FOR UPDATE
  USING (
    has_hotel_role(hotel_id, ARRAY['superadmin','admin'])
  )
  WITH CHECK (
    has_hotel_role(hotel_id, ARRAY['superadmin','admin'])
    AND tenant_id = (SELECT h.tenant_id FROM hotels h WHERE h.id = feedback_tickets.hotel_id)
  );

CREATE POLICY "feedback_admin_delete"
  ON feedback_tickets FOR DELETE
  USING (
    has_hotel_role(hotel_id, ARRAY['superadmin','admin'])
  );
```

**Riesgo de regresion:** Si el backfill deja tickets sin hotel_id/tenant_id, esos tickets quedaran invisibles para admins.
**Dependencias:** Aplicar antes de cualquier UI o query real sobre tickets.
**Backfill:** Si, obligatorio. No hacer SET NOT NULL hasta validar que no quedan nulos.
**Tests:** RLS creador ve su ticket; admin mismo hotel ve/actualiza; admin otro tenant no ve ni actualiza; conteo de tickets sin hotel_id post-backfill.

### [RO-APPSEC-202]
**Estado:** NEEDS_RUNTIME
**Validacion:** Lei `utils.ts` lines 9-13 y 143-188, y compare handlers protegidos con handlers sin `verifyCallerHotelAccess()`. El repo no versiona `verify_jwt` por funcion ni otra proteccion equivalente en `config.toml`. El fallo de diseno existe; la explotabilidad externa depende de configuracion hosted.
**Severidad ajustada:** High

### [RO-APPSEC-203]
**Estado:** CONFIRMED
**Validacion:** Compare la version original en `00000000000013_m4m5_rpcs.sql` (line 185) con la version efectiva en `00000000000029_price_history.sql` (line 39). La validacion de membership desaparecio en la redefinicion final. No encontre `REVOKE ... FROM PUBLIC` ni hardening global.
**Severidad ajustada:** Critical

#### Patch
```sql
-- Insertar al inicio del BEGIN de receive_goods()
IF v_user_id IS NULL OR NOT EXISTS (
  SELECT 1
  FROM memberships
  WHERE user_id = v_user_id
    AND hotel_id = p_hotel_id
    AND is_active = true
    AND role IN ('superadmin','admin','direction','procurement','head_chef')
) THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;

REVOKE ALL ON FUNCTION receive_goods(uuid, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION receive_goods(uuid, uuid, jsonb, text) TO authenticated;
```

**Riesgo de regresion:** Si la lista de roles es demasiado estrecha, el flujo real de recepcion deja de funcionar.
**Dependencias:** Ninguna; es hotfix prioritario.
**Backfill:** No.
**Tests:** procurement y admin pueden recibir mercancia; cook y room reciben ACCESS_DENIED; pedido y stock se actualizan correctamente; usuario de otro hotel no puede mutar.

### [RO-APPSEC-204]
**Estado:** CONFIRMED
**Validacion:** En `00000000000021_m8_appcc_rpcs.sql` (line 238) `get_appcc_daily_summaries()` no comprueba `auth.uid()`, membership ni rol. No hay `REVOKE/GRANT` especifico.
**Severidad ajustada:** Critical

#### Patch
```sql
-- Insertar al inicio del BEGIN de get_appcc_daily_summaries()
IF NOT has_hotel_access(p_hotel_id) THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;

REVOKE ALL ON FUNCTION get_appcc_daily_summaries(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_appcc_daily_summaries(uuid, integer) TO authenticated;
```

**Riesgo de regresion:** Romper el historico APPCC para usuarios legitimos si el hotel activo no se resuelve bien.
**Dependencias:** Ninguna.
**Backfill:** No.
**Tests:** Miembro del hotel obtiene el historico; usuario de otro hotel recibe ACCESS_DENIED.

### [RO-APPSEC-205]
**Estado:** CONFIRMED
**Validacion:** Lei `create_check_record()`, `refresh_daily_closure()` y `resolve_appcc_incident()` en `00000000000021_m8_appcc_rpcs.sql`. Ninguna valida acceso/rol del caller. Las tablas APPCC si tienen policies — pero quedan bypassed por SECURITY DEFINER.
**Severidad ajustada:** Critical

#### Patch
```sql
-- create_check_record()
IF NOT has_hotel_role(p_hotel_id, ARRAY['superadmin','admin','direction','head_chef','cook']) THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;

-- refresh_daily_closure()
IF NOT has_hotel_role(p_hotel_id, ARRAY['superadmin','admin','direction','head_chef','cook']) THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;

-- resolve_appcc_incident()
IF NOT has_hotel_role(p_hotel_id, ARRAY['superadmin','admin','direction','head_chef']) THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;

REVOKE ALL ON FUNCTION create_check_record(uuid, uuid, date, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_check_record(uuid, uuid, date, numeric, text, text) TO authenticated;

REVOKE ALL ON FUNCTION refresh_daily_closure(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_daily_closure(uuid, date) TO authenticated;

REVOKE ALL ON FUNCTION resolve_appcc_incident(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_appcc_incident(uuid, uuid, text, text) TO authenticated;
```

**Riesgo de regresion:** Si `refresh_daily_closure()` se restringe mas que `create_check_record()`, la cadena se rompe.
**Dependencias:** Aplicar como bloque.
**Backfill:** No.
**Tests:** cook puede crear check; cook no puede resolver incidentes; head_chef y admin si; usuario de otro hotel no puede recalcular ni cerrar.

### [RO-APPSEC-206]
**Estado:** CONFIRMED
**Validacion:** En `00000000000029_price_history.sql` (line 173), `export_price_data_for_ml()` es SECURITY DEFINER, acepta `p_hotel_id` y no valida membership/rol. No encontre revocacion.
**Severidad ajustada:** Critical

#### Patch
```sql
CREATE OR REPLACE FUNCTION export_price_data_for_ml(p_hotel_id uuid)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  supplier_id uuid,
  supplier_name text,
  unit_price numeric,
  quantity numeric,
  date date,
  day_of_week int,
  month int,
  quarter int,
  price_ma_7d numeric,
  price_ma_30d numeric,
  price_std_30d numeric,
  volume_ma_30d numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF NOT has_hotel_role(p_hotel_id, ARRAY['superadmin','admin','direction','procurement']) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      ph.product_id,
      p.name AS product_name,
      ph.supplier_id,
      s.name AS supplier_name,
      ph.unit_price,
      ph.quantity,
      ph.date,
      EXTRACT(dow FROM ph.date)::int AS day_of_week,
      EXTRACT(month FROM ph.date)::int AS month,
      EXTRACT(quarter FROM ph.date)::int AS quarter
    FROM price_history ph
    JOIN products p ON p.id = ph.product_id
    JOIN suppliers s ON s.id = ph.supplier_id
    WHERE ph.hotel_id = p_hotel_id
    ORDER BY ph.product_id, ph.date
  )
  SELECT
    b.product_id,
    b.product_name,
    b.supplier_id,
    b.supplier_name,
    b.unit_price,
    b.quantity,
    b.date,
    b.day_of_week,
    b.month,
    b.quarter,
    AVG(b.unit_price) OVER (PARTITION BY b.product_id ORDER BY b.date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
    AVG(b.unit_price) OVER (PARTITION BY b.product_id ORDER BY b.date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW),
    STDDEV(b.unit_price) OVER (PARTITION BY b.product_id ORDER BY b.date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW),
    AVG(b.quantity) OVER (PARTITION BY b.product_id ORDER BY b.date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)
  FROM base b;
END;
$$;

REVOKE ALL ON FUNCTION export_price_data_for_ml(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION export_price_data_for_ml(uuid) TO authenticated;
```

**Riesgo de regresion:** El export dejara de funcionar para usuarios sin rol de compras/direccion.
**Dependencias:** Ninguna.
**Backfill:** No.
**Tests:** procurement y direction pueden exportar; cook y reception reciben ACCESS_DENIED; formato del dataset no cambia.

### [RO-APPSEC-207]
**Estado:** CONFIRMED
**Validacion:** En `00000000000031_document_vault.sql` (line 178), `vault_update_status` permite UPDATE directo con WITH CHECK tautologico. Revise ademas `cross_reference_documents()` como ruta privilegiada que puede seguir operando sin exponer UPDATE directo.
**Severidad ajustada:** High

#### Patch
```sql
DROP POLICY IF EXISTS "vault_update_status" ON document_vault;
DROP POLICY IF EXISTS "custody_insert" ON document_custody_log;
```

**Riesgo de regresion:** Si existe algun flujo que actualiza document_vault directamente desde el cliente, dejara de funcionar. No encontre uno en el repo.
**Dependencias:** Aplicar junto con RO-APPSEC-208.
**Backfill:** No.
**Tests:** store_document() sigue insertando; cross_reference_documents() sigue enlazando; usuario no puede hacer update directo ni insertar custody entries manuales.

### [RO-APPSEC-208]
**Estado:** CONFIRMED
**Validacion:** En `00000000000032_document_vault_rpcs.sql` (line 12) la RPC inserta `tenant_id = p_tenant_id` tras solo comprobar `has_hotel_access(p_hotel_id)`. El tenant_id autoritativo vive en `hotels.tenant_id`.
**Severidad ajustada:** High

#### Patch
```sql
-- Dentro de store_document(), anadir la variable
v_tenant_id UUID;

-- Justo antes del INSERT
SELECT tenant_id INTO v_tenant_id FROM hotels WHERE id = p_hotel_id;
IF v_tenant_id IS NULL THEN
  RAISE EXCEPTION 'Hotel not found';
END IF;

-- En el INSERT, sustituir p_tenant_id por v_tenant_id
```

**Riesgo de regresion:** Si luego cambias la firma y olvidas actualizar callers, romperas el upload del vault.
**Dependencias:** Aplicar primero en SQL y despues limpiar el caller TS.
**Backfill:** No para nuevas escrituras; si conviene auditar filas historicas con `document_vault.tenant_id <> hotels.tenant_id`.
**Tests:** Nuevo documento siempre queda con tenant_id = hotels.tenant_id; manipular p_tenant_id no cambia el tenant persistido.

### [RO-APPSEC-209]
**Estado:** CONFIRMED
**Validacion:** En `00000000000002_base0_rpcs.sql` lines 12 y 71, ambas funciones usan `p_user_id` sin compararlo con `auth.uid()`. Los callers reales lo pasan desde hooks.ts, service.ts y settings/team/page.tsx.
**Severidad ajustada:** Medium

#### Patch
```sql
-- Insertar al inicio del BEGIN de get_active_hotel()
IF p_user_id IS DISTINCT FROM auth.uid() THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;

-- Insertar al inicio del BEGIN de switch_active_hotel()
IF p_user_id IS DISTINCT FROM auth.uid() THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;
```

**Riesgo de regresion:** Ninguno para callers legitimos, porque ya envian user.id de la sesion.
**Dependencias:** Ninguna; retrocompatible.
**Backfill:** No.
**Tests:** Usuario puede leer/cambiar su hotel activo; no puede operar con p_user_id ajeno; useActiveHotel() y selector de hotel siguen funcionando.

### [RO-APPSEC-210]
**Estado:** CONFIRMED
**Validacion:** En `00000000000002_base0_rpcs.sql` lines 180 y 265, `direction` puede invitar o promocionar a `admin`. La UI tambien muestra admin como opcion.
**Severidad ajustada:** High

#### Patch
```sql
-- Dentro de invite_member(), despues de validar que el caller pertenece al hotel
IF p_role = 'admin' AND NOT EXISTS (
  SELECT 1 FROM memberships
  WHERE user_id = v_user_id AND hotel_id = p_hotel_id
    AND is_active = true AND role IN ('superadmin','admin')
) THEN
  RAISE EXCEPTION 'ACCESS_DENIED: solo admin/superadmin pueden invitar admins';
END IF;

-- Dentro de update_member_role(), despues de cargar v_membership
IF v_user_id = p_target_user_id AND p_new_role IS DISTINCT FROM v_membership.role THEN
  RAISE EXCEPTION 'ACCESS_DENIED: self role change disabled';
END IF;

IF p_new_role = 'admin' AND NOT EXISTS (
  SELECT 1 FROM memberships
  WHERE user_id = v_user_id AND hotel_id = p_hotel_id
    AND is_active = true AND role IN ('superadmin','admin')
) THEN
  RAISE EXCEPTION 'ACCESS_DENIED: solo admin/superadmin pueden asignar admin';
END IF;
```

**Riesgo de regresion:** Si la operacion actual depende de que direction cree admins, este cambio la corta deliberadamente.
**Dependencias:** Backend primero; luego UI para evitar opciones que acaben en error.
**Backfill:** No.
**Tests:** direction no puede invitar/promocionar admin; admin y superadmin si pueden; nadie puede autopromocionarse; pantalla de equipo no muestra admin a direction.

### [RO-APPSEC-211]
**Estado:** CONFIRMED
**Validacion:** Revise policies de catalog.sql y procurement.sql. Proveedores, ofertas, pedidos y recepciones permiten select/insert/update a cualquier membership activa del hotel, mientras el RBAC/UI en module-access.ts es mucho mas restrictivo.
**Severidad ajustada:** High

#### Patch
```sql
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;

CREATE POLICY "suppliers_select" ON suppliers FOR SELECT
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement','head_chef']));

CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT
  WITH CHECK (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']));

CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']))
  WITH CHECK (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']));

DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update" ON purchase_orders;

CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement','head_chef']));

CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT
  WITH CHECK (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']));

CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']))
  WITH CHECK (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']));

-- RPCs: generate_purchase_order, send_purchase_order, record_waste
-- Insertar al inicio de cada una:
IF NOT has_hotel_role(p_hotel_id, ARRAY['superadmin','admin','direction','procurement']) THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;
```

**Riesgo de regresion:** Patch con mas riesgo funcional; si head_chef o cook consumen vistas de compras fuera del RBAC documentado, perderan acceso.
**Dependencias:** Aplicar junto con revision de la matriz de roles por tabla y RPC hermana.
**Backfill:** No.
**Tests:** procurement mantiene lectura/escritura; head_chef solo lectura; cook ya no puede leer/modificar procurement.

### [RO-APPSEC-212]
**Estado:** CONFIRMED
**Validacion:** Las policies de base0_identity.sql dejan audit_logs y domain_events legibles para cualquier miembro. Revise productores de payload que vuelcan PII y datos operativos sensibles.
**Severidad ajustada:** High

#### Patch
```sql
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction']));

DROP POLICY IF EXISTS "domain_events_select" ON domain_events;
CREATE POLICY "domain_events_select"
  ON domain_events FOR SELECT
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction']));
```

**Riesgo de regresion:** Usuarios operativos dejaran de ver logs/eventos si hoy los consumen.
**Dependencias:** Ninguna.
**Backfill:** No.
**Tests:** admin y direction siguen viendo logs; cook, room, reception no los ven; writers internos no cambian.

### [RO-APPSEC-213]
**Estado:** CONFIRMED
**Validacion:** get_tenant_overview() y get_price_comparisons() solo exigen pertenecer al tenant; dashboard RPCs solo exigen membership al hotel. /multi-local no esta en MODULE_ACCESS; canAccessModule() permite por defecto.
**Severidad ajustada:** High

#### Patch
```sql
-- get_tenant_overview() y get_price_comparisons()
IF NOT EXISTS (
  SELECT 1 FROM memberships
  WHERE user_id = v_user_id AND tenant_id = p_tenant_id
    AND is_active = true AND role IN ('superadmin','admin','direction')
) THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;

-- generate_daily_snapshot(), get_dashboard_data(),
-- check_alert_thresholds() y dismiss_alert()
IF NOT EXISTS (
  SELECT 1 FROM memberships
  WHERE user_id = v_user_id AND hotel_id = p_hotel_id
    AND is_active = true AND role IN ('superadmin','admin','direction')
) THEN
  RAISE EXCEPTION 'ACCESS_DENIED';
END IF;
```

```typescript
// src/lib/rbac/module-access.ts — anadir
{ href: "/multi-local", roles: ["superadmin", "direction", "admin"] },
```

**Riesgo de regresion:** Si cambias canAccessModule() a deny-by-default en el mismo patch, puedes romper rutas no inventariadas.
**Dependencias:** Backend primero; luego UI.
**Backfill:** No.
**Tests:** direction y admin siguen viendo multi-local y dashboards; cook y reception ya no pueden invocar esas RPCs; /multi-local desaparece del acceso para roles no autorizados.

### [RO-APPSEC-214]
**Estado:** CONFIRMED
**Validacion:** En route.ts (line 142) la ruta solo verifica sesion y confia en created_by_name, created_by_email del body. El frontend normal solo envia { title, type }, confirmando que la API acepta mas de lo necesario.
**Severidad ajustada:** Medium

#### Patch
```typescript
interface TicketPayload {
  type: string
  title: string
  description: string
  priority: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const raw = (await request.json()) as Partial<TicketPayload>

    const ticket = {
      type: String(raw.type ?? "other"),
      title: String(raw.title ?? "(sin titulo)"),
      description: String(raw.description ?? ""),
      priority: String(raw.priority ?? "media"),
      created_by_name:
        (user.user_metadata?.full_name as string | undefined) ??
        user.email ?? "Usuario",
      created_by_email: user.email ?? "unknown@example.com",
      created_at: new Date().toISOString(),
    }
    // usar ticket a partir de aqui; ignorar cualquier created_by_* del body
```

**Riesgo de regresion:** Los correos dejaran de reflejar nombres/emails custom inyectados; eso es deseado.
**Dependencias:** Ninguna.
**Backfill:** No.
**Tests:** Email siempre usa identidad de la sesion; enviar created_by_email distinto no cambia el correo; ruta sigue respondiendo 401 sin sesion.

---

## Cross-Verification

- Los patches de RO-APPSEC-208 y RO-APPSEC-209 son retrocompatibles con los callers actuales: no exigen cambio inmediato de firma ni rompen hooks.ts/service.ts.
- En RO-APPSEC-205 se mantuvo refresh_daily_closure() compatible con create_check_record() para no romper la cadena existente.
- En RO-APPSEC-207 el bloqueo va por RLS directa, no por quitar las RPCs SECURITY DEFINER; eso preserva store_document(), cross_reference_documents() y los triggers internos.
- En RO-APPSEC-213 no se recomienda cambiar canAccessModule() a deny-by-default en el mismo despliegue: es una mejora valida, pero con alto riesgo de regresion lateral.
- RO-APPSEC-201 es el unico patch que requiere migracion de datos real; debe desplegarse en dos fases: anadir columnas + backfill, luego endurecer constraints si procede.

## Recommended Patch Order

1. **Grupo 1 (Critical RPCs):** RO-APPSEC-203, RO-APPSEC-204, RO-APPSEC-205, RO-APPSEC-206
2. **Grupo 2 (Identity/Privilege):** RO-APPSEC-209, RO-APPSEC-210
3. **Grupo 3 (Document Vault):** RO-APPSEC-207, RO-APPSEC-208
4. **Grupo 4 (Cross-tenant + backfill):** RO-APPSEC-201
5. **Grupo 5 (RBAC overbreadth):** RO-APPSEC-211, RO-APPSEC-212, RO-APPSEC-213
6. **Grupo 6 (Email relay):** RO-APPSEC-214
7. **Grupo 7 (Edge Functions):** RO-APPSEC-202 (tras validar runtime real)

## Final Summary

| Metrica | Valor |
|---|---|
| Hallazgos confirmados | 13 de 14 |
| Falsos positivos | 0 |
| Pendientes runtime | 1 (RO-APPSEC-202) |
| Critical | 5 (201, 203, 204, 205, 206) |
| High | 6 (207, 208, 210, 211, 212, 213) |
| Medium | 2 (209, 214) |
| Patches con backfill | 1 (201) |

## Archivos que requieren pentest manual post-patches

- `supabase/migrations/00000000000002_base0_rpcs.sql`
- `supabase/migrations/00000000000019_m10_feedback.sql`
- `supabase/migrations/00000000000021_m8_appcc_rpcs.sql`
- `supabase/migrations/00000000000022_fix_rls_recursion.sql`
- `supabase/migrations/00000000000029_price_history.sql`
- `supabase/migrations/00000000000031_document_vault.sql`
- `supabase/migrations/00000000000032_document_vault_rpcs.sql`
- `supabase/functions/_shared/utils.ts`
- `supabase/functions/agent-appcc/index.ts`
- `supabase/functions/agent-escandallo/index.ts`
- `supabase/functions/agent-menu-engineering/index.ts`
- `supabase/functions/agent-integrity/index.ts`
- `supabase/functions/clara-collector/index.ts`
- `supabase/functions/clara-ocr/index.ts`
- `supabase/functions/clara-reconciler/index.ts`
- `supabase/functions/clara-messenger/index.ts`
- `src/lib/document-vault/vault-service.ts`
- `src/app/api/notify-ticket/route.ts`
- `src/app/(dashboard)/settings/team/page.tsx`
- `src/lib/auth/hooks.ts`
- `scripts/test-clara-real.ts`
- `scripts/test-agents.ts`
- `scripts/seed-synthetic.ts`

## Supuestos de arquitectura no verificados

1. Que produccion ejecuta exactamente estas migrations y grants.
2. Que no existe un API gateway/secreto externo protegiendo las Edge Functions vulnerables.
3. Que documentos, document-vault y document-vault-backup usan policies acordes al prefijo por hotel_id.
4. Que NOTIFY_EMAIL y otros buzones son compartidos entre tenants y no estan aislados por cliente.
5. Que no hay controles de rate limiting o abuse detection aplicados fuera del repo.
