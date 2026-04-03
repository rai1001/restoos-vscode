-- =============================================================================
-- Migration: Add 'linea_sin_conciliar' to discrepancias_clara check constraint
-- Fixes: OCR invoice lines without product_id were silently skipped by the
--        reconciler. Now they are flagged as unmatched discrepancies.
-- =============================================================================

ALTER TABLE discrepancias_clara
  DROP CONSTRAINT IF EXISTS discrepancias_clara_tipo_discrepancia_check;

ALTER TABLE discrepancias_clara
  ADD CONSTRAINT discrepancias_clara_tipo_discrepancia_check
  CHECK (tipo_discrepancia IN (
    'precio_incorrecto', 'cantidad_incorrecta', 'cargo_duplicado',
    'documento_faltante', 'proveedor_desconocido', 'linea_sin_conciliar'
  ));
