import { describe, it, expect } from "vitest";
import {
  generateForecast,
  type HistoricalConsumption,
  type FutureEventDemand,
  type StockLevel,
} from "../forecastEngine";

// ─── Helpers ───────────────────────────────────────────────

/**
 * Fixed start date: Monday 2025-04-07 (April, seasonal factor = 1.00).
 * Using April keeps seasonal math simple (factor = 1.0).
 */
const FIXED_START = new Date("2025-04-07T12:00:00Z");

/** Build 7 days of history for a single product, one entry per day. */
function buildWeekHistory(
  productId: string,
  productName: string,
  dailyQty: number,
  startDate: Date = new Date("2025-03-31T12:00:00Z"), // week before FIXED_START
): HistoricalConsumption[] {
  const records: HistoricalConsumption[] = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    records.push({
      product_id: productId,
      product_name: productName,
      date: date.toISOString().split("T")[0],
      quantity: dailyQty,
      unit: "kg",
    });
  }
  return records;
}

function makeStock(
  productId: string,
  productName: string,
  currentStock: number,
  safetyStock: number = 0,
): StockLevel {
  return { product_id: productId, product_name: productName, current_stock: currentStock, unit: "kg", safety_stock: safetyStock };
}

function makeEvent(
  date: string,
  products: { product_id: string; product_name: string; quantity: number }[],
): FutureEventDemand {
  return {
    event_id: "evt-1",
    event_name: "Banquete",
    date,
    pax: 100,
    products: products.map((p) => ({ ...p, unit: "kg" })),
  };
}

// ─── generateForecast ──────────────────────────────────────

