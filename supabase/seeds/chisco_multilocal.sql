-- =============================================================================
-- Chisco Multi-Local Seed — RestoOS
-- Grupo: CRU / Culuca Group (Chisco Jiménez + Xalo Muñiz)
-- 4 locales: Culuca Cociña-Bar, Taberna da Galera, Taberna da Tabacalera, Culuca Obrador
-- =============================================================================

-- Tenant ya existe: aa000000-0000-0000-0000-000000000001 (Culuca Group)
-- Hotel 1 ya existe: bb000000-0000-0000-0000-000000000001 (Culuca Cociña-Bar)

-- ─── NUEVOS LOCALES ──────────────────────────────────────────────────────────

INSERT INTO hotels (id, tenant_id, name, slug, timezone, currency) VALUES
  ('bb000000-0000-0000-0000-000000000002',
   'aa000000-0000-0000-0000-000000000001',
   'Taberna da Galera',
   'taberna-galera',
   'Europe/Madrid',
   'EUR'),
  ('bb000000-0000-0000-0000-000000000003',
   'aa000000-0000-0000-0000-000000000001',
   'Taberna da Tabacalera',
   'taberna-tabacalera',
   'Europe/Madrid',
   'EUR'),
  ('bb000000-0000-0000-0000-000000000004',
   'aa000000-0000-0000-0000-000000000001',
   'Culuca Obrador',
   'culuca-obrador',
   'Europe/Madrid',
   'EUR')
ON CONFLICT (id) DO NOTHING;

-- ─── UNIDADES DE MEDIDA (compartidas por los 3 nuevos locales) ───────────────
-- Cada local necesita sus propias unidades por el FK hotel_id

