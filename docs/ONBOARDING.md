# ChefOS — Guía de onboarding para el equipo

> Guía para que cualquier desarrollador pueda arrancar, entender y contribuir al proyecto en menos de 30 minutos.

---

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js App Router | 16.x |
| Lenguaje | TypeScript strict | 5.x |
| Estilos | Tailwind CSS v4 | 4.x |
| Componentes | shadcn/ui (base-ui) | latest |
| Formularios | React Hook Form + Zod v4 | — |
| Data fetching | TanStack Query | 5.x |
| Base de datos | Supabase (PostgreSQL) | — |
| Tests unitarios | Vitest | — |
| Tests E2E | Playwright | 1.49+ |
| CI/CD | GitHub Actions | — |

---

## Arrancar en local

```bash
# 1. Clonar y entrar
git clone <repo>
cd chefos

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus claves (ver abajo)

# 4. Arrancar servidor de desarrollo
npm run dev
# → http://localhost:3000 (o 3001 si el 3000 está ocupado)
```

### Variables de entorno (`.env.local`)

```env
# Supabase (obligatorio para datos reales)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# IA — opcionales (la app funciona con mock sin ellas)
GEMINI_API_KEY=           # Briefing diario IA
MISTRAL_API_KEY=          # OCR albaranes
RESEND_API_KEY=           # Email notifications (futuro)
```

> **Sin Supabase configurado:** la app usa datos mock automáticamente. Puedes navegar todas las páginas sin problema.

---

## Estructura del proyecto

```
chefos/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, registro
│   │   ├── (dashboard)/     # Todas las páginas protegidas
│   │   │   ├── page.tsx     # Dashboard principal
│   │   │   ├── recipes/     # Recetas
│   │   │   ├── events/      # Eventos + calendario
│   │   │   ├── procurement/ # Compras + pedidos
│   │   │   ├── inventory/   # Stock + lotes + movimientos
│   │   │   ├── catalog/     # Productos, proveedores, categorías, unidades
│   │   │   ├── operations/  # Kanban + staff
│   │   │   ├── appcc/       # APPCC/HACCP
│   │   │   ├── escandallo/  # Escandallo dinámico
│   │   │   ├── menu-engineering/ # Matriz Boston
│   │   │   ├── staffing/    # Planificación personal
│   │   │   ├── reports/     # Informes PDF/CSV
│   │   │   ├── alerts/      # Centro de alertas
│   │   │   ├── automations/ # Monitor de automatizaciones
│   │   │   └── settings/    # Configuración
│   │   ├── api/
│   │   │   ├── ocr-albaran/ # POST — Mistral Vision
│   │   │   └── briefing/    # POST — Gemini
│   │   └── layout.tsx       # Root layout (PWA, ThemeProvider)
│   │
│   ├── features/            # Módulos de negocio
│   │   ├── appcc/           # types, mock-data, hooks
│   │   ├── catalog/         # hooks, components (AllergenEditor, ProductAliases)
│   │   ├── dashboard/       # mock-data, BriefingWidget
│   │   ├── escandallo/      # types, mock-data, hooks
│   │   ├── events/          # FSM, calendar, mock-data, hooks
│   │   ├── inventory/       # hooks, waste-types, WasteRecordForm, StockReservations
│   │   ├── menu-engineering/# types, mock-data, hooks
│   │   ├── operations/      # hooks, services
│   │   ├── procurement/     # PO FSM, OCRAlbaranDialog, hooks
│   │   ├── recipes/         # hooks, schemas, services
│   │   ├── reporting/       # report-mock-data
│   │   └── staffing/        # types, mock-data, hooks
│   │
│   ├── components/
│   │   ├── ui/              # shadcn/ui — Dialog, Button, Card, Table, Tabs, Badge...
│   │   ├── sidebar.tsx      # Sidebar colapsable (SidebarContext)
│   │   ├── dashboard-shell.tsx # Shell cliente con layout dinámico
│   │   ├── mobile-header.tsx   # Header hamburger (lg:hidden)
│   │   ├── fab.tsx          # FAB acciones rápidas (lg:hidden)
│   │   ├── command-palette.tsx  # Overlay ⌘K
│   │   ├── command-palette-provider.tsx # Context + shortcut global
│   │   ├── role-gate.tsx    # <RoleGate permission="..."> RBAC wrapper
│   │   ├── voice-mic-button.tsx # Botón micrófono animado
│   │   ├── pwa-register.tsx # Registra service worker
│   │   ├── pwa-install-prompt.tsx # Banner instalación PWA
│   │   ├── theme-provider.tsx   # next-themes wrapper
│   │   ├── theme-toggle.tsx     # Botón Sol/Luna
│   │   ├── page-skeleton.tsx    # TableSkeleton para loading states
│   │   └── empty-state.tsx      # EmptyState con icono y CTA
│   │
│   ├── hooks/
│   │   ├── use-voice-input.ts   # Web Speech API hook
│   │   └── use-role.ts          # Lee rol del usuario autenticado
│   │
│   └── lib/
│       ├── rbac.ts              # Permisos y roles
│       ├── voice-parser.ts      # NLP español para voz
│       ├── reports.ts           # exportCSV, printReport
│       ├── command-palette-data.ts # Comandos de navegación
│       ├── sidebar-context.tsx  # Estado sidebar (collapsed/mobileOpen)
│       ├── mock-data.ts         # Datos sintéticos globales
│       ├── auth.ts              # Helpers de autenticación Supabase
│       └── utils.ts             # cn() y utilidades generales
│
├── docs/
│   ├── task.md              # Plan de sprints (fuente de verdad)
│   ├── CHANGELOG.md         # Historial de cambios
│   ├── ONBOARDING.md        # Este archivo
│   ├── API_REFERENCE.md     # Referencia de API
│   └── INLINE_DOCS.md       # Docs inline del código
│
├── e2e/                     # Tests Playwright
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── sw.js               # Service Worker
│   └── icons/              # Iconos SVG de la app
├── supabase/
│   ├── migrations/         # Migraciones SQL
│   └── seeds/              # Datos iniciales de demo
└── .github/workflows/ci.yml # CI/CD pipeline
```

