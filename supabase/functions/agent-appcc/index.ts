// agent-appcc: Daily APPCC closure with backup and anomaly detection
// CulinaryOS — Supabase Edge Function (Deno)

import {
  getSupabaseClient,
  callGemini,
  logAgent,
  ensureHotelId,
  jsonResponse,
  errorResponse,
  startTimer,
} from '../_shared/utils.ts';
import type { AgentLog, AppccDailyClosure } from '../_shared/types.ts';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CheckTemplate {
  id: string;
  hotel_id: string;
  name: string;
  check_type: string;
  frequency: string;
  min_value: number;
  max_value: number;
  unit: string;
  is_active: boolean;
}

interface CheckRecord {
  id: string;
  hotel_id: string;
  template_id: string;
  check_date: string;
  value: number;
  status: string;
  notes: string | null;
  checked_by_name: string | null;
}

interface Anomaly {
  template_name: string;
  template_id: string;
  check_type: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  status: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function isColdStorage(checkType: string): boolean {
  const cold = ['temperatura_camara', 'cold_storage', 'refrigeracion', 'congelacion'];
  return cold.includes(checkType.toLowerCase());
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const elapsed = startTimer();

  try {
    const { hotel_id: rawHotelId, target_date } = await req.json();
    const hotelId = ensureHotelId(rawHotelId);
    const date = target_date ?? todayISO();

    const supabase = getSupabaseClient();

    // 1. Fetch active check_templates for this hotel
    const { data: templates, error: tplErr } = await supabase
      .from('check_templates')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('is_active', true);

    if (tplErr) throw new Error(`Error fetching templates: ${tplErr.message}`);
    if (!templates || templates.length === 0) {
      return jsonResponse({ status: 'skipped', reason: 'No active check templates' });
    }

    const typedTemplates = templates as CheckTemplate[];

    // 2. Fetch check_records for this date and hotel
    const { data: records, error: recErr } = await supabase
      .from('check_records')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('check_date', date);

    if (recErr) throw new Error(`Error fetching records: ${recErr.message}`);
    const typedRecords = (records ?? []) as CheckRecord[];

    // 3. Build lookup of template_id -> record(s)
    const recordsByTemplate = new Map<string, CheckRecord[]>();
    for (const r of typedRecords) {
      const existing = recordsByTemplate.get(r.template_id) ?? [];
      existing.push(r);
      recordsByTemplate.set(r.template_id, existing);
    }

    // 4. Identify missing checks, anomalies, and critical issues
    const missingChecks: string[] = [];
    const anomalies: Anomaly[] = [];
    let okCount = 0;
    let alertCount = 0;
    let criticalCount = 0;

    for (const tpl of typedTemplates) {
      const tplRecords = recordsByTemplate.get(tpl.id);

      if (!tplRecords || tplRecords.length === 0) {
        missingChecks.push(tpl.name);
        continue;
      }

      for (const rec of tplRecords) {
        const outOfRange =
          rec.value < tpl.min_value || rec.value > tpl.max_value;

        if (outOfRange) {
          const isCritical = isColdStorage(tpl.check_type);
          const status = isCritical ? 'critical' : 'alert';

          anomalies.push({
            template_name: tpl.name,
            template_id: tpl.id,
            check_type: tpl.check_type,
            value: rec.value,
            min: tpl.min_value,
            max: tpl.max_value,
            unit: tpl.unit,
            status,
          });

          if (isCritical) {
            criticalCount++;
          } else {
            alertCount++;
          }
        } else {
          okCount++;
        }
      }
    }

    // 5. Create alerts for missing checks
    if (missingChecks.length > 0) {
      const hasCriticalMissing = typedTemplates.some(
        t => missingChecks.includes(t.name) && isColdStorage(t.check_type)
      );

      const severity = hasCriticalMissing ? 'critical' : 'warning';

      await supabase.from('alerts').insert({
        hotel_id: hotelId,
        alert_type: 'appcc_missing_checks',
        severity,
        title: `APPCC: ${missingChecks.length} controles sin registrar (${date})`,
        message: `Controles pendientes: ${missingChecks.join(', ')}`,
      });
    }

    // 6. Create appcc_incidents for out-of-range temperatures
    const tempAnomalies = anomalies.filter(a => isColdStorage(a.check_type));
    if (tempAnomalies.length > 0) {
      const incidents = tempAnomalies.map(a => ({
        hotel_id: hotelId,
        incident_date: date,
        title: `Temperatura fuera de rango: ${a.template_name}`,
        description: `Valor registrado: ${a.value}${a.unit}. Rango permitido: ${a.min}–${a.max}${a.unit}.`,
        severity: 'critical' as const,
        status: 'open',
        reported_by_name: 'agent-appcc',
      }));

      const { error: incErr } = await supabase
        .from('appcc_incidents')
        .insert(incidents);

      if (incErr) console.error('Error creating incidents:', incErr.message);
    }

    // 7. Build closure document
    const totalChecks = typedTemplates.length;
    const completedChecks = totalChecks - missingChecks.length;
    const completionPct = totalChecks > 0
      ? Math.round((completedChecks / totalChecks) * 100)
      : 0;

    const closureDoc: AppccDailyClosure = {
      date,
      hotel_id: hotelId,
      total_checks: totalChecks,
      ok_count: okCount,
      alert_count: alertCount,
      critical_count: criticalCount,
      missing_checks: missingChecks,
      anomalies: anomalies.map(a => ({
        template_name: a.template_name,
        value: a.value,
        min: a.min,
        max: a.max,
        status: a.status,
      })),
      hash: '', // Will be filled below
    };

    // 8. Calculate SHA-256 hash of closure document (without hash field)
    const docForHash = JSON.stringify({ ...closureDoc, hash: undefined });
    closureDoc.hash = await sha256(docForHash);

    // 9. Upsert into appcc_daily_closures
    // Valid statuses: 'open', 'completed', 'validated', 'reopened'
    const closureStatus =
      missingChecks.length > 0 ? 'open' :
      'completed';

    const { error: closureErr } = await supabase
      .from('appcc_daily_closures')
      .upsert(
        {
          hotel_id: hotelId,
          closure_date: date,
          status: closureStatus,
          total_checks: totalChecks,
          ok_count: okCount,
          alert_count: alertCount,
          critical_count: criticalCount,
          completion_pct: completionPct,
          incidents_open: tempAnomalies.length,
          validation_notes: JSON.stringify({ hash: closureDoc.hash, missing_checks: missingChecks, anomaly_count: anomalies.length }),
        },
        { onConflict: 'hotel_id,closure_date' }
      );

    if (closureErr) throw new Error(`Error upserting closure: ${closureErr.message}`);

    // 10. Generate executive summary via Gemini
    // COST_CHECKPOINT
    let summary = '';
    let tokensInput = 0;
    let tokensOutput = 0;

    try {
      const geminiResult = await callGemini({
        prompt: JSON.stringify({
          fecha: date,
          total_controles: totalChecks,
          completados: completedChecks,
          ok: okCount,
          alertas: alertCount,
          criticos: criticalCount,
          controles_pendientes: missingChecks,
          anomalias: anomalies.map(a => ({
            nombre: a.template_name,
            valor: `${a.value}${a.unit}`,
            rango: `${a.min}–${a.max}${a.unit}`,
          })),
        }),
        systemInstruction:
          'Eres un asistente de seguridad alimentaria APPCC. ' +
          'Genera un resumen ejecutivo en espanol de 2-3 frases sobre el estado del dia. ' +
          'Responde SOLO con un JSON: {"summary": "..."}',
        temperature: 0.2,
        maxOutputTokens: 256,
      });

      tokensInput = geminiResult.tokensInput;
      tokensOutput = geminiResult.tokensOutput;

      try {
        const parsed = JSON.parse(geminiResult.text);
        summary = parsed.summary ?? geminiResult.text;
      } catch {
        summary = geminiResult.text;
      }
    } catch (e) {
      console.error('Gemini summary failed:', e);
      summary = `Cierre APPCC ${date}: ${completionPct}% completado. ${okCount} OK, ${alertCount} alertas, ${criticalCount} criticos.`;
    }

    // 11. Update closure validation_notes with summary
    // Merge summary into validation_notes JSON (no dedicated summary column)
    const existingNotes = JSON.stringify({ hash: closureDoc.hash, missing_checks: missingChecks, anomaly_count: anomalies.length, summary });
    await supabase
      .from('appcc_daily_closures')
      .update({ validation_notes: existingNotes })
      .eq('hotel_id', hotelId)
      .eq('closure_date', date);

    // 12. Log to agent_logs
    const agentLog: AgentLog = {
      hotel_id: hotelId,
      agent_name: 'agent-appcc',
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      duration_ms: elapsed(),
      result: {
        date,
        status: closureStatus,
        total_checks: totalChecks,
        completion_pct: completionPct,
        ok_count: okCount,
        alert_count: alertCount,
        critical_count: criticalCount,
        missing_count: missingChecks.length,
        anomaly_count: anomalies.length,
        hash: closureDoc.hash,
      },
    };

    await logAgent(supabase, agentLog);

    return jsonResponse({
      status: closureStatus,
      date,
      total_checks: totalChecks,
      completion_pct: completionPct,
      ok_count: okCount,
      alert_count: alertCount,
      critical_count: criticalCount,
      missing_checks: missingChecks,
      anomalies: anomalies.length,
      summary,
      hash: closureDoc.hash,
      duration_ms: elapsed(),
    });
  } catch (err) {
    console.error('agent-appcc error:', err);
    return errorResponse(
      err instanceof Error ? err.message : 'Unknown error',
      500
    );
  }
});
