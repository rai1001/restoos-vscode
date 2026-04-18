-- =============================================================================
-- Migration 045: Fix RLS recursion in migration 026 policies
-- =============================================================================
-- Migration 026 introduced policies that directly subquery the memberships
-- table, which reintroduces the infinite-recursion pattern that migration
-- 022 fixed with SECURITY DEFINER helpers (has_hotel_access).
--
-- This migration drops those policies and recreates them using
-- has_hotel_access(hotel_id) so RLS evaluation stops recursing through
-- memberships.
-- RO-APPSEC-RLS-001
-- =============================================================================

-- staff_members
drop policy if exists "hotel_member_staff" on staff_members;
create policy "hotel_member_staff" on staff_members
  for all using (has_hotel_access(hotel_id))
  with check (has_hotel_access(hotel_id));

-- staff_shifts
drop policy if exists "hotel_member_shifts" on staff_shifts;
create policy "hotel_member_shifts" on staff_shifts
  for all using (has_hotel_access(hotel_id))
  with check (has_hotel_access(hotel_id));

-- sales_data
drop policy if exists "hotel_member_sales" on sales_data;
create policy "hotel_member_sales" on sales_data
  for all using (has_hotel_access(hotel_id))
  with check (has_hotel_access(hotel_id));

-- reservations — migration 026 also added "hotel_member_reservations"
drop policy if exists "hotel_member_reservations" on reservations;
create policy "hotel_member_reservations" on reservations
  for all using (has_hotel_access(hotel_id))
  with check (has_hotel_access(hotel_id));

-- product_aliases — drop only if the recursive policy exists (may be named
-- differently across environments). Safe to skip silently if not present.
drop policy if exists "hotel_member_aliases" on product_aliases;
