-- =============================================================================
-- Migration 042: Onboarding state + Billing subscriptions
-- Adds onboarding tracking to tenants and creates subscriptions table
-- =============================================================================

-- 1. ONBOARDING STATE on tenants
alter table tenants
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_step integer not null default 0,
  add column if not exists onboarding_data jsonb not null default '{}'::jsonb;

comment on column tenants.onboarding_completed is 'Whether the tenant has completed the onboarding wizard';
comment on column tenants.onboarding_step is 'Current step in the onboarding wizard (0-4)';
comment on column tenants.onboarding_data is 'Wizard state: restaurant info, imported items, checklist progress';

-- Allow tenant admins to update onboarding fields
create policy "tenants_update_onboarding"
  on tenants for update
  using (
    id in (
      select m.tenant_id from memberships m
      where m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('superadmin', 'admin', 'direction')
    )
  )
  with check (
    id in (
      select m.tenant_id from memberships m
      where m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('superadmin', 'admin', 'direction')
    )
  );

-- 2. SUBSCRIPTIONS TABLE
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete restrict,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'trial'
    check (plan in ('trial', 'control', 'operaciones', 'grupo')),
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create trigger trg_subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();

alter table subscriptions enable row level security;

comment on table subscriptions is 'Billing subscription per tenant. One subscription per organization.';

-- RLS: members of the tenant can read their subscription
create policy "subscriptions_select"
  on subscriptions for select
  using (
    tenant_id in (
      select m.tenant_id from memberships m
      where m.user_id = auth.uid() and m.is_active = true
    )
  );

-- Insert/update only via service_role (webhook handler)
-- No insert/update policies for anon/authenticated — only service_role bypasses RLS
