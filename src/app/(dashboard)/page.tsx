"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  ChefHat,
  CalendarDays,
  ShoppingCart,
  ShieldCheck,
  Calculator,
  Users2,
  Package,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Info,
  PlusCircle,
  ClipboardList,
  UserPlus,
  UtensilsCrossed,
  Search,
  Bell,
  Settings,
  Trash2,
  Tag,
  Loader2,
} from "lucide-react";
import {
  ComposedChart,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  DASHBOARD_KPIS,
  DASHBOARD_ALERTS,
  MODULE_STATUS,
  UPCOMING_EVENTS,
  type KpiMetric,
  type AlertItem,
  type ModuleStatus,
  type UpcomingEvent,
} from "@/features/dashboard/dashboard-mock-data";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard";
import type { DashboardData, DashboardAlert, DashboardEvent } from "@/features/dashboard/hooks/use-dashboard";
import { BriefingWidget } from "@/features/dashboard/components/briefing-widget";
import { PrepAlertsWidget } from "@/features/labeling/components/prep-alerts-widget";
import {
  CHART_COLORS,
  CHART_MARGINS,
  formatCurrency,
  formatPercent,
} from "@/lib/chart-config";

// ── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bg: "#0A0A0A",
  card: "#1A1A1A",
  cardHover: "#222222",
  sidebar: "#111111",
  primary: "#F97316",
  text: "#E5E2E1",
  textSecondary: "#A78B7D",
  ghostBorder: "rgba(88, 66, 55, 0.15)",
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

const hour = new Date().getHours();
const greeting =
  hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";

const todayLabel = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest text-[#A78B7D]">
      {children}
    </h2>
  );
}

// ── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  ChefHat,
  CalendarDays,
  ShoppingCart,
  ShieldCheck,
  Calculator,
  Users2,
  Package,
  BarChart3,
};

// ── Trend pill ────────────────────────────────────────────────────────────────

function TrendPill({ trend, inverted }: { trend: number; inverted?: boolean }) {
  if (trend === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs font-medium text-[#A78B7D]">
        —
      </span>
    );
  }
  const isGood = inverted ? trend < 0 : trend > 0;
  const absVal = Math.abs(trend).toFixed(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
        isGood
          ? "bg-green-900/30 text-green-400"
          : "bg-red-900/30 text-red-400"
      )}
    >
      {trend > 0 ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {trend > 0 ? "+" : ""}
      {absVal}%
    </span>
  );
}

// ── KPI color map ─────────────────────────────────────────────────────────────

const KPI_ACCENT_BG: Record<KpiMetric["color"], string> = {
  green: "bg-green-500/10",
  blue: "bg-blue-500/10",
  orange: "bg-orange-500/10",
  purple: "bg-purple-500/10",
  red: "bg-red-500/10",
  yellow: "bg-yellow-500/10",
};

