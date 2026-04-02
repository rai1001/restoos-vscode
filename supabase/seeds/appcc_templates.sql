-- ============================================================
-- APPCC SEED: Plantillas de control estándar
-- Se insertan para el hotel de demo (Culuca Cociña-Bar)
-- ============================================================

-- El hotel_id debe coincidir con el seed de chisco_multilocal
-- hotel_id: bb000000-0000-0000-0000-000000000001 (Culuca Cociña-Bar)

INSERT INTO check_templates (hotel_id, name, check_type, frequency, description, min_value, max_value, unit, sort_order, is_active) VALUES
-- Temperaturas diarias
('bb000000-0000-0000-0000-000000000001', 'Cámara frigorífica #1', 'temperatura', 'diario', 'Temperatura interior cámara conservación', 0, 5, '°C', 1, true),
('bb000000-0000-0000-0000-000000000001', 'Cámara frigorífica #2', 'temperatura', 'diario', 'Temperatura interior cámara de carnes', 0, 4, '°C', 2, true),
('bb000000-0000-0000-0000-000000000001', 'Congelador', 'temperatura', 'diario', 'Temperatura congelador principal', -25, -18, '°C', 3, true),
('bb000000-0000-0000-0000-000000000001', 'Temperatura cocción carnes', 'temperatura', 'diario', 'Temperatura interna de carnes cocinadas (≥65°C)', 65, NULL, '°C', 4, true),

-- Limpiezas diarias
('bb000000-0000-0000-0000-000000000001', 'Limpieza superficies cocina', 'limpieza', 'diario', 'Desinfección de superficies de trabajo', NULL, NULL, NULL, 10, true),
('bb000000-0000-0000-0000-000000000001', 'Limpieza tablas de corte', 'limpieza', 'diario', 'Desinfección tablas de corte por colores', NULL, NULL, NULL, 11, true),
('bb000000-0000-0000-0000-000000000001', 'Limpieza suelos cocina', 'limpieza', 'diario', 'Fregado y desinfección de suelos', NULL, NULL, NULL, 12, true),

-- Controles diarios
('bb000000-0000-0000-0000-000000000001', 'Aceite de fritura', 'aceite_fritura', 'diario', 'Control compuestos polares aceite freidora', NULL, 25, '%', 20, true),

-- Limpiezas semanales
('bb000000-0000-0000-0000-000000000001', 'Limpieza campana extractora', 'limpieza', 'semanal', 'Limpieza y desengrase de campana', NULL, NULL, NULL, 30, true),
('bb000000-0000-0000-0000-000000000001', 'Limpieza interior cámaras', 'limpieza', 'semanal', 'Limpieza profunda interior de cámaras frigoríficas y estanterías', NULL, NULL, NULL, 31, true),
('bb000000-0000-0000-0000-000000000001', 'Limpieza freidoras', 'limpieza', 'semanal', 'Vaciado, limpieza profunda y cambio de aceite si necesario', NULL, NULL, NULL, 32, true),
('bb000000-0000-0000-0000-000000000001', 'Limpieza hornos', 'limpieza', 'semanal', 'Limpieza interior horno, bandejas y rejillas', NULL, NULL, NULL, 33, true),

-- Mensuales
('bb000000-0000-0000-0000-000000000001', 'Filtros campana extractora', 'limpieza', 'mensual', 'Desmontaje y limpieza de filtros de campana', NULL, NULL, NULL, 40, true),
('bb000000-0000-0000-0000-000000000001', 'Calibración termómetros', 'otro', 'mensual', 'Verificar calibración con agua helada (0°C) y ebullición (100°C)', NULL, NULL, NULL, 41, true),
('bb000000-0000-0000-0000-000000000001', 'Revisión trampas control plagas', 'control_plagas', 'mensual', 'Inspección visual de trampas y cebos', NULL, NULL, NULL, 42, true),

-- Por recepción
('bb000000-0000-0000-0000-000000000001', 'Control recepción proveedor', 'recepcion', 'por_recepcion', 'Verificación temperatura y estado organoléptico', NULL, 8, '°C', 50, true);
