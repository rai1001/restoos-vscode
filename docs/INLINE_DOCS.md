# ChefOS — Documentacion Inline (JSDoc)

Referencia de JSDoc para las funciones publicas de cada capa del stack frontend. Estas anotaciones documentan los servicios, hooks y utilidades que componen la API interna de la aplicacion.

---

## Servicios (features/*/services/)

Los servicios son la capa de acceso a datos. Invocan RPCs de Supabase o queries directas.

### events/services/event.service.ts

```typescript
/**
 * Crea un evento nuevo en estado draft.
 *
 * @param hotelId - UUID del hotel activo
 * @param input - Datos del evento validados con CreateEventInput
 * @returns Objeto con event_id, status y version
 * @throws PostgrestError con code ACCESS_DENIED si el usuario no tiene membership
 * @throws PostgrestError con code VALIDATION_ERROR si faltan campos requeridos
 *
 * @example
 * const result = await eventService.createEvent(hotelId, {
 *   name: "Boda Garcia",
 *   event_type: "wedding",
 *   event_date: "2026-04-15",
 *   guest_count: 200,
 * });
 * // result = { event_id: "uuid", status: "draft", version: 1 }
 */
createEvent(hotelId: string, input: CreateEventInput): Promise<unknown>

/**
 * Confirma un evento. Requiere al menos un menu asignado.
 * Transicion: draft | pending_confirmation → confirmed.
 *
 * @param hotelId - UUID del hotel
 * @param eventId - UUID del evento a confirmar
 * @returns Objeto con event_id y nuevo status
 * @throws PostgrestError con code INVALID_STATE si el evento no esta en draft/pending
 * @throws PostgrestError con code MISSING_REQUIRED_DATA si no hay menus asignados
 *
 * @example
 * await eventService.confirmEvent(hotelId, eventId);
 */
confirmEvent(hotelId: string, eventId: string): Promise<unknown>

/**
 * Obtiene eventos en un rango de fechas para vista calendario.
 *
 * @param hotelId - UUID del hotel
 * @param from - Fecha inicio (ISO date string)
 * @param to - Fecha fin (ISO date string)
 * @returns Array de eventos con id, name, event_date, guest_count, status, client_name
 *
 * @example
 * const events = await eventService.getEventsCalendar(hotelId, "2026-03-01", "2026-03-31");
 */
getEventsCalendar(hotelId: string, from: string, to: string): Promise<unknown>
```

### recipes/services/recipe.service.ts

```typescript
/**
 * Calcula el coste de una receta sumando (cantidad_ingrediente * precio_oferta_preferida).
 *
 * @param hotelId - UUID del hotel
 * @param recipeId - UUID de la receta
 * @returns Objeto con total_cost, cost_per_serving, y detalle por ingrediente
 * @throws PostgrestError si la receta no existe o no tiene ingredientes
 *
 * @example
 * const cost = await recipeService.calculateCost(hotelId, recipeId);
 * // cost = { total_cost: 50.00, cost_per_serving: 12.50, ingredients: [...] }
 */
calculateCost(hotelId: string, recipeId: string): Promise<unknown>

/**
 * Obtiene ficha tecnica completa: receta + ingredientes con unidades y costes + pasos.
 *
 * @param hotelId - UUID del hotel
 * @param recipeId - UUID de la receta
 * @returns Objeto jsonb con toda la informacion de la ficha tecnica
 */
getTechSheet(hotelId: string, recipeId: string): Promise<unknown>
```

### catalog/services/catalog.service.ts

```typescript
/**
 * Busca productos por texto libre. Busca en nombre, SKU y aliases.
 *
 * @param hotelId - UUID del hotel
 * @param query - Texto a buscar (minimo 1 caracter)
 * @param categoryId - Filtrar por categoria (opcional)
 * @param limit - Maximo de resultados, default 20
 * @returns Array de productos con id, name, category, sku
 *
 * @example
 * const results = await catalogService.searchProducts(hotelId, "tomate");
 * // results = [{ id: "uuid", name: "Tomate RAF", ... }]
 */
searchProducts(hotelId: string, query: string, categoryId?: string, limit?: number): Promise<unknown>

/**
 * Obtiene producto con todas sus ofertas de proveedores.
 *
 * @param hotelId - UUID del hotel
 * @param productId - UUID del producto
 * @returns Producto completo con array de ofertas (proveedor, precio, plazo, is_preferred)
 */
getProductWithOffers(hotelId: string, productId: string): Promise<unknown>
```

### procurement/services/procurement.service.ts