---

## Patrones de código

### 1. Página nueva (list page)

```tsx
// src/app/(dashboard)/mi-modulo/page.tsx
"use client"
import { useState } from "react"
import { TableSkeleton } from "@/components/page-skeleton"
import { EmptyState } from "@/components/empty-state"
import { useMisDatos } from "@/features/mi-modulo/hooks/use-mis-datos"
import { IconoDelModulo } from "lucide-react"

export default function MiModuloPage() {
  const { data, isLoading } = useMisDatos()

  if (isLoading) return <TableSkeleton cols={4} />
  if (!data?.length) return (
    <EmptyState
      icon={IconoDelModulo}
      title="Sin datos todavía"
      description="Crea el primer registro"
      action={{ label: "Crear", onClick: () => {} }}
    />
  )
  // ... tabla
}
```

### 2. Proteger un botón con RBAC

```tsx
import { RoleGate } from "@/components/role-gate"

<RoleGate permission="recipe:approve">
  <Button>Aprobar receta</Button>
</RoleGate>

// Con fallback:
<RoleGate permission="po:create" fallback={<span>Sin permisos</span>}>
  <Button>Nuevo pedido</Button>
</RoleGate>
```

### 3. Mock data + Supabase fallback (patrón estándar)

```typescript
// src/features/mi-modulo/hooks/use-mi-hook.ts
export function useMisDatos() {
  const { hotelId } = useActiveHotel()

  return useQuery({
    queryKey: ["mis-datos", hotelId],
    queryFn: async () => {
      if (!hotelId) return MOCK_MIS_DATOS  // ← fallback automático
      return miServicio.getAll(hotelId)
    },
  })
}
```

### 4. Añadir voz a un campo

