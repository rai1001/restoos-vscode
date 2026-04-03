// CLARA — Modulo 4: Redactor de incidencias
// Logica pura — portable a Node.js

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { ClaraDeps, MensajeProveedorResult } from './clara_types.ts';
import { PROMPT_MENSAJE_PROVEEDOR } from './clara_prompts.ts';
import { safeJsonParse, withTimeout } from './clara_utils.ts';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MessengerInput {
  hotelId: string;
  discrepanciaId: string;
}

export interface MessengerOutput {
  discrepanciaId: string;
  asunto: string | null;
  mensajeRedactado: string | null;
  tokensInput: number;
  tokensOutput: number;
  error: string | null;
}

// ─── Main Logic ────────────────────────────────────────────────────────────

export async function runMessenger(
  input: MessengerInput,
  deps: ClaraDeps
): Promise<MessengerOutput> {
  const sb = deps.supabase as unknown as SupabaseClient;

  // ── Load discrepancy with context ──────────────────────────────────────

  const { data: disc, error: dError } = await sb
    .from('discrepancias_clara')
    .select('*')
    .eq('id', input.discrepanciaId)
    .eq('hotel_id', input.hotelId)
    .single();

  if (dError || !disc) {
    return {
      discrepanciaId: input.discrepanciaId,
      asunto: null,
      mensajeRedactado: null,
      tokensInput: 0,
      tokensOutput: 0,
      error: `Discrepancia no encontrada: ${dError?.message ?? 'not found'}`,
    };
  }

  // ── Load factura ───────────────────────────────────────────────────────

  const { data: factura } = await sb
    .from('facturas_recibidas')
    .select('numero_factura, fecha_factura, total, supplier_id')
    .eq('id', disc.factura_id)
    .eq('hotel_id', input.hotelId)
    .single();

  // ── Load supplier name ─────────────────────────────────────────────────

  let supplierName = 'Proveedor';
  if (factura?.supplier_id) {
    const { data: supplier } = await sb
      .from('suppliers')
      .select('name')
      .eq('id', factura.supplier_id)
      .single();
    supplierName = supplier?.name ?? 'Proveedor';
  }

  // ── Build context for Gemini ───────────────────────────────────────────

  const discrepanciaContext = JSON.stringify({
    proveedor: supplierName,
    numero_factura: factura?.numero_factura ?? 'N/A',
    fecha_factura: factura?.fecha_factura ?? 'N/A',
    total_factura: factura?.total ?? 'N/A',
    tipo_discrepancia: disc.tipo_discrepancia,
    valor_esperado: disc.valor_esperado,
    valor_recibido: disc.valor_recibido,
    diferencia_euros: disc.diferencia,
  }, null, 2);

  const prompt = PROMPT_MENSAJE_PROVEEDOR.replace('{discrepancia}', discrepanciaContext);

  // CLARA_COST: messenger, ~400 tokens estimados
  const result = await withTimeout(
    deps.callGemini({
      prompt,
      temperature: 0.3,
      maxOutputTokens: 1024,
    }),
    30_000,
    'redaccion_mensaje'
  );

  const mensaje = safeJsonParse<MensajeProveedorResult>(result.text);

  if (!mensaje) {
    return {
      discrepanciaId: input.discrepanciaId,
      asunto: null,
      mensajeRedactado: null,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      error: 'No se pudo parsear mensaje generado',
    };
  }

  // ── Save message to discrepancy ────────────────────────────────────────

  await sb
    .from('discrepancias_clara')
    .update({ mensaje_proveedor: `${mensaje.asunto}\n\n${mensaje.cuerpo}` })
    .eq('id', input.discrepanciaId)
    .eq('hotel_id', input.hotelId);

  return {
    discrepanciaId: input.discrepanciaId,
    asunto: mensaje.asunto,
    mensajeRedactado: mensaje.cuerpo,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
    error: null,
  };
}
