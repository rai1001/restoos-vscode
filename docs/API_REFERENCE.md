# ChefOS API Reference

ChefOS no expone endpoints REST propios. Toda la logica de negocio se ejecuta via **Supabase RPCs** (funciones PostgreSQL `security definer`) invocadas desde el cliente con `supabase.rpc()`.

Ademas, las tablas exponen operaciones CRUD directas via la API REST auto-generada de Supabase, protegidas por Row Level Security (RLS).

---

## Autenticacion

Todas las llamadas requieren un JWT valido de Supabase Auth. El token se incluye automaticamente por el cliente `@supabase/ssr`.

```typescript
import { createClient } from "@/lib/db/client";
const supabase = createClient();

// Las RPCs validan internamente que auth.uid() tenga membership activa en el hotel
const { data, error } = await supabase.rpc("nombre_funcion", { params });
```

---

## Convenciones

- Todas las RPCs reciben `p_hotel_id uuid` como primer parametro
- Retornan `jsonb` con la estructura del resultado
- Validan acceso via `memberships` (no confiar en el cliente)
- Errores se lanzan como excepciones PostgreSQL con codigos estandar: `ACCESS_DENIED`, `NOT_FOUND`, `INVALID_STATE`, `MISSING_REQUIRED_DATA`, `INSUFFICIENT_STOCK`

---

## D0 — Identidad

### get_active_hotel

Obtiene el hotel activo del usuario actual.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_user_id` | `uuid` | ID del usuario |

**Respuesta:**
```json
{
  "hotel_id": "uuid",
  "hotel_name": "Gran Hotel Madrid",
  "role": "head_chef",
  "tenant_id": "uuid"
}
```

---

### switch_active_hotel

Cambia el hotel activo del usuario.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_user_id` | `uuid` | ID del usuario |
| `p_hotel_id` | `uuid` | Hotel destino |

**Respuesta:**
```json
{ "hotel_id": "uuid", "switched": true }
```

---

### create_hotel

Crea un hotel dentro de un tenant.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_tenant_id` | `uuid` | Tenant padre |
| `p_name` | `text` | Nombre del hotel |
| `p_slug` | `text` | Slug URL-friendly |
| `p_timezone` | `text` | Zona horaria (ej: `Europe/Madrid`) |
| `p_currency` | `text` | Moneda (ej: `EUR`) |

**Respuesta:**
```json
{ "hotel_id": "uuid", "name": "Hotel Nuevo" }
```

---

### invite_member

Invita un usuario existente al hotel con un rol.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_email` | `text` | Email del usuario |
| `p_role` | `text` | Rol: `direction`, `head_chef`, `sous_chef`, `cook`, `commercial`, `procurement`, `warehouse`, `room`, `reception`, `admin` |

**Errores:** `NOT_FOUND` (usuario no existe), `CONFLICT` (ya es miembro)

---

### update_member_role

Cambia el rol de un miembro.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_target_user_id` | `uuid` | Usuario destino |
| `p_new_role` | `text` | Nuevo rol |

---

### deactivate_member

Desactiva la membresia de un usuario (soft delete).

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_target_user_id` | `uuid` | Usuario a desactivar |

**Errores:** `INVALID_STATE` (no puede desactivarse a si mismo)

---

## M3 — Catalogo

### upsert_product

Crea o actualiza un producto. Si `p_product_id` es `null`, crea uno nuevo.

| Parametro | Tipo | Obligatorio | Descripcion |
|---|---|---|---|
| `p_hotel_id` | `uuid` | Si | Hotel |
| `p_product_id` | `uuid` | No | ID existente (null = crear) |
| `p_name` | `text` | Si | Nombre del producto |
| `p_category_id` | `uuid` | No | Categoria |
| `p_default_unit_id` | `uuid` | No | Unidad por defecto |
| `p_is_active` | `boolean` | No | Activo (default true) |
| `p_allergens` | `jsonb` | No | Array de alergenos |
| `p_notes` | `text` | No | Notas |

**Respuesta:**
```json
{ "product_id": "uuid", "action": "created" }
```

---

### upsert_supplier

Crea o actualiza un proveedor.

