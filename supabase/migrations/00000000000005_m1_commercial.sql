-- =============================================================================
-- Migration: M1 — Comercial y Reservas
-- Module: D1 — Clients, menus stub, restaurant tables, turns, reservations
-- =============================================================================

-- 1. CLIENTS
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  company text,
  email text,
  phone text,
  tax_id text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_clients_hotel on clients (hotel_id);
create index idx_clients_hotel_name on clients (hotel_id, name);

create trigger trg_clients_updated_at
  before update on clients
  for each row execute function update_updated_at();

alter table clients enable row level security;

create policy "clients_select" on clients for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "clients_insert" on clients for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "clients_update" on clients for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table clients is 'Client directory for restaurant management';

-- 2. MENUS (stub — full implementation in M2)
create table if not exists menus (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  description text,
  menu_type text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  is_template boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_menus_hotel on menus (hotel_id);

create trigger trg_menus_updated_at
  before update on menus
  for each row execute function update_updated_at();

alter table menus enable row level security;

create policy "menus_select" on menus for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "menus_insert" on menus for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "menus_update" on menus for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table menus is 'Menu definitions (stub for M1, full implementation in M2)';

-- 3. RESTAURANT TABLES
create table if not exists restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  zone text,
  capacity integer not null default 4 check (capacity > 0),
  is_active boolean not null default true,
  position_x numeric(8,2),
  position_y numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_restaurant_tables_hotel on restaurant_tables (hotel_id);

create trigger trg_restaurant_tables_updated_at
  before update on restaurant_tables
  for each row execute function update_updated_at();

alter table restaurant_tables enable row level security;

create policy "restaurant_tables_select" on restaurant_tables for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "restaurant_tables_insert" on restaurant_tables for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "restaurant_tables_update" on restaurant_tables for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table restaurant_tables is 'Physical tables in the restaurant with zone and capacity';

-- 4. TURNS (service periods)
create table if not exists turns (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  start_time time not null,
  end_time time not null,
  days integer[] not null default '{1,2,3,4,5,6,7}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_turns_hotel on turns (hotel_id);

create trigger trg_turns_updated_at
  before update on turns
  for each row execute function update_updated_at();

alter table turns enable row level security;

create policy "turns_select" on turns for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "turns_insert" on turns for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "turns_update" on turns for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table turns is 'Service turns/shifts (lunch, dinner, etc.)';

-- 5. RESERVATIONS
create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  date date not null,
  time time not null,
  duration_min integer not null default 90,
  pax integer not null check (pax > 0),
  table_id uuid references restaurant_tables(id) on delete set null,
  turn_id uuid references turns(id) on delete set null,
  menu_id uuid references menus(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled')),
  source text not null default 'phone'
    check (source in ('phone', 'walk_in', 'web', 'app', 'thefork')),
  is_vip boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_reservations_hotel_status on reservations (hotel_id, status);
create index idx_reservations_hotel_date on reservations (hotel_id, date);
create index idx_reservations_hotel_table on reservations (hotel_id, table_id) where table_id is not null;

create trigger trg_reservations_updated_at
  before update on reservations
  for each row execute function update_updated_at();

alter table reservations enable row level security;

create policy "reservations_select" on reservations for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "reservations_insert" on reservations for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "reservations_update" on reservations for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table reservations is 'Restaurant table reservations with full lifecycle';
