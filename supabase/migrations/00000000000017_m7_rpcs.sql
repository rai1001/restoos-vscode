-- =============================================================================
-- Migration: M7 RPCs — Direction / Reporting
-- =============================================================================

-- 1. GENERATE DAILY SNAPSHOT
create or replace function generate_daily_snapshot(
  p_hotel_id uuid,
  p_date date default current_date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_data jsonb;
  v_snapshot_id uuid;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  -- Aggregate KPIs from existing tables only
  v_data := jsonb_build_object(
    -- Reservations
    'reservations_total', (select count(*) from reservations where hotel_id = p_hotel_id),
    'reservations_confirmed', (select count(*) from reservations where hotel_id = p_hotel_id and status = 'confirmed'),
    'reservations_today', (select count(*) from reservations where hotel_id = p_hotel_id and "date" = p_date),
    -- Recipes
    'recipes_total', (select count(*) from recipes where hotel_id = p_hotel_id),
    'recipes_approved', (select count(*) from recipes where hotel_id = p_hotel_id and status = 'approved'),
    'recipes_pending_review', (select count(*) from recipes where hotel_id = p_hotel_id and status = 'review_pending'),
    -- Procurement
    'po_pending', (select count(*) from purchase_orders where hotel_id = p_hotel_id and status in ('draft', 'sent')),
    'po_total_amount', (select coalesce(sum(total_amount), 0) from purchase_orders where hotel_id = p_hotel_id and status not in ('cancelled')),
    -- Inventory
    'stock_products_count', (select count(distinct product_id) from stock_lots where hotel_id = p_hotel_id and current_quantity > 0),
    'stock_expiring_3d', (select count(*) from stock_lots where hotel_id = p_hotel_id and current_quantity > 0 and expiry_date is not null and expiry_date <= p_date + 3),
    -- Alerts
    'alerts_active', (select count(*) from alerts where hotel_id = p_hotel_id and is_dismissed = false)
  );

  -- Upsert snapshot
  insert into kpi_snapshots (hotel_id, period_type, period_date, data)
  values (p_hotel_id, 'daily', p_date, v_data)
  on conflict (hotel_id, period_date, period_type)
  do update set data = v_data
  returning id into v_snapshot_id;

  return jsonb_build_object('snapshot_id', v_snapshot_id, 'date', p_date, 'data', v_data);
end;
$$;

-- 2. GET DASHBOARD DATA
create or replace function get_dashboard_data(
  p_hotel_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_current jsonb;
  v_trend_7d jsonb;
  v_upcoming_reservations jsonb;
  v_active_alerts jsonb;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  -- Current KPIs (live)
  v_current := jsonb_build_object(
    'reservations_confirmed', (select count(*) from reservations where hotel_id = p_hotel_id and status = 'confirmed'),
    'reservations_today', (select count(*) from reservations where hotel_id = p_hotel_id and "date" = v_today),
    'reservations_upcoming_7d', (select count(*) from reservations where hotel_id = p_hotel_id and "date" between v_today and v_today + 7 and status in ('confirmed', 'seated')),
    'recipes_pending_review', (select count(*) from recipes where hotel_id = p_hotel_id and status = 'review_pending'),
    'po_pending', (select count(*) from purchase_orders where hotel_id = p_hotel_id and status in ('draft', 'sent')),
    'stock_expiring_3d', (select count(*) from stock_lots where hotel_id = p_hotel_id and current_quantity > 0 and expiry_date is not null and expiry_date <= v_today + 3),
    'alerts_active', (select count(*) from alerts where hotel_id = p_hotel_id and is_dismissed = false)
  );

  -- 7-day trend from snapshots
  select coalesce(jsonb_agg(
    jsonb_build_object('date', ks.period_date, 'data', ks.data)
    order by ks.period_date
  ), '[]'::jsonb)
  into v_trend_7d
  from kpi_snapshots ks
  where ks.hotel_id = p_hotel_id and ks.period_type = 'daily'
    and ks.period_date >= v_today - 7;

  -- Upcoming reservations
  select coalesce(jsonb_agg(
    jsonb_build_object('id', r.id, 'date', r."date", 'pax', r.pax, 'status', r.status)
    order by r."date"
  ), '[]'::jsonb)
  into v_upcoming_reservations
  from (
    select id, "date", pax, status
    from reservations
    where hotel_id = p_hotel_id and "date" >= v_today
      and status in ('confirmed', 'seated', 'pending')
    order by "date"
    limit 10
  ) r;

  -- Active alerts
  select coalesce(jsonb_agg(
    jsonb_build_object('id', a.id, 'title', a.title, 'severity', a.severity, 'alert_type', a.alert_type, 'created_at', a.created_at)
    order by a.created_at desc
  ), '[]'::jsonb)
  into v_active_alerts
  from (
    select id, title, severity, alert_type, created_at
    from alerts
    where hotel_id = p_hotel_id and is_dismissed = false
    order by created_at desc
    limit 20
  ) a;

  return jsonb_build_object(
    'current', v_current,
    'trend_7d', v_trend_7d,
    'upcoming_reservations', v_upcoming_reservations,
    'active_alerts', v_active_alerts
  );
end;
$$;

-- 3. CHECK ALERT THRESHOLDS
create or replace function check_alert_thresholds(
  p_hotel_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_alerts_created integer := 0;
  v_today date := current_date;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  -- Alert: stock expiring within 3 days
  if exists (
    select 1 from stock_lots
    where hotel_id = p_hotel_id and current_quantity > 0
      and expiry_date is not null and expiry_date <= v_today + 3
  ) and not exists (
    select 1 from alerts where hotel_id = p_hotel_id and alert_type = 'stock_expiring'
      and is_dismissed = false and created_at > now() - interval '1 day'
  ) then
    insert into alerts (hotel_id, alert_type, severity, title, message)
    values (p_hotel_id, 'stock_expiring', 'warning', 'Stock próximo a caducar',
      'Hay productos en stock que caducan en los próximos 3 días');
    v_alerts_created := v_alerts_created + 1;
  end if;

  -- Alert: APPCC incomplete
  if exists (
    select 1 from appcc_daily_closures
    where hotel_id = p_hotel_id and closure_date = v_today
      and status = 'open' and completion_pct < 100
  ) and not exists (
    select 1 from alerts where hotel_id = p_hotel_id and alert_type = 'appcc_incomplete'
      and is_dismissed = false and created_at > now() - interval '1 day'
  ) then
    insert into alerts (hotel_id, alert_type, severity, title, message)
    values (p_hotel_id, 'appcc_incomplete', 'warning', 'APPCC incompleto',
      'El registro APPCC de hoy no está completado');
    v_alerts_created := v_alerts_created + 1;
  end if;

  -- Alert: APPCC critical incidents
  if (select count(*) from appcc_incidents where hotel_id = p_hotel_id and status = 'open' and severity = 'critical') > 0
  and not exists (
    select 1 from alerts where hotel_id = p_hotel_id and alert_type = 'appcc_critical'
      and is_dismissed = false and created_at > now() - interval '1 day'
  ) then
    insert into alerts (hotel_id, alert_type, severity, title, message)
    values (p_hotel_id, 'appcc_critical', 'critical', 'Incidencia APPCC crítica',
      'Hay incidencias APPCC críticas abiertas que requieren acción inmediata');
    v_alerts_created := v_alerts_created + 1;
  end if;

  return jsonb_build_object('alerts_created', v_alerts_created);
end;
$$;

-- 4. DISMISS ALERT
create or replace function dismiss_alert(
  p_hotel_id uuid,
  p_alert_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  update alerts set
    is_dismissed = true,
    dismissed_by = v_user_id,
    dismissed_at = now()
  where id = p_alert_id and hotel_id = p_hotel_id and is_dismissed = false;

  if not found then raise exception 'NOT_FOUND'; end if;

  return jsonb_build_object('alert_id', p_alert_id, 'dismissed', true);
end;
$$;
