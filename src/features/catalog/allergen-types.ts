// EU 14 major allergens (Regulation EU 1169/2011)
export type AllergenKey =
  | "gluten"
  | "crustaceos"
  | "huevos"
  | "pescado"
  | "cacahuetes"
  | "soja"
  | "lacteos"
  | "frutos_cascara"
  | "apio"
  | "mostaza"
  | "sesamo"
  | "sulfitos"
  | "altramuces"
  | "moluscos"

export interface Allergen {
  key: AllergenKey
  label: string
  emoji: string
  description: string
}

export const ALLERGENS: Allergen[] = [
  { key: "gluten",         label: "Gluten",         emoji: "🌾", description: "Cereales con gluten" },
  { key: "crustaceos",     label: "Crustáceos",     emoji: "🦐", description: "Crustáceos y productos" },
  { key: "huevos",         label: "Huevos",         emoji: "🥚", description: "Huevos y productos" },
  { key: "pescado",        label: "Pescado",        emoji: "🐟", description: "Pescado y productos" },
  { key: "cacahuetes",     label: "Cacahuetes",     emoji: "🥜", description: "Cacahuetes y productos" },
  { key: "soja",           label: "Soja",           emoji: "🫘", description: "Soja y productos" },
  { key: "lacteos",        label: "Lácteos",        emoji: "🥛", description: "Leche y derivados" },
  { key: "frutos_cascara", label: "Frutos secos",   emoji: "🌰", description: "Almendras, nueces, etc." },
  { key: "apio",           label: "Apio",           emoji: "🌿", description: "Apio y productos" },
  { key: "mostaza",        label: "Mostaza",        emoji: "🌻", description: "Mostaza y productos" },
  { key: "sesamo",         label: "Sésamo",         emoji: "⚪", description: "Semillas de sésamo" },
  { key: "sulfitos",       label: "Sulfitos",       emoji: "🍷", description: "Dióxido de azufre ≥10mg/kg" },
  { key: "altramuces",     label: "Altramuces",     emoji: "🌼", description: "Altramuces y productos" },
  { key: "moluscos",       label: "Moluscos",       emoji: "🐚", description: "Moluscos y productos" },
]
