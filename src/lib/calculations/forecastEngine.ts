/**
 * @module forecastEngine
 * @description Deterministic demand forecasting engine.
 *
 * Predicts product demand for the next N days by combining:
 * 1. Historical consumption patterns by day of week
 * 2. Seasonal monthly factors
 * 3. Confirmed future events (menu explosion)
 * 4. Comparison with current stock
 *
 * Pure function — no side effects, no DB, no AI.
 */

/** Historical daily consumption record */
export interface HistoricalConsumption {
  product_id: string;
  product_name: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  unit: string;
}

/** Confirmed future event with exploded demand */
export interface FutureEventDemand {
  event_id: string;
  event_name: string;
  date: string; // YYYY-MM-DD
  pax: number;
  products: { product_id: string; product_name: string; quantity: number; unit: string }[];
}

/** Current stock level */
export interface StockLevel {
  product_id: string;
  product_name: string;
  current_stock: number;
  unit: string;
  safety_stock: number;
}

/** Forecast output per product per day */
export interface DailyForecast {
  date: string;
  day_of_week: number; // 0=Sun, 6=Sat
  day_label: string;
  products: ProductForecast[];
  total_demand: number;
}

export interface ProductForecast {
  product_id: string;
  product_name: string;
  unit: string;
  base_demand: number;
  seasonal_factor: number;
  event_demand: number;
  total_demand: number;
  current_stock: number;
  deficit: number;
}

