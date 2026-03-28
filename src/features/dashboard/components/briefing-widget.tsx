"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Loader2, RefreshCw, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BriefingWidgetProps {
  eventsToday?: number
  eventsWeek?: number
  pendingTasks?: number
  blockedTasks?: number
  expiringLots?: number
  lowStockItems?: number
  foodCostWeek?: number
}

export function BriefingWidget({
  eventsToday = 2,
  eventsWeek = 5,
  pendingTasks = 8,
  blockedTasks = 1,
  expiringLots = 3,
  lowStockItems = 2,
  foodCostWeek = 30.5,
}: BriefingWidgetProps) {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isMock, setIsMock] = useState(false)

  async function generateBriefing() {
    setLoading(true)
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          events_today: eventsToday,
          events_week: eventsWeek,
          pending_tasks: pendingTasks,
          blocked_tasks: blockedTasks,
          expiring_lots: expiringLots,
          low_stock_items: lowStockItems,
          food_cost_week: foodCostWeek,
        }),
      })
      const data = await res.json() as { briefing: string; mock: boolean }
      setBriefing(data.briefing)
      setIsMock(data.mock)
    } catch {
      setBriefing("No se pudo generar el briefing. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-purple-500" />
            Briefing diario IA
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateBriefing}
            disabled={loading}
            className="h-8 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className={cn("h-3.5 w-3.5", briefing && "mr-1")} />
            )}
            {briefing ? "Regenerar" : "Generar briefing"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!briefing && !loading && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Brain className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Genera un resumen inteligente del día con recomendaciones para tu equipo
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            <span className="text-sm text-muted-foreground">Analizando datos de cocina...</span>
          </div>
        )}

        {briefing && !loading && (
          <div className="space-y-2">
            {isMock && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Respuesta de demo — configura GEMINI_API_KEY para IA real
              </div>
            )}
            <div className="text-sm leading-relaxed whitespace-pre-wrap rounded-md bg-muted/40 p-4">
              {briefing}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
