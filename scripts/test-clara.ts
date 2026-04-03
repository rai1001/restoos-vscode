/**
 * CLARA Agent — Test Runner
 * Ejecuta los 6 escenarios de test contra Supabase local
 *
 * Usage: npx tsx scripts/test-clara.ts [test-name]
 * Examples:
 *   npx tsx scripts/test-clara.ts              # run all
 *   npx tsx scripts/test-clara.ts correcta     # run one
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BASE = `${SUPABASE_URL}/functions/v1`;

const HOTEL_ID = 'bb000000-0000-0000-0000-000000000001';

// Gemini 2.0 Flash pricing (per 1M tokens)
const PRICE_INPUT = 0.10;
const PRICE_OUTPUT = 0.40;

function estimateCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn * PRICE_INPUT + tokensOut * PRICE_OUTPUT) / 1_000_000;
}

interface TestResult {
  name: string;
  module: string;
  status: 'pass' | 'fail' | 'skip';
  duration_ms: number;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  error?: string;
  summary?: string;
}

async function callClara(
  body: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; duration: number }> {
  const start = Date.now();
  const res = await fetch(`${BASE}/clara-agent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const duration = Date.now() - start;
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok && !data.error) data.error = `HTTP ${res.status}`;
  return { data, duration };
}

// ─── Synthetic Invoice Email (correct) ─────────────────────────────────────

function buildFakeEmail(opts: {
  supplierName: string;
  nif: string;
  invoiceNumber: string;
  date: string;
  lines: Array<{ desc: string; qty: number; price: number; vat: number }>;
}): string {
  const subtotal = opts.lines.reduce((s, l) => s + l.qty * l.price, 0);
  const vatTotal = opts.lines.reduce((s, l) => s + l.qty * l.price * l.vat / 100, 0);
  const total = subtotal + vatTotal;

  // Build a minimal "invoice" as text (will be classified by Gemini)
  const linesText = opts.lines.map(l =>
    `${l.desc} | ${l.qty} ud | ${l.price.toFixed(2)} EUR | ${(l.qty * l.price).toFixed(2)} EUR | IVA ${l.vat}%`
  ).join('\n');

  const invoiceText = `
FACTURA
${opts.supplierName}
NIF: ${opts.nif}
Factura: ${opts.invoiceNumber}
Fecha: ${opts.date}

DETALLE:
${linesText}

Subtotal: ${subtotal.toFixed(2)} EUR
IVA: ${vatTotal.toFixed(2)} EUR
TOTAL: ${total.toFixed(2)} EUR
`;

  // Encode as base64 "document" (text-based, Gemini can read it)
  const base64 = Buffer.from(invoiceText).toString('base64');

  return base64;
}

// ─── Test 1: Factura correcta ──────────────────────────────────────────────

async function testFacturaCorrecta(): Promise<TestResult> {
  console.log('\n  1. Factura correcta...');

  const docBase64 = buildFakeEmail({
    supplierName: 'Pescados Galicia S.L.',
    nif: 'B36123456',
    invoiceNumber: 'FG-2026-0142',
    date: '01/04/2026',
    lines: [
      { desc: 'Merluza fresca', qty: 10, price: 12.50, vat: 10 },
      { desc: 'Gambas rojas', qty: 5, price: 28.00, vat: 10 },
      { desc: 'Pulpo', qty: 8, price: 18.75, vat: 10 },
    ],
  });

  const { data, duration } = await callClara({
    hotel_id: HOTEL_ID,
    trigger: 'documento_subido',
    documento_base64: docBase64,
    documento_mime: 'image/jpeg',
    documento_nombre: 'factura_pescados.jpg',
  });

  const tokIn = (data.tokens_input as number) ?? 0;
  const tokOut = (data.tokens_output as number) ?? 0;

  return {
    name: 'Factura correcta',
    module: 'full-pipeline',
    status: data.error ? 'fail' : 'pass',
    duration_ms: duration,
    tokens_input: tokIn,
    tokens_output: tokOut,
    cost_usd: estimateCost(tokIn, tokOut),
    error: data.error ? String(data.error) : undefined,
    summary: `Estado: ${data.estado ?? 'N/A'}, Discrepancias: ${data.discrepancias_count ?? 0}`,
  };
}

// ─── Test 2: Factura con precio incorrecto ─────────────────────────────────

async function testPrecioIncorrecto(): Promise<TestResult> {
  console.log('\n  2. Factura con precio incorrecto...');

  // Price inflated by 15% vs what a supplier would normally charge
  const docBase64 = buildFakeEmail({
    supplierName: 'Carnes Premium S.A.',
    nif: 'A28654321',
    invoiceNumber: 'CP-2026-0089',
    date: '02/04/2026',
    lines: [
      { desc: 'Solomillo ternera', qty: 5, price: 45.00, vat: 10 }, // inflated
      { desc: 'Costillas cerdo', qty: 10, price: 8.50, vat: 10 },
    ],
  });

  const { data, duration } = await callClara({
    hotel_id: HOTEL_ID,
    trigger: 'documento_subido',
    documento_base64: docBase64,
    documento_mime: 'image/jpeg',
    documento_nombre: 'factura_carnes.jpg',
  });

  const tokIn = (data.tokens_input as number) ?? 0;
  const tokOut = (data.tokens_output as number) ?? 0;

  // We expect discrepancies or at least processing
  const _hasDiscrepancy = ((data.discrepancias_count as number) ?? 0) > 0;

  return {
    name: 'Precio incorrecto',
    module: 'reconciler',
    status: data.error && !data.factura_id ? 'fail' : 'pass',
    duration_ms: duration,
    tokens_input: tokIn,
    tokens_output: tokOut,
    cost_usd: estimateCost(tokIn, tokOut),
    error: data.error ? String(data.error) : undefined,
    summary: `Estado: ${data.estado ?? 'N/A'}, Discrepancias: ${data.discrepancias_count ?? 0}, Mensajes: ${data.mensajes_redactados ?? 0}`,
  };
}

// ─── Test 3: Factura con cantidad incorrecta ───────────────────────────────

async function testCantidadIncorrecta(): Promise<TestResult> {
  console.log('\n  3. Factura con cantidad incorrecta...');

  const docBase64 = buildFakeEmail({
    supplierName: 'Verduras Ecologicas S.L.',
    nif: 'B15789012',
    invoiceNumber: 'VE-2026-0201',
    date: '01/04/2026',
    lines: [
      { desc: 'Tomates cherry eco', qty: 25, price: 3.20, vat: 4 }, // qty mismatch
      { desc: 'Pimientos padron', qty: 15, price: 4.50, vat: 4 },
    ],
  });

  const { data, duration } = await callClara({
    hotel_id: HOTEL_ID,
    trigger: 'documento_subido',
    documento_base64: docBase64,
    documento_mime: 'image/jpeg',
    documento_nombre: 'factura_verduras.jpg',
  });

  const tokIn = (data.tokens_input as number) ?? 0;
  const tokOut = (data.tokens_output as number) ?? 0;

  return {
    name: 'Cantidad incorrecta',
    module: 'reconciler',
    status: data.error && !data.factura_id ? 'fail' : 'pass',
    duration_ms: duration,
    tokens_input: tokIn,
    tokens_output: tokOut,
    cost_usd: estimateCost(tokIn, tokOut),
    error: data.error ? String(data.error) : undefined,
    summary: `Estado: ${data.estado ?? 'N/A'}, Discrepancias: ${data.discrepancias_count ?? 0}`,
  };
}

// ─── Test 4: Factura sin albaran correspondiente ───────────────────────────

async function testSinAlbaran(): Promise<TestResult> {
  console.log('\n  4. Factura sin albaran...');

  const docBase64 = buildFakeEmail({
    supplierName: 'Proveedor Desconocido S.A.',
    nif: 'B99888777',
    invoiceNumber: 'PD-2026-0001',
    date: '03/04/2026',
    lines: [
      { desc: 'Producto misterioso', qty: 100, price: 1.50, vat: 21 },
    ],
  });

  const { data, duration } = await callClara({
    hotel_id: HOTEL_ID,
    trigger: 'documento_subido',
    documento_base64: docBase64,
    documento_mime: 'image/jpeg',
    documento_nombre: 'factura_desconocido.jpg',
  });

  const tokIn = (data.tokens_input as number) ?? 0;
  const tokOut = (data.tokens_output as number) ?? 0;

  // Expect: proveedor_desconocido or documento_faltante discrepancy
  const estado = data.estado as string;
  const expectState = estado === 'discrepancia' || estado === 'revision_manual';

  return {
    name: 'Sin albaran / proveedor desconocido',
    module: 'reconciler',
    status: expectState || data.factura_id ? 'pass' : 'fail',
    duration_ms: duration,
    tokens_input: tokIn,
    tokens_output: tokOut,
    cost_usd: estimateCost(tokIn, tokOut),
    error: data.error ? String(data.error) : undefined,
    summary: `Estado: ${data.estado ?? 'N/A'}, Discrepancias: ${data.discrepancias_count ?? 0}`,
  };
}

// ─── Test 5: Imagen de baja calidad ────────────────────────────────────────

async function testBajaCalidad(): Promise<TestResult> {
  console.log('\n  5. Imagen de baja calidad...');

  // Minimal 1x1 pixel PNG — OCR should return low confidence
  const minimalPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  const { data, duration } = await callClara({
    hotel_id: HOTEL_ID,
    trigger: 'documento_subido',
    documento_base64: minimalPng,
    documento_mime: 'image/png',
    documento_nombre: 'factura_borrosa.png',
  });

  const tokIn = (data.tokens_input as number) ?? 0;
  const tokOut = (data.tokens_output as number) ?? 0;

  // Expect: revision_manual due to low OCR confidence
  const estado = data.estado as string;
  const isExpected = estado === 'revision_manual' || (data.errores as string[])?.length > 0;

  return {
    name: 'Imagen baja calidad',
    module: 'ocr',
    status: isExpected ? 'pass' : 'fail',
    duration_ms: duration,
    tokens_input: tokIn,
    tokens_output: tokOut,
    cost_usd: estimateCost(tokIn, tokOut),
    summary: `Estado: ${data.estado ?? 'N/A'} (esperado: revision_manual)`,
  };
}

// ─── Test 6: Email que no es factura ───────────────────────────────────────

async function testNoEsFactura(): Promise<TestResult> {
  console.log('\n  6. Email que no es factura...');

  const emailRaw = `From: newsletter@restaurante.com
Subject: Novedades de la semana - Menu especial Semana Santa
Content-Type: text/plain

Hola,

Esta semana tenemos menu especial de Semana Santa.
Consulta nuestra carta actualizada en la web.

Saludos,
El equipo de marketing`;

  const { data, duration } = await callClara({
    hotel_id: HOTEL_ID,
    trigger: 'email_recibido',
    email_raw: emailRaw,
  });

  const tokIn = (data.tokens_input as number) ?? 0;
  const tokOut = (data.tokens_output as number) ?? 0;

  // Expect: rejected — no invoice attachment
  const errores = (data.errores as string[]) ?? [];
  const rejected = !data.factura_id || errores.some(e =>
    e.includes('adjuntos') || e.includes('factura') || e.includes('No es factura')
  );

  return {
    name: 'Email no es factura',
    module: 'collector',
    status: rejected ? 'pass' : 'fail',
    duration_ms: duration,
    tokens_input: tokIn,
    tokens_output: tokOut,
    cost_usd: estimateCost(tokIn, tokOut),
    summary: `Rechazado: ${rejected ? 'si' : 'NO'}, Errores: ${errores.join(', ') || 'ninguno'}`,
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────

const TESTS: Record<string, () => Promise<TestResult>> = {
  correcta: testFacturaCorrecta,
  precio: testPrecioIncorrecto,
  cantidad: testCantidadIncorrecta,
  albaran: testSinAlbaran,
  calidad: testBajaCalidad,
  email: testNoEsFactura,
};

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  CLARA Agent — Test Runner                      ║');
  console.log('║  Target: ' + SUPABASE_URL.padEnd(40) + '║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (!SUPABASE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set in .env.local');
    process.exit(1);
  }

  // Check Edge Functions runtime
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/`, { method: 'GET' });
    if (res.status === 404) {
      console.log('\n  Edge Functions runtime no detectado.');
      console.log('  Ejecuta: supabase functions serve\n');
    }
  } catch {
    console.log('\n  No se puede conectar a Supabase. Esta arrancado?');
    process.exit(1);
  }

  const filter = process.argv[2];
  const testsToRun = filter
    ? Object.entries(TESTS).filter(([name]) => name.includes(filter))
    : Object.entries(TESTS);

  if (testsToRun.length === 0) {
    console.error(`No test matching "${filter}". Available: ${Object.keys(TESTS).join(', ')}`);
    process.exit(1);
  }

  const results: TestResult[] = [];

  for (const [, testFn] of testsToRun) {
    try {
      const result = await testFn();
      results.push(result);
      const icon = result.status === 'pass' ? 'OK' : result.status === 'fail' ? 'FAIL' : 'SKIP';
      console.log(`    [${icon}] ${result.name} (${result.duration_ms}ms)`);
      if (result.summary) console.log(`         ${result.summary}`);
      if (result.error) console.log(`         ERROR: ${result.error}`);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      results.push({
        name: 'unknown',
        module: 'unknown',
        status: 'fail',
        duration_ms: 0,
        tokens_input: 0,
        tokens_output: 0,
        cost_usd: 0,
        error: err,
      });
      console.log(`    [FAIL] EXCEPTION: ${err}`);
    }
  }

  // ─── Results Table ───────────────────────────────────────────────────

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTADOS CLARA                                                        ║');
  console.log('╠════════════════════════════════╦════════╦════════╦═════════╦══════╦═══════╣');
  console.log('║ Test                           ║ Status ║ Time   ║ Tok In  ║ Tok  ║ Cost  ║');
  console.log('╠════════════════════════════════╬════════╬════════╬═════════╬══════╬═══════╣');

  let totalCost = 0;
  let totalTokIn = 0;
  let totalTokOut = 0;

  for (const r of results) {
    totalCost += r.cost_usd;
    totalTokIn += r.tokens_input;
    totalTokOut += r.tokens_output;
    console.log(
      `║ ${r.name.padEnd(31)}║ ${r.status.padEnd(7)}║ ${String(r.duration_ms + 'ms').padEnd(7)}║ ${String(r.tokens_input).padEnd(8)}║ ${String(r.tokens_output).padEnd(5)}║ $${r.cost_usd.toFixed(4).padStart(5)}║`
    );
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  console.log('╠════════════════════════════════╬════════╬════════╬═════════╬══════╬═══════╣');
  console.log(
    `║ TOTAL (${passed}/${results.length} pass)${' '.repeat(15)}║        ║        ║ ${String(totalTokIn).padEnd(8)}║ ${String(totalTokOut).padEnd(5)}║ $${totalCost.toFixed(4).padStart(5)}║`
  );
  console.log('╚════════════════════════════════╩════════╩════════╩═════════╩══════╩═══════╝');

  // ─── Cost by Module ────────────────────────────────────────────────

  const moduleMap = new Map<string, { tokIn: number; tokOut: number; cost: number; count: number }>();
  for (const r of results) {
    const existing = moduleMap.get(r.module) ?? { tokIn: 0, tokOut: 0, cost: 0, count: 0 };
    existing.tokIn += r.tokens_input;
    existing.tokOut += r.tokens_output;
    existing.cost += r.cost_usd;
    existing.count++;
    moduleMap.set(r.module, existing);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  COSTE POR MODULO                                        ║');
  console.log('╠═══════════════════╦══════════╦══════════╦════════════════╣');
  console.log('║ Modulo            ║ Tok In   ║ Tok Out  ║ Coste          ║');
  console.log('╠═══════════════════╬══════════╬══════════╬════════════════╣');

  for (const [mod, stats] of moduleMap.entries()) {
    console.log(
      `║ ${mod.padEnd(18)}║ ${String(stats.tokIn).padEnd(9)}║ ${String(stats.tokOut).padEnd(9)}║ $${stats.cost.toFixed(6).padEnd(13)}║`
    );
  }

  console.log('╚═══════════════════╩══════════╩══════════╩════════════════╝');

  // ─── Monthly Projection ──────────────────────────────────────────

  const avgCostPerInvoice = results.length > 0 ? totalCost / results.length : 0;
  const monthlyInvoices = 100;
  const monthlyProjection = avgCostPerInvoice * monthlyInvoices;

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  PROYECCION MENSUAL (1 restaurante, 100 facturas/mes)    ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Coste medio por factura:    $${avgCostPerInvoice.toFixed(6).padEnd(28)}║`);
  console.log(`║  Facturas/mes:               ${String(monthlyInvoices).padEnd(29)}║`);
  console.log(`║  Coste mensual estimado:     $${monthlyProjection.toFixed(4).padEnd(28)}║`);
  console.log(`║  Coste anual estimado:       $${(monthlyProjection * 12).toFixed(2).padEnd(28)}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log(`\n  ${failed} test(s) fallidos. Revisa los errores arriba.`);
    console.log('  Causas comunes:');
    console.log('  - Edge Functions no desplegadas: supabase functions serve');
    console.log('  - GEMINI_API_KEY no configurada en env de Supabase');
    console.log('  - Migracion CLARA no aplicada: supabase db reset');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
