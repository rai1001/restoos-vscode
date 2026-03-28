# ChefOS — Plan de Expansion Multi-Sector

## Tesis

ChefOS tiene un core reutilizable (38 paginas, 6 engines, RBAC, multi-tenant) que puede adaptarse a 6+ verticales del mercado SaaS hostelero. El estudio de mercado confirma zonas desatendidas con competencia fragmentada, especialmente en hispanohablante.

**Mercado objetivo:** 3.600M → 8.500M USD (CAGR 9,2% hasta 2034). Nichos sin lider claro: campings, glamping, eventos, restauracion independiente, coliving.

---

## Arquitectura: Plataforma + Verticales

```
┌─────────────────────────────────────────────────┐
│                 CORE PLATFORM                    │
│  Auth · Multi-tenant · RBAC · Dashboard · API    │
│  Catalog · Inventory · Procurement · Reports     │
│  Calculation Engines · APPCC · Automations       │
│  Supabase · TanStack Query · shadcn/ui           │
├─────────────────────────────────────────────────┤
│          VERTICAL MODULES (swap in/out)          │
├──────┬──────┬──────┬──────┬──────┬──────────────┤
│Hotel │Rest. │Camp  │Event │Coliv │ Wellness     │
│Kitchen│& Bar│& Glam│Cater │ing   │ & Spa        │
└──────┴──────┴──────┴──────┴──────┴──────────────┘
```

### Que se reutiliza (Core — no se toca)

| Modulo | Ficheros | Aplica a todos |
|--------|----------|----------------|
| Auth + Multi-tenant | lib/auth/, lib/db/ | Si |
| RBAC | lib/rbac.ts, contracts/enums.ts | Si (roles cambian) |
| Dashboard KPIs | features/dashboard/ | Si (KPIs cambian) |
| Catalogo productos | features/catalog/ | Si |
| Inventario + Stock | features/inventory/ | Si |
| Compras + Procurement | features/procurement/ | Si |
| Informes | features/reporting/ | Si |
| APPCC | features/appcc/ | Si (adaptado) |
| Automatizaciones | features/automations/ | Si |
| Configuracion | settings/ | Si |
| 6 Calculation engines | lib/calculations/ | Si |
| UI components | components/ui/ | Si |
| Voice input | hooks/use-voice-input | Si |
| OCR (Mistral) | api/ocr-* | Si |

### Que cambia por vertical

| Modulo | Hotel Kitchen | Restaurante | Camping | Eventos | Coliving |
|--------|-------------|-------------|---------|---------|----------|
| Recetas | Si | Si | Parcial | Si | No |
| Menus | Si | Si (carta) | Si (bar) | Si (banquete) | No |
| Ing. Menu Boston | Si | Si | No | No | No |
| Escandallo | Si | Si | Parcial | Si | No |
| Eventos | Si | Reservas | Booking | Central | Comunidad |
| Clientes | Hotel guests | Comensales | Huespedes | Organizadores | Residentes |
| Operaciones | Cocina | Sala+Cocina | Mantenimiento | Montaje | Servicios |
| Personal | Turnos cocina | Turnos sala | Temporada | Por evento | Fijo |
| Forecasting | Demanda F&B | Demanda platos | Ocupacion | Timeline | Renovaciones |

---

## Vertical 1: RESTAURANTE & BAR (Prioridad ALTA)

**Mercado:** 2.645M USD (2025). Competencia fragmentada (Foodtick, Fudo, Glop).
**Esfuerzo:** BAJO — ChefOS ya tiene el 80% de lo necesario.

### Que se mantiene tal cual
- Recetas, ingredientes, escandallo, escalado
- Catalogo, proveedores, compras con sugerencias
- Inventario, stock, lotes, FIFO
- Ingenieria de menu (Boston matrix)
- APPCC, informes, automatizaciones
- PVP por canal (Sala/Glovo/Uber) — YA IMPLEMENTADO

