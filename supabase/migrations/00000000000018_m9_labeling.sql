-- ============================================================
-- PREP BATCHES — Lotes de preparaciones etiquetadas
-- ============================================================
CREATE TABLE IF NOT EXISTS prep_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  prep_id           UUID REFERENCES recipes(id) ON DELETE SET NULL,
  prep_name         TEXT NOT NULL,
  batch_code        TEXT NOT NULL,
  quantity          NUMERIC(10,3) NOT NULL,
  unit              TEXT NOT NULL DEFAULT 'kg',
  location          TEXT,
  station           TEXT,
  chef_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  chef_name         TEXT,
  allergens         TEXT[] DEFAULT '{}',
  shelf_life_days   INTEGER,
  elaboration_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date       TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'consumed', 'expired', 'discarded')),
  consumed_qty      NUMERIC(10,3) DEFAULT 0,
  label_printed     BOOLEAN DEFAULT FALSE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, batch_code)
);

-- ============================================================
-- PREP ALERTS — Alertas de caducidad
-- ============================================================
CREATE TABLE IF NOT EXISTS prep_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES prep_batches(id) ON DELETE CASCADE,
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL
                  CHECK (alert_type IN ('expiry_72h', 'expiry_48h', 'expiry_24h', 'expired', 'low_quantity')),
  triggered_at    TIMESTAMPTZ DEFAULT NOW(),
  dismissed       BOOLEAN DEFAULT FALSE,
  dismissed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  dismissed_at    TIMESTAMPTZ
);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE prep_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel members can manage prep_batches"
  ON prep_batches FOR ALL
  USING (hotel_id = (SELECT hotel_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Hotel members can manage prep_alerts"
  ON prep_alerts FOR ALL
  USING (hotel_id = (SELECT hotel_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_prep_batches_hotel_status ON prep_batches(hotel_id, status);
CREATE INDEX idx_prep_batches_expiry ON prep_batches(expiry_date) WHERE status = 'active';
CREATE INDEX idx_prep_alerts_hotel_dismissed ON prep_alerts(hotel_id, dismissed);

-- ============================================================
-- TRIGGER: updated_at (reutiliza función existente)
-- ============================================================
CREATE TRIGGER prep_batches_updated_at
  BEFORE UPDATE ON prep_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCIÓN: generador de batch_code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_batch_code(p_hotel_id UUID)
RETURNS TEXT AS $$
DECLARE
  today TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
  count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO count
  FROM prep_batches
  WHERE hotel_id = p_hotel_id
    AND DATE(created_at) = CURRENT_DATE;
  RETURN 'BCH-' || today || '-' || LPAD(count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
