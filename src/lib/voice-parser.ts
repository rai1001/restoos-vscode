// Voice parser for Spanish kitchen commands
// Parses natural speech into structured data

export interface ParsedRecipe {
  name?: string
  category?: string
  servings?: number
  prep_time_min?: number
  cook_time_min?: number
  description?: string
}

export interface ParsedIngredient {
  name: string
  quantity: number
  unit: string
}

export interface ParsedInventoryAdjustment {
  product_name?: string
  quantity?: number
  unit?: string
  reason?: string
  notes?: string
}

const CATEGORY_MAP: Record<string, string> = {
  entrante: "entrante", entrada: "entrante", aperitivo: "entrante",
  principal: "principal", "plato principal": "principal", "segundo": "principal",
  postre: "postre", dulce: "postre",
  guarnición: "guarnición", guarnicion: "guarnición", acompañamiento: "guarnición",
  salsa: "salsa",
  bebida: "bebida",
  snack: "snack",
  pan: "pan",
}

const UNIT_ALIASES: Record<string, string> = {
  kilo: "kg", kilos: "kg", kilogramo: "kg", kilogramos: "kg",
  gramo: "g", gramos: "g", "gr": "g",
  litro: "L", litros: "L",
  mililitro: "ml", mililitros: "ml",
  unidad: "ud", unidades: "ud", pieza: "ud", piezas: "ud",
  cucharada: "cda", cucharadas: "cda",
  cucharadita: "cdta", cucharaditas: "cdta",
}

function normalizeUnit(raw: string): string {
  const lower = raw.toLowerCase().trim()
  return UNIT_ALIASES[lower] ?? lower
}

function extractNumber(text: string, keyword: string): number | undefined {
  const patterns = [
    new RegExp(`(\\d+(?:[,.]\\d+)?)\\s*(?:minutos?|min)?\\s*(?:de\\s*)?${keyword}`, "i"),
    new RegExp(`${keyword}\\s*(?:de\\s*)?(\\d+(?:[,.]\\d+)?)\\s*(?:minutos?|min)?`, "i"),
    new RegExp(`(\\d+(?:[,.]\\d+)?)\\s+${keyword}`, "i"),
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return parseFloat(match[1].replace(",", "."))
    }
  }
  return undefined
}

/**
 * Parses a Spanish voice transcript into structured recipe metadata.
 *
 * Extracts recipe name, category, servings, prep time, and cook time from
 * natural speech using regex-based pattern matching against common Spanish
 * culinary phrasing.
 *
 * @param transcript - Raw Spanish voice transcript text
 * @returns A {@link ParsedRecipe} with any fields that could be extracted (all optional)
 *
 * @example
 * ```ts
 * const recipe = parseRecipeVoice(
 *   "Paella valenciana, plato principal para 8 personas, 20 minutos de preparación, 45 de cocción"
 * );
 * // { name: "Paella valenciana", category: "principal", servings: 8, prep_time_min: 20, cook_time_min: 45 }
 * ```
 */
export function parseRecipeVoice(transcript: string): ParsedRecipe {
  const result: ParsedRecipe = {}
  const t = transcript.trim()

  // Extract name: first meaningful phrase before conjunctions
  const namePatterns = [
    /(?:receta(?:\s+de)?|nombre(?:\s+es)?|llama(?:da|do)?)\s+([^,.\d]+)/i,
    /^([^,.\d]{3,40}?)(?:\s*,|\s+(?:con|para|de\s+\d))/i,
    /^(.{3,40}?)(?:\s*[,.])/i,
  ]
  for (const pattern of namePatterns) {
    const m = t.match(pattern)
    if (m?.[1]) {
      result.name = m[1].trim().replace(/^(la|el|un|una)\s+/i, "")
      break
    }
  }
  if (!result.name && t.length < 60) {
    result.name = t.split(",")[0]?.trim()
  }

  // Extract category
  for (const [alias, cat] of Object.entries(CATEGORY_MAP)) {
    if (t.toLowerCase().includes(alias)) {
      result.category = cat
      break
    }
  }

  // Extract servings
  const servingsMatch = t.match(/(\d+)\s*(?:raciones?|personas?|pax|comensales?)/i)
  if (servingsMatch?.[1]) result.servings = parseInt(servingsMatch[1])

  // Extract prep time
  const prepTime = extractNumber(t, "(?:preparación|prep)")
  if (prepTime !== undefined) result.prep_time_min = prepTime

  // Extract cook time
  const cookTime = extractNumber(t, "(?:cocción|cocinar|hornear|cocinado)")
  if (cookTime !== undefined) result.cook_time_min = cookTime

  return result
}