### Que se modifica
| Cambio | Detalle | Esfuerzo |
|--------|---------|----------|
| Eventos → Reservas | Reemplazar calendario eventos por gestion de reservas (mesas, turnos, walk-ins) | Medio |
| Nuevo: Carta digital | Menu QR con precios, alergenos, fotos. Usa datos de recetas existentes | Medio |
| Nuevo: TPV basico | Registro de ventas por plato, mesa, camarero. Integra con escandallo | Alto |
| Nuevo: Delivery | Conexion Glovo/UberEats/JustEat API. PVP por canal ya existe | Medio |
| Operaciones → Sala | Adaptar tareas cocina a incluir sala (comandas, tiempos mesa) | Bajo |
| Personal → Turnos sala | Añadir roles: camarero, barman, runner, hostess | Bajo |
| Dashboard → Restaurante | KPIs: ticket medio, rotacion mesas, platos/hora, RevPASH | Bajo |
| Marketing | Programa fidelizacion basico, email marketing | Medio |

### Nombre producto: **TableOS** o **RestoOS**
### Pricing: 49€/mes basico, 99€/mes con delivery + carta digital

---

## Vertical 2: CAMPING & GLAMPING (Prioridad ALTA)

**Mercado:** Muy poco saturado. Glamping crece a doble digito. Solo Pitchup, Campsite, e-CAMPER (parciales).
**Oportunidad:** Ser el "Cloudbeds del camping" en Europa/Latam.
**Esfuerzo:** MEDIO — requiere modulos nuevos de reservas y parcelas.

### Que se mantiene
- Catalogo (productos tienda, bar, restaurante)
- Inventario (stock tienda, bar, mantenimiento)
- Compras con sugerencias
- APPCC (piscina, agua, cocina)
- Informes, automatizaciones
- Personal (temporadas, turnos)

### Que se modifica/añade
| Cambio | Detalle | Esfuerzo |
|--------|---------|----------|
| Eventos → Reservas parcelas | Grid visual: parcelas/bungalows/tiendas con calendario. Check-in/check-out | Alto |
| Nuevo: Mapa de parcelas | Vista mapa interactivo con estado por parcela (libre/ocupada/mantenimiento) | Alto |
| Nuevo: Tipos alojamiento | Parcela, bungalow, tienda safari, treehouse, cabaña. Con capacidad, servicios, temporadas | Medio |
| Nuevo: Actividades | Kayak, senderismo, tours, spa. Reservas + capacidad + horarios | Medio |
| Nuevo: Extras | Bicicletas, kayaks, leña, BBQ. Alquiler por dia con stock | Bajo |
| Recetas → Simplificado | Solo si tienen restaurante/bar. Opcional | Bajo |
| Menus → Carta bar | Simplificado para bar de camping | Bajo |
| Dashboard → Camping | KPIs: ocupacion, RevPAR parcela, temporada alta/baja, actividades | Medio |
| Nuevo: Temporadas | Precios por temporada (alta/media/baja) con fechas configurables | Medio |
| Nuevo: Channel Manager | Conexion Booking.com, Pitchup, Google Hotels | Alto |

### Nombre producto: **CampOS** o **GlampOS**
### Pricing: 8€/parcela/mes (min 200€/mes) — modelo Apaleo transparente

---

## Vertical 3: EVENTOS & CATERING (Prioridad ALTA)

**Mercado:** Fragmentado. Event Temple lidera (4.8 estrellas) pero baja penetracion en España.
**Esfuerzo:** BAJO — ChefOS ya tiene eventos, wizard produccion, menus, escalado.

### Que se mantiene tal cual
- Eventos con wizard de produccion (4 pasos)
- Recetas, menus, escalado para banquetes
- Escandallo, PVP por canal
- Compras con sugerencias automaticas
- Inventario, APPCC
- Personal (por evento)
- Forecast de demanda