const KPI_VALUE_COLOR: Record<KpiMetric["color"], string> = {
  green: "text-green-400",
  blue: "text-blue-400",
  orange: "text-orange-400",
  purple: "text-purple-400",
  red: "text-red-400",
  yellow: "text-yellow-400",
};

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ kpi, large }: { kpi: KpiMetric; large?: boolean }) {
  const Icon = ICON_MAP[kpi.icon] ?? TrendingUp;
  return (
    <div
      className={cn(
        "rounded-lg bg-[#1A1A1A] transition-colors hover:bg-[#222222]",
        large ? "p-5" : "p-4"
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", KPI_ACCENT_BG[kpi.color])}>
          <Icon className={cn("h-4 w-4", KPI_VALUE_COLOR[kpi.color])} />
        </div>
        <TrendPill trend={kpi.trend} inverted={kpi.trendInverted} />
      </div>
      <p
        className={cn(
          "font-bold leading-tight",
          KPI_VALUE_COLOR[kpi.color],
          large ? "text-3xl" : "text-2xl"
        )}
      >
        {kpi.value}
      </p>
      <p className="mt-1 text-sm font-medium text-[#E5E2E1]">{kpi.label}</p>
      {kpi.subvalue && (
        <p className="mt-0.5 text-xs text-[#A78B7D]">{kpi.subvalue}</p>
      )}
    </div>
  );
}

// ── Chart mock data ───────────────────────────────────────────────────────────

const revenueData = [
  { day: "Lun", ingresos: 3200, costes: 1100 },
  { day: "Mar", ingresos: 2800, costes: 980 },
  { day: "Mie", ingresos: 3100, costes: 1050 },
  { day: "Jue", ingresos: 3500, costes: 1200 },
  { day: "Vie", ingresos: 4800, costes: 1650 },
  { day: "Sab", ingresos: 5200, costes: 1780 },
  { day: "Dom", ingresos: 4100, costes: 1400 },
];

const foodCostData = [
  { day: "Lun", foodCost: 28.5 },
  { day: "Mar", foodCost: 31.2 },
  { day: "Mie", foodCost: 27.8 },
  { day: "Jue", foodCost: 29.4 },
  { day: "Vie", foodCost: 32.1 },
  { day: "Sab", foodCost: 30.5 },
  { day: "Dom", foodCost: 28.9 },
];

const topDishesData = [
  { plato: "Solomillo al Oporto", unidades: 45 },
  { plato: "Gazpacho andaluz", unidades: 38 },
  { plato: "Tarta de queso", unidades: 35 },
  { plato: "Merluza en salsa", unidades: 28 },
  { plato: "Arroz con bogavante", unidades: 22 },
];

// ── Shared tooltip style ─────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#1A1A1A",
    border: `1px solid rgba(88, 66, 55, 0.3)`,
    borderRadius: 8,
    color: "#E5E2E1",
    fontSize: 12,
  },
  itemStyle: { color: "#E5E2E1" },
  labelStyle: { color: "#E5E2E1", fontWeight: 600 },
};

// ── Revenue & Food Cost Combo Chart ─────────────────────────────────────────

