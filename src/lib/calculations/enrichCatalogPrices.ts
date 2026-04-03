/**
 * @module enrichCatalogPrices
 * @description Enriches a CatalogMap with real prices from price_history.
 *
 * The costEngine is pure — it takes a CatalogMap and calculates costs.
 * This module bridges the gap between the static catalog prices (supplier_offers)
 * and the dynamic real prices captured from receipts/OCR.
 *
 * Priority: real price (from price_history) > catalog price (from supplier_offers)
 *
 * Pure function — no side effects, no DB access.
 */

import type { CatalogMap } from "./types";

export interface RealPrice {
  productId: string;
  supplierId: string;
  unitPrice: number;
  date: string;
  source: "receipt" | "ocr" | "manual";
}

export interface EnrichedCatalogEntry {
  priceSource: "real" | "catalog";
  realPrice?: number;
  realPriceDate?: string;
}

/**
 * Returns a new CatalogMap with unit_price updated to real prices where available.
 * Does NOT mutate the original catalog.
 *
 * For each product, if a real price exists for the same supplier, it replaces
 * the catalog unit_price. The original price is preserved as metadata.
 *
 * @param catalog - Original CatalogMap from supplier_offers
 * @param realPrices - Latest real prices from price_history
 * @returns New CatalogMap with enriched prices + metadata map
 */
export function enrichCatalogWithRealPrices(
  catalog: CatalogMap,
  realPrices: RealPrice[]
): { catalog: CatalogMap; metadata: Map<string, EnrichedCatalogEntry> } {
  // Index real prices by product_id + supplier_id (latest wins)
  const priceIndex = new Map<string, RealPrice>();
  for (const rp of realPrices) {
    const key = `${rp.productId}:${rp.supplierId}`;
    const existing = priceIndex.get(key);
    if (!existing || rp.date > existing.date) {
      priceIndex.set(key, rp);
    }
  }

  const enriched: CatalogMap = {};
  const metadata = new Map<string, EnrichedCatalogEntry>();

  for (const [productId, entries] of Object.entries(catalog)) {
    enriched[productId] = entries.map((entry) => {
      const key = `${productId}:${entry.supplier_id}`;
      const real = priceIndex.get(key);

      if (real) {
        metadata.set(entry.id, {
          priceSource: "real",
          realPrice: real.unitPrice,
          realPriceDate: real.date,
        });
        return {
          ...entry,
          unit_price: real.unitPrice,
        };
      }

      metadata.set(entry.id, { priceSource: "catalog" });
      return { ...entry };
    });
  }

  return { catalog: enriched, metadata };
}