| Parametro | Tipo | Obligatorio | Descripcion |
|---|---|---|---|
| `p_hotel_id` | `uuid` | Si | Hotel |
| `p_supplier_id` | `uuid` | No | ID existente (null = crear) |
| `p_name` | `text` | Si | Nombre comercial |
| `p_contact_name` | `text` | No | Persona de contacto |
| `p_email` | `text` | No | Email |
| `p_phone` | `text` | No | Telefono |
| `p_address` | `text` | No | Direccion |
| `p_tax_id` | `text` | No | NIF/CIF |
| `p_is_active` | `boolean` | No | Activo |
| `p_notes` | `text` | No | Notas |

---

### set_preferred_offer

Marca una oferta de proveedor como preferida para un producto (desmarca la anterior).

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_offer_id` | `uuid` | ID de la oferta |

---

### search_products

Busqueda de productos por texto libre con filtro de categoria.

| Parametro | Tipo | Obligatorio | Descripcion |
|---|---|---|---|
| `p_hotel_id` | `uuid` | Si | Hotel |
| `p_query` | `text` | Si | Texto a buscar (ILIKE) |
| `p_category_id` | `uuid` | No | Filtrar por categoria |
| `p_limit` | `integer` | No | Max resultados (default 20) |

**Respuesta:**
```json
[
  { "id": "uuid", "name": "Solomillo de Ternera", "category": "Carnes > Res", "sku": "CARN-001" }
]
```

---

### match_product_by_alias

Busca productos por alias (para matching IA/OCR).

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_alias_text` | `text` | Texto del alias |

**Respuesta:**
```json
[
  { "product_id": "uuid", "name": "Solomillo de Ternera", "confidence": "exact" }
]
```

---

### get_product_with_offers

Detalle de producto con todas las ofertas de proveedores.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_product_id` | `uuid` | Producto |

---

## M1 — Eventos

### create_event

Crea un evento en estado `draft`.

| Parametro | Tipo | Obligatorio | Descripcion |
|---|---|---|---|
| `p_hotel_id` | `uuid` | Si | Hotel |
| `p_client_id` | `uuid` | No | Cliente asociado |
| `p_name` | `text` | Si | Nombre del evento |
| `p_event_type` | `text` | Si | Tipo: `wedding`, `corporate_dinner`, `cocktail`, `banquet`, etc. |
| `p_event_date` | `date` | Si | Fecha del evento |
| `p_start_time` | `time` | No | Hora inicio |
| `p_end_time` | `time` | No | Hora fin |
| `p_guest_count` | `integer` | Si | Numero de invitados |
| `p_venue` | `text` | No | Salon/ubicacion |
| `p_notes` | `text` | No | Notas |

**Respuesta:**
```json
{ "event_id": "uuid", "status": "draft", "version": 1 }
```

---

### update_event

Actualiza un evento. Crea snapshot de version anterior.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_event_id` | `uuid` | Evento |
| `p_name` ... `p_notes` | varios | Campos a actualizar |
| `p_change_reason` | `text` | Motivo del cambio (para auditoria) |

**Efecto:** Incrementa version, crea `event_versions` snapshot, emite `event.updated`.

---

### confirm_event

Confirma un evento. **Requiere al menos un menu asignado.**

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_event_id` | `uuid` | Evento en estado `draft` o `pending_confirmation` |

**Errores:** `INVALID_STATE` (estado incorrecto), `MISSING_REQUIRED_DATA` (sin menus)

**Efecto:** Cambia status a `confirmed`, emite `event.confirmed`.

---

### cancel_event

Cancela un evento no terminal.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_event_id` | `uuid` | Evento |
| `p_reason` | `text` | Motivo de cancelacion |

**Efecto:** Emite `event.cancelled`.

---

### start_event_operation / complete_event