/**
 * Parses a Spanish voice transcript into a structured ingredient with quantity, unit, and name.
 *
 * Handles spoken number words (e.g. "medio kilo"), common Spanish unit names, and the
 * "quantity + unit + de + ingredient" pattern typical of kitchen dictation.
 *
 * @param transcript - Raw Spanish voice transcript describing a single ingredient
 * @returns A {@link ParsedIngredient} if parsing succeeds, or `null` if the transcript cannot be parsed
 *
 * @example
 * ```ts
 * const ing = parseIngredientVoice("300 gramos de harina de trigo");
 * // { name: "harina de trigo", quantity: 300, unit: "g" }
 *
 * const ing2 = parseIngredientVoice("medio kilo de ternera");
 * // { name: "ternera", quantity: 0.5, unit: "kg" }
 * ```
 */
export function parseIngredientVoice(transcript: string): ParsedIngredient | null {
  // Patterns: "300 gramos de harina", "medio kilo de ternera", "2 litros de leche"
  const numWords: Record<string, number> = {
    "medio": 0.5, "media": 0.5, "un": 1, "una": 1, "dos": 2, "tres": 3,
    "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
  }

  const t = transcript.trim().toLowerCase()

  // Replace written numbers
  let normalized = t
  for (const [word, num] of Object.entries(numWords)) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, "g"), String(num))
  }

  // Pattern: number + unit + "de" + ingredient
  const match = normalized.match(
    /(\d+(?:[,.]\d+)?)\s+(kg|kilos?|kilogramos?|gramos?|gr?|litros?|ml|unidades?|piezas?|cucharadas?|cdtas?|cdas?)\s+(?:de\s+)?(.+)/i
  )

  if (match) {
    const quantity = parseFloat((match[1] ?? "1").replace(",", "."))
    const unit = normalizeUnit(match[2] ?? "ud")
    const name = (match[3] ?? "").trim()
      .replace(/^\s*(?:y|e)\s+/, "")
      .split(/\s*(?:y también|también|además)\s*/)[0]
      ?.trim() ?? ""

    if (name.length > 1) {
      return { name, quantity, unit }
    }
  }

  return null
}

/**
 * Parses a Spanish voice transcript into a structured inventory adjustment (loss/waste).
 *
 * Extracts product name, quantity, unit, and loss reason from natural speech.
 * Reason detection uses keyword matching against common Spanish terms for spoilage,
 * damage, expiry, and other waste causes.
 *
 * @param transcript - Raw Spanish voice transcript describing an inventory adjustment
 * @returns A {@link ParsedInventoryAdjustment} with any fields that could be extracted (all optional)
 *
 * @example
 * ```ts
 * const adj = parseInventoryVoice("5 kilos de tomate caducado");
 * // { product_name: "tomate caducado", quantity: 5, unit: "kg", reason: "caducidad" }
 * ```
 */
export function parseInventoryVoice(transcript: string): ParsedInventoryAdjustment {
  const result: ParsedInventoryAdjustment = {}
  const t = transcript.trim().toLowerCase()

  // Extract quantity + unit + product
  const match = t.match(
    /(\d+(?:[,.]\d+)?)\s+(kg|kilos?|gramos?|litros?|unidades?|piezas?)\s+(?:de\s+)?([^,.\n]+)/i
  )
  if (match) {
    result.quantity = parseFloat((match[1] ?? "1").replace(",", "."))
    result.unit = normalizeUnit(match[2] ?? "ud")
    result.product_name = (match[3] ?? "").trim()
  }

  // Extract reason keywords
  const reasonKeywords: Record<string, string> = {
    "caducad": "caducidad", "venció": "caducidad",
    "deterior": "deterioro", "mal estado": "deterioro",
    "accident": "accidente", "caído": "accidente", "roto": "accidente",
    "exceso": "exceso_coccion", "quemad": "exceso_coccion",
    "devoluci": "devolucion",
  }
  for (const [kw, reason] of Object.entries(reasonKeywords)) {
    if (t.includes(kw)) {
      result.reason = reason
      break
    }
  }

  return result
}
