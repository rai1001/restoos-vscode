# Plan de Implementación — 8 Features Prioritarias

> Fecha: 31 marzo 2026
> Contexto: RestoOS demo-ready (13 páginas), €79/mes, piloto 3-5 restaurantes abril-mayo
> Principio: cada feature debe ser demostrable en 30 segundos o no entra

---

## FASE 1 — VENTA (Semanas 1-2, abril 1-14)
*Lo que necesitas para cerrar los primeros pilotos*

### F1: Onboarding asistido + importador de datos
**Impacto venta: MÁXIMO** — El mayor miedo del hostelero es "otro sistema que alimentar a mano"

#### Implementación
1. **Importador carta PDF/Excel** (3 días)
   - Ruta: `/onboarding/import`
   - Upload PDF de carta → OCR (Gemini Vision, ya tienes endpoint `/api/ocr-recipe`)
   - Extrae: platos, categorías, precios venta
   - UI: tabla editable donde el restaurante valida/corrige

2. **Importador albarán/factura** (2 días)
   - Reutiliza `/api/ocr-albaran` que ya existe
   - Upload foto/PDF → extrae: proveedor, productos, cantidades, precios, caducidades
   - Crea lotes de stock + ofertas de proveedor automáticamente

3. **Wizard de setup** (2 días)
   - 4 pasos: Restaurante → Carta → Proveedores → Listo
   - Paso 1: nombre, dirección, tipo cocina
   - Paso 2: sube carta → importa → valida
   - Paso 3: sube 2-3 albaranes → crea proveedores + productos + precios
   - Paso 4: dashboard con datos reales del restaurante
   - Barra progreso: "Tu restaurante está al 80%"

4. **Panel founder** (1 día)
   - Ruta: `/admin/setup-status`
   - Lista de restaurantes piloto, % completado, items pendientes de validar
   - Tú revisas lo dudoso y lo apruebas

#### Archivos a crear/modificar
```
src/app/(dashboard)/onboarding/page.tsx          — Wizard principal
src/app/(dashboard)/onboarding/import-menu/page.tsx
src/app/(dashboard)/onboarding/import-invoices/page.tsx
src/app/(dashboard)/admin/setup-status/page.tsx  — Panel founder
src/features/onboarding/hooks/use-import.ts
src/features/onboarding/services/import.service.ts
```

#### Dependencias
- Gemini Vision API key en env (para OCR)
- Ya existe: `/api/ocr-albaran`, `/api/ocr-recipe`

---

### F3: Recepción mercancía con cámara + OCR + alertas precio
**Impacto venta: ALTO** — Ahorro de tiempo visible en 30 segundos

#### Implementación
1. **Captura desde cámara** (1 día)
   - Botón "Escanear albarán" en el formulario de entrada que ya existe
   - Abre cámara del móvil/tablet → foto → envía a `/api/ocr-albaran`
   - Pre-rellena formulario con datos extraídos

2. **Alerta variación precio** (1 día)
   - Al registrar entrada: compara precio unitario vs último precio conocido (supplier_offers)
   - Si variación > 5%: badge rojo "↑8.4%" al lado del precio
   - Toast: "Salmón subió 8.4% vs último pedido (€12.50 → €13.55)"
   - Tabla resumen al final: "3 productos con variación significativa"

3. **Historial de precios por producto** (0.5 día)
   - En detalle de producto: gráfico sparkline últimos 6 meses
   - Tabla: fecha, proveedor, precio, variación %

#### Archivos a crear/modificar
```
src/features/inventory/components/stock-entry-form.tsx  — Añadir botón cámara + alertas
src/features/inventory/components/price-alert-badge.tsx  — Nuevo
src/features/catalog/components/price-history.tsx        — Nuevo
```

---

## FASE 2 — RETENCIÓN (Semanas 3-4, abril 15-30)
*Lo que hace que no se vayan después del mes gratis*

### F5: Resumen diario/semanal por WhatsApp/email
**Impacto retención: MÁXIMO** — Si no abren la app, la app va a ellos

#### Implementación
1. **Generador de resumen** (1 día)
   - RPC o Edge Function que recoge:
     - Top 3 variaciones precio (de stock_movements últimas 24h)
     - Productos próximos a caducar (stock_lots.expiry_date < hoy+3)
     - Plato con peor margen/hora (cuando exista)
     - Tareas APPCC pendientes
     - Propuesta de pedido (productos bajo mínimo)
   - Formatea en texto corto (WhatsApp) o HTML (email)