```tsx
import { useVoiceInput } from "@/hooks/use-voice-input"
import { VoiceMicButton } from "@/components/voice-mic-button"
import { parseRecipeVoice } from "@/lib/voice-parser"

const voice = useVoiceInput({
  lang: "es-ES",
  onResult: (transcript) => {
    const parsed = parseRecipeVoice(transcript)
    if (parsed.name) form.setValue("name", parsed.name)
  },
})

// En el JSX:
{voice.isSupported && (
  <VoiceMicButton
    status={voice.status}
    isSupported={voice.isSupported}
    onStart={voice.start}
    onStop={voice.stop}
    label="Dictar"
  />
)}
```

### 5. Nueva API route con IA (patrón mock-first)

```typescript
// src/app/api/mi-endpoint/route.ts
export async function POST(request: Request) {
  const apiKey = process.env.MI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ result: mockResult(), mock: true })
  }

  try {
    // llamada real a la API
    const result = await callExternalAPI(apiKey, ...)
    return NextResponse.json({ result, mock: false })
  } catch {
    return NextResponse.json({ result: mockResult(), mock: true })
  }
}
```

---

## FSMs (Máquinas de estado)

### Eventos
```
borrador → confirmado → en_preparacion → completado
    ↓           ↓              ↓
  cancelado  cancelado      cancelado
```

### Órdenes de compra (POs)
```
borrador → enviada → recibida
    ↓         ↓
 cancelada  cancelada
```

---

## RBAC — Roles y permisos

| Permiso | admin | jefe_cocina | cocinero | maitre | compras | viewer |
|---------|:-----:|:-----------:|:--------:|:------:|:-------:|:------:|
| recipe:approve | ✅ | ✅ | — | — | — | — |
| recipe:create | ✅ | ✅ | ✅ | — | — | — |
| event:confirm | ✅ | ✅ | — | — | — | — |
| event:create | ✅ | ✅ | — | ✅ | — | — |
| po:create | ✅ | — | — | — | ✅ | — |
| po:receive | ✅ | — | — | — | ✅ | — |
| inventory:adjust | ✅ | ✅ | — | — | — | — |
| inventory:waste | ✅ | ✅ | ✅ | — | — | — |
| staff:manage | ✅ | ✅ | — | — | — | — |
| settings:access | ✅ | — | — | — | — | — |

---

## Tests

```bash
# Unit tests (Vitest)
npm run test

# Unit tests en modo watch
npm run test -- --watch

# E2E tests (requiere servidor corriendo en :3001)
npm run dev &
npm run test:e2e

# Solo TypeScript
npx tsc --noEmit
```

---

## CI/CD

El pipeline de GitHub Actions (`ci.yml`) se ejecuta en cada push/PR:

1. **TypeScript** → `tsc --noEmit`
2. **Build** → `next build` (con env vars placeholder)
3. **Unit tests** → `vitest --run`
4. **E2E tests** → Playwright Chromium (depende de que el build pase)

Los artefactos de Playwright (capturas, trazas) se suben como artifacts si los tests fallan.

---

## Roadmap pendiente

Ver [`docs/task.md`](./task.md) para el plan completo.

| Sprint | Estado | Contenido |
|--------|--------|-----------|
| G2 | ✅ Completo | PWA, Tablet UX, Command palette, Reports, Voz |
| G3 | ✅ Completo | OCR albaranes, Briefing IA |
| G4 | 🔜 Próximo | Forecasting, Price tracking, Multi-hotel |
| G5 | ⏳ Pendiente | Supabase Cloud + Vercel deploy |
| G6 | 🔮 Futuro | i18n, ERP, Mobile app |

---

## Contacto y recursos

- **Repositorio:** `G:/culinary claude/chefos`
- **Dev server:** http://localhost:3001
- **Supabase dashboard:** https://app.supabase.com
- **Docs inline:** `docs/INLINE_DOCS.md`
- **API reference:** `docs/API_REFERENCE.md`
