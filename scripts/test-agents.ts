/**
 * Test runner for CulinaryOS AI Agents
 * Executes each agent against synthetic data in local Supabase
 *
 * Usage: npx tsx scripts/test-agents.ts [agent-name]
 * Examples:
 *   npx tsx scripts/test-agents.ts              # run all
 *   npx tsx scripts/test-agents.ts escandallo    # run one
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BASE = `${SUPABASE_URL}/functions/v1`;

interface TestResult {
  agent: string;
  status: 'pass' | 'fail' | 'skip';
  duration_ms: number;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
  error?: string;
  summary?: string;
}

const HOTEL_ID = 'bb000000-0000-0000-0000-000000000001';

// Gemini 2.0 Flash pricing (per 1M tokens)
const PRICE_INPUT = 0.10;   // $0.10 per 1M input tokens
const PRICE_OUTPUT = 0.40;  // $0.40 per 1M output tokens

function estimateCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn * PRICE_INPUT + tokensOut * PRICE_OUTPUT) / 1_000_000;
}

async function callAgent(
  name: string,
  body: Record<string, unknown>
): Promise<{ data: Record<string, unknown>; duration: number }> {
  const start = Date.now();
  const res = await fetch(`${BASE}/agent-${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const duration = Date.now() - start;
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

  if (!res.ok && !data.error) {
    data.error = `HTTP ${res.status}`;
  }

  return { data, duration };
}

// ─── Test: Escandallo ───────────────────────────────────────────────────────

async function testEscandallo(): Promise<TestResult> {
  console.log('\n📊 Testing agent-escandallo...');

  // Use a known product from seed data
  const productId = '5eed0000-0002-0000-0000-000000000001'; // First synthetic product

  const { data, duration } = await callAgent('escandallo', {
    hotel_id: HOTEL_ID,
    product_id: productId,
    old_price: 18.50,
    new_price: 22.00,
    margin_threshold: 30,
  });

  if (data.error) {
    return { agent: 'escandallo', status: 'fail', duration_ms: duration, error: String(data.error) };
  }

  const tokensIn = (data.tokens_input as number) ?? 0;
  const tokensOut = (data.tokens_output as number) ?? 0;

  return {
    agent: 'escandallo',
    status: 'pass',
    duration_ms: duration,
    tokens_input: tokensIn,
    tokens_output: tokensOut,
    cost_usd: estimateCost(tokensIn, tokensOut),
    summary: `${(data.updated_count ?? 0)} recipes updated, ${(data.alerts_created ?? 0)} alerts`,
  };
}

// ─── Test: Menu Engineering ─────────────────────────────────────────────────

async function testMenuEngineering(): Promise<TestResult> {
  console.log('\n📈 Testing agent-menu-engineering...');

  const { data, duration } = await callAgent('menu-engineering', {
    hotel_id: HOTEL_ID,
    period_days: 30,
  });

  if (data.error) {
    return { agent: 'menu-engineering', status: 'fail', duration_ms: duration, error: String(data.error) };
  }

  const tokensIn = (data.tokens_input as number) ?? 0;
  const tokensOut = (data.tokens_output as number) ?? 0;

  return {
    agent: 'menu-engineering',
    status: 'pass',
    duration_ms: duration,
    tokens_input: tokensIn,
    tokens_output: tokensOut,
    cost_usd: estimateCost(tokensIn, tokensOut),
    summary: `${(data.dishes_classified ?? 0)} dishes classified`,
  };
}

// ─── Test: OCR ──────────────────────────────────────────────────────────────

async function testOcr(): Promise<TestResult> {
  console.log('\n🔍 Testing agent-ocr...');

  // Create a minimal test "invoice" as a tiny white PNG with text
  // In real usage this would be a photo of an actual invoice
  // For testing, we send a minimal base64 PNG and expect low confidence
  const minimalPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  const { data, duration } = await callAgent('ocr', {
    hotel_id: HOTEL_ID,
    image_base64: minimalPng,
    mime_type: 'image/png',
  });

  if (data.error) {
    // Low confidence or extraction failure is expected with a 1px PNG
    const isExpectedFailure = String(data.error).includes('confidence') ||
      String(data.error).includes('extract') ||
      String(data.error).includes('campo');
    return {
      agent: 'ocr',
      status: isExpectedFailure ? 'pass' : 'fail',
      duration_ms: duration,
      tokens_input: (data.tokens_input as number) ?? 0,
      tokens_output: (data.tokens_output as number) ?? 0,
      cost_usd: estimateCost((data.tokens_input as number) ?? 500, (data.tokens_output as number) ?? 200),
      error: isExpectedFailure ? undefined : String(data.error),
      summary: isExpectedFailure ? 'Correctly rejected invalid image (expected)' : undefined,
    };
  }

  const tokensIn = (data.tokens_input as number) ?? 0;
  const tokensOut = (data.tokens_output as number) ?? 0;

  return {
    agent: 'ocr',
    status: 'pass',
    duration_ms: duration,
    tokens_input: tokensIn,
    tokens_output: tokensOut,
    cost_usd: estimateCost(tokensIn, tokensOut),
    summary: `${(data.discrepancies as unknown[])?.length ?? 0} discrepancies found`,
  };
}

// ─── Test: APPCC ────────────────────────────────────────────────────────────

async function testAppcc(): Promise<TestResult> {
  console.log('\n🌡️ Testing agent-appcc...');

  // Use yesterday (should have check_records from synthetic data)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const { data, duration } = await callAgent('appcc', {
    hotel_id: HOTEL_ID,
    target_date: dateStr,
  });

  if (data.error) {
    return { agent: 'appcc', status: 'fail', duration_ms: duration, error: String(data.error) };
  }

  const tokensIn = (data.tokens_input as number) ?? 0;
  const tokensOut = (data.tokens_output as number) ?? 0;

  return {
    agent: 'appcc',
    status: 'pass',
    duration_ms: duration,
    tokens_input: tokensIn,
    tokens_output: tokensOut,
    cost_usd: estimateCost(tokensIn, tokensOut),
    summary: `${(data.total_checks ?? 0)} checks, ${(data.anomalies ?? 0)} anomalies, hash: ${String(data.hash ?? '').slice(0, 8)}...`,
  };
}

// ─── Test: Inventario ───────────────────────────────────────────────────────

async function testInventario(): Promise<TestResult> {
  console.log('\n📦 Testing agent-inventario...');

  // Call without recipe_id = stock check mode
  const { data, duration } = await callAgent('inventario', {
    hotel_id: HOTEL_ID,
  });

  if (data.error) {
    return { agent: 'inventario', status: 'fail', duration_ms: duration, error: String(data.error) };
  }

  const tokensIn = (data.tokens_input as number) ?? 0;
  const tokensOut = (data.tokens_output as number) ?? 0;

  return {
    agent: 'inventario',
    status: 'pass',
    duration_ms: duration,
    tokens_input: tokensIn,
    tokens_output: tokensOut,
    cost_usd: estimateCost(tokensIn, tokensOut),
    summary: `${(data.alerts_count ?? 0)} alerts, ${(data.suggestions_count ?? 0)} purchase suggestions`,
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

const TESTS: Record<string, () => Promise<TestResult>> = {
  escandallo: testEscandallo,
  'menu-engineering': testMenuEngineering,
  ocr: testOcr,
  appcc: testAppcc,
  inventario: testInventario,
};

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  CulinaryOS Agent Test Runner                   ║');
  console.log('║  Target: ' + SUPABASE_URL.padEnd(40) + '║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (!SUPABASE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set in .env.local');
    process.exit(1);
  }

  // Check if Edge Functions are available
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/`, { method: 'GET' });
    if (res.status === 404) {
      console.log('\n⚠️  Edge Functions runtime not detected on local Supabase.');
      console.log('   Testing agents via direct HTTP calls (will fail if functions not deployed).');
      console.log('   To deploy: supabase functions deploy');
      console.log('   Alternative: test with `supabase functions serve` in another terminal.\n');
    }
  } catch {
    console.log('\n⚠️  Cannot reach Supabase. Is it running?');
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

  for (const [name, testFn] of testsToRun) {
    try {
      const result = await testFn();
      results.push(result);
      const icon = result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '○';
      console.log(`  ${icon} ${result.agent}: ${result.status} (${result.duration_ms}ms)`);
      if (result.summary) console.log(`    ${result.summary}`);
      if (result.error) console.log(`    ERROR: ${result.error}`);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      results.push({ agent: name, status: 'fail', duration_ms: 0, error: err });
      console.log(`  ✗ ${name}: EXCEPTION — ${err}`);
    }
  }

  // ─── Summary Table ──────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  RESULTS SUMMARY                                                   ║');
  console.log('╠═══════════════════╦════════╦═════════╦══════════╦══════════╦════════╣');
  console.log('║ Agent             ║ Status ║ Time    ║ Tok In   ║ Tok Out  ║ Cost   ║');
  console.log('╠═══════════════════╬════════╬═════════╬══════════╬══════════╬════════╣');

  let totalCost = 0;
  for (const r of results) {
    const cost = r.cost_usd ?? 0;
    totalCost += cost;
    console.log(
      `║ ${r.agent.padEnd(18)}║ ${r.status.padEnd(7)}║ ${String(r.duration_ms + 'ms').padEnd(8)}║ ${String(r.tokens_input ?? '-').padEnd(9)}║ ${String(r.tokens_output ?? '-').padEnd(9)}║ $${cost.toFixed(4).padEnd(5)}║`
    );
  }

  console.log('╠═══════════════════╬════════╬═════════╬══════════╬══════════╬════════╣');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  console.log(`║ TOTAL             ║ ${passed}/${results.length}    ║         ║          ║          ║ $${totalCost.toFixed(4).padEnd(5)}║`);
  console.log('╚═══════════════════╩════════╩═════════╩══════════╩══════════╩════════╝');

  // ─── Monthly Cost Projection ──────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  MONTHLY COST PROJECTION (1 restaurant)                    ║');
  console.log('╠═══════════════════╦═══════════════╦════════════╦═══════════╣');
  console.log('║ Agent             ║ Exec/month    ║ Cost/exec  ║ Total/mo  ║');
  console.log('╠═══════════════════╬═══════════════╬════════════╬═══════════╣');

  const projections = [
    { agent: 'escandallo', execPerMonth: 200, label: '~200 price changes' },
    { agent: 'menu-engineering', execPerMonth: 4, label: '4 (weekly)' },
    { agent: 'ocr', execPerMonth: 100, label: '100 invoices' },
    { agent: 'appcc', execPerMonth: 30, label: '30 (daily)' },
    { agent: 'inventario', execPerMonth: 500, label: '500 sales' },
  ];

  let projectedTotal = 0;
  for (const p of projections) {
    const result = results.find(r => r.agent === p.agent);
    const costPerExec = result?.cost_usd ?? 0.001;
    const monthTotal = costPerExec * p.execPerMonth;
    projectedTotal += monthTotal;
    console.log(
      `║ ${p.agent.padEnd(18)}║ ${p.label.padEnd(14)}║ $${costPerExec.toFixed(4).padEnd(9)}║ $${monthTotal.toFixed(2).padEnd(8)}║`
    );
  }

  console.log('╠═══════════════════╬═══════════════╬════════════╬═══════════╣');
  console.log(`║ TOTAL MENSUAL     ║               ║            ║ $${projectedTotal.toFixed(2).padEnd(8)}║`);
  console.log('╚═══════════════════╩═══════════════╩════════════╩═══════════╝');

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} test(s) failed. Check errors above.`);
    console.log('   Common causes:');
    console.log('   - Edge Functions not deployed: run `supabase functions serve`');
    console.log('   - Missing GEMINI_API_KEY in Supabase env');
    console.log('   - Supabase local not running');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
