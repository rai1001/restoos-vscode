// Shared utilities for CulinaryOS agents
// Designed for Supabase Edge Functions (Deno) but portable to Node.js

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AgentLog, GeminiResponse } from './types.ts';

// ─── Supabase Client ────────────────────────────────────────────────────────

export function getSupabaseClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

// ─── Gemini Client ──────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiCallOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Record<string, unknown>;
  image?: { base64: string; mimeType: string }; // For Vision
}

interface GeminiResult {
  text: string;
  tokensInput: number;
  tokensOutput: number;
}

// COST_CHECKPOINT: Gemini API call
export async function callGemini(opts: GeminiCallOptions): Promise<GeminiResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

  const parts: Array<Record<string, unknown>> = [];

  if (opts.image) {
    parts.push({
      inlineData: { mimeType: opts.image.mimeType, data: opts.image.base64 }
    });
  }

  parts.push({ text: opts.prompt });

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.1,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
      responseMimeType: 'application/json',
    },
  };

  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  if (opts.responseSchema) {
    (body.generationConfig as Record<string, unknown>).responseSchema = opts.responseSchema;
  }

  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data: GeminiResponse = await res.json();

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const tokensInput = data.usageMetadata?.promptTokenCount ?? 0;
  const tokensOutput = data.usageMetadata?.candidatesTokenCount ?? 0;

  return { text, tokensInput, tokensOutput };
}

// ─── Agent Logger ───────────────────────────────────────────────────────────

export async function logAgent(
  supabase: SupabaseClient,
  log: AgentLog
): Promise<void> {
  const { error } = await supabase.from('agent_logs').insert(log);
  if (error) console.error('Failed to log agent:', error.message);
}

// ─── Retry Wrapper ──────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError!;
}

// ─── Tenant Guard ───────────────────────────────────────────────────────────

export function ensureHotelId(hotelId: unknown): string {
  if (typeof hotelId !== 'string' || hotelId.length < 10) {
    throw new Error('Missing or invalid hotel_id — tenant isolation required');
  }
  return hotelId;
}

// ─── Caller Hotel Authorization ─────────────────────────────────────────────

/**
 * Verifies that the caller's JWT is valid and that the authenticated user
 * has an active membership for the given hotel_id.
 *
 * Uses an anon-key client so Supabase validates the JWT via auth.getUser(),
 * then queries the memberships table with the service-role client to check
 * access (mirrors the DB-level has_hotel_access RPC).
 *
 * Throws on missing/invalid token or unauthorized access.
 */
export async function verifyCallerHotelAccess(
  req: Request,
  hotelId: string,
  serviceClient: SupabaseClient
): Promise<string> {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  const token = authHeader.replace('Bearer ', '');

  // Create a lightweight client with the anon key to validate the JWT
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!url || !anonKey) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');

  const anonClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) {
    throw new Error('Unauthorized — invalid or expired token');
  }

  // Check membership using the service-role client (bypasses RLS)
  const { data: membership, error: membershipError } = await serviceClient
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Membership check failed: ${membershipError.message}`);
  }

  if (!membership) {
    throw new Error('Forbidden — user does not have access to this hotel');
  }

  return user.id;
}

// ─── JSON Response Helper ───────────────────────────────────────────────────

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status);
}

// ─── Timer ──────────────────────────────────────────────────────────────────

export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