### Que se modifica/añade
| Cambio | Detalle | Esfuerzo |
|--------|---------|----------|
| Nuevo: Propuestas/Cotizaciones | Generar PDF de propuesta con menus, precios, condiciones | Medio |
| Nuevo: Pipeline ventas | Kanban: Lead → Propuesta → Negociacion → Confirmado → Facturado | Medio |
| Nuevo: Asignacion salas | Calendario de salas/espacios con capacidad y setup (teatro, banquete, cocktail) | Medio |
| Nuevo: Contratos | Templates de contrato con firma digital (o enlace a DocuSign) | Medio |
| Nuevo: Timeline evento | Gantt simplificado: montaje → servicio → desmontaje con asignacion personal | Bajo |
| Clientes → Organizadores | CRM con historial de eventos, preferencias, presupuesto | Bajo |
| Dashboard → Eventos | KPIs: pipeline value, conversion rate, revenue/evento, satisfaccion | Bajo |
| Nuevo: Presupuestos automaticos | Basados en escandallo × pax × margen. Auto-genera con IA | Medio |

### Nombre producto: **EventOS** o **BanquetOS**
### Pricing: 149€/mes basico, 299€/mes con CRM + propuestas + firma

---

## Vertical 4: COLIVING & RESIDENCIAS (Prioridad MEDIA-ALTA)

**Mercado:** Potencial MUY ALTO segun estudio. Gestion + comunidad + servicios + facturacion recurrente.
**Esfuerzo:** ALTO — requiere modulos nuevos de gestion residencial.

### Que se mantiene
- Multi-tenant, RBAC, auth
- Inventario (mantenimiento, suministros)
- Compras
- Automatizaciones (facturacion recurrente)
- Informes
- Personal

### Que se modifica/añade
| Cambio | Detalle | Esfuerzo |
|--------|---------|----------|
| Nuevo: Gestion habitaciones | Unidades residenciales con contratos, depositos, renovaciones | Alto |
| Nuevo: Comunidad | Tablero de anuncios, eventos comunidad, votaciones | Alto |
| Nuevo: Facturacion recurrente | Mensualidades, servicios extra, utilities split | Alto |
| Nuevo: Mantenimiento | Tickets de incidencias, asignacion, SLA | Medio |
| Nuevo: Accesos | Control llaves digitales, accesos comunes, parking | Medio |
| Eventos → Comunidad | Eventos sociales, coworking sessions, workshops | Bajo |
| Dashboard → Residencial | KPIs: ocupacion, churn, MRR, NPS, tickets abiertos | Medio |

### Nombre producto: **ColivOS** o **ResidOS**
### Pricing: 5€/unidad/mes (min 250€/mes)

---

## Vertical 5: WELLNESS & SPA (Prioridad MEDIA)

**Mercado:** Potencial ALTO. Reservas + CRM + pagos + fidelizacion.

### Que se mantiene
- Auth, multi-tenant, RBAC
- Catalogo (productos spa, tratamientos)
- Inventario (productos consumibles)
- Compras
- Personal (terapeutas, turnos)
- Clientes (CRM)
- Informes

### Que se modifica/añade
| Cambio | Detalle | Esfuerzo |
|--------|---------|----------|
| Eventos → Reservas tratamientos | Agenda por terapeuta, cabina, tipo tratamiento | Alto |
| Nuevo: Carta tratamientos | Catalogo con precios, duracion, fotos, combos | Medio |
| Nuevo: Membresías | Planes mensuales con creditos, descuentos, accesos | Alto |
| Nuevo: Fidelizacion | Puntos, niveles, recompensas | Medio |
| Dashboard → Spa | KPIs: revenue/cabina, ocupacion terapeutas, ticket medio, renovaciones | Medio |

### Nombre producto: **WellnessOS** o **SpaOS**
### Pricing: 99€/mes basico, 199€/mes con membresias

---

## Roadmap de Ejecucion

### Q2 2026: Consolidar ChefOS + Primer vertical

