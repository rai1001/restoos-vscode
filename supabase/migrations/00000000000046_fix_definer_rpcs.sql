-- =============================================================================
-- Migration 046: Harden SECURITY DEFINER RPCs
-- =============================================================================
-- Several SECURITY DEFINER functions trusted caller-supplied hotel_id and
-- foreign UUIDs (lot_id, product_id) without verifying ownership. Because
-- SECURITY DEFINER runs with bypassrls privileges, this allowed authenticated
-- users to tamper with data in other tenants if they could guess/obtain a
-- valid UUID.
--
-- Fixes:
--   RO-APPSEC-RPC-001: upsert_hotel_prompt_pref must verify the caller has
--     an active membership in p_hotel_id.
--   RO-APPSEC-RPC-002: create_stock_transfer must verify every origin_lot_id
--     and origin_product_id belongs to the origin hotel.
--   RO-APPSEC-RPC-003: receive_stock_transfer must verify every override
--     dest_product_id belongs to the destination hotel.
-- =============================================================================

-- ─── 1. upsert_hotel_prompt_pref ────────────────────────────────────────────

create or replace function upsert_hotel_prompt_pref(
  p_hotel_id uuid,
  p_categoria text,
  p_valor text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- RO-APPSEC-RPC-001: the RPC runs as SECURITY DEFINER (bypassrls), so we
  -- must manually verify the caller has access to p_hotel_id. Without this,
  -- any authenticated user can write prompt preferences to any tenant.
  if not exists (
    select 1 from memberships
    where user_id = auth.uid()
      and hotel_id = p_hotel_id
      and is_active = true
  ) then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;

  insert into hotel_prompt_prefs (hotel_id, categoria, valor, peso)
  values (p_hotel_id, p_categoria, p_valor, 1)
  on conflict (hotel_id, categoria, valor)
  do update set
    peso = hotel_prompt_prefs.peso + 1,
    updated_at = now();
end;
$$;

-- ─── 2. create_stock_transfer ───────────────────────────────────────────────

create or replace function create_stock_transfer(
  p_origin_hotel_id      uuid,
  p_destination_hotel_id uuid,
  p_lines                jsonb,
  p_notes                text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid := auth.uid();
  v_tenant_id     uuid;
  v_transfer_id   uuid;
  v_transfer_num  text;
  v_line          jsonb;
  v_origin_lot_id uuid;
  v_origin_prod_id uuid;
begin
  -- Verify user has access to origin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_origin_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;

  -- Verify both hotels belong to same tenant
  select h1.tenant_id into v_tenant_id
  from hotels h1, hotels h2
  where h1.id = p_origin_hotel_id and h2.id = p_destination_hotel_id
    and h1.tenant_id = h2.tenant_id;

  if v_tenant_id is null then
    raise exception 'Hotels must belong to the same tenant';
  end if;

  v_transfer_num := 'TR-' || to_char(now(), 'YYYYMMDD-HH24MISS');

  insert into stock_transfers (
    tenant_id, origin_hotel_id, destination_hotel_id,
    transfer_number, status, notes, created_by
  ) values (
    v_tenant_id, p_origin_hotel_id, p_destination_hotel_id,
    v_transfer_num, 'draft', p_notes, v_user_id
  ) returning id into v_transfer_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_origin_lot_id  := nullif(v_line->>'origin_lot_id', '')::uuid;
    v_origin_prod_id := nullif(v_line->>'origin_product_id', '')::uuid;

    -- RO-APPSEC-RPC-002: every lot/product referenced MUST belong to the
    -- origin hotel. Otherwise a user could reference another tenant's lot
    -- UUID and have its stock deducted by confirm_stock_transfer.
    if v_origin_lot_id is not null then
      if not exists (
        select 1 from stock_lots
        where id = v_origin_lot_id and hotel_id = p_origin_hotel_id
      ) then
        raise exception 'INVALID_LOT: lot % not in origin hotel', v_origin_lot_id
          using errcode = '42501';
      end if;
    end if;

    if v_origin_prod_id is not null then
      if not exists (
        select 1 from products
        where id = v_origin_prod_id and hotel_id = p_origin_hotel_id
      ) then
        raise exception 'INVALID_PRODUCT: product % not in origin hotel', v_origin_prod_id
          using errcode = '42501';
      end if;
    end if;

    insert into stock_transfer_lines (
      transfer_id, product_name, origin_product_id, origin_lot_id,
      unit, quantity_sent, unit_cost, notes
    ) values (
      v_transfer_id,
      v_line->>'product_name',
      v_origin_prod_id,
      v_origin_lot_id,
      v_line->>'unit',
      (v_line->>'quantity')::numeric,
      (v_line->>'unit_cost')::numeric,
      v_line->>'notes'
    );
  end loop;

  return jsonb_build_object(
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_num,
    'status', 'draft'
  );
end;
$$;

-- ─── 3. receive_stock_transfer ──────────────────────────────────────────────

create or replace function receive_stock_transfer(
  p_transfer_id uuid,
  p_lines       jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_transfer   stock_transfers%rowtype;
  v_line       stock_transfer_lines%rowtype;
  v_dest_unit  uuid;
  v_lot_id     uuid;
  v_override   jsonb;
  v_qty_recv   numeric;
  v_dest_prod  uuid;
begin
  select * into v_transfer from stock_transfers where id = p_transfer_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_transfer.status not in ('confirmed', 'in_transit') then
    raise exception 'INVALID_STATE';
  end if;

  -- Verify user has access to destination
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = v_transfer.destination_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;

  select id into v_dest_unit from units_of_measure
  where hotel_id = v_transfer.destination_hotel_id and is_base = true and unit_type = 'weight'
  limit 1;

  for v_line in select * from stock_transfer_lines where transfer_id = p_transfer_id
  loop
    v_qty_recv := v_line.quantity_sent;
    v_dest_prod := v_line.dest_product_id;

    if p_lines is not null then
      select l into v_override from jsonb_array_elements(p_lines) l
      where (l->>'line_id')::uuid = v_line.id;
      if v_override is not null then
        v_qty_recv := coalesce((v_override->>'quantity_received')::numeric, v_line.quantity_sent);
        v_dest_prod := coalesce(nullif(v_override->>'dest_product_id','')::uuid, v_line.dest_product_id);
      end if;
    end if;

    -- RO-APPSEC-RPC-003: if a dest_product_id is provided, it MUST belong
    -- to the destination hotel. Otherwise a user at the destination could
    -- create inbound stock lots pointing at another tenant's product.
    if v_dest_prod is not null then
      if not exists (
        select 1 from products
        where id = v_dest_prod and hotel_id = v_transfer.destination_hotel_id
      ) then
        raise exception 'INVALID_DEST_PRODUCT: product % not in destination hotel', v_dest_prod
          using errcode = '42501';
      end if;
    end if;

    update stock_transfer_lines set
      quantity_received = v_qty_recv,
      dest_product_id = v_dest_prod
    where id = v_line.id;

    if v_dest_prod is not null then
      insert into stock_lots (
        hotel_id, product_id, unit_id, lot_number,
        initial_quantity, current_quantity, unit_cost
      ) values (
        v_transfer.destination_hotel_id, v_dest_prod,
        coalesce(v_dest_unit, (select default_unit_id from products where id = v_dest_prod)),
        'TR-' || left(p_transfer_id::text, 8),
        v_qty_recv, v_qty_recv, v_line.unit_cost
      ) returning id into v_lot_id;

      insert into stock_movements (
        hotel_id, product_id, lot_id, movement_type, quantity,
        unit_id, unit_cost, reference_type, reference_id, notes, created_by
      ) values (
        v_transfer.destination_hotel_id, v_dest_prod, v_lot_id,
        'transfer', v_qty_recv,
        coalesce(v_dest_unit, (select default_unit_id from products where id = v_dest_prod)),
        v_line.unit_cost,
        'stock_transfer', p_transfer_id,
        'Transferencia entrada: ' || v_line.product_name || ' ← ' ||
          (select name from hotels where id = v_transfer.origin_hotel_id),
        v_user_id
      );
    end if;
  end loop;

  update stock_transfers set
    status = 'received',
    received_by = v_user_id,
    received_at = now()
  where id = p_transfer_id;

  return jsonb_build_object(
    'transfer_id', p_transfer_id,
    'status', 'received'
  );
end;
$$;

-- Grants (same as 025)
revoke all on function upsert_hotel_prompt_pref(uuid, text, text) from public;
grant execute on function upsert_hotel_prompt_pref(uuid, text, text) to authenticated;
revoke all on function create_stock_transfer(uuid, uuid, jsonb, text) from public;
grant execute on function create_stock_transfer(uuid, uuid, jsonb, text) to authenticated;
revoke all on function receive_stock_transfer(uuid, jsonb) from public;
grant execute on function receive_stock_transfer(uuid, jsonb) to authenticated;
