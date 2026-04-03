-- =============================================================================
-- Migration 37: Security — RBAC overbreadth
-- Fixes: RO-APPSEC-211, RO-APPSEC-212, RO-APPSEC-213
-- =============================================================================

-- ─── RO-APPSEC-211: Procurement/catalog RLS ───────────────────────────────────
-- suppliers, purchase_orders and related tables were readable/writable by any
-- active hotel member (cook, room, reception). Now requires procurement role.

-- SUPPLIERS
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;

CREATE POLICY "suppliers_select" ON suppliers FOR SELECT
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement','head_chef']));

CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT
  WITH CHECK (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']));

CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE
  USING  (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']))
  WITH CHECK (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']));

-- PURCHASE_ORDERS
DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update" ON purchase_orders;

CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement','head_chef']));

CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT
  WITH CHECK (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']));

CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE
  USING  (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']))
  WITH CHECK (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']));

-- PURCHASE_REQUESTS (same treatment)
DROP POLICY IF EXISTS "purchase_requests_select" ON purchase_requests;
DROP POLICY IF EXISTS "purchase_requests_insert" ON purchase_requests;
DROP POLICY IF EXISTS "purchase_requests_update" ON purchase_requests;

CREATE POLICY "purchase_requests_select" ON purchase_requests FOR SELECT
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement','head_chef']));

CREATE POLICY "purchase_requests_insert" ON purchase_requests FOR INSERT
  WITH CHECK (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement','head_chef']));

CREATE POLICY "purchase_requests_update" ON purchase_requests FOR UPDATE
  USING  (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction','procurement']));

-- ─── RO-APPSEC-212: audit_logs and domain_events ─────────────────────────────
-- Both tables were readable by any hotel member. They contain PII (emails in
-- audit payloads, supplier tax_id dumps) and operational intelligence.
-- Now restricted to admin/direction roles.

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction']));

DROP POLICY IF EXISTS "domain_events_select" ON domain_events;
CREATE POLICY "domain_events_select"
  ON domain_events FOR SELECT
  USING (has_hotel_role(hotel_id, ARRAY['superadmin','admin','direction']));

-- ─── RO-APPSEC-213: Multi-local RPCs and direction dashboard RPCs ─────────────
-- get_tenant_overview() and get_price_comparisons() only required any tenant
-- membership — a cook or receptionist could see stock, costs and APPCC for all
-- hotels in the group. Dashboard RPCs (generate_daily_snapshot, get_dashboard_data,
-- check_alert_thresholds, dismiss_alert) also only required any hotel membership.

-- get_tenant_overview: restrict to admin/direction/superadmin within tenant
CREATE OR REPLACE FUNCTION get_tenant_overview(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  -- RO-APPSEC-213: require management role, not just tenant membership
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND tenant_id = p_tenant_id
      AND is_active = true AND role IN ('superadmin','admin','direction')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  SELECT coalesce(jsonb_agg(hotel_data ORDER BY hotel_data->>'name'), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'hotel_id', h.id,
      'name', h.name,
      'slug', h.slug,
      'products_count',     (SELECT count(*) FROM products WHERE hotel_id = h.id AND is_active = true),
      'recipes_count',      (SELECT count(*) FROM recipes WHERE hotel_id = h.id),
      'recipes_approved',   (SELECT count(*) FROM recipes WHERE hotel_id = h.id AND status = 'approved'),
      'suppliers_count',    (SELECT count(*) FROM suppliers WHERE hotel_id = h.id AND is_active = true),
      'stock_value',        (SELECT coalesce(sum(current_quantity * unit_cost), 0) FROM stock_lots WHERE hotel_id = h.id AND current_quantity > 0),
      'stock_lots_count',   (SELECT count(*) FROM stock_lots WHERE hotel_id = h.id AND current_quantity > 0),
      'stock_expiring_3d',  (SELECT count(*) FROM stock_lots WHERE hotel_id = h.id AND current_quantity > 0 AND expiry_date IS NOT NULL AND expiry_date <= current_date + 3),
      'waste_30d_cost',     (SELECT coalesce(sum(abs(sm.quantity) * sm.unit_cost), 0) FROM stock_movements sm WHERE sm.hotel_id = h.id AND sm.movement_type = 'waste' AND sm.created_at >= current_date - 30),
      'po_pending',         (SELECT count(*) FROM purchase_orders WHERE hotel_id = h.id AND status IN ('draft', 'sent')),
      'appcc_today_pct',    (SELECT coalesce(dc.completion_pct, 0) FROM appcc_daily_closures dc WHERE dc.hotel_id = h.id AND dc.closure_date = current_date),
      'appcc_today_status', (SELECT coalesce(dc.status, 'open') FROM appcc_daily_closures dc WHERE dc.hotel_id = h.id AND dc.closure_date = current_date),
      'appcc_incidents_open', (SELECT count(*) FROM appcc_incidents WHERE hotel_id = h.id AND status IN ('open', 'in_progress')),
      'alerts_active',      (SELECT count(*) FROM alerts WHERE hotel_id = h.id AND is_dismissed = false)
    ) AS hotel_data
    FROM hotels h
    WHERE h.tenant_id = p_tenant_id AND h.is_active = true
  ) sub;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_tenant_overview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_tenant_overview(uuid) TO authenticated;

-- get_price_comparisons: restrict to admin/direction/superadmin within tenant
CREATE OR REPLACE FUNCTION get_price_comparisons(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  -- RO-APPSEC-213: require management role
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND tenant_id = p_tenant_id
      AND is_active = true AND role IN ('superadmin','admin','direction')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  SELECT coalesce(jsonb_agg(comparison ORDER BY comparison->>'product_name'), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'product_name', p.name,
      'hotel_id', h.id,
      'hotel_name', h.name,
      'price', so.price,
      'unit', u.abbreviation,
      'supplier_name', s.name
    ) AS comparison
    FROM supplier_offers so
    JOIN products p ON p.id = so.product_id
    JOIN hotels h ON h.id = so.hotel_id
    JOIN suppliers s ON s.id = so.supplier_id
    JOIN units_of_measure u ON u.id = so.unit_id
    WHERE h.tenant_id = p_tenant_id
      AND so.is_preferred = true
    ORDER BY p.name, so.price
  ) sub;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION get_price_comparisons(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_price_comparisons(uuid) TO authenticated;

-- generate_daily_snapshot: restrict to admin/direction
CREATE OR REPLACE FUNCTION generate_daily_snapshot(
  p_hotel_id uuid,
  p_date date DEFAULT current_date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_data      jsonb;
  v_snapshot_id uuid;
BEGIN
  -- RO-APPSEC-213: require management role
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND hotel_id = p_hotel_id
      AND is_active = true AND role IN ('superadmin','admin','direction')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  v_data := jsonb_build_object(
    'reservations_total',    (SELECT count(*) FROM reservations WHERE hotel_id = p_hotel_id),
    'reservations_confirmed',(SELECT count(*) FROM reservations WHERE hotel_id = p_hotel_id AND status = 'confirmed'),
    'reservations_today',    (SELECT count(*) FROM reservations WHERE hotel_id = p_hotel_id AND "date" = p_date),
    'recipes_total',         (SELECT count(*) FROM recipes WHERE hotel_id = p_hotel_id),
    'recipes_approved',      (SELECT count(*) FROM recipes WHERE hotel_id = p_hotel_id AND status = 'approved'),
    'recipes_pending_review',(SELECT count(*) FROM recipes WHERE hotel_id = p_hotel_id AND status = 'review_pending'),
    'po_pending',            (SELECT count(*) FROM purchase_orders WHERE hotel_id = p_hotel_id AND status IN ('draft', 'sent')),
    'po_total_amount',       (SELECT coalesce(sum(total_amount), 0) FROM purchase_orders WHERE hotel_id = p_hotel_id AND status NOT IN ('cancelled')),
    'stock_products_count',  (SELECT count(DISTINCT product_id) FROM stock_lots WHERE hotel_id = p_hotel_id AND current_quantity > 0),
    'stock_expiring_3d',     (SELECT count(*) FROM stock_lots WHERE hotel_id = p_hotel_id AND current_quantity > 0 AND expiry_date IS NOT NULL AND expiry_date <= p_date + 3),
    'alerts_active',         (SELECT count(*) FROM alerts WHERE hotel_id = p_hotel_id AND is_dismissed = false)
  );

  INSERT INTO kpi_snapshots (hotel_id, period_type, period_date, data)
  VALUES (p_hotel_id, 'daily', p_date, v_data)
  ON CONFLICT (hotel_id, period_date, period_type)
  DO UPDATE SET data = v_data
  RETURNING id INTO v_snapshot_id;

  RETURN jsonb_build_object('snapshot_id', v_snapshot_id, 'date', p_date, 'data', v_data);
END;
$$;

-- get_dashboard_data: restrict to admin/direction
CREATE OR REPLACE FUNCTION get_dashboard_data(p_hotel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id             uuid := auth.uid();
  v_today               date := current_date;
  v_current             jsonb;
  v_trend_7d            jsonb;
  v_upcoming_reservations jsonb;
  v_active_alerts       jsonb;
BEGIN
  -- RO-APPSEC-213: require management role
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND hotel_id = p_hotel_id
      AND is_active = true AND role IN ('superadmin','admin','direction')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  v_current := jsonb_build_object(
    'reservations_confirmed',    (SELECT count(*) FROM reservations WHERE hotel_id = p_hotel_id AND status = 'confirmed'),
    'reservations_today',        (SELECT count(*) FROM reservations WHERE hotel_id = p_hotel_id AND "date" = v_today),
    'reservations_upcoming_7d',  (SELECT count(*) FROM reservations WHERE hotel_id = p_hotel_id AND "date" BETWEEN v_today AND v_today + 7 AND status IN ('confirmed', 'seated')),
    'recipes_pending_review',    (SELECT count(*) FROM recipes WHERE hotel_id = p_hotel_id AND status = 'review_pending'),
    'po_pending',                (SELECT count(*) FROM purchase_orders WHERE hotel_id = p_hotel_id AND status IN ('draft', 'sent')),
    'stock_expiring_3d',         (SELECT count(*) FROM stock_lots WHERE hotel_id = p_hotel_id AND current_quantity > 0 AND expiry_date IS NOT NULL AND expiry_date <= v_today + 3),
    'alerts_active',             (SELECT count(*) FROM alerts WHERE hotel_id = p_hotel_id AND is_dismissed = false)
  );

  SELECT coalesce(jsonb_agg(
    jsonb_build_object('date', ks.period_date, 'data', ks.data)
    ORDER BY ks.period_date
  ), '[]'::jsonb)
  INTO v_trend_7d
  FROM kpi_snapshots ks
  WHERE ks.hotel_id = p_hotel_id AND ks.period_type = 'daily'
    AND ks.period_date >= v_today - 7;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object('id', r.id, 'date', r."date", 'pax', r.pax, 'status', r.status)
    ORDER BY r."date"
  ), '[]'::jsonb)
  INTO v_upcoming_reservations
  FROM (
    SELECT id, "date", pax, status FROM reservations
    WHERE hotel_id = p_hotel_id AND "date" >= v_today
      AND status IN ('confirmed', 'seated', 'pending')
    ORDER BY "date"
    LIMIT 10
  ) r;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object('id', a.id, 'title', a.title, 'severity', a.severity, 'alert_type', a.alert_type, 'created_at', a.created_at)
    ORDER BY a.created_at DESC
  ), '[]'::jsonb)
  INTO v_active_alerts
  FROM (
    SELECT id, title, severity, alert_type, created_at FROM alerts
    WHERE hotel_id = p_hotel_id AND is_dismissed = false
    ORDER BY created_at DESC
    LIMIT 20
  ) a;

  RETURN jsonb_build_object(
    'current', v_current,
    'trend_7d', v_trend_7d,
    'upcoming_reservations', v_upcoming_reservations,
    'active_alerts', v_active_alerts
  );
END;
$$;

-- check_alert_thresholds: restrict to admin/direction
CREATE OR REPLACE FUNCTION check_alert_thresholds(p_hotel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid := auth.uid();
  v_alerts_created integer := 0;
  v_today          date := current_date;
BEGIN
  -- RO-APPSEC-213: require management role
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND hotel_id = p_hotel_id
      AND is_active = true AND role IN ('superadmin','admin','direction')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM stock_lots
    WHERE hotel_id = p_hotel_id AND current_quantity > 0
      AND expiry_date IS NOT NULL AND expiry_date <= v_today + 3
  ) AND NOT EXISTS (
    SELECT 1 FROM alerts WHERE hotel_id = p_hotel_id AND alert_type = 'stock_expiring'
      AND is_dismissed = false AND created_at > now() - INTERVAL '1 day'
  ) THEN
    INSERT INTO alerts (hotel_id, alert_type, severity, title, message)
    VALUES (p_hotel_id, 'stock_expiring', 'warning', 'Stock próximo a caducar',
      'Hay productos en stock que caducan en los próximos 3 días');
    v_alerts_created := v_alerts_created + 1;
  END IF;

  IF EXISTS (
    SELECT 1 FROM appcc_daily_closures
    WHERE hotel_id = p_hotel_id AND closure_date = v_today
      AND status = 'open' AND completion_pct < 100
  ) AND NOT EXISTS (
    SELECT 1 FROM alerts WHERE hotel_id = p_hotel_id AND alert_type = 'appcc_incomplete'
      AND is_dismissed = false AND created_at > now() - INTERVAL '1 day'
  ) THEN
    INSERT INTO alerts (hotel_id, alert_type, severity, title, message)
    VALUES (p_hotel_id, 'appcc_incomplete', 'warning', 'APPCC incompleto',
      'El registro APPCC de hoy no está completado');
    v_alerts_created := v_alerts_created + 1;
  END IF;

  IF (SELECT count(*) FROM appcc_incidents WHERE hotel_id = p_hotel_id AND status = 'open' AND severity = 'critical') > 0
  AND NOT EXISTS (
    SELECT 1 FROM alerts WHERE hotel_id = p_hotel_id AND alert_type = 'appcc_critical'
      AND is_dismissed = false AND created_at > now() - INTERVAL '1 day'
  ) THEN
    INSERT INTO alerts (hotel_id, alert_type, severity, title, message)
    VALUES (p_hotel_id, 'appcc_critical', 'critical', 'Incidencia APPCC crítica',
      'Hay incidencias APPCC críticas abiertas que requieren acción inmediata');
    v_alerts_created := v_alerts_created + 1;
  END IF;

  RETURN jsonb_build_object('alerts_created', v_alerts_created);
END;
$$;

-- dismiss_alert: restrict to admin/direction
CREATE OR REPLACE FUNCTION dismiss_alert(p_hotel_id uuid, p_alert_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- RO-APPSEC-213: require management role
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND hotel_id = p_hotel_id
      AND is_active = true AND role IN ('superadmin','admin','direction')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  UPDATE alerts SET
    is_dismissed = true,
    dismissed_by = v_user_id,
    dismissed_at = now()
  WHERE id = p_alert_id AND hotel_id = p_hotel_id AND is_dismissed = false;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  RETURN jsonb_build_object('alert_id', p_alert_id, 'dismissed', true);
END;
$$;
