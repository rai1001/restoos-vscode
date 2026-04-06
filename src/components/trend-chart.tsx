"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TrendPoint {
  date: string;
  data: Record<string, number>;
}

const METRICS = [
  { key: "events_confirmed", label: "Eventos confirmados", color: "#2563eb" },
  { key: "tasks_pending", label: "Tareas pendientes", color: "#f59e0b" },
  { key: "tasks_blocked", label: "Tareas bloqueadas", color: "#ef4444" },
  { key: "po_pending", label: "Pedidos pendientes", color: "#8b5cf6" },
  { key: "stock_expiring_3d", label: "Stock por caducar", color: "#B8906F" },
  { key: "alerts_active", label: "Alertas activas", color: "#ec4899" },
] as const;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (!data || data.length === 0) {
    return null;
  }

  const chartData = data.map((point) => ({
    date: formatDate(point.date),
    ...point.data,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia 7 dias</CardTitle>
        <CardDescription>
          Evolucion de metricas clave basada en snapshots diarios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              {METRICS.map((m) => (
                <Area
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  fill={m.color}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {METRICS.map((m) => (
            <div key={m.key} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