INSERT INTO units_of_measure (id, hotel_id, name, abbreviation, unit_type, is_base, conversion_factor) VALUES
  -- Taberna da Galera
  ('40000000-aaaa-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Kilogramo', 'kg', 'weight', true, 1),
  ('40000000-aaaa-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Gramo',     'g',  'weight', false, 0.001),
  ('40000000-aaaa-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', 'Litro',     'L',  'volume', true, 1),
  ('40000000-aaaa-0002-0000-000000000004', 'bb000000-0000-0000-0000-000000000002', 'Mililitro', 'mL', 'volume', false, 0.001),
  ('40000000-aaaa-0002-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', 'Unidad',    'ud', 'unit',   true, 1),
  -- Taberna da Tabacalera
  ('40000000-aaaa-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Kilogramo', 'kg', 'weight', true, 1),
  ('40000000-aaaa-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Gramo',     'g',  'weight', false, 0.001),
  ('40000000-aaaa-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'Litro',     'L',  'volume', true, 1),
  ('40000000-aaaa-0003-0000-000000000004', 'bb000000-0000-0000-0000-000000000003', 'Mililitro', 'mL', 'volume', false, 0.001),
  ('40000000-aaaa-0003-0000-000000000005', 'bb000000-0000-0000-0000-000000000003', 'Unidad',    'ud', 'unit',   true, 1),
  -- Culuca Obrador
  ('40000000-aaaa-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Kilogramo', 'kg', 'weight', true, 1),
  ('40000000-aaaa-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Gramo',     'g',  'weight', false, 0.001),
  ('40000000-aaaa-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Litro',     'L',  'volume', true, 1),
  ('40000000-aaaa-0004-0000-000000000004', 'bb000000-0000-0000-0000-000000000004', 'Mililitro', 'mL', 'volume', false, 0.001),
  ('40000000-aaaa-0004-0000-000000000005', 'bb000000-0000-0000-0000-000000000004', 'Unidad',    'ud', 'unit',   true, 1)
ON CONFLICT (id) DO NOTHING;

-- ─── CATEGORÍAS (compartidas por los 3 nuevos locales) ───────────────────────

INSERT INTO categories (id, hotel_id, name, parent_id, sort_order) VALUES
  -- Taberna da Galera
  ('10000000-cccc-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Carnes', null, 1),
  ('10000000-cccc-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Pescados y Mariscos', null, 2),
  ('10000000-cccc-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', 'Verduras', null, 3),
  ('10000000-cccc-0002-0000-000000000004', 'bb000000-0000-0000-0000-000000000002', 'Lácteos', null, 4),
  ('10000000-cccc-0002-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', 'Bebidas', null, 5),
  -- Taberna da Tabacalera
  ('10000000-cccc-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Carnes', null, 1),
  ('10000000-cccc-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Pescados y Mariscos', null, 2),
  ('10000000-cccc-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'Verduras', null, 3),
  ('10000000-cccc-0003-0000-000000000004', 'bb000000-0000-0000-0000-000000000003', 'Lácteos', null, 4),
  ('10000000-cccc-0003-0000-000000000005', 'bb000000-0000-0000-0000-000000000003', 'Bebidas', null, 5),
  -- Culuca Obrador
  ('10000000-cccc-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Carnes', null, 1),
  ('10000000-cccc-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Materias Primas', null, 2),
  ('10000000-cccc-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Producción', null, 3)
ON CONFLICT (id) DO NOTHING;

-- ─── PROVEEDORES (compartidos entre locales — mismos proveedores) ─────────────

INSERT INTO suppliers (id, hotel_id, name, contact_name, email, phone, tax_id, address, notes, is_active) VALUES
  -- Galera
  ('20000000-bbbb-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Pescadería O Porto', 'Manuel', 'info@oporto.es', '+34981111001', null, 'Mercado San Agustín', 'Mismo proveedor que Culuca', true),
  ('20000000-bbbb-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Carnicería Rial', 'Roberto', 'pedidos@rial.es', '+34981111002', null, 'Plaza de Lugo', null, true),
  ('20000000-bbbb-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', 'Distribuciones Gallaecia', 'Ana', 'ana@gallaecia.es', '+34981111005', null, 'Pol. Agrela', 'Aceites y secos', true),
  -- Tabacalera
  ('20000000-bbbb-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Pescadería O Porto', 'Manuel', 'info@oporto.es', '+34981111001', null, 'Mercado San Agustín', null, true),
  ('20000000-bbbb-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Carnicería Rial', 'Roberto', 'pedidos@rial.es', '+34981111002', null, 'Plaza de Lugo', 'Proveedor principal carnes', true),
  ('20000000-bbbb-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'Distribuciones Gallaecia', 'Ana', 'ana@gallaecia.es', '+34981111005', null, 'Pol. Agrela', null, true),
  -- Obrador
  ('20000000-bbbb-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Carnicería Rial', 'Roberto', 'pedidos@rial.es', '+34981111002', null, 'Plaza de Lugo', 'Callos y morros', true),
  ('20000000-bbbb-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Distribuciones Gallaecia', 'Ana', 'ana@gallaecia.es', '+34981111005', null, 'Pol. Agrela', 'Harinas, aceite, pan rallado', true),
  ('20000000-bbbb-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Lácteos do Campo', 'Pedro', 'pedidos@lacteoscampo.es', '+34981111004', null, 'Betanzos', 'Leche y nata para croquetas', true)
ON CONFLICT (id) DO NOTHING;

-- ─── PRODUCTOS CLAVE POR LOCAL ───────────────────────────────────────────────

-- Taberna da Galera (tapas + fusión gallega)
INSERT INTO products (id, hotel_id, name, category_id, default_unit_id, is_active, allergens, notes) VALUES
  ('30000000-cccc-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Pulpo fresco', '10000000-cccc-0002-0000-000000000002', '40000000-aaaa-0002-0000-000000000001', true, '["moluscos"]', 'Pulpo de la ría'),
  ('30000000-cccc-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Pimiento de Padrón', '10000000-cccc-0002-0000-000000000003', '40000000-aaaa-0002-0000-000000000001', true, '[]', null),
  ('30000000-cccc-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', 'Queso tetilla D.O.', '10000000-cccc-0002-0000-000000000004', '40000000-aaaa-0002-0000-000000000001', true, '["lacteos"]', null),
  ('30000000-cccc-0002-0000-000000000004', 'bb000000-0000-0000-0000-000000000002', 'Vino Albariño Zárate', '10000000-cccc-0002-0000-000000000005', '40000000-aaaa-0002-0000-000000000005', true, '["sulfitos"]', 'Botella 75cl'),
  ('30000000-cccc-0002-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', 'Aceite oliva virgen extra', '10000000-cccc-0002-0000-000000000005', '40000000-aaaa-0002-0000-000000000003', true, '[]', null)
ON CONFLICT (id) DO NOTHING;

-- Taberna da Tabacalera (carnes a la brasa)
INSERT INTO products (id, hotel_id, name, category_id, default_unit_id, is_active, allergens, notes) VALUES
  ('30000000-cccc-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Chuletón de vaca gallega', '10000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'Pieza 800g-1.2kg'),
  ('30000000-cccc-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Secreto ibérico', '10000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', true, '[]', null),
  ('30000000-cccc-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'Costillas de cerdo', '10000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'BBQ o brasa'),
  ('30000000-cccc-0003-0000-000000000004', 'bb000000-0000-0000-0000-000000000003', 'Patata gallega', '10000000-cccc-0003-0000-000000000003', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'Kennebec para guarnición'),
  ('30000000-cccc-0003-0000-000000000005', 'bb000000-0000-0000-0000-000000000003', 'Carbón vegetal', '10000000-cccc-0003-0000-000000000005', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'Para brasa')
ON CONFLICT (id) DO NOTHING;

-- Culuca Obrador (producción centralizada)
INSERT INTO products (id, hotel_id, name, category_id, default_unit_id, is_active, allergens, notes) VALUES
  ('30000000-cccc-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Callos de ternera (crudo)', '10000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', true, '[]', 'Materia prima para callos'),
  ('30000000-cccc-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Morros de ternera', '10000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', true, '[]', null),
  ('30000000-cccc-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Garbanzos', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000001', true, '[]', null),
  ('30000000-cccc-0004-0000-000000000004', 'bb000000-0000-0000-0000-000000000004', 'Chorizo para cocido', '10000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', true, '[]', null),
  ('30000000-cccc-0004-0000-000000000005', 'bb000000-0000-0000-0000-000000000004', 'Leche entera', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000003', true, '["lacteos"]', 'Para bechamel croquetas'),
  ('30000000-cccc-0004-0000-000000000006', 'bb000000-0000-0000-0000-000000000004', 'Harina de trigo', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000001', true, '["gluten"]', 'Para bechamel'),
  ('30000000-cccc-0004-0000-000000000007', 'bb000000-0000-0000-0000-000000000004', 'Mantequilla', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000001', true, '["lacteos"]', 'Para bechamel'),
  ('30000000-cccc-0004-0000-000000000008', 'bb000000-0000-0000-0000-000000000004', 'Jamón ibérico (picado)', '10000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', true, '[]', 'Para croquetas de jamón'),
  ('30000000-cccc-0004-0000-000000000009', 'bb000000-0000-0000-0000-000000000004', 'Pan rallado', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000001', true, '["gluten"]', 'Para empanado'),
  ('30000000-cccc-0004-0000-000000000010', 'bb000000-0000-0000-0000-000000000004', 'Huevo fresco', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000005', true, '["huevos"]', 'Para empanado')
ON CONFLICT (id) DO NOTHING;

-- ─── RECETAS COMPARTIDAS (Obrador → distribuye a los 3 locales) ──────────────

INSERT INTO recipes (id, hotel_id, name, description, category, servings, prep_time_min, cook_time_min, status, cost_per_serving) VALUES
  -- Obrador: producción batch
  ('50000000-eeee-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Callos de Culuca', 'Receta tradicional de callos con garbanzos, chorizo y morro', 'Principal', 50, 60, 180, 'approved', 2.80),
  ('50000000-eeee-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Croquetas de jamón ibérico', 'Bechamel casera con jamón ibérico, empanadas y congeladas', 'Entrante', 100, 90, 5, 'approved', 0.45),
  ('50000000-eeee-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Croquetas de cocido', 'Bechamel con caldo de cocido y carne desmigada', 'Entrante', 80, 90, 5, 'approved', 0.52),
  ('50000000-eeee-0004-0000-000000000004', 'bb000000-0000-0000-0000-000000000004', 'Croquetas de calamar', 'Bechamel con calamar en su tinta', 'Entrante', 60, 75, 5, 'approved', 0.68),
  -- Galera: platos propios
  ('50000000-eeee-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Pulpo á feira', 'Pulpo con patata, pimentón y AOVE', 'Principal', 4, 5, 45, 'approved', 4.50),
  ('50000000-eeee-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Tabla de quesos gallegos', 'Tetilla, San Simón, Arzúa-Ulloa con membrillo', 'Entrante', 2, 10, 0, 'approved', 3.20),
  -- Tabacalera: platos propios
  ('50000000-eeee-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Chuletón de vaca gallega 1kg', 'Chuletón a la brasa con sal Maldon', 'Principal', 2, 5, 15, 'approved', 18.50),
  ('50000000-eeee-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Costillas BBQ', 'Costillas de cerdo con salsa BBQ casera', 'Principal', 4, 30, 60, 'approved', 3.80)
ON CONFLICT (id) DO NOTHING;

-- ─── STOCK LOTS (diferentes precios por local = el dolor) ────────────────────

INSERT INTO stock_lots (hotel_id, product_id, unit_id, lot_number, initial_quantity, current_quantity, unit_cost, expiry_date) VALUES
  -- Aceite oliva: MISMO PRODUCTO, DIFERENTE PRECIO por local
  -- Culuca compra a 4.50€/L, Galera a 4.80€/L, Tabacalera a 5.20€/L (!)
  ('bb000000-0000-0000-0000-000000000002', '30000000-cccc-0002-0000-000000000005', '40000000-aaaa-0002-0000-000000000003', 'GAL-ACE-001', 10, 7, 4.80, '2027-03-01'),
  ('bb000000-0000-0000-0000-000000000003', '30000000-cccc-0003-0000-000000000004', '40000000-aaaa-0003-0000-000000000001', 'TAB-PAT-001', 25, 18, 1.40, '2026-04-15'),

  -- Obrador: materias primas para producción
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', 'OBR-CAL-001', 30, 22, 8.50, '2026-04-10'),
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000005', '40000000-aaaa-0004-0000-000000000003', 'OBR-LEC-001', 20, 14, 1.10, '2026-04-08'),
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000006', '40000000-aaaa-0004-0000-000000000001', 'OBR-HAR-001', 25, 20, 0.85, '2026-12-01'),
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000008', '40000000-aaaa-0004-0000-000000000001', 'OBR-JAM-001', 5, 3, 42.00, '2026-06-01'),
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000009', '40000000-aaaa-0004-0000-000000000001', 'OBR-PAN-001', 15, 12, 1.20, '2026-12-01'),

  -- Tabacalera: carnes
  ('bb000000-0000-0000-0000-000000000003', '30000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', 'TAB-CHU-001', 15, 8, 38.00, '2026-04-05'),
  ('bb000000-0000-0000-0000-000000000003', '30000000-cccc-0003-0000-000000000002', '40000000-aaaa-0003-0000-000000000001', 'TAB-SEC-001', 10, 6, 16.50, '2026-04-06'),
  ('bb000000-0000-0000-0000-000000000003', '30000000-cccc-0003-0000-000000000003', '40000000-aaaa-0003-0000-000000000001', 'TAB-COS-001', 20, 14, 9.80, '2026-04-08'),

  -- Galera: productos frescos
  ('bb000000-0000-0000-0000-000000000002', '30000000-cccc-0002-0000-000000000001', '40000000-aaaa-0002-0000-000000000001', 'GAL-PUL-001', 8, 5, 14.00, '2026-04-04'),
  ('bb000000-0000-0000-0000-000000000002', '30000000-cccc-0002-0000-000000000002', '40000000-aaaa-0002-0000-000000000001', 'GAL-PAD-001', 5, 3, 3.50, '2026-04-05'),
  ('bb000000-0000-0000-0000-000000000002', '30000000-cccc-0002-0000-000000000003', '40000000-aaaa-0002-0000-000000000001', 'GAL-QUE-001', 4, 3, 12.00, '2026-04-20')
ON CONFLICT DO NOTHING;

-- ─── NOTA FINAL ──────────────────────────────────────────────────────────────
-- Este seed añade 3 locales al tenant de Chisco (que ya tiene Culuca).
-- Para demo multi-local, ejecutar DESPUÉS de culuca_demo.sql.
-- El usuario chisco@culuca.com necesita membership en los 4 locales:
--   INSERT INTO memberships (user_id, hotel_id, tenant_id, role, is_active, is_default)
--   VALUES ('<user_id>', 'bb000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', 'head_chef', true, false);
--   VALUES ('<user_id>', 'bb000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001', 'head_chef', true, false);
--   VALUES ('<user_id>', 'bb000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000001', 'head_chef', true, false);