describe("generateForecast", () => {
  it("1. Basic: 7 days history, 1 product -> forecast shows daily averages", () => {
    // Each day of the week has exactly one record with qty=10
    // So the per-day-of-week average is 10 for every day.
    const history = buildWeekHistory("prod-a", "Pollo", 10);
    const stock = [makeStock("prod-a", "Pollo", 100)];

    const { daily } = generateForecast(history, [], stock, 7, FIXED_START);

    expect(daily).toHaveLength(7);

    // April seasonal factor = 1.00, so base_demand * 1.00 = 10
    for (const day of daily) {
      const product = day.products.find((p) => p.product_id === "prod-a");
      expect(product).toBeDefined();
      expect(product!.base_demand).toBe(10);
      expect(product!.total_demand).toBe(10); // 10 * 1.00 + 0 events
    }
  });

  it("2. Seasonal factor applied (summer month higher, winter lower)", () => {
    const history = buildWeekHistory("prod-a", "Pollo", 10);
    const stock = [makeStock("prod-a", "Pollo", 1000)];

    // July start => seasonal factor = 1.20
    const julyStart = new Date("2025-07-07T00:00:00");
    const { daily: julyDaily } = generateForecast(history, [], stock, 1, julyStart);

    const julyProduct = julyDaily[0].products.find((p) => p.product_id === "prod-a");
    // base_demand=10, seasonal=1.20 => total=12
    expect(julyProduct!.seasonal_factor).toBe(1.2);
    expect(julyProduct!.total_demand).toBe(12);

    // January start => seasonal factor = 0.80
    const janStart = new Date("2025-01-06T12:00:00Z");
    const { daily: janDaily } = generateForecast(history, [], stock, 1, janStart);

    const janProduct = janDaily[0].products.find((p) => p.product_id === "prod-a");
    expect(janProduct!.seasonal_factor).toBe(0.8);
    expect(janProduct!.total_demand).toBe(8); // 10 * 0.80
  });

  it("3. Event demand added to base demand", () => {
    const history = buildWeekHistory("prod-a", "Pollo", 10);
    const stock = [makeStock("prod-a", "Pollo", 1000)];

    const event = makeEvent("2025-04-07", [
      { product_id: "prod-a", product_name: "Pollo", quantity: 50 },
    ]);

    const { daily } = generateForecast(history, [event], stock, 1, FIXED_START);

    const product = daily[0].products.find((p) => p.product_id === "prod-a");
    // base=10, seasonal=1.00, event=50 => total = 10*1 + 50 = 60
    expect(product!.base_demand).toBe(10);
    expect(product!.event_demand).toBe(50);
    expect(product!.total_demand).toBe(60);
  });

  it("4. Deficit calculated: demand - current_stock", () => {
    const history = buildWeekHistory("prod-a", "Pollo", 10);
    const stock = [makeStock("prod-a", "Pollo", 5)]; // only 5 in stock

    const { daily } = generateForecast(history, [], stock, 1, FIXED_START);

    const product = daily[0].products.find((p) => p.product_id === "prod-a");
    // demand=10, stock=5 => deficit=5
    expect(product!.total_demand).toBe(10);
    expect(product!.current_stock).toBe(5);
    expect(product!.deficit).toBe(5);
  });

  it("5. Summary urgency: critical when deficit > 50% of demand", () => {
    // 14 days forecast, 10/day in April (factor 1.0)
    // total_demand = 10 * 14 = 140
    // stock = 10, safety_stock = 0 => deficit = 130
    // 130 / 140 = 92.8% > 50% => critical
    const history = buildWeekHistory("prod-a", "Pollo", 10);
    const stock = [makeStock("prod-a", "Pollo", 10, 0)];

    const { summary } = generateForecast(history, [], stock, 14, FIXED_START);

    const item = summary.find((s) => s.product_id === "prod-a");
    expect(item).toBeDefined();
    expect(item!.total_forecast_demand).toBe(140);
    expect(item!.deficit).toBe(130); // 140 + 0 - 10
    expect(item!.urgency).toBe("critical");
  });

  it("6. Summary urgency: warning when deficit > 0 but <= 50%", () => {
    // total_demand = 10 * 14 = 140
    // stock = 100, safety_stock = 0 => deficit = 40
    // 40 / 140 = 28.5% => NOT > 50% but > 0 => warning
    const history = buildWeekHistory("prod-a", "Pollo", 10);
    const stock = [makeStock("prod-a", "Pollo", 100, 0)];

    const { summary } = generateForecast(history, [], stock, 14, FIXED_START);

    const item = summary.find((s) => s.product_id === "prod-a");
    expect(item!.deficit).toBe(40);
    expect(item!.urgency).toBe("warning");
  });

  it("7. Summary urgency: ok when no deficit", () => {
    // total_demand = 10 * 14 = 140
    // stock = 200, safety_stock = 0 => deficit = max(0, 140+0-200) = 0
    const history = buildWeekHistory("prod-a", "Pollo", 10);
    const stock = [makeStock("prod-a", "Pollo", 200, 0)];

    const { summary } = generateForecast(history, [], stock, 14, FIXED_START);

    const item = summary.find((s) => s.product_id === "prod-a");
    expect(item!.deficit).toBe(0);
    expect(item!.urgency).toBe("ok");
  });

  it("8. No history -> base demand is 0, only events contribute", () => {
    const event = makeEvent("2025-04-07", [
      { product_id: "prod-new", product_name: "Langosta", quantity: 25 },
    ]);
    const stock = [makeStock("prod-new", "Langosta", 0)];

    const { daily, summary } = generateForecast([], [event], stock, 7, FIXED_START);

    // Only day 1 (2025-04-07) should have demand
    const day1 = daily[0];
    const product = day1.products.find((p) => p.product_id === "prod-new");
    expect(product).toBeDefined();
    expect(product!.base_demand).toBe(0);
    expect(product!.event_demand).toBe(25);
    expect(product!.total_demand).toBe(25);

    // Remaining days have no demand for this product (no history, no events)
    for (let d = 1; d < 7; d++) {
      const prod = daily[d].products.find((p) => p.product_id === "prod-new");
      expect(prod).toBeUndefined();
    }

    // Summary should exist with event-only demand
    const summaryItem = summary.find((s) => s.product_id === "prod-new");
    expect(summaryItem).toBeDefined();
    expect(summaryItem!.total_forecast_demand).toBe(25);
  });

  it("9. Safety stock included in deficit calculation", () => {
    // total_demand = 10 * 14 = 140
    // stock = 150, safety_stock = 20
    // deficit = max(0, 140 + 20 - 150) = 10
    const history = buildWeekHistory("prod-a", "Pollo", 10);
    const stock = [makeStock("prod-a", "Pollo", 150, 20)];

    const { summary } = generateForecast(history, [], stock, 14, FIXED_START);

    const item = summary.find((s) => s.product_id === "prod-a");
    expect(item!.safety_stock).toBe(20);
    expect(item!.deficit).toBe(10); // 140 + 20 - 150
    // 10 / 140 = 7.1% => warning (> 0 but <= 50%)
    expect(item!.urgency).toBe("warning");
    // suggested_order_qty = deficit * 1.1 = 11
    expect(item!.suggested_order_qty).toBe(11);
  });

  it("summary sorted by urgency: critical first, then warning, then ok", () => {
    const history = [
      ...buildWeekHistory("prod-crit", "Critico", 20),
      ...buildWeekHistory("prod-warn", "Aviso", 10),
      ...buildWeekHistory("prod-ok", "Bien", 5),
    ];

    const stock = [
      makeStock("prod-crit", "Critico", 0, 0),   // deficit = 280, critical
      makeStock("prod-warn", "Aviso", 100, 0),    // deficit = 40, warning
      makeStock("prod-ok", "Bien", 500, 0),        // deficit = 0, ok
    ];

    const { summary } = generateForecast(history, [], stock, 14, FIXED_START);

    expect(summary[0].urgency).toBe("critical");
    expect(summary[1].urgency).toBe("warning");
    expect(summary[2].urgency).toBe("ok");
  });

  it("multiple events on the same day aggregate demand", () => {
    const events: FutureEventDemand[] = [
      makeEvent("2025-04-07", [
        { product_id: "prod-a", product_name: "Pollo", quantity: 30 },
      ]),
      {
        event_id: "evt-2",
        event_name: "Boda",
        date: "2025-04-07",
        pax: 50,
        products: [{ product_id: "prod-a", product_name: "Pollo", quantity: 20, unit: "kg" }],
      },
    ];

    const stock = [makeStock("prod-a", "Pollo", 0)];

    const { daily } = generateForecast([], events, stock, 1, FIXED_START);

    const product = daily[0].products.find((p) => p.product_id === "prod-a");
    expect(product!.event_demand).toBe(50); // 30 + 20
  });

  it("day labels are in Spanish", () => {
    const history = buildWeekHistory("prod-a", "Pollo", 10);
    const stock = [makeStock("prod-a", "Pollo", 1000)];

    const { daily } = generateForecast(history, [], stock, 7, FIXED_START);

    // 2025-04-07 is Monday
    expect(daily[0].day_label).toBe("Lun");
    expect(daily[1].day_label).toBe("Mar");
    expect(daily[6].day_label).toBe("Dom");
  });

  it("products with zero total_demand are excluded from daily output", () => {
    // Product only in stock, no history, no events => no demand => excluded
    const stock = [makeStock("prod-ghost", "Fantasma", 100)];

    const { daily } = generateForecast([], [], stock, 7, FIXED_START);

    for (const day of daily) {
      const ghost = day.products.find((p) => p.product_id === "prod-ghost");
      expect(ghost).toBeUndefined();
    }
  });
});
