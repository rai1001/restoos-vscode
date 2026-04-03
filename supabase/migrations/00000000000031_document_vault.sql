-- =============================================================================
-- Migration 31: Document Vault — Inmutable ledger for legal documents
-- Tables: document_vault, document_custody_log, document_integrity_checks,
--         legal_retention_policies
-- Purpose: Redundancy, security, traceability for invoices, delivery notes,
--          APPCC records per Spanish fiscal + food safety regulations
-- =============================================================================

-- ─── DOCUMENT VAULT ─────────────────────────────────────────────────────────
-- Master record for every legal document. IMMUTABLE: no UPDATE, no DELETE.

CREATE TABLE IF NOT EXISTS document_vault (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id            UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  -- Document identity
  doc_type            TEXT NOT NULL
    CHECK (doc_type IN (
      'factura', 'albaran', 'ticket', 'appcc_cierre',
      'appcc_incidencia', 'certificado_proveedor'
    )),
  doc_number          TEXT,
  doc_date            DATE,
  doc_status          TEXT NOT NULL DEFAULT 'digitalizando'
    CHECK (doc_status IN (
      'digitalizando', 'digitalizado', 'necesita_revision',
      'rechazado', 'eliminado'
    )),

  -- Storage
  storage_path        TEXT NOT NULL,
  storage_path_backup TEXT,
  file_hash_sha256    TEXT NOT NULL,
  file_size_bytes     BIGINT,
  mime_type           TEXT,

  -- Source tracking
  source              TEXT NOT NULL DEFAULT 'upload_manual'
    CHECK (source IN (
      'upload_manual', 'email_auto', 'ocr_scan', 'api_import'
    )),

  -- Linked entity (polymorphic)
  linked_entity_type  TEXT
    CHECK (linked_entity_type IN (
      'factura_recibida', 'goods_receipt', 'appcc_daily_closure',
      'appcc_incident', 'purchase_order', NULL
    )),
  linked_entity_id    UUID,

  -- Supplier reference
  supplier_id         UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name       TEXT,

  -- Financial
  total_amount        NUMERIC(14,2),
  currency            TEXT DEFAULT 'EUR',

  -- OCR / extraction metadata
  ocr_confidence      INTEGER CHECK (ocr_confidence BETWEEN 0 AND 100),
  extracted_data      JSONB DEFAULT '{}'::jsonb,
  missing_fields      TEXT[] DEFAULT '{}',

  -- Retention
  retention_until     DATE,

  -- Timestamps — NO updated_at (immutable)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES auth.users(id)
);

-- Indexes for hot queries
CREATE INDEX idx_vault_hotel_type ON document_vault(hotel_id, doc_type);
CREATE INDEX idx_vault_hotel_status ON document_vault(hotel_id, doc_status);
CREATE INDEX idx_vault_hotel_date ON document_vault(hotel_id, doc_date DESC);
CREATE INDEX idx_vault_supplier ON document_vault(supplier_id);
CREATE INDEX idx_vault_hash ON document_vault(file_hash_sha256);
CREATE INDEX idx_vault_linked ON document_vault(linked_entity_type, linked_entity_id);
CREATE INDEX idx_vault_retention ON document_vault(retention_until)
  WHERE retention_until IS NOT NULL;

ALTER TABLE document_vault ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE document_vault IS
  'Immutable ledger for all legal documents — invoices, delivery notes, APPCC records. No UPDATE/DELETE via RLS.';

-- ─── DOCUMENT CUSTODY LOG ───────────────────────────────────────────────────
-- Chain of custody: who did what, when, from where. Append-only.

CREATE TABLE IF NOT EXISTS document_custody_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES document_vault(id) ON DELETE RESTRICT,
  action        TEXT NOT NULL
    CHECK (action IN (
      'created', 'viewed', 'downloaded', 'verified',
      'exported', 'shared', 'archived', 'status_changed',
      'backup_created', 'restored'
    )),
  actor_id      UUID REFERENCES auth.users(id),
  actor_role    TEXT,
  ip_address    INET,
  user_agent    TEXT,
  details       JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custody_document ON document_custody_log(document_id, created_at DESC);
CREATE INDEX idx_custody_actor ON document_custody_log(actor_id, created_at DESC);

ALTER TABLE document_custody_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE document_custody_log IS
  'Append-only chain of custody for document_vault entries';

-- ─── DOCUMENT INTEGRITY CHECKS ─────────────────────────────────────────────
-- Results of periodic integrity verification.

CREATE TABLE IF NOT EXISTS document_integrity_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES document_vault(id) ON DELETE RESTRICT,
  check_type      TEXT NOT NULL
    CHECK (check_type IN ('hash_verify', 'backup_verify', 'cross_reference')),
  status          TEXT NOT NULL
    CHECK (status IN ('passed', 'failed', 'warning')),
  expected_hash   TEXT,
  actual_hash     TEXT,
  details         JSONB DEFAULT '{}'::jsonb,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_integrity_document ON document_integrity_checks(document_id, checked_at DESC);
CREATE INDEX idx_integrity_status ON document_integrity_checks(status)
  WHERE status IN ('failed', 'warning');

ALTER TABLE document_integrity_checks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE document_integrity_checks IS
  'Results of periodic document integrity verification (hash, backup, cross-reference)';

-- ─── LEGAL RETENTION POLICIES ───────────────────────────────────────────────
-- Configurable retention rules per document type.

