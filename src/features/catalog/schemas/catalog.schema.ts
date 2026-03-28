import { z } from "zod";

// --- Category ---
export const CategorySchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  name: z.string(),
  parent_id: z.string().uuid().nullable(),
  sort_order: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().optional(),
});
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// --- Unit of Measure ---
const unitTypes = ["weight", "volume", "unit", "length"] as const;

export const UnitSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  name: z.string(),
  abbreviation: z.string(),
  unit_type: z.enum(unitTypes),
  is_base: z.boolean(),
  conversion_factor: z.number(),
  base_unit_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Unit = z.infer<typeof UnitSchema>;

export const CreateUnitSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(50),
  abbreviation: z.string().min(1).max(10),
  unit_type: z.enum(unitTypes),
  is_base: z.boolean().optional(),
  conversion_factor: z.number().positive().optional(),
  base_unit_id: z.string().uuid().nullable().optional(),
});
export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;

// --- Product ---
export const ProductSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  name: z.string(),
  category_id: z.string().uuid().nullable(),
  default_unit_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  yield_percent: z.number().min(0).max(100).default(100), // 0-100 (85 = 15% waste/merma)
  allergens: z.array(z.string()),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().uuid().nullable(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CreateProductSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  category_id: z.string().uuid().nullable().optional(),
  default_unit_id: z.string().uuid().nullable().optional(),
  allergens: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// --- Supplier ---
export const SupplierSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  name: z.string(),
  contact_name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  tax_id: z.string().nullable(),
  is_active: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

export const CreateSupplierSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  contact_name: z.string().max(200).optional(),
  email: z.string().email("Email no válido").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  tax_id: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

// --- Supplier Offer ---
export const SupplierOfferSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  product_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  price: z.number(),
  min_order_qty: z.number().nullable(),
  lead_time_days: z.number().nullable(),
  is_preferred: z.boolean(),
  valid_from: z.string().nullable(),
  valid_until: z.string().nullable(),
});
export type SupplierOffer = z.infer<typeof SupplierOfferSchema>;

export const CreateOfferSchema = z.object({
  supplier_id: z.string().uuid(),
  product_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  price: z.number().positive("El precio debe ser positivo"),
  min_order_qty: z.number().positive().optional(),
  lead_time_days: z.number().int().positive().optional(),
  is_preferred: z.boolean().default(false),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
});
export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
