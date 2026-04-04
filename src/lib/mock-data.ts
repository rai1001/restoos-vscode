// =============================================================================
// src/lib/mock-data.ts — Datos de demostración para desarrollo local
// =============================================================================
// Se usan cuando Supabase no está disponible (hotelId === null).
// Todos los tipos deben coincidir exactamente con los schemas Zod del dominio.
// =============================================================================

import type { Recipe } from "@/features/recipes/schemas/recipe.schema";
// Client type (formerly in events schema, kept inline for compatibility)
interface Client {
  id: string
  hotel_id: string
  name: string
  company?: string
  email?: string
  phone?: string
  tax_id?: string
  address?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}
import type {
  Product,
  Category,
  Supplier,
} from "@/features/catalog/schemas/catalog.schema";
import type { PurchaseOrder } from "@/features/procurement/schemas/procurement.schema";
import type {
  StockLot,
  StockMovement,
} from "@/features/inventory/schemas/inventory.schema";

// IDs fijos para que las relaciones entre entidades sean consistentes
const HOTEL_ID = "00000000-0000-0000-0000-000000000001";

// ─── IDs de Categorías ────────────────────────────────────────────────────────
const CAT_CARNES     = "10000000-0000-0000-0000-000000000001";
const CAT_PESCADOS   = "10000000-0000-0000-0000-000000000002";
const CAT_VERDURAS   = "10000000-0000-0000-0000-000000000003";
const CAT_LACTEOS    = "10000000-0000-0000-0000-000000000004";
const CAT_ACEITES    = "10000000-0000-0000-0000-000000000005";
const CAT_HARINAS    = "10000000-0000-0000-0000-000000000006";
const CAT_BEBIDAS    = "10000000-0000-0000-0000-000000000007";
const CAT_OTROS      = "10000000-0000-0000-0000-000000000008";

// ─── IDs de Proveedores ───────────────────────────────────────────────────────
export const SUP_MAKRO      = "20000000-0000-0000-0000-000000000001";
export const SUP_SYSCO      = "20000000-0000-0000-0000-000000000002";
export const SUP_CAMPOFRIO  = "20000000-0000-0000-0000-000000000003";
export const SUP_FRUTAS     = "20000000-0000-0000-0000-000000000004";
export const SUP_PESQUERIA  = "20000000-0000-0000-0000-000000000005";
export const SUP_LACTEOS    = "20000000-0000-0000-0000-000000000006";

// ─── IDs de Productos ─────────────────────────────────────────────────────────
export const PROD_ACEITE    = "30000000-0000-0000-0000-000000000001";
export const PROD_HARINA    = "30000000-0000-0000-0000-000000000002";
export const PROD_POLLO     = "30000000-0000-0000-0000-000000000003";
export const PROD_TERNERA   = "30000000-0000-0000-0000-000000000004";
export const PROD_SALMON    = "30000000-0000-0000-0000-000000000005";
export const PROD_MERLUZA   = "30000000-0000-0000-0000-000000000006";
export const PROD_TOMATE    = "30000000-0000-0000-0000-000000000007";
export const PROD_CEBOLLA   = "30000000-0000-0000-0000-000000000008";
export const PROD_LECHE     = "30000000-0000-0000-0000-000000000009";
export const PROD_QUESO     = "30000000-0000-0000-0000-000000000010";
export const PROD_MANTEQUILLA = "30000000-0000-0000-0000-000000000011";
export const PROD_ARROZ     = "30000000-0000-0000-0000-000000000012";
export const PROD_PATATA    = "30000000-0000-0000-0000-000000000013";
export const PROD_ZANAHORIA = "30000000-0000-0000-0000-000000000014";
export const PROD_VINO      = "30000000-0000-0000-0000-000000000015";

// ─── IDs de Unidades ──────────────────────────────────────────────────────────
export const UNIT_KG = "40000000-0000-0000-0000-000000000001";
export const UNIT_L  = "40000000-0000-0000-0000-000000000003";

