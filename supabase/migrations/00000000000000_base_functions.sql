-- =============================================================================
-- Migration: Base functions
-- Purpose: Reusable trigger function for automatic updated_at timestamps.
--          Created once, used by all subsequent tables.
-- =============================================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

comment on function update_updated_at() is 'Trigger function to auto-update updated_at timestamp on row modification';
