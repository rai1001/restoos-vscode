"use client"

import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, ArrowRight, Zap, Eye, Trash2, Clock, ShieldCheck } from "lucide-react"
import type { Recommendation } from "../types"

const TYPE_CONFIG: Record<Recommendation["type"], { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  price_up: { icon: TrendingUp, color: "text-emerald-400", label: "Subir precio" },
  price_down: { icon: TrendingDown, color: "text-blue-400", label: "Bajar precio" },
  reduce_cost: { icon: Zap, color: "text-yellow-400", label: "Reducir coste" },
  move_position: { icon: ArrowRight, color: "text-purple-400", label: "Reposicionar" },
  batch_optimize: { icon: Clock, color: "text-blue-400", label: "Optimizar batch" },
  remove: { icon: Trash2, color: "text-red-400", label: "Retirar" },
  promote: { icon: Eye, color: "text-purple-400", label: "Promocionar" },
}

const SEVERITY_CONFIG = {
  high: { label: "Alto impacto", color: "bg-red-500/15 text-red-400 border-0" },
  medium: { label: "Impacto medio", color: "bg-yellow-500/15 text-yellow-400 border-0" },
  low: { label: "Optimización", color: "bg-blue-500/15 text-blue-400 border-0" },
}

export function RecommendationsTab({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <ShieldCheck className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
        <p className="text-foreground font-medium">Tu carta está optimizada</p>
        <p className="text-sm text-muted-foreground mt-1">No hay recomendaciones pendientes</p>
      </div>
    )
  }

  const high = recommendations.filter(r => r.severity === "high")
  const medium = recommendations.filter(r => r.severity === "medium")
  const low = recommendations.filter(r => r.severity === "low")

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <Badge className="bg-primary/15 text-primary border-0">
          {recommendations.length} recomendaciones
        </Badge>
        {high.length > 0 && (
          <Badge className={SEVERITY_CONFIG.high.color}>{high.length} alto impacto</Badge>
        )}
        {medium.length > 0 && (
          <Badge className={SEVERITY_CONFIG.medium.color}>{medium.length} medio</Badge>
        )}
      </div>

      {/* High severity */}
      {high.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-400">Acciones prioritarias</p>
          {high.map((rec, idx) => (
            <RecommendationCard key={idx} rec={rec} />
          ))}
        </div>
      )}

      {/* Medium severity */}
      {medium.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Oportunidades de mejora</p>
          {medium.map((rec, idx) => (
            <RecommendationCard key={idx} rec={rec} />
          ))}
        </div>
      )}

      {/* Low severity */}
      {low.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">Optimizaciones</p>
          {low.map((rec, idx) => (
            <RecommendationCard key={idx} rec={rec} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const config = TYPE_CONFIG[rec.type]
  const Icon = config.icon
  const sevConfig = SEVERITY_CONFIG[rec.severity]

  return (
    <div className="rounded-lg bg-card border border-border-subtle p-4 space-y-2 hover:border-border-hover transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${config.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{rec.action}</p>
            <p className="text-xs text-muted-foreground mt-1">{rec.impact}</p>
          </div>
        </div>
        <Badge className={`${sevConfig.color} shrink-0 text-xs`}>{config.label}</Badge>
      </div>
    </div>
  )
}
