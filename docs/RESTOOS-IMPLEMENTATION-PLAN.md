# RestoOS — Plan de Implementacion

Fork modular de ChefOS para restaurantes, bares y gastrobares.
**Objetivo:** Tener MVP funcional en 2 semanas de desarrollo.

---

## 1. Setup Inicial

### 1.1 Crear directorio del proyecto

```bash
# Copiar ChefOS como base
cp -r "C:\culinary claude\chefos" "C:\culinary claude\restoos"
cd "C:\culinary claude\restoos"

# Renombrar en package.json
# name: "restoos"
```

### 1.2 Cambios globales de branding

| Archivo | Cambio |
|---------|--------|
| `package.json` | name → "restoos" |
| `src/components/sidebar.tsx` | "ChefOS" → "RestoOS", icono cocina → tenedor+cuchillo |
| `src/app/(dashboard)/page.tsx` | "Buenos dias, Chef" → "Buenos dias" + nombre restaurante |
| `.env.example` | Añadir `NEXT_PUBLIC_APP_NAME=RestoOS` |
| `src/remotion/` | Adaptar video onboarding a restaurante |
| `README.md` | Reescribir para RestoOS |

---

## 2. Modulos que se MANTIENEN tal cual

No tocar estos archivos — funcionan identicos para restaurante:

| Modulo | Ruta | Motivo |
|--------|------|--------|
| Recetas | `features/recipes/` | Identico: crear, importar, foto, voz |
| Escandallo | `features/escandallo/` | Identico: costeo por plato |
| Catalogo | `features/catalog/` | Identico: productos, proveedores, unidades |
| Compras | `features/procurement/` | Identico: pedidos, sugerencias, OCR albaran |
| Inventario | `features/inventory/` | Identico: stock, lotes, movimientos |
| APPCC | `features/appcc/` | Identico: registros seguridad alimentaria |
| Informes | `features/reporting/` | Adaptar KPIs (ver seccion 5) |
| Automatizaciones | `features/automations/` | Identico |
| Ing. Menu | `features/menu-engineering/` | Identico: Boston matrix |
| Prevision | `/forecasting` | Identico |
| 6 Engines | `lib/calculations/` | Identico: cost, demand, procurement, margin, scaling, forecast |
| Product matcher | `lib/product-matcher.ts` | Identico |
| Voice parser | `lib/voice-parser.ts` | Identico |
| OCR APIs | `app/api/ocr-*` | Identico |
| UI components | `components/ui/` | Identico |
| Auth + RBAC | `lib/auth/`, `lib/rbac.ts` | Adaptar roles (ver seccion 4) |

---

## 3. Modulos que se ELIMINAN

| Modulo | Ruta | Motivo |
|--------|------|--------|
| Eventos hotel | `features/events/` | Reemplazar por Reservas |
| Launch Production Wizard | `features/events/components/LaunchProductionWizard.tsx` | No aplica |
| Events mock data | `features/events/events-mock-data.ts` | Reemplazar |
| Staffing hotel | `features/staffing/` | Rehacer para sala+cocina |
| Clientes hotel | `features/clients/` | Adaptar a comensales |
| Operations mise-en-place | `app/(dashboard)/operations/mise-en-place/` | Reemplazar por prep cocina |

---

## 4. Modulos NUEVOS a crear

### 4.1 Reservas (`features/reservations/`)

Reemplaza Eventos. Gestion de mesas, turnos, walk-ins.

**Archivos a crear:**

```
src/features/reservations/
├── schemas/
│   └── reservation.schema.ts    # Zod: mesa, hora, pax, estado, cliente, notas
├── hooks/
│   └── use-reservations.ts      # CRUD con mock fallback
├── components/
│   ├── ReservationCalendar.tsx   # Vista dia/semana con slots por mesa
│   ├── FloorPlan.tsx             # Mapa de sala con mesas (drag opcional)
│   ├── NewReservationDialog.tsx  # Dialog rapido: nombre, hora, pax, mesa
│   └── WalkInButton.tsx          # Boton de walk-in rapido
├── reservation-mock-data.ts     # 20+ reservas mock
└── types.ts                     # Mesa, Turno, Reserva
```

