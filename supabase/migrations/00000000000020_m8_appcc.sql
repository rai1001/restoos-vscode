-- ============================================================
-- M8: APPCC — Sistema de Análisis de Peligros y Puntos Críticos
-- ============================================================

-- ─── CHECK TEMPLATES ─────────────────────────────────────────
-- Plantillas de control configurables por hotel
CREATE TABLE IF NOT EXISTS check_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  check_type      TEXT NOT NULL CHECK (check_type IN (
                    'temperatura', 'limpieza', 'recepcion',
                    'higiene_personal', 'control_plagas',
                    'aceite_fritura', 'otro'
                  )),
  frequency       TEXT NOT NULL DEFAULT 'diario' CHECK (frequency IN (
                    'diario', 'semanal', 'mensual', 'por_recepcion'
                  )),
  description     TEXT,
  min_value       NUMERIC(10,2),
  max_value       NUMERIC(10,2),
  unit            TEXT,                 -- '°C', '%', 'pH', 'ppm', NULL for binary
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_check_templates_hotel ON check_templates(hotel_id) WHERE is_active = true;
CREATE TRIGGER trg_check_templates_updated_at
  BEFORE UPDATE ON check_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── CHECK RECORDS ───────────────────────────────────────────
-- Registros individuales de controles APPCC
CREATE TABLE IF NOT EXISTS check_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  template_id       UUID NOT NULL REFERENCES check_templates(id) ON DELETE RESTRICT,
  check_date        DATE NOT NULL,           -- día del registro
  value             NUMERIC(10,2),           -- valor medido (NULL = binario ok/nok)
  status            TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'alerta', 'critico')),
  notes             TEXT,
  corrective_action TEXT,
  checked_by        UUID NOT NULL REFERENCES auth.users(id),
  checked_by_name   TEXT NOT NULL,
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_check_records_hotel_date ON check_records(hotel_id, check_date);
CREATE INDEX idx_check_records_template ON check_records(template_id);
CREATE INDEX idx_check_records_status ON check_records(hotel_id, status) WHERE status != 'ok';

-- ─── DAILY CLOSURES ─────────────────────────────────────────
-- Cierre diario APPCC con validación del responsable
CREATE TABLE IF NOT EXISTS appcc_daily_closures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  closure_date    DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                    'open',           -- día en curso, registros abiertos
                    'completed',      -- todos los checks hechos
                    'validated',      -- firmado por responsable
                    'reopened'        -- reabierto tras validación
                  )),
  total_checks    INTEGER NOT NULL DEFAULT 0,
  ok_count        INTEGER NOT NULL DEFAULT 0,
  alert_count     INTEGER NOT NULL DEFAULT 0,
  critical_count  INTEGER NOT NULL DEFAULT 0,
  completion_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  incidents_open  INTEGER NOT NULL DEFAULT 0,
  validated_by    UUID REFERENCES auth.users(id),
  validated_by_name TEXT,
  validated_at    TIMESTAMPTZ,
  validation_notes TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_appcc_daily_closures_unique ON appcc_daily_closures(hotel_id, closure_date);
CREATE TRIGGER trg_appcc_daily_closures_updated_at
  BEFORE UPDATE ON appcc_daily_closures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── INCIDENTS ───────────────────────────────────────────────
-- No conformidades / incidencias APPCC
CREATE TABLE IF NOT EXISTS appcc_incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  record_id       UUID REFERENCES check_records(id) ON DELETE SET NULL,
  incident_date   DATE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                    'open', 'in_progress', 'resolved', 'closed'
                  )),
  corrective_action TEXT,
  resolved_by     UUID REFERENCES auth.users(id),
  resolved_by_name TEXT,
  resolved_at     TIMESTAMPTZ,
  reported_by     UUID NOT NULL REFERENCES auth.users(id),
  reported_by_name TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appcc_incidents_hotel ON appcc_incidents(hotel_id, incident_date);
CREATE INDEX idx_appcc_incidents_status ON appcc_incidents(hotel_id, status) WHERE status != 'closed';
CREATE TRIGGER trg_appcc_incidents_updated_at
  BEFORE UPDATE ON appcc_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- HELPER FUNCTIONS — avoid RLS recursion on memberships
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_hotel_access(p_hotel_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND hotel_id = p_hotel_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_hotel_role(p_hotel_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND hotel_id = p_hotel_id AND is_active = true
      AND role = ANY(p_roles)
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE check_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appcc_daily_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE appcc_incidents ENABLE ROW LEVEL SECURITY;

-- check_templates
CREATE POLICY "Members can read check_templates"
  ON check_templates FOR SELECT
  USING (public.has_hotel_access(hotel_id));

CREATE POLICY "Admins can insert check_templates"
  ON check_templates FOR INSERT
  WITH CHECK (public.has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','head_chef']));

CREATE POLICY "Admins can update check_templates"
  ON check_templates FOR UPDATE
  USING (public.has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','head_chef']));

CREATE POLICY "Admins can delete check_templates"
  ON check_templates FOR DELETE
  USING (public.has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','head_chef']));

-- check_records
CREATE POLICY "Members can read check_records"
  ON check_records FOR SELECT
  USING (public.has_hotel_access(hotel_id));

CREATE POLICY "Staff can create check_records"
  ON check_records FOR INSERT
  WITH CHECK (public.has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','head_chef','cook']));

CREATE POLICY "Staff can update own check_records"
  ON check_records FOR UPDATE
  USING (checked_by = auth.uid() AND public.has_hotel_access(hotel_id));

-- appcc_daily_closures
CREATE POLICY "Members can read appcc_daily_closures"
  ON appcc_daily_closures FOR SELECT
  USING (public.has_hotel_access(hotel_id));

CREATE POLICY "Admins can insert appcc_daily_closures"
  ON appcc_daily_closures FOR INSERT
  WITH CHECK (public.has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','head_chef']));

CREATE POLICY "Admins can update appcc_daily_closures"
  ON appcc_daily_closures FOR UPDATE
  USING (public.has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','head_chef']));

-- appcc_incidents
CREATE POLICY "Members can read appcc_incidents"
  ON appcc_incidents FOR SELECT
  USING (public.has_hotel_access(hotel_id));

CREATE POLICY "Staff can create appcc_incidents"
  ON appcc_incidents FOR INSERT
  WITH CHECK (public.has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','head_chef','cook']));

CREATE POLICY "Staff can update appcc_incidents"
  ON appcc_incidents FOR UPDATE
  USING (public.has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','head_chef']));
