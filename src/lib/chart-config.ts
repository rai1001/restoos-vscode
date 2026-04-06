/**
 * Chart color palette and configuration for RestoOS
 * Based on the Data Visualization Guide v1.0
 */

// Brand colors for charts
export const CHART_COLORS = {
  blue: "#378ADD",      // KPIs, primary series
  green: "#1D9E75",     // Stock ok, profit, success
  bronze: "#B8906F",    // Accent / secondary series
  amber: "#BA7517",     // Attention required
  red: "#E24B4A",       // Critical alerts, errors
  gray: "#888780",      // Secondary text, neutral
} as const;

// Series colors (ordered for multi-series charts)
export const SERIES_COLORS = [
  CHART_COLORS.blue,
  CHART_COLORS.red,
  CHART_COLORS.green,
  CHART_COLORS.amber,
  CHART_COLORS.bronze,
] as const;

// Semantic colors
export const STATUS_COLORS = {
  positive: CHART_COLORS.green,
  warning: CHART_COLORS.amber,
  critical: CHART_COLORS.red,
  neutral: CHART_COLORS.gray,
  primary: CHART_COLORS.blue,
} as const;

// Dark mode chart styles
export const CHART_THEME = {
  dark: {
    background: "transparent",
    gridStroke: "rgba(255,255,255,0.08)",
    axisStroke: "#888780",
    tooltipBg: "#1a1a1a",
    tooltipBorder: "#378ADD",
    tooltipText: "#f5f5f5",
    legendText: "#a0a0a0",
  },
  light: {
    background: "transparent",
    gridStroke: "#f0f0f0",
    axisStroke: "#888780",
    tooltipBg: "#ffffff",
    tooltipBorder: "#378ADD",
    tooltipText: "#1a1a1a",
    legendText: "#666666",
  },
} as const;

// Common chart margins
export const CHART_MARGINS = {
  default: { top: 5, right: 20, left: 0, bottom: 5 },
  withLegend: { top: 5, right: 20, left: 0, bottom: 20 },
  vertical: { top: 5, right: 30, left: 10, bottom: 5 },
} as const;

// Number formatters
export const formatCurrency = (v: number) => `€${v.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
export const formatPercent = (v: number) => `${v.toFixed(1)}%`;
export const formatUnits = (v: number) => `${v} uds`;
export const formatKg = (v: number) => `${v.toFixed(1)} kg`;

// Threshold helpers
export const getFoodCostColor = (pct: number) =>
  pct <= 30 ? CHART_COLORS.green : pct <= 35 ? CHART_COLORS.amber : CHART_COLORS.red;

export const getMarginColor = (pct: number) =>
  pct >= 65 ? CHART_COLORS.green : pct >= 50 ? CHART_COLORS.amber : CHART_COLORS.red;

export const getStockColor = (days: number) =>
  days <= 1 ? CHART_COLORS.red : days <= 3 ? CHART_COLORS.amber : CHART_COLORS.green;
