/**
 * @module procurementEngine
 * @description Deterministic procurement suggestion engine.
 *
 * Compares demand (from demandEngine) against current stock and committed stock,
 * applies safety stock, MOQ, and pack size adjustments, and produces a ranked
 * list of purchase suggestions with supplier selection.
 *
 * **Business flow steps 6-7**: "Motor compara demanda vs stock vs stock comprometido"
 * + "Sugerencias de compra y borradores de pedido"
 *
 * Pure function — no side effects, no DB, no AI.
 */

import type {
  DemandLine,
  PurchaseSuggestion,
  CatalogEntry,
  StockSnapshot,
  CatalogMap,
} from "./types";

/**
 * Generates purchase suggestions from demand, stock, and catalog data.
 *
 * Formula per product:
 * ```
 * qty_to_order = max(0, demand - available + committed + safety_stock)
 * ```
 * Then adjusted to supplier MOQ and pack sizes.
 *
 * @param demand - Aggregated demand from demandEngine
 * @param stock - Current stock snapshots by product
 * @param catalog - Supplier catalog entries
 * @returns Sorted purchase suggestions (critical -> urgent -> normal)
 *
 * @example
 * ```ts
 * const suggestions = generatePurchaseSuggestions(
 *   demandLines,
 *   stockMap,
 *   catalogMap
 * );
 * // suggestions[0] -> { product_name: "Gambas", qty_to_order: 15, urgency: "critical", ... }
 * ```
 */
export function generatePurchaseSuggestions(
  demand: DemandLine[],
  stock: Map<string, StockSnapshot>,
  catalog: CatalogMap,
): PurchaseSuggestion[] {
  const suggestions: PurchaseSuggestion[] = [];

  for (const line of demand) {
    const snapshot = stock.get(line.product_id);

    const qtyAvailable = snapshot?.qty_available ?? 0;
    const qtyCommitted = snapshot?.qty_committed ?? 0;
    const safetyStock = snapshot?.safety_stock ?? 0;

    // Net need = demand - free stock + safety buffer
    const freeStock = Math.max(0, qtyAvailable - qtyCommitted);
    const rawNeed = line.total_qty_needed - freeStock + safetyStock;
    const qtyNeeded = Math.max(0, rawNeed);

    if (qtyNeeded <= 0) continue;

    // Select best supplier and adjust to MOQ/packs
    const bestEntry = selectBestSupplier(line.product_id, qtyNeeded, catalog);

    const qtyToOrder = adjustToMoqAndPacks(
      qtyNeeded,
      bestEntry?.min_order_qty ?? 0,
      bestEntry?.pack_size ?? 1,
    );

    const unitPrice = bestEntry
      ? getBestVolumePrice(bestEntry, qtyToOrder)
      : 0;

    const urgency = determineUrgency(qtyAvailable, qtyCommitted, safetyStock);

    suggestions.push({
      product_id: line.product_id,
      product_name: line.product_name,
      unit: line.unit,
      qty_needed: round2(line.total_qty_needed),
      qty_in_stock: round2(qtyAvailable),
      qty_committed: round2(qtyCommitted),
      qty_to_order: round2(qtyToOrder),
      suggested_supplier_id: bestEntry?.supplier_id ?? "",
      suggested_supplier_name: bestEntry?.supplier_name ?? "Sin proveedor",
      estimated_cost: round2(qtyToOrder * unitPrice),
      urgency,
    });
  }

  // Sort: critical first, then urgent, then normal
  const urgencyOrder: Record<string, number> = { critical: 0, urgent: 1, normal: 2 };
  suggestions.sort((a, b) => (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2));

  return suggestions;
}

/**
 * Selects the best (cheapest) supplier for a product from the catalog.
 *
 * Considers:
 * 1. Preferred supplier (gets slight priority — chosen if within 5% of cheapest)
 * 2. Volume discounts at the requested quantity
 * 3. Base unit price as fallback
 *
 * @param productId - Product to source
 * @param qty - Quantity needed
 * @param catalog - All catalog entries
 * @returns Best catalog entry, or undefined if none found
 */
function selectBestSupplier(
  productId: string,
  qty: number,
  catalog: CatalogMap,
): CatalogEntry | undefined {
  const entries = catalog[productId];
  if (!entries || entries.length === 0) return undefined;

  let cheapest: CatalogEntry | undefined;
  let cheapestPrice = Infinity;
  let preferred: CatalogEntry | undefined;
  let preferredPrice = Infinity;

  for (const entry of entries) {
    const price = getBestVolumePrice(entry, qty);
    if (price < cheapestPrice) {
      cheapestPrice = price;
      cheapest = entry;
    }
    if (entry.is_preferred && price < preferredPrice) {
      preferredPrice = price;
      preferred = entry;
    }
  }

  // Prefer preferred supplier if within 5% of cheapest
  if (preferred && preferredPrice <= cheapestPrice * 1.05) {
    return preferred;
  }

  return cheapest;
}

/**
 * Gets the best price from volume discounts for a given quantity.
 *
 * @param entry - Catalog entry with potential discounts
 * @param qty - Quantity being ordered
 * @returns Best applicable unit price
 */
function getBestVolumePrice(entry: CatalogEntry, qty: number): number {
  let bestPrice = entry.unit_price;

  for (const discount of entry.volume_discounts) {
    if (qty >= discount.min_qty && discount.unit_price < bestPrice) {
      bestPrice = discount.unit_price;
    }
  }

  return bestPrice;
}

/**
 * Adjusts a raw quantity to comply with MOQ and pack size constraints.
 *
 * @param rawQty - Raw quantity needed
 * @param moq - Minimum order quantity
 * @param packSize - Units per pack (must order in multiples)
 * @returns Adjusted quantity (always >= rawQty, rounded up to packs, >= MOQ)
 *
 * @example
 * ```ts
 * adjustToMoqAndPacks(7, 5, 3);  // -> 9  (3 packs of 3)
 * adjustToMoqAndPacks(2, 10, 5); // -> 10 (MOQ wins: 2 packs of 5)
 * ```
 */
export function adjustToMoqAndPacks(
  rawQty: number,
  moq: number,
  packSize: number,
): number {
  const effectivePackSize = packSize > 0 ? packSize : 1;

  // Round up to pack size
  const packsNeeded = Math.ceil(rawQty / effectivePackSize);
  const adjustedQty = packsNeeded * effectivePackSize;

  // Ensure at least MOQ
  return Math.max(adjustedQty, moq);
}

/**
 * Determines purchase urgency based on stock levels.
 *
 * - **critical**: Available stock is 0 or below committed
 * - **urgent**: Available stock is below safety threshold
 * - **normal**: Stock is available but demand exceeds it
 *
 * @param available - Current stock
 * @param committed - Stock reserved for events
 * @param safety - Safety stock threshold
 * @returns Urgency level
 */
function determineUrgency(
  available: number,
  committed: number,
  safety: number,
): "normal" | "urgent" | "critical" {
  if (available <= 0 || available <= committed) return "critical";
  if (available - committed < safety) return "urgent";
  return "normal";
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
