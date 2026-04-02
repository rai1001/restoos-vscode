-- =============================================================================
-- Nuevas tablas para completar RestoOS funcional:
-- 1. reservations + reservation_tables  (Reservas)
-- 2. staff_members + staff_shifts       (Staffing)
-- 3. sales_data                         (Ingeniería de menú)
-- 4. product_aliases                    (Normalización proveedores)
-- =============================================================================

-- ─── 1. RESERVATIONS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_name      TEXT NOT NULL,
  contact_phone     TEXT,
  contact_email     TEXT,
  party_size        INT NOT NULL CHECK (party_size > 0),
  reservation_date  DATE NOT NULL,
  reservation_time  TIME NOT NULL,
  duration_min      INT NOT NULL DEFAULT 90,
  status            TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN (
                      'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
                    )),
  source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
                      'manual', 'phone', 'web', 'third_party'
                    )),
  is_vip            BOOLEAN NOT NULL DEFAULT FALSE,
  is_group          BOOLEAN NOT NULL DEFAULT FALSE,
  notes             TEXT,
  internal_notes    TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_hotel_date ON reservations(hotel_id, reservation_date);
CREATE INDEX idx_reservations_status ON reservations(hotel_id, status);
CREATE INDEX idx_reservations_client ON reservations(client_id) WHERE client_id IS NOT NULL;
CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 2. STAFFING ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN (
                      'head_chef', 'sous_chef', 'cook', 'prep_cook', 'pastry',
                      'dishwasher', 'waiter', 'sommelier', 'bartender', 'host',
                      'manager', 'other'
                    )),
  contract_type     TEXT NOT NULL DEFAULT 'full_time' CHECK (contract_type IN (
                      'full_time', 'part_time', 'temp', 'intern', 'freelance'
                    )),
  hourly_cost       NUMERIC(10,2),
  phone             TEXT,
  email             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_hotel ON staff_members(hotel_id, is_active);
CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS staff_shifts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  staff_id          UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  shift_date        DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  break_min         INT NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
                      'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
                    )),
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_shift_times CHECK (end_time > start_time)
);

CREATE INDEX idx_shifts_hotel_date ON staff_shifts(hotel_id, shift_date);
CREATE INDEX idx_shifts_staff ON staff_shifts(staff_id, shift_date);
CREATE TRIGGER trg_shifts_updated_at
  BEFORE UPDATE ON staff_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 3. SALES DATA (Ingeniería de Menú) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales_data (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  recipe_id         UUID REFERENCES recipes(id) ON DELETE SET NULL,
  sale_date         DATE NOT NULL,
  menu_id           UUID REFERENCES menus(id) ON DELETE SET NULL,
  quantity_sold     INT NOT NULL CHECK (quantity_sold >= 0),
  unit_price        NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_revenue     NUMERIC(12,2) GENERATED ALWAYS AS (quantity_sold * unit_price) STORED,
  source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
                      'manual', 'pos_import', 'csv_import'
                    )),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_hotel_date ON sales_data(hotel_id, sale_date);
CREATE INDEX idx_sales_recipe ON sales_data(recipe_id, sale_date) WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_sales_menu ON sales_data(menu_id, sale_date) WHERE menu_id IS NOT NULL;

-- ─── 4. PRODUCT ALIASES (Normalización proveedores) ──────────────────────────

CREATE TABLE IF NOT EXISTS product_aliases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id       UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  alias_name        TEXT NOT NULL,
  alias_sku         TEXT,
  confidence        NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source            TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
                      'manual', 'ocr_confirmed', 'ocr_suggested'
                    )),
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_aliases_unique ON product_aliases(hotel_id, supplier_id, alias_name)
  WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_aliases_product ON product_aliases(product_id);
CREATE INDEX idx_aliases_search ON product_aliases(hotel_id, alias_name);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;

-- Policies follow the same hotel-membership pattern as other tables
CREATE POLICY "hotel_member_reservations" ON reservations
  FOR ALL USING (
    hotel_id IN (SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active)
  );

CREATE POLICY "hotel_member_staff" ON staff_members
  FOR ALL USING (
    hotel_id IN (SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active)
  );

CREATE POLICY "hotel_member_shifts" ON staff_shifts
  FOR ALL USING (
    hotel_id IN (SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active)
  );

CREATE POLICY "hotel_member_sales" ON sales_data
  FOR ALL USING (
    hotel_id IN (SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active)
  );

CREATE POLICY "hotel_member_aliases" ON product_aliases
  FOR ALL USING (
    hotel_id IN (SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active)
  );