/** Summary per product across all forecast days */
export interface ForecastSummary {
  product_id: string;
  product_name: string;
  unit: string;
  total_forecast_demand: number;
  current_stock: number;
  safety_stock: number;
  deficit: number;
  urgency: "critical" | "warning" | "ok";
  suggested_order_qty: number;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Seasonal factors by month (0=Jan). Hospitality typical pattern.
const DEFAULT_SEASONAL_FACTORS: Record<number, number> = {
  0: 0.80,  // Enero
  1: 0.85,  // Febrero
  2: 0.95,  // Marzo
  3: 1.00,  // Abril
  4: 1.05,  // Mayo
  5: 1.15,  // Junio
  6: 1.20,  // Julio
  7: 1.20,  // Agosto
  8: 1.10,  // Septiembre
  9: 1.05,  // Octubre
  10: 0.95, // Noviembre
  11: 1.10, // Diciembre
};

function buildDayOfWeekAverages(
  history: HistoricalConsumption[]
): Map<string, Map<number, { total: number; count: number }>> {
  const map = new Map<string, Map<number, { total: number; count: number }>>();

  for (const h of history) {
    const dow = new Date(h.date).getDay();
    if (!map.has(h.product_id)) map.set(h.product_id, new Map());
    const prodMap = map.get(h.product_id)!;
    const entry = prodMap.get(dow) ?? { total: 0, count: 0 };
    entry.total += h.quantity;
    entry.count += 1;
    prodMap.set(dow, entry);
  }

  return map;
}

/**
 * Generates a multi-day demand forecast combining historical averages, seasonal factors, and event demand.
 *
 * For each day in the forecast window the engine computes per-product demand as:
 *   `base_demand * seasonal_factor + event_demand`
 * and compares it against current stock to determine deficits and urgency levels.
 *
 * @param history - Array of {@link HistoricalConsumption} records used to derive day-of-week averages
 * @param futureEvents - Array of {@link FutureEventDemand} representing confirmed events with exploded product needs
 * @param stock - Array of {@link StockLevel} entries with current and safety stock quantities
 * @param days - Number of days to forecast (default: 14)
 * @param startDate - The first day of the forecast window (default: today)
 * @returns An object with `daily` ({@link DailyForecast}[]) and `summary` ({@link ForecastSummary}[]) sorted by urgency
 *
 * @example
 * ```ts
 * const { daily, summary } = generateForecast(
 *   consumptionHistory,
 *   upcomingEvents,
 *   currentStock,
 *   7,
 *   new Date("2026-03-20"),
 * );
 * summary.filter(s => s.urgency === "critical").forEach(s => {
 *   console.log(`URGENT: order ${s.suggested_order_qty} ${s.unit} of ${s.product_name}`);
 * });
 * ```
 */
export function generateForecast(
  history: HistoricalConsumption[],
  futureEvents: FutureEventDemand[],
  stock: StockLevel[],
  days: number = 14,
  startDate?: Date,
): { daily: DailyForecast[]; summary: ForecastSummary[] } {
  const start = startDate ?? new Date();
  const dowAverages = buildDayOfWeekAverages(history);

  const stockMap = new Map(stock.map(s => [s.product_id, s]));
  const eventsByDate = new Map<string, FutureEventDemand[]>();
  for (const evt of futureEvents) {
    const list = eventsByDate.get(evt.date) ?? [];
    list.push(evt);
    eventsByDate.set(evt.date, list);
  }

  const allProductIds = new Set<string>();
  for (const h of history) allProductIds.add(h.product_id);
  for (const e of futureEvents) for (const p of e.products) allProductIds.add(p.product_id);
  for (const s of stock) allProductIds.add(s.product_id);

  const productInfo = new Map<string, { name: string; unit: string }>();
  for (const h of history) productInfo.set(h.product_id, { name: h.product_name, unit: h.unit });
  for (const s of stock) productInfo.set(s.product_id, { name: s.product_name, unit: s.unit });
  for (const e of futureEvents) for (const p of e.products) productInfo.set(p.product_id, { name: p.product_name, unit: p.unit });

  const totalDemand = new Map<string, number>();
  const daily: DailyForecast[] = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split("T")[0];
    const dow = date.getDay();
    const month = date.getMonth();
    const seasonalFactor = DEFAULT_SEASONAL_FACTORS[month] ?? 1.0;

    const dayEvents = eventsByDate.get(dateStr!) ?? [];
    const eventDemandMap = new Map<string, number>();
    for (const evt of dayEvents) {
      for (const p of evt.products) {
        eventDemandMap.set(p.product_id, (eventDemandMap.get(p.product_id) ?? 0) + p.quantity);
      }
    }

    const products: ProductForecast[] = [];
    let dayTotal = 0;

    for (const pid of allProductIds) {
      const info = productInfo.get(pid) ?? { name: "—", unit: "kg" };
      const stk = stockMap.get(pid);

      const prodDow = dowAverages.get(pid)?.get(dow);
      const baseDemand = prodDow && prodDow.count > 0 ? prodDow.total / prodDow.count : 0;

      const eventDemand = eventDemandMap.get(pid) ?? 0;
      const total = round2(baseDemand * seasonalFactor + eventDemand);

      if (total > 0) {
        products.push({
          product_id: pid,
          product_name: info.name,
          unit: info.unit,
          base_demand: round2(baseDemand),
          seasonal_factor: seasonalFactor,
          event_demand: round2(eventDemand),
          total_demand: total,
          current_stock: stk?.current_stock ?? 0,
          deficit: Math.max(0, total - (stk?.current_stock ?? 0)),
        });
        dayTotal += total;
        totalDemand.set(pid, (totalDemand.get(pid) ?? 0) + total);
      }
    }

    products.sort((a, b) => b.total_demand - a.total_demand);

    daily.push({
      date: dateStr!,
      day_of_week: dow,
      day_label: DAY_LABELS[dow]!,
      products,
      total_demand: round2(dayTotal),
    });
  }

  const summary: ForecastSummary[] = [];
  for (const pid of allProductIds) {
    const demand = totalDemand.get(pid) ?? 0;
    if (demand === 0) continue;

    const info = productInfo.get(pid) ?? { name: "—", unit: "kg" };
    const stk = stockMap.get(pid);
    const currentStock = stk?.current_stock ?? 0;
    const safetyStock = stk?.safety_stock ?? 0;
    const deficit = Math.max(0, demand + safetyStock - currentStock);

    let urgency: ForecastSummary["urgency"] = "ok";
    if (deficit > demand * 0.5) urgency = "critical";
    else if (deficit > 0) urgency = "warning";

    summary.push({
      product_id: pid,
      product_name: info.name,
      unit: info.unit,
      total_forecast_demand: round2(demand),
      current_stock: round2(currentStock),
      safety_stock: round2(safetyStock),
      deficit: round2(deficit),
      urgency,
      suggested_order_qty: round2(deficit > 0 ? deficit * 1.1 : 0),
    });
  }

  summary.sort((a, b) => {
    const urgencyOrder: Record<string, number> = { critical: 0, warning: 1, ok: 2 };
    return ((urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2)) || (b.deficit - a.deficit);
  });

  return { daily, summary };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
