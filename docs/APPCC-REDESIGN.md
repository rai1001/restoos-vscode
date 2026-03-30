# APPCC — Rediseño completo

## Estado actual
- Página con registros del día (mock data hardcoded)
- 8 controles fijos: 2 cámaras, congelador, cocción, 2 limpiezas, recepción, aceite fritura
- Sin configuración por restaurante
- Sin distinción de frecuencia (diario/semanal/mensual)
- Sin checklist auto-generado

## Nuevo diseño: 3 niveles

### Nivel 1: Setup del restaurante (una vez)

#### Equipos y puntos de control
Cada restaurante define sus equipos:

```typescript
interface AppccEquipment {
  id: string;
  name: string;           // "Cámara frigorífica 1"
  type: 'fridge' | 'freezer' | 'fryer' | 'hood' | 'oven' | 'surface' | 'other';
  location?: string;      // "Cocina principal"
}

interface AppccControl {
  id: string;
  equipment_id: string;
  name: string;           // "Temperatura cámara 1"
  control_type: 'temperature' | 'cleaning' | 'oil_test' | 'maintenance' | 'reception' | 'other';
  frequency: 'daily' | 'twice_daily' | 'weekly' | 'monthly';
  day_of_week?: number;   // 1=lunes (para semanales)
  day_of_month?: number;  // 1-28 (para mensuales)
  input_type: 'number' | 'boolean' | 'text';
  unit?: string;          // "°C", "% polar"
  min_value?: number;     // 0 para cámara
  max_value?: number;     // 5 para cámara
  instructions?: string;  // "Abrir puerta, esperar 30s, leer termómetro digital"
}
```

#### Plantillas pre-configuradas
Para no empezar de cero, ofrecer plantillas:
- **Restaurante básico**: 1 cámara, 1 congelador, 1 freidora, campana, superficies
- **Restaurante completo**: 2 cámaras, congelador, 2 freidoras, campana, horno, baño maría
- **Bar/tapas**: 1 cámara, 1 congelador, plancha, superficies

#### UX Setup
1. Pantalla APPCC → tab "Configuración" (nuevo)
2. "Elige plantilla o configura desde cero"
3. Lista de equipos → añadir/editar/eliminar
4. Por equipo: lista de controles con frecuencia y límites
5. Guardar → genera plantilla maestra

### Nivel 2: Checklist diario auto-generado

#### Lógica de generación
Cada día a las 00:00 (o al abrir la app):
1. Lee controles con frequency='daily' o 'twice_daily'
2. Si es el day_of_week correcto → añade semanales
3. Si es el day_of_month correcto → añade mensuales
4. Genera checklist con estado 'pending' para cada control

#### UX Checklist
- Tab "Registros del día" (ya existe, pero ahora auto-generado)
- Lista de controles pendientes agrupados por tipo:

  **TEMPERATURAS** (08:00)
  ☐ Cámara 1: [___] °C (0-5°C)
  ☐ Cámara 2: [___] °C (0-5°C)
  ☐ Congelador: [___] °C (-18/-22°C)

  **LIMPIEZA DIARIA**
  ☐ Superficies trabajo: ✓/✗
  ☐ Tablas de corte: ✓/✗
  ☐ Suelos cocina: ✓/✗

  **ACEITE FRITURA**
  ☐ Freidora 1: [___] % polar (≤25%)

  **SEMANAL** (solo si aplica hoy)
  ☐ Limpieza interior cámara 1: ✓/✗
  ☐ Limpieza campana extractora: ✓/✗

- Tap en cada control → introduce valor → marca automático OK/ALERTA
- Firma al completar: nombre del responsable
- Barra de progreso: "6/8 completados"

#### Tipos de control y su input

| Tipo | Input | Validación |
|------|-------|------------|
| Temperatura | Número (°C) | min_value ≤ valor ≤ max_value |
| Limpieza | Checkbox (sí/no) | Debe ser "sí" |
| Aceite fritura | Número (% polar) | ≤ max_value |
| Mantenimiento | Checkbox + notas | Debe ser "sí" |
| Recepción | Número (°C) + checkbox estado | Temp ≤ max + estado OK |

### Nivel 3: Informes (ya existe parcialmente)

#### Mejoras
- Filtro por período (semana, mes, trimestre)
- Exportar PDF para inspección sanitaria
- Resumen: días con registro / días totales, alertas, acciones correctivas
- Gráfico de temperatura por equipo (tendencia)

## Implementación por fases

### Fase 1 (ahora — demo ready)
- Mock data para setup (plantilla "restaurante básico" pre-cargada)
- Checklist diario auto-generado desde mock config
- Input de valores con validación OK/ALERTA
- Progress bar

### Fase 2 (mes 2 — con Supabase)
- Tablas: `appcc_equipment`, `appcc_controls`, `appcc_records`
- CRUD real de configuración
- Histórico real
- Exportar PDF

## Schema DB (futuro)

```sql
create table appcc_equipment (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id),
  name text not null,
  type text not null,
  location text,
  is_active boolean default true,
  sort_order integer default 0
);

create table appcc_controls (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id),
  equipment_id uuid not null references appcc_equipment(id) on delete cascade,
  name text not null,
  control_type text not null,
  frequency text not null check (frequency in ('daily','twice_daily','weekly','monthly')),
  day_of_week integer,
  day_of_month integer,
  input_type text not null check (input_type in ('number','boolean','text')),
  unit text,
  min_value numeric,
  max_value numeric,
  instructions text,
  is_active boolean default true,
  sort_order integer default 0
);

create table appcc_records (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id),
  control_id uuid not null references appcc_controls(id),
  record_date date not null,
  value text,
  is_ok boolean not null,
  notes text,
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz default now()
);
```
