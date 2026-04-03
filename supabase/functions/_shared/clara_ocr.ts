// CLARA — Modulo 2: OCR + Extraccion estructurada
// Logica pura — portable a Node.js

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ClaraDeps, OcrFacturaExtraida } from './clara_types.ts';
import { EstadoFactura } from './clara_types.ts';
import { PROMPT_OCR_SYSTEM, PROMPT_OCR_EXTRACCION } from './clara_prompts.ts';
import {
  isValidNif,
  parseSpanishDate,
  safeJsonParse,
  withTimeout,
} from './clara_utils.ts';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OcrInput {
  hotelId: string;
  facturaId: string;
  documentoBase64: string;
  documentoMime: string;
}

export interface OcrOutput {
  facturaId: string;
  estado: EstadoFactura;
  datosExtraidos: OcrFacturaExtraida | null;
  confianzaOcr: number;
  camposFaltantes: string[];
  lineasInsertadas: number;
  tokensInput: number;
  tokensOutput: number;
  error: string | null;
}

// ─── Validation ────────────────────────────────────────────────────────────

interface ValidationResult {
  camposFaltantes: string[];
  confianzaAjustada: number;
}

function validateExtraction(data: OcrFacturaExtraida): ValidationResult {
  const camposFaltantes: string[] = [];
  let penalizacion = 0;

  if (!data.proveedor_nif) {
    camposFaltantes.push('proveedor_nif');
    penalizacion += 15;
  } else if (!isValidNif(data.proveedor_nif)) {
    camposFaltantes.push('proveedor_nif_invalido');
    penalizacion += 10;
  }

  if (!data.numero_factura) {
    camposFaltantes.push('numero_factura');
    penalizacion += 10;
  }

  if (!data.fecha_factura) {
    camposFaltantes.push('fecha_factura');
    penalizacion += 10;
  }

  if (!data.lineas || data.lineas.length === 0) {
    camposFaltantes.push('lineas');
    penalizacion += 25;
  }

  if (data.total === undefined || data.total === null) {
    camposFaltantes.push('total');
    penalizacion += 15;
  }

  if (data.subtotal === undefined || data.subtotal === null) {
    camposFaltantes.push('subtotal');
    penalizacion += 5;
  }

  // Math validation
  if (data.lineas && data.lineas.length > 0 && data.subtotal) {
    const linesSum = data.lineas.reduce((s, l) => s + (l.total_linea ?? 0), 0);
    if (Math.abs(linesSum - data.subtotal) > 0.05) {
      camposFaltantes.push('subtotal_no_cuadra');
      penalizacion += 5;
    }
  }

  if (data.subtotal && data.iva_total && data.total) {
    const expectedTotal = data.subtotal + data.iva_total;
    if (Math.abs(expectedTotal - data.total) > 0.05) {
      camposFaltantes.push('total_no_cuadra');
      penalizacion += 5;
    }
  }

  const confianzaAjustada = Math.max(0, (data.confianza_global ?? 50) - penalizacion);
  return { camposFaltantes, confianzaAjustada };
}

// ─── Main Logic ────────────────────────────────────────────────────────────

export async function runOcr(
  input: OcrInput,
  deps: ClaraDeps
): Promise<OcrOutput> {
  let tokensInput = 0;
  let tokensOutput = 0;

  // ── Gemini Vision: extract structured data ─────────────────────────────

  // CLARA_COST: ocr, ~1500 tokens estimados (imagen + prompt)
  const ocrResult = await withTimeout(
    deps.callGemini({
      prompt: PROMPT_OCR_EXTRACCION,
      systemInstruction: PROMPT_OCR_SYSTEM,
      temperature: 0.1,
      maxOutputTokens: 4096,
      image: { base64: input.documentoBase64, mimeType: input.documentoMime },
    }),
    30_000,
    'ocr_extraccion'
  );

  tokensInput += ocrResult.tokensInput;
  tokensOutput += ocrResult.tokensOutput;

  const datos = safeJsonParse<OcrFacturaExtraida>(ocrResult.text);

  if (!datos) {
    // Update factura status
    const sb = deps.supabase as unknown as SupabaseClient;
    await sb
      .from('facturas_recibidas')
      .update({ estado: EstadoFactura.RevisionManual, updated_at: new Date().toISOString() })
      .eq('id', input.facturaId)
      .eq('hotel_id', input.hotelId);

    return {
      facturaId: input.facturaId,
      estado: EstadoFactura.RevisionManual,
      datosExtraidos: null,
      confianzaOcr: 0,
      camposFaltantes: ['json_parse_error'],
      lineasInsertadas: 0,
      tokensInput,
      tokensOutput,
      error: 'No se pudo parsear respuesta OCR como JSON',
    };
  }

  // ── Validate ───────────────────────────────────────────────────────────

  const { camposFaltantes, confianzaAjustada } = validateExtraction(datos);
  const allCamposFaltantes = [
    ...camposFaltantes,
    ...(datos.campos_faltantes ?? []),
  ];

  const estado = confianzaAjustada < 85
    ? EstadoFactura.RevisionManual
    : EstadoFactura.Pendiente;

  // ── Parse date ─────────────────────────────────────────────────────────

  const fechaIso = parseSpanishDate(datos.fecha_factura);

  // ── Lookup supplier by NIF ─────────────────────────────────────────────

  const sb = deps.supabase as unknown as SupabaseClient;
  let supplierId: string | null = null;

  if (datos.proveedor_nif && isValidNif(datos.proveedor_nif)) {
    const { data: supplier } = await sb
      .from('suppliers')
      .select('id')
      .eq('hotel_id', input.hotelId)
      .eq('tax_id', datos.proveedor_nif.replace(/[\s.\-/]/g, '').toUpperCase())
      .maybeSingle();
    supplierId = supplier?.id ?? null;
  }

  // ── Update factura with extracted data ─────────────────────────────────

  await sb
    .from('facturas_recibidas')
    .update({
      supplier_id: supplierId,
      fecha_factura: fechaIso,
      numero_factura: datos.numero_factura,
      subtotal: datos.subtotal,
      iva: datos.iva_total,
      total: datos.total,
      estado,
      confianza_ocr: confianzaAjustada,
      datos_extraidos: datos,
      campos_faltantes: allCamposFaltantes.length > 0 ? allCamposFaltantes : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.facturaId)
    .eq('hotel_id', input.hotelId);

  // ── Insert invoice lines ───────────────────────────────────────────────

  let lineasInsertadas = 0;

  if (datos.lineas && datos.lineas.length > 0) {
    const rows = datos.lineas.map(l => ({
      factura_id: input.facturaId,
      hotel_id: input.hotelId,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      total_linea: l.total_linea,
      iva_tipo: l.iva_tipo ?? 10,
    }));

    const { error: linesError, data: inserted } = await sb
      .from('lineas_factura')
      .insert(rows)
      .select('id');

    if (linesError) {
      console.error('Error inserting lineas_factura:', linesError.message);
    } else {
      lineasInsertadas = inserted?.length ?? 0;
    }
  }

  return {
    facturaId: input.facturaId,
    estado,
    datosExtraidos: datos,
    confianzaOcr: confianzaAjustada,
    camposFaltantes: allCamposFaltantes,
    lineasInsertadas,
    tokensInput,
    tokensOutput,
    error: null,
  };
}
