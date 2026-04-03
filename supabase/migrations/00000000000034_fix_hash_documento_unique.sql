-- Fix duplicate document race condition: two concurrent uploads of the same file
-- could both pass the existence check and create separate invoice records.
-- Adding a UNIQUE constraint on (hotel_id, hash_documento) so the DB enforces it.

CREATE UNIQUE INDEX IF NOT EXISTS uq_facturas_recibidas_hash
  ON facturas_recibidas (hotel_id, hash_documento)
  WHERE hash_documento IS NOT NULL;