Transiciones de estado: `confirmed` → `in_operation` → `completed`.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_event_id` | `uuid` | Evento |

---

### get_events_calendar

Eventos en un rango de fechas para vista calendario.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_from` | `date` | Fecha inicio |
| `p_to` | `date` | Fecha fin |

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "name": "Boda Garcia",
    "event_date": "2026-03-25",
    "guest_count": 200,
    "status": "confirmed",
    "client_name": "Beatriz Fernandez"
  }
]
```

---

## M2 — Recetas y Menus

### create_recipe

Crea receta en estado `draft`.

| Parametro | Tipo | Obligatorio | Descripcion |
|---|---|---|---|
| `p_hotel_id` | `uuid` | Si | Hotel |
| `p_name` | `text` | Si | Nombre |
| `p_description` | `text` | No | Descripcion |
| `p_category` | `text` | No | Categoria (texto libre) |
| `p_servings` | `integer` | Si | Raciones |
| `p_prep_time_min` | `integer` | No | Tiempo preparacion (min) |
| `p_cook_time_min` | `integer` | No | Tiempo coccion (min) |
| `p_notes` | `text` | No | Notas |

---

### update_recipe

Actualiza receta (solo `draft` o `review_pending`). Crea snapshot de version.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_recipe_id` | `uuid` | Receta |
| *(campos actualizables)* | varios | Nombre, descripcion, etc. |
| `p_change_reason` | `text` | Motivo del cambio |

---

### submit_recipe_for_review

Envia receta a revision. **Requiere al menos 1 ingrediente.**

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_recipe_id` | `uuid` | Receta en estado `draft` |

**Errores:** `MISSING_REQUIRED_DATA` (sin ingredientes)

---

### approve_recipe

Aprueba receta. **Solo `head_chef`, `direction` o `admin`.**

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_recipe_id` | `uuid` | Receta en estado `review_pending` |

**Efecto:** Emite `recipe.approved`.

---

### deprecate_recipe

Marca receta aprobada como deprecada.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_recipe_id` | `uuid` | Receta en estado `approved` |

---

### calculate_recipe_cost

Calcula coste basado en ingredientes x oferta preferida del proveedor.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_recipe_id` | `uuid` | Receta |

**Respuesta:**
```json
{
  "total_cost": 50.00,
  "cost_per_serving": 12.50,
  "ingredients": [
    { "product": "Solomillo de Ternera", "quantity": 1.5, "unit_cost": 32.50, "line_cost": 48.75 }
  ]
}
```

---

### calculate_menu_cost

Suma coste por racion de todas las recetas del menu.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_menu_id` | `uuid` | Menu |

**Respuesta:**
```json
{ "total_cost_per_guest": 42.50, "recipe_count": 5 }
```

---

### get_recipe_tech_sheet

Ficha tecnica completa: receta + ingredientes con costes + pasos ordenados.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_recipe_id` | `uuid` | Receta |

---

## M6 — Operaciones

### generate_event_workflow

Genera workflow automatico desde un evento confirmado: crea tareas por departamento (cocina, sala, almacen) y lista de mise en place.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_event_id` | `uuid` | Evento confirmado |

**Respuesta:**
```json
{
  "workflow_id": "uuid",
  "tasks_created": 6,
  "mise_en_place_items": 12
}
```

---

### assign_task

Asigna tarea a un miembro del hotel.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_task_id` | `uuid` | Tarea |
| `p_assigned_to` | `uuid` | ID del usuario |

---

### start_task / complete_task

Transiciones: `todo` → `in_progress` → `done`. `complete_task` verifica si todo el workflow esta completado.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_task_id` | `uuid` | Tarea |

---

### block_task

Bloquea una tarea con motivo. Marca el workflow como `at_risk`.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_task_id` | `uuid` | Tarea |
| `p_reason` | `text` | Motivo del bloqueo |

**Efecto:** Emite `task.blocked`, workflow pasa a `at_risk`.

---

### update_workflow_status

Actualiza estado del workflow. Si se cancela, cancela todas las tareas pendientes.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_workflow_id` | `uuid` | Workflow |
| `p_status` | `text` | Nuevo estado |

---

### mark_mise_en_place_item

Marca/desmarca item del checklist de mise en place.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_item_id` | `uuid` | Item del checklist |
| `p_is_done` | `boolean` | Completado o no |

---

## M4 — Compras

### create_purchase_request

Crea solicitud de compra con numero unico auto-generado.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_event_id` | `uuid` | Evento asociado (opcional) |
| `p_notes` | `text` | Notas |

---

### approve_purchase_request

Aprueba solicitud. **Solo `procurement`, `direction` o `admin`.**

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_request_id` | `uuid` | Solicitud |

