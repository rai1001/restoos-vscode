-- =============================================================================
-- Migration: M1 — Event RPCs
-- RPCs: create_event, update_event, confirm_event, cancel_event,
--        start_event_operation, complete_event, get_events_calendar
-- =============================================================================

-- =============================================================================
-- RPC: create_event
-- =============================================================================
create or replace function create_event(
  p_hotel_id uuid,
  p_client_id uuid default null,
  p_name text default null,
  p_event_type text default 'banquet',
  p_event_date date default null,
  p_start_time time default null,
  p_end_time time default null,
  p_guest_count integer default null,
  p_venue text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
      and role in ('admin', 'direction', 'commercial')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para crear eventos';
  end if;

  if p_name is null or p_event_date is null or p_guest_count is null then
    raise exception 'MISSING_REQUIRED_DATA: Nombre, fecha y número de invitados son obligatorios';
  end if;

  insert into events (hotel_id, client_id, name, event_type, event_date, start_time, end_time, guest_count, venue, notes, created_by)
  values (p_hotel_id, p_client_id, p_name, p_event_type, p_event_date, p_start_time, p_end_time, p_guest_count, p_venue, p_notes, v_user_id)
  returning id into v_event_id;

  -- Audit
  insert into audit_logs (hotel_id, entity_type, entity_id, action, after_json, performed_by)
  values (p_hotel_id, 'event', v_event_id, 'event.created',
    (select to_jsonb(e) from events e where e.id = v_event_id), v_user_id);

  return jsonb_build_object('success', true, 'event_id', v_event_id, 'status', 'draft');
end;
$$;

revoke all on function create_event from public;
grant execute on function create_event to authenticated;

-- =============================================================================
-- RPC: update_event
-- Updates event fields, bumps version, creates snapshot.
-- =============================================================================
create or replace function update_event(
  p_hotel_id uuid,
  p_event_id uuid,
  p_name text default null,
  p_event_type text default null,
  p_event_date date default null,
  p_start_time time default null,
  p_end_time time default null,
  p_guest_count integer default null,
  p_venue text default null,
  p_notes text default null,
  p_change_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event record;
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
      and role in ('admin', 'direction', 'commercial')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para editar eventos';
  end if;

  select * into v_event from events
  where id = p_event_id and hotel_id = p_hotel_id
  for update;

  if v_event is null then
    raise exception 'NOT_FOUND: Evento no encontrado';
  end if;

  if v_event.status in ('completed', 'cancelled', 'archived') then
    raise exception 'INVALID_STATE: No se puede editar un evento en estado %', v_event.status;
  end if;

  -- Create version snapshot BEFORE update
  insert into event_versions (event_id, hotel_id, version, snapshot_json, changed_by, change_reason)
  values (p_event_id, p_hotel_id, v_event.version, to_jsonb(v_event), v_user_id, p_change_reason);

  -- Update
  update events set
    name = coalesce(p_name, name),
    event_type = coalesce(p_event_type, event_type),
    event_date = coalesce(p_event_date, event_date),
    start_time = coalesce(p_start_time, start_time),
    end_time = coalesce(p_end_time, end_time),
    guest_count = coalesce(p_guest_count, guest_count),
    venue = coalesce(p_venue, venue),
    notes = coalesce(p_notes, notes),
    version = version + 1
  where id = p_event_id;

  -- Audit
  insert into audit_logs (hotel_id, entity_type, entity_id, action, before_json, after_json, performed_by)
  values (p_hotel_id, 'event', p_event_id, 'event.updated',
    to_jsonb(v_event),
    (select to_jsonb(e) from events e where e.id = p_event_id),
    v_user_id);

  -- Domain event if confirmed (triggers doc regeneration)
  if v_event.status = 'confirmed' then
    insert into domain_events (hotel_id, event_type, entity_type, entity_id, payload, occurred_at)
    values (p_hotel_id, 'event.updated', 'event', p_event_id,
      jsonb_build_object('new_version', v_event.version + 1, 'performed_by', v_user_id), now());
  end if;

  return jsonb_build_object('success', true, 'event_id', p_event_id, 'new_version', v_event.version + 1);
end;
$$;

revoke all on function update_event from public;
grant execute on function update_event to authenticated;

-- =============================================================================
-- RPC: confirm_event
-- draft/pending_confirmation → confirmed
-- Validates menus assigned. Emits event.confirmed.
-- =============================================================================
create or replace function confirm_event(p_hotel_id uuid, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event record;
  v_menu_count integer;
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
      and role in ('admin', 'direction', 'commercial')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para confirmar eventos';
  end if;

  select * into v_event from events
  where id = p_event_id and hotel_id = p_hotel_id
  for update;

  if v_event is null then
    raise exception 'NOT_FOUND: Evento no encontrado';
  end if;

  if v_event.status not in ('draft', 'pending_confirmation') then
    raise exception 'INVALID_STATE: No se puede confirmar un evento en estado %', v_event.status;
  end if;

  -- Validate menus assigned
  select count(*) into v_menu_count from event_menus where event_id = p_event_id;
  if v_menu_count = 0 then
    raise exception 'MISSING_REQUIRED_DATA: El evento debe tener al menos un menú asignado';
  end if;

  -- Transition
  update events set status = 'confirmed' where id = p_event_id;

  -- Audit
  insert into audit_logs (hotel_id, entity_type, entity_id, action, before_json, after_json, performed_by)
  values (p_hotel_id, 'event', p_event_id, 'event.confirmed',
    jsonb_build_object('status', v_event.status),
    jsonb_build_object('status', 'confirmed'),
    v_user_id);

  -- Domain event
  insert into domain_events (hotel_id, event_type, entity_type, entity_id, payload, occurred_at)
  values (p_hotel_id, 'event.confirmed', 'event', p_event_id,
    jsonb_build_object('event_name', v_event.name, 'event_date', v_event.event_date,
      'guest_count', v_event.guest_count, 'performed_by', v_user_id), now());

  return jsonb_build_object('success', true, 'event_id', p_event_id, 'new_status', 'confirmed');
end;
$$;

revoke all on function confirm_event from public;
grant execute on function confirm_event to authenticated;

-- =============================================================================
-- RPC: cancel_event
-- Any non-terminal → cancelled. Emits event.cancelled.
-- =============================================================================
create or replace function cancel_event(p_hotel_id uuid, p_event_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event record;
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
      and role in ('admin', 'direction')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para cancelar eventos';
  end if;

  select * into v_event from events
  where id = p_event_id and hotel_id = p_hotel_id
  for update;

  if v_event is null then
    raise exception 'NOT_FOUND: Evento no encontrado';
  end if;

  if v_event.status in ('completed', 'cancelled', 'archived') then
    raise exception 'INVALID_STATE: No se puede cancelar un evento en estado %', v_event.status;
  end if;

  update events set status = 'cancelled' where id = p_event_id;

  insert into audit_logs (hotel_id, entity_type, entity_id, action, before_json, after_json, performed_by)
  values (p_hotel_id, 'event', p_event_id, 'event.cancelled',
    jsonb_build_object('status', v_event.status),
    jsonb_build_object('status', 'cancelled', 'reason', p_reason),
    v_user_id);

  insert into domain_events (hotel_id, event_type, entity_type, entity_id, payload, occurred_at)
  values (p_hotel_id, 'event.cancelled', 'event', p_event_id,
    jsonb_build_object('previous_status', v_event.status, 'reason', p_reason, 'performed_by', v_user_id), now());

  return jsonb_build_object('success', true, 'event_id', p_event_id, 'new_status', 'cancelled');
end;
$$;

revoke all on function cancel_event from public;
grant execute on function cancel_event to authenticated;

-- =============================================================================
-- RPC: start_event_operation
-- confirmed → in_operation
-- =============================================================================
create or replace function start_event_operation(p_hotel_id uuid, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event record;
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_event from events where id = p_event_id and hotel_id = p_hotel_id for update;
  if v_event is null then raise exception 'NOT_FOUND: Evento no encontrado'; end if;
  if v_event.status != 'confirmed' then
    raise exception 'INVALID_STATE: Solo se puede iniciar operación desde estado confirmed, actual: %', v_event.status;
  end if;

  update events set status = 'in_operation' where id = p_event_id;

  insert into audit_logs (hotel_id, entity_type, entity_id, action, before_json, after_json, performed_by)
  values (p_hotel_id, 'event', p_event_id, 'event.operation_started',
    jsonb_build_object('status', 'confirmed'), jsonb_build_object('status', 'in_operation'), v_user_id);

  return jsonb_build_object('success', true, 'event_id', p_event_id, 'new_status', 'in_operation');
end;
$$;

revoke all on function start_event_operation from public;
grant execute on function start_event_operation to authenticated;

-- =============================================================================
-- RPC: complete_event
-- in_operation → completed
-- =============================================================================
create or replace function complete_event(p_hotel_id uuid, p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event record;
begin
  if not exists (
    select 1 from memberships
    where user_id = v_user_id and hotel_id = p_hotel_id and is_active = true
      and role in ('admin', 'direction')
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  select * into v_event from events where id = p_event_id and hotel_id = p_hotel_id for update;
  if v_event is null then raise exception 'NOT_FOUND: Evento no encontrado'; end if;
  if v_event.status != 'in_operation' then
    raise exception 'INVALID_STATE: Solo se puede completar desde in_operation, actual: %', v_event.status;
  end if;

  update events set status = 'completed' where id = p_event_id;

  insert into audit_logs (hotel_id, entity_type, entity_id, action, before_json, after_json, performed_by)
  values (p_hotel_id, 'event', p_event_id, 'event.completed',
    jsonb_build_object('status', 'in_operation'), jsonb_build_object('status', 'completed'), v_user_id);

  return jsonb_build_object('success', true, 'event_id', p_event_id, 'new_status', 'completed');
end;
$$;

revoke all on function complete_event from public;
grant execute on function complete_event to authenticated;

-- =============================================================================
-- RPC: get_events_calendar
-- Returns events in a date range for calendar view.
-- =============================================================================
create or replace function get_events_calendar(p_hotel_id uuid, p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from memberships
    where user_id = auth.uid() and hotel_id = p_hotel_id and is_active = true
  ) then
    raise exception 'ACCESS_DENIED';
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'name', e.name, 'event_date', e.event_date,
      'start_time', e.start_time, 'end_time', e.end_time,
      'guest_count', e.guest_count, 'status', e.status,
      'event_type', e.event_type, 'venue', e.venue,
      'client_name', c.name
    ) order by e.event_date, e.start_time), '[]'::jsonb)
    from events e
    left join clients c on c.id = e.client_id
    where e.hotel_id = p_hotel_id
      and e.event_date between p_from and p_to
      and e.status not in ('archived')
  );
end;
$$;

revoke all on function get_events_calendar from public;
grant execute on function get_events_calendar to authenticated;
