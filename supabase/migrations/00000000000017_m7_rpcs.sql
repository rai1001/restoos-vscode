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

  -- Aggregate KPIs
  v_data := jsonb_build_object(
    -- Events
    'events_total', (select count(*) from events where hotel_id = p_hotel_id),
    'events_confirmed', (select count(*) from events where hotel_id = p_hotel_id and status = 'confirmed'),
    'events_today', (select count(*) from events where hotel_id = p_hotel_id and event_date = p_date),
    'events_upcoming_7d', (select count(*) from events where hotel_id = p_hotel_id and event_date between p_date and p_date + 7 and status in ('confirmed', 'in_operation')),
    -- Recipes
    'recipes_total', (select count(*) from recipes where hotel_id = p_hotel_id),
    'recipes_approved', (select count(*) from recipes where hotel_id = p_hotel_id and status = 'approved'),
    'recipes_pending_review', (select count(*) from recipes where hotel_id = p_hotel_id and status = 'review_pending'),
    -- Tasks
    'tasks_total', (select count(*) from tasks where hotel_id = p_hotel_id and status != 'cancelled'),
    'tasks_pending', (select count(*) from tasks where hotel_id = p_hotel_id and status = 'todo'),
    'tasks_in_progress', (select count(*) from tasks where hotel_id = p_hotel_id and status = 'in_progress'),
    'tasks_blocked', (select count(*) from tasks where hotel_id = p_hotel_id and status = 'blocked'),
    'tasks_done', (select count(*) from tasks where hotel_id = p_hotel_id and status = 'done'),
    -- Procurement
    'po_pending', (select count(*) from purchase_orders where hotel_id = p_hotel_id and status in ('draft', 'sent')),
    'po_total_amount', (select coalesce(sum(total_amount), 0) from purchase_orders where hotel_id = p_hotel_id and status not in ('cancelled')),
    -- Inventory
    'stock_products_count', (select count(distinct product_id) from stock_lots where hotel_id = p_hotel_id and current_quantity > 0),
    'stock_expiring_3d', (select count(*) from stock_lots where hotel_id = p_hotel_id and current_quantity > 0 and expiry_date is not null and expiry_date <= p_date + 3),
    -- Jobs
    'jobs_pending', (select count(*) from automation_jobs where hotel_id = p_hotel_id and status = 'pending'),
    'jobs_failed', (select count(*) from automation_jobs where hotel_id = p_hotel_id and status in ('failed', 'dead_letter')),
    -- Alerts
    'alerts_active', (select count(*) from alerts where hotel_id = p_hotel_id and is_dismissed = false)
  );

  -- Upsert snapshot
  insert into kpi_snapshots (hotel_id, period_type, period_date, data)
  values (p_hotel_id, 'daily', p_date, v_data)
  on conflict (hotel_id, period_type, period_date)
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
  v_upcoming_events jsonb;
  v_active_alerts jsonb;
  v_blocked_tasks jsonb;
begin
  if not exists (
    select 1 from memberships where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  -- Current KPIs (live, not from snapshot)
  v_current := jsonb_build_object(
    'events_confirmed', (select count(*) from events where hotel_id = p_hotel_id and status = 'confirmed'),
    'events_today', (select count(*) from events where hotel_id = p_hotel_id and event_date = v_today),
    'events_upcoming_7d', (select count(*) from events where hotel_id = p_hotel_id and event_date between v_today and v_today + 7 and status in ('confirmed', 'in_operation')),
    'tasks_pending', (select count(*) from tasks where hotel_id = p_hotel_id and status = 'todo'),
    'tasks_blocked', (select count(*) from tasks where hotel_id = p_hotel_id and status = 'blocked'),
    'recipes_pending_review', (select count(*) from recipes where hotel_id = p_hotel_id and status = 'review_pending'),
    'po_pending', (select count(*) from purchase_orders where hotel_id = p_hotel_id and status in ('draft', 'sent')),
    'stock_expiring_3d', (select count(*) from stock_lots where hotel_id = p_hotel_id and current_quantity > 0 and expiry_date is not null and expiry_date <= v_today + 3),
    'alerts_active', (select count(*) from alerts where hotel_id = p_hotel_id and is_dismissed = false),
    'jobs_failed', (select count(*) from automation_jobs where hotel_id = p_hotel_id and status in ('failed', 'dead_letter'))
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

  -- Upcoming events
  select coalesce(jsonb_agg(
    jsonb_build_object('id', e.id, 'name', e.name, 'event_date', e.event_date, 'guest_count', e.guest_count, 'status', e.status)
    order by e.event_date
  ), '[]'::jsonb)
  into v_upcoming_events
  from events e
  where e.hotel_id = p_hotel_id and e.event_date >= v_today
    and e.status in ('confirmed', 'in_operation', 'pending_confirmation')
  limit 10;

  -- Active alerts
  select coalesce(jsonb_agg(
    jsonb_build_object('id', a.id, 'title', a.title, 'severity', a.severity, 'alert_type', a.alert_type, 'created_at', a.created_at)
    order by a.created_at desc
  ), '[]'::jsonb)
  into v_active_alerts
  from alerts a
  where a.hotel_id = p_hotel_id and a.is_dismissed = false
  limit 20;

  -- Blocked tasks
  select coalesce(jsonb_agg(
    jsonb_build_object('id', t.id, 'title', t.title, 'department', t.department, 'blocked_reason', t.blocked_reason)
  ), '[]'::jsonb)
  into v_blocked_tasks
  from tasks t
  where t.hotel_id = p_hotel_id and t.status = 'blocked'
  limit 10;

  return jsonb_build_object(
    'current', v_current,
    'trend_7d', v_trend_7d,
    'upcoming_events', v_upcoming_events,
    'active_alerts', v_active_alerts,
    'blocked_tasks', v_blocked_tasks
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

  -- Alert: blocked tasks
  if (select count(*) from tasks where hotel_id = p_hotel_id and status = 'blocked') > 0
  and not exists (
    select 1 from alerts where hotel_id = p_hotel_id and alert_type = 'tasks_blocked'
      and is_dismissed = false and created_at > now() - interval '1 day'
  ) then
    insert into alerts (hotel_id, alert_type, severity, title, message)
    values (p_hotel_id, 'tasks_blocked', 'critical', 'Tareas bloqueadas',
      'Hay tareas operativas bloqueadas que requieren atención');
    v_alerts_created := v_alerts_created + 1;
  end if;

  -- Alert: failed automation jobs
  if (select count(*) from automation_jobs where hotel_id = p_hotel_id and status in ('failed', 'dead_letter')) > 0
  and not exists (
    select 1 from alerts where hotel_id = p_hotel_id and alert_type = 'jobs_failed'
      and is_dismissed = false and created_at > now() - interval '1 day'
  ) then
    insert into alerts (hotel_id, alert_type, severity, title, message)
    values (p_hotel_id, 'jobs_failed', 'warning', 'Jobs de automatización fallidos',
      'Hay jobs de automatización que han fallado y necesitan revisión');
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
