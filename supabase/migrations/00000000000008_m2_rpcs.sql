-- =============================================================================
-- Migration: M2 RPCs — Recipes & Menus
-- =============================================================================

-- 1. CREATE RECIPE
create or replace function create_recipe(
  p_hotel_id uuid,
  p_name text,
  p_description text default null,
  p_category text default null,
  p_servings integer default 1,
  p_prep_time_min integer default null,
  p_cook_time_min integer default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipe_id uuid;
begin
  -- Validate access
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  insert into recipes (hotel_id, name, description, category, servings, prep_time_min, cook_time_min, notes, created_by)
  values (p_hotel_id, p_name, p_description, p_category, p_servings, p_prep_time_min, p_cook_time_min, p_notes, v_user_id)
  returning id into v_recipe_id;

  -- Audit
  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'create', 'recipe', v_recipe_id,
    jsonb_build_object('name', p_name, 'category', p_category, 'servings', p_servings));

  return jsonb_build_object('recipe_id', v_recipe_id, 'status', 'draft');
end;
$$;

-- 2. UPDATE RECIPE (bumps version + snapshot)
create or replace function update_recipe(
  p_hotel_id uuid,
  p_recipe_id uuid,
  p_name text default null,
  p_description text default null,
  p_category text default null,
  p_servings integer default null,
  p_prep_time_min integer default null,
  p_cook_time_min integer default null,
  p_notes text default null,
  p_change_reason text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipe recipes%rowtype;
  v_new_version integer;
begin
  -- Validate access
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_recipe from recipes where id = p_recipe_id and hotel_id = p_hotel_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- Only draft or review_pending can be edited
  if v_recipe.status not in ('draft', 'review_pending') then
    raise exception 'INVALID_STATE';
  end if;

  -- Snapshot current version
  v_new_version := v_recipe.version + 1;
  insert into recipe_versions (recipe_id, hotel_id, version, snapshot_json, changed_by, change_reason)
  values (p_recipe_id, p_hotel_id, v_recipe.version, to_jsonb(v_recipe), v_user_id, p_change_reason);

  -- Update
  update recipes set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    category = coalesce(p_category, category),
    servings = coalesce(p_servings, servings),
    prep_time_min = coalesce(p_prep_time_min, prep_time_min),
    cook_time_min = coalesce(p_cook_time_min, cook_time_min),
    notes = coalesce(p_notes, notes),
    version = v_new_version
  where id = p_recipe_id;

  -- Audit
  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'update', 'recipe', p_recipe_id,
    jsonb_build_object('version', v_new_version, 'change_reason', p_change_reason));

  return jsonb_build_object('recipe_id', p_recipe_id, 'version', v_new_version);
end;
$$;

-- 3. SUBMIT RECIPE FOR REVIEW
create or replace function submit_recipe_for_review(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipe recipes%rowtype;
  v_ingredient_count integer;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_recipe from recipes where id = p_recipe_id and hotel_id = p_hotel_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_recipe.status != 'draft' then raise exception 'INVALID_STATE'; end if;

  -- Must have at least one ingredient
  select count(*) into v_ingredient_count from recipe_ingredients where recipe_id = p_recipe_id;
  if v_ingredient_count = 0 then
    raise exception 'MISSING_REQUIRED_DATA';
  end if;

  update recipes set status = 'review_pending' where id = p_recipe_id;

  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'submit_for_review', 'recipe', p_recipe_id,
    jsonb_build_object('ingredient_count', v_ingredient_count));

  return jsonb_build_object('recipe_id', p_recipe_id, 'status', 'review_pending');
end;
$$;

-- 4. APPROVE RECIPE
create or replace function approve_recipe(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipe recipes%rowtype;
  v_role text;
begin
  select role into v_role from memberships
  where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true;
  if v_role is null then raise exception 'ACCESS_DENIED'; end if;

  -- Only head_chef, direction, or admin can approve
  if v_role not in ('head_chef', 'direction', 'admin', 'superadmin') then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_recipe from recipes where id = p_recipe_id and hotel_id = p_hotel_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_recipe.status != 'review_pending' then raise exception 'INVALID_STATE'; end if;

  update recipes set status = 'approved' where id = p_recipe_id;

  -- Domain event
  insert into domain_events (hotel_id, event_type, entity_type, entity_id, payload)
  values (p_hotel_id, 'recipe.approved', 'recipe', p_recipe_id,
    jsonb_build_object('recipe_name', v_recipe.name, 'version', v_recipe.version));


  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'approve', 'recipe', p_recipe_id,
    jsonb_build_object('status', 'approved'));

  return jsonb_build_object('recipe_id', p_recipe_id, 'status', 'approved');
end;
$$;