```typescript
/**
 * Recibe mercancia de un pedido. Crea lotes de stock y movimientos.
 *
 * @param hotelId - UUID del hotel
 * @param orderId - UUID del pedido de compra
 * @param lines - Array de lineas: [{ product_id, quantity, unit_cost, batch_number?, expiry_date? }]
 * @param notes - Notas de recepcion (opcional)
 * @returns Objeto con receipt_id, lots_created, order_status
 * @throws PostgrestError con code INVALID_STATE si el PO no esta en estado sent
 *
 * @example
 * const receipt = await procurementService.receiveGoods(hotelId, orderId, [
 *   { product_id: "uuid", quantity: 10, unit_cost: 4.50, expiry_date: "2026-03-25" }
 * ]);
 */
receiveGoods(hotelId: string, orderId: string, lines: ReceiveGoodsLine[], notes?: string): Promise<unknown>
```

### inventory/services/inventory.service.ts

```typescript
/**
 * Reserva stock FIFO para un evento. Consume lotes por orden de caducidad.
 * Reporta shortfalls si no hay suficiente stock.
 *
 * @param hotelId - UUID del hotel
 * @param eventId - UUID del evento (debe estar confirmado)
 * @returns Objeto con reservations_created y array de shortfalls
 *
 * @example
 * const result = await inventoryService.reserveStockForEvent(hotelId, eventId);
 * if (result.shortfalls.length > 0) {
 *   // Hay productos sin stock suficiente
 * }
 */
reserveStockForEvent(hotelId: string, eventId: string): Promise<unknown>

/**
 * Consume stock de una reserva existente.
 *
 * @param hotelId - UUID del hotel
 * @param reservationId - UUID de la reserva
 * @param quantity - Cantidad a consumir
 * @throws PostgrestError con code INSUFFICIENT_STOCK si excede la cantidad reservada
 */
consumeStock(hotelId: string, reservationId: string, quantity: number): Promise<unknown>

/**
 * Obtiene niveles de stock actuales. Derivados de lotes, no de un contador.
 *
 * @param hotelId - UUID del hotel
 * @returns Array de { product_id, product_name, total_quantity, lot_count, earliest_expiry }
 */
getStockLevels(hotelId: string): Promise<unknown>
```

### reporting/services/reporting.service.ts

```typescript
/**
 * Obtiene datos live del dashboard: KPIs + tendencia + eventos + alertas + tareas bloqueadas.
 *
 * @param hotelId - UUID del hotel
 * @returns Objeto con current (10 KPIs), trend_7d, upcoming_events, active_alerts, blocked_tasks
 *
 * @example
 * const dashboard = await reportingService.getDashboardData(hotelId);
 * console.log(dashboard.current.events_confirmed); // 3
 */
getDashboardData(hotelId: string): Promise<unknown>

/**
 * Genera snapshot KPI diario. Upsert: si ya existe para la fecha, lo sobreescribe.
 *
 * @param hotelId - UUID del hotel
 * @param date - Fecha ISO (default: hoy)
 * @returns Objeto con snapshot_id, date, data (20 metricas)
 */
generateSnapshot(hotelId: string, date?: string): Promise<unknown>
```

---

## Hooks (features/*/hooks/)

Los hooks envuelven servicios con TanStack Query. Gestionan cache, invalidacion y optimistic updates.

### Patron general

```typescript
/**
 * Hook para obtener datos de [entidad].
 * Requiere hotel activo via useActiveHotel().
 * Refetch automatico cuando hotelId cambia.
 *
 * @returns UseQueryResult con data, isLoading, error
 */
export function use[Entity](): UseQueryResult<Entity[]>

/**
 * Hook de mutacion para [accion].
 * Invalida queries relacionadas on success.
 * Muestra toast via sonner.
 *
 * @returns UseMutationResult
 */
export function use[Action](): UseMutationResult
```

### Hooks de eventos

```typescript
/**
 * Lista de eventos del hotel activo.
 * Query key: ["events", hotelId]
 *
 * @returns UseQueryResult<Event[]>
 */
export function useEvents(): UseQueryResult

/**
 * Confirma un evento. Invalida ["events"] y ["dashboard"].
 * Muestra toast "Evento confirmado" on success.
 *
 * @returns UseMutationResult donde mutate recibe eventId: string
 *
 * @example
 * const confirmEvent = useConfirmEvent();
 * confirmEvent.mutate(eventId);
 */
export function useConfirmEvent(): UseMutationResult
```

### Hooks de recetas

```typescript
/**
 * Calcula el coste de una receta.
 * No es una query sino una mutacion (calculo on-demand).
 *
 * @returns UseMutationResult donde mutate recibe recipeId: string
 * @example
 * const calculateCost = useCalculateRecipeCost();
 * calculateCost.mutate(recipeId, {
 *   onSuccess: (data) => console.log(data.cost_per_serving),
 * });
 */
export function useCalculateRecipeCost(): UseMutationResult
```

### Hooks de inventario

```typescript
/**
 * Niveles de stock actuales del hotel.
 * Query key: ["stock-levels", hotelId]
 * Se invalida cuando se recibe mercancia o se consume stock.
 *
 * @returns UseQueryResult<StockLevel[]>
 */
export function useStockLevels(): UseQueryResult

/**
 * Reserva stock FIFO para un evento.
 * Invalida ["stock-levels"], ["stock-reservations"], ["events"].
 *
 * @returns UseMutationResult donde mutate recibe eventId: string
 */
export function useReserveStock(): UseMutationResult
```

