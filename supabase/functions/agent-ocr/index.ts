// agent-ocr — Invoice OCR with Gemini Vision + supplier validation
// Supabase Edge Function (Deno runtime)

import {
  getSupabaseClient,
  callGemini,
  logAgent,
  ensureHotelId,
  verifyCallerHotelAccess,
  jsonResponse,
  errorResponse,
  startTimer,
  withRetry,
} from '../_shared/utils.ts';
import type { OcrInvoiceResult, Discrepancy, AgentLog } from '../_shared/types.ts';

// ─── NIF Validation ────────────────────────────────────────────────────────

function isValidNif(nif: string): boolean {
  if (!nif || typeof nif !== 'string') return false;
  const cleaned = nif.replace(/[\s.-]/g, '').toUpperCase();
  // DNI: 8 digits + letter
  if (/^\d{8}[A-Z]$/.test(cleaned)) return true;
  // NIE: X/Y/Z + 7 digits + letter
  if (/^[XYZ]\d{7}[A-Z]$/.test(cleaned)) return true;
  // CIF (empresa): letter + 8 digits (B, A, C, D, E, F, G, H, J, etc.)
  if (/^[ABCDEFGHJKLMNPQRSUVW]\d{8}$/.test(cleaned)) return true;
  // CIF with final letter
  if (/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[A-J0-9]$/.test(cleaned)) return true;
  return false;
}

// ─── Math Validation ───────────────────────────────────────────────────────

interface MathValidation {
  valid: boolean;
  errors: string[];
}

