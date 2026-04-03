// clara-collector — Modulo 1: Recoleccion y clasificacion de facturas
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
import { runCollector } from '../_shared/clara_collector.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const elapsed = startTimer();

  try {
    const body = await req.json();
    const hotelId = ensureHotelId(body.hotel_id);
    const supabase = getSupabaseClient();

    const deps = {
      supabase,
      callGemini,
      logAgent: async (log: Record<string, unknown>) => {
        await logAgent(supabase, log as AgentLog);
      },
    };

    const result = await runCollector({
      hotelId,
      emailRaw: body.email_raw,
      documentoBase64: body.documento_base64,
      documentoMime: body.documento_mime,
      documentoNombre: body.documento_nombre,
    }, deps);

    await logAgent(supabase, {
      hotel_id: hotelId,
      agent_name: 'clara-collector',
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: result.tokensInput,
      tokens_output: result.tokensOutput,
      duration_ms: elapsed(),
      result: { factura_id: result.facturaId, estado: result.estado },
      error: result.error ?? undefined,
    });

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('clara-collector error:', message);
    return errorResponse(message, 500);
  }
});
