-- ============================================================
-- FEEDBACK TICKETS — Sistema de tickets de feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_tickets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              TEXT NOT NULL CHECK (type IN ('bug', 'design', 'feature', 'other')),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  screenshot_url    TEXT,
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'resolved', 'needs_info')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low', 'medium', 'high')),
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name   TEXT,
  created_by_email  TEXT,
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE feedback_tickets ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden crear tickets
CREATE POLICY "Users can create feedback tickets"
  ON feedback_tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Usuarios pueden ver sus propios tickets
CREATE POLICY "Users can view own tickets"
  ON feedback_tickets FOR SELECT
  USING (created_by = auth.uid());

-- Admins pueden ver todos los tickets
CREATE POLICY "Admins can view all tickets"
  ON feedback_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'admin', 'direction')
      AND is_active = true
    )
  );

-- Admins pueden actualizar todos los tickets
CREATE POLICY "Admins can update all tickets"
  ON feedback_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'admin', 'direction')
      AND is_active = true
    )
  );

-- Admins pueden eliminar tickets
CREATE POLICY "Admins can delete tickets"
  ON feedback_tickets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
      AND role IN ('superadmin', 'admin', 'direction')
      AND is_active = true
    )
  );

-- ============================================================
-- INDICES
-- ============================================================
CREATE INDEX idx_feedback_tickets_status ON feedback_tickets(status);
CREATE INDEX idx_feedback_tickets_created_by ON feedback_tickets(created_by);
CREATE INDEX idx_feedback_tickets_type ON feedback_tickets(type);

-- ============================================================
-- TRIGGER: updated_at (reutiliza funcion existente)
-- ============================================================
CREATE TRIGGER feedback_tickets_updated_at
  BEFORE UPDATE ON feedback_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
