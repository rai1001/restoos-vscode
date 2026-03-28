# Calculation Engines - Phase 2

> **For agentic workers:** Use superpowers:subagent-driven-development to implement.

**Goal:** Port the 3 critical pure-function calculation engines (cost, demand, procurement) from C:\CULINARY to ChefOS, adapting types. Also extend schemas for missing fields (waste_percent, sub_recipe_id, yield_percent).

**Architecture:** Pure functions with no side effects. Adapter layer maps NEW app types to engine input types. Engines live in `src/lib/calculations/`.

---

## Task 1: Engine Types + Adapters

**Create:** `src/lib/calculations/types.ts`

Define engine-specific types that bridge NEW app schemas to engine needs. Include adapter functions.

## Task 2: Cost Engine

**Create:** `src/lib/calculations/costEngine.ts`

Port from C:\CULINARY with type adaptations. Recursive sub-recipe costing, waste%, allergen aggregation, PVP suggestion.

## Task 3: Demand Engine

**Create:** `src/lib/calculations/demandEngine.ts`

Port menu explosion: events → menus → recipes → ingredients with pax scaling and waste.

## Task 4: Procurement Engine

**Create:** `src/lib/calculations/procurementEngine.ts`

Port demand vs stock comparison with MOQ, pack size, urgency levels.

## Task 5: Barrel Export + Mock Integration

**Create:** `src/lib/calculations/index.ts`
**Modify:** `src/lib/mock-data.ts` — add waste_percent to mock recipe ingredients, yield_percent to products

## Task 6: Wire Engines into UI

**Modify:** Recipe detail (use costEngine for live cost), Event wizard (use demandEngine), Procurement suggestions
