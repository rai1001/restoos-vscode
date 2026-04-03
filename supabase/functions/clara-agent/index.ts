// clara-agent — Orquestador CLARA
// Supabase Edge Function (Deno runtime)
// Coordina: collector → OCR → reconciler → messenger

import {
  getSupabaseClient,
  callGemini,
  logAgent,
  ensureHotelId,
  verifyCallerHotelAccess,
  jsonResponse,
  errorResponse,
  startTimer,
} from '../_shared/utils.ts';
import type { AgentLog } from '../_shared/types.ts';
import type { ClaraPayload, ClaraTrigger } from '../_shared/clara_types.ts';
import { runClara } from '../_shared/clara_agent.ts';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const elapsed = startTimer();

  try {
    const body = await req.json();
    const hotelId = ensureHotelId(body.hotel_id);

    const supabase = getSupabaseClient();

    // Verify caller has access to this hotel
    await verifyCallerHotelAccess(req, hotelId, supabase);

    const payload: ClaraPayload = {
      trigger: (body.trigger as ClaraTrigger) ?? 'manual',
      hotel_id: hotelId,
      email_raw: body.email_raw,
      documento_base64: body.documento_base64,
      documento_mime: body.documento_mime,
      documento_nombre: body.documento_nombre,
      factura_id: body.factura_id,
      retry_id: body.retry_id,
    };

    // Build deps — adapter layer for portability
    const deps = {
      supabase,
      callGemini,
      logAgent: async (log: Record<string, unknown>) => {
        await logAgent(supabase, log as AgentLog);
      },
    };

    const result = await runClara(payload, deps);

    // Log execution
    const agentLog: AgentLog = {
      hotel_id: hotelId,
      agent_name: 'clara-agent',
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: result.tokens_input,
      tokens_output: result.tokens_output,
      duration_ms: elapsed(),
      result: {
        factura_id: result.factura_id,
        estado: result.estado,
        discrepancias: result.discrepancias_count,
        mensajes: result.mensajes_redactados,
        coste_usd: result.coste_usd,
      },
      error: result.errores.length > 0 ? result.errores.join('; ') : undefined,
    };

    await logAgent(supabase, agentLog);

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('clara-agent error:', message);
    return errorResponse(message, 500);
  }
});
