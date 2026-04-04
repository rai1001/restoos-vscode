-- Fix infinite recursion in memberships RLS policy
-- memberships_select_hotel_admin did a subquery on memberships itself,
-- causing infinite recursion. Replace with SECURITY DEFINER helper.

CREATE OR REPLACE FUNCTION public.is_hotel_admin_for(p_hotel_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND hotel_id = p_hotel_id AND is_active = true AND role IN ('admin','direction','superadmin')); $$;

DROP POLICY IF EXISTS memberships_select_hotel_admin ON memberships;
CREATE POLICY memberships_select_hotel_admin ON memberships FOR SELECT
  USING (public.is_hotel_admin_for(hotel_id));
