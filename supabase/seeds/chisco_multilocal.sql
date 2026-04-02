-- =============================================================================
-- Chisco Multi-Local Seed — RestoOS
-- Grupo: Culuca Group (Chisco Jiménez + Xalo Muñiz)
-- 4 locales: Culuca Cociña-Bar, Taberna da Galera, Taberna da Tabacalera, Culuca Obrador
-- Basado en cartas reales (abril 2026)
-- =============================================================================
-- REQUISITO: ejecutar DESPUÉS de culuca_demo.sql
-- Tenant: aa000000-0000-0000-0000-000000000001 (Culuca Group)
-- Hotel 1: bb000000-0000-0000-0000-000000000001 (Culuca Cociña-Bar) — ya existe

-- ─── NUEVOS LOCALES ──────────────────────────────────────────────────────────

INSERT INTO hotels (id, tenant_id, name, slug, timezone, currency) VALUES
  ('bb000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', 'Taberna da Galera', 'taberna-galera', 'Europe/Madrid', 'EUR'),
  ('bb000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001', 'Taberna da Tabacalera', 'taberna-tabacalera', 'Europe/Madrid', 'EUR'),
  ('bb000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000001', 'Culuca Obrador', 'culuca-obrador', 'Europe/Madrid', 'EUR')
ON CONFLICT (id) DO NOTHING;

-- ─── MEMBERSHIPS (Chisco en los 4 locales) ──────────────────────────────────

INSERT INTO memberships (user_id, hotel_id, tenant_id, role, is_active, is_default) VALUES
  ('cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', 'direction', true, false),
  ('cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000001', 'direction', true, false),
  ('cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000001', 'direction', true, false)
ON CONFLICT (user_id, hotel_id) DO NOTHING;

-- ─── UNIDADES DE MEDIDA (por local) ─────────────────────────────────────────

