// CLARA — Modulo 3: Conciliacion facturas vs albaranes
// Logica pura — portable a Node.js

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ClaraDeps } from './clara_types.ts';
import { EstadoFactura, TipoDiscrepancia } from './clara_types.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Normalize a product name/description for fuzzy matching */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, ' ')      // non-alphanum → space
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface DiscrepanciaDetectada {
  tipo: TipoDiscrepancia;
  valorEsperado: string;
  valorRecibido: string;
  diferencia: number;
  receiptId: string | null;
}

export interface ReconcilerInput {
  hotelId: string;
  facturaId: string;
}

export interface ReconcilerOutput {
  facturaId: string;
  estado: EstadoFactura;
  discrepancias: DiscrepanciaDetectada[];
  discrepanciasInsertadas: number;
  documentosFaltantes: number;
  tokensInput: number;
  tokensOutput: number;
  error: string | null;
}

// ─── Main Logic ────────────────────────────────────────────────────────────

export async function runReconciler(
  input: ReconcilerInput,
  deps: ClaraDeps
): Promise<ReconcilerOutput> {
  const sb = deps.supabase as unknown as SupabaseClient;
  const discrepancias: DiscrepanciaDetectada[] = [];

  // ── Load factura with lines ────────────────────────────────────────────

  const { data: factura, error: fError } = await sb
    .from('facturas_recibidas')
    .select('*, supplier_id, numero_factura, fecha_factura, total')
    .eq('id', input.facturaId)
    .eq('hotel_id', input.hotelId)
    .single();

  if (fError || !factura) {
    return {
      facturaId: input.facturaId,
      estado: EstadoFactura.RevisionManual,
      discrepancias: [],
      discrepanciasInsertadas: 0,
      documentosFaltantes: 0,
      tokensInput: 0,
      tokensOutput: 0,
      error: `Factura no encontrada: ${fError?.message ?? 'not found'}`,
    };
  }

  const { data: lineas } = await sb
    .from('lineas_factura')
    .select('*')
    .eq('factura_id', input.facturaId)
    .eq('hotel_id', input.hotelId);

  // ── Check supplier exists ──────────────────────────────────────────────

  if (!factura.supplier_id) {
    discrepancias.push({
      tipo: TipoDiscrepancia.ProveedorDesconocido,
      valorEsperado: 'Proveedor registrado',
      valorRecibido: 'NIF no encontrado en sistema',
      diferencia: 0,
      receiptId: null,
    });

    // Insert discrepancy and mark for review
    await sb.from('discrepancias_clara').insert({
      hotel_id: input.hotelId,
      factura_id: input.facturaId,
      tipo_discrepancia: TipoDiscrepancia.ProveedorDesconocido,
      valor_esperado: 'Proveedor registrado',
      valor_recibido: 'NIF no encontrado en sistema',
      diferencia: 0,
    });

    await sb
      .from('facturas_recibidas')
      .update({ estado: EstadoFactura.RevisionManual, updated_at: new Date().toISOString() })
      .eq('id', input.facturaId)
      .eq('hotel_id', input.hotelId);

    return {
      facturaId: input.facturaId,
      estado: EstadoFactura.RevisionManual,
      discrepancias,
      discrepanciasInsertadas: 1,
      documentosFaltantes: 0,
      tokensInput: 0,
      tokensOutput: 0,
      error: null,
    };
  }

  // ── Check duplicate invoice number ─────────────────────────────────────

  if (factura.numero_factura) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: duplicates } = await sb
      .from('facturas_recibidas')
      .select('id')
      .eq('hotel_id', input.hotelId)
      .eq('numero_factura', factura.numero_factura)
      .neq('id', input.facturaId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (duplicates && duplicates.length > 0) {
      discrepancias.push({
        tipo: TipoDiscrepancia.CargoDuplicado,
        valorEsperado: 'Factura unica',
        valorRecibido: `Factura ${factura.numero_factura} duplicada (${duplicates.length} copia(s))`,
        diferencia: factura.total ?? 0,
        receiptId: null,
      });
    }
  }

  // ── Find matching goods receipts (albaranes) ───────────────────────────

  const fechaFactura = factura.fecha_factura
    ? new Date(factura.fecha_factura)
    : new Date();
  const rangoInicio = new Date(fechaFactura);
  rangoInicio.setDate(rangoInicio.getDate() - 7);
  const rangoFin = new Date(fechaFactura);
  rangoFin.setDate(rangoFin.getDate() + 7);

  // Find purchase orders from this supplier
  const { data: orders } = await sb
    .from('purchase_orders')
    .select('id')
    .eq('hotel_id', input.hotelId)
    .eq('supplier_id', factura.supplier_id);

  const orderIds = (orders ?? []).map((o: { id: string }) => o.id);

  if (orderIds.length === 0) {
    // No orders found — document missing
    await sb.from('documentos_faltantes').insert({
      hotel_id: input.hotelId,
      supplier_id: factura.supplier_id,
      tipo: 'albaran',
      fecha_esperada: factura.fecha_factura,
      referencia: factura.numero_factura,
    });

    discrepancias.push({
      tipo: TipoDiscrepancia.DocumentoFaltante,
      valorEsperado: 'Albaran correspondiente',
      valorRecibido: 'Sin pedidos del proveedor en el rango',
      diferencia: 0,
      receiptId: null,
    });
  } else {
    // Get receipts in date range for these orders
    const { data: receipts } = await sb
      .from('goods_receipts')
      .select('id, order_id, received_at')
      .in('order_id', orderIds)
      .gte('received_at', rangoInicio.toISOString())
      .lte('received_at', rangoFin.toISOString());

    if (!receipts || receipts.length === 0) {
      await sb.from('documentos_faltantes').insert({
        hotel_id: input.hotelId,
        supplier_id: factura.supplier_id,
        tipo: 'albaran',
        fecha_esperada: factura.fecha_factura,
        referencia: factura.numero_factura,
      });

      discrepancias.push({
        tipo: TipoDiscrepancia.DocumentoFaltante,
        valorEsperado: 'Albaran en rango +-7 dias',
        valorRecibido: 'No se encontraron albaranes',
        diferencia: 0,
        receiptId: null,
      });
    } else {
      // ── Compare line by line ─────────────────────────────────────────

      // Get all receipt lines
      const receiptIds = receipts.map((r: { id: string }) => r.id);
      const { data: receiptLines } = await sb
        .from('goods_receipt_lines')
        .select('*, receipt_id, product_id, quantity_received, unit_cost')
        .in('receipt_id', receiptIds);

      // Get supplier offers (agreed prices)
      const { data: offers } = await sb
        .from('supplier_offers')
        .select('product_id, price')
        .eq('supplier_id', factura.supplier_id);

      const offerPriceMap = new Map<string, number>();
      if (offers) {
        for (const o of offers) {
          offerPriceMap.set(o.product_id, o.price);
        }
      }

      // Load product names for receipt lines (needed for OCR matching)
      const receiptProductIds = receiptLines
        ? [...new Set(receiptLines.map((rl: { product_id: string }) => rl.product_id))]
        : [];
      const productNameMap = new Map<string, string>(); // product_id → name
      if (receiptProductIds.length > 0) {
        const { data: products } = await sb
          .from('products')
          .select('id, name')
          .in('id', receiptProductIds);
        if (products) {
          for (const p of products) {
            productNameMap.set(p.id, p.name);
          }
        }
      }

      // Build receipt lookup: product_id → { qty, cost, receipt_id }
      const receiptByProduct = new Map<string, {
        qty: number;
        cost: number;
        receiptId: string;
        productName: string;
      }>();
      // Build secondary lookup: normalized product name → same data
      const receiptByName = new Map<string, {
        qty: number;
        cost: number;
        receiptId: string;
        productId: string;
      }>();
      if (receiptLines) {
        for (const rl of receiptLines) {
          const entry = {
            qty: rl.quantity_received,
            cost: rl.unit_cost,
            receiptId: rl.receipt_id,
            productName: productNameMap.get(rl.product_id) ?? '',
          };
          receiptByProduct.set(rl.product_id, entry);

          const name = productNameMap.get(rl.product_id);
          if (name) {
            receiptByName.set(normalizeForMatch(name), {
              qty: rl.quantity_received,
              cost: rl.unit_cost,
              receiptId: rl.receipt_id,
              productId: rl.product_id,
            });
          }
        }
      }

      // Compare each invoice line
      if (lineas && lineas.length > 0) {
        for (const linea of lineas) {
          // Try to find matching receipt: by product_id first, then by description
          let receipt: { qty: number; cost: number; receiptId: string } | undefined;
          let matchedProductId: string | null = linea.product_id ?? null;

          if (linea.product_id) {
            receipt = receiptByProduct.get(linea.product_id);
          }

          // OCR lines lack product_id — try matching by description against product names
          if (!receipt && linea.descripcion) {
            const normalDesc = normalizeForMatch(linea.descripcion);
            // Exact normalized match
            const byName = receiptByName.get(normalDesc);
            if (byName) {
              receipt = byName;
              matchedProductId = byName.productId;
            } else {
              // Substring/contains match: check if any product name is contained
              // in the description or vice-versa
              for (const [normName, data] of receiptByName) {
                if (normalDesc.includes(normName) || normName.includes(normalDesc)) {
                  receipt = data;
                  matchedProductId = data.productId;
                  break;
                }
              }
            }
          }

          if (!receipt) {
            // Flag as unmatched instead of silently skipping
            discrepancias.push({
              tipo: TipoDiscrepancia.LineaSinConciliar,
              valorEsperado: 'Linea conciliada con albaran',
              valorRecibido: `Sin match: "${linea.descripcion}" (${linea.cantidad} x ${linea.precio_unitario})`,
              diferencia: linea.total_linea ?? 0,
              receiptId: null,
            });
            continue;
          }

          // ── Price check: ±2% tolerance ─────────────────────────────

          const agreedPrice = (matchedProductId ? offerPriceMap.get(matchedProductId) : undefined) ?? receipt.cost;
          if (agreedPrice > 0) {
            const priceDiffPct = Math.abs(
              ((linea.precio_unitario - agreedPrice) / agreedPrice) * 100
            );
            if (priceDiffPct > 2) {
              const diff = +(linea.precio_unitario - agreedPrice).toFixed(2);
              discrepancias.push({
                tipo: TipoDiscrepancia.PrecioIncorrecto,
                valorEsperado: `${agreedPrice.toFixed(2)} EUR/ud`,
                valorRecibido: `${linea.precio_unitario.toFixed(2)} EUR/ud (+${priceDiffPct.toFixed(1)}%)`,
                diferencia: +(diff * linea.cantidad).toFixed(2),
                receiptId: receipt.receiptId,
              });
            }
          }

          // ── Quantity check: exact match ─────────────────────────────

          if (Math.abs(linea.cantidad - receipt.qty) > 0.001) {
            discrepancias.push({
              tipo: TipoDiscrepancia.CantidadIncorrecta,
              valorEsperado: `${receipt.qty} recibidos`,
              valorRecibido: `${linea.cantidad} facturados`,
              diferencia: +(
                (linea.cantidad - receipt.qty) * linea.precio_unitario
              ).toFixed(2),
              receiptId: receipt.receiptId,
            });
          }
        }
      }
    }
  }

  // ── Insert all discrepancies ───────────────────────────────────────────

  let discrepanciasInsertadas = 0;

  if (discrepancias.length > 0) {
    const rows = discrepancias.map(d => ({
      hotel_id: input.hotelId,
      factura_id: input.facturaId,
      receipt_id: d.receiptId,
      tipo_discrepancia: d.tipo,
      valor_esperado: d.valorEsperado,
      valor_recibido: d.valorRecibido,
      diferencia: d.diferencia,
    }));

    const { error: insertError, data: inserted } = await sb
      .from('discrepancias_clara')
      .insert(rows)
      .select('id');

    if (insertError) {
      console.error('Error inserting discrepancias:', insertError.message);
    } else {
      discrepanciasInsertadas = inserted?.length ?? 0;
    }
  }

  // ── Update factura status ──────────────────────────────────────────────

  const estadoFinal = discrepancias.length > 0
    ? EstadoFactura.Discrepancia
    : EstadoFactura.Procesada;

  await sb
    .from('facturas_recibidas')
    .update({ estado: estadoFinal, updated_at: new Date().toISOString() })
    .eq('id', input.facturaId)
    .eq('hotel_id', input.hotelId);

  return {
    facturaId: input.facturaId,
    estado: estadoFinal,
    discrepancias,
    discrepanciasInsertadas,
    documentosFaltantes: discrepancias.filter(
      d => d.tipo === TipoDiscrepancia.DocumentoFaltante
    ).length,
    tokensInput: 0,
    tokensOutput: 0,
    error: null,
  };
}
