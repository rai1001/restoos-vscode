-- =============================================================================
-- Migration: M4/M5 RPCs — Procurement & Inventory
-- =============================================================================

-- 1. CREATE PURCHASE REQUEST
create or replace function create_purchase_request(
  p_hotel_id uuid,
  p_event_id uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_number text;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  v_number := 'PR-' || to_char(now(), 'YYYYMMDD-HH24MISS');

  insert into purchase_requests (hotel_id, event_id, request_number, requested_by, notes)
  values (p_hotel_id, p_event_id, v_number, v_user_id, p_notes)
  returning id into v_request_id;

  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'create', 'purchase_request', v_request_id,
    jsonb_build_object('request_number', v_number));

  return jsonb_build_object('request_id', v_request_id, 'request_number', v_number);
end;
$$;

-- 2. APPROVE PURCHASE REQUEST
create or replace function approve_purchase_request(
  p_hotel_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_request purchase_requests%rowtype;
begin
  select role into v_role from memberships
  where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true;
  if v_role is null then raise exception 'ACCESS_DENIED'; end if;
  if v_role not in ('procurement', 'direction', 'admin', 'superadmin') then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_request from purchase_requests where id = p_request_id and hotel_id = p_hotel_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_request.status != 'pending_approval' then raise exception 'INVALID_STATE'; end if;

  update purchase_requests set status = 'approved', approved_by = v_user_id where id = p_request_id;

  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'approve', 'purchase_request', p_request_id,
    jsonb_build_object('status', 'approved'));

  return jsonb_build_object('request_id', p_request_id, 'status', 'approved');
end;
$$;

-- 3. GENERATE PURCHASE ORDER
create or replace function generate_purchase_order(
  p_hotel_id uuid,
  p_supplier_id uuid,
  p_expected_delivery date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_number text;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  if not exists (select 1 from suppliers where id = p_supplier_id and hotel_id = p_hotel_id) then
    raise exception 'NOT_FOUND';
  end if;

  v_number := 'PO-' || to_char(now(), 'YYYYMMDD-HH24MISS');

  insert into purchase_orders (hotel_id, supplier_id, order_number, expected_delivery_date, notes, created_by)
  values (p_hotel_id, p_supplier_id, v_number, p_expected_delivery, p_notes, v_user_id)
  returning id into v_order_id;

  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'create', 'purchase_order', v_order_id,
    jsonb_build_object('order_number', v_number, 'supplier_id', p_supplier_id));

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_number);
end;
$$;

-- 4. SEND PURCHASE ORDER
create or replace function send_purchase_order(
  p_hotel_id uuid,
  p_order_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_order purchase_orders%rowtype;
  v_line_count integer;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_order from purchase_orders where id = p_order_id and hotel_id = p_hotel_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.status not in ('draft', 'approved') then raise exception 'INVALID_STATE'; end if;

  select count(*) into v_line_count from purchase_order_lines where order_id = p_order_id;
  if v_line_count = 0 then raise exception 'MISSING_REQUIRED_DATA'; end if;

  -- Calculate total
  update purchase_orders set
    status = 'sent',
    sent_at = now(),
    total_amount = (select sum(quantity_ordered * unit_price) from purchase_order_lines where order_id = p_order_id)
  where id = p_order_id;

  -- Domain event
  insert into domain_events (hotel_id, event_type, entity_type, entity_id, payload)
  values (p_hotel_id, 'purchase_order.sent', 'purchase_order', p_order_id,
    jsonb_build_object('order_number', v_order.order_number, 'supplier_id', v_order.supplier_id));


  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'send', 'purchase_order', p_order_id,
    jsonb_build_object('status', 'sent', 'line_count', v_line_count));

  return jsonb_build_object('order_id', p_order_id, 'status', 'sent');
end;
$$;

