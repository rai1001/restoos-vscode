-- =============================================================================
-- E2: hotels.type — distinguir restaurante de cocina central
-- E3: stock_transfers — transferencias inter-hotel
-- =============================================================================

-- ─── E2: HOTEL TYPE ─────────────────────────────────────────────────────────

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'restaurant'
  CHECK (type IN ('restaurant', 'central_kitchen', 'dark_kitchen'));

CREATE INDEX IF NOT EXISTS idx_hotels_type ON hotels(tenant_id, type);

-- Note: Obrador type set in chisco_multilocal.sql seed

-- ─── E3: STOCK TRANSFERS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_transfers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  origin_hotel_id     UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  destination_hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  transfer_number     TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                        'draft',        -- creada, pendiente de confirmar
                        'confirmed',    -- confirmada por origen
                        'in_transit',   -- en camino
                        'received',     -- recibida por destino
                        'cancelled'
                      )),
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id),
  confirmed_by        UUID REFERENCES auth.users(id),
  received_by         UUID REFERENCES auth.users(id),
  confirmed_at        TIMESTAMPTZ,
  received_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_hotels CHECK (origin_hotel_id != destination_hotel_id)
);

CREATE UNIQUE INDEX idx_stock_transfers_number ON stock_transfers(tenant_id, transfer_number);
CREATE INDEX idx_stock_transfers_origin ON stock_transfers(origin_hotel_id, status);
CREATE INDEX idx_stock_transfers_destination ON stock_transfers(destination_hotel_id, status);
CREATE TRIGGER trg_stock_transfers_updated_at
  BEFORE UPDATE ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id       UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_name      TEXT NOT NULL,           -- nombre del producto (desnormalizado para cross-hotel)
  origin_product_id UUID REFERENCES products(id),  -- producto en hotel origen (nullable)
  dest_product_id   UUID REFERENCES products(id),  -- producto en hotel destino (nullable, se mapea al recibir)
  origin_lot_id     UUID REFERENCES stock_lots(id), -- lote de origen
  unit              TEXT NOT NULL,            -- kg, L, ud
  quantity_sent     NUMERIC(14,3) NOT NULL CHECK (quantity_sent > 0),
  quantity_received NUMERIC(14,3) DEFAULT 0,
  unit_cost         NUMERIC(14,4) NOT NULL,  -- coste unitario del lote de origen
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transfer_lines_transfer ON stock_transfer_lines(transfer_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_lines ENABLE ROW LEVEL SECURITY;

-- Users can see transfers where they have access to either origin or destination
CREATE POLICY "transfers_select" ON stock_transfers FOR SELECT
  USING (public.has_hotel_access(origin_hotel_id) OR public.has_hotel_access(destination_hotel_id));

CREATE POLICY "transfers_insert" ON stock_transfers FOR INSERT
  WITH CHECK (public.has_hotel_access(origin_hotel_id));

CREATE POLICY "transfers_update" ON stock_transfers FOR UPDATE
  USING (public.has_hotel_access(origin_hotel_id) OR public.has_hotel_access(destination_hotel_id));

-- Lines inherit visibility from transfer
CREATE POLICY "transfer_lines_select" ON stock_transfer_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM stock_transfers t
    WHERE t.id = transfer_id
      AND (public.has_hotel_access(t.origin_hotel_id) OR public.has_hotel_access(t.destination_hotel_id))
  ));

CREATE POLICY "transfer_lines_insert" ON stock_transfer_lines FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM stock_transfers t
    WHERE t.id = transfer_id AND public.has_hotel_access(t.origin_hotel_id)
  ));

CREATE POLICY "transfer_lines_update" ON stock_transfer_lines FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM stock_transfers t
    WHERE t.id = transfer_id
      AND (public.has_hotel_access(t.origin_hotel_id) OR public.has_hotel_access(t.destination_hotel_id))
  ));
