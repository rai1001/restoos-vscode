-- =============================================================================
-- Migration: M5 — Inventario
-- Module: D5 — Stock lots, movements, reservations
-- =============================================================================

-- 1. STOCK LOTS
create table if not exists stock_lots (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  unit_id uuid references units_of_measure(id),
  receipt_line_id uuid references goods_receipt_lines(id) on delete set null,
  lot_number text,
  initial_quantity numeric(14,3) not null check (initial_quantity > 0),
  current_quantity numeric(14,3) not null default 0,
  unit_cost numeric(14,4) not null,
  expiry_date date,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_stock_lots_hotel_product on stock_lots (hotel_id, product_id);
create index idx_stock_lots_expiry on stock_lots (hotel_id, expiry_date) where current_quantity > 0;

alter table stock_lots enable row level security;

create policy "stock_lots_select" on stock_lots for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "stock_lots_insert" on stock_lots for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "stock_lots_update" on stock_lots for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table stock_lots is 'Physical stock lots with FIFO tracking by expiry date';

-- 2. STOCK MOVEMENTS
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  lot_id uuid references stock_lots(id) on delete set null,
  movement_type text not null
    check (movement_type in ('reception', 'reservation', 'release', 'consumption', 'waste', 'adjustment', 'transfer')),
  quantity numeric(14,3) not null,
  unit_id uuid references units_of_measure(id),
  unit_cost numeric(14,4),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_stock_movements_hotel_product on stock_movements (hotel_id, product_id);
create index idx_stock_movements_lot on stock_movements (lot_id) where lot_id is not null;
create index idx_stock_movements_type on stock_movements (hotel_id, movement_type);
create index idx_stock_movements_ref on stock_movements (reference_type, reference_id) where reference_id is not null;

alter table stock_movements enable row level security;

create policy "stock_movements_select" on stock_movements for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "stock_movements_insert" on stock_movements for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table stock_movements is 'Immutable stock movement ledger — stock levels are always derived';

-- 3. STOCK RESERVATIONS — removed (events module not in RestoOS)
