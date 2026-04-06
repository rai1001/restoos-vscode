-- =============================================================================
-- Migration 041 — Fix Supabase Security Advisor issues
-- 1. Enable RLS on public.businesses (2 errors)
-- 2. Set search_path = '' on all public functions (33 warnings)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. BUSINESSES TABLE — Enable RLS
-- ---------------------------------------------------------------------------
alter table if exists public.businesses enable row level security;


-- ---------------------------------------------------------------------------
-- 2. FUNCTION SEARCH PATH — Set search_path = '' to prevent injection
-- ---------------------------------------------------------------------------

-- Trigger helper
alter function public.update_updated_at()
  set search_path = '';

-- Labeling
alter function public.generate_batch_code(uuid)
  set search_path = '';

-- Access helpers
alter function public.has_hotel_access(uuid)
  set search_path = '';
alter function public.has_hotel_role(uuid, text[])
  set search_path = '';
alter function public.has_tenant_access(uuid)
  set search_path = '';
alter function public.is_admin_user()
  set search_path = '';
alter function public.is_hotel_admin_for(uuid)
  set search_path = '';

-- Recipes
alter function public.create_recipe(uuid, text, text, text, integer, integer, integer, text)
  set search_path = '';
alter function public.update_recipe(uuid, uuid, text, text, text, integer, integer, integer, text, text)
  set search_path = '';
alter function public.submit_recipe_for_review(uuid, uuid)
  set search_path = '';
alter function public.approve_recipe(uuid, uuid)
  set search_path = '';
alter function public.deprecate_recipe(uuid, uuid)
  set search_path = '';
alter function public.calculate_recipe_cost(uuid, uuid)
  set search_path = '';
alter function public.calculate_menu_cost(uuid, uuid)
  set search_path = '';
alter function public.get_recipe_tech_sheet(uuid, uuid)
  set search_path = '';

-- Procurement
alter function public.create_purchase_request(uuid, uuid, text)
  set search_path = '';
alter function public.approve_purchase_request(uuid, uuid)
  set search_path = '';
alter function public.generate_purchase_order(uuid, uuid, date, text)
  set search_path = '';
alter function public.send_purchase_order(uuid, uuid)
  set search_path = '';
alter function public.receive_goods(uuid, uuid, jsonb, text)
  set search_path = '';

-- Inventory
alter function public.record_waste(uuid, uuid, uuid, numeric, text)
  set search_path = '';
alter function public.get_stock_levels(uuid)
  set search_path = '';
alter function public.check_stock_alerts(uuid, integer)
  set search_path = '';

-- Stock transfers
alter function public.create_stock_transfer(uuid, uuid, jsonb, text)
  set search_path = '';
alter function public.confirm_stock_transfer(uuid)
  set search_path = '';
alter function public.receive_stock_transfer(uuid, jsonb)
  set search_path = '';

-- APPCC
alter function public.create_check_record(uuid, uuid, date, numeric, text, text)
  set search_path = '';
alter function public.refresh_daily_closure(uuid, date)
  set search_path = '';
alter function public.validate_daily_closure(uuid, date, text)
  set search_path = '';
alter function public.get_appcc_daily_summaries(uuid, integer)
  set search_path = '';
alter function public.resolve_appcc_incident(uuid, uuid, text, text)
  set search_path = '';

-- ML / Analytics
alter function public.export_price_data_for_ml(uuid)
  set search_path = '';