function RevenueChart() {
  return (
    <div className="rounded-lg bg-[#1A1A1A] p-5">
      <SectionLabel>Ingresos &amp; Food Cost (7 dias)</SectionLabel>
      <div className="mt-3">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={revenueData} margin={CHART_MARGINS.default}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              stroke="#A78B7D"
              tick={{ fontSize: 11, fill: "#A78B7D" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#A78B7D"
              tick={{ fontSize: 11, fill: "#A78B7D" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v / 1000}k`}
            />
            <Tooltip
              formatter={((value: number, name: string) => [
                formatCurrency(value),
                name === "ingresos" ? "Ingresos" : "Costes",
              ]) as never}
              {...tooltipStyle}
            />
            <Bar
              dataKey="ingresos"
              fill="#F97316"
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
              barSize={24}
              name="ingresos"
            />
            <Line
              type="monotone"
              dataKey="costes"
              stroke="#E24B4A"
              strokeWidth={2}
              dot={false}
              name="costes"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Food Cost Line Chart ──────────────────────────────────────────────────────

function FoodCostChart() {
  return (
    <div className="rounded-lg bg-[#1A1A1A] p-5">
      <div className="mb-3 flex items-center justify-between">
        <SectionLabel>Food Cost % — 7 dias</SectionLabel>
        <div className="flex items-center gap-1.5 text-xs text-[#A78B7D]">
          <span
            className="inline-block h-px w-4"
            style={{ borderTop: `2px dashed ${CHART_COLORS.amber}` }}
          />
          Objetivo 30%
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={foodCostData} margin={CHART_MARGINS.default}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <ReferenceArea
            y1={0}
            y2={30}
            fill={CHART_COLORS.green}
            fillOpacity={0.04}
          />
          <ReferenceArea
            y1={30}
            y2={35}
            fill={CHART_COLORS.amber}
            fillOpacity={0.06}
          />
          <ReferenceArea
            y1={35}
            y2={40}
            fill={CHART_COLORS.red}
            fillOpacity={0.06}
          />
          <XAxis
            dataKey="day"
            stroke="#A78B7D"
            tick={{ fontSize: 11, fill: "#A78B7D" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[24, 40]}
            stroke="#A78B7D"
            tick={{ fontSize: 11, fill: "#A78B7D" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            formatter={((value: number) => [formatPercent(value), "Food Cost"]) as never}
            {...tooltipStyle}
          />
          <ReferenceLine
            y={30}
            stroke={CHART_COLORS.amber}
            strokeDasharray="6 3"
            strokeWidth={2}
            label={{
              value: "30%",
              position: "right",
              fill: CHART_COLORS.amber,
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="foodCost"
            stroke="#F97316"
            strokeWidth={2}
            dot={{ r: 4, fill: "#F97316", strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "#F97316" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Top 5 Dishes Horizontal Bar Chart ────────────────────────────────────────

function TopDishesChart() {
  const barColors = ["#F97316", "#E24B4A", "#1D9E75", "#BA7517", "#378ADD"];
  return (
    <div className="rounded-lg bg-[#1A1A1A] p-5">
      <div className="mb-3 flex items-center gap-2">
        <UtensilsCrossed className="h-4 w-4 text-[#F97316]" />
        <SectionLabel>Top 5 Platos</SectionLabel>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={topDishesData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke="#A78B7D"
            tick={{ fontSize: 11, fill: "#A78B7D" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="plato"
            stroke="#A78B7D"
            tick={{ fontSize: 11, fill: "#A78B7D" }}
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <Tooltip
            formatter={((value: number) => [`${value} uds`, "Vendidos"]) as never}
            {...tooltipStyle}
          />
          <Bar dataKey="unidades" radius={[0, 4, 4, 0]} barSize={18}>
            {topDishesData.map((_, index) => (
              <Cell key={index} fill={barColors[index % barColors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Alert dot colors ─────────────────────────────────────────────────────────

const ALERT_STYLES: Record<
  AlertItem["type"],
  { border: string; dot: string; badge: string }
> = {
  critico: {
    border: "border-l-red-500",
    dot: "bg-red-500",
    badge: "bg-red-900/30 text-red-400",
  },
  alerta: {
    border: "border-l-yellow-500",
    dot: "bg-yellow-500",
    badge: "bg-yellow-900/30 text-yellow-400",
  },
  info: {
    border: "border-l-blue-500",
    dot: "bg-blue-400",
    badge: "bg-blue-900/30 text-blue-400",
  },
};

function AlertRow({ alert }: { alert: AlertItem }) {
  const styles = ALERT_STYLES[alert.type];
  return (
    <Link
      href={alert.href}
      className={cn(
        "flex items-start gap-3 rounded-md border-l-4 bg-[#111111] px-3 py-2.5 transition-colors hover:bg-[#1F1F1F]",
        styles.border
      )}
    >
      <span
        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", styles.dot)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold",
              styles.badge
            )}
          >
            {alert.module}
          </span>
          <span className="text-xs text-[#A78B7D]">{alert.time}</span>
        </div>
        <p className="mt-0.5 text-sm text-[#E5E2E1]">{alert.message}</p>
      </div>
      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[#A78B7D]" />
    </Link>
  );
}

// ── Centro de Alertas panel ──────────────────────────────────────────────────

function AlertsPanel({ items }: { items: AlertItem[] }) {
  const urgentCount = items.filter(
    (a) => a.type !== "info"
  ).length;

  return (
    <div className="rounded-lg bg-[#1A1A1A]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#F97316]" />
          <SectionLabel>Centro de Alertas</SectionLabel>
          {urgentCount > 0 && (
            <span className="rounded-full bg-red-900/30 px-2 py-0.5 text-xs font-semibold text-red-400">
              {urgentCount}
            </span>
          )}
        </div>
        <Info className="h-4 w-4 text-[#A78B7D]" />
      </div>
      <div className="flex flex-col gap-2 px-4 pb-3">
        {items.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>
      <div className="px-5 py-3" style={{ borderTop: `1px solid ${T.ghostBorder}` }}>
        <Link
          href="/appcc"
          className="text-xs font-medium text-[#F97316] hover:underline"
        >
          Ver todas las alertas →
        </Link>
      </div>
    </div>
  );
}

// ── Events table ──────────────────────────────────────────────────────────────

const EVENT_STATUS_STYLE: Record<
  UpcomingEvent["status"],
  { label: string; cls: string }
> = {
  confirmado: {
    label: "Confirmado",
    cls: "bg-green-900/30 text-green-400",
  },
  en_preparacion: {
    label: "En preparacion",
    cls: "bg-blue-900/30 text-blue-400",
  },
  pendiente: {
    label: "Pendiente",
    cls: "bg-yellow-900/30 text-yellow-400",
  },
};

function formatEventDate(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function EventsTable({ items }: { items: UpcomingEvent[] }) {
  return (
    <div className="rounded-lg bg-[#1A1A1A]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-purple-400" />
          <SectionLabel>Próximas Reservas de Grupo</SectionLabel>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.ghostBorder}` }}>
              <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                Evento
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                Fecha
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                Pax
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                Estado
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                Personal
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">
                Accion
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((evt) => {
              const statusStyle = EVENT_STATUS_STYLE[evt.status];
              const staffRatio =
                evt.staffTotal > 0
                  ? (evt.staffConfirmed / evt.staffTotal) * 100
                  : 0;
              return (
                <tr
                  key={evt.id}
                  className="transition-colors hover:bg-[#222222]"
                  style={{ borderBottom: `1px solid ${T.ghostBorder}` }}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/reservations/${evt.id}`}
                      className="font-medium text-[#E5E2E1] hover:text-[#F97316] hover:underline"
                    >
                      {evt.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-[#A78B7D]">
                    {formatEventDate(evt.date)}
                  </td>
                  <td className="px-3 py-3 text-right text-[#E5E2E1]">
                    {evt.guests}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        statusStyle.cls
                      )}
                    >
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {evt.staffTotal > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#A78B7D]">
                          {evt.staffConfirmed}/{evt.staffTotal}
                        </span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#2A2A2A]">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              staffRatio === 100
                                ? "bg-green-500"
                                : staffRatio >= 50
                                  ? "bg-yellow-400"
                                  : "bg-red-400"
                            )}
                            style={{ width: `${staffRatio}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-[#A78B7D]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/reservations/${evt.id}`}
                      className="text-xs font-medium text-[#F97316] hover:underline"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3" style={{ borderTop: `1px solid ${T.ghostBorder}` }}>
        <Link
          href="/reservations"
          className="text-xs font-medium text-[#F97316] hover:underline"
        >
          Ver todas las reservas →
        </Link>
      </div>
    </div>
  );
}

// ── Module status grid ────────────────────────────────────────────────────────

const STATUS_DOT: Record<ModuleStatus["status"], string> = {
  ok: "bg-green-500",
  warning: "bg-yellow-400",
  critical: "bg-red-500",
  inactive: "bg-[#A78B7D]",
};

const STATUS_LABEL_COLOR: Record<ModuleStatus["status"], string> = {
  ok: "text-green-400",
  warning: "text-yellow-400",
  critical: "text-red-400",
  inactive: "text-[#A78B7D]",
};

function ModuleCard({ mod }: { mod: ModuleStatus }) {
  const Icon = ICON_MAP[mod.icon] ?? BarChart3;
  return (
    <Link
      href={mod.href}
      className="flex items-start gap-3 rounded-lg bg-[#111111] p-3 transition-colors hover:bg-[#1F1F1F]"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#A78B7D]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-medium text-[#E5E2E1]">
            {mod.name}
          </span>
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              STATUS_DOT[mod.status]
            )}
          />
        </div>
        <p className={cn("text-xs font-medium", STATUS_LABEL_COLOR[mod.status])}>
          {mod.statusLabel}
        </p>
        <p className="text-xs text-[#A78B7D]">{mod.lastActivity}</p>
      </div>
    </Link>
  );
}

function ModulesGrid() {
  return (
    <div className="rounded-lg bg-[#1A1A1A]">
      <div className="flex items-center gap-2 px-5 py-4">
        <BarChart3 className="h-4 w-4 text-[#A78B7D]" />
        <SectionLabel>Estado de modulos</SectionLabel>
      </div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        {MODULE_STATUS.map((mod) => (
          <ModuleCard key={mod.href} mod={mod} />
        ))}
      </div>
    </div>
  );
}

// ── Quick actions bar (bottom) ───────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: "Inventario",
    href: "/inventory/lots",
    Icon: Package,
    accent: "text-blue-400",
  },
  {
    label: "Nuevo Pedido",
    href: "/procurement/orders",
    Icon: ShoppingCart,
    accent: "text-green-400",
  },
  {
    label: "Merma Diario",
    href: "/inventory/waste",
    Icon: Trash2,
    accent: "text-red-400",
  },
  {
    label: "Etiquetado",
    href: "/labeling",
    Icon: Tag,
    accent: "text-purple-400",
  },
  {
    label: "Nueva Reserva",
    href: "/reservations",
    Icon: PlusCircle,
    accent: "text-[#F97316]",
  },
  {
    label: "Registro APPCC",
    href: "/appcc",
    Icon: ClipboardList,
    accent: "text-yellow-400",
  },
  {
    label: "Asignar Turno",
    href: "/staffing",
    Icon: UserPlus,
    accent: "text-cyan-400",
  },
  {
    label: "Escandallo",
    href: "/escandallo",
    Icon: Calculator,
    accent: "text-[#F97316]",
  },
] as const;

function QuickActionsBar() {
  return (
    <div className="rounded-lg bg-[#1A1A1A] px-5 py-4">
      <SectionLabel>Acciones rapidas</SectionLabel>
      <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8">
        {QUICK_ACTIONS.map(({ label, href, Icon, accent }) => (
          <Link
            key={href + label}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-lg bg-[#111111] p-3 text-center transition-colors hover:bg-[#222222]"
          >
            <Icon className={cn("h-6 w-6", accent)} />
            <span className="text-[10px] font-medium leading-tight text-[#A78B7D]">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

// ── Build KPIs from live data (fallback to mock) ─────────────────────────────

function buildKpisFromLive(data: DashboardData | null): KpiMetric[] {
  if (!data) return DASHBOARD_KPIS;

  const c = data.current;
  return [
    {
      label: "Reservas de grupo",
      value: String(c.events_confirmed),
      subvalue: `${c.events_upcoming_7d} próximos 7 días`,
      trend: 0,
      icon: "CalendarDays",
      color: "purple",
    },
    {
      label: "Tareas pendientes",
      value: String(c.tasks_pending),
      subvalue: c.tasks_blocked > 0 ? `${c.tasks_blocked} bloqueadas` : "Sin bloqueos",
      trend: 0,
      icon: "ShieldCheck",
      color: c.tasks_blocked > 0 ? "red" : "green",
    },
    {
      label: "Pedidos en curso",
      value: String(c.po_pending),
      subvalue: `${c.stock_expiring_3d} lotes por caducar`,
      trend: 0,
      icon: "ShoppingCart",
      color: "orange",
    },
    {
      label: "Recetas por revisar",
      value: String(c.recipes_pending_review),
      subvalue: "pendientes de aprobación",
      trend: 0,
      icon: "ChefHat",
      color: "blue",
    },
    {
      label: "Alertas activas",
      value: String(c.alerts_active),
      subvalue: c.alerts_active > 0 ? "requieren atención" : "todo en orden",
      trend: 0,
      icon: "Calculator",
      color: c.alerts_active > 0 ? "red" : "green",
    },
    {
      label: "Jobs fallidos",
      value: String(c.jobs_failed),
      subvalue: c.jobs_failed > 0 ? "automatizaciones con error" : "todo ok",
      trend: 0,
      icon: "TrendingUp",
      color: c.jobs_failed > 0 ? "yellow" : "green",
    },
  ];
}

// ── Map live alerts to AlertItem format ───────────────────────────────────────

function mapLiveAlerts(alerts: DashboardAlert[]): AlertItem[] {
  return alerts.map((a) => ({
    id: a.id,
    type: a.severity === "critical" ? "critico" : a.severity === "warning" ? "alerta" : "info",
    module: a.alert_type.replace(/_/g, " "),
    message: a.title,
    time: new Date(a.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    href: "/appcc",
  }));
}

// ── Map live events to UpcomingEvent format ───────────────────────────────────

function mapLiveEvents(events: DashboardEvent[]): UpcomingEvent[] {
  return events.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.event_date,
    guests: e.guest_count,
    status: e.status === "confirmed" ? "confirmado" : e.status === "in_operation" ? "en_preparacion" : "pendiente",
    staffConfirmed: 0,
    staffTotal: 0,
  }));
}

export default function DashboardPage() {
  const { data: liveData, loading: liveLoading, error: liveError } = useDashboardData();

  // Use live data when available, fallback to mock
  const isLive = liveData !== null && !liveError;
  const kpis = buildKpisFromLive(liveData);
  const alerts = isLive ? mapLiveAlerts(liveData!.active_alerts) : DASHBOARD_ALERTS;
  const events = isLive ? mapLiveEvents(liveData!.upcoming_events) : UPCOMING_EVENTS;

  // Split KPIs: first 3 large, rest smaller
  const primaryKpis = kpis.slice(0, 3);
  const secondaryKpis = kpis.slice(3);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E5E2E1]">
            {greeting}, Chef <span role="img" aria-label="wave">👋</span>
          </h1>
          <p className="mt-1 text-sm text-[#A78B7D]">
            {isLive ? "Datos en vivo" : "Vista previa (datos de ejemplo)"} · Hoy,{" "}
            {capitalize(todayLabel)}
            {liveLoading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-lg bg-[#1A1A1A] px-3 py-2">
            <Search className="h-4 w-4 text-[#A78B7D]" />
            <span className="text-sm text-[#A78B7D]">Buscar...</span>
          </div>
          {/* Notification bell */}
          <button className="relative rounded-lg bg-[#1A1A1A] p-2 transition-colors hover:bg-[#222222]" aria-label="Notificaciones">
            <Bell className="h-4 w-4 text-[#A78B7D]" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          {/* Settings gear */}
          <button className="rounded-lg bg-[#1A1A1A] p-2 transition-colors hover:bg-[#222222]" aria-label="Configuración">
            <Settings className="h-4 w-4 text-[#A78B7D]" />
          </button>
          {/* Nuevo Escandallo button */}
          <Link
            href="/escandallo"
            className="rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#EA6C0B]"
          >
            + Nuevo Escandallo
          </Link>
        </div>
      </div>

      {/* ── Primary KPIs (3 large cards) ───────────────────────────────── */}
      <div>
        <SectionLabel>KPIs principales</SectionLabel>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {primaryKpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} large />
          ))}
        </div>
      </div>

      {/* ── Secondary KPIs (3 smaller cards) ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {secondaryKpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* ── Prep Alerts (existing widget) ──────────────────────────────── */}
      <PrepAlertsWidget />

      {/* ── Charts row + Centro de Alertas ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: charts (2/3 width) */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <RevenueChart />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FoodCostChart />
            <TopDishesChart />
          </div>
        </div>
        {/* Right: Centro de Alertas (1/3 width) */}
        <div className="lg:col-span-1">
          <AlertsPanel items={alerts} />
        </div>
      </div>

      {/* ── Events table + Modules grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EventsTable items={events} />
        <ModulesGrid />
      </div>

      {/* ── Briefing IA (existing widget) ──────────────────────────────── */}
      <BriefingWidget
        eventsToday={liveData?.current.events_today ?? 2}
        eventsWeek={liveData?.current.events_upcoming_7d ?? 5}
        pendingTasks={liveData?.current.tasks_pending ?? 8}
        blockedTasks={liveData?.current.tasks_blocked ?? 1}
        expiringLots={liveData?.current.stock_expiring_3d ?? 3}
        lowStockItems={2}
        foodCostWeek={28.4}
      />

      {/* ── Quick Actions Bar (bottom) ─────────────────────────────────── */}
      <QuickActionsBar />
    </div>
  );
}
