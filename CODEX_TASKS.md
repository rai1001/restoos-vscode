# Tareas para Codex — RestoOS

## Tarea 1: Renombrar "hotel" → "restaurante" en toda la UI

El modelo de datos usa `hotel_id` internamente (no cambiar DB), pero la UI debe mostrar "restaurante" o "local" en vez de "hotel".

### Archivos a modificar:

**Componentes:**
- `src/components/hotel-switcher.tsx` → renombrar a `restaurant-switcher.tsx`
  - Componente `HotelSwitcher` → `RestaurantSwitcher`
  - Interface `HotelOption` → `RestaurantOption`
  - Variables: `hotels` → `restaurants`, `activeHotelId` → `activeRestaurantId`
  - Toast messages ya dicen "restaurante" ✓

- `src/components/sidebar.tsx`
  - Link a `/settings/hotel` → `/settings/restaurant`
  - Importar `RestaurantSwitcher` en vez de `HotelSwitcher`

**Hooks:**
- `src/lib/auth/hooks.ts`
  - `useActiveHotel()` → `useActiveRestaurant()`
  - Interface `ActiveHotel` → `ActiveRestaurant`
  - Constante `EMPTY_ACTIVE_HOTEL` → `EMPTY_ACTIVE_RESTAURANT`
  - Mantener los campos internos (`hotelId`, `tenantId`, `role`) sin cambiar — solo el nombre exportado

**Páginas:**
- `src/app/(dashboard)/settings/hotel/` → mover a `src/app/(dashboard)/settings/restaurant/`
  - Componente `HotelSettingsPage` → `RestaurantSettingsPage`

**RBAC:**
- `src/lib/rbac/module-access.ts` — ruta `/settings/hotel` → `/settings/restaurant`

**Landing:**
- `src/app/landing/page.tsx` línea 165 — "Cada hotel/restaurante" → "Cada restaurante"

### Reglas:
- NO cambiar nombres de tablas en Supabase (hotels, hotel_id se quedan)
- NO cambiar migraciones
- NO cambiar los campos de tipos internos (hotelId en interfaces internas)
- Solo cambiar lo que el usuario ve: nombres de componentes, hooks exportados, textos UI, rutas URL
- Buscar y actualizar TODOS los imports que referencien los nombres antiguos
- Hacer `npx tsc --noEmit` al final para verificar que no hay errores de tipos

### Comando de búsqueda para encontrar todos los imports:
```
grep -r "useActiveHotel\|HotelSwitcher\|hotel-switcher\|settings/hotel" src/ --include="*.ts" --include="*.tsx" -l
```

---

## Tarea 2: Actualizar CLAUDE.md — estado del proyecto

El archivo `CLAUDE.md` dice que el proyecto está CONGELADO. Hay que actualizarlo.

### Cambios:
- Estado: CONGELADO → ACTIVO (lanzamiento en curso)
- Añadir a "Que esta hecho":
  - Stripe integrado (checkout, portal, webhook)
  - Onboarding persistente con 3 vías de import (OCR, Excel/CSV, Templates)
  - Security hardening (CSP, CORS, rate limiting, API key fix)
  - Trial 7 días sin tarjeta
  - Settings > Billing page
  - Feature gating por plan
  - Migration 042 (onboarding + subscriptions)
- Blocker critico: cambiar de "BILLING (Stripe)" a "Configurar env vars Stripe en Vercel + crear productos en Stripe Dashboard"
- Añadir nuevas API routes: /api/onboarding, /api/billing/checkout, /api/billing/portal, /api/webhooks/stripe
- Actualizar conteo: ahora son 50+ páginas, 11+ API routes

---

## Tarea 3: Añadir tab "Facturación" al settings page

El settings page (`src/app/(dashboard)/settings/page.tsx`) tiene tabs para "Restaurante", "Equipo", "Notificaciones". Falta "Facturación".

### Cambios:
- Añadir tab/link "Facturación" que apunte a `/settings/billing`
- Icono: `CreditCard` de lucide-react
- Posición: después de "Equipo", antes de "Notificaciones"
- Mantener el mismo estilo visual que los tabs existentes

---

## Tarea 4: Redirect de `/settings/hotel` → `/settings/restaurant`

Para no romper bookmarks/links existentes, añadir redirect en `next.config.ts`:

```typescript
async redirects() {
  return [
    {
      source: "/settings/hotel",
      destination: "/settings/restaurant",
      permanent: true,
    },
  ]
}
```

---

## Notas generales para Codex
- Design system: Calm Darkness. Acento bronze `#B8906F`. Font: DM Sans.
- No añadir emojis a la UI
- Verificar con `npx tsc --noEmit` después de cada tarea
- Verificar con `npm run build` al final de todas las tareas
