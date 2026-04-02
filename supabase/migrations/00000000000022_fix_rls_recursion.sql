-- =============================================================================
-- FIX: Replace all RLS policies that subquery memberships with helper functions
-- This prevents infinite recursion when memberships itself has RLS policies
-- =============================================================================

-- Helper functions (idempotent)
CREATE OR REPLACE FUNCTION public.has_hotel_access(p_hotel_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND hotel_id = p_hotel_id AND is_active = true); $$;

CREATE OR REPLACE FUNCTION public.has_hotel_role(p_hotel_id uuid, p_roles text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND hotel_id = p_hotel_id AND is_active = true AND role = ANY(p_roles)); $$;

-- Tenant access helper
CREATE OR REPLACE FUNCTION public.has_tenant_access(p_tenant_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true); $$;

-- ─── DROP ALL AFFECTED POLICIES ─────────────────────────────────────────────

-- tenants
DROP POLICY IF EXISTS "tenants_select" ON tenants;
-- hotels
DROP POLICY IF EXISTS "hotels_select" ON hotels;
-- audit_logs
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
-- domain_events
DROP POLICY IF EXISTS "domain_events_select" ON domain_events;
-- categories
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
-- units_of_measure
DROP POLICY IF EXISTS "units_select" ON units_of_measure;
DROP POLICY IF EXISTS "units_insert" ON units_of_measure;
DROP POLICY IF EXISTS "units_update" ON units_of_measure;
-- products
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
-- suppliers
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
-- supplier_offers
DROP POLICY IF EXISTS "offers_select" ON supplier_offers;
DROP POLICY IF EXISTS "offers_insert" ON supplier_offers;
DROP POLICY IF EXISTS "offers_update" ON supplier_offers;
-- product_aliases
DROP POLICY IF EXISTS "aliases_select" ON product_aliases;
DROP POLICY IF EXISTS "aliases_insert" ON product_aliases;
DROP POLICY IF EXISTS "aliases_update" ON product_aliases;
-- clients
DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
-- restaurant_tables
DROP POLICY IF EXISTS "restaurant_tables_select" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_insert" ON restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_update" ON restaurant_tables;
-- turns
DROP POLICY IF EXISTS "turns_select" ON turns;
DROP POLICY IF EXISTS "turns_insert" ON turns;
DROP POLICY IF EXISTS "turns_update" ON turns;
-- reservations
DROP POLICY IF EXISTS "reservations_select" ON reservations;
DROP POLICY IF EXISTS "reservations_insert" ON reservations;
DROP POLICY IF EXISTS "reservations_update" ON reservations;
-- recipes
DROP POLICY IF EXISTS "recipes_select" ON recipes;
DROP POLICY IF EXISTS "recipes_insert" ON recipes;
DROP POLICY IF EXISTS "recipes_update" ON recipes;
-- recipe_ingredients
DROP POLICY IF EXISTS "recipe_ingredients_select" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_insert" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_update" ON recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_delete" ON recipe_ingredients;
-- recipe_steps
DROP POLICY IF EXISTS "recipe_steps_select" ON recipe_steps;
DROP POLICY IF EXISTS "recipe_steps_insert" ON recipe_steps;
DROP POLICY IF EXISTS "recipe_steps_update" ON recipe_steps;
DROP POLICY IF EXISTS "recipe_steps_delete" ON recipe_steps;
-- recipe_versions
DROP POLICY IF EXISTS "recipe_versions_select" ON recipe_versions;
-- menus
DROP POLICY IF EXISTS "menus_select" ON menus;
DROP POLICY IF EXISTS "menus_insert" ON menus;
DROP POLICY IF EXISTS "menus_update" ON menus;
-- menu_sections
DROP POLICY IF EXISTS "menu_sections_select" ON menu_sections;
DROP POLICY IF EXISTS "menu_sections_insert" ON menu_sections;
DROP POLICY IF EXISTS "menu_sections_update" ON menu_sections;
DROP POLICY IF EXISTS "menu_sections_delete" ON menu_sections;
-- menu_section_recipes
DROP POLICY IF EXISTS "menu_section_recipes_select" ON menu_section_recipes;
DROP POLICY IF EXISTS "menu_section_recipes_insert" ON menu_section_recipes;
DROP POLICY IF EXISTS "menu_section_recipes_update" ON menu_section_recipes;
DROP POLICY IF EXISTS "menu_section_recipes_delete" ON menu_section_recipes;
-- purchase_requests
DROP POLICY IF EXISTS "purchase_requests_select" ON purchase_requests;
DROP POLICY IF EXISTS "purchase_requests_insert" ON purchase_requests;
DROP POLICY IF EXISTS "purchase_requests_update" ON purchase_requests;
-- purchase_request_lines
DROP POLICY IF EXISTS "pr_lines_select" ON purchase_request_lines;
DROP POLICY IF EXISTS "pr_lines_insert" ON purchase_request_lines;
DROP POLICY IF EXISTS "pr_lines_update" ON purchase_request_lines;
DROP POLICY IF EXISTS "pr_lines_delete" ON purchase_request_lines;
-- purchase_orders
DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update" ON purchase_orders;
-- purchase_order_lines
DROP POLICY IF EXISTS "po_lines_select" ON purchase_order_lines;
DROP POLICY IF EXISTS "po_lines_insert" ON purchase_order_lines;
DROP POLICY IF EXISTS "po_lines_update" ON purchase_order_lines;
-- goods_receipts
DROP POLICY IF EXISTS "goods_receipts_select" ON goods_receipts;
DROP POLICY IF EXISTS "goods_receipts_insert" ON goods_receipts;
-- goods_receipt_lines
DROP POLICY IF EXISTS "gr_lines_select" ON goods_receipt_lines;
DROP POLICY IF EXISTS "gr_lines_insert" ON goods_receipt_lines;
-- stock_lots
DROP POLICY IF EXISTS "stock_lots_select" ON stock_lots;
DROP POLICY IF EXISTS "stock_lots_insert" ON stock_lots;
DROP POLICY IF EXISTS "stock_lots_update" ON stock_lots;
-- stock_movements
DROP POLICY IF EXISTS "stock_movements_select" ON stock_movements;
DROP POLICY IF EXISTS "stock_movements_insert" ON stock_movements;
-- kpi_snapshots
DROP POLICY IF EXISTS "kpi_snapshots_select" ON kpi_snapshots;
DROP POLICY IF EXISTS "kpi_snapshots_insert" ON kpi_snapshots;
-- alerts
DROP POLICY IF EXISTS "alerts_select" ON alerts;
DROP POLICY IF EXISTS "alerts_insert" ON alerts;
DROP POLICY IF EXISTS "alerts_update" ON alerts;
-- alert_rules
DROP POLICY IF EXISTS "alert_rules_select" ON alert_rules;
DROP POLICY IF EXISTS "alert_rules_insert" ON alert_rules;
DROP POLICY IF EXISTS "alert_rules_update" ON alert_rules;
-- feedback_tickets (admin policies)
DROP POLICY IF EXISTS "Admins can view all tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON feedback_tickets;
DROP POLICY IF EXISTS "Admins can delete tickets" ON feedback_tickets;

