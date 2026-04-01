# Stabilization Pass - 2026-03-31

## Objetivo

Cerrar la pasada de estabilizacion tecnica del repo activo `C:\RestoOsvscode` sin ocultar problemas con reglas mas laxas.

## Estado de partida

Antes de esta pasada el repo tenia varios frentes abiertos:

- `npm run build` fallaba por errores en API route y referencias fuera de scope.
- `npm run lint` fallaba con errores reales de React 19, pureza en render y naming reservado.
- `npx tsc --noEmit` fallaba con errores de tipado en app y una cola larga de tests bajo `noUncheckedIndexedAccess`.
- Next 16 seguia avisando por el uso de `src/middleware.ts`.

## Cambios realizados

### 1. React 19 / lint error fixes

Se eliminaron los errores de lint que estaban rompiendo el repo:

- `src/components/command-palette.tsx`
  - Se quito el reseteo de estado desde effects.
  - El cierre y el reset ahora ocurren en handlers explicitos.
- `src/components/theme-toggle.tsx`
  - Se sustituyo el patron de `mounted` con `useSyncExternalStore`.
- `src/components/pwa-install-prompt.tsx`
  - Se movio la deteccion inicial fuera del effect y se dejo el effect solo para listeners.
- `src/lib/sidebar-context.tsx`
  - El estado inicial ahora se hidrata con lazy init desde `localStorage`.
- `src/components/product-combobox.tsx`
  - Se elimino el estado derivado sincronizado por effect y se paso a valor derivado.
- `src/app/(dashboard)/inventory/lots/page.tsx`
  - Se quito `Date.now()` en render.
- `src/app/(dashboard)/menu-engineering/page.tsx`
  - Se extrajeron helpers de cabecera para evitar componentes creados dentro del render.
- `src/lib/rbac/module-access.ts`
  - Se renombraron variables locales para evitar `no-assign-module-variable`.

### 2. Tipado y runtime safety en hooks y forms

- `src/lib/auth/hooks.ts`
  - Se estabilizo el cliente Supabase.
  - Se ajusto la carga para evitar updates innecesarios y efectos fragiles.
- `src/features/feedback/components/FeedbackButton.tsx`
  - Se corrigio el tipado del resolver y el submit del formulario.
- `src/features/labeling/components/LabelForm.tsx`
  - Se corrigio el tipado del resolver y el submit del formulario.
- `src/features/catalog/hooks/use-catalog.ts`
  - Se eliminaron usos de `any` en helpers de catalogo.

### 3. Motores de calculo y strict TypeScript

- `src/lib/calculations/costEngine.ts`
  - Se introdujo una resolucion tipada de unidades en lugar de casts inseguros.
- `src/lib/calculations/demandEngine.ts`
  - Se introdujo una resolucion tipada equivalente.
- `src/lib/calculations/__tests__/costEngine.test.ts`
- `src/lib/calculations/__tests__/demandEngine.test.ts`
- `src/lib/calculations/__tests__/forecastEngine.test.ts`
- `src/lib/calculations/__tests__/marginEngine.test.ts`
- `src/lib/calculations/__tests__/procurementEngine.test.ts`
- `src/lib/calculations/__tests__/scalingEngine.test.ts`
  - Se ajustaron accesos indexados y resultados de `find()` para cumplir `noUncheckedIndexedAccess` sin bajar `strict`.

### 4. Limpieza de reglas y de framework

- `eslint.config.mjs`
  - Se quitaron overrides temporales que rebajaban errores a warnings.
- `src/middleware.ts` -> `src/proxy.ts`
  - Se migro la convencion antigua a la nueva convencion de Next 16.

## Verificacion ejecutada

Se ejecuto verificacion fresca despues de los cambios:

- `npm run lint`
  - OK, `0` errores y `89` warnings.
- `npx tsc --noEmit`
  - OK.
- `npm run build`
  - OK.
- `npx vitest run`
  - OK, `149/149` tests.

## Warnings que siguen abiertos

No bloquean build ni typecheck, pero siguen pendientes:

- imports y variables no usadas en varias paginas del dashboard.
- varios usos de `<img>` donde Next recomienda `next/image`.
- un warning de `react-hooks/incompatible-library` en `src/features/feedback/components/FeedbackButton.tsx` por `watch()` de React Hook Form.
- algunos warnings menores en `public/sw.js` y tests.

## Criterio seguido

- No se relajo `strict`.
- No se maquillo lint para forzar verde.
- Se priorizo estabilidad y verificacion por encima de refactors cosmeticos.

## Siguiente pasada recomendada

1. Bajar warnings de imports y variables no usadas en paginas del dashboard.
2. Revisar los `img` mas visibles y migrarlos a `next/image` donde aporte valor.
3. Evaluar si `FeedbackButton` merece un ajuste mas fino para evitar el warning del compilador React.
