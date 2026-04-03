// CLARA — Utilidades compartidas
// Complementa _shared/utils.ts con funciones especificas de CLARA

import { getSupabaseClient } from './utils.ts';
import { EstadoRetry } from './clara_types.ts';

// ─── SHA-256 Hash ──────────────────────────────────────────────────────────

export async function calculateHash(data: string | ArrayBuffer): Promise<string> {
  const buffer = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Token Estimation ──────────────────────────────────────────────────────
// Estimacion rapida: ~4 chars por token para texto espanol
// Para imagenes Gemini cobra ~258 tokens por imagen base

export function measureTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function measureImageTokens(base64Length: number): number {
  // Gemini Vision: ~258 tokens base + proporcional al tamano
  return 258 + Math.ceil(base64Length / 750);
}

// ─── Gemini Pricing ────────────────────────────────────────────────────────

const PRICE_INPUT_PER_M = 0.10;
const PRICE_OUTPUT_PER_M = 0.40;

export function estimateCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn * PRICE_INPUT_PER_M + tokensOut * PRICE_OUTPUT_PER_M) / 1_000_000;
}

// ─── Retry with Backoff ────────────────────────────────────────────────────

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError!;
}

// ─── Enqueue Retry ─────────────────────────────────────────────────────────

export async function enqueueRetry(
  hotelId: string,
  modulo: string,
  payload: Record<string, unknown>,
  error: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const nextRetry = new Date(Date.now() + 60_000); // 1 min
  const { error: insertError } = await supabase
    .from('clara_retry_queue')
    .insert({
      hotel_id: hotelId,
      modulo,
      payload,
      intentos: 1,
      ultimo_error: error,
      estado: EstadoRetry.Pendiente,
      proximo_intento: nextRetry.toISOString(),
    });
  if (insertError) {
    console.error('Failed to enqueue retry:', insertError.message);
  }
}

// ─── NIF Validation (Spanish) ──────────────────────────────────────────────

export function isValidNif(nif: string): boolean {
  if (!nif || typeof nif !== 'string') return false;
  const cleaned = nif.replace(/[\s.\-/]/g, '').toUpperCase();
  if (/^\d{8}[A-Z]$/.test(cleaned)) return true;
  if (/^[XYZ]\d{7}[A-Z]$/.test(cleaned)) return true;
  if (/^[ABCDEFGHJKLMNPQRSUVW]\d{8}$/.test(cleaned)) return true;
  if (/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[A-J0-9]$/.test(cleaned)) return true;
  return false;
}

// ─── Parse Spanish Date ────────────────────────────────────────────────────

export function parseSpanishDate(dateStr: string): string | null {
  if (!dateStr) return null;
  // DD/MM/YYYY → YYYY-MM-DD
  const match = dateStr.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

// ─── Safe JSON Parse ───────────────────────────────────────────────────────

export function safeJsonParse<T>(text: string): T | null {
  try {
    // Gemini sometimes wraps JSON in markdown code blocks
    const cleaned = text.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ─── Timeout wrapper ───────────────────────────────────────────────────────

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout ${label}: ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}