CREATE TABLE IF NOT EXISTS legal_retention_policies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type            TEXT NOT NULL UNIQUE
    CHECK (doc_type IN (
      'factura', 'albaran', 'ticket', 'appcc_cierre',
      'appcc_incidencia', 'certificado_proveedor'
    )),
  retention_years     INTEGER NOT NULL DEFAULT 4,
  requires_backup     BOOLEAN NOT NULL DEFAULT true,
  requires_encryption BOOLEAN NOT NULL DEFAULT false,
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE legal_retention_policies ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE legal_retention_policies IS
  'Retention rules per document type — Spanish fiscal law (4y invoices) + APPCC (2y minimum)';

-- Seed default retention policies (Spain)
INSERT INTO legal_retention_policies (doc_type, retention_years, requires_backup, description) VALUES
  ('factura',                4, true,  'Ley General Tributaria — 4 años de obligación de conservación'),
  ('albaran',                4, true,  'Vinculado a factura — misma retención fiscal'),
  ('ticket',                 4, true,  'Justificante de gasto — retención fiscal estándar'),
  ('appcc_cierre',           2, true,  'Reglamento CE 852/2004 — mínimo 2 años registros APPCC'),
  ('appcc_incidencia',       5, true,  'Incidencias sanitarias — retención extendida por precaución'),
  ('certificado_proveedor',  4, true,  'Certificados de homologación — vinculados a período fiscal')
ON CONFLICT (doc_type) DO NOTHING;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- document_vault: SELECT only for hotel members. No UPDATE, no DELETE.
CREATE POLICY "vault_select"
  ON document_vault FOR SELECT
  USING (has_hotel_access(hotel_id));

CREATE POLICY "vault_insert"
  ON document_vault FOR INSERT
  WITH CHECK (has_hotel_access(hotel_id));

-- BLOCK UPDATE: only allow doc_status changes (soft operations)
CREATE POLICY "vault_update_status"
  ON document_vault FOR UPDATE
  USING (has_hotel_access(hotel_id))
  WITH CHECK (
    has_hotel_access(hotel_id)
    -- Only status can change
    AND doc_type = doc_type
    AND file_hash_sha256 = file_hash_sha256
    AND storage_path = storage_path
  );

-- BLOCK DELETE entirely
-- (No DELETE policy = blocked by RLS)

-- document_custody_log: read + append only
CREATE POLICY "custody_select"
  ON document_custody_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_vault dv
      WHERE dv.id = document_custody_log.document_id
        AND has_hotel_access(dv.hotel_id)
    )
  );

CREATE POLICY "custody_insert"
  ON document_custody_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_vault dv
      WHERE dv.id = document_custody_log.document_id
        AND has_hotel_access(dv.hotel_id)
    )
  );

-- document_integrity_checks: read + insert
CREATE POLICY "integrity_select"
  ON document_integrity_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_vault dv
      WHERE dv.id = document_integrity_checks.document_id
        AND has_hotel_access(dv.hotel_id)
    )
  );

CREATE POLICY "integrity_insert"
  ON document_integrity_checks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_vault dv
      WHERE dv.id = document_integrity_checks.document_id
        AND has_hotel_access(dv.hotel_id)
    )
  );

-- legal_retention_policies: read-only for all authenticated
CREATE POLICY "retention_select"
  ON legal_retention_policies FOR SELECT
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-create custody log entry on vault insert
CREATE OR REPLACE FUNCTION log_vault_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO document_custody_log (document_id, action, actor_id, details)
  VALUES (
    NEW.id,
    'created',
    NEW.created_by,
    jsonb_build_object(
      'doc_type', NEW.doc_type,
      'doc_number', NEW.doc_number,
      'source', NEW.source,
      'file_hash', NEW.file_hash_sha256
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vault_creation_custody
  AFTER INSERT ON document_vault
  FOR EACH ROW EXECUTE FUNCTION log_vault_creation();

-- Auto-emit domain event on vault insert
CREATE OR REPLACE FUNCTION emit_vault_domain_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO domain_events (hotel_id, event_type, entity_type, entity_id, payload)
  VALUES (
    NEW.hotel_id,
    'document.created',
    'document_vault',
    NEW.id,
    jsonb_build_object(
      'doc_type', NEW.doc_type,
      'doc_number', NEW.doc_number,
      'supplier_name', NEW.supplier_name,
      'total_amount', NEW.total_amount,
      'source', NEW.source
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vault_domain_event
  AFTER INSERT ON document_vault
  FOR EACH ROW EXECUTE FUNCTION emit_vault_domain_event();

-- Log status changes in custody
CREATE OR REPLACE FUNCTION log_vault_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.doc_status IS DISTINCT FROM NEW.doc_status THEN
    INSERT INTO document_custody_log (document_id, action, details)
    VALUES (
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'from', OLD.doc_status,
        'to', NEW.doc_status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vault_status_custody
  AFTER UPDATE ON document_vault
  FOR EACH ROW EXECUTE FUNCTION log_vault_status_change();

-- Auto-calculate retention_until on insert
CREATE OR REPLACE FUNCTION set_retention_until()
RETURNS TRIGGER AS $$
DECLARE
  years INTEGER;
BEGIN
  SELECT retention_years INTO years
    FROM legal_retention_policies
    WHERE doc_type = NEW.doc_type;

  IF years IS NOT NULL AND NEW.doc_date IS NOT NULL THEN
    NEW.retention_until := NEW.doc_date + (years || ' years')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vault_set_retention
  BEFORE INSERT ON document_vault
  FOR EACH ROW EXECUTE FUNCTION set_retention_until();
