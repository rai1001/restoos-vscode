import { z } from "zod";

export const LocalIngredientSchema = z.object({
  id: z.string(), // temp local ID
  name: z.string().min(1, "Nombre requerido"),
  quantity: z.number().positive("Cantidad debe ser positiva"),
  unit: z.string().min(1, "Unidad requerida"),
  notes: z.string().optional(),
  product_id: z.string().uuid().optional(),
  sub_recipe_id: z.string().uuid().optional(),
});
export type LocalIngredient = z.infer<typeof LocalIngredientSchema>;

export const LocalStepSchema = z.object({
  id: z.string(),
  instruction: z.string().min(1, "Instrucción requerida"),
  duration_min: z.number().positive().optional(),
});
export type LocalStep = z.infer<typeof LocalStepSchema>;

export const FullRecipeFormSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().optional(),
  servings: z.number().int().positive().default(4),
  prep_time_min: z.number().int().positive().optional(),
  cook_time_min: z.number().int().positive().optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  ingredients: z.array(LocalIngredientSchema),
  steps: z.array(LocalStepSchema),
  photo_url: z.string().optional(),
});
export type FullRecipeForm = z.infer<typeof FullRecipeFormSchema>;

// OCR result type
export const OCRRecipeResultSchema = z.object({
  name: z.string(),
  category: z.string().nullable(),
  servings: z.number().nullable(),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })),
  steps: z.array(z.object({
    instruction: z.string(),
    duration_min: z.number().nullable(),
  })),
});
export type OCRRecipeResult = z.infer<typeof OCRRecipeResultSchema>;

// Excel import result
export const ParsedImportRecipeSchema = z.object({
  name: z.string().optional(),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
  })),
});
export type ParsedImportRecipe = z.infer<typeof ParsedImportRecipeSchema>;