**Paginas:**

```
src/app/(dashboard)/reservations/
├── page.tsx              # Vista calendario de reservas
├── floor-plan/
│   └── page.tsx          # Vista mapa de sala
└── settings/
    └── page.tsx          # Config mesas, turnos (13:00-16:00, 20:00-23:30)
```

**Schema Reservation:**
```typescript
{
  id: string
  restaurant_id: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  date: string              // YYYY-MM-DD
  time: string              // HH:MM
  duration_min: number       // default 90
  pax: number
  table_id?: string
  status: "pending" | "confirmed" | "seated" | "completed" | "no_show" | "cancelled"
  source: "phone" | "walk_in" | "web" | "app" | "thefork"
  notes?: string
  is_vip: boolean
}
```

**Schema Table:**
```typescript
{
  id: string
  restaurant_id: string
  name: string             // "Mesa 1", "Terraza 3"
  zone: string             // "sala", "terraza", "privado", "barra"
  capacity: number
  is_active: boolean
  position_x?: number      // para floor plan
  position_y?: number
}
```

**Schema Turn (turno de servicio):**
```typescript
{
  id: string
  name: string             // "Comida", "Cena"
  start_time: string       // "13:00"
  end_time: string         // "16:00"
  days: number[]           // 1-7 (lun-dom)
}
```

### 4.2 Carta Digital (`features/digital-menu/`)

Menu QR publico generado desde recetas existentes.

**Archivos:**

```
src/features/digital-menu/
├── schemas/
│   └── digital-menu.schema.ts
├── hooks/
│   └── use-digital-menu.ts
├── components/
│   ├── MenuPreview.tsx          # Preview de como se ve la carta
│   ├── QRGenerator.tsx          # Genera QR con link a la carta
│   └── MenuItemCard.tsx         # Card de plato con foto, precio, alergenos
└── digital-menu-mock-data.ts

src/app/(dashboard)/digital-menu/
├── page.tsx                     # Config carta: que platos, orden, fotos, precios
└── preview/
    └── page.tsx                 # Preview full-screen

src/app/menu/[restaurantSlug]/
└── page.tsx                     # Pagina PUBLICA (sin auth) de la carta QR
```

**Datos de la carta:** Se generan desde `MOCK_RECIPES` + `menu-engineering` existente. Cada plato muestra:
- Nombre, descripcion, foto
- Precio (PVP sala del marginEngine)
- Alergenos (del costEngine)
- Etiquetas: "Chef recomienda", "Nuevo", "Sin gluten"

### 4.3 TPV Basico (`features/pos/`)

Registro de ventas por plato, mesa, camarero. Conecta con escandallo.

**Archivos:**

```
src/features/pos/
├── schemas/
│   └── order.schema.ts          # Pedido: mesa, camarero, lineas, estado, pago
├── hooks/
│   └── use-orders.ts
├── components/
│   ├── POSGrid.tsx              # Grid de platos agrupados por categoria (touch-friendly)
│   ├── OrderSummary.tsx         # Resumen del pedido actual
│   ├── TableSelector.tsx        # Selector de mesa
│   ├── PaymentDialog.tsx        # Cobro: efectivo, tarjeta, split
│   └── KitchenTicket.tsx        # Ticket de cocina (comanda)
├── pos-mock-data.ts
└── types.ts

src/app/(dashboard)/pos/
├── page.tsx                     # Pantalla principal TPV (full-screen, touch)
├── orders/
│   └── page.tsx                 # Historial de pedidos del dia
└── cash-register/
    └── page.tsx                 # Cierre de caja
```