INSERT INTO units_of_measure (id, hotel_id, name, abbreviation, unit_type, is_base, conversion_factor) VALUES
  -- Taberna da Galera
  ('40000000-aaaa-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Kilogramo', 'kg', 'weight', true, 1),
  ('40000000-aaaa-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Gramo', 'g', 'weight', false, 0.001),
  ('40000000-aaaa-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', 'Litro', 'L', 'volume', true, 1),
  ('40000000-aaaa-0002-0000-000000000004', 'bb000000-0000-0000-0000-000000000002', 'Mililitro', 'mL', 'volume', false, 0.001),
  ('40000000-aaaa-0002-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', 'Unidad', 'ud', 'unit', true, 1),
  -- Taberna da Tabacalera
  ('40000000-aaaa-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Kilogramo', 'kg', 'weight', true, 1),
  ('40000000-aaaa-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Gramo', 'g', 'weight', false, 0.001),
  ('40000000-aaaa-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'Litro', 'L', 'volume', true, 1),
  ('40000000-aaaa-0003-0000-000000000004', 'bb000000-0000-0000-0000-000000000003', 'Mililitro', 'mL', 'volume', false, 0.001),
  ('40000000-aaaa-0003-0000-000000000005', 'bb000000-0000-0000-0000-000000000003', 'Unidad', 'ud', 'unit', true, 1),
  -- Culuca Obrador
  ('40000000-aaaa-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Kilogramo', 'kg', 'weight', true, 1),
  ('40000000-aaaa-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Gramo', 'g', 'weight', false, 0.001),
  ('40000000-aaaa-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Litro', 'L', 'volume', true, 1),
  ('40000000-aaaa-0004-0000-000000000004', 'bb000000-0000-0000-0000-000000000004', 'Mililitro', 'mL', 'volume', false, 0.001),
  ('40000000-aaaa-0004-0000-000000000005', 'bb000000-0000-0000-0000-000000000004', 'Unidad', 'ud', 'unit', true, 1)
ON CONFLICT (id) DO NOTHING;

-- ─── CATEGORÍAS ─────────────────────────────────────────────────────────────

INSERT INTO categories (id, hotel_id, name, parent_id, sort_order) VALUES
  -- Taberna da Galera
  ('10000000-cccc-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Carnes', null, 1),
  ('10000000-cccc-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Pescados y Mariscos', null, 2),
  ('10000000-cccc-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', 'Verduras y Hortalizas', null, 3),
  ('10000000-cccc-0002-0000-000000000004', 'bb000000-0000-0000-0000-000000000002', 'Lácteos y Quesos', null, 4),
  ('10000000-cccc-0002-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', 'Secos y Conservas', null, 5),
  ('10000000-cccc-0002-0000-000000000006', 'bb000000-0000-0000-0000-000000000002', 'Bebidas', null, 6),
  -- Taberna da Tabacalera
  ('10000000-cccc-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Carnes', null, 1),
  ('10000000-cccc-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Pescados y Mariscos', null, 2),
  ('10000000-cccc-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'Verduras y Hortalizas', null, 3),
  ('10000000-cccc-0003-0000-000000000004', 'bb000000-0000-0000-0000-000000000003', 'Lácteos y Quesos', null, 4),
  ('10000000-cccc-0003-0000-000000000005', 'bb000000-0000-0000-0000-000000000003', 'Secos y Conservas', null, 5),
  ('10000000-cccc-0003-0000-000000000006', 'bb000000-0000-0000-0000-000000000003', 'Bebidas', null, 6),
  -- Culuca Obrador
  ('10000000-cccc-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Carnes y Casquería', null, 1),
  ('10000000-cccc-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Materias Primas', null, 2),
  ('10000000-cccc-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Producto Terminado', null, 3)
ON CONFLICT (id) DO NOTHING;

-- ─── PROVEEDORES ────────────────────────────────────────────────────────────

INSERT INTO suppliers (id, hotel_id, name, contact_name, email, phone, address, notes, is_active) VALUES
  -- Galera
  ('20000000-bbbb-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Pescadería O Porto', 'Manuel', 'info@oporto.es', '+34981111001', 'Mercado San Agustín', 'Marisco y pescado de ría', true),
  ('20000000-bbbb-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Carnicería Rial', 'Roberto', 'pedidos@rial.es', '+34981111002', 'Plaza de Lugo', null, true),
  ('20000000-bbbb-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', 'Distribuciones Gallaecia', 'Ana', 'ana@gallaecia.es', '+34981111005', 'Pol. Agrela', 'Aceites, secos y conservas', true),
  ('20000000-bbbb-0002-0000-000000000004', 'bb000000-0000-0000-0000-000000000002', 'Lácteos do Campo', 'Pedro', 'pedidos@lacteoscampo.es', '+34981111004', 'Betanzos', 'Quesos gallegos', true),
  -- Tabacalera
  ('20000000-bbbb-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Pescadería O Porto', 'Manuel', 'info@oporto.es', '+34981111001', 'Mercado San Agustín', null, true),
  ('20000000-bbbb-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Carnicería Rial', 'Roberto', 'pedidos@rial.es', '+34981111002', 'Plaza de Lugo', 'Proveedor principal carnes y brasa', true),
  ('20000000-bbbb-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'Distribuciones Gallaecia', 'Ana', 'ana@gallaecia.es', '+34981111005', 'Pol. Agrela', null, true),
  -- Obrador
  ('20000000-bbbb-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Carnicería Rial', 'Roberto', 'pedidos@rial.es', '+34981111002', 'Plaza de Lugo', 'Callos, morros, pollo', true),
  ('20000000-bbbb-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Distribuciones Gallaecia', 'Ana', 'ana@gallaecia.es', '+34981111005', 'Pol. Agrela', 'Harinas, aceite, pan rallado', true),
  ('20000000-bbbb-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Lácteos do Campo', 'Pedro', 'pedidos@lacteoscampo.es', '+34981111004', 'Betanzos', 'Leche y nata para bechamel', true)
ON CONFLICT (id) DO NOTHING;

-- ─── PRODUCTOS ──────────────────────────────────────────────────────────────
-- Productos clave por local, basados en las cartas reales

-- Taberna da Galera (tapeo gallego + fusión)
INSERT INTO products (id, hotel_id, name, category_id, default_unit_id, is_active, allergens, notes) VALUES
  ('30000000-cccc-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Pulpo fresco de ría', '10000000-cccc-0002-0000-000000000002', '40000000-aaaa-0002-0000-000000000001', true, '["moluscos"]', 'Pulpo á plancha'),
  ('30000000-cccc-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Mejillón gallego', '10000000-cccc-0002-0000-000000000002', '40000000-aaaa-0002-0000-000000000001', true, '["moluscos"]', 'Al vapor o en escabeche'),
  ('30000000-cccc-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', 'Calamar de potera', '10000000-cccc-0002-0000-000000000002', '40000000-aaaa-0002-0000-000000000001', true, '["moluscos"]', 'Frito con alioli mojo verde'),
  ('30000000-cccc-0002-0000-000000000004', 'bb000000-0000-0000-0000-000000000002', 'Vieira del Pacífico', '10000000-cccc-0002-0000-000000000002', '40000000-aaaa-0002-0000-000000000005', true, '["moluscos"]', 'A la plancha'),
  ('30000000-cccc-0002-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', 'Rabo de ternera', '10000000-cccc-0002-0000-000000000001', '40000000-aaaa-0002-0000-000000000001', true, '[]', 'Estofado'),
  ('30000000-cccc-0002-0000-000000000006', 'bb000000-0000-0000-0000-000000000002', 'Lomo de cerdo (raxo)', '10000000-cccc-0002-0000-000000000001', '40000000-aaaa-0002-0000-000000000001', true, '[]', 'Macerado con ajo'),
  ('30000000-cccc-0002-0000-000000000007', 'bb000000-0000-0000-0000-000000000002', 'Ternera gallega (cachopo)', '10000000-cccc-0002-0000-000000000001', '40000000-aaaa-0002-0000-000000000001', true, '[]', 'Para cachopo, filetitos'),
  ('30000000-cccc-0002-0000-000000000008', 'bb000000-0000-0000-0000-000000000002', 'Queso del País Amalia', '10000000-cccc-0002-0000-000000000004', '40000000-aaaa-0002-0000-000000000001', true, '["lacteos"]', 'Tabla de quesos'),
  ('30000000-cccc-0002-0000-000000000009', 'bb000000-0000-0000-0000-000000000002', 'Aceite oliva Isbilya', '10000000-cccc-0002-0000-000000000005', '40000000-aaaa-0002-0000-000000000003', true, '[]', 'AOVE para cocina y sala'),
  ('30000000-cccc-0002-0000-000000000010', 'bb000000-0000-0000-0000-000000000002', 'Patata gallega', '10000000-cccc-0002-0000-000000000003', '40000000-aaaa-0002-0000-000000000001', true, '[]', 'Tortilla Betanzos + guarnición'),
  ('30000000-cccc-0002-0000-000000000011', 'bb000000-0000-0000-0000-000000000002', 'Huevo fresco', '10000000-cccc-0002-0000-000000000005', '40000000-aaaa-0002-0000-000000000005', true, '["huevos"]', 'Tortilla + empanados'),
  ('30000000-cccc-0002-0000-000000000012', 'bb000000-0000-0000-0000-000000000002', 'Jurel fresco', '10000000-cccc-0002-0000-000000000002', '40000000-aaaa-0002-0000-000000000001', true, '["pescado"]', 'Marinado con pico de gallo')
ON CONFLICT (id) DO NOTHING;

-- Taberna da Tabacalera (asador + brasa)
INSERT INTO products (id, hotel_id, name, category_id, default_unit_id, is_active, allergens, notes) VALUES
  ('30000000-cccc-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Chuletón vaca gallega', '10000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', true, '[]', '70€/kg en carta'),
  ('30000000-cccc-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Croca ternera gallega', '10000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'Filetitos a la plancha'),
  ('30000000-cccc-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'Mollejas de ternera', '10000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'A la brasa'),
  ('30000000-cccc-0003-0000-000000000004', 'bb000000-0000-0000-0000-000000000003', 'Chorizo rojo', '10000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'Brasa, 6€ en carta'),
  ('30000000-cccc-0003-0000-000000000005', 'bb000000-0000-0000-0000-000000000003', 'Torreznos', '10000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'A la brasa'),
  ('30000000-cccc-0003-0000-000000000006', 'bb000000-0000-0000-0000-000000000003', 'Bacalao lomo', '10000000-cccc-0003-0000-000000000002', '40000000-aaaa-0003-0000-000000000001', true, '["pescado"]', 'A la brasa con puré'),
  ('30000000-cccc-0003-0000-000000000007', 'bb000000-0000-0000-0000-000000000003', 'Pulpo', '10000000-cccc-0003-0000-000000000002', '40000000-aaaa-0003-0000-000000000001', true, '["moluscos"]', 'A la brasa'),
  ('30000000-cccc-0003-0000-000000000008', 'bb000000-0000-0000-0000-000000000003', 'Calamar de potera', '10000000-cccc-0003-0000-000000000002', '40000000-aaaa-0003-0000-000000000001', true, '["moluscos"]', 'Frito con ensalada'),
  ('30000000-cccc-0003-0000-000000000009', 'bb000000-0000-0000-0000-000000000003', 'Patata gallega', '10000000-cccc-0003-0000-000000000003', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'Tortilla Betanzos + patatas fritas'),
  ('30000000-cccc-0003-0000-000000000010', 'bb000000-0000-0000-0000-000000000003', 'Aceite oliva Isbilya', '10000000-cccc-0003-0000-000000000005', '40000000-aaaa-0003-0000-000000000003', true, '[]', null),
  ('30000000-cccc-0003-0000-000000000011', 'bb000000-0000-0000-0000-000000000003', 'Huevo fresco', '10000000-cccc-0003-0000-000000000005', '40000000-aaaa-0003-0000-000000000005', true, '["huevos"]', 'Tortilla + empanados'),
  ('30000000-cccc-0003-0000-000000000012', 'bb000000-0000-0000-0000-000000000003', 'Carbón vegetal', '10000000-cccc-0003-0000-000000000005', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'Para brasa'),
  ('30000000-cccc-0003-0000-000000000013', 'bb000000-0000-0000-0000-000000000003', 'Lomo cerdo (raxo)', '10000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', true, '[]', 'Macerado ajo')
ON CONFLICT (id) DO NOTHING;

-- Culuca Obrador (producción centralizada → distribuye a los 3 locales)
INSERT INTO products (id, hotel_id, name, category_id, default_unit_id, is_active, allergens, notes) VALUES
  ('30000000-cccc-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Callos de ternera (crudo)', '10000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', true, '[]', 'Materia prima'),
  ('30000000-cccc-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Morro de ternera', '10000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', true, '[]', 'Para callos'),
  ('30000000-cccc-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Garbanzos', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000001', true, '[]', 'Para callos'),
  ('30000000-cccc-0004-0000-000000000004', 'bb000000-0000-0000-0000-000000000004', 'Chorizo para cocido', '10000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', true, '[]', null),
  ('30000000-cccc-0004-0000-000000000005', 'bb000000-0000-0000-0000-000000000004', 'Leche entera', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000003', true, '["lacteos"]', 'Bechamel croquetas'),
  ('30000000-cccc-0004-0000-000000000006', 'bb000000-0000-0000-0000-000000000004', 'Harina de trigo', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000001', true, '["gluten"]', 'Bechamel'),
  ('30000000-cccc-0004-0000-000000000007', 'bb000000-0000-0000-0000-000000000004', 'Mantequilla', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000001', true, '["lacteos"]', 'Bechamel'),
  ('30000000-cccc-0004-0000-000000000008', 'bb000000-0000-0000-0000-000000000004', 'Jamón ibérico picado', '10000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', true, '[]', 'Croquetas de jamón'),
  ('30000000-cccc-0004-0000-000000000009', 'bb000000-0000-0000-0000-000000000004', 'Pan rallado', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000001', true, '["gluten"]', 'Empanado'),
  ('30000000-cccc-0004-0000-000000000010', 'bb000000-0000-0000-0000-000000000004', 'Huevo fresco', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000005', true, '["huevos"]', 'Empanado'),
  ('30000000-cccc-0004-0000-000000000011', 'bb000000-0000-0000-0000-000000000004', 'Pollo asado (desmigar)', '10000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', true, '[]', 'Para croquetas Culuca'),
  ('30000000-cccc-0004-0000-000000000012', 'bb000000-0000-0000-0000-000000000004', 'Aceite oliva', '10000000-cccc-0004-0000-000000000002', '40000000-aaaa-0004-0000-000000000003', true, '[]', 'Para freír')
ON CONFLICT (id) DO NOTHING;

-- ─── SUPPLIER OFFERS (MISMO PRODUCTO, DIFERENTE PRECIO → el dolor) ──────────

INSERT INTO supplier_offers (id, hotel_id, supplier_id, product_id, unit_id, price, is_preferred) VALUES
  -- Aceite oliva: Culuca 4.50, Galera 4.80, Tabacalera 5.20, Obrador 4.50
  -- (Culuca ya tiene en culuca_demo.sql)
  ('60000000-ffff-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', '20000000-bbbb-0002-0000-000000000003', '30000000-cccc-0002-0000-000000000009', '40000000-aaaa-0002-0000-000000000003', 4.80, true),
  ('60000000-ffff-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', '20000000-bbbb-0003-0000-000000000003', '30000000-cccc-0003-0000-000000000010', '40000000-aaaa-0003-0000-000000000003', 5.20, true),
  ('60000000-ffff-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', '20000000-bbbb-0004-0000-000000000002', '30000000-cccc-0004-0000-000000000012', '40000000-aaaa-0004-0000-000000000003', 4.50, true),

  -- Patata gallega: Culuca 1.10, Galera 1.40, Tabacalera 1.40
  ('60000000-ffff-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', '20000000-bbbb-0002-0000-000000000003', '30000000-cccc-0002-0000-000000000010', '40000000-aaaa-0002-0000-000000000001', 1.40, true),
  ('60000000-ffff-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', '20000000-bbbb-0003-0000-000000000003', '30000000-cccc-0003-0000-000000000009', '40000000-aaaa-0003-0000-000000000001', 1.40, true),

  -- Huevo fresco: Galera 0.22, Tabacalera 0.20, Obrador 0.18
  ('60000000-ffff-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', '20000000-bbbb-0002-0000-000000000003', '30000000-cccc-0002-0000-000000000011', '40000000-aaaa-0002-0000-000000000005', 0.22, true),
  ('60000000-ffff-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', '20000000-bbbb-0003-0000-000000000003', '30000000-cccc-0003-0000-000000000011', '40000000-aaaa-0003-0000-000000000005', 0.20, true),
  ('60000000-ffff-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', '20000000-bbbb-0004-0000-000000000002', '30000000-cccc-0004-0000-000000000010', '40000000-aaaa-0004-0000-000000000005', 0.18, true),

  -- Pulpo: Galera 14.00, Tabacalera 15.50
  ('60000000-ffff-0002-0000-000000000004', 'bb000000-0000-0000-0000-000000000002', '20000000-bbbb-0002-0000-000000000001', '30000000-cccc-0002-0000-000000000001', '40000000-aaaa-0002-0000-000000000001', 14.00, true),
  ('60000000-ffff-0003-0000-000000000004', 'bb000000-0000-0000-0000-000000000003', '20000000-bbbb-0003-0000-000000000001', '30000000-cccc-0003-0000-000000000007', '40000000-aaaa-0003-0000-000000000001', 15.50, true),

  -- Calamar: Galera 12.00, Tabacalera 13.20
  ('60000000-ffff-0002-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', '20000000-bbbb-0002-0000-000000000001', '30000000-cccc-0002-0000-000000000003', '40000000-aaaa-0002-0000-000000000001', 12.00, true),
  ('60000000-ffff-0003-0000-000000000005', 'bb000000-0000-0000-0000-000000000003', '20000000-bbbb-0003-0000-000000000001', '30000000-cccc-0003-0000-000000000008', '40000000-aaaa-0003-0000-000000000001', 13.20, true),

  -- Leche entera Obrador 1.10
  ('60000000-ffff-0004-0000-000000000005', 'bb000000-0000-0000-0000-000000000004', '20000000-bbbb-0004-0000-000000000003', '30000000-cccc-0004-0000-000000000005', '40000000-aaaa-0004-0000-000000000003', 1.10, true),
  -- Harina Obrador 0.85
  ('60000000-ffff-0004-0000-000000000006', 'bb000000-0000-0000-0000-000000000004', '20000000-bbbb-0004-0000-000000000002', '30000000-cccc-0004-0000-000000000006', '40000000-aaaa-0004-0000-000000000001', 0.85, true),
  -- Jamón ibérico picado Obrador 42.00
  ('60000000-ffff-0004-0000-000000000007', 'bb000000-0000-0000-0000-000000000004', '20000000-bbbb-0004-0000-000000000001', '30000000-cccc-0004-0000-000000000008', '40000000-aaaa-0004-0000-000000000001', 42.00, true),
  -- Callos crudo Obrador 8.50
  ('60000000-ffff-0004-0000-000000000008', 'bb000000-0000-0000-0000-000000000004', '20000000-bbbb-0004-0000-000000000001', '30000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', 8.50, true),
  -- Chuletón Tabacalera 38.00/kg
  ('60000000-ffff-0003-0000-000000000006', 'bb000000-0000-0000-0000-000000000003', '20000000-bbbb-0003-0000-000000000002', '30000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', 38.00, true),
  -- Raxo cerdo: Galera 7.50, Tabacalera 8.20
  ('60000000-ffff-0002-0000-000000000006', 'bb000000-0000-0000-0000-000000000002', '20000000-bbbb-0002-0000-000000000002', '30000000-cccc-0002-0000-000000000006', '40000000-aaaa-0002-0000-000000000001', 7.50, true),
  ('60000000-ffff-0003-0000-000000000007', 'bb000000-0000-0000-0000-000000000003', '20000000-bbbb-0003-0000-000000000002', '30000000-cccc-0003-0000-000000000013', '40000000-aaaa-0003-0000-000000000001', 8.20, true)
ON CONFLICT (id) DO NOTHING;

-- ─── RECETAS (basadas en cartas reales) ─────────────────────────────────────

INSERT INTO recipes (id, hotel_id, name, description, category, servings, status, total_cost, cost_per_serving) VALUES
  -- Obrador: producción batch (distribuye a los 3)
  ('50000000-eeee-0004-0000-000000000001', 'bb000000-0000-0000-0000-000000000004', 'Callos de Culuca', 'Receta tradicional con garbanzos, chorizo y morro. Batch 50 raciones.', 'Producción', 50, 'approved', 140.00, 2.80),
  ('50000000-eeee-0004-0000-000000000002', 'bb000000-0000-0000-0000-000000000004', 'Croquetas de jamón ibérico', 'Bechamel casera con jamón ibérico, empanadas. Batch 100 uds.', 'Producción', 100, 'approved', 45.00, 0.45),
  ('50000000-eeee-0004-0000-000000000003', 'bb000000-0000-0000-0000-000000000004', 'Croquetas de pollo asado', 'Bechamel con pollo desmigado. Batch 80 uds. (Croquetas Culuca)', 'Producción', 80, 'approved', 33.60, 0.42),

  -- Galera: platos propios (carta real)
  ('50000000-eeee-0002-0000-000000000001', 'bb000000-0000-0000-0000-000000000002', 'Pulpo á plancha', 'Con puré de patata, pimentón y aceite Isbilya', 'Mar', 1, 'approved', 8.40, 8.40),
  ('50000000-eeee-0002-0000-000000000002', 'bb000000-0000-0000-0000-000000000002', 'Tortilla estilo Betanzos', 'Patata gallega, huevo fresco, cebolla. Poco hecha.', 'Raciones', 8, 'approved', 6.40, 0.80),
  ('50000000-eeee-0002-0000-000000000003', 'bb000000-0000-0000-0000-000000000002', 'Cachopo de la Taberna', 'Ternera gallega, jamón, queso del país, alioli casero', 'Raciones', 1, 'approved', 9.50, 9.50),
  ('50000000-eeee-0002-0000-000000000004', 'bb000000-0000-0000-0000-000000000002', 'Calamar frito con alioli mojo verde', 'Calamar de potera rebozado', 'Mar', 1, 'approved', 5.80, 5.80),
  ('50000000-eeee-0002-0000-000000000005', 'bb000000-0000-0000-0000-000000000002', 'Raxo de cerdo', 'Lomo macerado con ajo, patatas fritas', 'Raciones', 1, 'approved', 4.20, 4.20),
  ('50000000-eeee-0002-0000-000000000006', 'bb000000-0000-0000-0000-000000000002', 'Rabo estofado', 'Con puré de boniato', 'Raciones', 1, 'approved', 6.80, 6.80),

  -- Tabacalera: platos propios (carta real, brasa)
  ('50000000-eeee-0003-0000-000000000001', 'bb000000-0000-0000-0000-000000000003', 'Chuletón vaca gallega', 'A la brasa, 1kg aprox, sal Maldon', 'A la brasa', 2, 'approved', 38.00, 19.00),
  ('50000000-eeee-0003-0000-000000000002', 'bb000000-0000-0000-0000-000000000003', 'Tortilla estilo Betanzos', 'Patata gallega, huevo, poco hecha', 'Los clásicos', 8, 'approved', 5.60, 0.70),
  ('50000000-eeee-0003-0000-000000000003', 'bb000000-0000-0000-0000-000000000003', 'Raxo de cerdo', 'Lomo macerado con ajo', 'Los clásicos', 1, 'approved', 4.60, 4.60),
  ('50000000-eeee-0003-0000-000000000004', 'bb000000-0000-0000-0000-000000000003', 'Pulpo a la brasa', 'Con puré de patata', 'Mar', 1, 'approved', 9.30, 9.30),
  ('50000000-eeee-0003-0000-000000000005', 'bb000000-0000-0000-0000-000000000003', 'Bacalao a la brasa', 'Con puré y pimiento asado', 'Mar', 1, 'approved', 7.80, 7.80),
  ('50000000-eeee-0003-0000-000000000006', 'bb000000-0000-0000-0000-000000000003', 'Mollejas a la brasa', 'Mollejas de ternera', 'A la brasa', 1, 'approved', 5.20, 5.20)
ON CONFLICT (id) DO NOTHING;

-- ─── STOCK LOTS (inventario actual) ─────────────────────────────────────────

INSERT INTO stock_lots (hotel_id, product_id, unit_id, lot_number, initial_quantity, current_quantity, unit_cost, expiry_date) VALUES
  -- Galera
  ('bb000000-0000-0000-0000-000000000002', '30000000-cccc-0002-0000-000000000001', '40000000-aaaa-0002-0000-000000000001', 'GAL-PUL-001', 8, 5, 14.00, '2026-04-04'),
  ('bb000000-0000-0000-0000-000000000002', '30000000-cccc-0002-0000-000000000003', '40000000-aaaa-0002-0000-000000000001', 'GAL-CAL-001', 6, 4, 12.00, '2026-04-05'),
  ('bb000000-0000-0000-0000-000000000002', '30000000-cccc-0002-0000-000000000009', '40000000-aaaa-0002-0000-000000000003', 'GAL-ACE-001', 10, 7, 4.80, '2027-03-01'),
  ('bb000000-0000-0000-0000-000000000002', '30000000-cccc-0002-0000-000000000010', '40000000-aaaa-0002-0000-000000000001', 'GAL-PAT-001', 30, 18, 1.40, '2026-04-15'),
  -- Tabacalera
  ('bb000000-0000-0000-0000-000000000003', '30000000-cccc-0003-0000-000000000001', '40000000-aaaa-0003-0000-000000000001', 'TAB-CHU-001', 15, 8, 38.00, '2026-04-05'),
  ('bb000000-0000-0000-0000-000000000003', '30000000-cccc-0003-0000-000000000002', '40000000-aaaa-0003-0000-000000000001', 'TAB-CRO-001', 10, 6, 18.50, '2026-04-06'),
  ('bb000000-0000-0000-0000-000000000003', '30000000-cccc-0003-0000-000000000009', '40000000-aaaa-0003-0000-000000000001', 'TAB-PAT-001', 25, 18, 1.40, '2026-04-15'),
  ('bb000000-0000-0000-0000-000000000003', '30000000-cccc-0003-0000-000000000010', '40000000-aaaa-0003-0000-000000000003', 'TAB-ACE-001', 8, 5, 5.20, '2027-03-01'),
  ('bb000000-0000-0000-0000-000000000003', '30000000-cccc-0003-0000-000000000012', '40000000-aaaa-0003-0000-000000000001', 'TAB-CAR-001', 50, 35, 2.80, '2027-06-01'),
  -- Obrador
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000001', '40000000-aaaa-0004-0000-000000000001', 'OBR-CAL-001', 30, 22, 8.50, '2026-04-10'),
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000005', '40000000-aaaa-0004-0000-000000000003', 'OBR-LEC-001', 20, 14, 1.10, '2026-04-08'),
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000006', '40000000-aaaa-0004-0000-000000000001', 'OBR-HAR-001', 25, 20, 0.85, '2026-12-01'),
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000008', '40000000-aaaa-0004-0000-000000000001', 'OBR-JAM-001', 5, 3, 42.00, '2026-06-01'),
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000009', '40000000-aaaa-0004-0000-000000000001', 'OBR-PAN-001', 15, 12, 1.20, '2026-12-01'),
  ('bb000000-0000-0000-0000-000000000004', '30000000-cccc-0004-0000-000000000011', '40000000-aaaa-0004-0000-000000000001', 'OBR-POL-001', 10, 7, 5.80, '2026-04-06')
ON CONFLICT DO NOTHING;

-- ─── APPCC TEMPLATES (para los 3 nuevos locales) ────────────────────────────

INSERT INTO check_templates (hotel_id, name, check_type, frequency, description, min_value, max_value, unit, sort_order, is_active) VALUES
  -- Galera: 8 controles
  ('bb000000-0000-0000-0000-000000000002', 'Cámara frigorífica', 'temperatura', 'diario', 'Conservación pescado y marisco', 0, 5, '°C', 1, true),
  ('bb000000-0000-0000-0000-000000000002', 'Congelador', 'temperatura', 'diario', 'Congelador principal', -25, -18, '°C', 2, true),
  ('bb000000-0000-0000-0000-000000000002', 'Aceite fritura', 'aceite_fritura', 'diario', 'Compuestos polares', null, 25, '%', 3, true),
  ('bb000000-0000-0000-0000-000000000002', 'Limpieza superficies', 'limpieza', 'diario', 'Desinfección superficies de trabajo', null, null, null, 10, true),
  ('bb000000-0000-0000-0000-000000000002', 'Limpieza suelos', 'limpieza', 'diario', 'Fregado cocina', null, null, null, 11, true),
  ('bb000000-0000-0000-0000-000000000002', 'Control recepción', 'recepcion', 'por_recepcion', 'Temp. y estado organoléptico marisco', null, 8, '°C', 20, true),
  ('bb000000-0000-0000-0000-000000000002', 'Limpieza campana', 'limpieza', 'semanal', 'Desengrase campana', null, null, null, 30, true),
  ('bb000000-0000-0000-0000-000000000002', 'Calibración termómetros', 'otro', 'mensual', 'Verificación 0°C y 100°C', null, null, null, 40, true),

  -- Tabacalera: 9 controles (brasa = más controles de temp)
  ('bb000000-0000-0000-0000-000000000003', 'Cámara frigorífica', 'temperatura', 'diario', 'Cámara carnes', 0, 4, '°C', 1, true),
  ('bb000000-0000-0000-0000-000000000003', 'Congelador', 'temperatura', 'diario', 'Congelador', -25, -18, '°C', 2, true),
  ('bb000000-0000-0000-0000-000000000003', 'Temp. centro carnes', 'temperatura', 'diario', 'Temp. interna carnes brasa (≥65°C)', 65, null, '°C', 3, true),
  ('bb000000-0000-0000-0000-000000000003', 'Temp. brasa/parrilla', 'temperatura', 'diario', 'Superficie parrilla', 200, 350, '°C', 4, true),
  ('bb000000-0000-0000-0000-000000000003', 'Limpieza parrilla', 'limpieza', 'diario', 'Cepillado y desinfección parrilla', null, null, null, 10, true),
  ('bb000000-0000-0000-0000-000000000003', 'Limpieza superficies', 'limpieza', 'diario', 'Desinfección zona brasa y cocina', null, null, null, 11, true),
  ('bb000000-0000-0000-0000-000000000003', 'Limpieza suelos', 'limpieza', 'diario', 'Fregado cocina', null, null, null, 12, true),
  ('bb000000-0000-0000-0000-000000000003', 'Control recepción carnes', 'recepcion', 'por_recepcion', 'Temp. y etiquetado carnes', null, 7, '°C', 20, true),
  ('bb000000-0000-0000-0000-000000000003', 'Control carbón', 'otro', 'semanal', 'Estado almacenamiento carbón vegetal', null, null, null, 30, true),

  -- Obrador: 7 controles (producción centralizada)
  ('bb000000-0000-0000-0000-000000000004', 'Cámara frigorífica', 'temperatura', 'diario', 'Cámara materia prima', 0, 5, '°C', 1, true),
  ('bb000000-0000-0000-0000-000000000004', 'Congelador producto terminado', 'temperatura', 'diario', 'Congelador croquetas', -25, -18, '°C', 2, true),
  ('bb000000-0000-0000-0000-000000000004', 'Temp. cocción callos', 'temperatura', 'diario', 'Centro del guiso (≥75°C)', 75, null, '°C', 3, true),
  ('bb000000-0000-0000-0000-000000000004', 'Temp. enfriamiento rápido', 'temperatura', 'diario', 'De 65°C a 10°C en <2h', null, 10, '°C', 4, true),
  ('bb000000-0000-0000-0000-000000000004', 'Limpieza obrador', 'limpieza', 'diario', 'Superficies, maquinaria, suelos', null, null, null, 10, true),
  ('bb000000-0000-0000-0000-000000000004', 'Higiene personal', 'higiene_personal', 'diario', 'Uniformes, manos, gorros', null, null, null, 11, true),
  ('bb000000-0000-0000-0000-000000000004', 'Trazabilidad lotes', 'otro', 'diario', 'Etiquetado batch con fecha y lote', null, null, null, 12, true)
ON CONFLICT DO NOTHING;
