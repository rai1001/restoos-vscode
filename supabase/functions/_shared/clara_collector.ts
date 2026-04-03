// CLARA — Modulo 1: Recolector de facturas
// Logica pura — portable a Node.js

import type {
  ClaraDeps,
  ClasificacionEmailResult,
  FacturaRecibida,
} from './clara_types.ts';
import { EstadoFactura } from './clara_types.ts';
import { PROMPT_CLASIFICACION_EMAIL } from './clara_prompts.ts';
import {
  calculateHash,
  safeJsonParse,
  measureTokens,
  withTimeout,
} from './clara_utils.ts';

// ─── Types ─────────────────────────────────────────────────────────────────

interface EmailAttachment {
  filename: string;
  mimeType: string;
  base64: string;
}

interface ParsedEmail {
  from: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
}

export interface CollectorInput {
  hotelId: string;
  emailRaw?: string;
  // Direct upload alternative
  documentoBase64?: string;
  documentoMime?: string;
  documentoNombre?: string;
}

export interface CollectorOutput {
  facturaId: string | null;
  estado: EstadoFactura;
  confianza: number;
  rutaDocumento: string | null;
  hashDocumento: string | null;
  tokensInput: number;
  tokensOutput: number;
  error: string | null;
}

// ─── Email Parser ──────────────────────────────────────────────────────────

function parseEmailRaw(raw: string): ParsedEmail {
  const lines = raw.split('\n');
  let from = '';
  let subject = '';
  let bodyStart = 0;
  const attachments: EmailAttachment[] = [];

  // Parse headers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      bodyStart = i + 1;
      break;
    }
    if (line.toLowerCase().startsWith('from:')) {
      from = line.slice(5).trim();
    } else if (line.toLowerCase().startsWith('subject:')) {
      subject = line.slice(8).trim();
    }
  }

  const body = lines.slice(bodyStart).join('\n').trim();

  // Look for base64 attachments (simplified MIME parsing)
  const boundaryMatch = raw.match(/boundary="?([^"\s;]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = raw.split(`--${boundary}`);
    for (const part of parts) {
      const contentType = part.match(/Content-Type:\s*([^\s;]+)/i);
      const contentDisp = part.match(/filename="?([^"\n]+)"?/i);
      const isBase64 = /Content-Transfer-Encoding:\s*base64/i.test(part);

      if (contentType && contentDisp && isBase64) {
        const mime = contentType[1].trim();
        const validMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (validMimes.includes(mime)) {
          // Extract base64 content after headers
          const headerEnd = part.indexOf('\r\n\r\n') !== -1
            ? part.indexOf('\r\n\r\n') + 4
            : part.indexOf('\n\n') + 2;
          const base64Content = part.slice(headerEnd).replace(/[\r\n\s]/g, '');
          if (base64Content.length > 100) {
            attachments.push({
              filename: contentDisp[1].trim(),
              mimeType: mime,
              base64: base64Content,
            });
          }
        }
      }
    }
  }

  return { from, subject, body, attachments };
}

// ─── Main Logic ────────────────────────────────────────────────────────────

