-- ============================================================================
-- M4.2: Price history for dynamic escandallos + ML predictive pricing
-- ============================================================================

-- Price history table: every real price observation
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  supplier_id uuid not null references suppliers(id) on delete restrict,
  unit_price numeric(14,4) not null,
  unit_id uuid references units_of_measure(id),
  quantity numeric(14,3),
  date date not null default current_date,
  source text not null check (source in ('receipt', 'ocr', 'manual')),
  order_id uuid references purchase_orders(id) on delete set null,
  receipt_id uuid references goods_receipts(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indices for time-series queries and ML export
create index idx_price_history_product_date on price_history (hotel_id, product_id, date);
create index idx_price_history_supplier_date on price_history (hotel_id, supplier_id, date);
create index idx_price_history_date on price_history (hotel_id, date);

alter table price_history enable row level security;

create policy "price_history_select" on price_history for select
  using (public.has_hotel_access(hotel_id));
create policy "price_history_insert" on price_history for insert
  with check (public.has_hotel_access(hotel_id));

comment on table price_history is 'Historical price observations from receipts, OCR, and manual entry — feeds escandallos and ML';

-- ============================================================================
-- Extend receive_goods to auto-insert price_history on receipt
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
  v_supplier_id uuid;
begin
  -- Security: membership validation (RO-APPSEC-203)
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM memberships
    WHERE user_id = v_user_id
      AND hotel_id = p_hotel_id
      AND is_active = true
      AND role IN ('superadmin','admin','direction','procurement','head_chef')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  -- Get supplier_id from order
  select supplier_id into v_supplier_id
  from purchase_orders
  where id = p_order_id and hotel_id = p_hotel_id
    and status in ('sent', 'confirmed_by_supplier', 'partially_received', 'enviada');

  if v_supplier_id is null then
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

      insert into stock_movements (hotel_id, product_id, lot_id, movement_type, quantity, unit_id,
        unit_cost, reference_type, reference_id, created_by)
      values (p_hotel_id, v_order_line.product_id, v_lot_id, 'reception',
        (v_line->>'quantity_received')::numeric, v_order_line.unit_id,
        (v_line->>'unit_cost')::numeric, 'goods_receipt', v_receipt_id, v_user_id);

      -- AUTO-INSERT price_history for dynamic escandallos + ML
      insert into price_history (
        hotel_id, product_id, supplier_id, unit_price, unit_id,
        quantity, date, source, order_id, receipt_id
      )
      values (
        p_hotel_id, v_order_line.product_id, v_supplier_id,
        (v_line->>'unit_cost')::numeric, v_order_line.unit_id,
        (v_line->>'quantity_received')::numeric, current_date,
        'receipt', p_order_id, v_receipt_id
      );
    end if;
  end loop;

  -- Check if all lines fully received
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

-- Security hardening: restrict direct access (RO-APPSEC-203)
REVOKE ALL ON FUNCTION receive_goods(uuid, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION receive_goods(uuid, uuid, jsonb, text) TO authenticated;

-- ============================================================================
-- RPC: Export price data for ML (XGBoost/Prophet features)
-- ============================================================================

create or replace function export_price_data_for_ml(p_hotel_id uuid)
returns table (
  product_id uuid,
  product_name text,
  supplier_id uuid,
  supplier_name text,
  unit_price numeric,
  quantity numeric,
  date date,
  day_of_week int,
  month int,
  quarter int,
  price_ma_7d numeric,
  price_ma_30d numeric,
  price_std_30d numeric,
  volume_ma_30d numeric
)
language plpgsql
security definer
stable
as $$
begin
  IF NOT has_hotel_role(p_hotel_id, ARRAY['superadmin','admin','direction','procurement']) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  return query
  with base as (
    select
      ph.product_id,
      p.name as product_name,
      ph.supplier_id,
      s.name as supplier_name,
      ph.unit_price,
      ph.quantity,
      ph.date,
      extract(dow from ph.date)::int as day_of_week,
      extract(month from ph.date)::int as month,
      extract(quarter from ph.date)::int as quarter
    from price_history ph
    join products p on p.id = ph.product_id
    join suppliers s on s.id = ph.supplier_id
    where ph.hotel_id = p_hotel_id
    order by ph.product_id, ph.date
  )
  select
    b.product_id,
    b.product_name,
    b.supplier_id,
    b.supplier_name,
    b.unit_price,
    b.quantity,
    b.date,
    b.day_of_week,
    b.month,
    b.quarter,
    -- 7-day moving average price
    avg(b.unit_price) over (
      partition by b.product_id
      order by b.date
      rows between 6 preceding and current row
    ) as price_ma_7d,
    -- 30-day moving average price
    avg(b.unit_price) over (
      partition by b.product_id
      order by b.date
      rows between 29 preceding and current row
    ) as price_ma_30d,
    -- 30-day standard deviation
    stddev(b.unit_price) over (
      partition by b.product_id
      order by b.date
      rows between 29 preceding and current row
    ) as price_std_30d,
    -- 30-day moving average volume
    avg(b.quantity) over (
      partition by b.product_id
      order by b.date
      rows between 29 preceding and current row
    ) as volume_ma_30d
  from base b;
end;
$$;

REVOKE ALL ON FUNCTION export_price_data_for_ml(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION export_price_data_for_ml(uuid) TO authenticated;

comment on function export_price_data_for_ml is 'Export price history with pre-calculated ML features (moving averages, seasonality) for XGBoost/Prophet';
