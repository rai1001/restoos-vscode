-- =============================================================================
-- Migration: M4 — Compras
-- Module: D4 — Purchase requests, orders, goods receipts
-- =============================================================================

-- 1. PURCHASE REQUESTS
create table if not exists purchase_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  -- event_id removed: events module not included in RestoOS
  request_number text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'consolidated', 'cancelled')),
  requested_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_purchase_requests_hotel on purchase_requests (hotel_id, status);
create unique index idx_purchase_requests_number on purchase_requests (hotel_id, request_number);

create trigger trg_purchase_requests_updated_at
  before update on purchase_requests
  for each row execute function update_updated_at();

alter table purchase_requests enable row level security;

create policy "purchase_requests_select" on purchase_requests for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "purchase_requests_insert" on purchase_requests for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "purchase_requests_update" on purchase_requests for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table purchase_requests is 'Internal purchase requests before PO generation';

-- 2. PURCHASE REQUEST LINES
create table if not exists purchase_request_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references purchase_requests(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  unit_id uuid references units_of_measure(id),
  quantity_requested numeric(14,3) not null check (quantity_requested > 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_pr_lines_request on purchase_request_lines (request_id);

alter table purchase_request_lines enable row level security;

create policy "pr_lines_select" on purchase_request_lines for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "pr_lines_insert" on purchase_request_lines for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "pr_lines_update" on purchase_request_lines for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "pr_lines_delete" on purchase_request_lines for delete
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table purchase_request_lines is 'Line items in a purchase request';

-- 3. PURCHASE ORDERS
create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  supplier_id uuid not null references suppliers(id) on delete restrict,
  order_number text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'sent', 'confirmed_by_supplier', 'partially_received', 'received', 'cancelled')),
  expected_delivery_date date,
  total_amount numeric(14,2),
  notes text,
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_purchase_orders_hotel on purchase_orders (hotel_id, status);
create unique index idx_purchase_orders_number on purchase_orders (hotel_id, order_number);
create index idx_purchase_orders_supplier on purchase_orders (supplier_id);

create trigger trg_purchase_orders_updated_at
  before update on purchase_orders
  for each row execute function update_updated_at();

alter table purchase_orders enable row level security;

create policy "purchase_orders_select" on purchase_orders for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "purchase_orders_insert" on purchase_orders for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "purchase_orders_update" on purchase_orders for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table purchase_orders is 'Purchase orders sent to suppliers';

-- 4. PURCHASE ORDER LINES
create table if not exists purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references purchase_orders(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  unit_id uuid references units_of_measure(id),
  quantity_ordered numeric(14,3) not null check (quantity_ordered > 0),
  unit_price numeric(14,4) not null,
  quantity_received numeric(14,3) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_po_lines_order on purchase_order_lines (order_id);

alter table purchase_order_lines enable row level security;

create policy "po_lines_select" on purchase_order_lines for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "po_lines_insert" on purchase_order_lines for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "po_lines_update" on purchase_order_lines for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table purchase_order_lines is 'Line items in a purchase order';

-- 5. GOODS RECEIPTS
create table if not exists goods_receipts (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  order_id uuid not null references purchase_orders(id) on delete restrict,
  receipt_number text not null,
  received_by uuid references auth.users(id),
  received_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_goods_receipts_order on goods_receipts (order_id);
create unique index idx_goods_receipts_number on goods_receipts (hotel_id, receipt_number);

alter table goods_receipts enable row level security;

create policy "goods_receipts_select" on goods_receipts for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "goods_receipts_insert" on goods_receipts for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table goods_receipts is 'Records of goods received against purchase orders';

-- 6. GOODS RECEIPT LINES
create table if not exists goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references goods_receipts(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete restrict,
  order_line_id uuid not null references purchase_order_lines(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  unit_id uuid references units_of_measure(id),
  quantity_received numeric(14,3) not null check (quantity_received > 0),
  unit_cost numeric(14,4) not null,
  expiry_date date,
  lot_number text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_gr_lines_receipt on goods_receipt_lines (receipt_id);

alter table goods_receipt_lines enable row level security;

create policy "gr_lines_select" on goods_receipt_lines for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "gr_lines_insert" on goods_receipt_lines for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table goods_receipt_lines is 'Line items received in a goods receipt';
