import {
  generatePurchaseSuggestions,
  adjustToMoqAndPacks,
} from "../procurementEngine";
import type {
  DemandLine,
  StockSnapshot,
  CatalogMap,
  CatalogEntry,
  MeasurementUnit,
} from "../types";

// ─── Shared fixtures ────────────────────────────────────────

const unitKg: MeasurementUnit = { id: "u-kg", name: "Kilogramo", abbreviation: "kg" };

function makeDemandLine(overrides: Partial<DemandLine> & { product_id: string }): DemandLine {
  return {
    product_name: "Producto",
    unit: unitKg,
    total_qty_needed: 10,
    breakdown: [{ source: "test", qty: 10 }],
    ...overrides,
  };
}

function makeStock(
  product_id: string,
  available: number,
  committed: number,
  safety: number,
): StockSnapshot {
  return {
    product_id,
    product_name: "Producto",
    unit: unitKg,
    qty_available: available,
    qty_committed: committed,
    safety_stock: safety,
  };
}

function makeCatalogEntry(overrides: Partial<CatalogEntry> & { product_id: string }): CatalogEntry {
  return {
    id: "cat-1",
    supplier_id: "sup-1",
    supplier_name: "Proveedor A",
    unit_price: 5,
    min_order_qty: 1,
    pack_size: 1,
    is_preferred: false,
    volume_discounts: [],
    ...overrides,
  };
}

// ─── adjustToMoqAndPacks ────────────────────────────────────

describe("adjustToMoqAndPacks", () => {
  it("returns raw quantity when no MOQ or pack constraint applies", () => {
    // need 7, moq=1, pack=1 -> 7
    expect(adjustToMoqAndPacks(7, 1, 1)).toBe(7);
  });

  it("rounds up to MOQ when need < MOQ", () => {
    // need 3, moq=5, pack=1 -> 5
    expect(adjustToMoqAndPacks(3, 5, 1)).toBe(5);
  });

  it("rounds up to pack size multiple", () => {
    // need 7, moq=1, pack=5 -> 10 (2 packs of 5)
    expect(adjustToMoqAndPacks(7, 1, 5)).toBe(10);
  });

  it("MOQ wins when pack-adjusted qty < MOQ", () => {
    // need 2, moq=10, pack=5 -> pack round = 5, but moq=10 wins
    expect(adjustToMoqAndPacks(2, 10, 5)).toBe(10);
  });

  it("pack size wins when pack-adjusted qty > MOQ", () => {
    // need 7, moq=5, pack=3 -> ceil(7/3)=3 packs -> 9
    expect(adjustToMoqAndPacks(7, 5, 3)).toBe(9);
  });

  it("handles pack_size of 0 gracefully (treated as 1)", () => {
    expect(adjustToMoqAndPacks(7, 1, 0)).toBe(7);
  });

  it("handles exact pack multiple", () => {
    // need 10, pack=5 -> exactly 10
    expect(adjustToMoqAndPacks(10, 1, 5)).toBe(10);
  });

  it("handles rawQty of 0", () => {
    expect(adjustToMoqAndPacks(0, 5, 1)).toBe(5);
  });
});

// ─── generatePurchaseSuggestions ─────────────────────────────

