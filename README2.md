# ChefOS

Plataforma SaaS multi-tenant para gestion operativa de restauracion, eventos y hoteleria. Unifica eventos, recetas, compras, inventario, operaciones y automatizacion en un solo sistema con control de costes en tiempo real.

**Stack:** Next.js 16 + React 19 + TypeScript strict + Tailwind CSS v4 + shadcn/ui (base-ui) + Supabase (Auth, RLS, Storage, RPCs) + PostgreSQL 17 + TanStack Query + Zod v4 + Vitest

---

## Requisitos previos

| Herramienta | Version minima | Verificar |
|---|---|---|
| Node.js | 20.x | `node -v` |
| npm | 10.x | `npm -v` |
| Supabase CLI | 2.x | `npx supabase --version` |
| Docker Desktop | 4.x | `docker --version` |
| Git | 2.x | `git --version` |

> Docker es necesario para Supabase local (PostgreSQL, Auth, Storage, Studio).

---

## Instalacion

```bash
# 1. Clonar el repositorio
git clone <repo-url> chefos
cd chefos

# 2. Instalar dependencias
npm install

# 3. Arrancar Supabase local (requiere Docker corriendo)
npx supabase start

# 4. Copiar variables de entorno
cp .env.example .env.local

# 5. Obtener las keys de Supabase local y pegarlas en .env.local
npx supabase status
# Copiar "API URL" -> NEXT_PUBLIC_SUPABASE_URL
# Copiar "anon key" -> NEXT_PUBLIC_SUPABASE_ANON_KEY
# Copiar "service_role key" -> SUPABASE_SERVICE_ROLE_KEY

# 6. Aplicar migraciones
npx supabase db reset

# 7. (Opcional) Cargar seed data
npx supabase db reset --seed

# 8. Arrancar Next.js
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). Supabase Studio disponible en [http://localhost:54323](http://localhost:54323).

---

## Uso rapido

1. Registrate en `/login` (crear cuenta)
2. Se crea un perfil automaticamente via trigger
3. Crea un tenant y hotel desde `/settings/hotel`
4. Navega por el sidebar: eventos, recetas, catalogo, compras, inventario, operaciones, automatizacion, dashboard

---

## Variables de entorno

| Variable | Descripcion | Ejemplo | Obligatoria |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de la API de Supabase | `http://127.0.0.1:54321` | Si |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anonima de Supabase (publica) | `eyJhbGciOi...` | Si |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo server-side) | `eyJhbGciOi...` | Si |
| `NEXT_PUBLIC_APP_URL` | URL base de la aplicacion | `http://localhost:3000` | Si |

---

## Estructura del proyecto

```
chefos/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Rutas publicas: login, callback
│   │   └── (dashboard)/              # Rutas protegidas (require auth)
│   │       ├── page.tsx              # Dashboard principal (KPIs, alertas)
│   │       ├── events/               # CRUD eventos + calendario
│   │       ├── clients/              # Gestion de clientes
│   │       ├── recipes/              # Recetas con estado, costes, fichas
│   │       ├── menus/                # Menus con secciones y recetas
│   │       ├── catalog/              # Productos, proveedores, categorias, unidades
│   │       ├── procurement/          # Solicitudes y pedidos de compra
│   │       ├── inventory/            # Stock (lotes, movimientos, niveles)
│   │       ├── operations/           # Workflows, tareas (kanban), mise en place
│   │       ├── automations/          # Jobs, dead letter, integraciones/webhooks
│   │       └── settings/             # Config hotel, equipo
│   │
│   ├── features/                     # Modulos de dominio (feature-based)
│   │   ├── events/                   # schemas/ services/ hooks/ components/ types/
│   │   ├── recipes/                  #   Cada feature sigue la misma estructura
│   │   ├── catalog/
│   │   ├── procurement/
│   │   ├── inventory/
│   │   ├── operations/
│   │   ├── automations/
│   │   └── reporting/
│   │
│   ├── components/                   # Componentes compartidos
│   │   ├── ui/                       # shadcn/ui primitivos (button, card, dialog...)
│   │   ├── sidebar.tsx               # Navegacion lateral
│   │   ├── mobile-nav.tsx            # Nav responsive con Sheet
│   │   ├── empty-state.tsx           # Estado vacio reutilizable
│   │   └── page-skeleton.tsx         # Skeletons de carga
│   │
│   ├── contracts/                    # Enums, tipos compartidos entre modulos
│   │   └── enums.ts                  # Estados, roles, transiciones, error codes
│   │
│   ├── lib/                          # Utilidades core
│   │   ├── auth/                     # Hooks de auth (useActiveHotel, etc.)
│   │   ├── db/                       # Cliente Supabase (browser + server)
│   │   ├── rbac/                     # Control de acceso por roles
│   │   ├── errors/                   # Error handler tipado
│   │   └── utils/                    # cn(), formatters
│   │
│   └── hooks/                        # Hooks globales
│
├── supabase/
│   ├── config.toml                   # Config Supabase local
│   ├── migrations/                   # 18 migraciones SQL (tablas + RPCs)
│   ├── seed.sql                      # Datos demo (2 tenants, 3 hotels, etc.)
│   └── tests/                        # Tests RLS y RPC (estructura preparada)
│
├── .env.example                      # Template de variables de entorno
├── package.json
├── tsconfig.json                     # TypeScript strict + noUncheckedIndexedAccess
├── vitest.config.ts                  # Vitest con jsdom
└── components.json                   # Config shadcn/ui (base-nova style)
```

---

## Arquitectura

### Multi-tenancy

```
Tenant (organizacion)
  └── Hotel (unidad operativa)  ←  hotel_id en TODA tabla operativa
       └── Membership (user + role + is_active)  ←  ancla de RLS
```