-- 5. RECEIVE GOODS
create or replace function receive_goods(
  p_hotel_id uuid,
  p_order_id uuid,
  p_lines jsonb, -- [{order_line_id, quantity_received, unit_cost, expiry_date?, lot_number?}]
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_order purchase_orders%rowtype;
  v_receipt_id uuid;
  v_receipt_line_id uuid;
  v_receipt_number text;
  v_line jsonb;
  v_lot_id uuid;
  v_order_line purchase_order_lines%rowtype;
  v_all_received boolean;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_order from purchase_orders where id = p_order_id and hotel_id = p_hotel_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_order.status not in ('sent', 'confirmed_by_supplier', 'partially_received') then
    raise exception 'INVALID_STATE';
  end if;

  v_receipt_number := 'GR-' || to_char(now(), 'YYYYMMDD-HH24MISS');

  insert into goods_receipts (hotel_id, order_id, receipt_number, received_by, notes)
  values (p_hotel_id, p_order_id, v_receipt_number, v_user_id, p_notes)
  returning id into v_receipt_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    select * into v_order_line from purchase_order_lines
    where id = (v_line->>'order_line_id')::uuid and order_id = p_order_id;

    if not found then continue; end if;

    -- Create receipt line
    insert into goods_receipt_lines (receipt_id, hotel_id, order_line_id, product_id, unit_id,
      quantity_received, unit_cost, expiry_date, lot_number)
    values (v_receipt_id, p_hotel_id, v_order_line.id, v_order_line.product_id, v_order_line.unit_id,
      (v_line->>'quantity_received')::numeric, (v_line->>'unit_cost')::numeric,
      (v_line->>'expiry_date')::date, v_line->>'lot_number')
    returning id into v_receipt_line_id;

    -- Update order line received qty
    update purchase_order_lines set
      quantity_received = quantity_received + (v_line->>'quantity_received')::numeric
    where id = v_order_line.id;

    -- Create stock lot (receipt_line_id references goods_receipt_lines)
    insert into stock_lots (hotel_id, product_id, unit_id, receipt_line_id, lot_number,
      initial_quantity, current_quantity, unit_cost, expiry_date)
    values (p_hotel_id, v_order_line.product_id, v_order_line.unit_id, v_receipt_line_id,
      v_line->>'lot_number', (v_line->>'quantity_received')::numeric,
      (v_line->>'quantity_received')::numeric, (v_line->>'unit_cost')::numeric,
      (v_line->>'expiry_date')::date)
    returning id into v_lot_id;

    -- Create stock movement
    insert into stock_movements (hotel_id, product_id, lot_id, movement_type, quantity, unit_id,
      unit_cost, reference_type, reference_id, created_by)
    values (p_hotel_id, v_order_line.product_id, v_lot_id, 'reception',
      (v_line->>'quantity_received')::numeric, v_order_line.unit_id,
      (v_line->>'unit_cost')::numeric, 'goods_receipt', v_receipt_id, v_user_id);

  end loop;

  -- Check if all lines fully received
  select not exists (
    select 1 from purchase_order_lines
    where order_id = p_order_id and quantity_received < quantity_ordered
  ) into v_all_received;

  update purchase_orders set
    status = case when v_all_received then 'received' else 'partially_received' end
  where id = p_order_id;

  -- Domain event
  insert into domain_events (hotel_id, event_type, entity_type, entity_id, payload)
  values (p_hotel_id, 'goods_receipt.applied', 'goods_receipt', v_receipt_id,
    jsonb_build_object('order_id', p_order_id, 'fully_received', v_all_received));


  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'receive_goods', 'goods_receipt', v_receipt_id,
    jsonb_build_object('order_id', p_order_id, 'fully_received', v_all_received));

  return jsonb_build_object(
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number,
    'fully_received', v_all_received
  );
end;
$$;

-- 6. RESERVE STOCK FOR EVENT — removed (events module not in RestoOS)
-- 7. CONSUME STOCK — removed (depends on stock_reservations)

-- 8. RECORD WASTE
create or replace function record_waste(
  p_hotel_id uuid,
  p_product_id uuid,
  p_lot_id uuid,
  p_quantity numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_lot stock_lots%rowtype;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_lot from stock_lots where id = p_lot_id and hotel_id = p_hotel_id and product_id = p_product_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_lot.current_quantity < p_quantity then raise exception 'INSUFFICIENT_STOCK'; end if;

  update stock_lots set current_quantity = current_quantity - p_quantity where id = p_lot_id;

  insert into stock_movements (hotel_id, product_id, lot_id, movement_type, quantity, unit_id,
    unit_cost, notes, created_by)
  values (p_hotel_id, p_product_id, p_lot_id, 'waste', p_quantity, v_lot.unit_id,
    v_lot.unit_cost, p_notes, v_user_id);


  insert into audit_logs (hotel_id, performed_by, action, entity_type, entity_id, after_json)
  values (p_hotel_id, v_user_id, 'record_waste', 'stock_lot', p_lot_id,
    jsonb_build_object('quantity', p_quantity, 'product_id', p_product_id));

  return jsonb_build_object('lot_id', p_lot_id, 'wasted', p_quantity, 'remaining', v_lot.current_quantity - p_quantity);
end;
$$;

-- 9. GET STOCK LEVELS (derived from lots)
create or replace function get_stock_levels(
  p_hotel_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_id', sl.product_id,
      'product_name', p.name,
      'total_quantity', sl.total_qty,
      'lot_count', sl.lot_count,
      'earliest_expiry', sl.earliest_expiry
    ) order by p.name
  ), '[]'::jsonb)
  into v_result
  from (
    select product_id,
      sum(current_quantity) as total_qty,
      count(*) as lot_count,
      min(expiry_date) as earliest_expiry
    from stock_lots
    where hotel_id = p_hotel_id and current_quantity > 0
    group by product_id
  ) sl
  join products p on p.id = sl.product_id;

  return v_result;
end;
$$;

-- 10. CALCULATE REAL COST — removed (depends on stock_reservations/events module)

-- 11. CHECK STOCK ALERTS
create or replace function check_stock_alerts(
  p_hotel_id uuid,
  p_min_days_to_expiry integer default 3
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_expiring jsonb;
  v_low_stock jsonb;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  -- Products expiring soon
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'lot_id', sl.id,
      'product_name', p.name,
      'quantity', sl.current_quantity,
      'expiry_date', sl.expiry_date,
      'days_to_expiry', sl.expiry_date - current_date
    )
  ), '[]'::jsonb)
  into v_expiring
  from stock_lots sl
  join products p on p.id = sl.product_id
  where sl.hotel_id = p_hotel_id
    and sl.current_quantity > 0
    and sl.expiry_date is not null
    and sl.expiry_date <= current_date + p_min_days_to_expiry;

  return jsonb_build_object(
    'expiring_soon', v_expiring
  );
end;
$$;
