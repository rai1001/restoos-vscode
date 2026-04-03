// Agent Inventario — Stock management & purchase suggestions
// Supabase Edge Function (Deno runtime)

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
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
import { StockAlert } from '../_shared/types.ts';

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  hotel_id: string;
  recipe_id?: string;
  quantity_sold?: number;
}

interface RecipeIngredient {
  product_id: string;
  quantity: number;
  unit_id: string;
}

interface StockLot {
  id: string;
  current_quantity: number;
  unit_cost: number;
  unit_id: string;
}

interface SupplierOffer {
  supplier_id: string;
  price: number;
  lead_time_days: number;
  suppliers: { id: string; name: string };
}

interface PurchaseLine {
  product_id: string;
  product_name: string;
  suggested_quantity: number;
  unit_price: number;
  line_total: number;
  urgency: 'warning' | 'critical';
}

interface SupplierOrder {
  supplier_id: string;
  supplier_name: string;
  lines: PurchaseLine[];
  total_estimated: number;
}

// ─── FIFO Stock Deduction ──────────────────────────────────────────────────

const FIFO_MAX_RETRIES = 3;

async function deductStockFIFO(
  supabase: SupabaseClient,
  hotelId: string,
  productId: string,
  totalToDeduct: number,
  unitId: string
): Promise<{ shortage: number }> {
  let remaining = totalToDeduct;
  let retries = 0;

  while (remaining > 0 && retries < FIFO_MAX_RETRIES) {
    // Fetch lots ordered by creation (oldest first = FIFO)
    const { data: lots, error } = await supabase
      .from('stock_lots')
      .select('id, current_quantity, unit_cost, unit_id')
      .eq('hotel_id', hotelId)
      .eq('product_id', productId)
      .gt('current_quantity', 0)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch stock_lots: ${error.message}`);
    if (!lots || lots.length === 0) break;

    let madeProgress = false;

    for (const lot of lots as StockLot[]) {
      if (remaining <= 0) break;

      const deduction = Math.min(lot.current_quantity, remaining);
      const newQty = lot.current_quantity - deduction;

      // Optimistic concurrency: only update if current_quantity hasn't changed
      const { data: updated, error: updateErr } = await supabase
        .from('stock_lots')
        .update({ current_quantity: newQty })
        .eq('id', lot.id)
        .eq('current_quantity', lot.current_quantity)
        .select('id');

      if (updateErr) throw new Error(`Failed to update lot ${lot.id}: ${updateErr.message}`);

      // If no rows updated, another invocation changed this lot — skip and retry
      if (!updated || updated.length === 0) {
        continue;
      }

      // Record movement
      const { error: movErr } = await supabase
        .from('stock_movements')
        .insert({
          hotel_id: hotelId,
          product_id: productId,
          lot_id: lot.id,
          movement_type: 'consumption',
          quantity: deduction,
          unit_id: unitId,
          unit_cost: lot.unit_cost,
        });

      if (movErr) throw new Error(`Failed to insert stock_movement: ${movErr.message}`);

      remaining -= deduction;
      madeProgress = true;
    }

    // If we couldn't update any lot due to concurrency, retry with fresh data
    if (!madeProgress && remaining > 0) {
      retries++;
      continue;
    }

    // If we made progress but still have remaining, loop to refetch fresh lots
    if (remaining > 0) {
      retries++;
    }
  }

  // Record shortage as an alert instead of silently succeeding
  if (remaining > 0) {
    console.warn(`Insufficient stock for product ${productId}: ${remaining} units short`);

    await supabase.from('alerts').insert({
      hotel_id: hotelId,
      alert_type: 'stock_shortage',
      severity: 'critical',
      title: `Rotura de stock: producto ${productId}`,
      message: `No hay stock suficiente para cubrir el consumo. Faltan ${remaining.toFixed(2)} unidades del producto ${productId}.`,
    });
  }

  return { shortage: remaining };
}

// ─── Consume Recipe Ingredients ────────────────────────────────────────────

async function consumeRecipeIngredients(
  supabase: SupabaseClient,
  hotelId: string,
  recipeId: string,
  quantitySold: number
): Promise<void> {
  // Fetch recipe servings
  const { data: recipe, error: recipeErr } = await supabase
    .from('recipes')
    .select('id, servings')
    .eq('id', recipeId)
    .eq('hotel_id', hotelId)
    .single();

  if (recipeErr || !recipe) {
    throw new Error(`Recipe ${recipeId} not found: ${recipeErr?.message}`);
  }

  const servings = recipe.servings || 1;

  // Fetch ingredients
  const { data: ingredients, error: ingErr } = await supabase
    .from('recipe_ingredients')
    .select('product_id, quantity, unit_id')
    .eq('recipe_id', recipeId);

  if (ingErr) throw new Error(`Failed to fetch ingredients: ${ingErr.message}`);
  if (!ingredients || ingredients.length === 0) return;

  // Deduct each ingredient FIFO
  for (const ing of ingredients as RecipeIngredient[]) {
    const consumption = (ing.quantity * quantitySold) / servings;
    await deductStockFIFO(supabase, hotelId, ing.product_id, consumption, ing.unit_id);
  }
}

// ─── Stock Check & Alerts ──────────────────────────────────────────────────

async function checkStockLevels(
  supabase: SupabaseClient,
  hotelId: string
): Promise<StockAlert[]> {
  // Get all products with their current total stock
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, default_unit_id')
    .eq('hotel_id', hotelId);

  if (prodErr) throw new Error(`Failed to fetch products: ${prodErr.message}`);
  if (!products || products.length === 0) return [];

  const alerts: StockAlert[] = [];

  for (const product of products) {
    // Sum current stock across all lots
    const { data: stockData, error: stockErr } = await supabase
      .from('stock_lots')
      .select('current_quantity, initial_quantity')
      .eq('hotel_id', hotelId)
      .eq('product_id', product.id)
      .gt('current_quantity', 0);

    if (stockErr) {
      console.error(`Stock query failed for ${product.id}: ${stockErr.message}`);
      continue;
    }

    const currentStock = (stockData || []).reduce(
      (sum: number, lot: { current_quantity: number }) => sum + lot.current_quantity,
      0
    );

    // Determine minimum stock threshold from average initial_quantity across lots (20% of avg)
    // Falls back to 5 units if no stock history exists
    const totalInitial = (stockData || []).reduce(
      (sum: number, lot: { initial_quantity?: number }) => sum + (lot.initial_quantity || 0),
      0
    );
    const lotCount = (stockData || []).length;
    const avgInitial = lotCount > 0 ? totalInitial / lotCount : 0;
    const minStock = avgInitial > 0 ? avgInitial * 0.2 : 5;

    if (minStock <= 0) continue; // No threshold configured and no history

    // Determine urgency
    let urgency: 'warning' | 'critical' | null = null;
    if (currentStock < minStock * 0.2) {
      urgency = 'critical';
    } else if (currentStock < minStock) {
      urgency = 'warning';
    }

    if (!urgency) continue;

    // Get preferred supplier
    const { data: offerData } = await supabase
      .from('supplier_offers')
      .select('supplier_id, price, lead_time_days, suppliers(id, name)')
      .eq('product_id', product.id)
      .eq('is_preferred', true)
      .limit(1)
      .single();

    const offer = offerData as unknown as SupplierOffer | null;

    // Calculate avg daily consumption (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('hotel_id', hotelId)
      .eq('product_id', product.id)
      .eq('movement_type', 'consumption')
      .gte('created_at', thirtyDaysAgo);

    const totalConsumed = (movements || []).reduce(
      (sum: number, m: { quantity: number }) => sum + m.quantity,
      0
    );
    const avgDaily = totalConsumed / 30;

    // Suggested order: cover lead_time + 7 days buffer
    const leadTime = offer?.lead_time_days ?? 3;
    const daysTocover = leadTime + 7;
    const suggestedQty = Math.max(0, Math.ceil(avgDaily * daysTocover - currentStock));

    alerts.push({
      product_id: product.id,
      product_name: product.name,
      current_stock: currentStock,
      min_stock: minStock,
      unit: product.default_unit_id,
      urgency,
      supplier_id: offer?.supplier_id ?? '',
      supplier_name: offer?.suppliers?.name ?? 'Sin proveedor',
      suggested_quantity: suggestedQty,
      avg_daily_consumption: Math.round(avgDaily * 100) / 100,
    });

    // Dedupe: only insert alert if no active (undismissed) stock_low alert exists for this product
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('alert_type', 'stock_low')
      .eq('entity_type', 'product')
      .eq('entity_id', product.id)
      .eq('is_dismissed', false)
      .limit(1)
      .maybeSingle();

    if (!existingAlert) {
      await supabase.from('alerts').insert({
        hotel_id: hotelId,
        alert_type: 'stock_low',
        severity: urgency,
        title: `Stock bajo: ${product.name}`,
        message: urgency === 'critical'
          ? `${product.name} en nivel CRITICO (${currentStock} uds). Pedir ${suggestedQty} uds.`
          : `${product.name} por debajo del minimo (${currentStock}/${minStock} uds).`,
        entity_type: 'product',
        entity_id: product.id,
      });
    }
  }

  return alerts;
}

// ─── Purchase Suggestions ──────────────────────────────────────────────────

async function createPurchaseSuggestions(
  supabase: SupabaseClient,
  hotelId: string,
  alerts: StockAlert[]
): Promise<SupplierOrder[]> {
  if (alerts.length === 0) return [];

  // Group alerts by supplier
  const bySupplier = new Map<string, { name: string; alerts: StockAlert[] }>();

  for (const alert of alerts) {
    const key = alert.supplier_id || 'unknown';
    if (!bySupplier.has(key)) {
      bySupplier.set(key, { name: alert.supplier_name, alerts: [] });
    }
    bySupplier.get(key)!.alerts.push(alert);
  }

  const orders: SupplierOrder[] = [];

  for (const [supplierId, group] of bySupplier) {
    if (supplierId === 'unknown') continue;

    const lines: PurchaseLine[] = [];

    for (const alert of group.alerts) {
      // Get price from supplier_offers
      const { data: offer } = await supabase
        .from('supplier_offers')
        .select('price')
        .eq('product_id', alert.product_id)
        .eq('supplier_id', supplierId)
        .eq('is_preferred', true)
        .limit(1)
        .single();

      const unitPrice = offer?.price ?? 0;

      lines.push({
        product_id: alert.product_id,
        product_name: alert.product_name,
        suggested_quantity: alert.suggested_quantity,
        unit_price: unitPrice,
        line_total: Math.round(unitPrice * alert.suggested_quantity * 100) / 100,
        urgency: alert.urgency,
      });
    }

    const totalEstimated = lines.reduce((s, l) => s + l.line_total, 0);

    // Dedupe: check if a pending suggestion already exists for this hotel+supplier
    const { data: existingSuggestion } = await supabase
      .from('purchase_suggestions')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('supplier_id', supplierId)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (existingSuggestion) {
      // Update existing pending suggestion with fresh data
      await supabase.from('purchase_suggestions')
        .update({
          lines,
          total_estimated: Math.round(totalEstimated * 100) / 100,
          reason: `Auto-generado: ${lines.length} productos bajo minimo`,
        })
        .eq('id', existingSuggestion.id);
    } else {
      await supabase.from('purchase_suggestions').insert({
        hotel_id: hotelId,
        supplier_id: supplierId,
        status: 'pending',
        lines,
        total_estimated: Math.round(totalEstimated * 100) / 100,
        reason: `Auto-generado: ${lines.length} productos bajo minimo`,
      });
    }

    orders.push({
      supplier_id: supplierId,
      supplier_name: group.name,
      lines,
      total_estimated: Math.round(totalEstimated * 100) / 100,
    });
  }

  return orders;
}

// ─── Gemini Summary ────────────────────────────────────────────────────────

async function generatePurchaseSummary(
  orders: SupplierOrder[],
  alerts: StockAlert[]
): Promise<{ summary: string; tokensInput: number; tokensOutput: number }> {
  if (orders.length === 0 && alerts.length === 0) {
    return { summary: 'Stock correcto — sin pedidos pendientes.', tokensInput: 0, tokensOutput: 0 };
  }

  const criticalCount = alerts.filter(a => a.urgency === 'critical').length;
  const warningCount = alerts.filter(a => a.urgency === 'warning').length;
  const totalEstimated = orders.reduce((s, o) => s + o.total_estimated, 0);

  // COST_CHECKPOINT: Gemini call — minimal prompt
  const result = await callGemini({
    prompt: JSON.stringify({
      criticos: criticalCount,
      avisos: warningCount,
      proveedores: orders.map(o => ({
        nombre: o.supplier_name,
        productos: o.lines.length,
        total: o.total_estimated,
      })),
      total_estimado: totalEstimated,
    }),
    systemInstruction:
      'Eres el asistente de compras de un hotel. Resume en 2-3 frases en español el estado del inventario y los pedidos sugeridos. Sé conciso. Responde JSON con campo "resumen".',
    maxOutputTokens: 256,
    temperature: 0.2,
  });

  let summary: string;
  try {
    const parsed = JSON.parse(result.text);
    summary = parsed.resumen || result.text;
  } catch {
    summary = result.text;
  }

  return {
    summary,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
  };
}

// ─── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const elapsed = startTimer();

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405);
    }

    const body: RequestBody = await req.json();
    const hotelId = ensureHotelId(body.hotel_id);
    const supabase = getSupabaseClient();

    // Verify caller has access to this hotel
    await verifyCallerHotelAccess(req, hotelId, supabase);

    // Step 1: If sale triggered, consume ingredients
    if (body.recipe_id && body.quantity_sold && body.quantity_sold > 0) {
      await consumeRecipeIngredients(supabase, hotelId, body.recipe_id, body.quantity_sold);
    }

    // Step 2: Check stock levels and generate alerts
    const alerts = await checkStockLevels(supabase, hotelId);

    // Step 3: Create purchase suggestions grouped by supplier
    const orders = await createPurchaseSuggestions(supabase, hotelId, alerts);

    // Step 4: Generate AI summary
    const { summary, tokensInput, tokensOutput } = await generatePurchaseSummary(orders, alerts);

    // Step 5: Log agent execution
    const durationMs = elapsed();
    await logAgent(supabase, {
      hotel_id: hotelId,
      agent_name: 'agent-inventario',
      triggered_at: new Date(Date.now() - durationMs).toISOString(),
      completed_at: new Date().toISOString(),
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      duration_ms: durationMs,
      result: {
        alerts_count: alerts.length,
        critical: alerts.filter(a => a.urgency === 'critical').length,
        warning: alerts.filter(a => a.urgency === 'warning').length,
        orders_count: orders.length,
        consumed_recipe: body.recipe_id ?? null,
      },
    });

    return jsonResponse({
      ok: true,
      summary,
      alerts,
      purchase_suggestions: orders,
      duration_ms: durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('agent-inventario error:', message);

    // Best-effort logging
    try {
      const supabase = getSupabaseClient();
      await logAgent(supabase, {
        hotel_id: 'unknown',
        agent_name: 'agent-inventario',
        triggered_at: new Date().toISOString(),
        error: message,
        duration_ms: elapsed(),
      });
    } catch { /* ignore logging failure */ }

    return errorResponse(message);
  }
});
