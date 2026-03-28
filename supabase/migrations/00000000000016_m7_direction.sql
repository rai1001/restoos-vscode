-- =============================================================================
-- Migration: M7 — Dirección
-- Module: D7 — KPI snapshots, alerts, alert rules
-- =============================================================================

-- 1. KPI SNAPSHOTS
create table if not exists kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  period_type text not null check (period_type in ('daily', 'weekly', 'monthly')),
  period_date date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index idx_kpi_snapshots_unique on kpi_snapshots (hotel_id, period_type, period_date);
create index idx_kpi_snapshots_hotel_period on kpi_snapshots (hotel_id, period_type, period_date desc);

alter table kpi_snapshots enable row level security;

create policy "kpi_snapshots_select" on kpi_snapshots for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "kpi_snapshots_insert" on kpi_snapshots for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table kpi_snapshots is 'Periodic KPI snapshots for trend tracking';

-- 2. ALERTS
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  alert_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text,
  entity_type text,
  entity_id uuid,
  is_dismissed boolean not null default false,
  dismissed_by uuid references auth.users(id),
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_alerts_hotel on alerts (hotel_id, is_dismissed, created_at desc);
create index idx_alerts_hotel_type on alerts (hotel_id, alert_type);

alter table alerts enable row level security;

create policy "alerts_select" on alerts for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "alerts_insert" on alerts for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "alerts_update" on alerts for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table alerts is 'System alerts for management dashboard';

-- 3. ALERT RULES
create table if not exists alert_rules (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete restrict,
  name text not null,
  alert_type text not null,
  condition_config jsonb not null default '{}'::jsonb,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_alert_rules_hotel on alert_rules (hotel_id, is_active);

create trigger trg_alert_rules_updated_at
  before update on alert_rules
  for each row execute function update_updated_at();

alter table alert_rules enable row level security;

create policy "alert_rules_select" on alert_rules for select
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "alert_rules_insert" on alert_rules for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));
create policy "alert_rules_update" on alert_rules for update
  using (hotel_id in (
    select m.hotel_id from memberships m where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table alert_rules is 'Configurable rules that trigger alerts based on thresholds';
