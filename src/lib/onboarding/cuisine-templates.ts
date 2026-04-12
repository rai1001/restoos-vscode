export interface CuisineTemplate {
  label: string
  categories: string[]
  products: Array<{ name: string; category: string; unit: string }>
  suppliers: Array<{ name: string; type: string }>
}

export const CUISINE_TEMPLATES: Record<string, CuisineTemplate> = {
  gallega: {
    label: "Gallega / Atlántica",
    categories: [
      "Pescados", "Mariscos", "Cárnicos", "Huerta", "Lácteos",
      "Panadería", "Conservas", "Vinos y bebidas", "Especias y condimentos",
    ],
    products: [
      { name: "Merluza fresca", category: "Pescados", unit: "kg" },
      { name: "Pulpo", category: "Mariscos", unit: "kg" },
      { name: "Mejillones", category: "Mariscos", unit: "kg" },
      { name: "Berberechos", category: "Mariscos", unit: "kg" },
      { name: "Ternera gallega", category: "Cárnicos", unit: "kg" },
      { name: "Lacón", category: "Cárnicos", unit: "kg" },
      { name: "Chorizo gallego", category: "Cárnicos", unit: "kg" },
      { name: "Grelos", category: "Huerta", unit: "kg" },
      { name: "Pimientos de Padrón", category: "Huerta", unit: "kg" },
      { name: "Patatas kennebec", category: "Huerta", unit: "kg" },
      { name: "Cebolla", category: "Huerta", unit: "kg" },
      { name: "Queso tetilla", category: "Lácteos", unit: "ud" },
      { name: "Nata para cocinar", category: "Lácteos", unit: "L" },
      { name: "Pan de cea", category: "Panadería", unit: "ud" },
      { name: "Aceite de oliva virgen extra", category: "Especias y condimentos", unit: "L" },
      { name: "Pimentón de la Vera", category: "Especias y condimentos", unit: "kg" },
      { name: "Albariño (Rías Baixas)", category: "Vinos y bebidas", unit: "ud" },
      { name: "Ribeiro", category: "Vinos y bebidas", unit: "ud" },
    ],
    suppliers: [
      { name: "Lonja local", type: "Pescados y mariscos" },
      { name: "Carnicería comarcal", type: "Cárnicos" },
      { name: "Distribuidor horeca", type: "General" },
    ],
  },

  mediterranea: {
    label: "Mediterránea",
    categories: [
      "Aceites y vinagres", "Legumbres y cereales", "Arroces", "Verduras",
      "Frutas y cítricos", "Pescados", "Cárnicos", "Lácteos", "Especias",
    ],
    products: [
      { name: "Aceite de oliva virgen extra", category: "Aceites y vinagres", unit: "L" },
      { name: "Vinagre de Jerez", category: "Aceites y vinagres", unit: "L" },
      { name: "Arroz bomba", category: "Arroces", unit: "kg" },
      { name: "Garbanzos", category: "Legumbres y cereales", unit: "kg" },
      { name: "Lentejas", category: "Legumbres y cereales", unit: "kg" },
      { name: "Tomate pera", category: "Verduras", unit: "kg" },
      { name: "Pimiento rojo", category: "Verduras", unit: "kg" },
      { name: "Berenjena", category: "Verduras", unit: "kg" },
      { name: "Calabacín", category: "Verduras", unit: "kg" },
      { name: "Ajo", category: "Verduras", unit: "kg" },
      { name: "Limones", category: "Frutas y cítricos", unit: "kg" },
      { name: "Lubina", category: "Pescados", unit: "kg" },
      { name: "Gambas", category: "Pescados", unit: "kg" },
      { name: "Cordero", category: "Cárnicos", unit: "kg" },
      { name: "Pollo de corral", category: "Cárnicos", unit: "kg" },
      { name: "Queso manchego", category: "Lácteos", unit: "kg" },
      { name: "Azafrán", category: "Especias", unit: "g" },
      { name: "Romero fresco", category: "Especias", unit: "manojo" },
    ],
    suppliers: [
      { name: "Mercado central", type: "Frutas y verduras" },
      { name: "Pescadería local", type: "Pescados" },
      { name: "Distribuidor horeca", type: "General" },
    ],
  },

  tapas: {
    label: "Tapas / Raciones",
    categories: [
      "Embutidos", "Conservas", "Fritos", "Encurtidos", "Cárnicos",
      "Quesos", "Pan y tostadas", "Verduras", "Aceites", "Bebidas",
    ],
    products: [
      { name: "Jamón ibérico", category: "Embutidos", unit: "kg" },
      { name: "Lomo ibérico", category: "Embutidos", unit: "kg" },
      { name: "Chorizo ibérico", category: "Embutidos", unit: "kg" },
      { name: "Anchoas del Cantábrico", category: "Conservas", unit: "lata" },
      { name: "Mejillones en escabeche", category: "Conservas", unit: "lata" },
      { name: "Aceitunas manzanilla", category: "Encurtidos", unit: "kg" },
      { name: "Banderillas", category: "Encurtidos", unit: "ud" },
      { name: "Croquetas (masa)", category: "Fritos", unit: "kg" },
      { name: "Rabas (calamar)", category: "Fritos", unit: "kg" },
      { name: "Huevos frescos", category: "Fritos", unit: "docena" },
      { name: "Patatas para freír", category: "Fritos", unit: "kg" },
      { name: "Pan de cristal", category: "Pan y tostadas", unit: "ud" },
      { name: "Queso manchego curado", category: "Quesos", unit: "kg" },
      { name: "Pimientos del piquillo", category: "Verduras", unit: "lata" },
      { name: "Tomate triturado", category: "Verduras", unit: "kg" },
      { name: "Aceite de oliva", category: "Aceites", unit: "L" },
      { name: "Aceite de girasol", category: "Aceites", unit: "L" },
    ],
    suppliers: [
      { name: "Proveedor de ibéricos", type: "Embutidos" },
      { name: "Distribuidor conservas", type: "Conservas" },
      { name: "Distribuidor horeca", type: "General" },
    ],
  },

  internacional: {
    label: "Fusión / Internacional",
    categories: [
      "Especias asiáticas", "Salsas base", "Arroces y noodles", "Proteínas",
      "Verduras", "Frutas tropicales", "Lácteos", "Aceites y vinagres", "Otros",
    ],
    products: [
      { name: "Salsa de soja", category: "Salsas base", unit: "L" },
      { name: "Sriracha", category: "Salsas base", unit: "ud" },
      { name: "Miso", category: "Salsas base", unit: "kg" },
      { name: "Leche de coco", category: "Salsas base", unit: "L" },
      { name: "Curry paste (rojo/verde)", category: "Especias asiáticas", unit: "kg" },
      { name: "Jengibre fresco", category: "Especias asiáticas", unit: "kg" },
      { name: "Lemongrass", category: "Especias asiáticas", unit: "manojo" },
      { name: "Arroz basmati", category: "Arroces y noodles", unit: "kg" },
      { name: "Noodles de arroz", category: "Arroces y noodles", unit: "kg" },
      { name: "Salmón fresco", category: "Proteínas", unit: "kg" },
      { name: "Atún rojo", category: "Proteínas", unit: "kg" },
      { name: "Tofu firme", category: "Proteínas", unit: "kg" },
      { name: "Aguacate", category: "Frutas tropicales", unit: "ud" },
      { name: "Lima", category: "Frutas tropicales", unit: "kg" },
      { name: "Mango", category: "Frutas tropicales", unit: "kg" },
      { name: "Aceite de sésamo", category: "Aceites y vinagres", unit: "L" },
      { name: "Vinagre de arroz", category: "Aceites y vinagres", unit: "L" },
    ],
    suppliers: [
      { name: "Distribuidor asiático", type: "Productos asiáticos" },
      { name: "Pescadería premium", type: "Pescados" },
      { name: "Distribuidor horeca", type: "General" },
    ],
  },
}

export function getCuisineTemplate(cuisineType: string): CuisineTemplate | null {
  return CUISINE_TEMPLATES[cuisineType] ?? null
}
