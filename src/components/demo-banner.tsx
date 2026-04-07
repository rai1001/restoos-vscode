import { Info } from "lucide-react"

export function DemoBanner({ module }: { module: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
      <Info className="h-4 w-4 text-[var(--muted)] shrink-0" />
      <p className="text-sm text-[var(--muted)]">
        <span className="font-medium text-[var(--fg)]">{module}</span> muestra datos de ejemplo.
        Conecta con datos reales desde Configuración.
      </p>
    </div>
  )
}