Todas las queries pasan por Row Level Security. Un usuario solo ve datos de hoteles donde tiene membership activa.

### Patron de feature

Cada modulo sigue el orden: **Schema (Zod) → Migracion SQL → RPC → Service → Hook → Componente → Pagina**

```
features/{modulo}/
├── schemas/        # Validacion con Zod v4
├── services/       # Llamadas a Supabase RPCs / queries
├── hooks/          # React Query wrappers (useQuery/useMutation)
├── components/     # UI especifica del modulo
└── types/          # Tipos adicionales
```

### RPCs (logica de negocio)

La logica critica vive en PostgreSQL como funciones `security definer`:

```
1. Validar acceso (membership activa)
2. Validar estado (maquina de estados)
3. Ejecutar operacion
4. Insertar audit_log
5. Emitir domain_event
6. Retornar jsonb
```

### Maquinas de estado

| Entidad | Estados | Ejemplo transicion |
|---|---|---|
| Evento | draft → pending → confirmed → in_operation → completed | `confirm_event` requiere menus |
| Receta | draft → review_pending → approved → deprecated | `approve_recipe` requiere head_chef+ |
| Tarea | todo → in_progress → blocked → done | `block_task` marca workflow at_risk |
| Pedido compra | draft → sent → received | `receive_goods` crea lotes stock |
| Job automatizacion | pending → processing → done/failed → dead_letter | Retry con backoff exponencial |

---

## Scripts

| Comando | Descripcion |
|---|---|
| `npm run dev` | Arranca Next.js en modo desarrollo (puerto 3000) |
| `npm run build` | Build de produccion |
| `npm run start` | Arranca build de produccion |
| `npm run lint` | Ejecuta ESLint |
| `npx supabase start` | Arranca Supabase local (Docker) |
| `npx supabase stop` | Para Supabase local |
| `npx supabase db reset` | Resetea DB, aplica migraciones y seed |
| `npx supabase db diff` | Genera migracion desde cambios en Studio |
| `npx tsc --noEmit` | Verificacion de tipos (sin emitir JS) |
| `npx vitest` | Ejecuta tests con Vitest |
| `npx vitest --run` | Tests en modo CI (sin watch) |

---

## Tests

```bash
# Ejecutar todos los tests
npx vitest

# Modo CI (sin watch)
npx vitest --run

# Con coverage
npx vitest --coverage

# Solo un archivo
npx vitest src/features/events/
```

Configuracion en `vitest.config.ts`: entorno `jsdom`, globals habilitados, alias `@/` → `./src/`.

---

## Seed Data

El archivo `supabase/seed.sql` incluye datos demo realistas:

- 2 tenants, 3 hotels
- 8 usuarios con roles variados (direction, head_chef, sous_chef, commercial, warehouse, admin)
- 10 categorias de productos (carnes, pescados, verduras, lacteos, especias, panaderia, bebidas + subcategorias)
- 6 unidades de medida con conversiones (kg, g, L, ml, ud, docena)
- 20 productos con SKU
- 5 proveedores con datos de contacto
- 20 ofertas de proveedor con precios y plazos
- 3 clientes
- 10 recetas (7 aprobadas, 1 en revision, 1 borrador)
- 3 menus
- 5 eventos en distintos estados (confirmed, pending, completed, draft)
- 6 tareas (in_progress, todo, blocked, done)
- 3 pedidos de compra (sent, draft, received)
- 5 lotes de stock con caducidades
- 3 alertas (2 activas, 1 descartada)

```bash
# Cargar seed data
npx supabase db reset --seed
```

---

## Roles

| Rol | Permisos clave |
|---|---|
| `superadmin` | Acceso total cross-tenant |
| `direction` | Dashboard KPIs, aprobar recetas, ver todo |
| `admin` | Gestion hotel, equipo, configuracion |
| `head_chef` | Aprobar recetas, gestionar cocina |
| `sous_chef` / `cook` | Crear recetas, ejecutar tareas cocina |
| `commercial` | Eventos, clientes |
| `procurement` | Compras, proveedores |
| `warehouse` | Inventario, recepciones |
| `room` / `reception` | Tareas de sala |

---

## Error Codes

Codigos estandar devueltos por las RPCs:

| Codigo | Significado |
|---|---|
| `ACCESS_DENIED` | Sin membership activa en el hotel |
| `NOT_FOUND` | Entidad no existe o no pertenece al hotel |
| `INVALID_STATE` | Transicion de estado no permitida |
| `ALREADY_APPLIED` | Operacion ya ejecutada (idempotencia) |
| `MISSING_REQUIRED_DATA` | Datos requeridos no proporcionados |
| `CONFLICT` | Conflicto de concurrencia |
| `INSUFFICIENT_STOCK` | Stock insuficiente para la operacion |

---

## Modulos

| # | Modulo | Tablas | RPCs | Descripcion |
|---|---|---|---|---|
| D0 | Identidad | 6 | 6 | Auth, multi-tenancy, RBAC, audit |
| M3 | Catalogo | 6 | 6 | Productos, proveedores, categorias, unidades |
| M1 | Eventos | 5 | 7 | Ciclo de vida de eventos, versionado, calendario |
| M2 | Recetas | 7 | 8 | Recetas, ingredientes, menus, costes, fichas tecnicas |
| M6 | Operaciones | 4 | 7 | Workflows, tareas, mise en place |
| M4 | Compras | 3 | 5 | Solicitudes, pedidos, recepciones |
| M5 | Inventario | 3 | 6 | Lotes FIFO, movimientos, reservas, merma |
| M8 | Automatizacion | 5 | 8 | Jobs, retry, documentos, webhooks |
| M7 | Direccion | 3 | 4 | Dashboard KPIs, snapshots, alertas |
| **Total** | | **~45** | **59** | |
