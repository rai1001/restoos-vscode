// agent-escandallo — Recalculates recipe costs when ingredient prices change
// CulinaryOS Edge Function (Deno runtime)

import {
  getSupabaseClient,
  callGemini,
  logAgent,
  ensureHotelId,
  jsonResponse,
  errorResponse,
  startTimer,
} from '../_shared/utils.ts';
import type { EscandalloUpdate } from '../_shared/types.ts';

const AGENT_NAME = 'agent-escandallo';
const DEFAULT_MARGIN_THRESHOLD = 0.30; // 30%

interface WebhookPayload {
  hotel_id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  margin_threshold?: number; // configurable, defaults to 0.30
}

interface RecipeRow {
  id: string;
  name: string;
  servings: number;
  total_cost: number;
  cost_per_serving: number;
}

interface RecipeIngredientRow {
  recipe_id: string;
  product_id: string;
  quantity: number;
  unit_id: string;
}

interface SupplierOfferRow {
  product_id: string;
  price: number;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const elapsed = startTimer();
  const supabase = getSupabaseClient();
  const triggeredAt = new Date().toISOString();

  let payload: WebhookPayload;

  try {
    payload = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  // ── Validate tenant isolation ────────────────────────────────────────────
  let hotelId: string;
  try {
    hotelId = ensureHotelId(payload.hotel_id);
  } catch (e) {
    return errorResponse((e as Error).message, 400);
  }

  const { product_id, old_price, new_price } = payload;
  const marginThreshold = payload.margin_threshold ?? DEFAULT_MARGIN_THRESHOLD;

  if (!product_id || old_price == null || new_price == null) {
    return errorResponse('Missing required fields: product_id, old_price, new_price', 400);
  }

  // COST_CHECKPOINT: begin escandallo recalculation
  console.log(
    `[${AGENT_NAME}] Price change: product=${product_id} ${old_price} -> ${new_price} | hotel=${hotelId}`
  );

  try {
    // ── Step 1: Find all recipes containing the changed product ──────────
    const { data: affectedIngredients, error: riErr } = await supabase
      .from('recipe_ingredients')
      .select('recipe_id')
      .eq('hotel_id', hotelId)
      .eq('product_id', product_id);

    if (riErr) throw new Error(`recipe_ingredients query failed: ${riErr.message}`);
    if (!affectedIngredients || affectedIngredients.length === 0) {
      await logAgent(supabase, {
        hotel_id: hotelId,
        agent_name: AGENT_NAME,
        triggered_at: triggeredAt,
        completed_at: new Date().toISOString(),
        duration_ms: elapsed(),
        result: { message: 'No recipes use this product', product_id },
      });
      return jsonResponse({ updated: 0, alerts: 0, message: 'No recipes use this product' });
    }

    const recipeIds = [...new Set(affectedIngredients.map((r: { recipe_id: string }) => r.recipe_id))];

    // ── Step 2: Fetch recipe details ─────────────────────────────────────
    const { data: recipes, error: recErr } = await supabase
      .from('recipes')
      .select('id, name, servings, total_cost, cost_per_serving')
      .eq('hotel_id', hotelId)
      .in('id', recipeIds);

    if (recErr) throw new Error(`recipes query failed: ${recErr.message}`);
    if (!recipes || recipes.length === 0) {
      return jsonResponse({ updated: 0, alerts: 0, message: 'Recipe rows not found' });
    }

    // ── Step 2b: Fetch selling prices from sales_data (latest unit_price per recipe) ──
    const sellingPriceMap = new Map<string, number>();
    for (const rid of recipeIds) {
      const { data: salesRow } = await supabase
        .from('sales_data')
        .select('unit_price')
        .eq('hotel_id', hotelId)
        .eq('recipe_id', rid)
        .order('sale_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (salesRow?.unit_price) {
        sellingPriceMap.set(rid, salesRow.unit_price);
      }
    }

    // COST_CHECKPOINT: recipes fetched, begin per-recipe recalculation
    const updates: EscandalloUpdate[] = [];
    const alertsToInsert: Array<Record<string, unknown>> = [];

    for (const recipe of recipes as RecipeRow[]) {
      // ── Step 3: Fetch ALL ingredients for this recipe ──────────────────
      const { data: ingredients, error: ingErr } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, product_id, quantity, unit_id')
        .eq('recipe_id', recipe.id)
        .eq('hotel_id', hotelId);

      if (ingErr) throw new Error(`ingredients query for recipe ${recipe.id} failed: ${ingErr.message}`);
      if (!ingredients || ingredients.length === 0) continue;

      const productIds = (ingredients as RecipeIngredientRow[]).map((i) => i.product_id);

      // ── Step 4: Get preferred supplier prices for each ingredient ──────
      const { data: offers, error: offErr } = await supabase
        .from('supplier_offers')
        .select('product_id, price')
        .in('product_id', productIds)
        .eq('is_preferred', true);

      if (offErr) throw new Error(`supplier_offers query failed: ${offErr.message}`);

      // Build price map: product_id -> price
      const priceMap = new Map<string, number>();
      for (const offer of (offers ?? []) as SupplierOfferRow[]) {
        priceMap.set(offer.product_id, offer.price);
      }

      // COST_CHECKPOINT: calculate new total cost (pure math, no LLM)
      let newTotalCost = 0;
      for (const ing of ingredients as RecipeIngredientRow[]) {
        const unitPrice = priceMap.get(ing.product_id) ?? 0;
        newTotalCost += ing.quantity * unitPrice;
      }

      const newCostPerServing = recipe.servings > 0
        ? newTotalCost / recipe.servings
        : newTotalCost;

      // ── Step 5: Check margin ───────────────────────────────────────────
      // Use latest selling price from sales_data, or estimate from cost (30% food cost target)
      const sellingPrice = sellingPriceMap.get(recipe.id) ?? (newCostPerServing > 0 ? newCostPerServing / 0.30 : 0);
      const oldMarginPct = sellingPrice > 0
        ? (sellingPrice - recipe.cost_per_serving) / sellingPrice
        : 0;
      const newMarginPct = sellingPrice > 0
        ? (sellingPrice - newCostPerServing) / sellingPrice
        : 0;

      const needsAlert = sellingPrice > 0 && newMarginPct < marginThreshold;

      const update: EscandalloUpdate = {
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        old_cost: recipe.total_cost,
        new_cost: newTotalCost,
        old_margin_pct: Math.round(oldMarginPct * 10000) / 100,
        new_margin_pct: Math.round(newMarginPct * 10000) / 100,
        selling_price: sellingPrice,
        alert: needsAlert,
      };
      updates.push(update);

      // ── Step 5b: Create alert if margin below threshold ────────────────
      if (needsAlert) {
        alertsToInsert.push({
          hotel_id: hotelId,
          alert_type: 'low_margin',
          severity: newMarginPct < 0.15 ? 'critical' : 'warning',
          title: `Margen bajo en "${recipe.name}"`,
          message: `El margen ha bajado al ${update.new_margin_pct}% (umbral: ${marginThreshold * 100}%). Coste anterior: ${recipe.total_cost.toFixed(2)}, nuevo: ${newTotalCost.toFixed(2)}.`,
          entity_type: 'recipe',
          entity_id: recipe.id,
        });
      }

      // ── Step 6: Update recipe with new costs ───────────────────────────
      // COST_CHECKPOINT: writing updated costs to recipes table
      const { error: updErr } = await supabase
        .from('recipes')
        .update({
          total_cost: newTotalCost,
          cost_per_serving: newCostPerServing,
        })
        .eq('id', recipe.id)
        .eq('hotel_id', hotelId);

      if (updErr) {
        console.error(`[${AGENT_NAME}] Failed to update recipe ${recipe.id}: ${updErr.message}`);
      }
    }

    // ── Insert alerts ──────────────────────────────────────────────────────
    if (alertsToInsert.length > 0) {
      const { error: alertErr } = await supabase.from('alerts').insert(alertsToInsert);
      if (alertErr) {
        console.error(`[${AGENT_NAME}] Failed to insert alerts: ${alertErr.message}`);
      }
    }

    // ── Step 7: Generate a brief AI summary of changes ───────────────────
    // COST_CHECKPOINT: Gemini API call for summary (optional, non-blocking)
    let aiSummary = '';
    let tokensIn = 0;
    let tokensOut = 0;

    if (updates.length > 0) {
      try {
        const summaryPrompt = `Eres un asistente de costes de restaurante. Resume en 2-3 frases en espanol los siguientes cambios de coste en recetas, causados por un cambio de precio de ingrediente (de ${old_price} a ${new_price}). Indica cuales necesitan atencion urgente.\n\nCambios:\n${JSON.stringify(updates, null, 2)}`;

        const geminiResult = await callGemini({
          prompt: summaryPrompt,
          systemInstruction: 'Responde con un JSON: { "summary": "..." }',
          temperature: 0.2,
          maxOutputTokens: 512,
        });

        tokensIn = geminiResult.tokensInput;
        tokensOut = geminiResult.tokensOutput;

        try {
          const parsed = JSON.parse(geminiResult.text);
          aiSummary = parsed.summary ?? geminiResult.text;
        } catch {
          aiSummary = geminiResult.text;
        }
      } catch (e) {
        console.error(`[${AGENT_NAME}] Gemini summary failed (non-critical): ${(e as Error).message}`);
        aiSummary = `${updates.length} receta(s) actualizadas, ${alertsToInsert.length} alerta(s) generadas.`;
      }
    }

    // ── Log agent execution ────────────────────────────────────────────────
    await logAgent(supabase, {
      hotel_id: hotelId,
      agent_name: AGENT_NAME,
      triggered_at: triggeredAt,
      completed_at: new Date().toISOString(),
      tokens_input: tokensIn,
      tokens_output: tokensOut,
      duration_ms: elapsed(),
      result: {
        product_id,
        old_price,
        new_price,
        recipes_updated: updates.length,
        alerts_created: alertsToInsert.length,
        updates,
        summary: aiSummary,
      },
    });

    // COST_CHECKPOINT: agent complete
    return jsonResponse({
      updated: updates.length,
      alerts: alertsToInsert.length,
      summary: aiSummary,
      details: updates,
    });
  } catch (e) {
    const errorMsg = (e as Error).message;
    console.error(`[${AGENT_NAME}] Fatal error: ${errorMsg}`);

    await logAgent(supabase, {
      hotel_id: hotelId,
      agent_name: AGENT_NAME,
      triggered_at: triggeredAt,
      completed_at: new Date().toISOString(),
      duration_ms: elapsed(),
      error: errorMsg,
    });

    return errorResponse(errorMsg, 500);
  }
});
