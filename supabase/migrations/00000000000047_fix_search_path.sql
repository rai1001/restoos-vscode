-- =============================================================================
-- Migration 047: Fix broken search_path on existing RPCs
-- =============================================================================
-- Migration 041 set `search_path = ''` on all public functions to follow the
-- Supabase Security Advisor recommendation. That is correct in isolation,
-- but the functions predate this change and internally reference tables
-- without the `public.` schema qualifier (e.g. `INSERT INTO stock_transfers`).
-- With an empty search_path those names cannot be resolved and the RPCs
-- raise `relation "..." does not exist`.
--
-- RO-APPSEC-SP-001: restore a safe, non-mutable search_path of
-- `pg_catalog, public`. This still prevents search_path injection (user
-- cannot put their own schema first) but lets unqualified table names
-- resolve to the `public` schema as the code expects.
--
-- Long-term fix: qualify every table reference with `public.` inside the
-- function bodies. That is out of scope for this hardening pass — ~40
-- RPCs would need rewriting.
-- =============================================================================

-- Trigger helper
alter function public.update_updated_at()                                    set search_path = pg_catalog, public;

-- Labeling
alter function public.generate_batch_code(uuid)                              set search_path = pg_catalog, public;

-- Access helpers
alter function public.has_hotel_access(uuid)                                 set search_path = pg_catalog, public;
alter function public.has_hotel_role(uuid, text[])                           set search_path = pg_catalog, public;
alter function public.has_tenant_access(uuid)                                set search_path = pg_catalog, public;
alter function public.is_admin_user()                                        set search_path = pg_catalog, public;
alter function public.is_hotel_admin_for(uuid)                               set search_path = pg_catalog, public;

-- Recipes
alter function public.create_recipe(uuid, text, text, text, integer, integer, integer, text)                 set search_path = pg_catalog, public;
alter function public.update_recipe(uuid, uuid, text, text, text, integer, integer, integer, text, text)     set search_path = pg_catalog, public;
alter function public.submit_recipe_for_review(uuid, uuid)                   set search_path = pg_catalog, public;
alter function public.approve_recipe(uuid, uuid)                             set search_path = pg_catalog, public;
alter function public.deprecate_recipe(uuid, uuid)                           set search_path = pg_catalog, public;
alter function public.calculate_recipe_cost(uuid, uuid)                      set search_path = pg_catalog, public;
alter function public.calculate_menu_cost(uuid, uuid)                        set search_path = pg_catalog, public;
alter function public.get_recipe_tech_sheet(uuid, uuid)                      set search_path = pg_catalog, public;

-- Procurement
alter function public.create_purchase_request(uuid, uuid, text)              set search_path = pg_catalog, public;
alter function public.approve_purchase_request(uuid, uuid)                   set search_path = pg_catalog, public;
alter function public.generate_purchase_order(uuid, uuid, date, text)        set search_path = pg_catalog, public;
alter function public.send_purchase_order(uuid, uuid)                        set search_path = pg_catalog, public;
alter function public.receive_goods(uuid, uuid, jsonb, text)                 set search_path = pg_catalog, public;

-- Inventory
alter function public.record_waste(uuid, uuid, uuid, numeric, text)          set search_path = pg_catalog, public;
alter function public.get_stock_levels(uuid)                                 set search_path = pg_catalog, public;
alter function public.check_stock_alerts(uuid, integer)                      set search_path = pg_catalog, public;

-- Stock transfers (note: migration 046 already reset these to `public` via
-- CREATE OR REPLACE ... SET search_path = public. We keep them consistent.)
alter function public.confirm_stock_transfer(uuid)                           set search_path = pg_catalog, public;

-- APPCC
alter function public.create_check_record(uuid, uuid, date, numeric, text, text)   set search_path = pg_catalog, public;
alter function public.refresh_daily_closure(uuid, date)                      set search_path = pg_catalog, public;
alter function public.validate_daily_closure(uuid, date, text)               set search_path = pg_catalog, public;
alter function public.get_appcc_daily_summaries(uuid, integer)               set search_path = pg_catalog, public;
alter function public.resolve_appcc_incident(uuid, uuid, text, text)         set search_path = pg_catalog, public;

-- ML / Analytics
alter function public.export_price_data_for_ml(uuid)                         set search_path = pg_catalog, public;
