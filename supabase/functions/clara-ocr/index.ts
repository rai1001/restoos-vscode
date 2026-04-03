// clara-ocr — Modulo 2: OCR + Extraccion estructurada
// Supabase Edge Function (Deno runtime)

import {
  getSupabaseClient,
  callGemini,
  logAgent,
  ensureHotelId,
  jsonResponse,
  errorResponse,
  startTimer,
} from '../_shared/utils.ts';
import type { AgentLog } from '../_shared/types.ts';
import { runOcr } from '../_shared/clara_ocr.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const elapsed = startTimer();

  try {
    const body = await req.json();
    const hotelId = ensureHotelId(body.hotel_id);
    const supabase = getSupabaseClient();

    if (!body.factura_id) {
      return errorResponse('Missing factura_id', 400);
    }
    if (!body.documento_base64) {
      return errorResponse('Missing documento_base64', 400);
    }

    const deps = {
      supabase,
      callGemini,
      logAgent: async (log: Record<string, unknown>) => {
        await logAgent(supabase, log as AgentLog);
      },
    };

    const result = await runOcr({
      hotelId,
      facturaId: body.factura_id,
      documentoBase64: body.documento_base64,
      documentoMime: body.documento_mime ?? 'image/jpeg',
    }, deps);

    await logAgent(supabase, {
      hotel_id: hotelId,
      agent_name: 'clara-ocr',
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: result.tokensInput,
      tokens_output: result.tokensOutput,
      duration_ms: elapsed(),
      result: {
        factura_id: result.facturaId,
        estado: result.estado,
        confianza: result.confianzaOcr,
        lineas: result.lineasInsertadas,
      },
      error: result.error ?? undefined,
    });

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('clara-ocr error:', message);
    return errorResponse(message, 500);
  }
});
