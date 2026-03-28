# Recipe-Catalog Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect recipe ingredients to catalog products so costs calculate automatically, voice/OCR matches to real products, and the full chain recipe→cost→demand→procurement works.

**Architecture:** Create a reusable `ProductCombobox` component that searches catalog products. Replace all free-text ingredient inputs with this selector. Add a `matchIngredientToProduct` utility that fuzzy-matches voice/OCR text to catalog. Port calculation engines from reference project as pure functions.

**Tech Stack:** Next.js 16, TypeScript, shadcn/ui (Select, Dialog, Input), TanStack Query, Zod, existing catalog service + hooks.

---

## Scope

This plan covers Phase 1 only: **Recipe ↔ Catalog Integration**. Future plans:
- Phase 2: Calculation Engines (cost, demand, procurement)
- Phase 3: Price Tracking + Alerts
- Phase 4: KDS + Forecasting

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/product-combobox.tsx` | CREATE | Reusable product search/select with autocomplete |
| `src/lib/product-matcher.ts` | CREATE | Fuzzy match ingredient names to catalog products |
| `src/features/catalog/hooks/use-catalog.ts` | CREATE | Combined hook: products + units + offers for recipe context |
| `src/app/(dashboard)/recipes/new/page.tsx` | MODIFY | Replace free-text ingredient input with ProductCombobox |
| `src/app/(dashboard)/recipes/[id]/page.tsx` | MODIFY | Replace UUID input with ProductCombobox in add dialog |
| `src/features/recipes/components/ImportRecipeModal.tsx` | MODIFY | Add product matching step after OCR/Excel/Voice parse |
| `src/lib/mock-data.ts` | MODIFY | Add MOCK_SUPPLIER_OFFERS for cost calculation |

---

### Task 1: ProductCombobox Component

**Files:**
- Create: `src/components/product-combobox.tsx`

This is the core UI piece. A searchable dropdown that shows catalog products with category, unit, and allergen info.

- [ ] **Step 1: Create ProductCombobox component**

```tsx
// src/components/product-combobox.tsx
"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "@/lib/mock-data"
import { useActiveHotel } from "@/lib/auth/hooks"

interface ProductOption {
  id: string
  name: string
  category: string
  unit: string
  allergens: string[]
}

interface ProductComboboxProps {
  value: string | null           // product_id
  onSelect: (product: ProductOption | null) => void
  placeholder?: string
  className?: string
}

// Component: filterable list of catalog products
// Shows: name, category badge, default unit, allergen icons
// In dev mode (no hotelId): uses MOCK_PRODUCTS
// In prod mode: uses useSearchProducts from catalog hooks
```

The component should:
- Show an Input field that filters products as you type
- Display a dropdown list below with matching products
- Each row: product name, category in muted text, allergen badges
- On select: call onSelect with full product info
- On clear: call onSelect(null)
- Support keyboard navigation (arrow keys + enter)

- [ ] **Step 2: Verify component renders in isolation**

Import it in `/recipes/new` page temporarily, confirm it shows mock products in a dropdown when typing.

- [ ] **Step 3: Commit**

```
feat: add ProductCombobox for catalog product selection
```

---

### Task 2: Product Matcher Utility

**Files:**
- Create: `src/lib/product-matcher.ts`

Pure function that fuzzy-matches a text string (from voice/OCR) to catalog products.

- [ ] **Step 1: Create product-matcher.ts**

```typescript
// src/lib/product-matcher.ts

interface MatchableProduct {
  id: string
  name: string
  aliases?: string[]
}

interface MatchResult {
  product_id: string
  product_name: string
  confidence: number  // 0-1
  matched_by: "exact" | "contains" | "alias" | "fuzzy"
}

/**
 * Match an ingredient name to catalog products.
 * Priority: exact match > contains > alias > fuzzy (Levenshtein)
 * Returns top 3 matches sorted by confidence.
 */
export function matchIngredientToProduct(
  ingredientName: string,
  products: MatchableProduct[]
): MatchResult[]

/**
 * Batch match: match multiple ingredients at once.
 * Used after OCR/Excel import.
 */
