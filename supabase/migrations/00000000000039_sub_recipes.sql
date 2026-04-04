-- Sub-recipes: allow recipe_ingredients to reference another recipe
-- instead of (or in addition to) a product.
-- Example: "Arroz de bogavante" uses "Sofrito" (sub-recipe) + "Caldo de bogavante" (sub-recipe)

-- 1. Make product_id nullable (sub-recipe lines don't have a product)
ALTER TABLE recipe_ingredients ALTER COLUMN product_id DROP NOT NULL;

-- 2. Add sub_recipe_id column
ALTER TABLE recipe_ingredients
  ADD COLUMN sub_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

-- 3. Constraint: exactly one of product_id or sub_recipe_id must be set
ALTER TABLE recipe_ingredients
  ADD CONSTRAINT ingredient_type_check
  CHECK (
    (product_id IS NOT NULL AND sub_recipe_id IS NULL) OR
    (product_id IS NULL AND sub_recipe_id IS NOT NULL)
  );

-- 4. Prevent self-referencing (recipe can't use itself as sub-recipe)
ALTER TABLE recipe_ingredients
  ADD CONSTRAINT no_self_reference
  CHECK (sub_recipe_id IS DISTINCT FROM recipe_id);

-- 5. Index for querying "which recipes use this sub-recipe"
CREATE INDEX idx_recipe_ingredients_sub_recipe ON recipe_ingredients(sub_recipe_id)
  WHERE sub_recipe_id IS NOT NULL;

-- 6. Comment
COMMENT ON COLUMN recipe_ingredients.sub_recipe_id IS
  'References another recipe used as sub-recipe (e.g., sofrito, caldo). Mutually exclusive with product_id.';
