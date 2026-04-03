// CLARA — Orquestador principal
// Logica pura — portable a Node.js
// Coordina los 4 modulos secuencialmente con manejo de errores

import type {
  ClaraDeps,
  ClaraPayload,
  ClaraResult,
} from './clara_types.ts';
import { EstadoFactura } from './clara_types.ts';
import { runCollector } from './clara_collector.ts';
import { runOcr } from './clara_ocr.ts';
import { runReconciler } from './clara_reconciler.ts';
import { runMessenger } from './clara_messenger.ts';
import { enqueueRetry, estimateCost } from './clara_utils.ts';

// ─── Main Orchestrator ─────────────────────────────────────────────────────

export async function runClara(
  payload: ClaraPayload,
  deps: ClaraDeps
): Promise<ClaraResult> {
  const start = Date.now();
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let facturaId: string | null = null;
  let estado: EstadoFactura | null = null;
  let discrepanciasCount = 0;
  let mensajesRedactados = 0;
  const errores: string[] = [];

  const sb = deps.supabase as any;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // MODULO 1: COLLECTOR — Recoger y clasificar documento
    // ═══════════════════════════════════════════════════════════════════════

    let documentoBase64: string | undefined;
    let documentoMime: string | undefined;

    if (payload.trigger === 'manual' && payload.factura_id) {
      // Skip collector — factura already exists, go straight to OCR
      facturaId = payload.factura_id;

      // Load document from storage
      const { data: factura } = await sb
        .from('facturas_recibidas')
        .select('ruta_documento')
        .eq('id', facturaId)
        .eq('hotel_id', payload.hotel_id)
        .single();

      if (factura?.ruta_documento) {
        const { data: fileData } = await sb.storage
          .from('documentos')
          .download(factura.ruta_documento);
        if (fileData) {
          const buffer = await fileData.arrayBuffer();
          documentoBase64 = btoa(
            String.fromCharCode(...new Uint8Array(buffer))
          );
          documentoMime = factura.ruta_documento.endsWith('.pdf')
            ? 'application/pdf'
            : 'image/jpeg';
        }
      }

      if (!documentoBase64) {
        errores.push('No se pudo descargar documento de storage');
        return buildResult({
          facturaId, estado: EstadoFactura.RevisionManual,
          discrepanciasCount, mensajesRedactados,
          totalTokensIn, totalTokensOut, errores, start,
        });
      }
    } else {
      // Run collector
      let collectorResult;
      try {
        collectorResult = await runCollector({
          hotelId: payload.hotel_id,
          emailRaw: payload.email_raw,
          documentoBase64: payload.documento_base64,
          documentoMime: payload.documento_mime,
          documentoNombre: payload.documento_nombre,
        }, deps);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errores.push(`Collector fallo: ${msg}`);
        await safeEnqueue(payload.hotel_id, 'collector', payload, msg);
        return buildResult({
          facturaId: null, estado: null,
          discrepanciasCount, mensajesRedactados,
          totalTokensIn, totalTokensOut, errores, start,
        });
      }

      totalTokensIn += collectorResult.tokensInput;
      totalTokensOut += collectorResult.tokensOutput;

      if (collectorResult.error && !collectorResult.facturaId) {
        errores.push(collectorResult.error);
        return buildResult({
          facturaId: null, estado: collectorResult.estado,
          discrepanciasCount, mensajesRedactados,
          totalTokensIn, totalTokensOut, errores, start,
        });
      }

      facturaId = collectorResult.facturaId;
      estado = collectorResult.estado;

      // Get the document for OCR
      documentoBase64 = payload.documento_base64;
      documentoMime = payload.documento_mime;

      // If from email, download from storage
      if (!documentoBase64 && collectorResult.rutaDocumento) {
        const { data: fileData } = await sb.storage
          .from('documentos')
          .download(collectorResult.rutaDocumento);
        if (fileData) {
          const buffer = await fileData.arrayBuffer();
          documentoBase64 = btoa(
            String.fromCharCode(...new Uint8Array(buffer))
          );
          documentoMime = collectorResult.rutaDocumento.endsWith('.pdf')
            ? 'application/pdf'
            : 'image/jpeg';
        }
      }
    }

    if (!facturaId) {
      errores.push('No se creo registro de factura');
      return buildResult({
        facturaId, estado,
        discrepanciasCount, mensajesRedactados,
        totalTokensIn, totalTokensOut, errores, start,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODULO 2: OCR — Extraer datos estructurados
    // ═══════════════════════════════════════════════════════════════════════

    if (!documentoBase64 || !documentoMime) {
      errores.push('Sin documento para OCR');
      return buildResult({
        facturaId, estado: EstadoFactura.RevisionManual,
        discrepanciasCount, mensajesRedactados,
        totalTokensIn, totalTokensOut, errores, start,
      });
    }

    let ocrResult;
    try {
      ocrResult = await runOcr({
        hotelId: payload.hotel_id,
        facturaId,
        documentoBase64,
        documentoMime,
      }, deps);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errores.push(`OCR fallo: ${msg}`);
      await safeEnqueue(payload.hotel_id, 'ocr', {
        hotel_id: payload.hotel_id, factura_id: facturaId,
      }, msg);
      return buildResult({
        facturaId, estado: EstadoFactura.RevisionManual,
        discrepanciasCount, mensajesRedactados,
        totalTokensIn, totalTokensOut, errores, start,
      });
    }

    totalTokensIn += ocrResult.tokensInput;
    totalTokensOut += ocrResult.tokensOutput;
    estado = ocrResult.estado;

    if (ocrResult.error) {
      errores.push(ocrResult.error);
    }

    // If OCR sent to manual review, stop pipeline here
    if (estado === EstadoFactura.RevisionManual) {
      return buildResult({
        facturaId, estado,
        discrepanciasCount, mensajesRedactados,
        totalTokensIn, totalTokensOut, errores, start,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODULO 3: RECONCILER — Conciliar con albaranes
    // ═══════════════════════════════════════════════════════════════════════

    let reconcilerResult;
    try {
      reconcilerResult = await runReconciler({
        hotelId: payload.hotel_id,
        facturaId,
      }, deps);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errores.push(`Reconciler fallo: ${msg}`);
      await safeEnqueue(payload.hotel_id, 'reconciler', {
        hotel_id: payload.hotel_id, factura_id: facturaId,
      }, msg);
      return buildResult({
        facturaId, estado: EstadoFactura.RevisionManual,
        discrepanciasCount, mensajesRedactados,
        totalTokensIn, totalTokensOut, errores, start,
      });
    }

    totalTokensIn += reconcilerResult.tokensInput;
    totalTokensOut += reconcilerResult.tokensOutput;
    estado = reconcilerResult.estado;
    discrepanciasCount = reconcilerResult.discrepanciasInsertadas;

    if (reconcilerResult.error) {
      errores.push(reconcilerResult.error);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODULO 4: MESSENGER — Redactar mensajes para discrepancias
    // ═══════════════════════════════════════════════════════════════════════

    if (discrepanciasCount > 0) {
      // Load discrepancy IDs that need messages
      const { data: openDiscs } = await sb
        .from('discrepancias_clara')
        .select('id')
        .eq('factura_id', facturaId)
        .eq('hotel_id', payload.hotel_id)
        .eq('estado', 'abierta')
        .is('mensaje_proveedor', null);

      if (openDiscs && openDiscs.length > 0) {
        for (const disc of openDiscs) {
          try {
            const msgResult = await runMessenger({
              hotelId: payload.hotel_id,
              discrepanciaId: disc.id,
            }, deps);

            totalTokensIn += msgResult.tokensInput;
            totalTokensOut += msgResult.tokensOutput;

            if (msgResult.mensajeRedactado) {
              mensajesRedactados++;
            }
            if (msgResult.error) {
              errores.push(`Messenger (${disc.id}): ${msgResult.error}`);
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            errores.push(`Messenger fallo (${disc.id}): ${msg}`);
            // Don't enqueue — non-critical, can retry later
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LOG FINAL
    // ═══════════════════════════════════════════════════════════════════════

    return buildResult({
      facturaId, estado,
      discrepanciasCount, mensajesRedactados,
      totalTokensIn, totalTokensOut, errores, start,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errores.push(`Error fatal: ${msg}`);
    return buildResult({
      facturaId, estado: EstadoFactura.RevisionManual,
      discrepanciasCount, mensajesRedactados,
      totalTokensIn, totalTokensOut, errores, start,
    });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface BuildResultParams {
  facturaId: string | null;
  estado: EstadoFactura | null;
  discrepanciasCount: number;
  mensajesRedactados: number;
  totalTokensIn: number;
  totalTokensOut: number;
  errores: string[];
  start: number;
}

function buildResult(p: BuildResultParams): ClaraResult {
  return {
    success: p.errores.length === 0,
    factura_id: p.facturaId,
    estado: p.estado,
    discrepancias_count: p.discrepanciasCount,
    mensajes_redactados: p.mensajesRedactados,
    tokens_input: p.totalTokensIn,
    tokens_output: p.totalTokensOut,
    coste_usd: estimateCost(p.totalTokensIn, p.totalTokensOut),
    duration_ms: Date.now() - p.start,
    errores: p.errores,
  };
}

async function safeEnqueue(
  hotelId: string,
  modulo: string,
  payload: Record<string, unknown>,
  error: string
): Promise<void> {
  try {
    await enqueueRetry(hotelId, modulo, payload, error);
  } catch (e) {
    console.error('Failed to enqueue retry:', e);
  }
}