describe("generatePurchaseSuggestions", () => {
  it("generates suggestion when demand > free stock", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 20 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 5, 0, 0));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({ product_id: "p-arroz", unit_price: 2 })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    expect(result).toHaveLength(1);
    expect(result[0]!.product_id).toBe("p-arroz");
    // need = 20 - (5-0) + 0 = 15
    expect(result[0]!.qty_to_order).toBe(15);
    expect(result[0]!.estimated_cost).toBe(30); // 15 * 2
  });

  it("generates no suggestion when demand <= free stock", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 5 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 10, 0, 0));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({ product_id: "p-arroz" })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);
    expect(result).toHaveLength(0);
  });

  it("accounts for committed stock reducing free stock", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 5 })];
    const stock = new Map<string, StockSnapshot>();
    // available=10, committed=8 -> free=2
    stock.set("p-arroz", makeStock("p-arroz", 10, 8, 0));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({ product_id: "p-arroz", unit_price: 3 })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    expect(result).toHaveLength(1);
    // need = 5 - (10-8) + 0 = 3
    expect(result[0]!.qty_to_order).toBe(3);
  });

  it("adds safety stock to the order", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 10 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 5, 0, 3));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({ product_id: "p-arroz", unit_price: 2 })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    // need = 10 - 5 + 3 = 8
    expect(result[0]!.qty_to_order).toBe(8);
  });

  it("adjusts to MOQ: need 3, MOQ is 5 -> order 5", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 8 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 5, 0, 0));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({
        product_id: "p-arroz", min_order_qty: 5, pack_size: 1, unit_price: 2,
      })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    // raw need = 8 - 5 = 3, but MOQ = 5
    expect(result[0]!.qty_to_order).toBe(5);
  });

  it("adjusts to pack size: need 7, pack_size=5 -> order 10", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 12 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 5, 0, 0));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({
        product_id: "p-arroz", min_order_qty: 1, pack_size: 5, unit_price: 2,
      })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    // raw need = 12 - 5 = 7, pack round to 10
    expect(result[0]!.qty_to_order).toBe(10);
    expect(result[0]!.estimated_cost).toBe(20); // 10 * 2
  });

  it("classifies urgency as critical when stock is 0", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 10 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 0, 0, 5));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({ product_id: "p-arroz" })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);
    expect(result[0]!.urgency).toBe("critical");
  });

  it("classifies urgency as critical when available <= committed", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 10 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 5, 5, 2));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({ product_id: "p-arroz" })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);
    expect(result[0]!.urgency).toBe("critical");
  });

  it("classifies urgency as urgent when free stock < safety stock", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 10 })];
    const stock = new Map<string, StockSnapshot>();
    // available=10, committed=8 -> free=2, safety=5 -> urgent
    stock.set("p-arroz", makeStock("p-arroz", 10, 8, 5));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({ product_id: "p-arroz" })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);
    expect(result[0]!.urgency).toBe("urgent");
  });

  it("classifies urgency as normal when stock is healthy", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 20 })];
    const stock = new Map<string, StockSnapshot>();
    // available=15, committed=2 -> free=13, safety=5 -> free-committed(13)>safety(5) => normal
    stock.set("p-arroz", makeStock("p-arroz", 15, 2, 5));
    const catalog: CatalogMap = {
      "p-arroz": [makeCatalogEntry({ product_id: "p-arroz" })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);
    expect(result[0]!.urgency).toBe("normal");
  });

  it("sorts results: critical first, then urgent, then normal", () => {
    const demand = [
      makeDemandLine({ product_id: "p-1", product_name: "Normal", total_qty_needed: 20 }),
      makeDemandLine({ product_id: "p-2", product_name: "Critical", total_qty_needed: 20 }),
      makeDemandLine({ product_id: "p-3", product_name: "Urgent", total_qty_needed: 20 }),
    ];
    const stock = new Map<string, StockSnapshot>();
    // p-1: normal (healthy stock)
    stock.set("p-1", makeStock("p-1", 15, 2, 3));
    // p-2: critical (available=0)
    stock.set("p-2", makeStock("p-2", 0, 0, 5));
    // p-3: urgent (free < safety)
    stock.set("p-3", makeStock("p-3", 10, 8, 5));

    const catalog: CatalogMap = {
      "p-1": [makeCatalogEntry({ product_id: "p-1" })],
      "p-2": [makeCatalogEntry({ product_id: "p-2" })],
      "p-3": [makeCatalogEntry({ product_id: "p-3" })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    expect(result[0]!.urgency).toBe("critical");
    expect(result[1]!.urgency).toBe("urgent");
    expect(result[2]!.urgency).toBe("normal");
  });

  it("picks preferred supplier when within 5% of cheapest", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 10 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 0, 0, 0));

    const catalog: CatalogMap = {
      "p-arroz": [
        makeCatalogEntry({
          product_id: "p-arroz", id: "cat-cheap", supplier_id: "sup-cheap",
          supplier_name: "Cheapest", unit_price: 2.00, is_preferred: false,
        }),
        makeCatalogEntry({
          product_id: "p-arroz", id: "cat-pref", supplier_id: "sup-pref",
          supplier_name: "Preferred", unit_price: 2.09, is_preferred: true,
          // 2.09 is within 5% of 2.00 (threshold = 2.10)
        }),
      ],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    expect(result[0]!.suggested_supplier_id).toBe("sup-pref");
    expect(result[0]!.suggested_supplier_name).toBe("Preferred");
  });

  it("picks cheapest supplier when preferred exceeds 5% threshold", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 10 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 0, 0, 0));

    const catalog: CatalogMap = {
      "p-arroz": [
        makeCatalogEntry({
          product_id: "p-arroz", id: "cat-cheap", supplier_id: "sup-cheap",
          supplier_name: "Cheapest", unit_price: 2.00, is_preferred: false,
        }),
        makeCatalogEntry({
          product_id: "p-arroz", id: "cat-pref", supplier_id: "sup-pref",
          supplier_name: "Preferred", unit_price: 2.20, is_preferred: true,
          // 2.20 > 2.10 (5% threshold) -> cheapest wins
        }),
      ],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    expect(result[0]!.suggested_supplier_id).toBe("sup-cheap");
  });

  it("applies volume discounts to get better unit price", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 50 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 0, 0, 0));

    const catalog: CatalogMap = {
      "p-arroz": [
        makeCatalogEntry({
          product_id: "p-arroz",
          unit_price: 5.00,
          volume_discounts: [
            { min_qty: 10, unit_price: 4.00 },
            { min_qty: 50, unit_price: 3.00 },
          ],
        }),
      ],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    // qty_to_order=50, best volume discount at 50 units = 3.00
    expect(result[0]!.estimated_cost).toBe(150); // 50 * 3.00
  });

  it("uses base price when quantity is below all volume discount thresholds", () => {
    const demand = [makeDemandLine({ product_id: "p-arroz", total_qty_needed: 5 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-arroz", makeStock("p-arroz", 0, 0, 0));

    const catalog: CatalogMap = {
      "p-arroz": [
        makeCatalogEntry({
          product_id: "p-arroz",
          unit_price: 5.00,
          volume_discounts: [{ min_qty: 10, unit_price: 4.00 }],
        }),
      ],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    expect(result[0]!.estimated_cost).toBe(25); // 5 * 5.00
  });

  it("returns empty suggestions for empty demand", () => {
    const stock = new Map<string, StockSnapshot>();
    const catalog: CatalogMap = {};

    const result = generatePurchaseSuggestions([], stock, catalog);
    expect(result).toEqual([]);
  });

  it("handles product with no stock snapshot (assumes 0)", () => {
    const demand = [makeDemandLine({ product_id: "p-new", total_qty_needed: 10 })];
    const stock = new Map<string, StockSnapshot>(); // empty, no entry for p-new
    const catalog: CatalogMap = {
      "p-new": [makeCatalogEntry({ product_id: "p-new", unit_price: 4 })],
    };

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    expect(result).toHaveLength(1);
    // need = 10 - 0 + 0 = 10
    expect(result[0]!.qty_to_order).toBe(10);
    expect(result[0]!.qty_in_stock).toBe(0);
  });

  it("handles product with no catalog entry (no supplier)", () => {
    const demand = [makeDemandLine({ product_id: "p-orphan", total_qty_needed: 10 })];
    const stock = new Map<string, StockSnapshot>();
    stock.set("p-orphan", makeStock("p-orphan", 0, 0, 0));
    const catalog: CatalogMap = {}; // no entry

    const result = generatePurchaseSuggestions(demand, stock, catalog);

    expect(result).toHaveLength(1);
    expect(result[0]!.suggested_supplier_name).toBe("Sin proveedor");
    expect(result[0]!.estimated_cost).toBe(0);
  });
});
