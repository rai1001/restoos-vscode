-- =============================================================================
-- Agent infrastructure tables for CulinaryOS AI agents
-- =============================================================================

-- ─── AGENT LOGS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  agent_name      TEXT NOT NULL,
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  tokens_input    INTEGER,
  tokens_output   INTEGER,
  result          JSONB,
  error           TEXT,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_hotel ON agent_logs(hotel_id, agent_name, triggered_at DESC);

-- ─── INVOICE DISCREPANCIES ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_discrepancies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN (
    'price_mismatch', 'quantity_mismatch', 'nif_mismatch', 'missing_field', 'other'
  )),
  expected_value  TEXT,
  actual_value    TEXT,
  severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'ignored')),
  details         JSONB,
  resolved_by     UUID REFERENCES auth.users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discrepancies_hotel ON invoice_discrepancies(hotel_id, status);

-- ─── MENU ENGINEERING REPORTS ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS menu_engineering_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  report_date     DATE NOT NULL,
  period_days     INTEGER NOT NULL DEFAULT 30,
  total_revenue   NUMERIC(14,2),
  total_cost      NUMERIC(14,2),
  dishes          JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (hotel_id, report_date)
);

-- ─── PURCHASE SUGGESTIONS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'dismissed')),
  lines           JSONB NOT NULL DEFAULT '[]',
  total_estimated NUMERIC(14,2),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestions_hotel ON purchase_suggestions(hotel_id, status);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_engineering_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_member_agent_logs" ON agent_logs
  FOR ALL USING (hotel_id IN (SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active));
CREATE POLICY "hotel_member_discrepancies" ON invoice_discrepancies
  FOR ALL USING (hotel_id IN (SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active));
CREATE POLICY "hotel_member_me_reports" ON menu_engineering_reports
  FOR ALL USING (hotel_id IN (SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active));
CREATE POLICY "hotel_member_suggestions" ON purchase_suggestions
  FOR ALL USING (hotel_id IN (SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active));
