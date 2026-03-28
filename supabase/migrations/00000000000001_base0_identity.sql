-- =============================================================================
-- Migration: Base 0 — Identity
-- Module: D0 — Auth, tenants, hotels, memberships, audit, domain events
-- Tables: tenants, hotels, profiles, memberships, audit_logs, domain_events
-- =============================================================================

-- 1. TENANTS
-- Top-level organization. No hotel_id — this IS the top.
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tenants_updated_at
  before update on tenants
  for each row execute function update_updated_at();

alter table tenants enable row level security;

comment on table tenants is 'Top-level organization grouping one or more hotels';

-- 2. HOTELS
-- Operational unit within a tenant.
create table if not exists hotels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  name text not null,
  slug text not null,
  timezone text not null default 'Europe/Madrid',
  currency text not null default 'EUR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index idx_hotels_tenant on hotels (tenant_id);

create trigger trg_hotels_updated_at
  before update on hotels
  for each row execute function update_updated_at();

alter table hotels enable row level security;

comment on table hotels is 'Operational unit (restaurant, hotel, catering) within a tenant';

-- 3. PROFILES
-- Extends auth.users with application-level data.
-- id = auth.users.id (1:1 relationship)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  preferred_locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

alter table profiles enable row level security;

comment on table profiles is 'User profile extending auth.users with app-specific data';

-- Auto-create profile on new user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 4. MEMBERSHIPS
-- Pivote user <-> hotel with role. THE anchor for all RLS policies.
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hotel_id uuid not null references hotels(id) on delete restrict,
  tenant_id uuid not null references tenants(id) on delete restrict,
  role text not null default 'cook'
    check (role in ('superadmin', 'direction', 'commercial', 'head_chef', 'cook', 'procurement', 'room', 'reception', 'admin')),
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, hotel_id)
);

create index idx_memberships_user on memberships (user_id) where is_active = true;
create index idx_memberships_hotel on memberships (hotel_id) where is_active = true;
create index idx_memberships_user_default on memberships (user_id) where is_default = true;

create trigger trg_memberships_updated_at
  before update on memberships
  for each row execute function update_updated_at();

alter table memberships enable row level security;

comment on table memberships is 'Links users to hotels with a role. Core of RLS and RBAC';

-- 5. AUDIT_LOGS
-- Append-only. No update or delete allowed via RLS.
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  performed_by uuid references auth.users(id),
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_audit_logs_hotel_entity on audit_logs (hotel_id, entity_type, entity_id);
create index idx_audit_logs_hotel_performed on audit_logs (hotel_id, performed_at desc);

alter table audit_logs enable row level security;

comment on table audit_logs is 'Immutable audit trail for all domain actions';

-- 6. DOMAIN_EVENTS
-- Bus interno de eventos del dominio. Inmutables una vez creados.
create table if not exists domain_events (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processed', 'failed')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_domain_events_hotel_status on domain_events (hotel_id, processing_status);
create index idx_domain_events_entity on domain_events (entity_type, entity_id);
create index idx_domain_events_occurred on domain_events (hotel_id, occurred_at desc);

alter table domain_events enable row level security;

comment on table domain_events is 'Immutable domain event bus for driving automation jobs';

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- TENANTS: read for members of any hotel in that tenant
create policy "tenants_select"
  on tenants for select
  using (
    id in (
      select m.tenant_id from memberships m
      where m.user_id = auth.uid() and m.is_active = true
    )
  );

-- HOTELS: read for members with active membership
create policy "hotels_select"
  on hotels for select
  using (
    id in (
      select m.hotel_id from memberships m
      where m.user_id = auth.uid() and m.is_active = true
    )
  );

-- PROFILES: users read/update their own
create policy "profiles_select_own"
  on profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid());

-- MEMBERSHIPS: users read their own memberships
create policy "memberships_select_own"
  on memberships for select
  using (user_id = auth.uid() and is_active = true);

-- MEMBERSHIPS: admins/direction can read all memberships for their hotel
create policy "memberships_select_hotel_admin"
  on memberships for select
  using (
    hotel_id in (
      select m.hotel_id from memberships m
      where m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('admin', 'direction', 'superadmin')
    )
  );

-- AUDIT_LOGS: read for hotel members
create policy "audit_logs_select"
  on audit_logs for select
  using (
    hotel_id in (
      select m.hotel_id from memberships m
      where m.user_id = auth.uid() and m.is_active = true
    )
  );

-- DOMAIN_EVENTS: read for hotel members
create policy "domain_events_select"
  on domain_events for select
  using (
    hotel_id in (
      select m.hotel_id from memberships m
      where m.user_id = auth.uid() and m.is_active = true
    )
  );
