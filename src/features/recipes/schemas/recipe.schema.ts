import { z } from "zod";
import { RECIPE_STATUS } from "@/contracts/enums";

const recipeStatusValues = Object.values(RECIPE_STATUS) as [string, ...string[]];

// --- Recipe ---
export const RecipeSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  servings: z.number(),
  prep_time_min: z.number().nullable(),
  cook_time_min: z.number().nullable(),
  status: z.enum(recipeStatusValues),
  version: z.number(),
  total_cost: z.number().nullable(),
  cost_per_serving: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().uuid().nullable(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const CreateRecipeSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  servings: z.coerce.number({ message: "Raciones obligatorias" }).int().positive(),
  prep_time_min: z.preprocess((v) => (v === "" || Number.isNaN(v) ? undefined : v), z.coerce.number().int().positive().optional()),
  cook_time_min: z.preprocess((v) => (v === "" || Number.isNaN(v) ? undefined : v), z.coerce.number().int().positive().optional()),
  notes: z.string().max(2000).optional(),
});
export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;

export const UpdateRecipeSchema = CreateRecipeSchema.partial().extend({
  change_reason: z.string().optional(),
});
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;

// --- Recipe Ingredient ---
export const RecipeIngredientSchema = z.object({
  id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  product_id: z.string().uuid().nullable(),
  sub_recipe_id: z.string().uuid().nullable().optional(),
  sub_recipe_name: z.string().nullable().optional(),
  unit_id: z.string().uuid().nullable(),
  quantity: z.number(),
  notes: z.string().nullable(),
  sort_order: z.number(),
  created_at: z.string(),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

export const CreateIngredientSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  sub_recipe_id: z.string().uuid().nullable().optional(),
  unit_id: z.string().uuid().optional(),
  quantity: z.number({ error: "Cantidad obligatoria" }).positive(),
  notes: z.string().max(500).optional(),
}).refine(
  (d) => (d.product_id && !d.sub_recipe_id) || (!d.product_id && d.sub_recipe_id),
  { message: "Debe seleccionar un producto o una sub-receta" }
);
export type CreateIngredientInput = z.infer<typeof CreateIngredientSchema>;

// --- Recipe Step ---
export const RecipeStepSchema = z.object({
  id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  step_number: z.number(),
  instruction: z.string(),
  duration_min: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});
export type RecipeStep = z.infer<typeof RecipeStepSchema>;

export const CreateStepSchema = z.object({
  step_number: z.number().int().positive(),
  instruction: z.string().min(1, "La instrucción es obligatoria").max(2000),
  duration_min: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});
export type CreateStepInput = z.infer<typeof CreateStepSchema>;

// --- Menu (full) ---
export const MenuSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  menu_type: z.string().nullable(),
  status: z.string(),
  is_template: z.boolean(),
  version: z.number(),
  target_food_cost_pct: z.number().nullable(),
  notes: z.string().nullable(),
  total_cost: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().uuid().nullable(),
});
export type Menu = z.infer<typeof MenuSchema>;

export const CreateMenuSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  description: z.string().max(2000).optional(),
  menu_type: z.string().max(100).optional(),
  is_template: z.boolean().optional(),
  target_food_cost_pct: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateMenuInput = z.infer<typeof CreateMenuSchema>;

// --- Menu Section ---
export const MenuSectionSchema = z.object({
  id: z.string().uuid(),
  menu_id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  name: z.string(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MenuSection = z.infer<typeof MenuSectionSchema>;

export const CreateMenuSectionSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  sort_order: z.number().int().optional(),
});
export type CreateMenuSectionInput = z.infer<typeof CreateMenuSectionSchema>;

// --- Menu Section Recipe ---
export const MenuSectionRecipeSchema = z.object({
  id: z.string().uuid(),
  section_id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  servings_override: z.number().nullable(),
  price: z.number().nullable(),
  sort_order: z.number(),
  created_at: z.string(),
});
export type MenuSectionRecipe = z.infer<typeof MenuSectionRecipeSchema>;

// --- Menu Section with nested recipes (for engineering view) ---
export interface EngineeringRecipe {
  id: string;
  recipe_id: string;
  price: number | null;
  sort_order: number;
  recipes: {
    id: string;
    name: string;
    total_cost: number | null;
    cost_per_serving: number | null;
    category: string | null;
  } | null;
}

export interface MenuSectionWithRecipes {
  id: string;
  name: string;
  sort_order: number;
  menu_id: string;
  menu_section_recipes: EngineeringRecipe[];
}

// --- Tech Sheet (RPC response) ---
export const TechSheetIngredientSchema = z.object({
  id: z.string().uuid(),
  product_name: z.string(),
  product_id: z.string().uuid(),
  quantity: z.number(),
  unit_name: z.string().nullable(),
  unit_abbreviation: z.string().nullable(),
  unit_price: z.number().nullable(),
  line_cost: z.number(),
  notes: z.string().nullable(),
});
export type TechSheetIngredient = z.infer<typeof TechSheetIngredientSchema>;