-- ─── RECREATE ALL POLICIES WITH HELPER FUNCTIONS ────────────────────────────

-- tenants
CREATE POLICY "tenants_select" ON tenants FOR SELECT USING (public.has_tenant_access(id));
-- hotels
CREATE POLICY "hotels_select" ON hotels FOR SELECT USING (public.has_hotel_access(id));

-- audit_logs (hotel_id based)
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (public.has_hotel_access(hotel_id));
-- domain_events
CREATE POLICY "domain_events_select" ON domain_events FOR SELECT USING (public.has_hotel_access(hotel_id));

-- categories
CREATE POLICY "categories_select" ON categories FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- units_of_measure
CREATE POLICY "units_select" ON units_of_measure FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "units_insert" ON units_of_measure FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "units_update" ON units_of_measure FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- products
CREATE POLICY "products_select" ON products FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "products_update" ON products FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- suppliers
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- supplier_offers
CREATE POLICY "offers_select" ON supplier_offers FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "offers_insert" ON supplier_offers FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "offers_update" ON supplier_offers FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- product_aliases
CREATE POLICY "aliases_select" ON product_aliases FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "aliases_insert" ON product_aliases FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "aliases_update" ON product_aliases FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- clients
CREATE POLICY "clients_select" ON clients FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- restaurant_tables
CREATE POLICY "restaurant_tables_select" ON restaurant_tables FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "restaurant_tables_insert" ON restaurant_tables FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "restaurant_tables_update" ON restaurant_tables FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- turns
CREATE POLICY "turns_select" ON turns FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "turns_insert" ON turns FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "turns_update" ON turns FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- reservations
CREATE POLICY "reservations_select" ON reservations FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "reservations_insert" ON reservations FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "reservations_update" ON reservations FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- recipes
CREATE POLICY "recipes_select" ON recipes FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "recipes_insert" ON recipes FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "recipes_update" ON recipes FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- recipe_ingredients
CREATE POLICY "recipe_ingredients_select" ON recipe_ingredients FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "recipe_ingredients_insert" ON recipe_ingredients FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "recipe_ingredients_update" ON recipe_ingredients FOR UPDATE USING (public.has_hotel_access(hotel_id));
CREATE POLICY "recipe_ingredients_delete" ON recipe_ingredients FOR DELETE USING (public.has_hotel_access(hotel_id));