```
Abril     → Supabase real + Auth + Deploy ChefOS en Vercel
Mayo      → Beta cerrada con 3-5 hoteles reales
Junio     → Lanzar RestoOS (fork modular) — menor esfuerzo, mayor mercado
```

### Q3 2026: Expansion

```
Julio     → EventOS (ya tenemos el 90% con el wizard)
Agosto    → CampOS/GlampOS — aprovechar temporada alta camping
Septiembre → API publica + documentacion para integradores
```

### Q4 2026: Escalar

```
Octubre   → ColivOS (residencias/coliving)
Noviembre → WellnessOS (spas)
Diciembre → Marketplace de integraciones
```

---

## Estrategia Tecnica: Fork vs Monorepo

### Opcion A: Monorepo con feature flags (RECOMENDADA)

```
packages/
  core/          → Auth, RBAC, DB, UI, engines (compartido)
  hotel/         → ChefOS modules
  restaurant/    → RestoOS modules
  camping/       → CampOS modules
  events/        → EventOS modules
  coliving/      → ColivOS modules
apps/
  web/           → Next.js app (selecciona modulos por tenant config)
```

**Ventajas:** Un solo codebase, fixes en core benefician a todos, despliegue unificado.
**Herramientas:** Turborepo o pnpm workspaces.

### Opcion B: Fork por vertical

Copiar ChefOS, modificar. Mas rapido al principio, deuda tecnica exponencial.

**Recomendacion:** Empezar con B para el primer vertical (RestoOS), migrar a A cuando haya 3+ verticales.

---

## Diferenciacion vs Competencia

Basado en el estudio de mercado, nuestros diferenciadores:

| Diferenciador | Detalle | Competidores que NO lo tienen |
|---------------|---------|-------------------------------|
| **Precio transparente** | Tarifa publica, sin negociacion | Cloudbeds, Mews, Oracle |
| **Nativo en español** | UI, soporte, docs en castellano | Todos los Tier 1 |
| **Onboarding <48h** | Video Remotion + mock data + wizard | Oracle (semanas), Cloudbeds (dias) |
| **IA accesible** | OCR, voz, forecast, escandallo auto | Solo disponible en Enterprise |
| **6 engines deterministas** | Coste, demanda, procurement, margin, scaling, forecast | Ninguno ofrece todos juntos |
| **Multi-vertical** | Misma plataforma, diferentes modulos | Cada competidor es mono-sector |
| **API-first** | Supabase + REST + RPC | Oracle (cerrado), muchos Tier 2 |

---

## Modelo de Pricing Propuesto

| Plan | Precio | Incluye |
|------|--------|---------|
| **Starter** | 29€/mes | Dashboard, recetas, inventario, 1 usuario |
| **Professional** | 79€/mes | Todo Starter + eventos, compras, APPCC, 5 usuarios |
| **Business** | 149€/mes | Todo Pro + forecast, ing. menu, OCR, voz, 15 usuarios |
| **Enterprise** | Custom | Multi-propiedad, API, integraciones, SLA, usuarios ilimitados |

Modelo por vertical (camping): 8€/parcela/mes, min 200€/mes.
Modelo por vertical (coliving): 5€/unidad/mes, min 250€/mes.

---

## Resumen Ejecutivo

ChefOS no es solo una app de cocina de hotel. Es una **plataforma modular** que puede expandirse a 6 verticales del mercado SaaS hostelero hispanohablante, un mercado de cientos de millones con competencia fragmentada.

**Activos actuales:**
- 38 paginas funcionales
- 6 motores de calculo (funciones puras, reutilizables)
- 149 unit tests
- Multi-tenant + RBAC
- OCR + Voz + IA
- Video de onboarding listo

**Primer movimiento:** RestoOS (restaurantes) — 80% del codigo ya existe, mercado de 2.645M USD.

**Ventana de oportunidad:** 3-5 años antes de que los grandes (Oracle, Mews, Cloudbeds) bajen a nichos pequeños con soporte en español.