---

## Utilidades (lib/)

### lib/db/client.ts

```typescript
/**
 * Crea un cliente Supabase para el lado del navegador.
 * Usa @supabase/ssr para manejo automatico de cookies.
 * Las credenciales se toman de NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * @returns SupabaseClient configurado para browser
 *
 * @example
 * import { createClient } from "@/lib/db/client";
 * const supabase = createClient();
 * const { data } = await supabase.from("events").select("*");
 */
export function createClient(): SupabaseClient
```

### lib/auth/hooks.ts

```typescript
/**
 * Hook para obtener el hotel activo del usuario autenticado.
 * Usado en practicamente todos los hooks de features.
 *
 * @returns { hotelId: string | null, role: string, isLoading: boolean }
 *
 * @example
 * const { hotelId } = useActiveHotel();
 * // hotelId es null si no hay hotel activo (ej: primer login)
 */
export function useActiveHotel(): { hotelId: string | null; role: string; isLoading: boolean }
```

### lib/utils/index.ts

```typescript
/**
 * Merge de clases CSS con soporte de conflictos Tailwind.
 * Wrapper sobre clsx + tailwind-merge.
 *
 * @param inputs - Clases CSS (strings, arrays, condicionales)
 * @returns String de clases mergeadas sin conflictos
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", "px-6")
 * // → "py-2 bg-primary px-6" (px-4 mergeado con px-6)
 */
export function cn(...inputs: ClassValue[]): string
```

---

## Schemas (features/*/schemas/)

Todos los schemas usan Zod v4. Patron comun:

```typescript
/**
 * Schema de validacion para Event.
 * Representa un evento completo como viene de la base de datos.
 *
 * @property id - UUID auto-generado
 * @property hotel_id - UUID del hotel (RLS)
 * @property name - Nombre del evento
 * @property status - Estado: draft | pending_confirmation | confirmed | in_operation | completed | cancelled
 * @property event_date - Fecha ISO del evento
 * @property guest_count - Numero de invitados
 * @property version - Version actual (incrementada en cada update)
 */
export const EventSchema = z.object({ ... });
export type Event = z.infer<typeof EventSchema>;

/**
 * Schema de input para creacion. Subset del schema completo,
 * sin campos auto-generados (id, hotel_id, created_at, version).
 */
export const CreateEventInputSchema = z.object({ ... });
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
```

---

## Componentes compartidos

### components/empty-state.tsx

```typescript
/**
 * Estado vacio reutilizable para paginas sin datos.
 * Muestra icono, titulo, descripcion opcional y CTA.
 *
 * @param icon - Componente de icono (lucide-react)
 * @param title - Titulo principal
 * @param description - Texto explicativo (opcional)
 * @param actionLabel - Texto del boton CTA (opcional)
 * @param actionHref - URL destino del CTA (opcional)
 *
 * @example
 * <EmptyState
 *   icon={CalendarDays}
 *   title="No hay eventos"
 *   description="Crea tu primer evento"
 *   actionLabel="Crear evento"
 *   actionHref="/events/new"
 * />
 */
export function EmptyState(props: EmptyStateProps): JSX.Element
```

### components/page-skeleton.tsx

```typescript
/**
 * Skeleton de tabla para estados de carga.
 *
 * @param rows - Numero de filas (default 5)
 * @param cols - Numero de columnas (default 4)
 *
 * @example
 * {isLoading ? <TableSkeleton cols={5} /> : <Table>...</Table>}
 */
export function TableSkeleton(props: { rows?: number; cols?: number }): JSX.Element

/**
 * Skeleton de grid KPI para el dashboard.
 *
 * @param count - Numero de cards (default 5)
 */
export function KpiGridSkeleton(props: { count?: number }): JSX.Element

/**
 * Skeleton completo del dashboard principal.
 * Combina KpiGridSkeleton, CardListSkeleton, y layout del dashboard.
 */
export function DashboardSkeleton(): JSX.Element
```

---

## Convenciones de codigo

| Patron | Ejemplo | Notas |
|---|---|---|
| Hooks de query | `useEvents()` | Retorna `UseQueryResult<T[]>` |
| Hooks de mutacion | `useCreateEvent()` | Retorna `UseMutationResult`, invalida cache on success |
| Servicios | `eventService.createEvent(hotelId, input)` | Thin wrapper sobre `supabase.rpc()` |
| Schemas | `EventSchema`, `CreateEventInputSchema` | Zod v4, `z.infer<typeof Schema>` para tipos |
| Status badges | `<EventStatusBadge status={event.status} />` | Componente por entidad con estados |
| Query keys | `["events", hotelId]` | Siempre incluyen hotelId para invalidacion |
