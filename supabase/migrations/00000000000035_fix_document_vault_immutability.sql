-- =============================================================================
-- Migration 35: Security — Document Vault Immutability Hardening
-- Fixes: RO-APPSEC-207, RO-APPSEC-208
-- =============================================================================

-- ─── RO-APPSEC-207 ────────────────────────────────────────────────────────────
-- vault_update_status policy has a tautological WITH CHECK (column = column).
-- Any hotel member can mutate storage_path, file_hash, total_amount, etc.
-- Fix: DROP direct UPDATE policy. All updates must go through SECURITY DEFINER RPCs.
-- custody_insert allowed any hotel member to fabricate audit trail entries.
-- Fix: DROP custody_insert. Inserts only via triggers and SECURITY DEFINER RPCs.

DROP POLICY IF EXISTS "vault_update_status" ON document_vault;
DROP POLICY IF EXISTS "custody_insert" ON document_custody_log;

-- ─── RO-APPSEC-208 ────────────────────────────────────────────────────────────
-- store_document() accepted p_tenant_id from the caller and inserted it verbatim.
-- A hotel A member could forge documents attributed to tenant B.
-- Fix: derive tenant_id from hotels table; p_tenant_id parameter kept for API
-- compatibility but is ignored.

CREATE OR REPLACE FUNCTION store_document(
  p_hotel_id          UUID,
  p_tenant_id         UUID,      -- kept for caller compatibility; value is IGNORED
  p_doc_type          TEXT,
  p_doc_number        TEXT DEFAULT NULL,
  p_doc_date          DATE DEFAULT CURRENT_DATE,
  p_storage_path      TEXT DEFAULT '',
  p_file_hash         TEXT DEFAULT '',
  p_file_size         BIGINT DEFAULT NULL,
  p_mime_type         TEXT DEFAULT NULL,
  p_source            TEXT DEFAULT 'upload_manual',
  p_linked_type       TEXT DEFAULT NULL,
  p_linked_id         UUID DEFAULT NULL,
  p_supplier_id       UUID DEFAULT NULL,
  p_supplier_name     TEXT DEFAULT NULL,
  p_total_amount      NUMERIC DEFAULT NULL,
  p_ocr_confidence    INTEGER DEFAULT NULL,
  p_extracted_data    JSONB DEFAULT '{}'::jsonb,
  p_missing_fields    TEXT[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_doc_id    UUID;
  v_status    TEXT := 'digitalizando';
  v_tenant_id UUID;
BEGIN
  -- Validate access
  IF NOT has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Access denied to hotel %', p_hotel_id;
  END IF;

  -- RO-APPSEC-208: derive tenant_id from authoritative source, never from caller
  SELECT tenant_id INTO v_tenant_id FROM hotels WHERE id = p_hotel_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Hotel not found: %', p_hotel_id;
  END IF;

  -- Determine initial status based on OCR confidence
  IF p_ocr_confidence IS NOT NULL THEN
    IF p_ocr_confidence >= 85 THEN
      v_status := 'digitalizado';
    ELSIF p_ocr_confidence >= 50 THEN
      v_status := 'necesita_revision';
    ELSE
      v_status := 'rechazado';
    END IF;
  END IF;

  -- Override if missing fields
  IF array_length(p_missing_fields, 1) > 0 AND v_status = 'digitalizado' THEN
    v_status := 'necesita_revision';
  END IF;

  INSERT INTO document_vault (
    hotel_id, tenant_id, doc_type, doc_number, doc_date, doc_status,
    storage_path, file_hash_sha256, file_size_bytes, mime_type,
    source, linked_entity_type, linked_entity_id,
    supplier_id, supplier_name, total_amount,
    ocr_confidence, extracted_data, missing_fields,
    created_by
  ) VALUES (
    p_hotel_id, v_tenant_id, p_doc_type, p_doc_number, p_doc_date, v_status,
    p_storage_path, p_file_hash, p_file_size, p_mime_type,
    p_source, p_linked_type, p_linked_id,
    p_supplier_id, p_supplier_name, p_total_amount,
    p_ocr_confidence, p_extracted_data, p_missing_fields,
    auth.uid()
  )
  RETURNING id INTO v_doc_id;

  RETURN v_doc_id;
END;
$$;

COMMENT ON FUNCTION store_document IS
  'Store a document in the vault. tenant_id is always derived from hotels table — caller p_tenant_id is ignored (RO-APPSEC-208).';