**Schema Order:**
```typescript
{
  id: string
  restaurant_id: string
  table_id?: string
  waiter_id?: string
  status: "open" | "kitchen" | "served" | "paid" | "cancelled"
  lines: OrderLine[]
  subtotal: number
  tax_pct: number           // 10% IVA
  total: number
  payment_method?: "cash" | "card" | "split"
  opened_at: string
  closed_at?: string
  notes?: string
}
```

**Schema OrderLine:**
```typescript
{
  id: string
  recipe_id: string
  recipe_name: string
  quantity: number
  unit_price: number        // PVP sala (del marginEngine)
  modifiers?: string[]      // "sin gluten", "extra queso", "poco hecho"
  status: "pending" | "preparing" | "ready" | "served"
  sent_to_kitchen_at?: string
}
```

### 4.4 Delivery (`features/delivery/`)

Conexion con plataformas. PVP por canal ya existe en marginEngine.

**Archivos:**

```
src/features/delivery/
├── schemas/
│   └── delivery-order.schema.ts
├── hooks/
│   └── use-delivery.ts
├── components/
│   ├── DeliveryDashboard.tsx    # Pedidos entrantes por plataforma
│   ├── PlatformBadge.tsx        # Glovo/Uber/JustEat badge con color
│   └── DeliveryOrderCard.tsx    # Card de pedido con timer
├── delivery-mock-data.ts
└── types.ts

src/app/(dashboard)/delivery/
└── page.tsx                     # Dashboard delivery en tiempo real
```

**Nota:** Los precios por plataforma se calculan con `calculatePricingByChannel()` que ya existe. Solo falta la UI de recepcion de pedidos.

### 4.5 Fidelizacion (`features/loyalty/`)

Programa de puntos basico.

**Archivos:**

```
src/features/loyalty/
├── schemas/
│   └── loyalty.schema.ts
├── hooks/
│   └── use-loyalty.ts
├── components/
│   ├── LoyaltyCard.tsx          # Tarjeta del cliente con puntos
│   ├── RewardsConfig.tsx        # Config: puntos por €, recompensas
│   └── CustomerHistory.tsx      # Historial de visitas y puntos
└── loyalty-mock-data.ts

src/app/(dashboard)/loyalty/
└── page.tsx                     # Gestion programa fidelizacion
```

---

## 5. Adaptaciones en Modulos Existentes

### 5.1 RBAC — Nuevos roles

**Archivo:** `src/contracts/enums.ts` y `src/lib/rbac.ts`

```typescript
// Añadir roles restaurante
ROLE.OWNER        // Dueño — todo
ROLE.MANAGER      // Gerente — todo excepto config
ROLE.HEAD_CHEF    // Ya existe — cocina
ROLE.COOK         // Ya existe — cocina
ROLE.WAITER       // Nuevo — sala, TPV, reservas
ROLE.BARTENDER    // Nuevo — barra, TPV
ROLE.HOST         // Nuevo — reservas, walk-ins
```

**Permisos nuevos:**
```typescript
"reservation:create" | "reservation:edit" | "reservation:cancel"
"order:create" | "order:edit" | "order:void" | "order:pay"
"pos:access" | "pos:close_register"
"delivery:manage"
"loyalty:manage"
"digital_menu:edit"
```

### 5.2 Dashboard — KPIs restaurante

**Archivo:** `src/features/dashboard/` — modificar hook y pagina

| KPI actual (hotel) | KPI nuevo (restaurante) |
|---------------------|------------------------|
| Ingresos del mes | Ventas del dia / semana / mes |
| Food Cost | Food Cost (mismo) |
| Eventos este mes | Reservas hoy / ocupacion |
| Pedidos en curso | Mesas abiertas / pedidos cocina |
| Controles APPCC | Controles APPCC (mismo) |
| Alertas escandallo | Alertas escandallo (mismo) |

**KPIs nuevos a añadir:**
- Ticket medio
- Rotacion de mesas (covers/mesa/turno)
- RevPASH (Revenue Per Available Seat Hour)
- Platos mas vendidos (top 5)
- Delivery vs sala (% revenue)

### 5.3 Sidebar — Navegacion restaurante

