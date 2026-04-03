-- ============================================================
-- M8: APPCC — RPCs
-- ============================================================

-- ─── CREATE CHECK RECORD ─────────────────────────────────────
-- Registra un control APPCC y auto-calcula status según límites de plantilla
CREATE OR REPLACE FUNCTION create_check_record(
  p_hotel_id       UUID,
  p_template_id    UUID,
  p_check_date     DATE,
  p_value          NUMERIC DEFAULT NULL,
  p_notes          TEXT DEFAULT NULL,
  p_corrective_action TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template    check_templates%ROWTYPE;
  v_status      TEXT := 'ok';
  v_record_id   UUID;
  v_user_id     UUID := auth.uid();
  v_user_name   TEXT;
BEGIN
  IF NOT has_hotel_role(p_hotel_id, ARRAY['superadmin','admin','direction','head_chef','cook']) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  -- Fetch template
  SELECT * INTO v_template
  FROM check_templates
  WHERE id = p_template_id AND hotel_id = p_hotel_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  -- Get user name
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = v_user_id;

  -- Auto-calculate status from limits
  IF p_value IS NOT NULL THEN
    IF v_template.min_value IS NOT NULL AND p_value < v_template.min_value THEN
      v_status := 'critico';
    ELSIF v_template.max_value IS NOT NULL AND p_value > v_template.max_value THEN
      v_status := 'alerta';
    END IF;
  END IF;

  -- Require corrective action for non-ok
  IF v_status != 'ok' AND (p_corrective_action IS NULL OR p_corrective_action = '') THEN
    RAISE EXCEPTION 'Corrective action required when value is out of range';
  END IF;

  -- Insert record
  INSERT INTO check_records (
    hotel_id, template_id, check_date, value, status,
    notes, corrective_action, checked_by, checked_by_name
  ) VALUES (
    p_hotel_id, p_template_id, p_check_date, p_value, v_status,
    p_notes, p_corrective_action, v_user_id, COALESCE(v_user_name, 'Unknown')
  )
  RETURNING id INTO v_record_id;

  -- Auto-create incident for critical records
  IF v_status = 'critico' THEN
    INSERT INTO appcc_incidents (
      hotel_id, record_id, incident_date, title, description,
      severity, corrective_action, reported_by, reported_by_name
    ) VALUES (
      p_hotel_id, v_record_id, p_check_date,
      'Valor crítico: ' || v_template.name,
      'Valor registrado: ' || COALESCE(p_value::TEXT, 'N/A') || ' ' || COALESCE(v_template.unit, '') ||
      '. Rango permitido: ' ||
      COALESCE(v_template.min_value::TEXT, '—') || ' a ' || COALESCE(v_template.max_value::TEXT, '—') || ' ' || COALESCE(v_template.unit, ''),
      'critical', p_corrective_action, v_user_id, COALESCE(v_user_name, 'Unknown')
    );
  END IF;

  -- Upsert daily closure stats
  PERFORM refresh_daily_closure(p_hotel_id, p_check_date);

  RETURN jsonb_build_object(
    'record_id', v_record_id,
    'status', v_status,
    'template_name', v_template.name
  );
END;
$$;

REVOKE ALL ON FUNCTION create_check_record(UUID, UUID, DATE, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_check_record(UUID, UUID, DATE, NUMERIC, TEXT, TEXT) TO authenticated;

-- ─── REFRESH DAILY CLOSURE ───────────────────────────────────
-- Recalcula el cierre diario a partir de los registros del día
CREATE OR REPLACE FUNCTION refresh_daily_closure(
  p_hotel_id   UUID,
  p_date       DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total       INTEGER;
  v_ok          INTEGER;
  v_alerts      INTEGER;
  v_critical    INTEGER;
  v_expected    INTEGER;
  v_incidents   INTEGER;
  v_completion  NUMERIC(5,2);
  v_day_of_week INTEGER;
  v_day_of_month INTEGER;
BEGIN
  IF NOT has_hotel_role(p_hotel_id, ARRAY['superadmin','admin','direction','head_chef','cook']) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER;  -- 1=Mon, 7=Sun
  v_day_of_month := EXTRACT(DAY FROM p_date)::INTEGER;

  -- Count expected templates for this date
  SELECT COUNT(*) INTO v_expected
  FROM check_templates
  WHERE hotel_id = p_hotel_id AND is_active = true
    AND (
      frequency = 'diario'
      OR (frequency = 'semanal' AND v_day_of_week = 1)
      OR (frequency = 'mensual' AND v_day_of_month = 1)
    );

  -- Count actual records
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'ok'),
    COUNT(*) FILTER (WHERE status = 'alerta'),
    COUNT(*) FILTER (WHERE status = 'critico')
  INTO v_total, v_ok, v_alerts, v_critical
  FROM check_records
  WHERE hotel_id = p_hotel_id AND check_date = p_date;

  -- Count open incidents for this date
  SELECT COUNT(*) INTO v_incidents
  FROM appcc_incidents
  WHERE hotel_id = p_hotel_id AND incident_date = p_date
    AND status IN ('open', 'in_progress');

  -- Calculate completion
  v_completion := CASE WHEN v_expected > 0
    THEN LEAST((v_total::NUMERIC / v_expected) * 100, 100)
    ELSE 100
  END;

  -- Upsert closure
  INSERT INTO appcc_daily_closures (
    hotel_id, closure_date, total_checks, ok_count, alert_count,
    critical_count, completion_pct, incidents_open,
    status
  ) VALUES (
    p_hotel_id, p_date, v_total, v_ok, v_alerts,
    v_critical, v_completion, v_incidents,
    CASE
      WHEN v_completion >= 100 AND v_incidents = 0 THEN 'completed'
      ELSE 'open'
    END
  )
  ON CONFLICT (hotel_id, closure_date)
  DO UPDATE SET
    total_checks = EXCLUDED.total_checks,
    ok_count = EXCLUDED.ok_count,
    alert_count = EXCLUDED.alert_count,
    critical_count = EXCLUDED.critical_count,
    completion_pct = EXCLUDED.completion_pct,
    incidents_open = EXCLUDED.incidents_open,
    status = CASE
      WHEN appcc_daily_closures.status = 'validated' THEN 'validated'
      WHEN EXCLUDED.completion_pct >= 100 AND EXCLUDED.incidents_open = 0 THEN 'completed'
      ELSE 'open'
    END,
    updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION refresh_daily_closure(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_daily_closure(UUID, DATE) TO authenticated;

-- ─── VALIDATE DAILY CLOSURE ──────────────────────────────────
-- Firma/validación del responsable sobre el cierre del día
CREATE OR REPLACE FUNCTION validate_daily_closure(
  p_hotel_id  UUID,
  p_date      DATE,
  p_notes     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_closure   appcc_daily_closures%ROWTYPE;
  v_user_id   UUID := auth.uid();
  v_user_name TEXT;
  v_role      TEXT;
BEGIN
  -- Check role
  SELECT m.role INTO v_role
  FROM memberships m
  WHERE m.user_id = v_user_id AND m.hotel_id = p_hotel_id AND m.is_active = true;

  IF v_role NOT IN ('superadmin', 'admin', 'direction', 'head_chef') THEN
    RAISE EXCEPTION 'Only head_chef or above can validate daily closures';
  END IF;

  -- Get user name
  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = v_user_id;

  -- Refresh stats first
  PERFORM refresh_daily_closure(p_hotel_id, p_date);

  -- Get closure
  SELECT * INTO v_closure
  FROM appcc_daily_closures
  WHERE hotel_id = p_hotel_id AND closure_date = p_date;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No closure found for this date';
  END IF;

  -- Update to validated
  UPDATE appcc_daily_closures
  SET status = 'validated',
      validated_by = v_user_id,
      validated_by_name = COALESCE(v_user_name, 'Unknown'),
      validated_at = NOW(),
      validation_notes = p_notes,
      updated_at = NOW()
  WHERE id = v_closure.id;

  RETURN jsonb_build_object(
    'closure_id', v_closure.id,
    'status', 'validated',
    'validated_by', COALESCE(v_user_name, 'Unknown'),
    'completion_pct', v_closure.completion_pct
  );
END;
$$;

-- ─── GET APPCC DAILY SUMMARY ─────────────────────────────────
-- Devuelve resúmenes de los últimos N días para el histórico
CREATE OR REPLACE FUNCTION get_appcc_daily_summaries(
  p_hotel_id   UUID,
  p_days_back  INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT has_hotel_access(p_hotel_id) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(s)::JSONB ORDER BY s.closure_date), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT
      closure_date,
      status,
      total_checks,
      ok_count,
      alert_count,
      critical_count,
      completion_pct,
      incidents_open,
      validated_by_name,
      validated_at
    FROM appcc_daily_closures
    WHERE hotel_id = p_hotel_id
      AND closure_date >= CURRENT_DATE - p_days_back
    ORDER BY closure_date ASC
  ) s;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_appcc_daily_summaries(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_appcc_daily_summaries(UUID, INTEGER) TO authenticated;

-- ─── RESOLVE INCIDENT ────────────────────────────────────────
CREATE OR REPLACE FUNCTION resolve_appcc_incident(
  p_hotel_id     UUID,
  p_incident_id  UUID,
  p_action       TEXT,
  p_status       TEXT DEFAULT 'resolved'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_user_name  TEXT;
  v_incident   appcc_incidents%ROWTYPE;
BEGIN
  IF NOT has_hotel_role(p_hotel_id, ARRAY['superadmin','admin','direction','head_chef']) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF p_status NOT IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'Status must be resolved or closed';
  END IF;

  SELECT full_name INTO v_user_name
  FROM profiles WHERE id = v_user_id;

  SELECT * INTO v_incident
  FROM appcc_incidents
  WHERE id = p_incident_id AND hotel_id = p_hotel_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  UPDATE appcc_incidents
  SET status = p_status,
      corrective_action = COALESCE(p_action, corrective_action),
      resolved_by = v_user_id,
      resolved_by_name = COALESCE(v_user_name, 'Unknown'),
      resolved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_incident_id;

  -- Refresh closure for that date
  PERFORM refresh_daily_closure(p_hotel_id, v_incident.incident_date);

  RETURN jsonb_build_object(
    'incident_id', p_incident_id,
    'status', p_status
  );
END;
$$;

REVOKE ALL ON FUNCTION resolve_appcc_incident(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_appcc_incident(UUID, UUID, TEXT, TEXT) TO authenticated;
