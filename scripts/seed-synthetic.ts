/**
 * RestoOS — Synthetic Seed Script
 * Inserts realistic Galician restaurant data into Supabase for Culuca Cocina-Bar.
 *
 * Usage:
 *   npx tsx scripts/seed-synthetic.ts
 *   npx tsx scripts/seed-synthetic.ts --rollback
 *   npx tsx scripts/seed-synthetic.ts --export
 *
 * All IDs use prefix 5eed0000-XXXX-0000-0000-NNNNNNNNNNNN to avoid conflicts.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// ── Load env ────────────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Constants ───────────────────────────────────────────────────────────────
const HOTEL_ID = 'bb000000-0000-0000-0000-000000000001';
const TENANT_ID = 'aa000000-0000-0000-0000-000000000001';

// Existing units from culuca_demo.sql
const U_KG = '40000000-aaaa-0000-0000-000000000001';
const U_G = '40000000-aaaa-0000-0000-000000000002';
const U_L = '40000000-aaaa-0000-0000-000000000003';
const U_ML = '40000000-aaaa-0000-0000-000000000004';
const U_UD = '40000000-aaaa-0000-0000-000000000005';

// Existing categories from culuca_demo.sql
const CAT_CARNES = '10000000-cccc-0000-0000-000000000001';
const CAT_PESCADOS = '10000000-cccc-0000-0000-000000000002';
const CAT_VERDURAS = '10000000-cccc-0000-0000-000000000003';
const CAT_LACTEOS = '10000000-cccc-0000-0000-000000000004';
const CAT_BEBIDAS = '10000000-cccc-0000-0000-000000000005';
const CAT_ESPECIAS = '10000000-cccc-0000-0000-000000000006';
const CAT_ACEITES = '10000000-cccc-0000-0000-000000000007';
const CAT_CONGELADOS = '10000000-cccc-0000-0000-000000000008';

// ── UUID helpers ────────────────────────────────────────────────────────────
function supplierId(n: number): string {
  return `5eed0000-0001-0000-0000-${String(n).padStart(12, '0')}`;
}
function productId(n: number): string {
  return `5eed0000-0002-0000-0000-${String(n).padStart(12, '0')}`;
}
function offerId(n: number): string {
  return `5eed0000-0003-0000-0000-${String(n).padStart(12, '0')}`;
}
function aliasId(n: number): string {
  return `5eed0000-0004-0000-0000-${String(n).padStart(12, '0')}`;
}
function recipeId(n: number): string {
  return `5eed0000-0005-0000-0000-${String(n).padStart(12, '0')}`;
}
function ingredientId(n: number): string {
  return `5eed0000-0006-0000-0000-${String(n).padStart(12, '0')}`;
}
function poId(n: number): string {
  return `5eed0000-0007-0000-0000-${String(n).padStart(12, '0')}`;
}
function poLineId(n: number): string {
  return `5eed0000-0008-0000-0000-${String(n).padStart(12, '0')}`;
}
function receiptId(n: number): string {
  return `5eed0000-0009-0000-0000-${String(n).padStart(12, '0')}`;
}
function receiptLineId(n: number): string {
  return `5eed0000-000A-0000-0000-${String(n).padStart(12, '0')}`;
}
function templateId(n: number): string {
  return `5eed0000-000B-0000-0000-${String(n).padStart(12, '0')}`;
}
function checkRecordId(n: number): string {
  return `5eed0000-000C-0000-0000-${String(n).padStart(12, '0')}`;
}
function salesId(n: number): string {
  return `5eed0000-000D-0000-0000-${String(n).padStart(12, '0')}`;
}
function staffId(n: number): string {
  return `5eed0000-000E-0000-0000-${String(n).padStart(12, '0')}`;
}
function shiftId(n: number): string {
  return `5eed0000-000F-0000-0000-${String(n).padStart(12, '0')}`;
}
function reservationId(n: number): string {
  return `5eed0000-0010-0000-0000-${String(n).padStart(12, '0')}`;
}

// ── Date helpers ────────────────────────────────────────────────────────────
const TODAY = new Date('2026-04-03');

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rng = seededRandom(42);

function rngBetween(min: number, max: number): number {
  return Math.round((min + rng() * (max - min)) * 100) / 100;
}

function rngInt(min: number, max: number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. SUPPLIERS (15)
// ══════════════════════════════════════════════════════════════════════════════
const suppliers = [
  {
    id: supplierId(1),
    hotel_id: HOTEL_ID,
    name: 'Pescanova',
    contact_name: 'Javier Fernández',
    email: 'pedidos@pescanova.es',
    phone: '986 818 100',
    address: 'Av. de Balaídos 56, 36210 Vigo, Pontevedra',
    tax_id: 'A36003060',
    is_active: true,
    notes: 'Pescado fresco y congelado. Entrega martes y viernes.',
  },
  {
    id: supplierId(2),
    hotel_id: HOTEL_ID,
    name: 'Frigoríficos del Morrazo',
    contact_name: 'Manuel Costas',
    email: 'ventas@frigorificosmorrazo.es',
    phone: '986 321 450',
    address: 'Pol. Ind. A Tomada 12, 36940 Cangas, Pontevedra',
    tax_id: 'B36127654',
    is_active: true,
    notes: 'Pescado fresco rías gallegas. Entrega diaria.',
  },
  {
    id: supplierId(3),
    hotel_id: HOTEL_ID,
    name: 'Lonjas de Galicia',
    contact_name: 'Carmen Oubiña',
    email: 'carmen@lonjasdegalicia.com',
    phone: '986 555 210',
    address: 'Puerto Pesquero s/n, 36202 Vigo, Pontevedra',
    tax_id: 'B36298745',
    is_active: true,
    notes: 'Marisco gallego premium. Percebe, navaja, berberecho.',
  },
  {
    id: supplierId(4),
    hotel_id: HOTEL_ID,
    name: 'Coren',
    contact_name: 'Pablo Dosil',
    email: 'hosteleria@coren.es',
    phone: '988 391 500',
    address: 'Ctra. de Santa Cruz s/n, 32960 Ourense',
    tax_id: 'F32012345',
    is_active: true,
    notes: 'Carne de aves y cerdo gallego. Ternera gallega IGP.',
  },
  {
    id: supplierId(5),
    hotel_id: HOTEL_ID,
    name: 'Frigoríficos de Bandeira',
    contact_name: 'Ramón Piñeiro',
    email: 'pedidos@bandeira-carnes.es',
    phone: '986 585 200',
    address: 'Pol. Ind. Bandeira, 36570 Silleda, Pontevedra',
    tax_id: 'B36045678',
    is_active: true,
    notes: 'Ternera gallega, vacuno mayor. Cortes a medida.',
  },
  {
    id: supplierId(6),
    hotel_id: HOTEL_ID,
    name: 'Embutidos Lalinense',
    contact_name: 'Xosé Rodríguez',
    email: 'info@lalinense.es',
    phone: '986 780 123',
    address: 'Avda. de Buenos Aires 15, 36500 Lalín, Pontevedra',
    tax_id: 'B36098765',
    is_active: true,
    notes: 'Chorizo, lacón, androlla gallega. Curado tradicional.',
  },
  {
    id: supplierId(7),
    hotel_id: HOTEL_ID,
    name: 'Horta do Obradoiro',
    contact_name: 'Marta Iglesias',
    email: 'marta@hortaobradoiro.gal',
    phone: '981 572 340',
    address: 'Rúa do Franco 22, 15705 Santiago de Compostela',
    tax_id: 'B15234567',
    is_active: true,
    notes: 'Verdura ecológica gallega. Grelos, nabiza, berzas.',
  },
  {
    id: supplierId(8),
    hotel_id: HOTEL_ID,
    name: 'Frutas Nieves',
    contact_name: 'Antonio Nieves',
    email: 'pedidos@frutasnieves.com',
    phone: '981 135 680',
    address: 'Mercado de Abastos, Puesto 14, 15001 A Coruña',
    tax_id: 'B15345678',
    is_active: true,
    notes: 'Fruta de temporada y verdura. Padrón, pimiento Couto.',
  },
  {
    id: supplierId(9),
    hotel_id: HOTEL_ID,
    name: 'Leche Celta',
    contact_name: 'Rosa Vázquez',
    email: 'comercial@lechecelta.es',
    phone: '982 400 200',
    address: 'Pol. Ind. A Granxa, 27003 Lugo',
    tax_id: 'A27012345',
    is_active: true,
    notes: 'Leche, nata, mantequilla gallega.',
  },
  {
    id: supplierId(10),
    hotel_id: HOTEL_ID,
    name: 'Queixería Bama',
    contact_name: 'Lucía Bama',
    email: 'lucia@queixeriabama.gal',
    phone: '981 690 412',
    address: 'Melide, 15800 A Coruña',
    tax_id: 'B15456789',
    is_active: true,
    notes: 'Queso tetilla DOP, San Simón da Costa DOP, Arzúa-Ulloa.',
  },
  {
    id: supplierId(11),
    hotel_id: HOTEL_ID,
    name: 'Hijos de Rivera',
    contact_name: 'Ignacio Rivera',
    email: 'hosteleria@estrellagalicia.es',
    phone: '981 901 000',
    address: 'C/ José María Rivera Corral 6, 15008 A Coruña',
    tax_id: 'A15007456',
    is_active: true,
    notes: 'Estrella Galicia, 1906 Reserva Especial, Agua Cabreiroá.',
  },
  {
    id: supplierId(12),
    hotel_id: HOTEL_ID,
    name: 'Bodegas Martín Códax',
    contact_name: 'Alberto Varela',
    email: 'alberto@martincodax.com',
    phone: '986 526 040',
    address: 'Burgáns 91, 36633 Vilariño, Cambados, Pontevedra',
    tax_id: 'A36056789',
    is_active: true,
    notes: 'Albariño DO Rías Baixas, Mencía DO Monterrei.',
  },
  {
    id: supplierId(13),
    hotel_id: HOTEL_ID,
    name: 'Panadería O Curruncho',
    contact_name: 'Fernando Lema',
    email: 'info@ocurruncho.es',
    phone: '981 220 345',
    address: 'Rúa Real 44, 15003 A Coruña',
    tax_id: 'B15567890',
    is_active: true,
    notes: 'Pan artesano gallego, broa de maíz, empanada masa.',
  },
  {
    id: supplierId(14),
    hotel_id: HOTEL_ID,
    name: 'Congelados Samar',
    contact_name: 'David Sánchez',
    email: 'david@congeladossamar.es',
    phone: '981 636 500',
    address: 'Pol. Ind. Sabón, 15142 Arteixo, A Coruña',
    tax_id: 'B15678901',
    is_active: true,
    notes: 'Congelados marinos: croquetas, empanada, calamar.',
  },
  {
    id: supplierId(15),
    hotel_id: HOTEL_ID,
    name: 'La Despensa Gourmet',
    contact_name: 'Elena Pombo',
    email: 'elena@ladespensagourmet.es',
    phone: '981 243 678',
    address: 'Rúa Nova de Abaixo 8, 15001 A Coruña',
    tax_id: 'B15789012',
    is_active: true,
    notes: 'Productos gourmet: aceites, especias, conservas premium.',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// 2. PRODUCTS (80) — Galician cuisine ingredients
// ══════════════════════════════════════════════════════════════════════════════
const products = [
  // --- Pescados y Mariscos (cat 002) ---
  { id: productId(1), hotel_id: HOTEL_ID, name: 'Pulpo fresco gallego', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["moluscos"]', notes: 'Pulpo de roca, rías gallegas' },
  { id: productId(2), hotel_id: HOTEL_ID, name: 'Merluza de pincho', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["pescado"]', notes: 'Merluza de pincho costa gallega' },
  { id: productId(3), hotel_id: HOTEL_ID, name: 'Rape', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["pescado"]', notes: 'Rape fresco entero' },
  { id: productId(4), hotel_id: HOTEL_ID, name: 'Rodaballo salvaje', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["pescado"]', notes: 'Rodaballo salvaje 1.5-2 kg' },
  { id: productId(5), hotel_id: HOTEL_ID, name: 'Berberechos', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["moluscos"]', notes: 'Berberecho de Carril' },
  { id: productId(6), hotel_id: HOTEL_ID, name: 'Mejillones', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["moluscos"]', notes: 'Mejillón de batea rías gallegas' },
  { id: productId(7), hotel_id: HOTEL_ID, name: 'Navajas', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["moluscos"]', notes: 'Navaja gallega fina' },
  { id: productId(8), hotel_id: HOTEL_ID, name: 'Percebe', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["crustaceos"]', notes: 'Percebe Costa da Morte' },
  { id: productId(9), hotel_id: HOTEL_ID, name: 'Vieira', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["moluscos"]', notes: 'Vieira gallega con concha' },
  { id: productId(10), hotel_id: HOTEL_ID, name: 'Lubina salvaje', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["pescado"]', notes: 'Lubina salvaje 0.8-1.2 kg' },
  { id: productId(11), hotel_id: HOTEL_ID, name: 'Sardina fresca', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["pescado"]', notes: 'Sardina temporada verano' },
  { id: productId(12), hotel_id: HOTEL_ID, name: 'Jurel', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["pescado"]', notes: 'Jurel fresco lonja' },
  { id: productId(13), hotel_id: HOTEL_ID, name: 'Bogavante', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["crustaceos"]', notes: 'Bogavante europeo vivo' },
  { id: productId(14), hotel_id: HOTEL_ID, name: 'Cigalas', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["crustaceos"]', notes: 'Cigala gallega mediana' },
  { id: productId(15), hotel_id: HOTEL_ID, name: 'Zamburiñas', category_id: CAT_PESCADOS, default_unit_id: U_KG, is_active: true, allergens: '["moluscos"]', notes: 'Zamburiña de ría' },

  // --- Carnes (cat 001) ---
  { id: productId(16), hotel_id: HOTEL_ID, name: 'Ternera gallega IGP (solomillo)', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Solomillo ternera gallega IGP' },
  { id: productId(17), hotel_id: HOTEL_ID, name: 'Ternera gallega IGP (entrecot)', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Entrecot ternera gallega IGP' },
  { id: productId(18), hotel_id: HOTEL_ID, name: 'Lacón curado', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Lacón gallego DO curado' },
  { id: productId(19), hotel_id: HOTEL_ID, name: 'Cerdo gallego (lomo)', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Lomo cerdo celta gallego' },
  { id: productId(20), hotel_id: HOTEL_ID, name: 'Pollo de corral', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Pollo de corral gallego' },
  { id: productId(21), hotel_id: HOTEL_ID, name: 'Chorizo gallego curado', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Chorizo extra curado Lalín' },
  { id: productId(22), hotel_id: HOTEL_ID, name: 'Costilla cerdo', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Costilla cerdo gallego' },
  { id: productId(23), hotel_id: HOTEL_ID, name: 'Zorza (carne adobada)', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Cerdo gallego adobado con pimentón' },
  { id: productId(24), hotel_id: HOTEL_ID, name: 'Panceta fresca', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Panceta de cerdo gallego' },
  { id: productId(25), hotel_id: HOTEL_ID, name: 'Unto (grasa de cerdo)', category_id: CAT_CARNES, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Para caldo gallego tradicional' },

  // --- Verduras y Hortalizas (cat 003) ---
  { id: productId(26), hotel_id: HOTEL_ID, name: 'Pimientos de Padrón', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'DO Pimiento de Herbón' },
  { id: productId(27), hotel_id: HOTEL_ID, name: 'Grelos', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Grelos de temporada gallegos' },
  { id: productId(28), hotel_id: HOTEL_ID, name: 'Nabiza', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Nabiza tierna gallega' },
  { id: productId(29), hotel_id: HOTEL_ID, name: 'Patata kennebec', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Para cachelos y fritura' },
  { id: productId(30), hotel_id: HOTEL_ID, name: 'Cebolla gallega', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(31), hotel_id: HOTEL_ID, name: 'Tomate raf', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(32), hotel_id: HOTEL_ID, name: 'Ajo morado', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Ajo gallego' },
  { id: productId(33), hotel_id: HOTEL_ID, name: 'Perejil fresco', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(34), hotel_id: HOTEL_ID, name: 'Laurel seco', category_id: CAT_ESPECIAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Hoja de laurel gallego' },
  { id: productId(35), hotel_id: HOTEL_ID, name: 'Berza gallega', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Para caldo gallego' },
  { id: productId(36), hotel_id: HOTEL_ID, name: 'Repollo', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(37), hotel_id: HOTEL_ID, name: 'Pimiento rojo', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(38), hotel_id: HOTEL_ID, name: 'Limón', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(39), hotel_id: HOTEL_ID, name: 'Alubias blancas', category_id: CAT_VERDURAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Alubia gallega tipo faba' },

  // --- Lácteos y Huevos (cat 004) ---
  { id: productId(40), hotel_id: HOTEL_ID, name: 'Queso tetilla DOP', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '["lactosa"]', notes: 'Queso Tetilla DOP' },
  { id: productId(41), hotel_id: HOTEL_ID, name: 'Queso San Simón da Costa DOP', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '["lactosa"]', notes: 'Queso ahumado DOP' },
  { id: productId(42), hotel_id: HOTEL_ID, name: 'Leche entera gallega', category_id: CAT_LACTEOS, default_unit_id: U_L, is_active: true, allergens: '["lactosa"]', notes: 'Leche Celta entera' },
  { id: productId(43), hotel_id: HOTEL_ID, name: 'Nata 35% MG', category_id: CAT_LACTEOS, default_unit_id: U_L, is_active: true, allergens: '["lactosa"]', notes: null },
  { id: productId(44), hotel_id: HOTEL_ID, name: 'Mantequilla gallega', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '["lactosa"]', notes: 'Mantequilla sin sal' },
  { id: productId(45), hotel_id: HOTEL_ID, name: 'Huevos camperos', category_id: CAT_LACTEOS, default_unit_id: U_UD, is_active: true, allergens: '["huevo"]', notes: 'Categoría 0, gallegos' },
  { id: productId(46), hotel_id: HOTEL_ID, name: 'Queso Arzúa-Ulloa DOP', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '["lactosa"]', notes: 'Queso cremoso DOP' },

  // --- Especias y Condimentos (cat 006) ---
  { id: productId(47), hotel_id: HOTEL_ID, name: 'Pimentón dulce de la Vera', category_id: CAT_ESPECIAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'DO Pimentón de La Vera' },
  { id: productId(48), hotel_id: HOTEL_ID, name: 'Pimentón picante', category_id: CAT_ESPECIAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(49), hotel_id: HOTEL_ID, name: 'Sal gruesa', category_id: CAT_ESPECIAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Sal marina gallega' },
  { id: productId(50), hotel_id: HOTEL_ID, name: 'Sal fina', category_id: CAT_ESPECIAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(51), hotel_id: HOTEL_ID, name: 'Pimienta negra molida', category_id: CAT_ESPECIAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(52), hotel_id: HOTEL_ID, name: 'Comino', category_id: CAT_ESPECIAS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(53), hotel_id: HOTEL_ID, name: 'Azafrán', category_id: CAT_ESPECIAS, default_unit_id: U_G, is_active: true, allergens: '[]', notes: 'Azafrán manchego' },

  // --- Aceites y Vinagres (cat 007) ---
  { id: productId(54), hotel_id: HOTEL_ID, name: 'Aceite de oliva virgen extra', category_id: CAT_ACEITES, default_unit_id: U_L, is_active: true, allergens: '[]', notes: 'AOVE primera prensada' },
  { id: productId(55), hotel_id: HOTEL_ID, name: 'Aceite de girasol', category_id: CAT_ACEITES, default_unit_id: U_L, is_active: true, allergens: '[]', notes: 'Para fritura' },
  { id: productId(56), hotel_id: HOTEL_ID, name: 'Vinagre de vino blanco', category_id: CAT_ACEITES, default_unit_id: U_L, is_active: true, allergens: '["sulfitos"]', notes: null },
  { id: productId(57), hotel_id: HOTEL_ID, name: 'Vinagre de Jerez', category_id: CAT_ACEITES, default_unit_id: U_L, is_active: true, allergens: '["sulfitos"]', notes: null },

  // --- Cereales y Legumbres ---
  { id: productId(58), hotel_id: HOTEL_ID, name: 'Arroz bomba', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'DO Calasparra' },
  { id: productId(59), hotel_id: HOTEL_ID, name: 'Harina de trigo', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '["gluten"]', notes: 'Harina panadera fuerza' },
  { id: productId(60), hotel_id: HOTEL_ID, name: 'Pan de maíz (broa)', category_id: CAT_LACTEOS, default_unit_id: U_UD, is_active: true, allergens: '["gluten"]', notes: 'Broa gallega artesanal' },
  { id: productId(61), hotel_id: HOTEL_ID, name: 'Masa de empanada', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '["gluten"]', notes: 'Masa empanada gallega artesanal' },
  { id: productId(62), hotel_id: HOTEL_ID, name: 'Almendra molida', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '["frutos_secos"]', notes: 'Para Tarta de Santiago' },
  { id: productId(63), hotel_id: HOTEL_ID, name: 'Azúcar blanco', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },
  { id: productId(64), hotel_id: HOTEL_ID, name: 'Azúcar glas', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: 'Para Tarta de Santiago' },
  { id: productId(65), hotel_id: HOTEL_ID, name: 'Canela en rama', category_id: CAT_ESPECIAS, default_unit_id: U_UD, is_active: true, allergens: '[]', notes: null },
  { id: productId(66), hotel_id: HOTEL_ID, name: 'Corteza de limón', category_id: CAT_ESPECIAS, default_unit_id: U_UD, is_active: true, allergens: '[]', notes: 'Para filloas y arroz con leche' },

  // --- Bebidas (cat 005) ---
  { id: productId(67), hotel_id: HOTEL_ID, name: 'Estrella Galicia (barril 30L)', category_id: CAT_BEBIDAS, default_unit_id: U_UD, is_active: true, allergens: '["gluten"]', notes: 'Barril 30L hostelería' },
  { id: productId(68), hotel_id: HOTEL_ID, name: 'Estrella Galicia 1906 (botella)', category_id: CAT_BEBIDAS, default_unit_id: U_UD, is_active: true, allergens: '["gluten"]', notes: 'Botella 33cl' },
  { id: productId(69), hotel_id: HOTEL_ID, name: 'Albariño Martín Códax', category_id: CAT_BEBIDAS, default_unit_id: U_UD, is_active: true, allergens: '["sulfitos"]', notes: 'DO Rías Baixas 75cl' },
  { id: productId(70), hotel_id: HOTEL_ID, name: 'Mencía Martín Códax', category_id: CAT_BEBIDAS, default_unit_id: U_UD, is_active: true, allergens: '["sulfitos"]', notes: 'DO Monterrei 75cl' },
  { id: productId(71), hotel_id: HOTEL_ID, name: 'Godello Valdeorras', category_id: CAT_BEBIDAS, default_unit_id: U_UD, is_active: true, allergens: '["sulfitos"]', notes: 'DO Valdeorras 75cl' },
  { id: productId(72), hotel_id: HOTEL_ID, name: 'Tinto Ribeira Sacra', category_id: CAT_BEBIDAS, default_unit_id: U_UD, is_active: true, allergens: '["sulfitos"]', notes: 'DO Ribeira Sacra 75cl' },
  { id: productId(73), hotel_id: HOTEL_ID, name: 'Licor café', category_id: CAT_BEBIDAS, default_unit_id: U_UD, is_active: true, allergens: '[]', notes: 'Licor café gallego artesanal 70cl' },
  { id: productId(74), hotel_id: HOTEL_ID, name: 'Orujo blanco', category_id: CAT_BEBIDAS, default_unit_id: U_UD, is_active: true, allergens: '[]', notes: 'Orujo gallego 70cl' },
  { id: productId(75), hotel_id: HOTEL_ID, name: 'Agua Cabreiroá (cristal)', category_id: CAT_BEBIDAS, default_unit_id: U_UD, is_active: true, allergens: '[]', notes: 'Botella cristal 50cl' },

  // --- Congelados (cat 008) ---
  { id: productId(76), hotel_id: HOTEL_ID, name: 'Empanada congelada atún', category_id: CAT_CONGELADOS, default_unit_id: U_KG, is_active: true, allergens: '["gluten","pescado"]', notes: null },
  { id: productId(77), hotel_id: HOTEL_ID, name: 'Calamar congelado limpio', category_id: CAT_CONGELADOS, default_unit_id: U_KG, is_active: true, allergens: '["moluscos"]', notes: null },
  { id: productId(78), hotel_id: HOTEL_ID, name: 'Guisantes congelados', category_id: CAT_CONGELADOS, default_unit_id: U_KG, is_active: true, allergens: '[]', notes: null },

  // --- Extra ingredients for recipes ---
  { id: productId(79), hotel_id: HOTEL_ID, name: 'Vino blanco Albariño (cocina)', category_id: CAT_BEBIDAS, default_unit_id: U_L, is_active: true, allergens: '["sulfitos"]', notes: 'Para cocinar' },
  { id: productId(80), hotel_id: HOTEL_ID, name: 'Queso rallado gratinar', category_id: CAT_LACTEOS, default_unit_id: U_KG, is_active: true, allergens: '["lactosa"]', notes: 'Mezcla gratinar' },
];

// ══════════════════════════════════════════════════════════════════════════════
// 3. SUPPLIER OFFERS (120+)
// ══════════════════════════════════════════════════════════════════════════════
// Map product -> suppliers with prices
interface OfferDef {
  product_idx: number;
  supplier_idx: number;
  price: number;
  unit_id: string;
  min_order_qty: number;
  lead_time_days: number;
  is_preferred: boolean;
}

const offerDefs: OfferDef[] = [
  // Pulpo fresco - Pescanova + Frigorificos Morrazo
  { product_idx: 1, supplier_idx: 1, price: 22.00, unit_id: U_KG, min_order_qty: 5, lead_time_days: 1, is_preferred: false },
  { product_idx: 1, supplier_idx: 2, price: 19.50, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  // Merluza de pincho
  { product_idx: 2, supplier_idx: 1, price: 15.80, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: false },
  { product_idx: 2, supplier_idx: 2, price: 13.50, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },
  // Rape
  { product_idx: 3, supplier_idx: 1, price: 18.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: false },
  { product_idx: 3, supplier_idx: 2, price: 16.50, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },
  // Rodaballo
  { product_idx: 4, supplier_idx: 2, price: 28.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },
  // Berberechos
  { product_idx: 5, supplier_idx: 3, price: 12.50, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },
  { product_idx: 5, supplier_idx: 2, price: 14.00, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: false },
  // Mejillones
  { product_idx: 6, supplier_idx: 3, price: 3.20, unit_id: U_KG, min_order_qty: 5, lead_time_days: 1, is_preferred: true },
  { product_idx: 6, supplier_idx: 2, price: 3.80, unit_id: U_KG, min_order_qty: 5, lead_time_days: 1, is_preferred: false },
  // Navajas
  { product_idx: 7, supplier_idx: 3, price: 32.00, unit_id: U_KG, min_order_qty: 1, lead_time_days: 1, is_preferred: true },
  // Percebe
  { product_idx: 8, supplier_idx: 3, price: 65.00, unit_id: U_KG, min_order_qty: 1, lead_time_days: 1, is_preferred: true },
  // Vieira
  { product_idx: 9, supplier_idx: 3, price: 18.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },
  { product_idx: 9, supplier_idx: 2, price: 20.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: false },
  // Lubina
  { product_idx: 10, supplier_idx: 2, price: 22.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },
  // Sardina
  { product_idx: 11, supplier_idx: 2, price: 4.50, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  // Jurel
  { product_idx: 12, supplier_idx: 2, price: 5.00, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  // Bogavante
  { product_idx: 13, supplier_idx: 3, price: 42.00, unit_id: U_KG, min_order_qty: 1, lead_time_days: 1, is_preferred: true },
  { product_idx: 13, supplier_idx: 1, price: 45.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: false },
  // Cigalas
  { product_idx: 14, supplier_idx: 3, price: 35.00, unit_id: U_KG, min_order_qty: 1, lead_time_days: 1, is_preferred: true },
  // Zamburiñas
  { product_idx: 15, supplier_idx: 3, price: 16.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },

  // --- Carnes ---
  // Ternera solomillo
  { product_idx: 16, supplier_idx: 5, price: 32.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: true },
  { product_idx: 16, supplier_idx: 4, price: 34.00, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: false },
  // Ternera entrecot
  { product_idx: 17, supplier_idx: 5, price: 18.00, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: true },
  { product_idx: 17, supplier_idx: 4, price: 19.50, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: false },
  // Lacón curado
  { product_idx: 18, supplier_idx: 6, price: 9.50, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: true },
  { product_idx: 18, supplier_idx: 4, price: 10.20, unit_id: U_KG, min_order_qty: 3, lead_time_days: 3, is_preferred: false },
  // Cerdo lomo
  { product_idx: 19, supplier_idx: 4, price: 8.50, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: true },
  { product_idx: 19, supplier_idx: 5, price: 9.00, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: false },
  // Pollo de corral
  { product_idx: 20, supplier_idx: 4, price: 7.80, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  // Chorizo curado
  { product_idx: 21, supplier_idx: 6, price: 12.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 3, is_preferred: true },
  // Costilla cerdo
  { product_idx: 22, supplier_idx: 4, price: 6.80, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: true },
  // Zorza
  { product_idx: 23, supplier_idx: 6, price: 9.80, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: true },
  { product_idx: 23, supplier_idx: 4, price: 10.50, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: false },
  // Panceta
  { product_idx: 24, supplier_idx: 4, price: 5.50, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: true },
  // Unto
  { product_idx: 25, supplier_idx: 6, price: 3.80, unit_id: U_KG, min_order_qty: 1, lead_time_days: 3, is_preferred: true },

  // --- Verduras ---
  // Pimientos Padrón
  { product_idx: 26, supplier_idx: 8, price: 5.20, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },
  { product_idx: 26, supplier_idx: 7, price: 5.80, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: false },
  // Grelos
  { product_idx: 27, supplier_idx: 7, price: 2.50, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  { product_idx: 27, supplier_idx: 8, price: 2.80, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: false },
  // Nabiza
  { product_idx: 28, supplier_idx: 7, price: 2.20, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  // Patata kennebec
  { product_idx: 29, supplier_idx: 8, price: 0.90, unit_id: U_KG, min_order_qty: 10, lead_time_days: 1, is_preferred: true },
  { product_idx: 29, supplier_idx: 7, price: 1.05, unit_id: U_KG, min_order_qty: 10, lead_time_days: 1, is_preferred: false },
  // Cebolla
  { product_idx: 30, supplier_idx: 8, price: 0.80, unit_id: U_KG, min_order_qty: 5, lead_time_days: 1, is_preferred: true },
  // Tomate raf
  { product_idx: 31, supplier_idx: 8, price: 3.50, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  // Ajo
  { product_idx: 32, supplier_idx: 8, price: 4.50, unit_id: U_KG, min_order_qty: 1, lead_time_days: 1, is_preferred: true },
  // Perejil
  { product_idx: 33, supplier_idx: 7, price: 6.00, unit_id: U_KG, min_order_qty: 0.5, lead_time_days: 1, is_preferred: true },
  // Laurel
  { product_idx: 34, supplier_idx: 15, price: 28.00, unit_id: U_KG, min_order_qty: 0.1, lead_time_days: 3, is_preferred: true },
  // Berza
  { product_idx: 35, supplier_idx: 7, price: 1.80, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  // Repollo
  { product_idx: 36, supplier_idx: 7, price: 1.20, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  // Pimiento rojo
  { product_idx: 37, supplier_idx: 8, price: 2.80, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },
  // Limón
  { product_idx: 38, supplier_idx: 8, price: 1.50, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: true },
  // Alubias
  { product_idx: 39, supplier_idx: 15, price: 4.20, unit_id: U_KG, min_order_qty: 5, lead_time_days: 3, is_preferred: true },

  // --- Lácteos ---
  // Queso tetilla
  { product_idx: 40, supplier_idx: 10, price: 12.50, unit_id: U_KG, min_order_qty: 1, lead_time_days: 2, is_preferred: true },
  // Queso San Simón
  { product_idx: 41, supplier_idx: 10, price: 14.00, unit_id: U_KG, min_order_qty: 1, lead_time_days: 2, is_preferred: true },
  // Leche
  { product_idx: 42, supplier_idx: 9, price: 0.85, unit_id: U_L, min_order_qty: 12, lead_time_days: 1, is_preferred: true },
  // Nata
  { product_idx: 43, supplier_idx: 9, price: 2.80, unit_id: U_L, min_order_qty: 6, lead_time_days: 1, is_preferred: true },
  // Mantequilla
  { product_idx: 44, supplier_idx: 9, price: 8.50, unit_id: U_KG, min_order_qty: 1, lead_time_days: 1, is_preferred: true },
  // Huevos
  { product_idx: 45, supplier_idx: 9, price: 0.30, unit_id: U_UD, min_order_qty: 30, lead_time_days: 1, is_preferred: true },
  // Queso Arzúa
  { product_idx: 46, supplier_idx: 10, price: 11.00, unit_id: U_KG, min_order_qty: 1, lead_time_days: 2, is_preferred: true },

  // --- Especias ---
  // Pimentón dulce
  { product_idx: 47, supplier_idx: 15, price: 18.00, unit_id: U_KG, min_order_qty: 0.5, lead_time_days: 3, is_preferred: true },
  // Pimentón picante
  { product_idx: 48, supplier_idx: 15, price: 20.00, unit_id: U_KG, min_order_qty: 0.5, lead_time_days: 3, is_preferred: true },
  // Sal gruesa
  { product_idx: 49, supplier_idx: 15, price: 0.60, unit_id: U_KG, min_order_qty: 5, lead_time_days: 3, is_preferred: true },
  // Sal fina
  { product_idx: 50, supplier_idx: 15, price: 0.50, unit_id: U_KG, min_order_qty: 5, lead_time_days: 3, is_preferred: true },
  // Pimienta negra
  { product_idx: 51, supplier_idx: 15, price: 22.00, unit_id: U_KG, min_order_qty: 0.25, lead_time_days: 3, is_preferred: true },
  // Comino
  { product_idx: 52, supplier_idx: 15, price: 15.00, unit_id: U_KG, min_order_qty: 0.25, lead_time_days: 3, is_preferred: true },
  // Azafrán
  { product_idx: 53, supplier_idx: 15, price: 6.00, unit_id: U_G, min_order_qty: 5, lead_time_days: 3, is_preferred: true },

  // --- Aceites ---
  // AOVE
  { product_idx: 54, supplier_idx: 15, price: 5.80, unit_id: U_L, min_order_qty: 5, lead_time_days: 3, is_preferred: true },
  // Girasol
  { product_idx: 55, supplier_idx: 15, price: 1.90, unit_id: U_L, min_order_qty: 10, lead_time_days: 3, is_preferred: true },
  // Vinagre blanco
  { product_idx: 56, supplier_idx: 15, price: 1.80, unit_id: U_L, min_order_qty: 5, lead_time_days: 3, is_preferred: true },
  // Vinagre Jerez
  { product_idx: 57, supplier_idx: 15, price: 4.50, unit_id: U_L, min_order_qty: 2, lead_time_days: 3, is_preferred: true },

  // --- Cereales ---
  // Arroz bomba
  { product_idx: 58, supplier_idx: 15, price: 3.80, unit_id: U_KG, min_order_qty: 5, lead_time_days: 3, is_preferred: true },
  // Harina
  { product_idx: 59, supplier_idx: 13, price: 1.20, unit_id: U_KG, min_order_qty: 5, lead_time_days: 1, is_preferred: true },
  // Pan maíz
  { product_idx: 60, supplier_idx: 13, price: 1.80, unit_id: U_UD, min_order_qty: 5, lead_time_days: 1, is_preferred: true },
  // Masa empanada
  { product_idx: 61, supplier_idx: 13, price: 4.50, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: true },
  // Almendra
  { product_idx: 62, supplier_idx: 15, price: 12.00, unit_id: U_KG, min_order_qty: 1, lead_time_days: 3, is_preferred: true },
  // Azúcar
  { product_idx: 63, supplier_idx: 15, price: 1.10, unit_id: U_KG, min_order_qty: 5, lead_time_days: 3, is_preferred: true },
  // Azúcar glas
  { product_idx: 64, supplier_idx: 15, price: 2.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 3, is_preferred: true },
  // Canela
  { product_idx: 65, supplier_idx: 15, price: 0.15, unit_id: U_UD, min_order_qty: 10, lead_time_days: 3, is_preferred: true },
  // Corteza limón
  { product_idx: 66, supplier_idx: 8, price: 0.10, unit_id: U_UD, min_order_qty: 10, lead_time_days: 1, is_preferred: true },

  // --- Bebidas ---
  // Estrella barril
  { product_idx: 67, supplier_idx: 11, price: 85.00, unit_id: U_UD, min_order_qty: 2, lead_time_days: 2, is_preferred: true },
  // 1906
  { product_idx: 68, supplier_idx: 11, price: 1.20, unit_id: U_UD, min_order_qty: 24, lead_time_days: 2, is_preferred: true },
  // Albariño
  { product_idx: 69, supplier_idx: 12, price: 5.80, unit_id: U_UD, min_order_qty: 6, lead_time_days: 3, is_preferred: true },
  // Mencía
  { product_idx: 70, supplier_idx: 12, price: 5.20, unit_id: U_UD, min_order_qty: 6, lead_time_days: 3, is_preferred: true },
  // Godello
  { product_idx: 71, supplier_idx: 12, price: 6.50, unit_id: U_UD, min_order_qty: 6, lead_time_days: 3, is_preferred: true },
  // Tinto Ribeira Sacra
  { product_idx: 72, supplier_idx: 12, price: 7.20, unit_id: U_UD, min_order_qty: 6, lead_time_days: 3, is_preferred: true },
  // Licor café
  { product_idx: 73, supplier_idx: 12, price: 8.50, unit_id: U_UD, min_order_qty: 3, lead_time_days: 3, is_preferred: true },
  // Orujo
  { product_idx: 74, supplier_idx: 12, price: 9.00, unit_id: U_UD, min_order_qty: 3, lead_time_days: 3, is_preferred: true },
  // Agua
  { product_idx: 75, supplier_idx: 11, price: 0.40, unit_id: U_UD, min_order_qty: 24, lead_time_days: 2, is_preferred: true },

  // --- Congelados ---
  { product_idx: 76, supplier_idx: 14, price: 8.50, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: true },
  { product_idx: 77, supplier_idx: 14, price: 10.00, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: true },
  { product_idx: 78, supplier_idx: 14, price: 2.20, unit_id: U_KG, min_order_qty: 5, lead_time_days: 2, is_preferred: true },

  // --- Extra ---
  // Vino blanco cocina
  { product_idx: 79, supplier_idx: 12, price: 3.50, unit_id: U_L, min_order_qty: 5, lead_time_days: 3, is_preferred: true },
  // Queso rallado
  { product_idx: 80, supplier_idx: 10, price: 8.00, unit_id: U_KG, min_order_qty: 1, lead_time_days: 2, is_preferred: true },

  // --- Additional second-supplier offers to reach 120+ ---
  // Rodaballo — also from Pescanova
  { product_idx: 4, supplier_idx: 1, price: 30.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: false },
  // Lubina — also from Pescanova
  { product_idx: 10, supplier_idx: 1, price: 24.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: false },
  // Sardina — also from Lonjas
  { product_idx: 11, supplier_idx: 3, price: 5.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: false },
  // Jurel — also from Lonjas
  { product_idx: 12, supplier_idx: 3, price: 5.50, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: false },
  // Cigalas — also from Pescanova
  { product_idx: 14, supplier_idx: 1, price: 38.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: false },
  // Zamburiñas — also from Morrazo
  { product_idx: 15, supplier_idx: 2, price: 18.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: false },
  // Pollo de corral — also from Bandeira
  { product_idx: 20, supplier_idx: 5, price: 8.20, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: false },
  // Chorizo — also from Coren
  { product_idx: 21, supplier_idx: 4, price: 13.00, unit_id: U_KG, min_order_qty: 3, lead_time_days: 3, is_preferred: false },
  // Costilla — also from Bandeira
  { product_idx: 22, supplier_idx: 5, price: 7.20, unit_id: U_KG, min_order_qty: 3, lead_time_days: 2, is_preferred: false },
  // Panceta — also from Bandeira
  { product_idx: 24, supplier_idx: 5, price: 5.80, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: false },
  // Nabiza — also from Frutas Nieves
  { product_idx: 28, supplier_idx: 8, price: 2.40, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: false },
  // Tomate — also from Horta
  { product_idx: 31, supplier_idx: 7, price: 3.80, unit_id: U_KG, min_order_qty: 3, lead_time_days: 1, is_preferred: false },
  // Ajo — also from Horta
  { product_idx: 32, supplier_idx: 7, price: 4.80, unit_id: U_KG, min_order_qty: 1, lead_time_days: 1, is_preferred: false },
  // Berza — also from Frutas Nieves
  { product_idx: 35, supplier_idx: 8, price: 2.00, unit_id: U_KG, min_order_qty: 2, lead_time_days: 1, is_preferred: false },
  // Queso tetilla — also from Leche Celta
  { product_idx: 40, supplier_idx: 9, price: 13.20, unit_id: U_KG, min_order_qty: 2, lead_time_days: 2, is_preferred: false },
  // Leche — also from Queixeria
  { product_idx: 42, supplier_idx: 10, price: 0.90, unit_id: U_L, min_order_qty: 12, lead_time_days: 2, is_preferred: false },
  // Nata — also from Queixeria
  { product_idx: 43, supplier_idx: 10, price: 3.00, unit_id: U_L, min_order_qty: 4, lead_time_days: 2, is_preferred: false },
  // Huevos — also from Despensa
  { product_idx: 45, supplier_idx: 15, price: 0.35, unit_id: U_UD, min_order_qty: 30, lead_time_days: 2, is_preferred: false },
  // Arroz bomba — also from Panadería
  { product_idx: 58, supplier_idx: 13, price: 4.00, unit_id: U_KG, min_order_qty: 5, lead_time_days: 2, is_preferred: false },
  // Harina — also from Despensa
  { product_idx: 59, supplier_idx: 15, price: 1.30, unit_id: U_KG, min_order_qty: 5, lead_time_days: 3, is_preferred: false },
  // Almendra — also from Panadería
  { product_idx: 62, supplier_idx: 13, price: 12.80, unit_id: U_KG, min_order_qty: 1, lead_time_days: 2, is_preferred: false },
  // Congelados — also from Pescanova
  { product_idx: 77, supplier_idx: 1, price: 11.00, unit_id: U_KG, min_order_qty: 5, lead_time_days: 2, is_preferred: false },
  // 1906 — also from Despensa
  { product_idx: 68, supplier_idx: 15, price: 1.35, unit_id: U_UD, min_order_qty: 12, lead_time_days: 3, is_preferred: false },
  // Albariño — also from Despensa
  { product_idx: 69, supplier_idx: 15, price: 6.20, unit_id: U_UD, min_order_qty: 3, lead_time_days: 3, is_preferred: false },
  // Mencía — also from Despensa
  { product_idx: 70, supplier_idx: 15, price: 5.50, unit_id: U_UD, min_order_qty: 3, lead_time_days: 3, is_preferred: false },
  // Mantequilla — also from Queixeria
  { product_idx: 44, supplier_idx: 10, price: 9.00, unit_id: U_KG, min_order_qty: 1, lead_time_days: 2, is_preferred: false },
];

const supplierOffers = offerDefs.map((o, i) => ({
  id: offerId(i + 1),
  hotel_id: HOTEL_ID,
  supplier_id: supplierId(o.supplier_idx),
  product_id: productId(o.product_idx),
  unit_id: o.unit_id,
  price: o.price,
  min_order_qty: o.min_order_qty,
  lead_time_days: o.lead_time_days,
  is_preferred: o.is_preferred,
  valid_from: '2026-01-01',
  valid_until: '2026-12-31',
}));

// ══════════════════════════════════════════════════════════════════════════════
// 4. PRODUCT ALIASES
// ══════════════════════════════════════════════════════════════════════════════
const productAliases = [
  { id: aliasId(1), hotel_id: HOTEL_ID, product_id: productId(1), supplier_id: supplierId(1), alias_name: 'PULPO FRESCO NAC. 2-3KG', alias_sku: 'PES-001', confidence: 0.95, source: 'manual' as const },
  { id: aliasId(2), hotel_id: HOTEL_ID, product_id: productId(1), supplier_id: supplierId(2), alias_name: 'PULPO ROC RIAS 2KG', alias_sku: 'FM-PUL-001', confidence: 0.92, source: 'manual' as const },
  { id: aliasId(3), hotel_id: HOTEL_ID, product_id: productId(2), supplier_id: supplierId(2), alias_name: 'MERLUZA PINCHO COSTA 2-3', alias_sku: 'FM-MER-010', confidence: 0.98, source: 'manual' as const },
  { id: aliasId(4), hotel_id: HOTEL_ID, product_id: productId(5), supplier_id: supplierId(3), alias_name: 'BERBERECHO CARRIL EXTRA', alias_sku: 'LG-BBR-001', confidence: 0.90, source: 'ocr_confirmed' as const },
  { id: aliasId(5), hotel_id: HOTEL_ID, product_id: productId(6), supplier_id: supplierId(3), alias_name: 'MEJILLON BATEA EXTRA', alias_sku: 'LG-MEJ-001', confidence: 0.88, source: 'ocr_confirmed' as const },
  { id: aliasId(6), hotel_id: HOTEL_ID, product_id: productId(8), supplier_id: supplierId(3), alias_name: 'PERCEBE COSTA MORTE 1ERA', alias_sku: 'LG-PRC-001', confidence: 0.85, source: 'ocr_suggested' as const },
  { id: aliasId(7), hotel_id: HOTEL_ID, product_id: productId(16), supplier_id: supplierId(5), alias_name: 'SOLOM. TERNERA GALLEGA IGP', alias_sku: 'FB-SOL-001', confidence: 0.97, source: 'manual' as const },
  { id: aliasId(8), hotel_id: HOTEL_ID, product_id: productId(18), supplier_id: supplierId(6), alias_name: 'LACON GALLEGO DO CUR 5KG', alias_sku: 'EL-LAC-001', confidence: 0.93, source: 'manual' as const },
  { id: aliasId(9), hotel_id: HOTEL_ID, product_id: productId(21), supplier_id: supplierId(6), alias_name: 'CHORIZO GALL EXTRA CURADO', alias_sku: 'EL-CHR-002', confidence: 0.91, source: 'manual' as const },
  { id: aliasId(10), hotel_id: HOTEL_ID, product_id: productId(26), supplier_id: supplierId(8), alias_name: 'PIMIENTO PADRON/HERBON', alias_sku: 'FN-PAD-001', confidence: 0.96, source: 'manual' as const },
  { id: aliasId(11), hotel_id: HOTEL_ID, product_id: productId(27), supplier_id: supplierId(7), alias_name: 'GRELO FRESCO MANOJO', alias_sku: 'HO-GRE-001', confidence: 0.89, source: 'ocr_confirmed' as const },
  { id: aliasId(12), hotel_id: HOTEL_ID, product_id: productId(29), supplier_id: supplierId(8), alias_name: 'PATATA KENNEBEC SACO 10KG', alias_sku: 'FN-PAT-010', confidence: 0.99, source: 'manual' as const },
  { id: aliasId(13), hotel_id: HOTEL_ID, product_id: productId(40), supplier_id: supplierId(10), alias_name: 'QUESO TETILLA DOP BAMA', alias_sku: 'QB-TET-001', confidence: 0.95, source: 'manual' as const },
  { id: aliasId(14), hotel_id: HOTEL_ID, product_id: productId(42), supplier_id: supplierId(9), alias_name: 'LECHE CELTA ENTERA 1L', alias_sku: 'LC-LEC-001', confidence: 0.98, source: 'manual' as const },
  { id: aliasId(15), hotel_id: HOTEL_ID, product_id: productId(67), supplier_id: supplierId(11), alias_name: 'ESTRELLAGALICIA ESP 30L', alias_sku: 'HR-EG-030', confidence: 0.99, source: 'manual' as const },
  { id: aliasId(16), hotel_id: HOTEL_ID, product_id: productId(69), supplier_id: supplierId(12), alias_name: 'ALBARIÑO M.CODAX 75CL', alias_sku: 'MC-ALB-075', confidence: 0.97, source: 'manual' as const },
  { id: aliasId(17), hotel_id: HOTEL_ID, product_id: productId(13), supplier_id: supplierId(3), alias_name: 'BOGAVANTE EUR VIVO KG', alias_sku: 'LG-BOG-001', confidence: 0.86, source: 'ocr_suggested' as const },
  { id: aliasId(18), hotel_id: HOTEL_ID, product_id: productId(23), supplier_id: supplierId(6), alias_name: 'ZORZA CERDO ADOBADO KG', alias_sku: 'EL-ZOR-001', confidence: 0.90, source: 'manual' as const },
  { id: aliasId(19), hotel_id: HOTEL_ID, product_id: productId(7), supplier_id: supplierId(3), alias_name: 'NAVAJA GALLEGA FINA KG', alias_sku: 'LG-NAV-001', confidence: 0.92, source: 'manual' as const },
  { id: aliasId(20), hotel_id: HOTEL_ID, product_id: productId(9), supplier_id: supplierId(3), alias_name: 'VIEIRA GALL CONCHA KG', alias_sku: 'LG-VIE-001', confidence: 0.94, source: 'manual' as const },
];

// ══════════════════════════════════════════════════════════════════════════════
// 5. RECIPES (15) with escandallo
// ══════════════════════════════════════════════════════════════════════════════

// Price lookup from offers (preferred price)
function getPrice(prodIdx: number): number {
  const offer = offerDefs.find(o => o.product_idx === prodIdx && o.is_preferred);
  return offer ? offer.price : 0;
}

interface IngredientDef {
  product_idx: number;
  unit_id: string;
  quantity: number;
  notes: string | null;
}

interface RecipeDef {
  id: string;
  name: string;
  description: string;
  category: string;
  servings: number;
  prep_time_min: number;
  cook_time_min: number;
  ingredients: IngredientDef[];
  unit_price: number; // PVP per serving
}

const recipeDefs: RecipeDef[] = [
  {
    id: recipeId(1),
    name: 'Pulpo á feira',
    description: 'Pulpo cocido con cachelos, pimentón de la Vera y aceite de oliva. Plato emblema gallego.',
    category: 'Clásicos Gallegos',
    servings: 4,
    prep_time_min: 15,
    cook_time_min: 45,
    unit_price: 18.00,
    ingredients: [
      { product_idx: 1, unit_id: U_KG, quantity: 1.5, notes: 'Pulpo cocido, cortar en rodajas' },
      { product_idx: 29, unit_id: U_KG, quantity: 0.600, notes: 'Cachelos cocidos' },
      { product_idx: 47, unit_id: U_KG, quantity: 0.015, notes: 'Pimentón dulce por encima' },
      { product_idx: 48, unit_id: U_KG, quantity: 0.005, notes: 'Toque de picante' },
      { product_idx: 54, unit_id: U_L, quantity: 0.060, notes: 'Chorro generoso AOVE' },
      { product_idx: 49, unit_id: U_KG, quantity: 0.010, notes: 'Sal gruesa' },
      { product_idx: 30, unit_id: U_KG, quantity: 0.100, notes: 'En el agua de cocción' },
      { product_idx: 34, unit_id: U_KG, quantity: 0.005, notes: 'Laurel en cocción' },
    ],
  },
  {
    id: recipeId(2),
    name: 'Empanada gallega de berberechos',
    description: 'Empanada de masa artesana con berberechos de Carril, cebolla y pimiento. Receta tradicional.',
    category: 'Clásicos Gallegos',
    servings: 8,
    prep_time_min: 40,
    cook_time_min: 35,
    unit_price: 14.00,
    ingredients: [
      { product_idx: 61, unit_id: U_KG, quantity: 1.000, notes: 'Masa empanada superior e inferior' },
      { product_idx: 5, unit_id: U_KG, quantity: 0.800, notes: 'Berberechos limpios, abiertos al vapor' },
      { product_idx: 30, unit_id: U_KG, quantity: 0.300, notes: 'Cebolla sofrito base' },
      { product_idx: 37, unit_id: U_KG, quantity: 0.200, notes: 'Pimiento rojo en tiras' },
      { product_idx: 31, unit_id: U_KG, quantity: 0.200, notes: 'Tomate sofrito' },
      { product_idx: 32, unit_id: U_KG, quantity: 0.020, notes: 'Ajo sofrito' },
      { product_idx: 33, unit_id: U_KG, quantity: 0.010, notes: 'Perejil picado' },
      { product_idx: 54, unit_id: U_L, quantity: 0.060, notes: 'Para sofrito' },
      { product_idx: 47, unit_id: U_KG, quantity: 0.010, notes: 'Pimentón' },
      { product_idx: 49, unit_id: U_KG, quantity: 0.008, notes: null },
      { product_idx: 45, unit_id: U_UD, quantity: 1, notes: 'Para pintar la masa' },
      { product_idx: 79, unit_id: U_L, quantity: 0.050, notes: 'Vino blanco en sofrito' },
    ],
  },
  {
    id: recipeId(3),
    name: 'Caldo gallego',
    description: 'Caldo tradicional con grelos, alubias, unto y lacón. Reconfortante plato de invierno.',
    category: 'Clásicos Gallegos',
    servings: 6,
    prep_time_min: 20,
    cook_time_min: 90,
    unit_price: 10.00,
    ingredients: [
      { product_idx: 27, unit_id: U_KG, quantity: 0.400, notes: 'Grelos en trozos' },
      { product_idx: 29, unit_id: U_KG, quantity: 0.500, notes: 'Patata en trozos grandes' },
      { product_idx: 39, unit_id: U_KG, quantity: 0.300, notes: 'Alubias remojadas' },
      { product_idx: 18, unit_id: U_KG, quantity: 0.300, notes: 'Lacón en trozos' },
      { product_idx: 25, unit_id: U_KG, quantity: 0.100, notes: 'Unto para dar sustancia' },
      { product_idx: 21, unit_id: U_KG, quantity: 0.150, notes: 'Chorizo en rodajas' },
      { product_idx: 49, unit_id: U_KG, quantity: 0.010, notes: null },
      { product_idx: 34, unit_id: U_KG, quantity: 0.003, notes: 'Laurel' },
    ],
  },
  {
    id: recipeId(4),
    name: 'Merluza a la gallega',
    description: 'Merluza de pincho cocida con cachelos, ajada de pimentón y aceite de oliva virgen.',
    category: 'Pescados',
    servings: 2,
    prep_time_min: 10,
    cook_time_min: 15,
    unit_price: 22.00,
    ingredients: [
      { product_idx: 2, unit_id: U_KG, quantity: 0.500, notes: 'Rodajas gruesas' },
      { product_idx: 29, unit_id: U_KG, quantity: 0.400, notes: 'Cachelos' },
      { product_idx: 32, unit_id: U_KG, quantity: 0.020, notes: 'Láminas finas para ajada' },
      { product_idx: 54, unit_id: U_L, quantity: 0.050, notes: 'Para ajada' },
      { product_idx: 47, unit_id: U_KG, quantity: 0.008, notes: 'Pimentón dulce ajada' },
      { product_idx: 49, unit_id: U_KG, quantity: 0.005, notes: null },
    ],
  },
  {
    id: recipeId(5),
    name: 'Lacón con grelos',
    description: 'Lacón curado gallego cocido con grelos de temporada, patatas y chorizo. Plato de Entroido.',
    category: 'Clásicos Gallegos',
    servings: 4,
    prep_time_min: 30,
    cook_time_min: 120,
    unit_price: 16.00,
    ingredients: [
      { product_idx: 18, unit_id: U_KG, quantity: 1.200, notes: 'Lacón desalado 24h' },
      { product_idx: 27, unit_id: U_KG, quantity: 0.600, notes: 'Grelos frescos' },
      { product_idx: 29, unit_id: U_KG, quantity: 0.600, notes: 'Patatas enteras' },
      { product_idx: 21, unit_id: U_KG, quantity: 0.200, notes: 'Chorizo gallego' },
      { product_idx: 49, unit_id: U_KG, quantity: 0.008, notes: null },
      { product_idx: 34, unit_id: U_KG, quantity: 0.003, notes: 'Laurel en cocción' },
    ],
  },
  {
    id: recipeId(6),
    name: 'Pimientos de Padrón',
    description: 'Pimientos de Padrón fritos en aceite de oliva con sal gruesa. Unos pican y otros no.',
    category: 'Tapas',
    servings: 2,
    prep_time_min: 2,
    cook_time_min: 5,
    unit_price: 8.00,
    ingredients: [
      { product_idx: 26, unit_id: U_KG, quantity: 0.300, notes: 'Secos, sin agua' },
      { product_idx: 54, unit_id: U_L, quantity: 0.100, notes: 'AOVE bien caliente' },
      { product_idx: 49, unit_id: U_KG, quantity: 0.008, notes: 'Sal gruesa al servir' },
    ],
  },
  {
    id: recipeId(7),
    name: 'Vieiras gratinadas',
    description: 'Vieiras gallegas gratinadas con cebolla, vino Albariño, pan rallado y queso.',
    category: 'Mariscos',
    servings: 4,
    prep_time_min: 20,
    cook_time_min: 12,
    unit_price: 18.00,
    ingredients: [
      { product_idx: 9, unit_id: U_KG, quantity: 0.800, notes: '8-12 vieiras con concha' },
      { product_idx: 30, unit_id: U_KG, quantity: 0.200, notes: 'Cebolla picada fina' },
      { product_idx: 79, unit_id: U_L, quantity: 0.100, notes: 'Albariño' },
      { product_idx: 59, unit_id: U_KG, quantity: 0.050, notes: 'Pan rallado gratinar' },
      { product_idx: 80, unit_id: U_KG, quantity: 0.060, notes: 'Queso gratinar' },
      { product_idx: 54, unit_id: U_L, quantity: 0.030, notes: null },
      { product_idx: 49, unit_id: U_KG, quantity: 0.005, notes: null },
    ],
  },
  {
    id: recipeId(8),
    name: 'Filloas',
    description: 'Crepes gallegos finos con leche, huevo y harina. Receta tradicional de Entroido.',
    category: 'Postres',
    servings: 8,
    prep_time_min: 10,
    cook_time_min: 20,
    unit_price: 6.00,
    ingredients: [
      { product_idx: 59, unit_id: U_KG, quantity: 0.250, notes: 'Harina tamizada' },
      { product_idx: 42, unit_id: U_L, quantity: 0.500, notes: 'Leche entera' },
      { product_idx: 45, unit_id: U_UD, quantity: 3, notes: 'Huevos batidos' },
      { product_idx: 63, unit_id: U_KG, quantity: 0.050, notes: null },
      { product_idx: 44, unit_id: U_KG, quantity: 0.030, notes: 'Mantequilla derretida' },
      { product_idx: 50, unit_id: U_KG, quantity: 0.003, notes: 'Pizca de sal' },
    ],
  },
  {
    id: recipeId(9),
    name: 'Zorza con cachelos',
    description: 'Carne de cerdo adobada con pimentón y ajo, frita con cachelos. Plato contundente.',
    category: 'Carnes',
    servings: 4,
    prep_time_min: 15,
    cook_time_min: 20,
    unit_price: 14.00,
    ingredients: [
      { product_idx: 23, unit_id: U_KG, quantity: 0.800, notes: 'Zorza ya adobada' },
      { product_idx: 29, unit_id: U_KG, quantity: 0.600, notes: 'Cachelos cocidos' },
      { product_idx: 32, unit_id: U_KG, quantity: 0.020, notes: null },
      { product_idx: 54, unit_id: U_L, quantity: 0.050, notes: 'Para freír' },
      { product_idx: 49, unit_id: U_KG, quantity: 0.005, notes: null },
      { product_idx: 33, unit_id: U_KG, quantity: 0.010, notes: 'Perejil picado al servir' },
      { product_idx: 34, unit_id: U_KG, quantity: 0.003, notes: 'En cocción cachelos' },
    ],
  },
  {
    id: recipeId(10),
    name: 'Caldeirada de pescado',
    description: 'Guiso marinero gallego con pescado variado, patatas, pimiento y cebolla.',
    category: 'Pescados',
    servings: 6,
    prep_time_min: 25,
    cook_time_min: 35,
    unit_price: 20.00,
    ingredients: [
      { product_idx: 2, unit_id: U_KG, quantity: 0.500, notes: 'Merluza en trozos' },
      { product_idx: 3, unit_id: U_KG, quantity: 0.400, notes: 'Rape en dados' },
      { product_idx: 6, unit_id: U_KG, quantity: 0.300, notes: 'Mejillones abiertos' },
      { product_idx: 29, unit_id: U_KG, quantity: 0.500, notes: 'Patata en rodajas gruesas' },
      { product_idx: 30, unit_id: U_KG, quantity: 0.200, notes: 'Cebolla en juliana' },
      { product_idx: 37, unit_id: U_KG, quantity: 0.150, notes: 'Pimiento rojo' },
      { product_idx: 32, unit_id: U_KG, quantity: 0.020, notes: null },
      { product_idx: 33, unit_id: U_KG, quantity: 0.010, notes: null },
      { product_idx: 79, unit_id: U_L, quantity: 0.100, notes: 'Vino blanco' },
      { product_idx: 54, unit_id: U_L, quantity: 0.050, notes: null },
    ],
  },
  {
    id: recipeId(11),
    name: 'Tarta de Santiago',
    description: 'Tarta de almendra gallega con la Cruz de Santiago. Sin gluten en su versión original.',
    category: 'Postres',
    servings: 10,
    prep_time_min: 15,
    cook_time_min: 40,
    unit_price: 7.00,
    ingredients: [
      { product_idx: 62, unit_id: U_KG, quantity: 0.500, notes: 'Almendra molida fina' },
      { product_idx: 63, unit_id: U_KG, quantity: 0.250, notes: null },
      { product_idx: 45, unit_id: U_UD, quantity: 5, notes: 'Huevos separar claras y yemas' },
      { product_idx: 44, unit_id: U_KG, quantity: 0.020, notes: 'Para engrasar molde' },
      { product_idx: 64, unit_id: U_KG, quantity: 0.030, notes: 'Para decorar con Cruz de Santiago' },
      { product_idx: 66, unit_id: U_UD, quantity: 1, notes: 'Ralladura de limón' },
      { product_idx: 65, unit_id: U_UD, quantity: 1, notes: 'Toque de canela' },
    ],
  },
  {
    id: recipeId(12),
    name: 'Mejillones al vapor',
    description: 'Mejillones de batea al vapor con vino blanco Albariño, laurel y limón.',
    category: 'Mariscos',
    servings: 4,
    prep_time_min: 10,
    cook_time_min: 8,
    unit_price: 12.00,
    ingredients: [
      { product_idx: 6, unit_id: U_KG, quantity: 1.500, notes: 'Mejillones limpios' },
      { product_idx: 79, unit_id: U_L, quantity: 0.150, notes: 'Albariño' },
      { product_idx: 34, unit_id: U_KG, quantity: 0.003, notes: 'Laurel' },
      { product_idx: 38, unit_id: U_KG, quantity: 0.050, notes: 'Rodajas de limón' },
      { product_idx: 33, unit_id: U_KG, quantity: 0.010, notes: 'Perejil al servir' },
    ],
  },
  {
    id: recipeId(13),
    name: 'Raxo con patatas',
    description: 'Lomo de cerdo gallego marinado con ajo, pimentón y vino, con patatas fritas.',
    category: 'Carnes',
    servings: 2,
    prep_time_min: 20,
    cook_time_min: 12,
    unit_price: 14.00,
    ingredients: [
      { product_idx: 19, unit_id: U_KG, quantity: 0.400, notes: 'Lomo en dados 3cm, marinar 4h' },
      { product_idx: 29, unit_id: U_KG, quantity: 0.300, notes: 'Patatas fritas' },
      { product_idx: 32, unit_id: U_KG, quantity: 0.015, notes: 'Ajo laminado para marinada' },
      { product_idx: 47, unit_id: U_KG, quantity: 0.008, notes: 'Pimentón dulce marinada' },
      { product_idx: 54, unit_id: U_L, quantity: 0.080, notes: 'Para freír' },
      { product_idx: 49, unit_id: U_KG, quantity: 0.005, notes: null },
    ],
  },
  {
    id: recipeId(14),
    name: 'Navajas a la plancha',
    description: 'Navajas gallegas a la plancha con ajo, perejil y limón. Frescura del mar.',
    category: 'Mariscos',
    servings: 2,
    prep_time_min: 5,
    cook_time_min: 4,
    unit_price: 24.00,
    ingredients: [
      { product_idx: 7, unit_id: U_KG, quantity: 0.400, notes: 'Navajas frescas limpias' },
      { product_idx: 32, unit_id: U_KG, quantity: 0.010, notes: 'Ajo laminado' },
      { product_idx: 33, unit_id: U_KG, quantity: 0.005, notes: 'Perejil' },
      { product_idx: 38, unit_id: U_KG, quantity: 0.030, notes: 'Limón para servir' },
    ],
  },
  {
    id: recipeId(15),
    name: 'Arroz con bogavante',
    description: 'Arroz caldoso con bogavante europeo, fumet de marisco y sofrito gallego.',
    category: 'Arroces',
    servings: 2,
    prep_time_min: 30,
    cook_time_min: 25,
    unit_price: 38.00,
    ingredients: [
      { product_idx: 58, unit_id: U_KG, quantity: 0.200, notes: 'Arroz bomba' },
      { product_idx: 13, unit_id: U_KG, quantity: 0.600, notes: 'Bogavante vivo, medio por persona' },
      { product_idx: 30, unit_id: U_KG, quantity: 0.100, notes: 'Cebolla sofrito' },
      { product_idx: 31, unit_id: U_KG, quantity: 0.150, notes: 'Tomate rallado' },
      { product_idx: 37, unit_id: U_KG, quantity: 0.080, notes: 'Pimiento rojo' },
      { product_idx: 32, unit_id: U_KG, quantity: 0.015, notes: null },
      { product_idx: 33, unit_id: U_KG, quantity: 0.010, notes: null },
      { product_idx: 54, unit_id: U_L, quantity: 0.050, notes: null },
      { product_idx: 79, unit_id: U_L, quantity: 0.100, notes: 'Vino blanco para flamear' },
      { product_idx: 47, unit_id: U_KG, quantity: 0.005, notes: null },
      { product_idx: 53, unit_id: U_G, quantity: 0.5, notes: 'Azafrán' },
      { product_idx: 49, unit_id: U_KG, quantity: 0.008, notes: null },
    ],
  },
];

// Build recipe rows with cost calculation
function calcRecipeCost(r: RecipeDef): { total_cost: number; cost_per_serving: number } {
  let total = 0;
  for (const ing of r.ingredients) {
    const price = getPrice(ing.product_idx);
    total += price * ing.quantity;
  }
  total = Math.round(total * 100) / 100;
  return { total_cost: total, cost_per_serving: Math.round((total / r.servings) * 100) / 100 };
}

const recipes = recipeDefs.map(r => {
  const costs = calcRecipeCost(r);
  return {
    id: r.id,
    hotel_id: HOTEL_ID,
    name: r.name,
    description: r.description,
    category: r.category,
    servings: r.servings,
    prep_time_min: r.prep_time_min,
    cook_time_min: r.cook_time_min,
    status: 'approved' as const,
    version: 1,
    total_cost: costs.total_cost,
    cost_per_serving: costs.cost_per_serving,
    notes: null,
  };
});

// Build ingredient rows
let ingredientCounter = 0;
const recipeIngredients: any[] = [];
for (const r of recipeDefs) {
  r.ingredients.forEach((ing, sortIdx) => {
    ingredientCounter++;
    recipeIngredients.push({
      id: ingredientId(ingredientCounter),
      recipe_id: r.id,
      hotel_id: HOTEL_ID,
      product_id: productId(ing.product_idx),
      unit_id: ing.unit_id,
      quantity: ing.quantity,
      notes: ing.notes,
      sort_order: sortIdx + 1,
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. PURCHASE ORDERS + LINES (50 orders over 6 months)
// ══════════════════════════════════════════════════════════════════════════════

// Supplier -> products they sell
const supplierProducts: Record<number, number[]> = {
  1: [1, 2, 3, 4, 10, 13, 14, 77],  // Pescanova
  2: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 15],  // Frigorificos Morrazo
  3: [5, 6, 7, 8, 9, 11, 12, 13, 14, 15],  // Lonjas de Galicia
  4: [16, 17, 18, 19, 20, 21, 22, 23, 24],  // Coren
  5: [16, 17, 19, 20, 22, 24],  // Frigorificos Bandeira
  6: [18, 21, 23, 25],      // Embutidos Lalinense
  7: [27, 28, 31, 32, 33, 35, 36],  // Horta do Obradoiro
  8: [26, 28, 29, 30, 31, 32, 35, 37, 38, 66],  // Frutas Nieves
  9: [40, 42, 43, 44, 45],  // Leche Celta
  10: [40, 41, 42, 43, 44, 46, 80],  // Queixería Bama
  11: [67, 68, 75],         // Hijos de Rivera
  12: [69, 70, 71, 72, 73, 74, 79],  // Bodegas Martín Códax
  13: [58, 59, 60, 61, 62], // Panadería O Curruncho
  14: [76, 77, 78],         // Congelados Samar
  15: [34, 39, 45, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 62, 63, 64, 65, 68, 69, 70],  // La Despensa Gourmet
};

const poStatuses = ['received', 'received', 'received', 'received', 'received', 'received', 'sent', 'confirmed_by_supplier'];

// ERROR tracking: which PO indices have deliberate errors
const errorPOIndices = {
  priceInflated: [5, 18, 33],       // ERROR_TEST: precio inflado
  quantityMismatch: [8, 22, 41],    // ERROR_TEST: cantidad incorrecta
  malformedNIF: [12, 37],           // ERROR_TEST: NIF malformado
};

const allErrorPOs = new Set([
  ...errorPOIndices.priceInflated,
  ...errorPOIndices.quantityMismatch,
  ...errorPOIndices.malformedNIF,
]);

const purchaseOrders: any[] = [];
const purchaseOrderLines: any[] = [];
let poLineCounter = 0;

for (let i = 0; i < 50; i++) {
  const daysBack = Math.floor(rng() * 180); // last 6 months
  const orderDate = addDays(TODAY, -daysBack);
  const deliveryDate = addDays(orderDate, rngInt(1, 3));
  const supIdx = rngInt(1, 15);
  const availableProducts = supplierProducts[supIdx] || [29, 30, 31]; // fallback
  const numLines = rngInt(3, Math.min(12, availableProducts.length));

  const isReceived = daysBack > 3 || i < 40;
  const status = isReceived ? 'received' : pick(poStatuses);

  const po: any = {
    id: poId(i + 1),
    hotel_id: HOTEL_ID,
    supplier_id: supplierId(supIdx),
    order_number: `PO-2026-${String(i + 1).padStart(4, '0')}`,
    status,
    expected_delivery_date: dateStr(deliveryDate),
    total_amount: 0,
    notes: null,
    sent_at: dateStr(orderDate),
  };

  // Select random products from supplier's catalog
  const shuffled = [...availableProducts].sort(() => rng() - 0.5);
  const selectedProducts = shuffled.slice(0, numLines);

  let totalAmount = 0;
  for (let j = 0; j < selectedProducts.length; j++) {
    poLineCounter++;
    const pIdx = selectedProducts[j];
    const offer = offerDefs.find(o => o.product_idx === pIdx && o.supplier_idx === supIdx)
      || offerDefs.find(o => o.product_idx === pIdx && o.is_preferred);

    let unitPrice = offer ? offer.price : rngBetween(2, 30);
    const qtyOrdered = rngInt(2, 20);
    let qtyReceived: number | null = status === 'received' ? qtyOrdered : null;

    // ERROR_TEST: precio inflado — 3 orders with unit_price 10-15% higher
    if (errorPOIndices.priceInflated.includes(i) && j === 0) {
      unitPrice = Math.round(unitPrice * rngBetween(1.10, 1.15) * 100) / 100; // ERROR_TEST: precio inflado
    }

    // ERROR_TEST: cantidad incorrecta — 3 orders with quantity_received != quantity_ordered
    if (errorPOIndices.quantityMismatch.includes(i) && j === 0) {
      qtyReceived = qtyOrdered - rngInt(1, 3); // ERROR_TEST: cantidad incorrecta
    }

    const lineTotal = Math.round(unitPrice * qtyOrdered * 100) / 100;
    totalAmount += lineTotal;

    purchaseOrderLines.push({
      id: poLineId(poLineCounter),
      order_id: poId(i + 1),
      hotel_id: HOTEL_ID,
      product_id: productId(pIdx),
      unit_id: offer?.unit_id || U_KG,
      quantity_ordered: qtyOrdered,
      unit_price: unitPrice,
      quantity_received: qtyReceived,
      sort_order: j + 1,
    });
  }

  po.total_amount = Math.round(totalAmount * 100) / 100;

  // ERROR_TEST: NIF malformado — we'll note it and handle supplier update separately
  if (errorPOIndices.malformedNIF.includes(i)) {
    po.notes = 'ERROR_TEST: NIF malformado en proveedor asociado'; // ERROR_TEST: NIF malformado
  }

  purchaseOrders.push(po);
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. GOODS RECEIPTS + LINES (50, matching POs)
// ══════════════════════════════════════════════════════════════════════════════
const goodsReceipts: any[] = [];
const goodsReceiptLines: any[] = [];
let receiptLineCounter = 0;

for (let i = 0; i < 50; i++) {
  const po = purchaseOrders[i];
  if (po.status !== 'received') continue;

  const receiptDate = addDays(new Date(po.expected_delivery_date), rngInt(0, 1));

  const gr: any = {
    id: receiptId(i + 1),
    hotel_id: HOTEL_ID,
    order_id: po.id,
    receipt_number: `GR-2026-${String(i + 1).padStart(4, '0')}`,
    received_at: receiptDate.toISOString(),
    notes: null,
  };

  // Get associated PO lines
  const poLines = purchaseOrderLines.filter(l => l.order_id === po.id);
  for (const pol of poLines) {
    receiptLineCounter++;
    const isFresh = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(
      parseInt(pol.product_id.split('-').pop()!)
    );
    const daysToExpiry = isFresh ? rngInt(3, 14) : rngInt(30, 180);
    const expiryDate = addDays(receiptDate, daysToExpiry);
    const lotDate = dateStr(receiptDate).replace(/-/g, '');

    let qtyReceived = pol.quantity_received ?? pol.quantity_ordered;

    goodsReceiptLines.push({
      id: receiptLineId(receiptLineCounter),
      receipt_id: receiptId(i + 1),
      hotel_id: HOTEL_ID,
      order_line_id: pol.id,
      product_id: pol.product_id,
      unit_id: pol.unit_id,
      quantity_received: qtyReceived,
      unit_cost: pol.unit_price,
      expiry_date: dateStr(expiryDate),
      lot_number: `LOT-${lotDate}-${String(receiptLineCounter).padStart(3, '0')}`,
      notes: null,
    });
  }

  goodsReceipts.push(gr);
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. CHECK TEMPLATES (8) + CHECK RECORDS (90 days)
// ══════════════════════════════════════════════════════════════════════════════
const checkTemplates = [
  {
    id: templateId(1),
    hotel_id: HOTEL_ID,
    name: 'Cámara pescado',
    check_type: 'temperatura' as const,
    frequency: 'diario' as const,
    description: 'Control temperatura cámara de pescado fresco',
    min_value: -2,
    max_value: 2,
    unit: '°C',
    is_active: true,
    sort_order: 1,
  },
  {
    id: templateId(2),
    hotel_id: HOTEL_ID,
    name: 'Cámara carne',
    check_type: 'temperatura' as const,
    frequency: 'diario' as const,
    description: 'Control temperatura cámara de carne',
    min_value: 0,
    max_value: 4,
    unit: '°C',
    is_active: true,
    sort_order: 2,
  },
  {
    id: templateId(3),
    hotel_id: HOTEL_ID,
    name: 'Cámara verdura',
    check_type: 'temperatura' as const,
    frequency: 'diario' as const,
    description: 'Control temperatura cámara de verdura',
    min_value: 4,
    max_value: 8,
    unit: '°C',
    is_active: true,
    sort_order: 3,
  },
  {
    id: templateId(4),
    hotel_id: HOTEL_ID,
    name: 'Congelador',
    check_type: 'temperatura' as const,
    frequency: 'diario' as const,
    description: 'Control temperatura congelador',
    min_value: -22,
    max_value: -18,
    unit: '°C',
    is_active: true,
    sort_order: 4,
  },
  {
    id: templateId(5),
    hotel_id: HOTEL_ID,
    name: 'Temperatura sala',
    check_type: 'temperatura' as const,
    frequency: 'diario' as const,
    description: 'Control temperatura sala de cocina',
    min_value: 18,
    max_value: 24,
    unit: '°C',
    is_active: true,
    sort_order: 5,
  },
  {
    id: templateId(6),
    hotel_id: HOTEL_ID,
    name: 'Limpieza cocina',
    check_type: 'limpieza' as const,
    frequency: 'diario' as const,
    description: 'Control de limpieza general de cocina',
    min_value: null,
    max_value: null,
    unit: null,
    is_active: true,
    sort_order: 6,
  },
  {
    id: templateId(7),
    hotel_id: HOTEL_ID,
    name: 'Recepción mercancía',
    check_type: 'recepcion' as const,
    frequency: 'diario' as const,
    description: 'Control recepción de mercancía y temperaturas',
    min_value: null,
    max_value: null,
    unit: null,
    is_active: true,
    sort_order: 7,
  },
  {
    id: templateId(8),
    hotel_id: HOTEL_ID,
    name: 'Aceite fritura',
    check_type: 'temperatura' as const,
    frequency: 'diario' as const,
    description: 'Control compuestos polares aceite de fritura',
    min_value: 0,
    max_value: 25,
    unit: '% polar',
    is_active: true,
    sort_order: 8,
  },
];

const checkers = ['Israel Ramos', 'Ana López', 'Carlos Méndez'];

// Records with deliberate out-of-range errors
const outOfRangeErrors = [
  { dayOffset: -15, templateIdx: 0 }, // cámara pescado
  { dayOffset: -30, templateIdx: 1 }, // cámara carne
  { dayOffset: -45, templateIdx: 3 }, // congelador
  { dayOffset: -60, templateIdx: 0 }, // cámara pescado again
  { dayOffset: -7, templateIdx: 7 },  // aceite fritura
];

let checkRecordCounter = 0;
const checkRecords: any[] = [];

for (let day = 0; day < 90; day++) {
  const checkDate = addDays(TODAY, -day);
  const checkerName = checkers[day % 3];

  for (let t = 0; t < checkTemplates.length; t++) {
    checkRecordCounter++;
    const tmpl = checkTemplates[t];
    let value: number | null = null;
    let status: 'ok' | 'alerta' | 'critico' = 'ok';
    let notes: string | null = null;
    let correctiveAction: string | null = null;

    // Check if this is a deliberate error
    const errorMatch = outOfRangeErrors.find(e => e.dayOffset === -day && e.templateIdx === t);

    if (tmpl.min_value !== null && tmpl.max_value !== null) {
      if (errorMatch) {
        // ERROR_TEST: temperatura fuera de rango
        if (t === 0) {
          value = rngBetween(4, 6); // ERROR_TEST: temperatura fuera de rango — cámara pescado
          status = 'critico';
          notes = 'Temperatura elevada detectada. Puerta abierta.';
          correctiveAction = 'Cerrar puerta, revisar en 1h. Notificar jefe cocina.';
        } else if (t === 1) {
          value = rngBetween(6, 8); // ERROR_TEST: temperatura fuera de rango — cámara carne
          status = 'alerta';
          notes = 'Temperatura por encima del rango.';
          correctiveAction = 'Ajustar termostato. Revisar en 30 min.';
        } else if (t === 3) {
          value = rngBetween(-15, -12); // ERROR_TEST: temperatura fuera de rango — congelador
          status = 'critico';
          notes = 'Congelador no alcanza temperatura. Fallo compresor.';
          correctiveAction = 'Llamar técnico SAT. Transferir productos a congelador backup.';
        } else if (t === 7) {
          value = rngBetween(26, 30); // ERROR_TEST: temperatura fuera de rango — aceite fritura
          status = 'critico';
          notes = 'Aceite degradado, supera 25% compuestos polares.';
          correctiveAction = 'Cambiar aceite de fritura inmediatamente.';
        }
      } else {
        // Normal values within range
        value = rngBetween(tmpl.min_value, tmpl.max_value);
      }
    } else {
      // Limpieza / Recepción — qualitative
      value = null;
      status = rng() > 0.05 ? 'ok' : 'alerta';
      if (status === 'alerta') {
        notes = t === 5 ? 'Zona freidora necesita limpieza profunda' : 'Temperatura mercancía límite';
      }
    }

    checkRecords.push({
      id: checkRecordId(checkRecordCounter),
      hotel_id: HOTEL_ID,
      template_id: tmpl.id,
      check_date: dateStr(checkDate),
      value,
      status,
      notes,
      corrective_action: correctiveAction,
      checked_by_name: checkerName,
      recorded_at: new Date(checkDate.getTime() + 8 * 3600000).toISOString(), // 8am
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. SALES DATA (180 records, 6 months, BCG patterns)
// ══════════════════════════════════════════════════════════════════════════════

// BCG matrix configuration
// ESTRELLAS: Pulpo á feira — high sales, high margin ~65%
// VACAS: Pimientos Padrón — high sales, low margin ~40%
// ENIGMAS: Arroz con bogavante — low sales, high margin ~60%
// PERROS: Filloas — low sales, low margin ~35%

interface SalesConfig {
  recipeIdx: number;
  unitPrice: number;
  baseQtyWeekday: number;
  baseQtyWeekend: number;
  seasonalPeak: number[]; // months (0-based) with +30% sales
  seasonalLow: number[];  // months with -30% sales
}

const salesConfigs: SalesConfig[] = [
  // ESTRELLA: Pulpo á feira — high volume, high margin
  { recipeIdx: 1, unitPrice: 18.00, baseQtyWeekday: 6, baseQtyWeekend: 12, seasonalPeak: [5, 6, 7], seasonalLow: [11, 0, 1] },
  // Empanada gallega
  { recipeIdx: 2, unitPrice: 14.00, baseQtyWeekday: 4, baseQtyWeekend: 8, seasonalPeak: [5, 6], seasonalLow: [] },
  // Caldo gallego — winter dish
  { recipeIdx: 3, unitPrice: 10.00, baseQtyWeekday: 3, baseQtyWeekend: 5, seasonalPeak: [10, 11, 0, 1, 2], seasonalLow: [5, 6, 7] },
  // Merluza a la gallega
  { recipeIdx: 4, unitPrice: 22.00, baseQtyWeekday: 3, baseQtyWeekend: 6, seasonalPeak: [], seasonalLow: [] },
  // Lacón con grelos — winter
  { recipeIdx: 5, unitPrice: 16.00, baseQtyWeekday: 2, baseQtyWeekend: 5, seasonalPeak: [0, 1, 2], seasonalLow: [5, 6, 7] },
  // VACA: Pimientos de Padrón — high volume, lower margin
  { recipeIdx: 6, unitPrice: 8.00, baseQtyWeekday: 8, baseQtyWeekend: 15, seasonalPeak: [5, 6, 7, 8], seasonalLow: [11, 0, 1] },
  // Vieiras gratinadas
  { recipeIdx: 7, unitPrice: 18.00, baseQtyWeekday: 3, baseQtyWeekend: 5, seasonalPeak: [11], seasonalLow: [] },
  // PERRO: Filloas — low volume, low margin
  { recipeIdx: 8, unitPrice: 6.00, baseQtyWeekday: 1, baseQtyWeekend: 3, seasonalPeak: [1], seasonalLow: [5, 6, 7] },
  // Zorza con cachelos
  { recipeIdx: 9, unitPrice: 14.00, baseQtyWeekday: 3, baseQtyWeekend: 6, seasonalPeak: [], seasonalLow: [] },
  // Caldeirada
  { recipeIdx: 10, unitPrice: 20.00, baseQtyWeekday: 2, baseQtyWeekend: 4, seasonalPeak: [10, 11], seasonalLow: [6, 7] },
  // Tarta de Santiago
  { recipeIdx: 11, unitPrice: 7.00, baseQtyWeekday: 4, baseQtyWeekend: 8, seasonalPeak: [6], seasonalLow: [] },
  // Mejillones al vapor
  { recipeIdx: 12, unitPrice: 12.00, baseQtyWeekday: 3, baseQtyWeekend: 6, seasonalPeak: [5, 6, 7], seasonalLow: [] },
  // Raxo con patatas
  { recipeIdx: 13, unitPrice: 14.00, baseQtyWeekday: 3, baseQtyWeekend: 5, seasonalPeak: [], seasonalLow: [] },
  // Navajas a la plancha
  { recipeIdx: 14, unitPrice: 24.00, baseQtyWeekday: 2, baseQtyWeekend: 4, seasonalPeak: [5, 6], seasonalLow: [] },
  // ENIGMA: Arroz con bogavante — low volume, high margin
  { recipeIdx: 15, unitPrice: 38.00, baseQtyWeekday: 1, baseQtyWeekend: 2, seasonalPeak: [6, 7, 11], seasonalLow: [0, 1] },
];

let salesCounter = 0;
const salesData: any[] = [];

// Generate sales for ~180 days (6 months back from TODAY)
for (let day = 1; day <= 180; day++) {
  const saleDate = addDays(TODAY, -day);
  const dayOfWeek = saleDate.getDay(); // 0=Sun
  const month = saleDate.getMonth();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // Fri, Sat, Sun

  // Not every recipe sells every day — pick a random subset
  for (const cfg of salesConfigs) {
    // Skip some days randomly to get ~180 total records spread across recipes
    if (rng() < 0.3) continue;

    let qty = isWeekend ? cfg.baseQtyWeekend : cfg.baseQtyWeekday;

    // Seasonal adjustment
    if (cfg.seasonalPeak.includes(month)) {
      qty = Math.ceil(qty * 1.3);
    } else if (cfg.seasonalLow.includes(month)) {
      qty = Math.max(1, Math.floor(qty * 0.7));
    }

    // Add natural variance
    qty = Math.max(1, qty + rngInt(-2, 2));

    salesCounter++;
    salesData.push({
      id: salesId(salesCounter),
      hotel_id: HOTEL_ID,
      recipe_id: recipeId(cfg.recipeIdx),
      sale_date: dateStr(saleDate),
      quantity_sold: qty,
      unit_price: cfg.unitPrice,
      source: 'csv_import' as const,
      notes: null,
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 10. STAFF MEMBERS (8) + SHIFTS (30 days)
// ══════════════════════════════════════════════════════════════════════════════
const staffMembers = [
  { id: staffId(1), hotel_id: HOTEL_ID, full_name: 'Israel Ramos', role: 'head_chef', contract_type: 'full_time', hourly_cost: 28.00, phone: '+34 600 100 100', is_active: true },
  { id: staffId(2), hotel_id: HOTEL_ID, full_name: 'Ana López', role: 'sous_chef', contract_type: 'full_time', hourly_cost: 22.00, phone: '+34 600 200 200', is_active: true },
  { id: staffId(3), hotel_id: HOTEL_ID, full_name: 'Carlos Méndez', role: 'cook', contract_type: 'full_time', hourly_cost: 16.00, phone: '+34 600 300 300', is_active: true },
  { id: staffId(4), hotel_id: HOTEL_ID, full_name: 'Marta Fernández', role: 'cook', contract_type: 'full_time', hourly_cost: 16.00, phone: '+34 600 400 400', is_active: true },
  { id: staffId(5), hotel_id: HOTEL_ID, full_name: 'Pablo Vázquez', role: 'pastry', contract_type: 'full_time', hourly_cost: 18.00, phone: '+34 600 500 500', is_active: true },
  { id: staffId(6), hotel_id: HOTEL_ID, full_name: 'Lucía Torres', role: 'waiter', contract_type: 'full_time', hourly_cost: 14.00, phone: '+34 600 600 600', is_active: true },
  { id: staffId(7), hotel_id: HOTEL_ID, full_name: 'Diego Romero', role: 'waiter', contract_type: 'part_time', hourly_cost: 14.00, phone: '+34 600 700 700', is_active: true },
  { id: staffId(8), hotel_id: HOTEL_ID, full_name: 'Elena Piñeiro', role: 'bartender', contract_type: 'full_time', hourly_cost: 16.00, phone: '+34 600 800 800', is_active: true },
];

// Shift patterns
const shiftPatterns: Record<string, { start: string; end: string; breakMin: number }[]> = {
  head_chef: [{ start: '09:00', end: '17:00', breakMin: 30 }],
  sous_chef: [{ start: '10:00', end: '18:00', breakMin: 30 }],
  cook: [
    { start: '09:00', end: '17:00', breakMin: 30 },
    { start: '16:00', end: '00:00', breakMin: 30 },
  ],
  pastry: [{ start: '07:00', end: '15:00', breakMin: 30 }],
  waiter: [
    { start: '12:00', end: '16:30', breakMin: 15 },
    { start: '19:00', end: '23:30', breakMin: 15 },
  ],
  bartender: [{ start: '18:00', end: '02:00', breakMin: 30 }],
};

let shiftCounter = 0;
const staffShifts: any[] = [];

for (let day = 0; day < 30; day++) {
  const shiftDate = addDays(TODAY, -day);
  const dow = shiftDate.getDay();

  for (const staff of staffMembers) {
    // Part-time works only weekends
    if (staff.contract_type === 'part_time' && dow >= 1 && dow <= 4) continue;

    // Everyone gets 1 day off per week (based on staff index)
    const dayOff = (parseInt(staff.id.slice(-1)) + 1) % 7;
    if (dow === dayOff) continue;

    const patterns = shiftPatterns[staff.role] || shiftPatterns.cook;
    const pattern = patterns[day % patterns.length];

    shiftCounter++;
    staffShifts.push({
      id: shiftId(shiftCounter),
      hotel_id: HOTEL_ID,
      staff_id: staff.id,
      shift_date: dateStr(shiftDate),
      start_time: pattern.start,
      end_time: pattern.end,
      break_min: pattern.breakMin,
      status: 'completed',
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 11. RESERVATIONS (40) — next 2 weeks + last 2 weeks
// ══════════════════════════════════════════════════════════════════════════════
const reservationNames = [
  { name: 'Familia García Fernández', phone: '+34 981 234 567', size: 6, vip: false, group: true, notes: 'Cumpleaños madre' },
  { name: 'Eduardo Martínez', phone: '+34 600 111 222', size: 2, vip: true, group: false, notes: 'Alergia mariscos' },
  { name: 'Grupo Inditex', phone: '+34 981 345 678', size: 16, vip: true, group: true, notes: 'Comida departamento — menú cerrado' },
  { name: 'Ana Belén Costa', phone: '+34 600 222 333', size: 4, vip: false, group: false, notes: null },
  { name: 'Bodega Zárate', phone: '+34 986 444 555', size: 10, vip: true, group: true, notes: 'Cena maridaje Albariño' },
  { name: 'Pablo Vidal', phone: '+34 600 333 444', size: 2, vip: false, group: false, notes: null },
  { name: 'Familia López Rodríguez', phone: '+34 981 456 789', size: 12, vip: false, group: true, notes: 'Comunión — menú infantil x4' },
  { name: 'María del Carmen Díaz', phone: '+34 600 444 555', size: 6, vip: false, group: false, notes: 'Mesa ventana si posible' },
  { name: 'Boda Rodríguez-Pérez', phone: '+34 981 567 890', size: 8, vip: true, group: true, notes: 'Cena ensayo boda — menú degustación' },
  { name: 'Antonio Fragoso', phone: '+34 600 555 666', size: 3, vip: false, group: false, notes: 'Vegano 1 persona' },
  { name: 'Concello de A Coruña', phone: '+34 981 184 000', size: 20, vip: true, group: true, notes: 'Evento institucional — protocolo' },
  { name: 'Carlos Muñoz', phone: '+34 600 666 777', size: 2, vip: false, group: false, notes: null },
  { name: 'Restaurante Abastos 2.0', phone: '+34 981 200 400', size: 4, vip: true, group: false, notes: 'Cena colegas sector hostelería' },
  { name: 'Familia Sánchez Pardo', phone: '+34 981 678 901', size: 8, vip: false, group: true, notes: 'Aniversario bodas de plata' },
  { name: 'Laura Vázquez', phone: '+34 600 777 888', size: 2, vip: false, group: false, notes: null },
  { name: 'Estrella Galicia Eventos', phone: '+34 981 901 100', size: 12, vip: true, group: true, notes: 'Presentación producto — maridaje cerveza' },
  { name: 'José Manuel Otero', phone: '+34 600 888 999', size: 5, vip: false, group: false, notes: 'Celíaco 1 persona' },
  { name: 'Colegio Oficial Arquitectos', phone: '+34 981 350 200', size: 15, vip: false, group: true, notes: 'Almuerzo networking' },
  { name: 'Fernando Lema', phone: '+34 600 999 000', size: 2, vip: false, group: false, notes: null },
  { name: 'Marta Iglesias', phone: '+34 600 000 111', size: 3, vip: false, group: false, notes: 'Silla bebé necesaria' },
  { name: 'Grupo Abanca', phone: '+34 981 185 000', size: 18, vip: true, group: true, notes: 'Comida ejecutiva trimestral' },
  { name: 'Raquel Domínguez', phone: '+34 600 112 233', size: 2, vip: false, group: false, notes: null },
  { name: 'Familia Rivas Pena', phone: '+34 981 789 012', size: 7, vip: false, group: true, notes: 'Bautizo — tarta traen ellos' },
  { name: 'Alberto Varela', phone: '+34 600 223 344', size: 4, vip: true, group: false, notes: 'Cliente habitual — mesa preferida 6' },
  { name: 'UDC Facultad Económicas', phone: '+34 981 167 000', size: 10, vip: false, group: true, notes: 'Cena fin de curso' },
  { name: 'Ignacio Rivera', phone: '+34 600 334 455', size: 2, vip: true, group: false, notes: 'Discreción' },
  { name: 'Carmen Oubiña', phone: '+34 600 445 566', size: 3, vip: false, group: false, notes: null },
  { name: 'Familia Costas Blanco', phone: '+34 981 890 123', size: 6, vip: false, group: true, notes: null },
  { name: 'Club Deportivo Riazor', phone: '+34 981 229 210', size: 14, vip: true, group: true, notes: 'Comida post-partido — cerveza patrocinio' },
  { name: 'Patricia Neira', phone: '+34 600 556 677', size: 2, vip: false, group: false, notes: 'Aniversario — pedir tarta sorpresa' },
  { name: 'Xosé Rodríguez', phone: '+34 600 667 788', size: 4, vip: false, group: false, notes: null },
  { name: 'Turismo de Galicia', phone: '+34 981 546 300', size: 8, vip: true, group: true, notes: 'Periodistas gastronómicos — prensa' },
  { name: 'Sofía Blanco', phone: '+34 600 778 899', size: 2, vip: false, group: false, notes: null },
  { name: 'Familia Piñeiro Castro', phone: '+34 981 901 234', size: 9, vip: false, group: true, notes: 'Jubilación padre — menú especial' },
  { name: 'Roberto Paz', phone: '+34 600 889 900', size: 3, vip: false, group: false, notes: 'Intolerancia lactosa 2 personas' },
  { name: 'Fundación Barrié', phone: '+34 981 222 600', size: 12, vip: true, group: true, notes: 'Cena gala benéfica' },
  { name: 'Lucía Bama', phone: '+34 600 990 011', size: 2, vip: false, group: false, notes: null },
  { name: 'Gadisa Alimentación', phone: '+34 981 633 000', size: 6, vip: true, group: true, notes: 'Reunión proveedores' },
  { name: 'David Sánchez', phone: '+34 600 001 122', size: 4, vip: false, group: false, notes: null },
  { name: 'Asociación Hostelería Coruña', phone: '+34 981 254 300', size: 20, vip: true, group: true, notes: 'Asamblea anual — cocktail + cena' },
];

const reservationTimes = ['13:30', '14:00', '14:30', '20:30', '21:00', '21:30', '22:00'];
const reservationStatuses = ['confirmed', 'confirmed', 'confirmed', 'confirmed', 'pending', 'cancelled'];
const reservationSources = ['phone', 'web', 'phone', 'manual', 'web'];

const reservations = reservationNames.map((r, i) => {
  // Spread across -14 to +14 days
  const dayOffset = Math.floor(-14 + (i / reservationNames.length) * 28);
  const resDate = addDays(TODAY, dayOffset);
  return {
    id: reservationId(i + 1),
    hotel_id: HOTEL_ID,
    contact_name: r.name,
    contact_phone: r.phone,
    party_size: r.size,
    reservation_date: dateStr(resDate),
    reservation_time: reservationTimes[i % reservationTimes.length],
    duration_min: r.group ? 180 : 90,
    status: dayOffset < 0 ? (rng() > 0.1 ? 'completed' : 'no_show') : pick(reservationStatuses),
    source: pick(reservationSources),
    is_vip: r.vip,
    is_group: r.group,
    notes: r.notes,
  };
});

// ══════════════════════════════════════════════════════════════════════════════
// ERROR_TEST: NIF malformado — update 2 suppliers with bad tax_id
// ══════════════════════════════════════════════════════════════════════════════
// We'll track which suppliers need malformed NIFs for the error test
const malformedNIFSuppliers = [
  { id: supplierId(3), bad_tax_id: '36298745B' },  // ERROR_TEST: NIF malformado (letra al final en vez de al principio)
  { id: supplierId(7), bad_tax_id: 'XX15234567' },  // ERROR_TEST: NIF malformado (prefijo inválido)
];

// ══════════════════════════════════════════════════════════════════════════════
// INSERT functions
// ══════════════════════════════════════════════════════════════════════════════

async function insertBatch(table: string, rows: any[], batchSize = 100): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  Error inserting into ${table} (batch ${i}):`, error.message);
      // Try one by one on error
      for (const row of batch) {
        const { error: singleError } = await supabase.from(table).upsert(row, { onConflict: 'id' });
        if (singleError) {
          console.error(`    Single insert error (${table}, id=${row.id}):`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

async function seed() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  RestoOS — Synthetic Data Seed                  ║');
  console.log('║  Culuca Cociña-Bar, A Coruña                    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  const totals: Record<string, number> = {};

  // 1. Suppliers
  console.log('1. Inserting suppliers...');
  totals.suppliers = await insertBatch('suppliers', suppliers);
  console.log(`   ✓ ${totals.suppliers} suppliers`);

  // Apply malformed NIFs ERROR_TEST
  for (const m of malformedNIFSuppliers) {
    await supabase.from('suppliers').update({ tax_id: m.bad_tax_id }).eq('id', m.id);
  }
  console.log(`   ⚠ 2 suppliers with malformed NIF (ERROR_TEST)`);

  // 2. Products
  console.log('2. Inserting products...');
  totals.products = await insertBatch('products', products);
  console.log(`   ✓ ${totals.products} products`);

  // 3. Supplier Offers
  console.log('3. Inserting supplier offers...');
  totals.supplier_offers = await insertBatch('supplier_offers', supplierOffers);
  console.log(`   ✓ ${totals.supplier_offers} supplier offers`);

  // 4. Product Aliases
  console.log('4. Inserting product aliases...');
  totals.product_aliases = await insertBatch('product_aliases', productAliases);
  console.log(`   ✓ ${totals.product_aliases} product aliases`);

  // 5. Recipes
  console.log('5. Inserting recipes...');
  totals.recipes = await insertBatch('recipes', recipes);
  console.log(`   ✓ ${totals.recipes} recipes`);

  // 6. Recipe Ingredients
  console.log('6. Inserting recipe ingredients...');
  totals.recipe_ingredients = await insertBatch('recipe_ingredients', recipeIngredients);
  console.log(`   ✓ ${totals.recipe_ingredients} recipe ingredients`);

  // 7. Purchase Orders
  console.log('7. Inserting purchase orders...');
  totals.purchase_orders = await insertBatch('purchase_orders', purchaseOrders);
  console.log(`   ✓ ${totals.purchase_orders} purchase orders`);

  // 8. Purchase Order Lines
  console.log('8. Inserting purchase order lines...');
  totals.purchase_order_lines = await insertBatch('purchase_order_lines', purchaseOrderLines);
  console.log(`   ✓ ${totals.purchase_order_lines} purchase order lines`);

  // 9. Goods Receipts
  console.log('9. Inserting goods receipts...');
  totals.goods_receipts = await insertBatch('goods_receipts', goodsReceipts);
  console.log(`   ✓ ${totals.goods_receipts} goods receipts`);

  // 10. Goods Receipt Lines
  console.log('10. Inserting goods receipt lines...');
  totals.goods_receipt_lines = await insertBatch('goods_receipt_lines', goodsReceiptLines);
  console.log(`   ✓ ${totals.goods_receipt_lines} goods receipt lines`);

  // 11. Check Templates
  console.log('11. Inserting check templates...');
  totals.check_templates = await insertBatch('check_templates', checkTemplates);
  console.log(`   ✓ ${totals.check_templates} check templates`);

  // 12. Check Records
  console.log('12. Inserting check records...');
  totals.check_records = await insertBatch('check_records', checkRecords);
  console.log(`   ✓ ${totals.check_records} check records`);

  // 13. Sales Data
  console.log('13. Inserting sales data...');
  totals.sales_data = await insertBatch('sales_data', salesData);
  console.log(`   ✓ ${totals.sales_data} sales records`);

  // 14. Staff Members
  console.log('14. Inserting staff members...');
  totals.staff_members = await insertBatch('staff_members', staffMembers);
  console.log(`   ✓ ${totals.staff_members} staff members`);

  // 15. Staff Shifts
  console.log('15. Inserting staff shifts...');
  totals.staff_shifts = await insertBatch('staff_shifts', staffShifts);
  console.log(`   ✓ ${totals.staff_shifts} staff shifts`);

  // 16. Reservations
  console.log('16. Inserting reservations...');
  totals.reservations = await insertBatch('reservations', reservations);
  console.log(`   ✓ ${totals.reservations} reservations`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                        ║');
  console.log('╠══════════════════════════════════════════════════╣');
  const totalRecords = Object.values(totals).reduce((a, b) => a + b, 0);
  for (const [table, count] of Object.entries(totals)) {
    console.log(`║  ${table.padEnd(25)} ${String(count).padStart(6)}   ║`);
  }
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  TOTAL RECORDS              ${String(totalRecords).padStart(6)}   ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  DELIBERATE ERRORS (ERROR_TEST):                ║');
  console.log('║    3x precio inflado (PO lines)                 ║');
  console.log('║    3x cantidad incorrecta (PO/GR mismatch)      ║');
  console.log('║    2x NIF malformado (suppliers)                 ║');
  console.log('║    5x temperatura fuera de rango (check records) ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Est. tokens per agent context: ~15K-25K        ║');
  console.log('╚══════════════════════════════════════════════════╝');
}

// ══════════════════════════════════════════════════════════════════════════════
// ROLLBACK — delete all 5eed0000 data
// ══════════════════════════════════════════════════════════════════════════════
async function rollback() {
  console.log('Rolling back all 5eed0000 data...');

  // Delete in reverse FK order
  const tables = [
    { table: 'goods_receipt_lines', prefix: '5eed0000-000A' },
    { table: 'goods_receipts', prefix: '5eed0000-0009' },
    { table: 'purchase_order_lines', prefix: '5eed0000-0008' },
    { table: 'purchase_orders', prefix: '5eed0000-0007' },
    { table: 'check_records', prefix: '5eed0000-000C' },
    { table: 'check_templates', prefix: '5eed0000-000B' },
    { table: 'sales_data', prefix: '5eed0000-000D' },
    { table: 'staff_shifts', prefix: '5eed0000-000F' },
    { table: 'staff_members', prefix: '5eed0000-000E' },
    { table: 'reservations', prefix: '5eed0000-0010' },
    { table: 'recipe_ingredients', prefix: '5eed0000-0006' },
    { table: 'recipes', prefix: '5eed0000-0005' },
    { table: 'product_aliases', prefix: '5eed0000-0004' },
    { table: 'supplier_offers', prefix: '5eed0000-0003' },
    { table: 'products', prefix: '5eed0000-0002' },
    { table: 'suppliers', prefix: '5eed0000-0001' },
  ];

  for (const { table, prefix } of tables) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .like('id', `${prefix}%`);
    if (error) {
      console.error(`  Error deleting from ${table}:`, error.message);
    } else {
      console.log(`  Deleted ${count ?? '?'} rows from ${table}`);
    }
  }

  console.log('Rollback complete.');
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT — save all data as JSON
// ══════════════════════════════════════════════════════════════════════════════
async function exportToJson() {
  const outputDir = path.resolve(__dirname, 'seed-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const datasets: Record<string, any[]> = {
    suppliers,
    products,
    supplier_offers: supplierOffers,
    product_aliases: productAliases,
    recipes,
    recipe_ingredients: recipeIngredients,
    purchase_orders: purchaseOrders,
    purchase_order_lines: purchaseOrderLines,
    goods_receipts: goodsReceipts,
    goods_receipt_lines: goodsReceiptLines,
    check_templates: checkTemplates,
    check_records: checkRecords,
    sales_data: salesData,
    staff_members: staffMembers,
    staff_shifts: staffShifts,
    reservations,
  };

  for (const [name, data] of Object.entries(datasets)) {
    const filePath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  Exported ${data.length} rows to ${filePath}`);
  }

  console.log(`\nAll data exported to ${outputDir}`);
}

// ══════════════════════════════════════════════════════════════════════════════
// CLI entrypoint
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--rollback')) {
    await rollback();
  } else if (args.includes('--export')) {
    await exportToJson();
  } else {
    await seed();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
