-- Add is_sub_recipe flag to recipes table
-- Sub-recipes are bases/components (sofrito, caldo, bechamel) that don't sell directly
-- but are used as ingredients in other recipes.

ALTER TABLE recipes ADD COLUMN is_sub_recipe BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering
CREATE INDEX idx_recipes_is_sub_recipe ON recipes(hotel_id, is_sub_recipe);

-- Mark existing sub-recipes (category = 'Base')
UPDATE recipes SET is_sub_recipe = true WHERE category = 'Base';

COMMENT ON COLUMN recipes.is_sub_recipe IS
  'True for base recipes (sofrito, caldo, salsa) used as ingredients in other recipes. False for sellable dishes.';
