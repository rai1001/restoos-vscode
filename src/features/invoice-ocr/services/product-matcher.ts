import { createClient } from "@/lib/db/client";
import type { OcrInvoiceLine } from "./ocr-provider";

const supabase = createClient();

export interface MatchedLine extends OcrInvoiceLine {
  product_id: string | null;
  product_name: string | null;
  match_confidence: number; // 0-1
  match_source: "alias" | "fuzzy" | "manual" | "none";
}

/**
 * Try to match OCR-extracted product descriptions to canonical products.
 * Uses product_aliases table first, then falls back to fuzzy name matching.
 */
export async function matchProducts(
  hotelId: string,
  supplierId: string | null,
  lines: OcrInvoiceLine[]
): Promise<MatchedLine[]> {
  // Load all aliases for this hotel
  const { data: aliases } = await supabase
    .from("product_aliases")
    .select("alias_name, product_id, supplier_id, confidence")
    .eq("hotel_id", hotelId);

  // Load products for fuzzy matching
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .eq("hotel_id", hotelId)
    .eq("is_active", true);

  return lines.map((line) => {
    const desc = line.description.toUpperCase().trim();

    // 1. Exact alias match (supplier-specific first, then generic)
    const supplierAlias = (aliases ?? []).find(
      (a) =>
        a.alias_name.toUpperCase() === desc &&
        a.supplier_id === supplierId
    );
    if (supplierAlias) {
      const product = (products ?? []).find((p) => p.id === supplierAlias.product_id);
      return {
        ...line,
        product_id: supplierAlias.product_id,
        product_name: product?.name ?? null,
        match_confidence: supplierAlias.confidence ?? 1,
        match_source: "alias" as const,
      };
    }

    const genericAlias = (aliases ?? []).find(
      (a) => a.alias_name.toUpperCase() === desc && !a.supplier_id
    );
    if (genericAlias) {
      const product = (products ?? []).find((p) => p.id === genericAlias.product_id);
      return {
        ...line,
        product_id: genericAlias.product_id,
        product_name: product?.name ?? null,
        match_confidence: (genericAlias.confidence ?? 1) * 0.9,
        match_source: "alias" as const,
      };
    }

    // 2. Fuzzy match: find product whose name is contained in the description
    const fuzzyMatch = (products ?? []).find((p) => {
      const productWords = p.name.toUpperCase().split(/\s+/);
      const matchingWords = productWords.filter((w: string) => desc.includes(w));
      return matchingWords.length >= Math.ceil(productWords.length * 0.6);
    });

    if (fuzzyMatch) {
      return {
        ...line,
        product_id: fuzzyMatch.id,
        product_name: fuzzyMatch.name,
        match_confidence: 0.6,
        match_source: "fuzzy" as const,
      };
    }

    // 3. No match
    return {
      ...line,
      product_id: null,
      product_name: null,
      match_confidence: 0,
      match_source: "none" as const,
    };
  });
}

/**
 * Save a manual alias mapping for future OCR imports.
 */
export async function saveAlias(
  hotelId: string,
  productId: string,
  aliasName: string,
  supplierId?: string
): Promise<void> {
  const { error } = await supabase.from("product_aliases").upsert(
    {
      hotel_id: hotelId,
      product_id: productId,
      supplier_id: supplierId ?? null,
      alias_name: aliasName,
      source: "ocr_confirmed",
    },
    { onConflict: "hotel_id,supplier_id,alias_name" }
  );
  if (error) throw error;
}

/**
 * Update supplier_offers with new prices from the invoice.
 * Uses select-then-insert/update because supplier_offers has no unique
 * constraint on (supplier_id, product_id).
 */
export async function updatePrices(
  hotelId: string,
  supplierId: string,
  lines: MatchedLine[]
): Promise<number> {
  let updated = 0;
  for (const line of lines) {
    if (!line.product_id || !line.unit_price) continue;

    // Get the product's default unit for the required unit_id field
    const { data: product } = await supabase
      .from("products")
      .select("default_unit_id")
      .eq("id", line.product_id)
      .single();

    if (!product?.default_unit_id) continue;

    // Check if an offer already exists for this supplier + product
    const { data: existing } = await supabase
      .from("supplier_offers")
      .select("id")
      .eq("hotel_id", hotelId)
      .eq("supplier_id", supplierId)
      .eq("product_id", line.product_id)
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("supplier_offers")
        .update({ price: line.unit_price })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("supplier_offers").insert({
        hotel_id: hotelId,
        supplier_id: supplierId,
        product_id: line.product_id,
        unit_id: product.default_unit_id,
        price: line.unit_price,
      }));
    }
    if (!error) updated++;
  }
  return updated;
}