```
Dashboard
Reservas          ← NUEVO (reemplaza Eventos)
Carta Digital     ← NUEVO
TPV               ← NUEVO
Delivery          ← NUEVO
Recetas
Menus (Carta)
Ing. Menu
Escandallo
Catalogo
Compras
Inventario
Prevision
Operaciones
APPCC
Personal
Fidelizacion      ← NUEVO
Informes
Configuracion
```

### 5.4 Personal — Roles sala

**Archivo:** `src/features/staffing/` — adaptar

Añadir tipos de turno: "comida", "cena", "partido" (jornada partida).
Añadir roles sala: camarero, barman, runner, hostess, lavaplatos.
Vista semanal con asignacion por turno y zona (sala/terraza/barra/cocina).

---

## 6. Mock Data para RestoOS

**Archivo nuevo:** `src/lib/resto-mock-data.ts`

```typescript
// 12 mesas
MOCK_TABLES: Table[] = [
  { id: "t1", name: "Mesa 1", zone: "sala", capacity: 4 },
  { id: "t2", name: "Mesa 2", zone: "sala", capacity: 2 },
  // ...
  { id: "t10", name: "Terraza 1", zone: "terraza", capacity: 6 },
  { id: "t11", name: "Barra 1", zone: "barra", capacity: 2 },
  { id: "t12", name: "Privado", zone: "privado", capacity: 12 },
]

// 2 turnos
MOCK_TURNS = [
  { id: "turn-1", name: "Comida", start: "13:00", end: "16:00", days: [1,2,3,4,5,6,7] },
  { id: "turn-2", name: "Cena", start: "20:00", end: "23:30", days: [1,2,3,4,5,6] },
]

// 30+ reservas para hoy y proximos dias
MOCK_RESERVATIONS: Reservation[] = [...]

// 20+ pedidos con lineas
MOCK_ORDERS: Order[] = [...]

// 15+ pedidos delivery
MOCK_DELIVERY_ORDERS: DeliveryOrder[] = [...]

// 10 clientes con puntos fidelizacion
MOCK_LOYALTY_CUSTOMERS: LoyaltyCustomer[] = [...]
```

---

## 7. Orden de Ejecucion (Sesiones)

### Sesion 1: Setup + Reservas (base)
1. Copiar proyecto, renombrar branding
2. Crear schemas de Reservation, Table, Turn
3. Crear mock data restaurante
4. Crear hooks use-reservations con mock fallback
5. Crear pagina de reservas (calendario dia/semana)
6. Crear dialog nueva reserva
7. Actualizar sidebar

### Sesion 2: Reservas (avanzado) + Mesas
1. Floor plan visual (mapa de sala con mesas)
2. Config turnos y mesas
3. Walk-in rapido
4. Status flow: pending → confirmed → seated → completed
5. Adaptar RBAC con roles restaurante

### Sesion 3: TPV
1. Schemas Order + OrderLine
2. Mock data pedidos
3. Grid de platos (touch-friendly, por categoria)
4. Flujo: seleccionar mesa → añadir platos → enviar cocina → cobrar
5. Ticket cocina (comanda)
6. Cierre de caja basico

### Sesion 4: Carta Digital + QR
1. Schema digital menu
2. Generar carta desde recetas existentes
3. Pagina publica /menu/[slug] (sin auth)
4. QR generator
5. Preview en dashboard

### Sesion 5: Delivery + Fidelizacion
1. Dashboard delivery con pedidos mock por plataforma
2. Badges Glovo/Uber/JustEat
3. Programa de puntos basico
4. Historial cliente
5. Conectar PVP por canal (marginEngine ya existe)

### Sesion 6: Dashboard + KPIs + Polish
1. Dashboard restaurante con nuevos KPIs
2. Ticket medio, RevPASH, rotacion mesas
3. Adaptar informes
4. Dark mode check
5. Responsive check
6. Tests para nuevos modulos