-- recipe_steps
CREATE POLICY "recipe_steps_select" ON recipe_steps FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "recipe_steps_insert" ON recipe_steps FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "recipe_steps_update" ON recipe_steps FOR UPDATE USING (public.has_hotel_access(hotel_id));
CREATE POLICY "recipe_steps_delete" ON recipe_steps FOR DELETE USING (public.has_hotel_access(hotel_id));

-- recipe_versions
CREATE POLICY "recipe_versions_select" ON recipe_versions FOR SELECT USING (public.has_hotel_access(hotel_id));

-- menus
CREATE POLICY "menus_select" ON menus FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "menus_insert" ON menus FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "menus_update" ON menus FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- menu_sections
CREATE POLICY "menu_sections_select" ON menu_sections FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "menu_sections_insert" ON menu_sections FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "menu_sections_update" ON menu_sections FOR UPDATE USING (public.has_hotel_access(hotel_id));
CREATE POLICY "menu_sections_delete" ON menu_sections FOR DELETE USING (public.has_hotel_access(hotel_id));

-- menu_section_recipes
CREATE POLICY "menu_section_recipes_select" ON menu_section_recipes FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "menu_section_recipes_insert" ON menu_section_recipes FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "menu_section_recipes_update" ON menu_section_recipes FOR UPDATE USING (public.has_hotel_access(hotel_id));
CREATE POLICY "menu_section_recipes_delete" ON menu_section_recipes FOR DELETE USING (public.has_hotel_access(hotel_id));

-- purchase_requests
CREATE POLICY "purchase_requests_select" ON purchase_requests FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "purchase_requests_insert" ON purchase_requests FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "purchase_requests_update" ON purchase_requests FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- purchase_request_lines
CREATE POLICY "pr_lines_select" ON purchase_request_lines FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "pr_lines_insert" ON purchase_request_lines FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "pr_lines_update" ON purchase_request_lines FOR UPDATE USING (public.has_hotel_access(hotel_id));
CREATE POLICY "pr_lines_delete" ON purchase_request_lines FOR DELETE USING (public.has_hotel_access(hotel_id));

-- purchase_orders
CREATE POLICY "purchase_orders_select" ON purchase_orders FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "purchase_orders_insert" ON purchase_orders FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "purchase_orders_update" ON purchase_orders FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- purchase_order_lines
CREATE POLICY "po_lines_select" ON purchase_order_lines FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "po_lines_insert" ON purchase_order_lines FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "po_lines_update" ON purchase_order_lines FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- goods_receipts
CREATE POLICY "goods_receipts_select" ON goods_receipts FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "goods_receipts_insert" ON goods_receipts FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));

-- goods_receipt_lines
CREATE POLICY "gr_lines_select" ON goods_receipt_lines FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "gr_lines_insert" ON goods_receipt_lines FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));

-- stock_lots
CREATE POLICY "stock_lots_select" ON stock_lots FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "stock_lots_insert" ON stock_lots FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "stock_lots_update" ON stock_lots FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- stock_movements (append-only: no update/delete)
CREATE POLICY "stock_movements_select" ON stock_movements FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "stock_movements_insert" ON stock_movements FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));

-- kpi_snapshots
CREATE POLICY "kpi_snapshots_select" ON kpi_snapshots FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "kpi_snapshots_insert" ON kpi_snapshots FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));

-- alerts
CREATE POLICY "alerts_select" ON alerts FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "alerts_insert" ON alerts FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "alerts_update" ON alerts FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- alert_rules
CREATE POLICY "alert_rules_select" ON alert_rules FOR SELECT USING (public.has_hotel_access(hotel_id));
CREATE POLICY "alert_rules_insert" ON alert_rules FOR INSERT WITH CHECK (public.has_hotel_access(hotel_id));
CREATE POLICY "alert_rules_update" ON alert_rules FOR UPDATE USING (public.has_hotel_access(hotel_id));

-- feedback_tickets (admin = direction/admin/superadmin via role check)
CREATE POLICY "Admins can view all tickets" ON feedback_tickets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'direction', 'superadmin')));
CREATE POLICY "Admins can update all tickets" ON feedback_tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'direction', 'superadmin')));
CREATE POLICY "Admins can delete tickets" ON feedback_tickets FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'direction', 'superadmin')));