-- 5. DEPRECATE RECIPE
create or replace function deprecate_recipe(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipe recipes%rowtype;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_recipe from recipes where id = p_recipe_id and hotel_id = p_hotel_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_recipe.status != 'approved' then raise exception 'INVALID_STATE'; end if;

  update recipes set status = 'deprecated' where id = p_recipe_id;

  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'deprecate', 'recipe', p_recipe_id,
    jsonb_build_object('status', 'deprecated'));

  return jsonb_build_object('recipe_id', p_recipe_id, 'status', 'deprecated');
end;
$$;

-- 6. CALCULATE RECIPE COST
create or replace function calculate_recipe_cost(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipe recipes%rowtype;
  v_total_cost numeric(14,2) := 0;
  v_cost_per_serving numeric(14,2);
  v_ingredient record;
  v_unit_price numeric(14,4);
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_recipe from recipes where id = p_recipe_id and hotel_id = p_hotel_id;
  if not found then raise exception 'NOT_FOUND'; end if;

  -- Sum ingredient costs using preferred supplier offers
  for v_ingredient in
    select ri.quantity, ri.product_id, ri.unit_id
    from recipe_ingredients ri
    where ri.recipe_id = p_recipe_id
  loop
    select so.unit_price into v_unit_price
    from supplier_offers so
    where so.product_id = v_ingredient.product_id
      and so.hotel_id = p_hotel_id
      and so.is_preferred = true
      and so.is_active = true
    limit 1;

    if v_unit_price is not null then
      v_total_cost := v_total_cost + (v_ingredient.quantity * v_unit_price);
    end if;
  end loop;

  v_cost_per_serving := case when v_recipe.servings > 0
    then round(v_total_cost / v_recipe.servings, 2) else 0 end;

  -- Update recipe with calculated costs
  update recipes set
    total_cost = v_total_cost,
    cost_per_serving = v_cost_per_serving
  where id = p_recipe_id;

  return jsonb_build_object(
    'recipe_id', p_recipe_id,
    'total_cost', v_total_cost,
    'cost_per_serving', v_cost_per_serving,
    'servings', v_recipe.servings
  );
end;
$$;

-- 7. CALCULATE MENU COST
create or replace function calculate_menu_cost(
  p_hotel_id uuid,
  p_menu_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_total_cost numeric(14,2) := 0;
  v_section_recipe record;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  if not exists (select 1 from menus where id = p_menu_id and hotel_id = p_hotel_id) then
    raise exception 'NOT_FOUND';
  end if;

  -- Sum cost_per_serving of all recipes in menu
  for v_section_recipe in
    select msr.recipe_id, r.cost_per_serving
    from menu_section_recipes msr
    join menu_sections ms on ms.id = msr.section_id
    join recipes r on r.id = msr.recipe_id
    where ms.menu_id = p_menu_id
  loop
    v_total_cost := v_total_cost + coalesce(v_section_recipe.cost_per_serving, 0);
  end loop;

  update menus set total_cost = v_total_cost where id = p_menu_id;

  return jsonb_build_object(
    'menu_id', p_menu_id,
    'total_cost', v_total_cost
  );
end;
$$;

-- 8. GET RECIPE TECH SHEET
create or replace function get_recipe_tech_sheet(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipe jsonb;
  v_ingredients jsonb;
  v_steps jsonb;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select to_jsonb(r) into v_recipe
  from recipes r where r.id = p_recipe_id and r.hotel_id = p_hotel_id;
  if v_recipe is null then raise exception 'NOT_FOUND'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', ri.id,
      'product_name', p.name,
      'product_id', ri.product_id,
      'quantity', ri.quantity,
      'unit_name', u.name,
      'unit_abbreviation', u.abbreviation,
      'unit_price', so.unit_price,
      'line_cost', round(ri.quantity * coalesce(so.unit_price, 0), 2),
      'notes', ri.notes
    ) order by ri.sort_order
  ), '[]'::jsonb)
  into v_ingredients
  from recipe_ingredients ri
  join products p on p.id = ri.product_id
  left join units_of_measure u on u.id = ri.unit_id
  left join supplier_offers so on so.product_id = ri.product_id
    and so.hotel_id = p_hotel_id and so.is_preferred = true and so.is_active = true
  where ri.recipe_id = p_recipe_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'step_number', rs.step_number,
      'instruction', rs.instruction,
      'duration_min', rs.duration_min,
      'notes', rs.notes
    ) order by rs.step_number
  ), '[]'::jsonb)
  into v_steps
  from recipe_steps rs where rs.recipe_id = p_recipe_id;

  return jsonb_build_object(
    'recipe', v_recipe,
    'ingredients', v_ingredients,
    'steps', v_steps
  );
end;
$$;