2. **Canal de envío** (1 día)
   - Email: Resend (ya usado en send-purchase-order) → cron diario 7:00
   - WhatsApp: UltraMsg ($15/mes) o WhatsApp Business API
   - Configuración por restaurante: email, WhatsApp, ambos, ninguno

3. **Cron/scheduler** (0.5 día)
   - Supabase Edge Function con pg_cron
   - O GAS con trigger temporal (ya dominas esto)

#### Archivos a crear
```
supabase/functions/daily-digest/index.ts
src/app/(dashboard)/settings/notifications/page.tsx
```

---

### F2: Ventas → consumo → inventario teórico
**Impacto retención: ALTO** — "El stock se mueve solo"

#### Implementación (ya parcialmente hecha)
1. **Importación CSV de ventas** (1 día)
   - Upload CSV del TPV (columnas: fecha, plato, cantidad, importe)
   - Mapeo automático plato → receta (fuzzy match por nombre)
   - UI para confirmar mapeos dudosos

2. **Consumo automático** (ya existe)
   - `consume_recipe_by_sale()` ya está implementado en migrations
   - `useConsumeRecipeBySale` hook ya existe
   - Solo falta conectar con el importador CSV

3. **Dashboard inventario teórico vs real** (1 día)
   - Nueva sección en `/inventory`: "Teórico vs Real"
   - Tabla: producto, stock teórico (según ventas), stock real (último conteo), diferencia, % merma
   - Alertas: "Aceite oliva: teórico 8L, real 5L → 37.5% merma no registrada"

4. **API TPV** (ya existe)
   - `POST /api/tpv/sales` ya implementado con auth por API key
   - Documentar para integradores

#### Archivos a crear/modificar
```
src/features/inventory/components/csv-import-sales.tsx
src/features/inventory/components/theoretical-vs-real.tsx
src/app/(dashboard)/inventory/theoretical/page.tsx
```

---

### F4: Margen/hora accionable
**Impacto retención: ALTO** — Diferenciador convertido en motor de decisiones

#### Implementación
1. **Campos en receta** (0.5 día)
   - Añadir a recipes: `batch_size`, `service_time_min`
   - batch_size: cuántas raciones salen de una elaboración
   - service_time_min: tiempo de ejecución por comanda

2. **Cálculo margen/hora** (0.5 día)
   - Tiempo/ración = (prep_time_min ÷ batch_size) + service_time_min
   - Margen/hora = margen_bruto × (60 ÷ tiempo_ración)
   - Nuevo campo calculado en escandallo y menú engineering

3. **Recomendaciones automáticas** (1 día)
   - Engine que analiza la carta y genera:
     - "Sube Croquetas +€0.80 — margen/hora subiría de €50 a €60"
     - "Reduce gramaje Solomillo 10g — ahorro €0.45/ración"
     - "Mueve Soufflé a fin de semana — peor margen/hora de la carta"
     - "Batch de mise en place jueves para servicio viernes"
   - Mostrar en Ingeniería Menú como tab "Recomendaciones IA"

#### Archivos a crear/modificar
```
supabase/migrations/XXXXX_margin_per_hour.sql
src/features/menu-engineering/components/recommendations.tsx
src/features/menu-engineering/engine/margin-hour-engine.ts
src/features/escandallo/components/margin-hour-column.tsx
```

---

## FASE 3 — SOLIDEZ (Semanas 5-6, mayo 1-14)
*Lo que da confianza y profesionalidad*

### F8: Pack cumplimiento (APPCC + etiquetas + fichas técnicas)
**Impacto venta+retención: ALTO** — Vende por "riesgo evitado"

#### Implementación
1. **PDF APPCC para inspección** (1 día)
   - Botón "Exportar informe" en `/appcc`
   - Genera PDF: período, todos los registros, alertas, acciones correctivas
   - Logo restaurante + fecha + firma digital

2. **Fichas técnicas desde receta** (1 día)
   - Por cada receta: PDF con ingredientes, alérgenos, proceso, foto
   - Formato estándar que piden los inspectores

3. **Etiquetas desde lote** (ya existe parcialmente)
   - Módulo Etiquetado ya está en el sidebar
   - Conectar con stock_lots para generar etiquetas con fecha elaboración, caducidad, lote

