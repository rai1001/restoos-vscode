-- =============================================================================
-- Migration: M3 — Catalog RPCs
-- RPCs: upsert_product, upsert_supplier, set_preferred_offer,
--        search_products, match_product_by_alias, get_product_with_offers
-- =============================================================================

-- =============================================================================
-- RPC: upsert_product
-- Creates or updates a product with audit trail.
-- =============================================================================
create or replace function upsert_product(
  p_hotel_id uuid,
  p_product_id uuid default null,
  p_name text default null,
  p_category_id uuid default null,
  p_default_unit_id uuid default null,
  p_is_active boolean default true,
  p_allergens jsonb default '[]'::jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result_id uuid;
  v_is_update boolean := (p_product_id is not null);
  v_before record;
begin
  -- Validate access
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id
      and is_active = true
      and role in ('admin', 'direction', 'head_chef', 'procurement')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para gestionar productos';
  end if;

  if v_is_update then
    -- Get existing for audit
    select * into v_before from products
    where id = p_product_id and hotel_id = p_hotel_id;

    if v_before is null then
      raise exception 'NOT_FOUND: Producto no encontrado';
    end if;

    update products set
      name = coalesce(p_name, name),
      category_id = coalesce(p_category_id, category_id),
      default_unit_id = coalesce(p_default_unit_id, default_unit_id),
      is_active = p_is_active,
      allergens = coalesce(p_allergens, allergens),
      notes = coalesce(p_notes, notes)
    where id = p_product_id and hotel_id = p_hotel_id;

    v_result_id := p_product_id;
  else
    insert into products (hotel_id, name, category_id, default_unit_id, is_active, allergens, notes, created_by)
    values (p_hotel_id, p_name, p_category_id, p_default_unit_id, p_is_active, p_allergens, p_notes, v_user_id)
    returning id into v_result_id;
  end if;

  -- Audit
  insert into audit_logs (hotel_id, entity_type, entity_id, action, before_json, after_json, performed_by)
  values (
    p_hotel_id, 'product', v_result_id,
    case when v_is_update then 'product.updated' else 'product.created' end,
    case when v_is_update then to_jsonb(v_before) else null end,
    (select to_jsonb(p) from products p where p.id = v_result_id),
    v_user_id
  );

  return jsonb_build_object('success', true, 'product_id', v_result_id);
end;
$$;

revoke all on function upsert_product from public;
grant execute on function upsert_product to authenticated;

-- =============================================================================
-- RPC: upsert_supplier
-- =============================================================================
create or replace function upsert_supplier(
  p_hotel_id uuid,
  p_supplier_id uuid default null,
  p_name text default null,
  p_contact_name text default null,
  p_email text default null,
  p_phone text default null,
  p_address text default null,
  p_tax_id text default null,
  p_is_active boolean default true,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result_id uuid;
  v_is_update boolean := (p_supplier_id is not null);
  v_before record;
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id
      and is_active = true
      and role in ('admin', 'direction', 'head_chef', 'procurement')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para gestionar proveedores';
  end if;

  if v_is_update then
    select * into v_before from suppliers
    where id = p_supplier_id and hotel_id = p_hotel_id;

    if v_before is null then
      raise exception 'NOT_FOUND: Proveedor no encontrado';
    end if;

    update suppliers set
      name = coalesce(p_name, name),
      contact_name = coalesce(p_contact_name, contact_name),
      email = coalesce(p_email, email),
      phone = coalesce(p_phone, phone),
      address = coalesce(p_address, address),
      tax_id = coalesce(p_tax_id, tax_id),
      is_active = p_is_active,
      notes = coalesce(p_notes, notes)
    where id = p_supplier_id and hotel_id = p_hotel_id;

    v_result_id := p_supplier_id;
  else
    insert into suppliers (hotel_id, name, contact_name, email, phone, address, tax_id, is_active, notes, created_by)
    values (p_hotel_id, p_name, p_contact_name, p_email, p_phone, p_address, p_tax_id, p_is_active, p_notes, v_user_id)
    returning id into v_result_id;
  end if;

  insert into audit_logs (hotel_id, entity_type, entity_id, action, before_json, after_json, performed_by)
  values (
    p_hotel_id, 'supplier', v_result_id,
    case when v_is_update then 'supplier.updated' else 'supplier.created' end,
    case when v_is_update then to_jsonb(v_before) else null end,
    (select to_jsonb(s) from suppliers s where s.id = v_result_id),
    v_user_id
  );

  return jsonb_build_object('success', true, 'supplier_id', v_result_id);
end;
$$;

revoke all on function upsert_supplier from public;
grant execute on function upsert_supplier to authenticated;

-- =============================================================================
-- RPC: set_preferred_offer
-- Unsets previous preferred for same hotel+product, sets new.
-- =============================================================================
create or replace function set_preferred_offer(p_hotel_id uuid, p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_offer record;
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id
      and is_active = true
      and role in ('admin', 'direction', 'head_chef', 'procurement')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos';
  end if;

  select * into v_offer from supplier_offers
  where id = p_offer_id and hotel_id = p_hotel_id;

  if v_offer is null then
    raise exception 'NOT_FOUND: Oferta no encontrada';
  end if;

  -- Unset previous preferred for this product
  update supplier_offers
  set is_preferred = false
  where hotel_id = p_hotel_id
    and product_id = v_offer.product_id
    and is_preferred = true
    and id != p_offer_id;

  -- Set new preferred
  update supplier_offers
  set is_preferred = true
  where id = p_offer_id;

  return jsonb_build_object(
    'success', true,
    'offer_id', p_offer_id,
    'product_id', v_offer.product_id
  );
end;
$$;

revoke all on function set_preferred_offer from public;
grant execute on function set_preferred_offer to authenticated;

-- =============================================================================
-- RPC: search_products
-- Full-text / ILIKE search with optional category filter.
-- =============================================================================
create or replace function search_products(
  p_hotel_id uuid,
  p_query text,
  p_category_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  return (
    select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    from (
      select p.id, p.name, p.is_active, p.allergens,
             c.name as category_name,
             u.name as unit_name, u.abbreviation as unit_abbr
      from products p
      left join categories c on c.id = p.category_id
      left join units_of_measure u on u.id = p.default_unit_id
      where p.hotel_id = p_hotel_id
        and p.is_active = true
        and (p.name ilike '%' || p_query || '%'
             or exists (
               select 1 from product_aliases pa
               where pa.product_id = p.id and pa.alias_name ilike '%' || p_query || '%'
             ))
        and (p_category_id is null or p.category_id = p_category_id)
      order by p.name
      limit p_limit
    ) r
  );
end;
$$;

revoke all on function search_products from public;
grant execute on function search_products to authenticated;

-- =============================================================================
-- RPC: match_product_by_alias
-- Used by recipe parser — returns candidate products ranked by match.
-- =============================================================================
create or replace function match_product_by_alias(p_hotel_id uuid, p_alias_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from memberships
    where user_id = auth.uid() and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  return (
    select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb)
    from (
      -- Exact alias match first
      select p.id, p.name, pa.alias_name as matched_alias, 1.0 as confidence
      from product_aliases pa
      join products p on p.id = pa.product_id
      where pa.hotel_id = p_hotel_id
        and lower(pa.alias_name) = lower(p_alias_text)
        and p.is_active = true

      union all

      -- Partial alias match
      select p.id, p.name, pa.alias_name as matched_alias, 0.7 as confidence
      from product_aliases pa
      join products p on p.id = pa.product_id
      where pa.hotel_id = p_hotel_id
        and pa.alias_name ilike '%' || p_alias_text || '%'
        and lower(pa.alias_name) != lower(p_alias_text)
        and p.is_active = true

      union all

      -- Product name match
      select p.id, p.name, null as matched_alias, 0.5 as confidence
      from products p
      where p.hotel_id = p_hotel_id
        and p.name ilike '%' || p_alias_text || '%'
        and p.is_active = true
        and not exists (
          select 1 from product_aliases pa2
          where pa2.product_id = p.id
            and pa2.alias_name ilike '%' || p_alias_text || '%'
        )

      order by confidence desc
      limit 10
    ) r
  );
end;
$$;

revoke all on function match_product_by_alias from public;
grant execute on function match_product_by_alias to authenticated;

-- =============================================================================
-- RPC: get_product_with_offers
-- Returns product with all active offers and supplier info.
-- =============================================================================
create or replace function get_product_with_offers(p_hotel_id uuid, p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product jsonb;
  v_offers jsonb;
begin
  if not exists (
    select 1 from memberships
    where user_id = auth.uid() and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'is_active', p.is_active,
    'allergens', p.allergens, 'notes', p.notes,
    'category_name', c.name,
    'default_unit', u.name, 'default_unit_abbr', u.abbreviation
  ) into v_product
  from products p
  left join categories c on c.id = p.category_id
  left join units_of_measure u on u.id = p.default_unit_id
  where p.id = p_product_id and p.hotel_id = p_hotel_id;

  if v_product is null then
    raise exception 'NOT_FOUND: Producto no encontrado';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'offer_id', so.id,
    'supplier_id', s.id, 'supplier_name', s.name,
    'price', so.price, 'unit_name', u.name, 'unit_abbr', u.abbreviation,
    'min_order_qty', so.min_order_qty, 'lead_time_days', so.lead_time_days,
    'is_preferred', so.is_preferred,
    'valid_from', so.valid_from, 'valid_until', so.valid_until
  )), '[]'::jsonb) into v_offers
  from supplier_offers so
  join suppliers s on s.id = so.supplier_id
  join units_of_measure u on u.id = so.unit_id
  where so.product_id = p_product_id and so.hotel_id = p_hotel_id;

  return v_product || jsonb_build_object('offers', v_offers);
end;
$$;

revoke all on function get_product_with_offers from public;
grant execute on function get_product_with_offers to authenticated;
