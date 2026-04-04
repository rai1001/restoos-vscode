import { createClient } from "@/lib/db/client";
import { RecipeSchema } from "../schemas/recipe.schema";
import { safeParse } from "@/lib/validation/safe-parse";
import type {
  Recipe,
  CreateRecipeInput,
  UpdateRecipeInput,
  CreateIngredientInput,
  CreateStepInput,
  RecipeIngredient,
  RecipeStep,
  Menu,
  CreateMenuInput,
  MenuSection,
  CreateMenuSectionInput,
  MenuSectionWithRecipes,
} from "../schemas/recipe.schema";

const supabase = createClient();

export const recipeService = {
  // --- Recipes ---
  async list(hotelId: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => safeParse(RecipeSchema, r, "recipeService.list"));
  },

  async getById(id: string): Promise<Recipe> {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(hotelId: string, input: CreateRecipeInput) {
    const { data, error } = await supabase.rpc("create_recipe", {
      p_hotel_id: hotelId,
      p_name: input.name,
      p_description: input.description ?? null,
      p_category: input.category ?? null,
      p_servings: input.servings,
      p_prep_time_min: input.prep_time_min ?? null,
      p_cook_time_min: input.cook_time_min ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) throw error;

    // Set is_sub_recipe flag if needed (RPC doesn't support it yet)
    if (input.is_sub_recipe && data?.recipe_id) {
      await supabase
        .from("recipes")
        .update({ is_sub_recipe: true })
        .eq("id", data.recipe_id);
    }

    return data;
  },

  async update(hotelId: string, recipeId: string, input: UpdateRecipeInput) {
    const { data, error } = await supabase.rpc("update_recipe", {
      p_hotel_id: hotelId,
      p_recipe_id: recipeId,
      p_name: input.name ?? null,
      p_description: input.description ?? null,
      p_category: input.category ?? null,
      p_servings: input.servings ?? null,
      p_prep_time_min: input.prep_time_min ?? null,
      p_cook_time_min: input.cook_time_min ?? null,
      p_notes: input.notes ?? null,
      p_change_reason: input.change_reason ?? null,
    });
    if (error) throw error;
    return data;
  },

  async submitForReview(hotelId: string, recipeId: string) {
    const { data, error } = await supabase.rpc("submit_recipe_for_review", {
      p_hotel_id: hotelId,
      p_recipe_id: recipeId,
    });
    if (error) throw error;
    return data;
  },

  async createQuickSubRecipe(hotelId: string, input: { name: string; servings: number; category?: string }) {
    // Create as draft
    const result = await this.create(hotelId, {
      name: input.name,
      servings: input.servings,
      category: input.category ?? "Base",
      description: `Sub-receta: ${input.name}`,
      is_sub_recipe: true,
    });

    // Auto-approve so it's immediately available as sub-recipe
    if (result?.recipe_id) {
      // Submit for review first, then approve
      try {
        await supabase.rpc("submit_recipe_for_review", {
          p_hotel_id: hotelId,
          p_recipe_id: result.recipe_id,
        });
      } catch { /* ignore if already in review */ }

      try {
        await supabase.rpc("approve_recipe", {
          p_hotel_id: hotelId,
          p_recipe_id: result.recipe_id,
        });
      } catch { /* ignore if approval fails - still usable as draft */ }
    }

    return result;
  },

  async approve(hotelId: string, recipeId: string) {
    const { data, error } = await supabase.rpc("approve_recipe", {
      p_hotel_id: hotelId,
      p_recipe_id: recipeId,
    });
    if (error) throw error;
    return data;
  },

  async deprecate(hotelId: string, recipeId: string) {
    const { data, error } = await supabase.rpc("deprecate_recipe", {
      p_hotel_id: hotelId,
      p_recipe_id: recipeId,
    });
    if (error) throw error;
    return data;
  },

  async calculateCost(hotelId: string, recipeId: string) {
    const { data, error } = await supabase.rpc("calculate_recipe_cost", {
      p_hotel_id: hotelId,
      p_recipe_id: recipeId,
    });
    if (error) throw error;
    return data;
  },

  async getTechSheet(hotelId: string, recipeId: string) {
    const { data, error } = await supabase.rpc("get_recipe_tech_sheet", {
      p_hotel_id: hotelId,
      p_recipe_id: recipeId,
    });
    if (error) throw error;
    return data;
  },

  // --- Ingredients ---
  async listIngredients(recipeId: string): Promise<RecipeIngredient[]> {
    const { data, error } = await supabase
      .from("recipe_ingredients")
      .select("*, sub_recipe:recipes!sub_recipe_id(id, name)")
      .eq("recipe_id", recipeId)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map((d) => ({
      ...d,
      sub_recipe_name: (d.sub_recipe as { name: string } | null)?.name ?? null,
    }));
  },

  async addIngredient(hotelId: string, recipeId: string, input: CreateIngredientInput) {
    const { data, error } = await supabase
      .from("recipe_ingredients")
      .insert({
        recipe_id: recipeId,
        hotel_id: hotelId,
        product_id: input.product_id ?? null,
        sub_recipe_id: input.sub_recipe_id ?? null,
        unit_id: input.unit_id ?? null,
        quantity: input.quantity,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeIngredient(ingredientId: string) {
    const { error } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("id", ingredientId);
    if (error) throw error;
  },

  // --- Steps ---
  async listSteps(recipeId: string): Promise<RecipeStep[]> {
    const { data, error } = await supabase
      .from("recipe_steps")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("step_number");
    if (error) throw error;
    return data ?? [];
  },

  async addStep(hotelId: string, recipeId: string, input: CreateStepInput) {
    const { data, error } = await supabase
      .from("recipe_steps")
      .insert({
        recipe_id: recipeId,
        hotel_id: hotelId,
        step_number: input.step_number,
        instruction: input.instruction,
        duration_min: input.duration_min ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeStep(stepId: string) {
    const { error } = await supabase
      .from("recipe_steps")
      .delete()
      .eq("id", stepId);
    if (error) throw error;
  },

  // --- Menus ---
  async listMenus(hotelId: string): Promise<Menu[]> {
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getMenuById(id: string): Promise<Menu> {
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async createMenu(hotelId: string, input: CreateMenuInput) {
    const { data, error } = await supabase
      .from("menus")
      .insert({
        hotel_id: hotelId,
        name: input.name,
        description: input.description ?? null,
        menu_type: input.menu_type ?? null,
        is_template: input.is_template ?? false,
        target_food_cost_pct: input.target_food_cost_pct ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async calculateMenuCost(hotelId: string, menuId: string) {
    const { data, error } = await supabase.rpc("calculate_menu_cost", {
      p_hotel_id: hotelId,
      p_menu_id: menuId,
    });
    if (error) throw error;
    return data;
  },

  // --- Menu Sections ---
  async listSections(menuId: string): Promise<MenuSection[]> {
    const { data, error } = await supabase
      .from("menu_sections")
      .select("*")
      .eq("menu_id", menuId)
      .order("sort_order");
    if (error) throw error;
    return data ?? [];
  },

  async addSection(hotelId: string, menuId: string, input: CreateMenuSectionInput) {
    const { data, error } = await supabase
      .from("menu_sections")
      .insert({
        menu_id: menuId,
        hotel_id: hotelId,
        name: input.name,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeSection(sectionId: string) {
    const { error } = await supabase
      .from("menu_sections")
      .delete()
      .eq("id", sectionId);
    if (error) throw error;
  },

  // --- Menu Section Recipes ---
  async addRecipeToSection(hotelId: string, sectionId: string, recipeId: string, price?: number) {
    const { data, error } = await supabase
      .from("menu_section_recipes")
      .insert({
        section_id: sectionId,
        hotel_id: hotelId,
        recipe_id: recipeId,
        price: price ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeRecipeFromSection(id: string) {
    const { error } = await supabase
      .from("menu_section_recipes")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getMenuSectionsWithRecipes(menuId: string): Promise<MenuSectionWithRecipes[]> {
    const { data, error } = await supabase
      .from("menu_sections")
      .select(
        `id, name, sort_order, menu_id,
         menu_section_recipes(id, recipe_id, price, sort_order,
           recipes(id, name, total_cost, cost_per_serving, category)
         )`
      )
      .eq("menu_id", menuId)
      .order("sort_order");
    if (error) throw error;
    // TODO: Add Zod schema validation when MenuSectionWithRecipesSchema is defined
    return (data ?? []) as unknown as MenuSectionWithRecipes[];
  },
};
