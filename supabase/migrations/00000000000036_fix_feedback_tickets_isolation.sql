-- =============================================================================
-- Migration 36: Security — feedback_tickets cross-tenant isolation
-- Fixes: RO-APPSEC-201
-- =============================================================================
-- feedback_tickets had no hotel_id/tenant_id. The admin SELECT policy only
-- checked "has any active membership" without scoping by hotel, letting an admin
-- of tenant A read/modify all tickets from tenant B (cross-tenant PII leak).

-- Step 1: add tenant columns (nullable for safe backfill)
ALTER TABLE feedback_tickets
  ADD COLUMN IF NOT EXISTS hotel_id  UUID REFERENCES hotels(id),
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Step 2: backfill from the user's default (or oldest active) membership
WITH preferred_membership AS (
  SELECT DISTINCT ON (m.user_id)
    m.user_id,
    m.hotel_id,
    m.tenant_id
  FROM memberships m
  WHERE m.is_active = true
  ORDER BY m.user_id, m.is_default DESC NULLS LAST, m.created_at ASC
)
UPDATE feedback_tickets ft
SET hotel_id  = pm.hotel_id,
    tenant_id = pm.tenant_id
FROM preferred_membership pm
WHERE ft.created_by = pm.user_id
  AND ft.hotel_id IS NULL
  AND ft.tenant_id IS NULL;

-- Step 3: index for hotel-scoped queries
CREATE INDEX IF NOT EXISTS idx_feedback_tickets_hotel
  ON feedback_tickets (hotel_id, status);

-- Step 4: drop overbroad policies
DROP POLICY IF EXISTS "Users can create feedback tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Users can view own tickets"        ON feedback_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets"       ON feedback_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets"     ON feedback_tickets;
DROP POLICY IF EXISTS "Admins can delete tickets"         ON feedback_tickets;

-- Step 5: hotel-scoped policies
-- INSERT: must own the ticket and belong to the hotel
CREATE POLICY "feedback_insert_scoped"
  ON feedback_tickets FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND has_hotel_access(hotel_id)
    AND tenant_id = (SELECT h.tenant_id FROM hotels h WHERE h.id = hotel_id)
  );

-- SELECT (own): creator can always see their own ticket
CREATE POLICY "feedback_select_own"
  ON feedback_tickets FOR SELECT
  USING (
    created_by = auth.uid()
    AND (hotel_id IS NULL OR has_hotel_access(hotel_id))
  );

-- SELECT (admin): scoped to same hotel
CREATE POLICY "feedback_admin_select"
  ON feedback_tickets FOR SELECT
  USING (
    has_hotel_role(hotel_id, ARRAY['superadmin','admin'])
  );

-- UPDATE (admin): scoped to same hotel
CREATE POLICY "feedback_admin_update"
  ON feedback_tickets FOR UPDATE
  USING (
    has_hotel_role(hotel_id, ARRAY['superadmin','admin'])
  )
  WITH CHECK (
    has_hotel_role(hotel_id, ARRAY['superadmin','admin'])
    AND tenant_id = (SELECT h.tenant_id FROM hotels h WHERE h.id = hotel_id)
  );

-- DELETE (admin): scoped to same hotel
CREATE POLICY "feedback_admin_delete"
  ON feedback_tickets FOR DELETE
  USING (
    has_hotel_role(hotel_id, ARRAY['superadmin','admin'])
  );

COMMENT ON COLUMN feedback_tickets.hotel_id  IS 'Hotel context — required for RLS tenant isolation (RO-APPSEC-201)';
COMMENT ON COLUMN feedback_tickets.tenant_id IS 'Tenant context — must match hotels.tenant_id (RO-APPSEC-201)';
