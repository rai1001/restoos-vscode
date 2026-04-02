-- =============================================================================
-- Stock Transfer RPCs
-- =============================================================================

-- 1. CREATE TRANSFER
-- Crea una transferencia de un hotel a otro dentro del mismo tenant
CREATE OR REPLACE FUNCTION create_stock_transfer(
  p_origin_hotel_id     UUID,
  p_destination_hotel_id UUID,
  p_lines               JSONB,    -- [{product_name, origin_product_id, origin_lot_id, unit, quantity, unit_cost}]
  p_notes               TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_tenant_id     UUID;
  v_transfer_id   UUID;
  v_transfer_num  TEXT;
  v_line          JSONB;
  v_lot           stock_lots%ROWTYPE;
BEGIN
  -- Verify user has access to origin
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND hotel_id = p_origin_hotel_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  -- Verify both hotels belong to same tenant
  SELECT h1.tenant_id INTO v_tenant_id
  FROM hotels h1, hotels h2
  WHERE h1.id = p_origin_hotel_id AND h2.id = p_destination_hotel_id
    AND h1.tenant_id = h2.tenant_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Hotels must belong to the same tenant';
  END IF;

  v_transfer_num := 'TR-' || to_char(now(), 'YYYYMMDD-HH24MISS');

  -- Create transfer header
  INSERT INTO stock_transfers (
    tenant_id, origin_hotel_id, destination_hotel_id,
    transfer_number, status, notes, created_by
  ) VALUES (
    v_tenant_id, p_origin_hotel_id, p_destination_hotel_id,
    v_transfer_num, 'draft', p_notes, v_user_id
  ) RETURNING id INTO v_transfer_id;

  -- Create lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO stock_transfer_lines (
      transfer_id, product_name, origin_product_id, origin_lot_id,
      unit, quantity_sent, unit_cost, notes
    ) VALUES (
      v_transfer_id,
      v_line->>'product_name',
      (v_line->>'origin_product_id')::UUID,
      (v_line->>'origin_lot_id')::UUID,
      v_line->>'unit',
      (v_line->>'quantity')::NUMERIC,
      (v_line->>'unit_cost')::NUMERIC,
      v_line->>'notes'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_num,
    'status', 'draft'
  );
END;
$$;

-- 2. CONFIRM TRANSFER (origin confirms, deducts stock)
CREATE OR REPLACE FUNCTION confirm_stock_transfer(
  p_transfer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_transfer   stock_transfers%ROWTYPE;
  v_line       stock_transfer_lines%ROWTYPE;
  v_lot        stock_lots%ROWTYPE;
BEGIN
  SELECT * INTO v_transfer FROM stock_transfers WHERE id = p_transfer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_transfer.status != 'draft' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;

  -- Verify user has access to origin
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND hotel_id = v_transfer.origin_hotel_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  -- Deduct stock from origin for each line
  FOR v_line IN SELECT * FROM stock_transfer_lines WHERE transfer_id = p_transfer_id
  LOOP
    IF v_line.origin_lot_id IS NOT NULL THEN
      SELECT * INTO v_lot FROM stock_lots WHERE id = v_line.origin_lot_id;
      IF v_lot.current_quantity < v_line.quantity_sent THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: % (need %, have %)',
          v_line.product_name, v_line.quantity_sent, v_lot.current_quantity;
      END IF;

      -- Deduct from lot
      UPDATE stock_lots SET current_quantity = current_quantity - v_line.quantity_sent
      WHERE id = v_line.origin_lot_id;

      -- Record outbound movement
      INSERT INTO stock_movements (
        hotel_id, product_id, lot_id, movement_type, quantity,
        unit_id, unit_cost, reference_type, reference_id, notes, created_by
      ) VALUES (
        v_transfer.origin_hotel_id, v_line.origin_product_id, v_line.origin_lot_id,
        'transfer', -v_line.quantity_sent,
        v_lot.unit_id, v_line.unit_cost,
        'stock_transfer', p_transfer_id,
        'Transferencia salida: ' || v_line.product_name || ' → ' ||
          (SELECT name FROM hotels WHERE id = v_transfer.destination_hotel_id),
        v_user_id
      );
    END IF;
  END LOOP;

  -- Update transfer status
  UPDATE stock_transfers SET
    status = 'confirmed',
    confirmed_by = v_user_id,
    confirmed_at = now()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object(
    'transfer_id', p_transfer_id,
    'status', 'confirmed'
  );
END;
$$;

-- 3. RECEIVE TRANSFER (destination receives, adds stock)
CREATE OR REPLACE FUNCTION receive_stock_transfer(
  p_transfer_id UUID,
  p_lines       JSONB DEFAULT NULL  -- [{line_id, quantity_received, dest_product_id}] (optional overrides)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_transfer   stock_transfers%ROWTYPE;
  v_line       stock_transfer_lines%ROWTYPE;
  v_dest_unit  UUID;
  v_lot_id     UUID;
  v_override   JSONB;
  v_qty_recv   NUMERIC;
  v_dest_prod  UUID;
BEGIN
  SELECT * INTO v_transfer FROM stock_transfers WHERE id = p_transfer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_transfer.status NOT IN ('confirmed', 'in_transit') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;

  -- Verify user has access to destination
  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = v_user_id AND hotel_id = v_transfer.destination_hotel_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  -- Get default unit for destination hotel (kg)
  SELECT id INTO v_dest_unit FROM units_of_measure
  WHERE hotel_id = v_transfer.destination_hotel_id AND is_base = true AND unit_type = 'weight'
  LIMIT 1;

  FOR v_line IN SELECT * FROM stock_transfer_lines WHERE transfer_id = p_transfer_id
  LOOP
    v_qty_recv := v_line.quantity_sent;  -- default: receive all
    v_dest_prod := v_line.dest_product_id;

    -- Check for override
    IF p_lines IS NOT NULL THEN
      SELECT l INTO v_override FROM jsonb_array_elements(p_lines) l
      WHERE (l->>'line_id')::UUID = v_line.id;
      IF v_override IS NOT NULL THEN
        v_qty_recv := COALESCE((v_override->>'quantity_received')::NUMERIC, v_line.quantity_sent);
        v_dest_prod := COALESCE((v_override->>'dest_product_id')::UUID, v_line.dest_product_id);
      END IF;
    END IF;

    -- Update received quantity
    UPDATE stock_transfer_lines SET
      quantity_received = v_qty_recv,
      dest_product_id = v_dest_prod
    WHERE id = v_line.id;

    -- Create stock lot at destination (if we have a destination product)
    IF v_dest_prod IS NOT NULL THEN
      INSERT INTO stock_lots (
        hotel_id, product_id, unit_id, lot_number,
        initial_quantity, current_quantity, unit_cost
      ) VALUES (
        v_transfer.destination_hotel_id, v_dest_prod,
        COALESCE(v_dest_unit, (SELECT default_unit_id FROM products WHERE id = v_dest_prod)),
        'TR-' || left(p_transfer_id::text, 8),
        v_qty_recv, v_qty_recv, v_line.unit_cost
      ) RETURNING id INTO v_lot_id;

      -- Record inbound movement
      INSERT INTO stock_movements (
        hotel_id, product_id, lot_id, movement_type, quantity,
        unit_id, unit_cost, reference_type, reference_id, notes, created_by
      ) VALUES (
        v_transfer.destination_hotel_id, v_dest_prod, v_lot_id,
        'transfer', v_qty_recv,
        COALESCE(v_dest_unit, (SELECT default_unit_id FROM products WHERE id = v_dest_prod)),
        v_line.unit_cost,
        'stock_transfer', p_transfer_id,
        'Transferencia entrada: ' || v_line.product_name || ' ← ' ||
          (SELECT name FROM hotels WHERE id = v_transfer.origin_hotel_id),
        v_user_id
      );
    END IF;
  END LOOP;

  -- Update transfer status
  UPDATE stock_transfers SET
    status = 'received',
    received_by = v_user_id,
    received_at = now()
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object(
    'transfer_id', p_transfer_id,
    'status', 'received'
  );
END;
$$;

-- Grants
REVOKE ALL ON FUNCTION create_stock_transfer FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_stock_transfer TO authenticated;
REVOKE ALL ON FUNCTION confirm_stock_transfer FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_stock_transfer TO authenticated;
REVOKE ALL ON FUNCTION receive_stock_transfer FROM PUBLIC;
GRANT EXECUTE ON FUNCTION receive_stock_transfer TO authenticated;
