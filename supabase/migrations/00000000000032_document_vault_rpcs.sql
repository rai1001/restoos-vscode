-- =============================================================================
-- Migration 32: Document Vault RPCs
-- Functions: store_document, verify_document_integrity, get_document_with_custody,
--            batch_integrity_check, get_missing_documents_report,
--            get_retention_compliance, cross_reference_documents
-- =============================================================================

-- ─── STORE DOCUMENT ─────────────────────────────────────────────────────────
-- Stores a document in the vault with full metadata.
-- Returns the new document_vault.id.

CREATE OR REPLACE FUNCTION store_document(
  p_hotel_id          UUID,
  p_tenant_id         UUID,
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
  v_doc_id UUID;
  v_status TEXT := 'digitalizando';
BEGIN
  -- Validate access
  IF NOT has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Access denied to hotel %', p_hotel_id;
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
    p_hotel_id, p_tenant_id, p_doc_type, p_doc_number, p_doc_date, v_status,
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
  'Store a document in the vault with automatic status determination and custody tracking';

-- ─── VERIFY DOCUMENT INTEGRITY ──────────────────────────────────────────────
-- Compares stored hash with provided hash. Records result.

CREATE OR REPLACE FUNCTION verify_document_integrity(
  p_document_id   UUID,
  p_actual_hash   TEXT
)
RETURNS TABLE (
  document_id     UUID,
  status          TEXT,
  expected_hash   TEXT,
  actual_hash     TEXT,
  match           BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_expected_hash TEXT;
  v_status TEXT;
  v_hotel_id UUID;
BEGIN
  SELECT dv.file_hash_sha256, dv.hotel_id
    INTO v_expected_hash, v_hotel_id
    FROM document_vault dv
    WHERE dv.id = p_document_id;

  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Document % not found', p_document_id;
  END IF;

  IF NOT has_hotel_access(v_hotel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_expected_hash = p_actual_hash THEN
    v_status := 'passed';
  ELSE
    v_status := 'failed';
  END IF;

  -- Record the check
  INSERT INTO document_integrity_checks (
    document_id, check_type, status, expected_hash, actual_hash, checked_by
  ) VALUES (
    p_document_id, 'hash_verify', v_status, v_expected_hash, p_actual_hash, auth.uid()
  );

  -- Log custody event
  INSERT INTO document_custody_log (document_id, action, actor_id, details)
  VALUES (
    p_document_id,
    'verified',
    auth.uid(),
    jsonb_build_object('result', v_status, 'hash_match', v_expected_hash = p_actual_hash)
  );

  RETURN QUERY SELECT
    p_document_id,
    v_status,
    v_expected_hash,
    p_actual_hash,
    (v_expected_hash = p_actual_hash);
END;
$$;

COMMENT ON FUNCTION verify_document_integrity IS
  'Verify document integrity by comparing SHA-256 hashes. Records result in integrity_checks.';

-- ─── GET DOCUMENT WITH CUSTODY ──────────────────────────────────────────────
-- Returns doc details + logs the view in custody chain.

CREATE OR REPLACE FUNCTION get_document_with_custody(
  p_document_id UUID,
  p_action      TEXT DEFAULT 'viewed'
)
RETURNS SETOF document_vault
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hotel_id UUID;
BEGIN
  SELECT hotel_id INTO v_hotel_id
    FROM document_vault WHERE id = p_document_id;

  IF NOT has_hotel_access(v_hotel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Log custody
  INSERT INTO document_custody_log (document_id, action, actor_id)
  VALUES (p_document_id, p_action, auth.uid());

  RETURN QUERY SELECT * FROM document_vault WHERE id = p_document_id;
END;
$$;

-- ─── BATCH INTEGRITY CHECK ─────────────────────────────────────────────────
-- Returns documents that have never been verified or last check failed.

CREATE OR REPLACE FUNCTION get_documents_needing_verification(
  p_hotel_id UUID,
  p_limit    INTEGER DEFAULT 50
)
RETURNS TABLE (
  document_id       UUID,
  doc_type          TEXT,
  doc_number        TEXT,
  file_hash_sha256  TEXT,
  storage_path      TEXT,
  last_check_status TEXT,
  last_checked_at   TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    dv.id,
    dv.doc_type,
    dv.doc_number,
    dv.file_hash_sha256,
    dv.storage_path,
    last_check.status,
    last_check.checked_at
  FROM document_vault dv
  LEFT JOIN LATERAL (
    SELECT dic.status, dic.checked_at
    FROM document_integrity_checks dic
    WHERE dic.document_id = dv.id
    ORDER BY dic.checked_at DESC
    LIMIT 1
  ) last_check ON true
  WHERE dv.hotel_id = p_hotel_id
    AND dv.doc_status NOT IN ('eliminado', 'rechazado')
    AND (
      last_check.status IS NULL               -- never checked
      OR last_check.status = 'failed'         -- last check failed
      OR last_check.checked_at < NOW() - INTERVAL '7 days'  -- stale
    )
  ORDER BY last_check.checked_at ASC NULLS FIRST
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_documents_needing_verification IS
  'Returns documents that need integrity verification (never checked, failed, or stale >7 days)';

-- ─── MISSING DOCUMENTS REPORT ───────────────────────────────────────────────
-- Finds invoices without matching delivery notes and vice versa.

CREATE OR REPLACE FUNCTION get_missing_documents_report(
  p_hotel_id  UUID,
  p_from_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_to_date   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  document_id     UUID,
  doc_type        TEXT,
  doc_number      TEXT,
  doc_date        DATE,
  supplier_name   TEXT,
  total_amount    NUMERIC,
  has_matching    BOOLEAN,
  matching_doc_id UUID
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    dv.id,
    dv.doc_type,
    dv.doc_number,
    dv.doc_date,
    dv.supplier_name,
    dv.total_amount,
    -- Check if there's a matching document from same supplier ±7 days
    EXISTS (
      SELECT 1 FROM document_vault m
      WHERE m.hotel_id = p_hotel_id
        AND m.supplier_id = dv.supplier_id
        AND m.supplier_id IS NOT NULL
        AND m.id <> dv.id
        AND m.doc_status NOT IN ('eliminado', 'rechazado')
        AND CASE
          WHEN dv.doc_type = 'factura' THEN m.doc_type = 'albaran'
          WHEN dv.doc_type = 'albaran' THEN m.doc_type = 'factura'
          ELSE false
        END
        AND m.doc_date BETWEEN dv.doc_date - 7 AND dv.doc_date + 7
    ) AS has_matching,
    -- Get the matching doc id
    (
      SELECT m.id FROM document_vault m
      WHERE m.hotel_id = p_hotel_id
        AND m.supplier_id = dv.supplier_id
        AND m.supplier_id IS NOT NULL
        AND m.id <> dv.id
        AND m.doc_status NOT IN ('eliminado', 'rechazado')
        AND CASE
          WHEN dv.doc_type = 'factura' THEN m.doc_type = 'albaran'
          WHEN dv.doc_type = 'albaran' THEN m.doc_type = 'factura'
          ELSE false
        END
        AND m.doc_date BETWEEN dv.doc_date - 7 AND dv.doc_date + 7
      ORDER BY ABS(m.doc_date - dv.doc_date)
      LIMIT 1
    ) AS matching_doc_id
  FROM document_vault dv
  WHERE dv.hotel_id = p_hotel_id
    AND dv.doc_type IN ('factura', 'albaran')
    AND dv.doc_status NOT IN ('eliminado', 'rechazado')
    AND dv.doc_date BETWEEN p_from_date AND p_to_date
  ORDER BY dv.doc_date DESC;
END;
$$;

COMMENT ON FUNCTION get_missing_documents_report IS
  'Cross-reference report: invoices without delivery notes and vice versa (±7 days, same supplier)';

-- ─── RETENTION COMPLIANCE ───────────────────────────────────────────────────
-- Documents approaching retention deadline.

CREATE OR REPLACE FUNCTION get_retention_compliance(
  p_hotel_id     UUID,
  p_days_warning INTEGER DEFAULT 90
)
RETURNS TABLE (
  document_id     UUID,
  doc_type        TEXT,
  doc_number      TEXT,
  doc_date        DATE,
  retention_until DATE,
  days_remaining  INTEGER,
  status          TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    dv.id,
    dv.doc_type,
    dv.doc_number,
    dv.doc_date,
    dv.retention_until,
    (dv.retention_until - CURRENT_DATE)::INTEGER AS days_remaining,
    CASE
      WHEN dv.retention_until < CURRENT_DATE THEN 'expired'
      WHEN dv.retention_until < CURRENT_DATE + p_days_warning THEN 'warning'
      ELSE 'compliant'
    END AS status
  FROM document_vault dv
  WHERE dv.hotel_id = p_hotel_id
    AND dv.retention_until IS NOT NULL
    AND dv.doc_status NOT IN ('eliminado')
  ORDER BY dv.retention_until ASC;
END;
$$;

COMMENT ON FUNCTION get_retention_compliance IS
  'Returns retention compliance status for all documents with calculated deadlines';

-- ─── CROSS-REFERENCE DOCUMENTS ──────────────────────────────────────────────
-- Links a factura to an albaran (or vice versa) by updating linked_entity fields.

CREATE OR REPLACE FUNCTION cross_reference_documents(
  p_document_id    UUID,
  p_linked_type    TEXT,
  p_linked_id      UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hotel_id UUID;
BEGIN
  SELECT hotel_id INTO v_hotel_id
    FROM document_vault WHERE id = p_document_id;

  IF NOT has_hotel_access(v_hotel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE document_vault
    SET linked_entity_type = p_linked_type,
        linked_entity_id = p_linked_id
    WHERE id = p_document_id;

  INSERT INTO document_custody_log (document_id, action, actor_id, details)
  VALUES (
    p_document_id,
    'verified',
    auth.uid(),
    jsonb_build_object(
      'cross_reference', true,
      'linked_type', p_linked_type,
      'linked_id', p_linked_id
    )
  );
END;
$$;

-- ─── VAULT STATS ────────────────────────────────────────────────────────────
-- Summary stats for the vault dashboard.

CREATE OR REPLACE FUNCTION get_vault_stats(p_hotel_id UUID)
RETURNS TABLE (
  total_documents     BIGINT,
  total_digitalizando BIGINT,
  total_digitalizado  BIGINT,
  total_revision      BIGINT,
  total_rechazado     BIGINT,
  total_eliminado     BIGINT,
  integrity_passed    BIGINT,
  integrity_failed    BIGINT,
  docs_without_backup BIGINT,
  retention_warnings  BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)                                                    AS total_documents,
    COUNT(*) FILTER (WHERE dv.doc_status = 'digitalizando')    AS total_digitalizando,
    COUNT(*) FILTER (WHERE dv.doc_status = 'digitalizado')     AS total_digitalizado,
    COUNT(*) FILTER (WHERE dv.doc_status = 'necesita_revision') AS total_revision,
    COUNT(*) FILTER (WHERE dv.doc_status = 'rechazado')        AS total_rechazado,
    COUNT(*) FILTER (WHERE dv.doc_status = 'eliminado')        AS total_eliminado,
    (SELECT COUNT(*) FROM document_integrity_checks dic
      JOIN document_vault d ON d.id = dic.document_id
      WHERE d.hotel_id = p_hotel_id AND dic.status = 'passed') AS integrity_passed,
    (SELECT COUNT(*) FROM document_integrity_checks dic
      JOIN document_vault d ON d.id = dic.document_id
      WHERE d.hotel_id = p_hotel_id AND dic.status = 'failed') AS integrity_failed,
    COUNT(*) FILTER (WHERE dv.storage_path_backup IS NULL
      AND dv.doc_status NOT IN ('eliminado', 'rechazado'))     AS docs_without_backup,
    COUNT(*) FILTER (WHERE dv.retention_until IS NOT NULL
      AND dv.retention_until < CURRENT_DATE + 90)              AS retention_warnings
  FROM document_vault dv
  WHERE dv.hotel_id = p_hotel_id;
END;
$$;

COMMENT ON FUNCTION get_vault_stats IS
  'Dashboard stats for document vault: counts by status, integrity, backup, retention';
