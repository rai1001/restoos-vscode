-- =============================================================================
-- Migration: M3 — Catálogo y Proveedores
-- Module: D3 — Categories, units, products, suppliers, offers, aliases
-- =============================================================================

-- 1. CATEGORIES (árbol con parent_id)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  parent_id uuid references categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_categories_hotel on categories (hotel_id);
create index idx_categories_parent on categories (hotel_id, parent_id);

create trigger trg_categories_updated_at
  before update on categories
  for each row execute function update_updated_at();

alter table categories enable row level security;

create policy "categories_select" on categories for select
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "categories_insert" on categories for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "categories_update" on categories for update
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table categories is 'Product categories with tree structure (parent_id)';

-- 2. UNITS OF MEASURE
create table if not exists units_of_measure (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  abbreviation text not null,
  unit_type text not null check (unit_type in ('weight', 'volume', 'unit', 'length')),
  is_base boolean not null default false,
  conversion_factor numeric(14,6) not null default 1,
  base_unit_id uuid references units_of_measure(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_units_hotel on units_of_measure (hotel_id);

create trigger trg_units_updated_at
  before update on units_of_measure
  for each row execute function update_updated_at();

alter table units_of_measure enable row level security;

create policy "units_select" on units_of_measure for select
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "units_insert" on units_of_measure for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "units_update" on units_of_measure for update
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table units_of_measure is 'Units with type and conversion to base unit';

-- 3. PRODUCTS
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  category_id uuid references categories(id) on delete set null,
  default_unit_id uuid references units_of_measure(id) on delete set null,
  is_active boolean not null default true,
  allergens jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_products_hotel on products (hotel_id);
create index idx_products_hotel_category on products (hotel_id, category_id);
create index idx_products_hotel_name on products (hotel_id, name);

create trigger trg_products_updated_at
  before update on products
  for each row execute function update_updated_at();

alter table products enable row level security;

create policy "products_select" on products for select
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "products_insert" on products for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "products_update" on products for update
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table products is 'Master product catalog per hotel';

-- 4. SUPPLIERS
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  tax_id text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_suppliers_hotel on suppliers (hotel_id);

create trigger trg_suppliers_updated_at
  before update on suppliers
  for each row execute function update_updated_at();

alter table suppliers enable row level security;

create policy "suppliers_select" on suppliers for select
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "suppliers_insert" on suppliers for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "suppliers_update" on suppliers for update
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table suppliers is 'Supplier directory per hotel';

-- 5. SUPPLIER OFFERS
create table if not exists supplier_offers (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  supplier_id uuid not null references suppliers(id) on delete restrict,
  product_id uuid not null references products(id) on delete restrict,
  unit_id uuid not null references units_of_measure(id) on delete restrict,
  price numeric(14,4) not null,
  min_order_qty numeric(14,3),
  lead_time_days integer,
  is_preferred boolean not null default false,
  valid_from date,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_offers_hotel_product on supplier_offers (hotel_id, product_id);
create index idx_offers_hotel_supplier on supplier_offers (hotel_id, supplier_id);
create index idx_offers_preferred on supplier_offers (hotel_id, product_id) where is_preferred = true;

create trigger trg_offers_updated_at
  before update on supplier_offers
  for each row execute function update_updated_at();

alter table supplier_offers enable row level security;

create policy "offers_select" on supplier_offers for select
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "offers_insert" on supplier_offers for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "offers_update" on supplier_offers for update
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table supplier_offers is 'Supplier pricing per product with preferred flag';

-- 6. PRODUCT ALIASES (for AI matching from recipes)
create table if not exists product_aliases (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  product_id uuid not null references products(id) on delete cascade,
  alias_name text not null,
  source text not null default 'manual' check (source in ('manual', 'ocr', 'voice')),
  created_at timestamptz not null default now()
);

create index idx_aliases_hotel_product on product_aliases (hotel_id, product_id);
create index idx_aliases_hotel_name on product_aliases (hotel_id, alias_name);

alter table product_aliases enable row level security;

create policy "aliases_select" on product_aliases for select
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "aliases_insert" on product_aliases for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "aliases_update" on product_aliases for update
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table product_aliases is 'Alternative names for products used by AI matching';