---

### generate_purchase_order

Crea pedido de compra con numero unico.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_supplier_id` | `uuid` | Proveedor |
| `p_expected_delivery` | `date` | Fecha entrega esperada |
| `p_notes` | `text` | Notas |

---

### send_purchase_order

Envia el pedido. Calcula total, **requiere al menos 1 linea.**

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_order_id` | `uuid` | Pedido |

**Errores:** `MISSING_REQUIRED_DATA` (sin lineas)

**Efecto:** Emite `purchase_order.sent`.

---

### receive_goods

Recibe mercancia. Crea lotes de stock, movimientos de recepcion, actualiza PO.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_order_id` | `uuid` | Pedido |
| `p_lines` | `jsonb` | Array: `[{ "product_id", "quantity", "unit_cost", "batch_number", "expiry_date" }]` |
| `p_notes` | `text` | Notas de recepcion |

**Respuesta:**
```json
{
  "receipt_id": "uuid",
  "lots_created": 5,
  "order_status": "received"
}
```

**Efecto:** Crea `stock_lots` + `stock_movements` tipo `reception`, emite `goods_receipt.applied`.

---

## M5 — Inventario

### reserve_stock_for_event

Reserva stock FIFO (por fecha caducidad) para un evento. Calcula shortfalls.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_event_id` | `uuid` | Evento |

**Respuesta:**
```json
{
  "reservations_created": 8,
  "shortfalls": [
    { "product": "Gambas Rojas", "needed": 10, "available": 3, "deficit": 7 }
  ]
}
```

**Efecto:** Emite `stock.reserved_for_event`.

---

### consume_stock

Consume stock reservado.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_reservation_id` | `uuid` | Reserva |
| `p_quantity` | `numeric` | Cantidad a consumir |

**Errores:** `INSUFFICIENT_STOCK` (excede reserva disponible)

---

### record_waste

Registra merma/desperdicio de un lote.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_product_id` | `uuid` | Producto |
| `p_lot_id` | `uuid` | Lote |
| `p_quantity` | `numeric` | Cantidad perdida |
| `p_notes` | `text` | Motivo de la merma |

---

### get_stock_levels

Niveles de stock actuales derivados de lotes (nunca un contador).

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |

**Respuesta:**
```json
[
  {
    "product_id": "uuid",
    "product_name": "Tomate RAF",
    "total_quantity": 12,
    "lot_count": 2,
    "earliest_expiry": "2026-03-22"
  }
]
```

---

### calculate_real_cost

Coste real de un evento basado en stock consumido (vs coste teorico de recetas).

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_event_id` | `uuid` | Evento |

**Respuesta:**
```json
{
  "theoretical_cost": 1200.00,
  "real_cost": 1150.50,
  "variance_pct": -4.12
}
```

---

### check_stock_alerts

Productos proximos a caducar.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_min_days_to_expiry` | `integer` | Umbral en dias (default 3) |

---

## M8 — Automatizacion

### enqueue_automation_jobs

Encola un job desde un domain event.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_domain_event_id` | `uuid` | Evento de dominio origen |
| `p_job_type` | `text` | Tipo: `generate_briefing`, `dispatch_webhook`, etc. |
| `p_payload` | `jsonb` | Datos para el procesador |

---

### process_automation_job

Registra resultado de un job. Retry automatico con backoff exponencial. Mueve a `dead_letter` tras max intentos.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_job_id` | `uuid` | Job |
| `p_success` | `boolean` | Exito o fallo |
| `p_result` | `jsonb` | Resultado (si exito) |
| `p_error_message` | `text` | Error (si fallo) |
| `p_duration_ms` | `integer` | Duracion en ms |

---

### retry_automation_job

Reintenta un job fallido o dead_letter.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_job_id` | `uuid` | Job |

---

### mark_jobs_obsolete / mark_documents_obsolete

Marca jobs o documentos como obsoletos por entidad.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_entity_type` | `text` | Tipo de entidad (ej: `event`) |
| `p_entity_id` | `uuid` | ID de la entidad |