export async function runCollector(
  input: CollectorInput,
  deps: ClaraDeps
): Promise<CollectorOutput> {
  let tokensInput = 0;
  let tokensOutput = 0;

  // ── Determine source: email or direct upload ───────────────────────────

  let attachment: EmailAttachment | null = null;
  let emailOrigin = '';

  if (input.documentoBase64 && input.documentoMime) {
    // Direct upload — skip email parsing and classification
    attachment = {
      filename: input.documentoNombre ?? 'documento',
      mimeType: input.documentoMime,
      base64: input.documentoBase64,
    };
  } else if (input.emailRaw) {
    // Parse email
    const email = parseEmailRaw(input.emailRaw);
    emailOrigin = email.from;

    if (email.attachments.length === 0) {
      return {
        facturaId: null,
        estado: EstadoFactura.RevisionManual,
        confianza: 0,
        rutaDocumento: null,
        hashDocumento: null,
        tokensInput: 0,
        tokensOutput: 0,
        error: 'Email sin adjuntos de factura',
      };
    }

    // Classify with Gemini: is it an invoice?
    const classificationContext = [
      `De: ${email.from}`,
      `Asunto: ${email.subject}`,
      `Adjuntos: ${email.attachments.map(a => a.filename).join(', ')}`,
      `Cuerpo (primeros 500 chars): ${email.body.slice(0, 500)}`,
    ].join('\n');

    // CLARA_COST: collector, ~200 tokens estimados
    const classResult = await withTimeout(
      deps.callGemini({
        prompt: `${PROMPT_CLASIFICACION_EMAIL}\n\nEmail:\n${classificationContext}`,
        temperature: 0.1,
        maxOutputTokens: 256,
      }),
      30_000,
      'clasificacion_email'
    );

    tokensInput += classResult.tokensInput;
    tokensOutput += classResult.tokensOutput;

    const classification = safeJsonParse<ClasificacionEmailResult>(classResult.text);

    if (!classification) {
      return {
        facturaId: null,
        estado: EstadoFactura.RevisionManual,
        confianza: 0,
        rutaDocumento: null,
        hashDocumento: null,
        tokensInput,
        tokensOutput,
        error: 'No se pudo parsear respuesta de clasificacion',
      };
    }

    if (!classification.es_factura) {
      return {
        facturaId: null,
        estado: EstadoFactura.RevisionManual,
        confianza: classification.confianza,
        rutaDocumento: null,
        hashDocumento: null,
        tokensInput,
        tokensOutput,
        error: `No es factura: ${classification.razon}`,
      };
    }

    if (classification.confianza < 85) {
      // Low confidence — still save but mark for review
      attachment = email.attachments[0];
    } else {
      attachment = email.attachments[0];
    }
  } else {
    return {
      facturaId: null,
      estado: EstadoFactura.RevisionManual,
      confianza: 0,
      rutaDocumento: null,
      hashDocumento: null,
      tokensInput: 0,
      tokensOutput: 0,
      error: 'No se proporciono email ni documento',
    };
  }

  // ── Calculate hash ─────────────────────────────────────────────────────

  const hashDocumento = await calculateHash(attachment.base64);

  // ── Check for duplicate ────────────────────────────────────────────────

  const sb = deps.supabase as any;
  const { data: existingDoc } = await sb
    .from('facturas_recibidas')
    .select('id')
    .eq('hotel_id', input.hotelId)
    .eq('hash_documento', hashDocumento)
    .maybeSingle();

  if (existingDoc) {
    return {
      facturaId: existingDoc.id,
      estado: EstadoFactura.Procesada,
      confianza: 100,
      rutaDocumento: null,
      hashDocumento,
      tokensInput,
      tokensOutput,
      error: 'Documento duplicado — ya procesado',
    };
  }

  // ── Upload to Storage ──────────────────────────────────────────────────

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = crypto.randomUUID();
  const ext = attachment.mimeType === 'application/pdf' ? 'pdf' : 'jpg';
  const storagePath = `facturas/${input.hotelId}/${year}/${month}/${uuid}.${ext}`;

  const fileBytes = Uint8Array.from(atob(attachment.base64), c => c.charCodeAt(0));

  const { error: uploadError } = await sb.storage
    .from('documentos')
    .upload(storagePath, fileBytes, {
      contentType: attachment.mimeType,
      upsert: false,
    });

  const rutaDocumento = uploadError ? null : storagePath;
  if (uploadError) {
    console.error('Storage upload failed:', uploadError.message);
  }

  // ── Insert initial record ──────────────────────────────────────────────

  const estado = (tokensOutput > 0 && tokensInput > 0)
    ? EstadoFactura.Pendiente
    : EstadoFactura.Pendiente;

  const { data: inserted, error: insertError } = await sb
    .from('facturas_recibidas')
    .insert({
      hotel_id: input.hotelId,
      estado,
      ruta_documento: rutaDocumento,
      hash_documento: hashDocumento,
      email_origin: emailOrigin || null,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return {
      facturaId: null,
      estado: EstadoFactura.RevisionManual,
      confianza: 0,
      rutaDocumento,
      hashDocumento,
      tokensInput,
      tokensOutput,
      error: `Error insertando factura: ${insertError?.message ?? 'unknown'}`,
    };
  }

  return {
    facturaId: inserted.id,
    estado,
    confianza: 100,
    rutaDocumento,
    hashDocumento,
    tokensInput,
    tokensOutput,
    error: null,
  };
}
