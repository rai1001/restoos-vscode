// agent-integrity: Daily document integrity verification and missing document detection
// RestoOS — Supabase Edge Function (Deno)

import {
  getSupabaseClient,
  logAgent,
  ensureHotelId,
  verifyCallerHotelAccess,
  jsonResponse,
  errorResponse,
  startTimer,
} from '../_shared/utils.ts';

// ─── Types ──────────────────────────────────────────────────────────────────

interface VerificationResult {
  document_id: string;
  doc_number: string | null;
  doc_type: string;
  status: 'passed' | 'failed' | 'skipped';
  reason?: string;
}

interface MissingPair {
  document_id: string;
  doc_type: string;
  doc_number: string | null;
  supplier_name: string | null;
  doc_date: string;
}

interface IntegrityReport {
  verified: number;
  passed: number;
  failed: number;
  skipped: number;
  missing_pairs: number;
  docs_without_backup: number;
  retention_warnings: number;
  details: VerificationResult[];
  missing: MissingPair[];
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const timer = startTimer();

  try {
    const hotelId = await ensureHotelId(req);
    const supabase = getSupabaseClient();
    await verifyCallerHotelAccess(req, hotelId, supabase);

    const report: IntegrityReport = {
      verified: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      missing_pairs: 0,
      docs_without_backup: 0,
      retention_warnings: 0,
      details: [],
      missing: [],
    };

    // ── 1. Get documents needing verification ──────────────────────────────

    const { data: docsToVerify, error: verifyErr } = await supabase.rpc(
      'get_documents_needing_verification',
      { p_hotel_id: hotelId, p_limit: 100 }
    );

    if (verifyErr) throw new Error(`Verification query failed: ${verifyErr.message}`);

    // ── 2. Verify each document's hash ─────────────────────────────────────

    for (const doc of (docsToVerify ?? [])) {
      report.verified++;

      try {
        // Download file from storage
        const { data: blob, error: dlErr } = await supabase.storage
          .from('document-vault')
          .download(doc.storage_path);

        if (dlErr || !blob) {
          report.skipped++;
          report.details.push({
            document_id: doc.document_id,
            doc_number: doc.doc_number,
            doc_type: doc.doc_type,
            status: 'skipped',
            reason: `Download failed: ${dlErr?.message ?? 'empty blob'}`,
          });

          // Record failed check
          await supabase.from('document_integrity_checks').insert({
            document_id: doc.document_id,
            check_type: 'hash_verify',
            status: 'warning',
            expected_hash: doc.file_hash_sha256,
            details: { reason: 'file_not_accessible', error: dlErr?.message },
          });

          continue;
        }

        // Compute hash
        const buffer = await blob.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const actualHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const passed = actualHash === doc.file_hash_sha256;

        if (passed) {
          report.passed++;
        } else {
          report.failed++;
        }

        report.details.push({
          document_id: doc.document_id,
          doc_number: doc.doc_number,
          doc_type: doc.doc_type,
          status: passed ? 'passed' : 'failed',
          reason: passed ? undefined : `Hash mismatch: expected ${doc.file_hash_sha256}, got ${actualHash}`,
        });

        // Record check result
        await supabase.from('document_integrity_checks').insert({
          document_id: doc.document_id,
          check_type: 'hash_verify',
          status: passed ? 'passed' : 'failed',
          expected_hash: doc.file_hash_sha256,
          actual_hash: actualHash,
        });

      } catch (err) {
        report.skipped++;
        report.details.push({
          document_id: doc.document_id,
          doc_number: doc.doc_number,
          doc_type: doc.doc_type,
          status: 'skipped',
          reason: `Error: ${(err as Error).message}`,
        });
      }
    }

    // ── 3. Check for missing document pairs (factura ↔ albarán) ────────────

    const { data: missingReport } = await supabase.rpc(
      'get_missing_documents_report',
      { p_hotel_id: hotelId }
    );

    for (const doc of (missingReport ?? [])) {
      if (!doc.has_matching) {
        report.missing_pairs++;
        report.missing.push({
          document_id: doc.document_id,
          doc_type: doc.doc_type,
          doc_number: doc.doc_number,
          supplier_name: doc.supplier_name,
          doc_date: doc.doc_date,
        });
      }
    }

    // ── 4. Check backup status ─────────────────────────────────────────────

    const { count: noBackup } = await supabase
      .from('document_vault')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .is('storage_path_backup', null)
      .not('doc_status', 'in', '("eliminado","rechazado")');

    report.docs_without_backup = noBackup ?? 0;

    // ── 5. Check retention compliance ──────────────────────────────────────

    const { data: retentionData } = await supabase.rpc(
      'get_retention_compliance',
      { p_hotel_id: hotelId, p_days_warning: 90 }
    );

    report.retention_warnings = (retentionData ?? []).filter(
      (r: { status: string }) => r.status === 'warning' || r.status === 'expired'
    ).length;

    // ── 6. Create alert if integrity failures detected ─────────────────────

    if (report.failed > 0) {
      await supabase.from('alerts').insert({
        hotel_id: hotelId,
        alert_type: 'integrity_failure',
        severity: 'high',
        title: `${report.failed} documento(s) con integridad comprometida`,
        message: `Se detectaron ${report.failed} documentos cuyo hash no coincide con el original. Revisar inmediatamente.`,
        metadata: {
          failed_docs: report.details
            .filter(d => d.status === 'failed')
            .map(d => ({ id: d.document_id, number: d.doc_number })),
        },
      });
    }

    // ── 7. Log agent execution ─────────────────────────────────────────────

    await logAgent(supabase, {
      hotel_id: hotelId,
      agent_name: 'agent-integrity',
      triggered_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: 0,
      tokens_output: 0,
      duration_ms: timer(),
      result: report,
      error: null,
    });

    return jsonResponse({
      success: true,
      report,
      duration_ms: timer(),
    });

  } catch (err) {
    return errorResponse(err as Error);
  }
});