---

### generate_kitchen_briefing

Genera documento de briefing de cocina para un evento. Marca briefings anteriores como obsoletos.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_event_id` | `uuid` | Evento |

---

### dispatch_webhook

Crea entrega de webhook para una integracion activa.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_integration_id` | `uuid` | Integracion webhook |
| `p_domain_event_id` | `uuid` | Evento de dominio |
| `p_payload` | `jsonb` | Payload a enviar |

---

### test_integration_connection

Crea test de conexion pendiente (HTTP real via Edge Function).

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_integration_id` | `uuid` | Integracion |

---

## M7 — Direccion y Reporting

### generate_daily_snapshot

Genera/actualiza snapshot KPI diario con ~20 metricas (eventos, recetas, tareas, compras, inventario, jobs, alertas).

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_date` | `date` | Fecha (default: hoy) |

**Respuesta:**
```json
{
  "snapshot_id": "uuid",
  "date": "2026-03-17",
  "data": {
    "events_total": 25,
    "events_confirmed": 8,
    "tasks_pending": 12,
    "stock_expiring_3d": 2,
    "..."
  }
}
```

---

### get_dashboard_data

Datos live del dashboard: KPIs actuales + tendencia 7d + eventos proximos + alertas + tareas bloqueadas.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |

**Respuesta:**
```json
{
  "current": {
    "events_confirmed": 3,
    "events_today": 1,
    "events_upcoming_7d": 2,
    "tasks_pending": 5,
    "tasks_blocked": 1,
    "recipes_pending_review": 1,
    "po_pending": 2,
    "stock_expiring_3d": 1,
    "alerts_active": 2,
    "jobs_failed": 0
  },
  "trend_7d": [ { "date": "2026-03-10", "data": { "..." } } ],
  "upcoming_events": [ { "id": "uuid", "name": "...", "event_date": "...", "guest_count": 120, "status": "confirmed" } ],
  "active_alerts": [ { "id": "uuid", "title": "...", "severity": "warning", "alert_type": "stock_expiring" } ],
  "blocked_tasks": [ { "id": "uuid", "title": "...", "department": "kitchen", "blocked_reason": "..." } ]
}
```

---

### check_alert_thresholds

Verifica condiciones y crea alertas automaticas (stock caducando, tareas bloqueadas, jobs fallidos). No duplica alertas activas recientes.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |

**Respuesta:**
```json
{ "alerts_created": 2 }
```

---

### dismiss_alert

Descarta una alerta activa.

| Parametro | Tipo | Descripcion |
|---|---|---|
| `p_hotel_id` | `uuid` | Hotel |
| `p_alert_id` | `uuid` | Alerta |

**Errores:** `NOT_FOUND` (ya descartada o no existe)

---

## Tablas con acceso directo (CRUD via REST)

Ademas de las RPCs, estas tablas soportan operaciones directas via la API REST de Supabase (protegidas por RLS):

| Tabla | Operaciones | Notas |
|---|---|---|
| `categories` | CRUD | Arbol con `parent_id` |
| `units_of_measure` | CRUD | Con factor de conversion |
| `products` | Read | Escritura via `upsert_product` |
| `suppliers` | Read | Escritura via `upsert_supplier` |
| `supplier_offers` | CRUD | `is_preferred` via `set_preferred_offer` |
| `product_aliases` | CRUD | Para matching IA |
| `clients` | CRUD | |
| `event_menus` | CRUD | Vinculo evento-menu |
| `recipe_ingredients` | CRUD | |
| `recipe_steps` | CRUD | |
| `menu_sections` | CRUD | |
| `menu_section_recipes` | CRUD | Vinculo seccion-receta |
| `purchase_order_lines` | CRUD | |
| `purchase_request_lines` | CRUD | |
| `stock_lots` | Read | Creacion via `receive_goods` |
| `stock_movements` | Read | Inmutable |
| `automation_jobs` | Read | Gestion via RPCs |
| `documents` | Read | |
| `integrations` | CRUD | |
| `alerts` | Read | Gestion via RPCs |
| `audit_logs` | Read | Append-only |
| `domain_events` | Read | Emitidos por RPCs |
