// =============================================================================
// src/lib/product-matcher.ts — Matching de ingredientes a productos del catálogo
// =============================================================================
// Funciones puras, sin dependencias de React.
// =============================================================================

export interface MatchableProduct {
  id: string;
  name: string;
  aliases?: string[];
}

export interface MatchResult {
  product_id: string;
  product_name: string;
  confidence: number; // 0-1
  matched_by: "exact" | "contains" | "alias" | "fuzzy";
}

// ── Normalization helpers ────────────────────────────────────────────────────

const ACCENT_MAP: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u",
  ü: "u", ñ: "n",
  à: "a", è: "e", ì: "i", ò: "o", ù: "u",
};

const ARTICLES = new Set(["el", "la", "los", "las", "de", "del", "con"]);

function removeAccents(s: string): string {
  return s.replace(/[áéíóúüñàèìòù]/g, (ch) => ACCENT_MAP[ch] ?? ch);
}

function normalize(s: string): string {
  const stripped = removeAccents(s.toLowerCase().trim());
  return stripped
    .split(/\s+/)
    .filter((w) => !ARTICLES.has(w))
    .join(" ");
}

// ── Levenshtein distance (simple DP) ─────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use single-row optimization
  let prev = new Array<number>(lb + 1);
  let curr = new Array<number>(lb + 1);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,       // deletion
        curr[j - 1]! + 1,   // insertion
        prev[j - 1]! + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb]!;
}

// ── Main matching function ───────────────────────────────────────────────────

/**
 * Matches a single ingredient name against a product catalog using multi-strategy scoring.
 *
 * Applies four matching strategies in priority order: exact normalized match (1.0),
 * substring containment (0.8), alias match (0.7), and fuzzy Levenshtein distance (0.4-0.6).
 * Results are filtered to confidence >= 0.4 and capped at the top 3 matches.
 *
 * @param ingredientName - The raw ingredient name to match (Spanish text with possible accents)
 * @param products - Array of {@link MatchableProduct} entries from the catalog
 * @returns An array of up to 3 {@link MatchResult} objects sorted by confidence descending; empty if no match
 *
 * @example
 * ```ts
 * const products = [
 *   { id: "p1", name: "Harina de trigo", aliases: ["harina blanca"] },
 *   { id: "p2", name: "Harina integral" },
 * ];
 * const matches = matchIngredientToProduct("harina", products);
 * // [{ product_id: "p1", confidence: 0.8, matched_by: "contains" }, ...]
 * ```
 */
export function matchIngredientToProduct(
  ingredientName: string,
  products: MatchableProduct[]
): MatchResult[] {
  const normInput = normalize(ingredientName);
  if (!normInput) return [];

  const results: MatchResult[] = [];

  for (const product of products) {
    const normProduct = normalize(product.name);

    // 1. Exact normalized match
    if (normInput === normProduct) {
      results.push({
        product_id: product.id,
        product_name: product.name,
        confidence: 1.0,
        matched_by: "exact",
      });
      continue;
    }

    // 2. Contains: input in product name OR product name in input
    if (normProduct.includes(normInput) || normInput.includes(normProduct)) {
      results.push({
        product_id: product.id,
        product_name: product.name,
        confidence: 0.8,
        matched_by: "contains",
      });
      continue;
    }

    // 3. Alias match
    if (product.aliases) {
      const aliasMatch = product.aliases.some((alias) => {
        const normAlias = normalize(alias);
        return normAlias === normInput || normAlias.includes(normInput) || normInput.includes(normAlias);
      });
      if (aliasMatch) {
        results.push({
          product_id: product.id,
          product_name: product.name,
          confidence: 0.7,
          matched_by: "alias",
        });
        continue;
      }
    }

    // 4. Fuzzy: Levenshtein distance ≤ 3
    const dist = levenshtein(normInput, normProduct);
    if (dist <= 3) {
      const confidence = 0.6 - dist * 0.1;
      if (confidence >= 0.4) {
        results.push({
          product_id: product.id,
          product_name: product.name,
          confidence: Math.round(confidence * 100) / 100,
          matched_by: "fuzzy",
        });
      }
    }
  }

  // Sort by confidence descending, take top 3, filter out < 0.4
  return results
    .filter((r) => r.confidence >= 0.4)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

// ── Batch matching ───────────────────────────────────────────────────────────

/**
 * Matches multiple ingredient names against a product catalog in batch.
 *
 * Delegates each name to {@link matchIngredientToProduct} and collects the results
 * in a Map keyed by the original ingredient name.
 *
 * @param ingredientNames - Array of raw ingredient name strings to match
 * @param products - Array of {@link MatchableProduct} entries from the catalog
 * @returns A Map where each key is an ingredient name and the value is its {@link MatchResult} array
 *
 * @example
 * ```ts
 * const results = matchIngredientsToProducts(
 *   ["tomate", "cebolla", "ajo"],
 *   catalogProducts,
 * );
 * for (const [name, matches] of results) {
 *   console.log(`${name} -> ${matches[0]?.product_name ?? "no match"}`);
 * }
 * ```
 */
export function matchIngredientsToProducts(
  ingredientNames: string[],
  products: MatchableProduct[]
): Map<string, MatchResult[]> {
  const map = new Map<string, MatchResult[]>();
  for (const name of ingredientNames) {
    map.set(name, matchIngredientToProduct(name, products));
  }
  return map;
}
