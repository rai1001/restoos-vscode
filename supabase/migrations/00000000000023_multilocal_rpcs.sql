-- =============================================================================
-- Multi-Local RPCs — Aggregation across hotels within a tenant
-- =============================================================================

-- 1. GET TENANT HOTELS WITH KPIs
-- Returns all hotels in the tenant with live operational metrics
create or replace function get_tenant_overview(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  -- Verify user belongs to this tenant
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and tenant_id = p_tenant_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select coalesce(jsonb_agg(hotel_data order by hotel_data->>'name'), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'hotel_id', h.id,
      'name', h.name,
      'slug', h.slug,
      'products_count', (select count(*) from products where hotel_id = h.id and is_active = true),
      'recipes_count', (select count(*) from recipes where hotel_id = h.id),
      'recipes_approved', (select count(*) from recipes where hotel_id = h.id and status = 'approved'),
      'suppliers_count', (select count(*) from suppliers where hotel_id = h.id and is_active = true),
      'stock_value', (select coalesce(sum(current_quantity * unit_cost), 0) from stock_lots where hotel_id = h.id and current_quantity > 0),
      'stock_lots_count', (select count(*) from stock_lots where hotel_id = h.id and current_quantity > 0),
      'stock_expiring_3d', (select count(*) from stock_lots where hotel_id = h.id and current_quantity > 0 and expiry_date is not null and expiry_date <= current_date + 3),
      'waste_30d_cost', (select coalesce(sum(abs(sm.quantity) * sm.unit_cost), 0) from stock_movements sm where sm.hotel_id = h.id and sm.movement_type = 'waste' and sm.created_at >= current_date - 30),
      'po_pending', (select count(*) from purchase_orders where hotel_id = h.id and status in ('draft', 'sent')),
      'appcc_today_pct', (select coalesce(dc.completion_pct, 0) from appcc_daily_closures dc where dc.hotel_id = h.id and dc.closure_date = current_date),
      'appcc_today_status', (select coalesce(dc.status, 'open') from appcc_daily_closures dc where dc.hotel_id = h.id and dc.closure_date = current_date),
      'appcc_incidents_open', (select count(*) from appcc_incidents where hotel_id = h.id and status in ('open', 'in_progress')),
      'alerts_active', (select count(*) from alerts where hotel_id = h.id and is_dismissed = false)
    ) as hotel_data
    from hotels h
    where h.tenant_id = p_tenant_id and h.is_active = true
  ) sub;

  return v_result;
end;
$$;

revoke all on function get_tenant_overview from public;
grant execute on function get_tenant_overview to authenticated;

-- 2. GET PRICE COMPARISONS ACROSS HOTELS
-- Finds products with the same name across hotels and compares supplier prices
create or replace function get_price_comparisons(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and tenant_id = p_tenant_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select coalesce(jsonb_agg(comparison order by comparison->>'product_name'), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'product_name', p.name,
      'hotel_id', h.id,
      'hotel_name', h.name,
      'price', so.price,
      'unit', u.abbreviation,
      'supplier_name', s.name
    ) as comparison
    from supplier_offers so
    join products p on p.id = so.product_id
    join hotels h on h.id = so.hotel_id
    join suppliers s on s.id = so.supplier_id
    join units_of_measure u on u.id = so.unit_id
    where h.tenant_id = p_tenant_id
      and so.is_preferred = true
    order by p.name, so.price
  ) sub;

  return v_result;
end;
$$;

revoke all on function get_price_comparisons from public;
grant execute on function get_price_comparisons to authenticated;
