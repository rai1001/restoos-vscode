/**
 * CLARA — Test con factura real (imagen PNG)
 * Envia la factura generada por generate-test-invoice.ts al pipeline CLARA completo
 *
 * Usage: npx tsx scripts/test-clara-real.ts
 * Requires: supabase functions serve (running)
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BASE = `${SUPABASE_URL}/functions/v1`;
const HOTEL_ID = 'bb000000-0000-0000-0000-000000000001';

const PRICE_INPUT = 0.10;
const PRICE_OUTPUT = 0.40;

function estimateCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn * PRICE_INPUT + tokensOut * PRICE_OUTPUT) / 1_000_000;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  CLARA — Test con factura real (imagen PNG)          ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  if (!SUPABASE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  // Load real invoice image
  const invoicePath = join(__dirname, 'fixtures', 'factura-test.png');
  let imageBase64: string;
  try {
    const buffer = readFileSync(invoicePath);
    imageBase64 = buffer.toString('base64');
    console.log(`\n  Factura cargada: ${invoicePath}`);
    console.log(`  Tamano: ${(buffer.length / 1024).toFixed(1)} KB`);
    console.log(`  Base64: ${(imageBase64.length / 1024).toFixed(1)} KB`);
  } catch {
    console.error(`\n  No se encuentra ${invoicePath}`);
    console.error('  Ejecuta primero: npx tsx scripts/generate-test-invoice.ts');
    process.exit(1);
  }

  // ── Test: Full pipeline with real invoice image ──────────────────────

  console.log('\n  Enviando a CLARA (pipeline completo)...\n');
  const start = Date.now();

  const res = await fetch(`${BASE}/clara-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      hotel_id: HOTEL_ID,
      trigger: 'documento_subido',
      documento_base64: imageBase64,
      documento_mime: 'image/png',
      documento_nombre: 'factura-pescados-galicia.png',
    }),
  });

  const duration = Date.now() - start;
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

  // ── Results ──────────────────────────────────────────────────────────

  const tokIn = (data.tokens_input as number) ?? 0;
  const tokOut = (data.tokens_output as number) ?? 0;
  const cost = estimateCost(tokIn, tokOut);

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  RESULTADO                                          ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Estado:              ${String(data.estado ?? 'N/A').padEnd(29)}║`);
  console.log(`║  Factura ID:          ${String(data.factura_id ?? 'N/A').padEnd(29)}║`);
  console.log(`║  Discrepancias:       ${String(data.discrepancias_count ?? 0).padEnd(29)}║`);
  console.log(`║  Mensajes redactados: ${String(data.mensajes_redactados ?? 0).padEnd(29)}║`);
  console.log(`║  Duracion:            ${String(duration + 'ms').padEnd(29)}║`);
  console.log(`║  Tokens input:        ${String(tokIn).padEnd(29)}║`);
  console.log(`║  Tokens output:       ${String(tokOut).padEnd(29)}║`);
  console.log(`║  Coste:               $${cost.toFixed(6).padEnd(28)}║`);
  console.log('╚══════════════════════════════════════════════════════╝');

  if (data.errores && (data.errores as string[]).length > 0) {
    console.log('\n  Errores:');
    for (const e of data.errores as string[]) {
      console.log(`    - ${e}`);
    }
  }

  // ── Monthly Projection ───────────────────────────────────────────────

  if (tokIn > 0) {
    const monthly100 = cost * 100;
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║  PROYECCION MENSUAL (100 facturas/mes)              ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  Coste por factura:   $${cost.toFixed(6).padEnd(28)}║`);
    console.log(`║  100 facturas/mes:    $${monthly100.toFixed(4).padEnd(28)}║`);
    console.log(`║  Anual (1 restaurante): $${(monthly100 * 12).toFixed(2).padEnd(26)}║`);
    console.log(`║  Anual (10 restaurantes): $${(monthly100 * 12 * 10).toFixed(2).padEnd(24)}║`);
    console.log('╚══════════════════════════════════════════════════════╝');
  }

  // ── Raw response (debug) ─────────────────────────────────────────────

  console.log('\n  Response completa:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
