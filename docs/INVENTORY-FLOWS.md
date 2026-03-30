# Inventario — Flujos de entrada y salida

## Estado actual
- `stock_lots`: lotes FIFO con cantidad, coste unitario, caducidad
- `stock_movements`: ledger inmutable (reception, consumption, waste, adjustment)
- RPCs: `receive_goods()`, `record_waste()`
- UI: tabla de stock con niveles, página de lotes, página de movimientos
- **Falta**: formularios de entrada y salida de mercancía

## Flujo 1: Entrada de mercancía

### UX
- Botón "Registrar Entrada" en página inventario (ya existe como "Nuevo Pedido")
- Dialog/página con formulario:
  1. Proveedor (select del catálogo)
  2. Nº albarán (opcional, texto libre)
  3. Fecha recepción (default: hoy)
  4. Líneas de producto:
     - Producto (combobox búsqueda)
     - Cantidad + unidad
     - Precio unitario (€/kg, €/ud, etc.)
     - Fecha caducidad (date picker)
     - [+ Añadir línea]
  5. Botón "Registrar entrada"

### Lógica
- Por cada línea: crea `stock_lot` + `stock_movement` tipo `reception`
- Actualiza stock visible inmediatamente
- Mock mode: push a array en memoria

### Campos
```typescript
interface StockEntry {
  supplier_id: string | null;
  delivery_note?: string;
  received_at: string; // ISO date
  lines: StockEntryLine[];
}

interface StockEntryLine {
  product_id: string;
  quantity: number;
  unit_id: string;
  unit_cost: number;
  expiry_date?: string;
}
```

## Flujo 2: Registro de merma

### UX
- Botón "Registrar Merma" en página inventario
- Dialog simple:
  1. Producto (combobox)
  2. Cantidad
  3. Motivo: caducado | deteriorado | accidente | sobreproducción | otro
  4. Notas (opcional)
  5. Botón "Registrar merma"

### Lógica
- Descuenta del lote FIFO más antiguo (por expiry_date)
- Crea `stock_movement` tipo `waste`
- Si cantidad > lote actual, descuenta de múltiples lotes FIFO
- Mock mode: reduce current_quantity en mock data

### Campos
```typescript
interface WasteRecord {
  product_id: string;
  quantity: number;
  reason: 'expired' | 'damaged' | 'accident' | 'overproduction' | 'other';
  notes?: string;
}
```

## Flujo 3: Consumo por receta (futuro, mes 2)
- Seleccionar receta → raciones producidas
- Auto-calcula ingredientes × raciones
- Descuenta FIFO automático
- Movimiento `consumption`

## Flujo 4: Ajuste manual (futuro)
- Post-inventario físico
- Producto + cantidad real → sistema calcula diferencia
- Movimiento `adjustment`