export function matchIngredientsToProducts(
  ingredientNames: string[],
  products: MatchableProduct[]
): Map<string, MatchResult[]>
```

Matching logic:
1. Normalize both strings (lowercase, trim, remove accents)
2. Exact match → confidence 1.0
3. One contains the other → confidence 0.8
4. Check product aliases → confidence 0.7
5. Levenshtein distance < 3 → confidence 0.5
6. Return empty if nothing matches above 0.4

- [ ] **Step 2: Verify matching works with mock data**

Test manually: "solomillo" should match "Solomillo de ternera", "tomate" should match "Tomate pera", "aceite" should match "Aceite de oliva virgen extra".

- [ ] **Step 3: Commit**

```
feat: add product matcher for voice/OCR ingredient matching
```

---

### Task 3: Mock Supplier Offers

**Files:**
- Modify: `src/lib/mock-data.ts`

Add MOCK_SUPPLIER_OFFERS so we can calculate ingredient costs.

- [ ] **Step 1: Add mock supplier offers**

Add to the end of mock-data.ts:

```typescript
export const MOCK_SUPPLIER_OFFERS = [
  // Makro
  { id: "of-001", product_id: PROD_ACEITE, supplier_id: SUP_MAKRO, price: 8.50, unit: "L", is_preferred: true },
  { id: "of-002", product_id: PROD_HARINA, supplier_id: SUP_MAKRO, price: 0.95, unit: "kg", is_preferred: false },
  { id: "of-003", product_id: PROD_ARROZ, supplier_id: SUP_MAKRO, price: 3.20, unit: "kg", is_preferred: true },
  { id: "of-004", product_id: PROD_PATATA, supplier_id: SUP_MAKRO, price: 0.90, unit: "kg", is_preferred: true },
  // Sysco
  { id: "of-005", product_id: PROD_SOLOMILLO, supplier_id: SUP_SYSCO, price: 32.00, unit: "kg", is_preferred: true },
  { id: "of-006", product_id: PROD_POLLO, supplier_id: SUP_SYSCO, price: 6.80, unit: "kg", is_preferred: true },
  { id: "of-007", product_id: PROD_HARINA, supplier_id: SUP_SYSCO, price: 0.88, unit: "kg", is_preferred: true },
  // Campofrio
  { id: "of-008", product_id: PROD_POLLO, supplier_id: SUP_CAMPOFRIO, price: 7.20, unit: "kg", is_preferred: false },
  // Frutas Garcia
  { id: "of-009", product_id: PROD_TOMATE, supplier_id: SUP_FRUTAS, price: 2.10, unit: "kg", is_preferred: true },
  { id: "of-010", product_id: PROD_CEBOLLA, supplier_id: SUP_FRUTAS, price: 1.20, unit: "kg", is_preferred: true },
  { id: "of-011", product_id: PROD_ZANAHORIA, supplier_id: SUP_FRUTAS, price: 1.40, unit: "kg", is_preferred: true },
  { id: "of-012", product_id: PROD_PATATA, supplier_id: SUP_FRUTAS, price: 0.85, unit: "kg", is_preferred: false },
  // Pesqueria del Norte
  { id: "of-013", product_id: PROD_SALMON, supplier_id: SUP_PESQUERIA, price: 18.50, unit: "kg", is_preferred: true },
  { id: "of-014", product_id: PROD_MERLUZA, supplier_id: SUP_PESQUERIA, price: 14.00, unit: "kg", is_preferred: true },
  // Lacteos Asturias
  { id: "of-015", product_id: PROD_LECHE, supplier_id: SUP_LACTEOS, price: 0.92, unit: "L", is_preferred: true },
  { id: "of-016", product_id: PROD_QUESO, supplier_id: SUP_LACTEOS, price: 5.80, unit: "kg", is_preferred: true },
  { id: "of-017", product_id: PROD_MANTEQUILLA, supplier_id: SUP_LACTEOS, price: 9.40, unit: "kg", is_preferred: true },
];
```

Use the existing PROD_* and SUP_* constants from mock-data.ts.

- [ ] **Step 2: Commit**

```
feat: add mock supplier offers for cost calculation
```

---

### Task 4: Integrate ProductCombobox in New Recipe Page

**Files:**
- Modify: `src/app/(dashboard)/recipes/new/page.tsx`

Replace the free-text ingredient name input with ProductCombobox. When a product is selected, auto-fill the unit from the product's default.

- [ ] **Step 1: Replace ingredient name input with ProductCombobox**

In the Ingredientes tab, replace:
```tsx
<Input placeholder="Nombre" value={ingName} onChange={...} />
```
with:
```tsx
<ProductCombobox
  value={ingProductId}
  onSelect={(p) => {
    setIngProductId(p?.id ?? null)
    setIngName(p?.name ?? "")
    if (p?.unit) setIngUnit(p.unit)
  }}
  placeholder="Buscar producto..."