### Sesion 7: Limpieza + Deploy
1. Eliminar modulos hotel no usados
2. Eliminar mock data hotel
3. Adaptar video Remotion
4. Actualizar docs
5. Deploy en Vercel

---

## 8. Estructura Final de Archivos (RestoOS)

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx                    # Dashboard restaurante
│   │   ├── reservations/              # NUEVO — Reservas + mesas
│   │   ├── pos/                       # NUEVO — TPV + pedidos + caja
│   │   ├── digital-menu/             # NUEVO — Carta QR
│   │   ├── delivery/                 # NUEVO — Pedidos delivery
│   │   ├── loyalty/                  # NUEVO — Fidelizacion
│   │   ├── recipes/                  # Sin cambios
│   │   ├── menus/                    # Renombrar a "Carta"
│   │   ├── menu-engineering/         # Sin cambios
│   │   ├── escandallo/              # Sin cambios
│   │   ├── catalog/                 # Sin cambios
│   │   ├── procurement/             # Sin cambios
│   │   ├── inventory/               # Sin cambios
│   │   ├── forecasting/            # Sin cambios
│   │   ├── operations/             # Adaptar a sala+cocina
│   │   ├── appcc/                  # Sin cambios
│   │   ├── staffing/              # Adaptar roles sala
│   │   ├── reports/               # Adaptar KPIs
│   │   ├── automations/          # Sin cambios
│   │   └── settings/             # Sin cambios
│   ├── api/                       # Sin cambios (OCR, briefing)
│   ├── menu/[slug]/              # NUEVO — Carta publica (sin auth)
│   └── login/
├── features/
│   ├── reservations/             # NUEVO
│   ├── pos/                      # NUEVO
│   ├── digital-menu/            # NUEVO
│   ├── delivery/                # NUEVO
│   ├── loyalty/                 # NUEVO
│   ├── recipes/                 # Sin cambios
│   ├── catalog/                # Sin cambios
│   ├── procurement/            # Sin cambios
│   ├── inventory/              # Sin cambios
│   ├── menu-engineering/       # Sin cambios
│   ├── escandallo/            # Sin cambios
│   ├── operations/            # Adaptar
│   ├── staffing/              # Adaptar
│   ├── reporting/             # Adaptar
│   ├── appcc/                 # Sin cambios
│   ├── automations/           # Sin cambios
│   └── dashboard/             # Adaptar KPIs
├── lib/
│   ├── calculations/          # Sin cambios (6 engines)
│   ├── resto-mock-data.ts     # NUEVO — mock data restaurante
│   ├── mock-data.ts           # Mantener (productos, proveedores compartidos)
│   └── rbac.ts                # Adaptar roles
└── contracts/
    └── enums.ts               # Añadir roles y estados restaurante
```

---

## 9. Checklist Pre-Sesion

Antes de empezar la primera sesion, asegurate de tener:

- [ ] Copia del proyecto ChefOS en nueva carpeta
- [ ] Node 20+ instalado
- [ ] `npm install` ejecutado
- [ ] `.env.local` copiado
- [ ] Servidor arranca sin errores (`npm run dev`)
- [ ] Tests pasan (`npx vitest run`)

### Comando para arrancar la primera sesion:

```
Estoy en C:\culinary claude\restoos. Es un fork de ChefOS adaptado para restaurantes.
Sigue el plan en docs/RESTOOS-IMPLEMENTATION-PLAN.md, Sesion 1.
Crea los schemas, mock data, hooks y paginas de Reservas.
Actualiza el sidebar para navegacion de restaurante.
```

---

## 10. Metricas de Exito del MVP

| Metrica | Objetivo |
|---------|----------|
| Paginas funcionales | 40+ |
| Tests pasando | 170+ |
| Tiempo arranque (dev) | <30 segundos |
| Modulos nuevos | 5 (reservas, TPV, carta, delivery, fidelizacion) |
| Modulos reutilizados | 12 (recetas, escandallo, catalogo, compras, inventario, APPCC, ing.menu, forecast, operations, automations, reports, settings) |
