-- =============================================================================
-- Migration: CLARA — Agente de administracion financiera
-- Tables: facturas_recibidas, lineas_factura, discrepancias_clara,
--         documentos_faltantes, clara_retry_queue
-- =============================================================================

-- ─── FACTURAS RECIBIDAS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS facturas_recibidas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  supplier_id       UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  fecha_factura     DATE,
  numero_factura    TEXT,
  subtotal          NUMERIC(14,2),
  iva               NUMERIC(14,2),
  total             NUMERIC(14,2),
  estado            TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'procesada', 'discrepancia', 'revision_manual')),
  confianza_ocr     INTEGER CHECK (confianza_ocr BETWEEN 0 AND 100),
  ruta_documento    TEXT,
  hash_documento    TEXT,
  datos_extraidos   JSONB,
  campos_faltantes  TEXT[],
  email_origin      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facturas_hotel ON facturas_recibidas(hotel_id, estado);
CREATE INDEX idx_facturas_supplier ON facturas_recibidas(supplier_id);
CREATE INDEX idx_facturas_numero ON facturas_recibidas(hotel_id, numero_factura);
CREATE INDEX idx_facturas_fecha ON facturas_recibidas(hotel_id, fecha_factura DESC);

CREATE TRIGGER trg_facturas_recibidas_updated_at
  BEFORE UPDATE ON facturas_recibidas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── LINEAS FACTURA ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lineas_factura (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id        UUID NOT NULL REFERENCES facturas_recibidas(id) ON DELETE CASCADE,
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  descripcion       TEXT NOT NULL,
  cantidad          NUMERIC(14,3) NOT NULL,
  precio_unitario   NUMERIC(14,4) NOT NULL,
  total_linea       NUMERIC(14,2) NOT NULL,
  iva_tipo          NUMERIC(5,2) DEFAULT 10.00,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lineas_factura ON lineas_factura(factura_id);

-- ─── DISCREPANCIAS CLARA ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS discrepancias_clara (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id            UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  factura_id          UUID NOT NULL REFERENCES facturas_recibidas(id) ON DELETE CASCADE,
  receipt_id          UUID REFERENCES goods_receipts(id) ON DELETE SET NULL,
  tipo_discrepancia   TEXT NOT NULL CHECK (tipo_discrepancia IN (
    'precio_incorrecto', 'cantidad_incorrecta', 'cargo_duplicado',
    'documento_faltante', 'proveedor_desconocido'
  )),
  valor_esperado      TEXT,
  valor_recibido      TEXT,
  diferencia          NUMERIC(14,2),
  estado              TEXT NOT NULL DEFAULT 'abierta'
    CHECK (estado IN ('abierta', 'resuelta', 'ignorada')),
  mensaje_proveedor   TEXT,
  resuelto_por        UUID REFERENCES auth.users(id),
  resuelto_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discrepancias_hotel ON discrepancias_clara(hotel_id, estado);
CREATE INDEX idx_discrepancias_factura ON discrepancias_clara(factura_id);

-- ─── DOCUMENTOS FALTANTES ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documentos_faltantes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  supplier_id       UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('factura', 'albaran')),
  fecha_esperada    DATE,
  referencia        TEXT,
  estado            TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'recibido', 'cancelado')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_faltantes_hotel ON documentos_faltantes(hotel_id, estado);

-- ─── COLA DE REINTENTOS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clara_retry_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  modulo            TEXT NOT NULL,
  payload           JSONB NOT NULL,
  intentos          INTEGER NOT NULL DEFAULT 0,
  max_intentos      INTEGER NOT NULL DEFAULT 3,
  ultimo_error      TEXT,
  estado            TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'procesando', 'completado', 'fallido')),
  proximo_intento   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retry_queue_pending ON clara_retry_queue(estado, proximo_intento)
  WHERE estado = 'pendiente';

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE facturas_recibidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE discrepancias_clara ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_faltantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clara_retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_member_facturas" ON facturas_recibidas
  FOR ALL USING (hotel_id IN (
    SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active
  ));

CREATE POLICY "hotel_member_lineas_factura" ON lineas_factura
  FOR ALL USING (hotel_id IN (
    SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active
  ));

CREATE POLICY "hotel_member_discrepancias_clara" ON discrepancias_clara
  FOR ALL USING (hotel_id IN (
    SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active
  ));

CREATE POLICY "hotel_member_docs_faltantes" ON documentos_faltantes
  FOR ALL USING (hotel_id IN (
    SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active
  ));

CREATE POLICY "hotel_member_retry_queue" ON clara_retry_queue
  FOR ALL USING (hotel_id IN (
    SELECT hotel_id FROM memberships WHERE user_id = auth.uid() AND is_active
  ));

-- ─── COMMENTS ──────────────────────────────────────────────────────────────

COMMENT ON TABLE facturas_recibidas IS 'Facturas procesadas por CLARA — agente de administracion financiera';
COMMENT ON TABLE lineas_factura IS 'Lineas individuales extraidas de facturas por OCR';
COMMENT ON TABLE discrepancias_clara IS 'Discrepancias detectadas al conciliar facturas con albaranes';
COMMENT ON TABLE documentos_faltantes IS 'Documentos pendientes de recibir (facturas o albaranes)';
COMMENT ON TABLE clara_retry_queue IS 'Cola de reintentos para operaciones CLARA fallidas';
