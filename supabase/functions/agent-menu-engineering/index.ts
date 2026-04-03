// Agent: Menu Engineering (BCG Matrix)
// Clasifica platos en Estrella/Caballo/Puzzle/Perro y genera recomendaciones con Gemini

import {
  getSupabaseClient,
  callGemini,
  logAgent,
  ensureHotelId,
  verifyCallerHotelAccess,
  jsonResponse,
  errorResponse,
  startTimer,
} from '../_shared/utils.ts';
// ─── Types ─────────────────────────────────────────────────────────────────

interface RecipeRow {
  id: string;
  name: string;
  category: string;
  cost_per_serving: number;
}

interface DishAnalysis {
  recipe_id: string;
  name: string;
  category: string;
  units_sold: number;
  popularity_pct: number;
  cost_per_serving: number;
  selling_price: number;
  margin_pct: number;
  contribution_margin: number;
  classification: 'estrella' | 'caballo' | 'puzzle' | 'perro';
}

// ─── Classification Logic ──────────────────────────────────────────────────

function classify(
  popularityPct: number,
  marginPct: number,
  avgPopularity: number,
  avgMargin: number,
): 'estrella' | 'caballo' | 'puzzle' | 'perro' {
  const highPop = popularityPct >= avgPopularity;
  const highMargin = marginPct >= avgMargin;

  if (highPop && highMargin) return 'estrella';
  if (highPop && !highMargin) return 'caballo';
  if (!highPop && highMargin) return 'puzzle';
  return 'perro';
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const elapsed = startTimer();

  let hotelId = '';
  try {
    const body = await req.json();
    hotelId = ensureHotelId(body.hotel_id);
    const periodDays: number = body.period_days ?? 30;

    const supabase = getSupabaseClient();
    await verifyCallerHotelAccess(req, hotelId, supabase);
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodStartStr = periodStart.toISOString().split('T')[0];

    // ── 1. Query sales data grouped by recipe ──────────────────────────

    const { data: salesData, error: salesErr } = await supabase
      .from('sales_data')
      .select('recipe_id, quantity_sold, unit_price')
      .eq('hotel_id', hotelId)
      .gte('sale_date', periodStartStr);

    if (salesErr) throw new Error(`Sales query failed: ${salesErr.message}`);
    if (!salesData || salesData.length === 0) {
      return jsonResponse({ message: 'No hay datos de ventas para el periodo', dishes: [] });
    }

    // Aggregate in memory (Supabase JS client doesn't support GROUP BY)
    const salesMap = new Map<string, { totalUnits: number; totalRevenue: number }>();
    for (const row of salesData) {
      const existing = salesMap.get(row.recipe_id) ?? { totalUnits: 0, totalRevenue: 0 };
      existing.totalUnits += row.quantity_sold;
      existing.totalRevenue += row.quantity_sold * row.unit_price;
      salesMap.set(row.recipe_id, existing);
    }

    const recipeIds = [...salesMap.keys()];

    // ── 2. Query recipes with cost_per_serving ─────────────────────────

    const { data: recipes, error: recipesErr } = await supabase
      .from('recipes')
      .select('id, name, category, cost_per_serving')
      .eq('hotel_id', hotelId)
      .in('id', recipeIds);

    if (recipesErr) throw new Error(`Recipes query failed: ${recipesErr.message}`);
    if (!recipes || recipes.length === 0) {
      return jsonResponse({ message: 'No se encontraron recetas', dishes: [] });
    }

    const recipeMap = new Map<string, RecipeRow>();
    for (const r of recipes) {
      recipeMap.set(r.id, r as RecipeRow);
    }

    // ── 3. Calculate metrics for each dish ─────────────────────────────

    const totalUnits = [...salesMap.values()].reduce((sum, s) => sum + s.totalUnits, 0);
    const numDishes = recipeMap.size;

    const dishes: DishAnalysis[] = [];
    const margins: number[] = [];

    for (const [recipeId, sales] of salesMap) {
      const recipe = recipeMap.get(recipeId);
      if (!recipe) continue;

      const sellingPrice = sales.totalRevenue / sales.totalUnits;
      const marginPct =
        sellingPrice > 0
          ? ((sellingPrice - recipe.cost_per_serving) / sellingPrice) * 100
          : 0;
      const contributionMargin = sellingPrice - recipe.cost_per_serving;
      const popularityPct = totalUnits > 0 ? (sales.totalUnits / totalUnits) * 100 : 0;

      margins.push(marginPct);

      dishes.push({
        recipe_id: recipeId,
        name: recipe.name,
        category: recipe.category,
        units_sold: sales.totalUnits,
        popularity_pct: Math.round(popularityPct * 100) / 100,
        cost_per_serving: recipe.cost_per_serving,
        selling_price: Math.round(sellingPrice * 100) / 100,
        margin_pct: Math.round(marginPct * 100) / 100,
        contribution_margin: Math.round(contributionMargin * 100) / 100,
        classification: 'perro', // placeholder, assigned below
      });
    }

    // ── 4. Determine thresholds and classify ───────────────────────────

    const avgPopularity = numDishes > 0 ? 100 / numDishes : 0;
    const avgMargin = median(margins);

    for (const dish of dishes) {
      dish.classification = classify(
        dish.popularity_pct,
        dish.margin_pct,
        avgPopularity,
        avgMargin,
      );
    }

    // Sort: estrellas first, then caballos, puzzles, perros
    const classOrder = { estrella: 0, caballo: 1, puzzle: 2, perro: 3 };
    dishes.sort((a, b) => classOrder[a.classification] - classOrder[b.classification]);

    // ── 5. Gemini recommendations ──────────────────────────────────────

    const classificationSummary = dishes.map((d) => ({
      name: d.name,
      category: d.category,
      classification: d.classification,
      units_sold: d.units_sold,
      popularity_pct: d.popularity_pct,
      margin_pct: d.margin_pct,
      selling_price: d.selling_price,
      cost_per_serving: d.cost_per_serving,
    }));

    // COST_CHECKPOINT: Gemini API call
    const geminiResult = await callGemini({
      systemInstruction:
        'Eres un consultor de ingeniería de menús para restaurantes. ' +
        'Responde SOLO en JSON válido. Sin markdown, sin explicaciones fuera del JSON.',
      prompt: `Analiza estos platos clasificados con la matriz BCG de ingeniería de menús y genera una recomendación específica y accionable en español para cada uno.

Datos:
${JSON.stringify(classificationSummary)}

Responde con un array JSON donde cada elemento tenga:
- "name": nombre del plato
- "classification": su clasificación
- "recommendation": recomendación específica (ej: "Subir precio un 10%", "Mover a posición destacada en carta", "Reducir porción y ajustar precio", "Considerar eliminar del menú")
- "priority": "alta" | "media" | "baja"`,
      temperature: 0.2,
      maxOutputTokens: 2048,
    });

    let recommendations: Array<{
      name: string;
      classification: string;
      recommendation: string;
      priority: string;
    }> = [];

    try {
      recommendations = JSON.parse(geminiResult.text);
    } catch {
      console.error('Failed to parse Gemini response:', geminiResult.text);
      recommendations = dishes.map((d) => ({
        name: d.name,
        classification: d.classification,
        recommendation: `Revisar plato ${d.classification}`,
        priority: d.classification === 'perro' ? 'alta' : 'media',
      }));
    }

    // ── 6. Calculate totals ────────────────────────────────────────────

    const totalRevenue = [...salesMap.values()].reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCost = dishes.reduce(
      (sum, d) => sum + d.cost_per_serving * d.units_sold,
      0,
    );

    // ── 7. Save report to menu_engineering_reports ─────────────────────

    const reportDate = now.toISOString().split('T')[0];

    const { error: insertErr } = await supabase
      .from('menu_engineering_reports')
      .upsert({
        hotel_id: hotelId,
        report_date: reportDate,
        period_days: periodDays,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        dishes: dishes as unknown as Record<string, unknown>[],
        recommendations: recommendations as unknown as Record<string, unknown>[],
      }, { onConflict: 'hotel_id,report_date' });

    if (insertErr) throw new Error(`Report upsert failed: ${insertErr.message}`);

    // ── 8. Log to agent_logs ───────────────────────────────────────────

    const durationMs = elapsed();
    await logAgent(supabase, {
      hotel_id: hotelId,
      agent_name: 'menu-engineering',
      triggered_at: now.toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: geminiResult.tokensInput,
      tokens_output: geminiResult.tokensOutput,
      duration_ms: durationMs,
      result: {
        total_dishes: dishes.length,
        estrellas: dishes.filter((d) => d.classification === 'estrella').length,
        caballos: dishes.filter((d) => d.classification === 'caballo').length,
        puzzles: dishes.filter((d) => d.classification === 'puzzle').length,
        perros: dishes.filter((d) => d.classification === 'perro').length,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        period_days: periodDays,
      },
    });

    // ── 9. Response ────────────────────────────────────────────────────

    return jsonResponse({
      report_date: reportDate,
      period_days: periodDays,
      total_dishes: dishes.length,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      thresholds: {
        avg_popularity: Math.round(avgPopularity * 100) / 100,
        median_margin: Math.round(avgMargin * 100) / 100,
      },
      summary: {
        estrellas: dishes.filter((d) => d.classification === 'estrella').length,
        caballos: dishes.filter((d) => d.classification === 'caballo').length,
        puzzles: dishes.filter((d) => d.classification === 'puzzle').length,
        perros: dishes.filter((d) => d.classification === 'perro').length,
      },
      dishes,
      recommendations,
      duration_ms: durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('agent-menu-engineering error:', message);

    // Best-effort logging
    try {
      const supabase = getSupabaseClient();
      await logAgent(supabase, {
        hotel_id: hotelId || 'unknown',
        agent_name: 'menu-engineering',
        triggered_at: new Date().toISOString(),
        error: message,
        duration_ms: elapsed(),
      });
    } catch {
      // ignore logging failures
    }

    return errorResponse(message);
  }
});
