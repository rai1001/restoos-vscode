// clara-reconciler — Modulo 3: Conciliacion facturas vs albaranes
// Supabase Edge Function (Deno runtime)

import {
  getSupabaseClient,
  logAgent,
  ensureHotelId,
  jsonResponse,
  errorResponse,
  startTimer,
} from '../_shared/utils.ts';
import type { AgentLog } from '../_shared/types.ts';
import { runReconciler } from '../_shared/clara_reconciler.ts';

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

    const deps = {
      supabase,
      callGemini: async () => ({ text: '', tokensInput: 0, tokensOutput: 0 }),
      logAgent: async (log: Record<string, unknown>) => {
        await logAgent(supabase, log as AgentLog);
      },
    };

    const result = await runReconciler({
      hotelId,
      facturaId: body.factura_id,
    }, deps);

    await logAgent(supabase, {
      hotel_id: hotelId,
      agent_name: 'clara-reconciler',
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: result.tokensInput,
      tokens_output: result.tokensOutput,
      duration_ms: elapsed(),
      result: {
        factura_id: result.facturaId,
        estado: result.estado,
        discrepancias: result.discrepanciasInsertadas,
        docs_faltantes: result.documentosFaltantes,
      },
      error: result.error ?? undefined,
    });

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('clara-reconciler error:', message);
    return errorResponse(message, 500);
  }
});