4. **Tabla alérgenos de carta** (0.5 día)
   - Tabla cruzada: platos × 14 alérgenos
   - PDF descargable para tener en sala
   - Obligatorio por ley, muchos restaurantes no lo tienen actualizado

#### Archivos a crear
```
src/features/appcc/components/export-pdf.tsx
src/features/recipes/components/tech-sheet-pdf.tsx
src/features/catalog/components/allergen-matrix.tsx
src/app/api/export/appcc-report/route.ts
src/app/api/export/tech-sheet/route.ts
```

---

### F7: Roles, permisos, log de cambios
**Impacto retención: MEDIO-ALTO** — Cuando lo usa más de 1 persona

#### Implementación
1. **Roles ya existen en schema** (memberships.role)
   - superadmin, direction, head_chef, cook, procurement, admin
   - Solo falta: UI de gestión + enforcement en frontend

2. **Permisos por módulo** (1 día)
   - Matriz: rol × módulo (ver/editar/aprobar)
   - Cook: ve recetas, registra APPCC, no ve costes
   - Procurement: ve inventario, crea pedidos, no edita recetas
   - Mostrar/ocultar sidebar items según rol

3. **Aprobación de pedidos** (0.5 día)
   - Pedido creado por procurement → estado "pendiente aprobación"
   - Chef/gerente aprueba → se puede enviar
   - Ya existe FSM de estados en po-fsm.ts

4. **Log de cambios** (0.5 día)
   - Tabla `audit_log`: who, what, when, old_value, new_value
   - Trigger en tablas críticas: recipes, stock_lots, purchase_orders
   - Vista en admin: "Últimos cambios"

---

### F6: Modo cocina móvil
**Impacto retención: MEDIO** — La cocina no quiere formularios

#### Implementación
1. **Layout "modo cocina"** (1 día)
   - Toggle en header: "Modo cocina" → layout simplificado
   - Botones grandes, texto grande, sin sidebar
   - 4 acciones: Registrar entrada, Merma, APPCC, Producción

2. **Microflujos** (1 día)
   - Merma en 2 toques: producto → cantidad → motivo → listo
   - APPCC en 3 toques: control → valor → confirmar
   - Ya existe input por voz en merma (VoiceMicButton)

3. **PWA offline** (1 día)
   - Service worker ya existe (public/sw.js)
   - Cache de productos, recetas, controles APPCC
   - Sync cuando vuelve conexión

---

## CALENDARIO RESUMEN

| Semana | Fechas | Features | Entregable |
|--------|--------|----------|------------|
| S1 | 1-7 abr | F1 Onboarding wizard (pasos 1-3) | Wizard funcional con OCR |
| S2 | 8-14 abr | F1 Panel founder + F3 OCR albarán + alertas precio | Demo completa onboarding |
| S3 | 15-21 abr | F5 Digest diario + F2 CSV ventas → consumo | "Stock que se mueve solo" |
| S4 | 22-30 abr | F4 Margen/hora accionable + recomendaciones IA | Diferenciador en demo |
| S5 | 1-7 may | F8 Pack cumplimiento (PDFs, fichas, alérgenos) | Material para inspecciones |
| S6 | 8-14 may | F7 Roles/permisos + F6 Modo cocina móvil | Multi-usuario + tablet |

## ESFUERZO ESTIMADO

| Feature | Días | Prioridad | Impacto venta | Impacto retención |
|---------|------|-----------|---------------|-------------------|
| F1 Onboarding | 8 | P0 | ★★★★★ | ★★★★ |
| F3 OCR + alertas | 2.5 | P0 | ★★★★ | ★★★ |
| F5 Digest diario | 2.5 | P1 | ★★★ | ★★★★★ |
| F2 Ventas→consumo | 3 | P1 | ★★★★ | ★★★★ |
| F4 Margen/hora | 2 | P1 | ★★★★★ | ★★★ |
| F8 Cumplimiento | 3.5 | P2 | ★★★★ | ★★★★ |
| F7 Roles/permisos | 2 | P2 | ★★ | ★★★★ |
| F6 Modo cocina | 3 | P2 | ★★★ | ★★★★ |
| **TOTAL** | **26.5 días** | | | |

## REGLA DE ORO
Cada feature se implementa primero con mock data (demostrable), después se conecta a Supabase. No se bloquea una demo por backend incompleto.