function validateMath(invoice: OcrInvoiceResult): MathValidation {
  const errors: string[] = [];
  const TOLERANCE = 0.02; // 2 céntimos de tolerancia

  // Validar totales de cada línea
  for (const line of invoice.lines) {
    const expectedTotal = +(line.quantity * line.unit_price).toFixed(2);
    if (Math.abs(expectedTotal - line.total) > TOLERANCE) {
      errors.push(
        `Línea "${line.product_name}": ${line.quantity} x ${line.unit_price} = ${expectedTotal}, factura dice ${line.total}`
      );
    }
  }

  // Validar subtotal = suma de líneas
  const linesSum = +(invoice.lines.reduce((sum, l) => sum + l.total, 0)).toFixed(2);
  if (Math.abs(linesSum - invoice.subtotal) > TOLERANCE) {
    errors.push(`Subtotal: suma líneas = ${linesSum}, factura dice ${invoice.subtotal}`);
  }

  // Validar total = subtotal + IVA
  const expectedTotal = +(invoice.subtotal + invoice.vat_total).toFixed(2);
  if (Math.abs(expectedTotal - invoice.total) > TOLERANCE) {
    errors.push(`Total: ${invoice.subtotal} + ${invoice.vat_total} = ${expectedTotal}, factura dice ${invoice.total}`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Required Fields Validation ────────────────────────────────────────────

function validateRequired(invoice: OcrInvoiceResult): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  if (!invoice.supplier_name) {
    discrepancies.push({
      type: 'missing_field',
      field: 'supplier_name',
      expected: 'present',
      actual: 'missing',
      severity: 'high',
    });
  }

  if (!invoice.supplier_nif) {
    discrepancies.push({
      type: 'missing_field',
      field: 'supplier_nif',
      expected: 'present',
      actual: 'missing',
      severity: 'high',
    });
  } else if (!isValidNif(invoice.supplier_nif)) {
    discrepancies.push({
      type: 'nif_mismatch',
      field: 'supplier_nif',
      expected: 'NIF/CIF válido',
      actual: invoice.supplier_nif,
      severity: 'high',
    });
  }

  if (!invoice.invoice_date) {
    discrepancies.push({
      type: 'missing_field',
      field: 'invoice_date',
      expected: 'present',
      actual: 'missing',
      severity: 'medium',
    });
  }

  if (!invoice.lines || invoice.lines.length === 0) {
    discrepancies.push({
      type: 'missing_field',
      field: 'lines',
      expected: 'al menos 1 línea',
      actual: '0 líneas',
      severity: 'critical',
    });
  }

  if (!invoice.total && invoice.total !== 0) {
    discrepancies.push({
      type: 'missing_field',
      field: 'total',
      expected: 'present',
      actual: 'missing',
      severity: 'critical',
    });
  }

  return discrepancies;
}

// ─── Gemini OCR Prompt ─────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION =
  'Eres un sistema OCR especializado en facturas de proveedores de hostelería en España. Extrae los datos en formato JSON exacto.';

const OCR_PROMPT = `Analiza esta imagen de factura y extrae los datos en el siguiente formato JSON exacto:

{
  "supplier_name": "Nombre del proveedor",
  "supplier_nif": "NIF/CIF del proveedor (formato: B12345678, 12345678A, X1234567A)",
  "invoice_number": "Número de factura",
  "invoice_date": "YYYY-MM-DD",
  "lines": [
    {
      "product_name": "Nombre del producto tal como aparece en la factura",
      "quantity": 10.0,
      "unit": "kg|ud|l|caja|pack",
      "unit_price": 5.50,
      "total": 55.00,
      "vat_pct": 10
    }
  ],
  "subtotal": 100.00,
  "vat_total": 10.00,
  "total": 110.00,
  "confidence": 0.95
}

Reglas:
- Todos los importes en euros con 2 decimales
- La fecha en formato ISO (YYYY-MM-DD)
- El NIF/CIF exactamente como aparece, incluyendo la letra
- Unidades: kg, ud, l (litro), caja, pack, docena, manojo, bandeja
- IVA: típicamente 4% (superreducido), 10% (reducido alimentos), 21% (general)
- Si no puedes leer un campo con certeza, pon confidence más bajo
- No inventes datos que no aparezcan en la factura`;

// ─── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const elapsed = startTimer();
  let totalTokensInput = 0;
  let totalTokensOutput = 0;
  let hotelId = '';

  try {
    const body = await req.json();
    hotelId = ensureHotelId(body.hotel_id);

    const supabase = getSupabaseClient();

    // Verify caller has access to this hotel
    await verifyCallerHotelAccess(req, hotelId, supabase);

    const imageBase64: string = body.image_base64;
    const mimeType: string = body.mime_type;

    if (!imageBase64) {
      return errorResponse('Missing image_base64', 400);
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!mimeType || !validMimeTypes.includes(mimeType)) {
      return errorResponse(`Invalid mime_type. Expected one of: ${validMimeTypes.join(', ')}`, 400);
    }

    // ── Step 1: OCR with Gemini Vision ──────────────────────────────────

    // COST_CHECKPOINT: Gemini Vision OCR call
    const ocrResult = await withRetry(() =>
      callGemini({
        prompt: OCR_PROMPT,
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
        maxOutputTokens: 4096,
        image: { base64: imageBase64, mimeType },
      })
    );

    totalTokensInput += ocrResult.tokensInput;
    totalTokensOutput += ocrResult.tokensOutput;

    let invoice: OcrInvoiceResult;
    try {
      invoice = JSON.parse(ocrResult.text) as OcrInvoiceResult;
    } catch {
      return errorResponse('Failed to parse Gemini OCR response as JSON', 500);
    }

    // ── Step 2: Validate extracted data ─────────────────────────────────

    const allDiscrepancies: Discrepancy[] = [];

    // Required fields
    const fieldDiscrepancies = validateRequired(invoice);
    allDiscrepancies.push(...fieldDiscrepancies);

    // Math validation
    const mathCheck = validateMath(invoice);
    if (!mathCheck.valid) {
      for (const err of mathCheck.errors) {
        allDiscrepancies.push({
          type: 'missing_field',
          field: 'math_check',
          expected: 'cálculo correcto',
          actual: err,
          severity: 'medium',
        });
      }
    }

    // ── Step 3: Flag low confidence for manual review ───────────────────

    const needsManualReview = invoice.confidence < 0.85;

    // ── Step 4: Supplier lookup ─────────────────────────────────────────

    let supplierId: string | null = null;
    let supplierFound = false;

    if (invoice.supplier_nif) {
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('hotel_id', hotelId)
        .eq('tax_id', invoice.supplier_nif)
        .maybeSingle();

      if (supplier) {
        supplierId = supplier.id;
        supplierFound = true;
      }
    }

    // ── Step 5: Compare against supplier_offers & goods_receipt ─────────

    if (supplierId && invoice.lines?.length > 0) {
      // Get all product aliases for this supplier to match invoice names to product IDs
      const { data: aliases } = await supabase
        .from('product_aliases')
        .select('product_id, alias_name')
        .eq('hotel_id', hotelId)
        .eq('supplier_id', supplierId);

      // Get all products for this hotel
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .eq('hotel_id', hotelId);

      // Build lookup: alias/product name → product_id
      const nameToProductId = new Map<string, string>();
      if (aliases) {
        for (const a of aliases) {
          nameToProductId.set(a.alias_name.toLowerCase().trim(), a.product_id);
        }
      }
      if (products) {
        for (const p of products) {
          nameToProductId.set(p.name.toLowerCase().trim(), p.id);
        }
      }

      // Get agreed prices
      const { data: offers } = await supabase
        .from('supplier_offers')
        .select('product_id, price')
        .eq('supplier_id', supplierId);

      const offerPriceMap = new Map<string, number>();
      if (offers) {
        for (const o of offers) {
          offerPriceMap.set(o.product_id, o.price);
        }
      }

      // Check each invoice line
      for (const line of invoice.lines) {
        const productId = nameToProductId.get(line.product_name.toLowerCase().trim());
        if (!productId) continue;

        // Price mismatch check: invoice price > agreed price by >5%
        const agreedPrice = offerPriceMap.get(productId);
        if (agreedPrice !== undefined && agreedPrice > 0) {
          const priceDiffPct = ((line.unit_price - agreedPrice) / agreedPrice) * 100;
          if (priceDiffPct > 5) {
            allDiscrepancies.push({
              type: 'price_mismatch',
              field: line.product_name,
              expected: `${agreedPrice.toFixed(2)} €`,
              actual: `${line.unit_price.toFixed(2)} € (+${priceDiffPct.toFixed(1)}%)`,
              severity: priceDiffPct > 20 ? 'critical' : priceDiffPct > 10 ? 'high' : 'medium',
            });
          }
        }

        // Quantity mismatch: compare against latest goods receipt
        const { data: receiptLines } = await supabase
          .from('goods_receipt_lines')
          .select('quantity_received, goods_receipts!inner(purchase_orders!inner(supplier_id))')
          .eq('product_id', productId)
          .eq('goods_receipts.purchase_orders.supplier_id', supplierId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (receiptLines && receiptLines.length > 0) {
          const receivedQty = receiptLines[0].quantity_received;
          if (Math.abs(receivedQty - line.quantity) > 0.01) {
            allDiscrepancies.push({
              type: 'quantity_mismatch',
              field: line.product_name,
              expected: `${receivedQty} recibido`,
              actual: `${line.quantity} facturado`,
              severity: 'high',
            });
          }
        }
      }
    }

    // ── Step 6: Insert discrepancies ────────────────────────────────────

    if (allDiscrepancies.length > 0) {
      const rows = allDiscrepancies.map((d) => ({
        hotel_id: hotelId,
        supplier_id: supplierId,
        discrepancy_type: d.type,
        expected_value: d.expected,
        actual_value: d.actual,
        severity: d.severity,
        details: {
          field: d.field,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          supplier_name: invoice.supplier_name,
        },
      }));

      const { error: insertError } = await supabase
        .from('invoice_discrepancies')
        .insert(rows);

      if (insertError) {
        console.error('Failed to insert discrepancies:', insertError.message);
      }
    }

    // ── Step 7: Log to agent_logs ───────────────────────────────────────

    const agentLog: AgentLog = {
      hotel_id: hotelId,
      agent_name: 'agent-ocr',
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: totalTokensInput,
      tokens_output: totalTokensOutput,
      duration_ms: elapsed(),
      result: {
        invoice_number: invoice.invoice_number,
        supplier_name: invoice.supplier_name,
        supplier_nif: invoice.supplier_nif,
        total: invoice.total,
        lines_count: invoice.lines?.length ?? 0,
        discrepancies_count: allDiscrepancies.length,
        confidence: invoice.confidence,
        needs_manual_review: needsManualReview,
        supplier_found: supplierFound,
      },
    };

    await logAgent(supabase, agentLog);

    // ── Response ────────────────────────────────────────────────────────

    return jsonResponse({
      success: true,
      invoice,
      validation: {
        supplier_found: supplierFound,
        supplier_id: supplierId,
        discrepancies: allDiscrepancies,
        needs_manual_review: needsManualReview,
        math_errors: mathCheck.errors,
      },
      meta: {
        tokens_input: totalTokensInput,
        tokens_output: totalTokensOutput,
        duration_ms: elapsed(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('agent-ocr error:', message);

    // Log error
    if (hotelId) {
      try {
        const supabase = getSupabaseClient();
        await logAgent(supabase, {
          hotel_id: hotelId,
          agent_name: 'agent-ocr',
          triggered_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          tokens_input: totalTokensInput,
          tokens_output: totalTokensOutput,
          duration_ms: elapsed(),
          error: message,
        });
      } catch {
        // Silent — don't mask the original error
      }
    }

    return errorResponse(message, 500);
  }
});
