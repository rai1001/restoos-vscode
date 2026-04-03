// Agent shared types for CulinaryOS

export interface AgentLog {
  hotel_id: string;
  agent_name: string;
  triggered_at: string;
  completed_at?: string;
  tokens_input?: number;
  tokens_output?: number;
  result?: Record<string, unknown>;
  error?: string;
  duration_ms?: number;
}

export interface GeminiResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface EscandalloUpdate {
  recipe_id: string;
  recipe_name: string;
  old_cost: number;
  new_cost: number;
  old_margin_pct: number;
  new_margin_pct: number;
  alert: boolean;
  selling_price: number;
}

export interface MenuClassification {
  recipe_id: string;
  name: string;
  category: string;
  units_sold: number;
  popularity_pct: number;
  cost_per_serving: number;
  selling_price: number;
  margin_pct: number;
  classification: 'estrella' | 'caballo' | 'puzzle' | 'perro';
  recommendation: string;
}

export interface OcrInvoiceLine {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  vat_pct: number;
}

export interface OcrInvoiceResult {
  supplier_name: string;
  supplier_nif: string;
  invoice_number: string;
  invoice_date: string;
  lines: OcrInvoiceLine[];
  subtotal: number;
  vat_total: number;
  total: number;
  confidence: number;
}

export interface Discrepancy {
  type: 'price_mismatch' | 'quantity_mismatch' | 'nif_mismatch' | 'missing_field';
  field: string;
  expected: string;
  actual: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AppccDailyClosure {
  date: string;
  hotel_id: string;
  total_checks: number;
  ok_count: number;
  alert_count: number;
  critical_count: number;
  missing_checks: string[];
  anomalies: Array<{
    template_name: string;
    value: number;
    min: number;
    max: number;
    status: string;
  }>;
  hash: string;
}

export interface StockAlert {
  product_id: string;
  product_name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  urgency: 'warning' | 'critical';
  supplier_id: string;
  supplier_name: string;
  suggested_quantity: number;
  avg_daily_consumption: number;
}
