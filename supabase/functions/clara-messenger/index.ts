// clara-messenger — Modulo 4: Redactor de incidencias
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
import { runMessenger } from '../_shared/clara_messenger.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const elapsed = startTimer();

  try {
    const body = await req.json();
    const hotelId = ensureHotelId(body.hotel_id);
    const supabase = getSupabaseClient();

    if (!body.discrepancia_id) {
      return errorResponse('Missing discrepancia_id', 400);
    }

    const deps = {
      supabase,
      callGemini,
      logAgent: async (log: Record<string, unknown>) => {
        await logAgent(supabase, log as AgentLog);
      },
    };

    const result = await runMessenger({
      hotelId,
      discrepanciaId: body.discrepancia_id,
    }, deps);

    await logAgent(supabase, {
      hotel_id: hotelId,
      agent_name: 'clara-messenger',
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: result.tokensInput,
      tokens_output: result.tokensOutput,
      duration_ms: elapsed(),
      result: {
        discrepancia_id: result.discrepanciaId,
        asunto: result.asunto,
        mensaje_generado: !!result.mensajeRedactado,
      },
      error: result.error ?? undefined,
    });

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('clara-messenger error:', message);
    return errorResponse(message, 500);
  }
});