// =============================================================================
// RECETAS
// =============================================================================
export const MOCK_RECIPES: Recipe[] = [
  {
    id: "50000000-0000-0000-0000-000000000001",
    hotel_id: HOTEL_ID,
    name: "Gazpacho andaluz",
    description: "Sopa fría de tomate y verduras frescas",
    category: "entrante",
    servings: 10,
    prep_time_min: 20,
    cook_time_min: null,
    status: "approved",
    version: 3,
    total_cost: 18.50,
    cost_per_serving: 1.85,
    notes: "Servir muy frío. Decorar con brunoise de pepino.",
    created_at: "2025-01-10T09:00:00Z",
    updated_at: "2025-02-15T11:30:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
  {
    id: "50000000-0000-0000-0000-000000000002",
    hotel_id: HOTEL_ID,
    name: "Croquetas de jamón ibérico",
    description: "Croquetas cremosas de bechamel con jamón 5J",
    category: "entrante",
    servings: 20,
    prep_time_min: 45,
    cook_time_min: 10,
    status: "approved",
    version: 2,
    total_cost: 42.00,
    cost_per_serving: 2.10,
    notes: "Freír a 180 °C. Tamaño estándar: 35 g/unidad.",
    created_at: "2025-01-12T10:00:00Z",
    updated_at: "2025-03-01T08:00:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
  {
    id: "50000000-0000-0000-0000-000000000003",
    hotel_id: HOTEL_ID,
    name: "Solomillo de ternera al Oporto",
    description: "Solomillo con reducción de Oporto y puré de patata trufado",
    category: "principal",
    servings: 8,
    prep_time_min: 30,
    cook_time_min: 25,
    status: "approved",
    version: 1,
    total_cost: 128.00,
    cost_per_serving: 16.00,
    notes: "Punto de cocción: 55 °C interno. Reposar 5 min antes de emplatar.",
    created_at: "2025-01-20T14:00:00Z",
    updated_at: "2025-01-20T14:00:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
  {
    id: "50000000-0000-0000-0000-000000000004",
    hotel_id: HOTEL_ID,
    name: "Arroz meloso con bogavante",
    description: "Arroz meloso con bogavante y sofrito de tomate y pimientos",
    category: "principal",
    servings: 6,
    prep_time_min: 40,
    cook_time_min: 20,
    status: "review_pending",
    version: 1,
    total_cost: 96.00,
    cost_per_serving: 16.00,
    notes: null,
    created_at: "2025-02-05T11:00:00Z",
    updated_at: "2025-03-10T09:45:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
  {
    id: "50000000-0000-0000-0000-000000000005",
    hotel_id: HOTEL_ID,
    name: "Merluza en salsa verde",
    description: "Merluza fresca con salsa de perejil y almejas",
    category: "principal",
    servings: 8,
    prep_time_min: 20,
    cook_time_min: 15,
    status: "approved",
    version: 2,
    total_cost: 72.00,
    cost_per_serving: 9.00,
    notes: "Usar merluza de pincho del Cantábrico.",
    created_at: "2025-01-25T10:30:00Z",
    updated_at: "2025-02-20T12:00:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
  {
    id: "50000000-0000-0000-0000-000000000006",
    hotel_id: HOTEL_ID,
    name: "Tarta de queso La Viña",
    description: "Tarta de queso cremosa al horno estilo vasco",
    category: "postre",
    servings: 10,
    prep_time_min: 15,
    cook_time_min: 50,
    status: "approved",
    version: 4,
    total_cost: 22.00,
    cost_per_serving: 2.20,
    notes: "Hornear a 230 °C. Debe quedar el centro ligeramente tembloroso.",
    created_at: "2024-12-01T08:00:00Z",
    updated_at: "2025-03-05T10:00:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
  {
    id: "50000000-0000-0000-0000-000000000007",
    hotel_id: HOTEL_ID,
    name: "Ensaladilla rusa clásica",
    description: "Ensaladilla con atún, huevo, aceitunas y mayonesa casera",
    category: "entrante",
    servings: 12,
    prep_time_min: 30,
    cook_time_min: 20,
    status: "draft",
    version: 1,
    total_cost: null,
    cost_per_serving: null,
    notes: "Pendiente de cálculo de costes con proveedor de atún.",
    created_at: "2025-03-01T16:00:00Z",
    updated_at: "2025-03-01T16:00:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
  {
    id: "50000000-0000-0000-0000-000000000008",
    hotel_id: HOTEL_ID,
    name: "Coulant de chocolate negro",
    description: "Bizcocho tibio de chocolate 70% con helado de vainilla",
    category: "postre",
    servings: 6,
    prep_time_min: 20,
    cook_time_min: 12,
    status: "approved",
    version: 2,
    total_cost: 18.60,
    cost_per_serving: 3.10,
    notes: "Temperatura horno convección: 200 °C. Se puede precongelar la masa.",
    created_at: "2025-01-08T09:00:00Z",
    updated_at: "2025-02-10T11:00:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
  {
    id: "50000000-0000-0000-0000-000000000009",
    hotel_id: HOTEL_ID,
    name: "Carpaccio de salmón con alcaparras",
    description: "Salmón marinado en cítricos con alcaparras y eneldo",
    category: "entrante",
    servings: 8,
    prep_time_min: 25,
    cook_time_min: null,
    status: "deprecated",
    version: 1,
    total_cost: 56.00,
    cost_per_serving: 7.00,
    notes: "Sustituido por tartar de salmón en la carta actual.",
    created_at: "2024-10-01T10:00:00Z",
    updated_at: "2025-01-15T14:00:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
  {
    id: "50000000-0000-0000-0000-000000000010",
    hotel_id: HOTEL_ID,
    name: "Pollo asado con hierbas mediterráneas",
    description: "Pollo de corral asado con romero, tomillo y limón",
    category: "principal",
    servings: 4,
    prep_time_min: 15,
    cook_time_min: 70,
    status: "approved",
    version: 1,
    total_cost: 28.00,
    cost_per_serving: 7.00,
    notes: "Temperatura interna mínima: 75 °C en el muslo.",
    created_at: "2025-02-01T09:00:00Z",
    updated_at: "2025-02-01T09:00:00Z",
    created_by: null,
    is_sub_recipe: false,
  },
];

// =============================================================================
// CLIENTES
// =============================================================================
export const MOCK_CLIENTS: Client[] = [
  {
    id: "60000000-0000-0000-0000-000000000001",
    hotel_id: HOTEL_ID,
    name: "Grupo Empresarial Iberdrola",
    company: "Iberdrola S.A.",
    email: "eventos@iberdrola.com",
    phone: "+34 944 151 411",
    tax_id: "A-48010615",
    address: "Plaza Euskadi 5, Bilbao, 48009",
    notes: "Cliente corporativo premium. Organiza 4-6 eventos anuales de entre 80 y 200 personas.",
    is_active: true,
    created_at: "2024-09-15T10:00:00Z",
    updated_at: "2025-01-20T09:00:00Z",
  },
  {
    id: "60000000-0000-0000-0000-000000000002",
    hotel_id: HOTEL_ID,
    name: "Ana García Rodríguez",
    company: undefined,
    email: "ana.garcia@gmail.com",
    phone: "+34 612 345 678",
    tax_id: "12345678A",
    address: "Calle Mayor 23, 2ºB, Madrid, 28013",
    notes: "Boda en mayo 2025. 150 invitados. Menú degustación.",
    is_active: true,
    created_at: "2025-01-05T11:00:00Z",
    updated_at: "2025-02-10T14:00:00Z",
  },
  {
    id: "60000000-0000-0000-0000-000000000003",
    hotel_id: HOTEL_ID,
    name: "Fundación Mapfre",
    company: "Fundación Mapfre",
    email: "patronato@fundacionmapfre.org",
    phone: "+34 91 581 86 21",
    tax_id: "G-28605239",
    address: "Paseo de Recoletos 23, Madrid, 28004",
    notes: "Cenas de gala anuales. Exigen menú sin gluten y sin lactosa por política interna.",
    is_active: true,
    created_at: "2024-11-01T09:30:00Z",
    updated_at: "2025-03-01T10:00:00Z",
  },
  {
    id: "60000000-0000-0000-0000-000000000004",
    hotel_id: HOTEL_ID,
    name: "Carlos Martínez Vela",
    company: "Despacho Martínez & Asociados",
    email: "cmartinez@martinezasociados.es",
    phone: "+34 654 321 987",
    tax_id: "B-87654321",
    address: "Gran Vía 45, 5º, Madrid, 28013",
    notes: "Almuerzos de negocios mensuales. Máximo 20 personas. Preferencia por cocina de mercado.",
    is_active: true,
    created_at: "2025-01-15T16:00:00Z",
    updated_at: "2025-01-15T16:00:00Z",
  },
  {
    id: "60000000-0000-0000-0000-000000000005",
    hotel_id: HOTEL_ID,
    name: "Hotel Ritz Madrid",
    company: "Mandarin Oriental Ritz, Madrid",
    email: "banquetes@mandarinoriental.com",
    phone: "+34 91 701 67 67",
    tax_id: "A-12345678",
    address: "Plaza de la Lealtad 5, Madrid, 28014",
    notes: "Colaboración para eventos de desbordamiento de capacidad. Protocolo de alto nivel.",
    is_active: true,
    created_at: "2024-08-20T10:00:00Z",
    updated_at: "2025-02-05T09:00:00Z",
  },
  {
    id: "60000000-0000-0000-0000-000000000006",
    hotel_id: HOTEL_ID,
    name: "Asociación Gastronómica de España",
    company: "AGE",
    email: "secretaria@age-gastronomia.es",
    phone: "+34 91 234 56 78",
    tax_id: "G-11223344",
    address: "Calle Velázquez 12, Madrid, 28001",
    notes: "Jornadas gastronómicas anuales. Solicitan chef invitado.",
    is_active: true,
    created_at: "2025-02-01T10:00:00Z",
    updated_at: "2025-02-01T10:00:00Z",
  },
  {
    id: "60000000-0000-0000-0000-000000000007",
    hotel_id: HOTEL_ID,
    name: "Pedro Sánchez López",
    company: undefined,
    email: "pedro.sl@hotmail.com",
    phone: "+34 699 111 222",
    tax_id: undefined,
    address: undefined,
    notes: "Comunión 30 personas. Presupuesto ajustado. Menú infantil requerido.",
    is_active: true,
    created_at: "2025-03-05T17:00:00Z",
    updated_at: "2025-03-05T17:00:00Z",
  },
  {
    id: "60000000-0000-0000-0000-000000000008",
    hotel_id: HOTEL_ID,
    name: "BBVA Seguros",
    company: "BBVA Seguros S.A.",
    email: "eventos.corporativos@bbvase.com",
    phone: "+34 91 374 60 00",
    tax_id: "A-78962836",
    address: "Paseo de la Castellana 81, Madrid, 28046",
    notes: "Cliente inactivo desde reestructuración interna en 2024.",
    is_active: false,
    created_at: "2023-06-10T09:00:00Z",
    updated_at: "2024-12-01T08:00:00Z",
  },
];

// =============================================================================
// CATEGORÍAS
// =============================================================================
export const MOCK_CATEGORIES: Category[] = [
  {
    id: CAT_CARNES,
    hotel_id: HOTEL_ID,
    name: "Carnes",
    parent_id: null,
    sort_order: 1,
    is_active: true,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
  },
  {
    id: CAT_PESCADOS,
    hotel_id: HOTEL_ID,
    name: "Pescados y Mariscos",
    parent_id: null,
    sort_order: 2,
    is_active: true,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
  },
  {
    id: CAT_VERDURAS,
    hotel_id: HOTEL_ID,
    name: "Verduras y Hortalizas",
    parent_id: null,
    sort_order: 3,
    is_active: true,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
  },
  {
    id: CAT_LACTEOS,
    hotel_id: HOTEL_ID,
    name: "Lácteos",
    parent_id: null,
    sort_order: 4,
    is_active: true,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
  },
  {
    id: CAT_ACEITES,
    hotel_id: HOTEL_ID,
    name: "Aceites y Condimentos",
    parent_id: null,
    sort_order: 5,
    is_active: true,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
  },
  {
    id: CAT_HARINAS,
    hotel_id: HOTEL_ID,
    name: "Harinas y Cereales",
    parent_id: null,
    sort_order: 6,
    is_active: true,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
  },
  {
    id: CAT_BEBIDAS,
    hotel_id: HOTEL_ID,
    name: "Bebidas",
    parent_id: null,
    sort_order: 7,
    is_active: true,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
  },
  {
    id: CAT_OTROS,
    hotel_id: HOTEL_ID,
    name: "Otros",
    parent_id: null,
    sort_order: 8,
    is_active: true,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
  },
];

// =============================================================================
// PROVEEDORES
// =============================================================================
export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: SUP_MAKRO,
    hotel_id: HOTEL_ID,
    name: "Makro España",
    contact_name: "Ramón Torres",
    email: "ramon.torres@makro.es",
    phone: "+34 91 300 10 00",
    address: "Av. de Aragón 402, Madrid, 28022",
    tax_id: "A-28027944",
    is_active: true,
    notes: "Proveedor general. Pedidos mínimos martes y jueves antes de las 14h.",
    created_at: "2024-11-01T09:00:00Z",
    updated_at: "2025-01-10T10:00:00Z",
  },
  {
    id: SUP_SYSCO,
    hotel_id: HOTEL_ID,
    name: "Sysco España",
    contact_name: "Laura Fernández",
    email: "l.fernandez@sysco.es",
    phone: "+34 93 476 20 00",
    address: "Polígono Industrial Can Salvatella, Barcelona, 08210",
    tax_id: "A-58003601",
    is_active: true,
    notes: "Proveedor premium. Especialistas en cortes de carne y elaborados.",
    created_at: "2024-11-05T09:00:00Z",
    updated_at: "2025-02-01T11:00:00Z",
  },
  {
    id: SUP_CAMPOFRIO,
    hotel_id: HOTEL_ID,
    name: "Campofrío Food Group",
    contact_name: "Miguel Ángel Rojo",
    email: "m.rojo@campofrio.es",
    phone: "+34 91 782 50 00",
    address: "Ctra. N-VI, km 22, Burgos, 09007",
    tax_id: "A-09002501",
    is_active: true,
    notes: "Embutidos y charcutería ibérica. Entrega cada lunes.",
    created_at: "2024-11-10T09:00:00Z",
    updated_at: "2025-01-05T08:00:00Z",
  },
  {
    id: SUP_FRUTAS,
    hotel_id: HOTEL_ID,
    name: "Frutas García S.L.",
    contact_name: "José García",
    email: "pedidos@frutasgarcia.com",
    phone: "+34 666 123 456",
    address: "Mercamadrid, Módulo 34, Madrid, 28053",
    tax_id: "B-34567890",
    is_active: true,
    notes: "Frutas y verduras de temporada. Entrega diaria antes de las 7h. Producto de proximidad.",
    created_at: "2024-11-15T09:00:00Z",
    updated_at: "2025-03-01T09:00:00Z",
  },
  {
    id: SUP_PESQUERIA,
    hotel_id: HOTEL_ID,
    name: "Pesquería del Norte S.A.",
    contact_name: "Isabel Martínez",
    email: "ventas@pesqueriadelnorte.es",
    phone: "+34 985 321 654",
    address: "Puerto Pesquero de Gijón, Muelle de Poniente, 33201",
    tax_id: "A-33445566",
    is_active: true,
    notes: "Pescado fresco del Cantábrico. Pedido antes de las 20h para entrega al día siguiente.",
    created_at: "2024-11-20T09:00:00Z",
    updated_at: "2025-02-15T10:00:00Z",
  },
  {
    id: SUP_LACTEOS,
    hotel_id: HOTEL_ID,
    name: "Lácteos Asturias S.Coop.",
    contact_name: "Fernando Álvarez",
    email: "cooperativa@lacteosasturias.es",
    phone: "+34 985 765 432",
    address: "Polígono Industrial La Curiscada, Noreña, Asturias, 33180",
    tax_id: "F-33112233",
    is_active: false,
    notes: "Proveedor suspendido temporalmente por incidencia de calidad en enero 2025.",
    created_at: "2024-10-01T09:00:00Z",
    updated_at: "2025-01-20T16:00:00Z",
  },
];

// =============================================================================
// PRODUCTOS
// =============================================================================
export const MOCK_PRODUCTS: Product[] = [
  {
    id: PROD_ACEITE,
    hotel_id: HOTEL_ID,
    name: "Aceite de oliva virgen extra",
    category_id: CAT_ACEITES,
    default_unit_id: UNIT_L,
    is_active: true,
    yield_percent: 100,
    allergens: [],
    notes: "Origen Jaén. DOP Baena. Acidez máx. 0,2°.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2025-01-10T10:00:00Z",
    created_by: null,
  },
  {
    id: PROD_HARINA,
    hotel_id: HOTEL_ID,
    name: "Harina de trigo T-55",
    category_id: CAT_HARINAS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 100,
    allergens: ["gluten"],
    notes: "Para pastelería y bechamel. Fuerza media.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_POLLO,
    hotel_id: HOTEL_ID,
    name: "Pollo entero de corral",
    category_id: CAT_CARNES,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 72, // ~28% huesos, piel, merma
    allergens: [],
    notes: "Peso medio 1,8 kg. Certificado de bienestar animal.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_TERNERA,
    hotel_id: HOTEL_ID,
    name: "Solomillo de ternera",
    category_id: CAT_CARNES,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 85, // ~15% merma al limpiar
    allergens: [],
    notes: "Raza Ávila. Maduración mínima 21 días.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2025-02-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_SALMON,
    hotel_id: HOTEL_ID,
    name: "Salmón noruego (filete)",
    category_id: CAT_PESCADOS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 75, // ~25% merma (piel, espinas, recortes)
    allergens: ["pescado"],
    notes: "Filete sin piel, sin espinas. Calibre 3/4.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_MERLUZA,
    hotel_id: HOTEL_ID,
    name: "Merluza del Cantábrico",
    category_id: CAT_PESCADOS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 65, // ~35% merma (cabeza, espinas, piel)
    allergens: ["pescado"],
    notes: "Merluza de pincho. Entera o en lomos según pedido.",
    created_at: "2024-12-02T09:00:00Z",
    updated_at: "2024-12-02T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_TOMATE,
    hotel_id: HOTEL_ID,
    name: "Tomate pera",
    category_id: CAT_VERDURAS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 90, // ~10% merma (piel, semillas)
    allergens: [],
    notes: "Para gazpacho y sofrito. Variedades de temporada.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_CEBOLLA,
    hotel_id: HOTEL_ID,
    name: "Cebolla blanca",
    category_id: CAT_VERDURAS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 88, // ~12% merma (piel exterior)
    allergens: [],
    notes: null,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_LECHE,
    hotel_id: HOTEL_ID,
    name: "Leche entera fresca",
    category_id: CAT_LACTEOS,
    default_unit_id: UNIT_L,
    is_active: true,
    yield_percent: 100,
    allergens: ["leche"],
    notes: "Para pastelería y bechamel. UHT no permitida en cocina.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_QUESO,
    hotel_id: HOTEL_ID,
    name: "Queso crema Philadelphia",
    category_id: CAT_LACTEOS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 100,
    allergens: ["leche"],
    notes: "Para tarta de queso. Formato 1 kg profesional.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_MANTEQUILLA,
    hotel_id: HOTEL_ID,
    name: "Mantequilla sin sal (82% materia grasa)",
    category_id: CAT_LACTEOS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 100,
    allergens: ["leche"],
    notes: "Origen Normandía. Para pastelería.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_ARROZ,
    hotel_id: HOTEL_ID,
    name: "Arroz bomba D.O. Valencia",
    category_id: CAT_HARINAS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 100,
    allergens: [],
    notes: "Para arroces melosos y paellas. Absorción 1:3.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_PATATA,
    hotel_id: HOTEL_ID,
    name: "Patata Agria",
    category_id: CAT_VERDURAS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 80, // ~20% merma (piel, ojos)
    allergens: [],
    notes: "Para fritura y guarnición. Calibre 50-70 mm.",
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_ZANAHORIA,
    hotel_id: HOTEL_ID,
    name: "Zanahoria de temporada",
    category_id: CAT_VERDURAS,
    default_unit_id: UNIT_KG,
    is_active: true,
    yield_percent: 82, // ~18% merma (puntas, piel)
    allergens: [],
    notes: null,
    created_at: "2024-12-01T09:00:00Z",
    updated_at: "2024-12-01T09:00:00Z",
    created_by: null,
  },
  {
    id: PROD_VINO,
    hotel_id: HOTEL_ID,
    name: "Vino tinto Rioja crianza",
    category_id: CAT_BEBIDAS,
    default_unit_id: UNIT_L,
    is_active: false,
    yield_percent: 100,
    allergens: ["sulfitos"],
    notes: "Descatalogado. Sustituido por Ribera del Duero.",
    created_at: "2024-10-01T09:00:00Z",
    updated_at: "2025-01-01T09:00:00Z",
    created_by: null,
  },
];

// =============================================================================
// PEDIDOS DE COMPRA
// =============================================================================
export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "70000000-0000-0000-0000-000000000001",
    hotel_id: HOTEL_ID,
    supplier_id: SUP_FRUTAS,
    order_number: "PO-2025-0021",
    status: "enviada",
    expected_delivery_date: "2025-03-18",
    total_amount: 248.50,
    notes: "Pedido semanal de verduras y frutas. Incluir fresas de temporada.",
    created_by: null,
    approved_by: null,
    sent_at: "2025-03-16T08:30:00Z",
    created_at: "2025-03-15T17:00:00Z",
    updated_at: "2025-03-16T08:30:00Z",
  },
  {
    id: "70000000-0000-0000-0000-000000000002",
    hotel_id: HOTEL_ID,
    supplier_id: SUP_PESQUERIA,
    order_number: "PO-2025-0020",
    status: "recibida",
    expected_delivery_date: "2025-03-14",
    total_amount: 615.00,
    notes: "Merluza para evento del sábado. Confirmar calibre con Isabel.",
    created_by: null,
    approved_by: null,
    sent_at: "2025-03-12T19:00:00Z",
    created_at: "2025-03-12T16:00:00Z",
    updated_at: "2025-03-14T09:00:00Z",
  },
  {
    id: "70000000-0000-0000-0000-000000000003",
    hotel_id: HOTEL_ID,
    supplier_id: SUP_SYSCO,
    order_number: "PO-2025-0019",
    status: "enviada",
    expected_delivery_date: "2025-03-13",
    total_amount: 1240.00,
    notes: "Solomillos para banquete anual de Iberdrola. Faltan los chuletones.",
    created_by: null,
    approved_by: null,
    sent_at: "2025-03-10T10:00:00Z",
    created_at: "2025-03-10T09:00:00Z",
    updated_at: "2025-03-13T11:00:00Z",
  },
  {
    id: "70000000-0000-0000-0000-000000000004",
    hotel_id: HOTEL_ID,
    supplier_id: SUP_MAKRO,
    order_number: "PO-2025-0018",
    status: "borrador",
    expected_delivery_date: "2025-03-19",
    total_amount: 387.20,
    notes: "Reposición de almacén seco. Harinas, aceites y conservas.",
    created_by: null,
    approved_by: null,
    sent_at: null,
    created_at: "2025-03-16T11:00:00Z",
    updated_at: "2025-03-16T15:00:00Z",
  },
  {
    id: "70000000-0000-0000-0000-000000000005",
    hotel_id: HOTEL_ID,
    supplier_id: SUP_CAMPOFRIO,
    order_number: "PO-2025-0017",
    status: "enviada",
    expected_delivery_date: "2025-03-17",
    total_amount: 520.00,
    notes: "Jamón ibérico y embutidos para el bufet de desayunos.",
    created_by: null,
    approved_by: null,
    sent_at: "2025-03-14T08:00:00Z",
    created_at: "2025-03-13T17:30:00Z",
    updated_at: "2025-03-14T14:00:00Z",
  },
  {
    id: "70000000-0000-0000-0000-000000000006",
    hotel_id: HOTEL_ID,
    supplier_id: SUP_MAKRO,
    order_number: "PO-2025-0016",
    status: "cancelada",
    expected_delivery_date: "2025-03-10",
    total_amount: 195.00,
    notes: "Cancelado. Evento aplazado al trimestre siguiente.",
    created_by: null,
    approved_by: null,
    sent_at: null,
    created_at: "2025-03-08T10:00:00Z",
    updated_at: "2025-03-09T09:00:00Z",
  },
];

// =============================================================================
// LOTES DE STOCK
// =============================================================================
export const MOCK_STOCK_LOTS: StockLot[] = [
  {
    id: "80000000-0000-0000-0000-000000000001",
    hotel_id: HOTEL_ID,
    product_id: PROD_MERLUZA,
    unit_id: UNIT_KG,
    receipt_line_id: null,
    lot_number: "L-2025-0142",
    initial_quantity: 25.0,
    current_quantity: 18.5,
    unit_cost: 12.50,
    expiry_date: "2025-03-19",
    received_at: "2025-03-14T09:00:00Z",
    created_at: "2025-03-14T09:00:00Z",
  },
  {
    id: "80000000-0000-0000-0000-000000000002",
    hotel_id: HOTEL_ID,
    product_id: PROD_SALMON,
    unit_id: UNIT_KG,
    receipt_line_id: null,
    lot_number: "L-2025-0141",
    initial_quantity: 15.0,
    current_quantity: 9.2,
    unit_cost: 18.00,
    expiry_date: "2025-03-20",
    received_at: "2025-03-14T09:00:00Z",
    created_at: "2025-03-14T09:00:00Z",
  },
  {
    id: "80000000-0000-0000-0000-000000000003",
    hotel_id: HOTEL_ID,
    product_id: PROD_TERNERA,
    unit_id: UNIT_KG,
    receipt_line_id: null,
    lot_number: "L-2025-0138",
    initial_quantity: 12.0,
    current_quantity: 12.0,
    unit_cost: 38.00,
    expiry_date: "2025-03-22",
    received_at: "2025-03-13T10:00:00Z",
    created_at: "2025-03-13T10:00:00Z",
  },
  {
    id: "80000000-0000-0000-0000-000000000004",
    hotel_id: HOTEL_ID,
    product_id: PROD_POLLO,
    unit_id: UNIT_KG,
    receipt_line_id: null,
    lot_number: "L-2025-0130",
    initial_quantity: 30.0,
    current_quantity: 22.0,
    unit_cost: 6.20,
    expiry_date: "2025-03-18",
    received_at: "2025-03-11T08:00:00Z",
    created_at: "2025-03-11T08:00:00Z",
  },
  {
    id: "80000000-0000-0000-0000-000000000005",
    hotel_id: HOTEL_ID,
    product_id: PROD_QUESO,
    unit_id: UNIT_KG,
    receipt_line_id: null,
    lot_number: "L-2025-0125",
    initial_quantity: 6.0,
    current_quantity: 4.5,
    unit_cost: 9.80,
    expiry_date: "2025-04-15",
    received_at: "2025-03-10T09:00:00Z",
    created_at: "2025-03-10T09:00:00Z",
  },
  {
    id: "80000000-0000-0000-0000-000000000006",
    hotel_id: HOTEL_ID,
    product_id: PROD_ACEITE,
    unit_id: UNIT_L,
    receipt_line_id: null,
    lot_number: "L-2025-0110",
    initial_quantity: 20.0,
    current_quantity: 14.5,
    unit_cost: 7.20,
    expiry_date: "2026-01-01",
    received_at: "2025-03-01T09:00:00Z",
    created_at: "2025-03-01T09:00:00Z",
  },
  {
    id: "80000000-0000-0000-0000-000000000007",
    hotel_id: HOTEL_ID,
    product_id: PROD_HARINA,
    unit_id: UNIT_KG,
    receipt_line_id: null,
    lot_number: "L-2025-0108",
    initial_quantity: 25.0,
    current_quantity: 19.0,
    unit_cost: 1.20,
    expiry_date: "2025-09-01",
    received_at: "2025-03-01T09:00:00Z",
    created_at: "2025-03-01T09:00:00Z",
  },
  {
    id: "80000000-0000-0000-0000-000000000008",
    hotel_id: HOTEL_ID,
    product_id: PROD_TOMATE,
    unit_id: UNIT_KG,
    receipt_line_id: null,
    lot_number: "L-2025-0145",
    initial_quantity: 20.0,
    current_quantity: 20.0,
    unit_cost: 1.80,
    expiry_date: "2025-03-21",
    received_at: "2025-03-16T06:30:00Z",
    created_at: "2025-03-16T06:30:00Z",
  },
  {
    id: "80000000-0000-0000-0000-000000000009",
    hotel_id: HOTEL_ID,
    product_id: PROD_MANTEQUILLA,
    unit_id: UNIT_KG,
    receipt_line_id: null,
    lot_number: "L-2025-0099",
    initial_quantity: 5.0,
    current_quantity: 1.2,
    unit_cost: 14.00,
    expiry_date: "2025-05-01",
    received_at: "2025-02-20T10:00:00Z",
    created_at: "2025-02-20T10:00:00Z",
  },
  {
    id: "80000000-0000-0000-0000-000000000010",
    hotel_id: HOTEL_ID,
    product_id: PROD_ARROZ,
    unit_id: UNIT_KG,
    receipt_line_id: null,
    lot_number: "L-2025-0095",
    initial_quantity: 10.0,
    current_quantity: 7.5,
    unit_cost: 3.40,
    expiry_date: "2026-06-01",
    received_at: "2025-02-15T09:00:00Z",
    created_at: "2025-02-15T09:00:00Z",
  },
];

// =============================================================================
// MOVIMIENTOS DE STOCK
// =============================================================================
export const MOCK_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: "90000000-0000-0000-0000-000000000001",
    hotel_id: HOTEL_ID,
    product_id: PROD_MERLUZA,
    lot_id: "80000000-0000-0000-0000-000000000001",
    movement_type: "reception",
    quantity: 25.0,
    unit_id: UNIT_KG,
    unit_cost: 12.50,
    reference_type: "purchase_order",
    reference_id: "70000000-0000-0000-0000-000000000002",
    notes: "Recepción pedido PO-2025-0020",
    created_by: null,
    created_at: "2025-03-14T09:05:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000002",
    hotel_id: HOTEL_ID,
    product_id: PROD_MERLUZA,
    lot_id: "80000000-0000-0000-0000-000000000001",
    movement_type: "consumption",
    quantity: 6.5,
    unit_id: UNIT_KG,
    unit_cost: 12.50,
    reference_type: "event",
    reference_id: null,
    notes: "Consumo evento boda García — 15 mar 2025",
    created_by: null,
    created_at: "2025-03-15T20:30:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000003",
    hotel_id: HOTEL_ID,
    product_id: PROD_SALMON,
    lot_id: "80000000-0000-0000-0000-000000000002",
    movement_type: "reception",
    quantity: 15.0,
    unit_id: UNIT_KG,
    unit_cost: 18.00,
    reference_type: "purchase_order",
    reference_id: "70000000-0000-0000-0000-000000000002",
    notes: "Recepción pedido PO-2025-0020",
    created_by: null,
    created_at: "2025-03-14T09:05:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000004",
    hotel_id: HOTEL_ID,
    product_id: PROD_TERNERA,
    lot_id: "80000000-0000-0000-0000-000000000003",
    movement_type: "reception",
    quantity: 12.0,
    unit_id: UNIT_KG,
    unit_cost: 38.00,
    reference_type: "purchase_order",
    reference_id: "70000000-0000-0000-0000-000000000003",
    notes: "Recepción parcial pedido PO-2025-0019",
    created_by: null,
    created_at: "2025-03-13T10:05:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000005",
    hotel_id: HOTEL_ID,
    product_id: PROD_POLLO,
    lot_id: "80000000-0000-0000-0000-000000000004",
    movement_type: "waste",
    quantity: 1.5,
    unit_id: UNIT_KG,
    unit_cost: 6.20,
    reference_type: null,
    reference_id: null,
    notes: "Merma por caducidad — zona de refrigeración alta temperatura durante 2h",
    created_by: null,
    created_at: "2025-03-13T18:00:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000006",
    hotel_id: HOTEL_ID,
    product_id: PROD_ACEITE,
    lot_id: "80000000-0000-0000-0000-000000000006",
    movement_type: "adjustment",
    quantity: -2.0,
    unit_id: UNIT_L,
    unit_cost: 7.20,
    reference_type: null,
    reference_id: null,
    notes: "Ajuste inventario tras auditoría semanal. Diferencia de 2 L.",
    created_by: null,
    created_at: "2025-03-10T10:30:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000007",
    hotel_id: HOTEL_ID,
    product_id: PROD_HARINA,
    lot_id: "80000000-0000-0000-0000-000000000007",
    movement_type: "consumption",
    quantity: 6.0,
    unit_id: UNIT_KG,
    unit_cost: 1.20,
    reference_type: "event",
    reference_id: null,
    notes: "Producción de croquetas y pastelería — semana 11",
    created_by: null,
    created_at: "2025-03-14T07:00:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000008",
    hotel_id: HOTEL_ID,
    product_id: PROD_QUESO,
    lot_id: "80000000-0000-0000-0000-000000000005",
    movement_type: "consumption",
    quantity: 1.5,
    unit_id: UNIT_KG,
    unit_cost: 9.80,
    reference_type: "event",
    reference_id: null,
    notes: "Tartas de queso para bufet de desayunos — 10 al 16 mar",
    created_by: null,
    created_at: "2025-03-16T07:30:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000009",
    hotel_id: HOTEL_ID,
    product_id: PROD_TOMATE,
    lot_id: "80000000-0000-0000-0000-000000000008",
    movement_type: "reception",
    quantity: 20.0,
    unit_id: UNIT_KG,
    unit_cost: 1.80,
    reference_type: "purchase_order",
    reference_id: "70000000-0000-0000-0000-000000000001",
    notes: "Entrega diaria Frutas García",
    created_by: null,
    created_at: "2025-03-16T06:35:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000010",
    hotel_id: HOTEL_ID,
    product_id: PROD_MANTEQUILLA,
    lot_id: "80000000-0000-0000-0000-000000000009",
    movement_type: "consumption",
    quantity: 1.8,
    unit_id: UNIT_KG,
    unit_cost: 14.00,
    reference_type: "event",
    reference_id: null,
    notes: "Producción pastelería: croissants y kouign-amann",
    created_by: null,
    created_at: "2025-03-15T06:00:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000011",
    hotel_id: HOTEL_ID,
    product_id: PROD_ARROZ,
    lot_id: "80000000-0000-0000-0000-000000000010",
    movement_type: "reservation",
    quantity: 2.0,
    unit_id: UNIT_KG,
    unit_cost: 3.40,
    reference_type: "event",
    reference_id: null,
    notes: "Reserva para arroz meloso bogavante — evento Fundación Mapfre",
    created_by: null,
    created_at: "2025-03-16T10:00:00Z",
  },
  {
    id: "90000000-0000-0000-0000-000000000012",
    hotel_id: HOTEL_ID,
    product_id: PROD_SALMON,
    lot_id: "80000000-0000-0000-0000-000000000002",
    movement_type: "consumption",
    quantity: 5.8,
    unit_id: UNIT_KG,
    unit_cost: 18.00,
    reference_type: "event",
    reference_id: null,
    notes: "Carpaccio y tartar servicio cena — 16 mar 2025",
    created_by: null,
    created_at: "2025-03-16T21:00:00Z",
  },
];

// =============================================================================
// OFERTAS DE PROVEEDORES (mock)
// =============================================================================
export const MOCK_SUPPLIER_OFFERS = [
  // Makro España
  { id: "of-001", product_id: PROD_ACEITE, supplier_id: SUP_MAKRO, supplier_name: "Makro España", product_name: "Aceite de oliva virgen extra", price: 8.50, unit: "L", is_preferred: true },
  { id: "of-002", product_id: PROD_HARINA, supplier_id: SUP_MAKRO, supplier_name: "Makro España", product_name: "Harina de trigo T-55", price: 0.95, unit: "kg", is_preferred: false },
  { id: "of-003", product_id: PROD_ARROZ, supplier_id: SUP_MAKRO, supplier_name: "Makro España", product_name: "Arroz bomba D.O. Valencia", price: 3.20, unit: "kg", is_preferred: true },
  { id: "of-004", product_id: PROD_PATATA, supplier_id: SUP_MAKRO, supplier_name: "Makro España", product_name: "Patata Agria", price: 0.90, unit: "kg", is_preferred: true },
  // Sysco España
  { id: "of-005", product_id: PROD_TERNERA, supplier_id: SUP_SYSCO, supplier_name: "Sysco España", product_name: "Solomillo de ternera", price: 32.00, unit: "kg", is_preferred: true },
  { id: "of-006", product_id: PROD_POLLO, supplier_id: SUP_SYSCO, supplier_name: "Sysco España", product_name: "Pollo entero de corral", price: 6.80, unit: "kg", is_preferred: true },
  { id: "of-007", product_id: PROD_HARINA, supplier_id: SUP_SYSCO, supplier_name: "Sysco España", product_name: "Harina de trigo T-55", price: 0.88, unit: "kg", is_preferred: true },
  // Campofrío Food Group
  { id: "of-008", product_id: PROD_POLLO, supplier_id: SUP_CAMPOFRIO, supplier_name: "Campofrío Food Group", product_name: "Pollo entero de corral", price: 7.20, unit: "kg", is_preferred: false },
  // Frutas García S.L.
  { id: "of-009", product_id: PROD_TOMATE, supplier_id: SUP_FRUTAS, supplier_name: "Frutas García S.L.", product_name: "Tomate pera", price: 2.10, unit: "kg", is_preferred: true },
  { id: "of-010", product_id: PROD_CEBOLLA, supplier_id: SUP_FRUTAS, supplier_name: "Frutas García S.L.", product_name: "Cebolla blanca", price: 1.20, unit: "kg", is_preferred: true },
  { id: "of-011", product_id: PROD_ZANAHORIA, supplier_id: SUP_FRUTAS, supplier_name: "Frutas García S.L.", product_name: "Zanahoria de temporada", price: 1.40, unit: "kg", is_preferred: true },
  { id: "of-012", product_id: PROD_PATATA, supplier_id: SUP_FRUTAS, supplier_name: "Frutas García S.L.", product_name: "Patata Agria", price: 0.85, unit: "kg", is_preferred: false },
  // Pesquería del Norte S.A.
  { id: "of-013", product_id: PROD_SALMON, supplier_id: SUP_PESQUERIA, supplier_name: "Pesquería del Norte S.A.", product_name: "Salmón noruego (filete)", price: 18.50, unit: "kg", is_preferred: true },
  { id: "of-014", product_id: PROD_MERLUZA, supplier_id: SUP_PESQUERIA, supplier_name: "Pesquería del Norte S.A.", product_name: "Merluza del Cantábrico", price: 14.00, unit: "kg", is_preferred: true },
  // Lácteos Asturias S.Coop.
  { id: "of-015", product_id: PROD_LECHE, supplier_id: SUP_LACTEOS, supplier_name: "Lácteos Asturias S.Coop.", product_name: "Leche entera fresca", price: 0.92, unit: "L", is_preferred: true },
  { id: "of-016", product_id: PROD_QUESO, supplier_id: SUP_LACTEOS, supplier_name: "Lácteos Asturias S.Coop.", product_name: "Queso crema Philadelphia", price: 5.80, unit: "kg", is_preferred: true },
  { id: "of-017", product_id: PROD_MANTEQUILLA, supplier_id: SUP_LACTEOS, supplier_name: "Lácteos Asturias S.Coop.", product_name: "Mantequilla sin sal (82%)", price: 9.40, unit: "kg", is_preferred: true },
  // Vino (Makro)
  { id: "of-018", product_id: PROD_VINO, supplier_id: SUP_MAKRO, supplier_name: "Makro España", product_name: "Vino tinto Rioja crianza", price: 6.50, unit: "L", is_preferred: true },
];

export function getPreferredPrice(productId: string): number | null {
  const offer = MOCK_SUPPLIER_OFFERS.find(
    (o) => o.product_id === productId && o.is_preferred
  );
  return offer?.price ?? null;
}

// =============================================================================
// VOLUME DISCOUNTS (for calculation engines)
// =============================================================================
// Map from supplier offer id -> volume discount tiers
export const MOCK_VOLUME_DISCOUNTS: Record<string, { min_qty: number; unit_price: number }[]> = {
  // Makro Aceite: 5% off on 10+ L
  "of-001": [
    { min_qty: 10, unit_price: 8.08 },  // ~5% off 8.50
    { min_qty: 25, unit_price: 7.65 },  // ~10% off 8.50
  ],
  // Makro Arroz: 5% off on 10+ kg
  "of-003": [
    { min_qty: 10, unit_price: 3.04 },  // ~5% off 3.20
    { min_qty: 50, unit_price: 2.88 },  // ~10% off 3.20
  ],
  // Sysco Ternera: bulk discount
  "of-005": [
    { min_qty: 5, unit_price: 30.40 },  // ~5% off 32.00
    { min_qty: 20, unit_price: 28.80 }, // ~10% off 32.00
  ],
  // Sysco Pollo: bulk discount
  "of-006": [
    { min_qty: 10, unit_price: 6.46 },  // ~5% off 6.80
  ],
  // Frutas Garcia Tomate: seasonal bulk
  "of-009": [
    { min_qty: 20, unit_price: 1.89 },  // ~10% off 2.10
  ],
  // Pesqueria Salmon: bulk
  "of-013": [
    { min_qty: 5, unit_price: 17.58 },  // ~5% off 18.50
  ],
  // Lacteos Leche: bulk
  "of-015": [
    { min_qty: 20, unit_price: 0.83 },  // ~10% off 0.92
  ],
};

// =============================================================================
// RECIPE INGREDIENTS (for calculation engines — links recipes to products)
// =============================================================================

// Recipe IDs (from MOCK_RECIPES)
const REC_GAZPACHO   = "50000000-0000-0000-0000-000000000001"; // Gazpacho andaluz (10 servings)
const REC_SOLOMILLO  = "50000000-0000-0000-0000-000000000003"; // Solomillo al Oporto (8 servings)
const REC_TARTA      = "50000000-0000-0000-0000-000000000006"; // Tarta de queso La Vina (10 servings)

/** Recipe ingredients for the calculation engines */
export const MOCK_RECIPE_INGREDIENTS = {
  // ─── Gazpacho andaluz (10 raciones) ─────────────────────────
  [REC_GAZPACHO]: [
    {
      id: "ri-gaz-001",
      product_id: PROD_TOMATE,
      product_name: "Tomate pera",
      sub_recipe_id: null,
      quantity: 2.0,          // 2 kg tomate
      unit: { id: UNIT_KG, name: "Kilogramo", abbreviation: "kg" },
      unit_id: UNIT_KG,
      waste_percent: 0.10,    // 10% piel y semillas
      catalog_entry_id: null,
      notes: "Bien maduros, de temporada",
    },
    {
      id: "ri-gaz-002",
      product_id: PROD_CEBOLLA,
      product_name: "Cebolla blanca",
      sub_recipe_id: null,
      quantity: 0.3,          // 300g cebolla
      unit: { id: UNIT_KG, name: "Kilogramo", abbreviation: "kg" },
      unit_id: UNIT_KG,
      waste_percent: 0.12,    // 12% piel
      catalog_entry_id: null,
      notes: null,
    },
    {
      id: "ri-gaz-003",
      product_id: PROD_ACEITE,
      product_name: "Aceite de oliva virgen extra",
      sub_recipe_id: null,
      quantity: 0.15,         // 150ml aceite
      unit: { id: UNIT_L, name: "Litro", abbreviation: "L" },
      unit_id: UNIT_L,
      waste_percent: 0,
      catalog_entry_id: null,
      notes: "AOVE Baena",
    },
    {
      id: "ri-gaz-004",
      product_id: PROD_VINO,
      product_name: "Vino tinto (vinagre de Jerez)",
      sub_recipe_id: null,
      quantity: 0.05,         // 50ml vinagre
      unit: { id: UNIT_L, name: "Litro", abbreviation: "L" },
      unit_id: UNIT_L,
      waste_percent: 0,
      catalog_entry_id: null,
      notes: "Sustituir por vinagre de Jerez si disponible",
    },
  ],

  // ─── Solomillo de ternera al Oporto (8 raciones) ──────────
  [REC_SOLOMILLO]: [
    {
      id: "ri-sol-001",
      product_id: PROD_TERNERA,
      product_name: "Solomillo de ternera",
      sub_recipe_id: null,
      quantity: 2.0,          // 2 kg solomillo (250g/ración)
      unit: { id: UNIT_KG, name: "Kilogramo", abbreviation: "kg" },
      unit_id: UNIT_KG,
      waste_percent: 0.15,    // 15% limpieza nervios/grasa
      catalog_entry_id: null,
      notes: "Limpiar bien de nervios y grasa",
    },
    {
      id: "ri-sol-002",
      product_id: PROD_PATATA,
      product_name: "Patata Agria",
      sub_recipe_id: null,
      quantity: 1.5,          // 1.5 kg patata para pure
      unit: { id: UNIT_KG, name: "Kilogramo", abbreviation: "kg" },
      unit_id: UNIT_KG,
      waste_percent: 0.20,    // 20% piel
      catalog_entry_id: null,
      notes: "Para pure trufado",
    },
    {
      id: "ri-sol-003",
      product_id: PROD_MANTEQUILLA,
      product_name: "Mantequilla sin sal",
      sub_recipe_id: null,
      quantity: 0.2,          // 200g mantequilla
      unit: { id: UNIT_KG, name: "Kilogramo", abbreviation: "kg" },
      unit_id: UNIT_KG,
      waste_percent: 0,
      catalog_entry_id: null,
      notes: "Para pure y salsa",
    },
    {
      id: "ri-sol-004",
      product_id: PROD_VINO,
      product_name: "Vino tinto (Oporto)",
      sub_recipe_id: null,
      quantity: 0.3,          // 300ml Oporto
      unit: { id: UNIT_L, name: "Litro", abbreviation: "L" },
      unit_id: UNIT_L,
      waste_percent: 0,
      catalog_entry_id: null,
      notes: "Oporto ruby para la reduccion",
    },
    {
      id: "ri-sol-005",
      product_id: PROD_LECHE,
      product_name: "Leche entera fresca",
      sub_recipe_id: null,
      quantity: 0.3,          // 300ml leche para pure
      unit: { id: UNIT_L, name: "Litro", abbreviation: "L" },
      unit_id: UNIT_L,
      waste_percent: 0,
      catalog_entry_id: null,
      notes: "Calentar para pure",
    },
  ],

  // ─── Tarta de queso La Vina (10 raciones) ─────────────────
  [REC_TARTA]: [
    {
      id: "ri-tar-001",
      product_id: PROD_QUESO,
      product_name: "Queso crema Philadelphia",
      sub_recipe_id: null,
      quantity: 1.0,          // 1 kg queso crema
      unit: { id: UNIT_KG, name: "Kilogramo", abbreviation: "kg" },
      unit_id: UNIT_KG,
      waste_percent: 0.02,    // 2% merma en envase
      catalog_entry_id: null,
      notes: "Atemperar 2h antes",
    },
    {
      id: "ri-tar-002",
      product_id: PROD_LECHE,
      product_name: "Leche entera fresca",
      sub_recipe_id: null,
      quantity: 0.2,          // 200ml leche
      unit: { id: UNIT_L, name: "Litro", abbreviation: "L" },
      unit_id: UNIT_L,
      waste_percent: 0,
      catalog_entry_id: null,
      notes: null,
    },
    {
      id: "ri-tar-003",
      product_id: PROD_HARINA,
      product_name: "Harina de trigo T-55",
      sub_recipe_id: null,
      quantity: 0.04,         // 40g harina
      unit: { id: UNIT_KG, name: "Kilogramo", abbreviation: "kg" },
      unit_id: UNIT_KG,
      waste_percent: 0,
      catalog_entry_id: null,
      notes: "Tamizar antes de incorporar",
    },
    {
      id: "ri-tar-004",
      product_id: PROD_MANTEQUILLA,
      product_name: "Mantequilla sin sal",
      sub_recipe_id: null,
      quantity: 0.05,         // 50g mantequilla (para engrasar)
      unit: { id: UNIT_KG, name: "Kilogramo", abbreviation: "kg" },
      unit_id: UNIT_KG,
      waste_percent: 0,
      catalog_entry_id: null,
      notes: "Para engrasar el molde",
    },
  ],
} as const;