/>
```

Update the local ingredient state to include `product_id`:
```typescript
interface LocalIngredient {
  id: string
  name: string
  product_id: string | null  // ADD THIS
  quantity: number
  unit: string
  notes?: string
}
```

- [ ] **Step 2: Replace unit hardcoded select with catalog units**

Use `useUnits()` hook from `@/features/catalog/hooks/use-units` to populate the unit selector. Fallback to hardcoded list in dev mode.

- [ ] **Step 3: Update voice ingredient flow**

After `parseIngredientVoice` returns a name, run `matchIngredientToProduct` to auto-select the best matching product. If confidence > 0.7, auto-select. If 0.4-0.7, show suggestion. Below 0.4, leave as manual.

- [ ] **Step 4: Verify the full flow**

Navigate to `/recipes/new` → Ingredientes tab → type "sol" → should show "Solomillo de ternera" in dropdown → select → unit auto-fills to "kg".

- [ ] **Step 5: Commit**

```
feat: integrate catalog product selector in new recipe form
```

---

### Task 5: Integrate ProductCombobox in Recipe Detail Page

**Files:**
- Modify: `src/app/(dashboard)/recipes/[id]/page.tsx`

Replace the raw UUID input in the ingredient add dialog with ProductCombobox.

- [ ] **Step 1: Replace UUID input with ProductCombobox**

In the add ingredient dialog (around lines 253-310), replace:
```tsx
<Input placeholder="UUID del producto" value={ingProductId} onChange={...} />
```
with:
```tsx
<ProductCombobox
  value={ingProductId}
  onSelect={(p) => {
    setIngProductId(p?.id ?? "")
    if (p?.unit) { /* update unit display */ }
  }}
  placeholder="Buscar producto..."
/>
```

- [ ] **Step 2: Show product name instead of UUID in ingredients table**

The ingredients table currently shows truncated product_id. Create a lookup from MOCK_PRODUCTS to show the product name instead.

- [ ] **Step 3: Show cost per ingredient line**

Using MOCK_SUPPLIER_OFFERS, find the preferred offer for each ingredient's product_id and calculate: `quantity × preferred_price`. Show in a new "Coste" column.

- [ ] **Step 4: Verify**

Navigate to recipe detail → click add ingredient → search "merluza" → select → set quantity 2 → add → should show "Merluza del Cantabrico" in table with cost.

- [ ] **Step 5: Commit**

```
feat: integrate catalog selector and cost display in recipe detail
```

---

### Task 6: Add Product Matching to Import Modal

**Files:**
- Modify: `src/features/recipes/components/ImportRecipeModal.tsx`

After parsing (Excel/OCR/Voice), run `matchIngredientsToProducts` on all ingredient names. Show a matching review step before creating.

- [ ] **Step 1: Add matching preview step**

After parse, show a table:
| Ingrediente (texto) | Producto catalogo | Confianza | Accion |
|---|---|---|---|
| solomillo | Solomillo de ternera | 95% | ✓ Vinculado |
| tomate | Tomate pera | 80% | ✓ Vinculado |
| perejil | — | — | Buscar... |

Each row:
- High confidence (>0.7): auto-linked, green check
- Medium (0.4-0.7): suggested, yellow, editable
- No match: red, shows ProductCombobox to manually select

- [ ] **Step 2: Wire matched products into recipe creation**

When user confirms, create recipe with `product_id` on each ingredient instead of free text.

- [ ] **Step 3: Verify OCR import flow**

Click Importar → Imagen/OCR → upload image → mock OCR returns risotto → matching step shows ingredients linked to products → create recipe.

- [ ] **Step 4: Commit**

```
feat: add product matching step to recipe import flow
```

---

### Task 7: Combined Catalog Hook for Recipe Context

**Files:**
- Create: `src/features/catalog/hooks/use-catalog.ts`

A convenience hook that provides products, units, and offers in one call for recipe editing pages.

- [ ] **Step 1: Create use-catalog.ts**

```typescript
export function useCatalogForRecipes() {
  const products = useProducts()
  const units = useUnits()
  // Derive offers from mock or service
  return {
    products: products.data ?? [],
    units: units.data ?? [],
    offers: MOCK_SUPPLIER_OFFERS, // dev fallback
    isLoading: products.isLoading || units.isLoading,
    getProductPrice: (productId: string) => {
      const offer = offers.find(o => o.product_id === productId && o.is_preferred)
      return offer?.price ?? null
    },
    getProductById: (id: string) => products.data?.find(p => p.id === id) ?? null,
  }
}
```

- [ ] **Step 2: Commit**

```
feat: add combined catalog hook for recipe context
```

---

## Verification Checklist

After all tasks:

1. `/recipes/new` → Ingredientes tab → type product name → dropdown shows catalog products → select → unit auto-fills → add → ingredient linked to product_id
2. `/recipes/new` → Ingredientes tab → click Dictar → say "300 gramos de solomillo" → auto-matches to "Solomillo de ternera" → product selected
3. `/recipes/[id]` → Add ingredient → search by name → select → cost shown per line
4. `/recipes` → Importar → Excel/OCR/Voz → parse → matching step shows linked products → create
5. No console errors, no server errors
6. Mobile responsive (preview_resize mobile)
