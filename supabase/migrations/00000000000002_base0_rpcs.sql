-- =============================================================================
-- Migration: Base 0 — RPCs
-- Module: D0 — Identity RPCs
-- RPCs: get_active_hotel, switch_active_hotel, create_hotel,
--        invite_member, update_member_role, deactivate_member
-- =============================================================================

-- =============================================================================
-- RPC: get_active_hotel
-- Returns the user's default (active) hotel with role and tenant info.
-- =============================================================================
create or replace function get_active_hotel(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  select jsonb_build_object(
    'hotel_id', h.id,
    'hotel_name', h.name,
    'hotel_slug', h.slug,
    'tenant_id', h.tenant_id,
    'tenant_name', t.name,
    'role', m.role,
    'timezone', h.timezone,
    'currency', h.currency
  ) into v_result
  from memberships m
  join hotels h on h.id = m.hotel_id
  join tenants t on t.id = h.tenant_id
  where m.user_id = p_user_id
    and m.is_active = true
    and m.is_default = true
  limit 1;

  -- If no default, pick the first active membership
  if v_result is null then
    select jsonb_build_object(
      'hotel_id', h.id,
      'hotel_name', h.name,
      'hotel_slug', h.slug,
      'tenant_id', h.tenant_id,
      'tenant_name', t.name,
      'role', m.role,
      'timezone', h.timezone,
      'currency', h.currency
    ) into v_result
    from memberships m
    join hotels h on h.id = m.hotel_id
    join tenants t on t.id = h.tenant_id
    where m.user_id = p_user_id
      and m.is_active = true
    order by m.created_at
    limit 1;
  end if;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function get_active_hotel from public;
grant execute on function get_active_hotel to authenticated;

-- =============================================================================
-- RPC: switch_active_hotel
-- Sets is_default on the target membership, unsets others.
-- =============================================================================
create or replace function switch_active_hotel(p_user_id uuid, p_hotel_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership record;
begin
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  -- Validate membership exists and is active
  select * into v_membership
  from memberships
  where user_id = p_user_id
    and hotel_id = p_hotel_id
    and is_active = true;

  if v_membership is null then
    raise exception 'ACCESS_DENIED: No tienes membresía activa en este hotel';
  end if;

  -- Unset all defaults for this user
  update memberships
  set is_default = false
  where user_id = p_user_id
    and is_default = true;

  -- Set the new default
  update memberships
  set is_default = true
  where user_id = p_user_id
    and hotel_id = p_hotel_id;

  return jsonb_build_object(
    'success', true,
    'hotel_id', p_hotel_id,
    'role', v_membership.role
  );
end;
$$;

revoke all on function switch_active_hotel from public;
grant execute on function switch_active_hotel to authenticated;

-- =============================================================================
-- RPC: create_hotel
-- Creates a hotel + membership for the creator as admin.
-- =============================================================================
create or replace function create_hotel(
  p_tenant_id uuid,
  p_name text,
  p_slug text,
  p_timezone text default 'Europe/Madrid',
  p_currency text default 'EUR'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_hotel_id uuid;
begin
  -- Validate user has a membership in this tenant
  if not exists (
    select 1 from memberships
    where user_id = v_user_id
      and tenant_id = p_tenant_id
      and is_active = true
      and role in ('superadmin', 'admin', 'direction')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para crear hoteles en este tenant';
  end if;

  -- Create hotel
  insert into hotels (tenant_id, name, slug, timezone, currency)
  values (p_tenant_id, p_name, p_slug, p_timezone, p_currency)
  returning id into v_hotel_id;

  -- Create admin membership for creator
  insert into memberships (user_id, hotel_id, tenant_id, role, is_active, is_default)
  values (v_user_id, v_hotel_id, p_tenant_id, 'admin', true, false);

  -- Audit
  insert into audit_logs (hotel_id, entity_type, entity_id, action, after_json, performed_by)
  values (
    v_hotel_id,
    'hotel',
    v_hotel_id,
    'hotel.created',
    jsonb_build_object('name', p_name, 'slug', p_slug),
    v_user_id
  );

  return jsonb_build_object(
    'success', true,
    'hotel_id', v_hotel_id
  );
end;
$$;

revoke all on function create_hotel from public;
grant execute on function create_hotel to authenticated;

-- =============================================================================
-- RPC: invite_member
-- Creates a membership for an existing user (by email) or records invitation.
-- MVP: assumes user already exists in auth.users.
-- =============================================================================
create or replace function invite_member(
  p_hotel_id uuid,
  p_email text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_user_id uuid;
  v_hotel record;
  v_membership_id uuid;
begin
  -- Validate caller has admin/direction role in this hotel
  if not exists (
    select 1 from memberships
    where user_id = v_user_id
      and hotel_id = p_hotel_id
      and is_active = true
      and role in ('superadmin', 'admin', 'direction')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para invitar miembros';
  end if;

  -- Get hotel info
  select * into v_hotel from hotels where id = p_hotel_id;
  if v_hotel is null then
    raise exception 'NOT_FOUND: Hotel no encontrado';
  end if;

  -- Validate role
  if p_role not in ('direction', 'commercial', 'head_chef', 'cook', 'procurement', 'room', 'reception', 'admin') then
    raise exception 'VALIDATION_ERROR: Rol no válido';
  end if;

  -- Only admin/superadmin can invite admins
  IF p_role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND hotel_id = p_hotel_id
      AND is_active = true AND role IN ('superadmin','admin')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED: solo admin/superadmin pueden invitar admins';
  END IF;

  -- Find user by email
  select id into v_target_user_id
  from auth.users
  where email = p_email;

  if v_target_user_id is null then
    raise exception 'NOT_FOUND: Usuario con email % no encontrado', p_email;
  end if;

  -- Check if membership already exists
  if exists (
    select 1 from memberships
    where user_id = v_target_user_id and hotel_id = p_hotel_id
  ) then
    raise exception 'ALREADY_APPLIED: El usuario ya tiene membresía en este hotel';
  end if;

  -- Create membership
  insert into memberships (user_id, hotel_id, tenant_id, role, is_active)
  values (v_target_user_id, p_hotel_id, v_hotel.tenant_id, p_role, true)
  returning id into v_membership_id;

  -- Audit
  insert into audit_logs (hotel_id, entity_type, entity_id, action, after_json, performed_by)
  values (
    p_hotel_id,
    'membership',
    v_membership_id,
    'member.invited',
    jsonb_build_object('email', p_email, 'role', p_role, 'target_user_id', v_target_user_id),
    v_user_id
  );

  return jsonb_build_object(
    'success', true,
    'membership_id', v_membership_id
  );
end;
$$;

revoke all on function invite_member from public;
grant execute on function invite_member to authenticated;

-- =============================================================================
-- RPC: update_member_role
-- Changes a member's role within a hotel.
-- =============================================================================
create or replace function update_member_role(
  p_hotel_id uuid,
  p_target_user_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership record;
begin
  -- Validate caller has admin/direction role
  if not exists (
    select 1 from memberships
    where user_id = v_user_id
      and hotel_id = p_hotel_id
      and is_active = true
      and role in ('superadmin', 'admin', 'direction')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para cambiar roles';
  end if;

  -- Validate role
  if p_new_role not in ('direction', 'commercial', 'head_chef', 'cook', 'procurement', 'room', 'reception', 'admin') then
    raise exception 'VALIDATION_ERROR: Rol no válido';
  end if;

  -- Get target membership
  select * into v_membership
  from memberships
  where user_id = p_target_user_id
    and hotel_id = p_hotel_id
  for update;

  if v_membership is null then
    raise exception 'NOT_FOUND: Membresía no encontrada';
  end if;

  -- Prevent self role change
  IF v_user_id = p_target_user_id AND p_new_role IS DISTINCT FROM v_membership.role THEN
    RAISE EXCEPTION 'ACCESS_DENIED: self role change disabled';
  END IF;

  -- Only admin/superadmin can assign admin role
  IF p_new_role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND hotel_id = p_hotel_id
      AND is_active = true AND role IN ('superadmin','admin')
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED: solo admin/superadmin pueden asignar admin';
  END IF;

  -- Update role
  update memberships
  set role = p_new_role
  where id = v_membership.id;

  -- Audit
  insert into audit_logs (hotel_id, entity_type, entity_id, action, before_json, after_json, performed_by)
  values (
    p_hotel_id,
    'membership',
    v_membership.id,
    'member.role_changed',
    jsonb_build_object('role', v_membership.role),
    jsonb_build_object('role', p_new_role),
    v_user_id
  );

  return jsonb_build_object(
    'success', true,
    'previous_role', v_membership.role,
    'new_role', p_new_role
  );
end;
$$;

revoke all on function update_member_role from public;
grant execute on function update_member_role to authenticated;

-- =============================================================================
-- RPC: deactivate_member
-- Soft-deactivates a membership (does not delete).
-- =============================================================================
create or replace function deactivate_member(
  p_hotel_id uuid,
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership record;
begin
  -- Validate caller has admin/direction role
  if not exists (
    select 1 from memberships
    where user_id = v_user_id
      and hotel_id = p_hotel_id
      and is_active = true
      and role in ('superadmin', 'admin', 'direction')
  ) then
    raise exception 'ACCESS_DENIED: No tienes permisos para desactivar miembros';
  end if;

  -- Prevent self-deactivation
  if p_target_user_id = v_user_id then
    raise exception 'VALIDATION_ERROR: No puedes desactivarte a ti mismo';
  end if;

  -- Get target membership
  select * into v_membership
  from memberships
  where user_id = p_target_user_id
    and hotel_id = p_hotel_id
    and is_active = true
  for update;

  if v_membership is null then
    raise exception 'NOT_FOUND: Membresía activa no encontrada';
  end if;

  -- Deactivate
  update memberships
  set is_active = false, is_default = false
  where id = v_membership.id;

  -- Audit
  insert into audit_logs (hotel_id, entity_type, entity_id, action, before_json, after_json, performed_by)
  values (
    p_hotel_id,
    'membership',
    v_membership.id,
    'member.deactivated',
    jsonb_build_object('is_active', true, 'role', v_membership.role),
    jsonb_build_object('is_active', false),
    v_user_id
  );

  return jsonb_build_object(
    'success', true,
    'deactivated_user_id', p_target_user_id
  );
end;
$$;

revoke all on function deactivate_member from public;
grant execute on function deactivate_member to authenticated;
