"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Tag, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrepBatches } from "@/features/labeling/hooks/use-prep-batches";
import type { PrepAlert } from "@/features/labeling/schemas/labeling.schema";

// ── Alert styling ─────────────────────────────────────────────────────────────

const ALERT_STYLE: Record<
  string,
  { dot: string; label: (a: PrepAlert) => string }
> = {
  expired: {
    dot: "bg-red-500",
    label: (a) =>
      `CADUCADO: ${a.prep_batches?.prep_name} — vencio ${
        a.prep_batches
          ? format(parseISO(a.prep_batches.expiry_date), "dd/MM", { locale: es })
          : ""
      }`,
  },
  expiry_24h: {
    dot: "bg-primary",
    label: (a) => `Caduca HOY: ${a.prep_batches?.prep_name}`,
  },
  expiry_48h: {
    dot: "bg-yellow-400",
    label: (a) => `Caduca manana: ${a.prep_batches?.prep_name}`,
  },
  expiry_72h: {
    dot: "bg-blue-400",
    label: (a) => `Caduca en 3 dias: ${a.prep_batches?.prep_name}`,
  },
};

// ── Widget ────────────────────────────────────────────────────────────────────

export function PrepAlertsWidget() {
  const { alerts, alertCount } = usePrepBatches();
  const top5 = alerts.slice(0, 5);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Alertas de Etiquetado
          </h3>
          {top5.length > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {alertCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        {top5.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Todo en orden
          </div>
        ) : (
          top5.map((alert) => {
            const style = ALERT_STYLE[alert.alert_type];
            if (!style) return null;
            return (
              <div
                key={alert.id}
                className="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    style.dot
                  )}
                />
                <span className="text-foreground">{style.label(alert)}</span>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t px-4 py-2.5">
        <Link
          href="/labeling/inventory"
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver todos →
        </Link>
      </div>
    </div>
  );
}
