-- =============================================================================
-- Migration: M2 — Recetas y Menús
-- Module: D2 — Recipes, ingredients, steps, versions, menu sections
-- =============================================================================

-- 1. ALTER MENUS (extend stub from M1)
alter table menus
  add column if not exists target_food_cost_pct numeric(5,2),
  add column if not exists notes text,
  add column if not exists total_cost numeric(14,2);

comment on table menus is 'Full menu definitions with sections and recipes';

-- 2. MENU SECTIONS
create table if not exists menu_sections (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references menus(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_menu_sections_menu on menu_sections (menu_id, sort_order);

create trigger trg_menu_sections_updated_at
  before update on menu_sections
  for each row execute function update_updated_at();

alter table menu_sections enable row level security;

create policy "menu_sections_select" on menu_sections for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "menu_sections_insert" on menu_sections for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "menu_sections_update" on menu_sections for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "menu_sections_delete" on menu_sections for delete
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table menu_sections is 'Sections within a menu (e.g., starters, mains, desserts)';

-- 3. RECIPES
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  description text,
  category text,
  servings integer not null default 1 check (servings > 0),
  prep_time_min integer,
  cook_time_min integer,
  status text not null default 'draft'
    check (status in ('draft', 'review_pending', 'approved', 'deprecated', 'archived')),
  version integer not null default 1,
  total_cost numeric(14,2),
  cost_per_serving numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_recipes_hotel_status on recipes (hotel_id, status);
create index idx_recipes_hotel_name on recipes (hotel_id, name);

create trigger trg_recipes_updated_at
  before update on recipes
  for each row execute function update_updated_at();

alter table recipes enable row level security;

create policy "recipes_select" on recipes for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "recipes_insert" on recipes for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "recipes_update" on recipes for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table recipes is 'Recipes with state machine lifecycle and cost tracking';

-- 4. RECIPE INGREDIENTS
create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  unit_id uuid references units_of_measure(id),
  quantity numeric(14,3) not null check (quantity > 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_recipe_ingredients_recipe on recipe_ingredients (recipe_id, sort_order);
create index idx_recipe_ingredients_product on recipe_ingredients (hotel_id, product_id);

alter table recipe_ingredients enable row level security;

create policy "recipe_ingredients_select" on recipe_ingredients for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "recipe_ingredients_insert" on recipe_ingredients for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "recipe_ingredients_update" on recipe_ingredients for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "recipe_ingredients_delete" on recipe_ingredients for delete
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table recipe_ingredients is 'Ingredients linked to catalog products with quantities';

-- 5. RECIPE STEPS
create table if not exists recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete restrict,
  step_number integer not null,
  instruction text not null,
  duration_min integer,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_recipe_steps_recipe on recipe_steps (recipe_id, step_number);

alter table recipe_steps enable row level security;

create policy "recipe_steps_select" on recipe_steps for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "recipe_steps_insert" on recipe_steps for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "recipe_steps_update" on recipe_steps for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "recipe_steps_delete" on recipe_steps for delete
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table recipe_steps is 'Ordered preparation steps for recipes';

-- 6. RECIPE VERSIONS (immutable snapshots)
create table if not exists recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete restrict,
  version integer not null,
  snapshot_json jsonb not null,
  changed_by uuid references auth.users(id),
  change_reason text,
  created_at timestamptz not null default now()
);

create index idx_recipe_versions_recipe on recipe_versions (recipe_id, version desc);

alter table recipe_versions enable row level security;

create policy "recipe_versions_select" on recipe_versions for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table recipe_versions is 'Immutable version history for recipes';

-- 7. MENU SECTION RECIPES (links sections to recipes)
create table if not exists menu_section_recipes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references menu_sections(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete restrict,
  recipe_id uuid not null references recipes(id) on delete restrict,
  servings_override integer,
  price numeric(14,2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_menu_section_recipes_section on menu_section_recipes (section_id, sort_order);

alter table menu_section_recipes enable row level security;

create policy "menu_section_recipes_select" on menu_section_recipes for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "menu_section_recipes_insert" on menu_section_recipes for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "menu_section_recipes_update" on menu_section_recipes for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "menu_section_recipes_delete" on menu_section_recipes for delete
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table menu_section_recipes is 'Recipes assigned to menu sections with pricing';
