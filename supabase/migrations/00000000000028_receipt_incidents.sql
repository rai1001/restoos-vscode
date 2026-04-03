-- ============================================================================
-- M4.1: Add incident tracking to goods_receipt_lines
-- ============================================================================

-- Add incident columns to goods_receipt_lines
alter table goods_receipt_lines
  add column if not exists incident_type text
    check (incident_type in ('ok', 'not_received', 'wrong_quantity', 'wrong_price', 'damaged'))
    default 'ok',
  add column if not exists incident_notes text;

comment on column goods_receipt_lines.incident_type is 'Type of incident: ok, not_received, wrong_quantity, wrong_price, damaged';
comment on column goods_receipt_lines.incident_notes is 'Notes about the incident (only when incident_type != ok)';

-- ============================================================================
-- Update receive_goods RPC to accept incident_type and incident_notes
-- ============================================================================

create or replace function receive_goods(
  p_hotel_id uuid,
  p_order_id uuid,
  p_lines jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_receipt_id uuid;
  v_receipt_number text;
  v_line jsonb;
  v_order_line record;
  v_receipt_line_id uuid;
  v_lot_id uuid;
  v_fully_received boolean := true;
begin
  -- Validate order exists and belongs to hotel
  if not exists (
    select 1 from purchase_orders
    where id = p_order_id and hotel_id = p_hotel_id
      and status in ('sent', 'confirmed_by_supplier', 'partially_received', 'enviada')
  ) then
    raise exception 'Order not found or not in receivable status';
  end if;

  -- Generate receipt number
  v_receipt_number := 'GR-' || to_char(now(), 'YYYYMMDD-HH24MISS');

  -- Create goods receipt
  insert into goods_receipts (hotel_id, order_id, receipt_number, received_by, notes)
  values (p_hotel_id, p_order_id, v_receipt_number, v_user_id, p_notes)
  returning id into v_receipt_id;

  -- Process each line
  for v_line in select * from jsonb_array_elements(p_lines) loop
    -- Get order line
    select pol.* into v_order_line
    from purchase_order_lines pol
    where pol.id = (v_line->>'order_line_id')::uuid
      and pol.order_id = p_order_id;

    if not found then
      raise exception 'Order line not found: %', v_line->>'order_line_id';
    end if;

    -- Insert receipt line with incident tracking
    insert into goods_receipt_lines (
      receipt_id, hotel_id, order_line_id, product_id, unit_id,
      quantity_received, unit_cost, expiry_date, lot_number,
      incident_type, incident_notes
    )
    values (
      v_receipt_id, p_hotel_id, v_order_line.id, v_order_line.product_id, v_order_line.unit_id,
      (v_line->>'quantity_received')::numeric, (v_line->>'unit_cost')::numeric,
      (v_line->>'expiry_date')::date, v_line->>'lot_number',
      coalesce(v_line->>'incident_type', 'ok'),
      v_line->>'incident_notes'
    )
    returning id into v_receipt_line_id;

    -- Update order line received qty
    update purchase_order_lines set
      quantity_received = quantity_received + (v_line->>'quantity_received')::numeric
    where id = v_order_line.id;

    -- Create stock lot only if quantity > 0 and not "not_received"
    if (v_line->>'quantity_received')::numeric > 0
       and coalesce(v_line->>'incident_type', 'ok') != 'not_received' then
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
    end if;
  end loop;

  -- Check if all lines are fully received
  select not exists (
    select 1 from purchase_order_lines
    where order_id = p_order_id and quantity_received < quantity_ordered
  ) into v_fully_received;

  -- Update PO status
  update purchase_orders set
    status = case when v_fully_received then 'received' else 'partially_received' end,
    updated_at = now()
  where id = p_order_id;

  -- Domain event
  insert into domain_events (hotel_id, event_type, payload, created_by)
  values (p_hotel_id, 'goods_receipt.applied', jsonb_build_object(
    'receipt_id', v_receipt_id,
    'order_id', p_order_id,
    'fully_received', v_fully_received
  ), v_user_id);

  return jsonb_build_object(
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number,
    'fully_received', v_fully_received
  );
end;
$$;
