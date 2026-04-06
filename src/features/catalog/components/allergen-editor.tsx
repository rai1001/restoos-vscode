"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ALLERGENS, type AllergenKey } from "../allergen-types"

interface AllergenEditorProps {
  productId: string
  initialAllergens?: AllergenKey[]
  readOnly?: boolean
  onChange?: (allergens: AllergenKey[]) => void
}

export function AllergenEditor({
  initialAllergens = [],
  readOnly = false,
  onChange,
}: AllergenEditorProps) {
  const [selected, setSelected] = useState<Set<AllergenKey>>(new Set(initialAllergens))
  const [saving, setSaving] = useState(false)

  async function toggle(key: AllergenKey) {
    if (readOnly) return
    const next = new Set(selected)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setSelected(next)
    setSaving(true)
    // TODO: await supabase RPC update_product_allergens({ p_product_id: productId, p_allergens: [...next] })
    await new Promise<void>((r) => setTimeout(r, 300))
    setSaving(false)
    onChange?.([...next])
    toast.success(next.has(key) ? "Alérgeno añadido" : "Alérgeno eliminado", { duration: 1500 })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Alérgenos presentes</p>
        {saving && <span className="text-xs text-muted-foreground animate-pulse">Guardando...</span>}
        {selected.size === 0 && !saving && (
          <span className="text-xs text-muted-foreground">Ninguno declarado</span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {ALLERGENS.map((a) => {
          const active = selected.has(a.key)
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => toggle(a.key)}
              disabled={readOnly}
              title={a.description}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border p-2 text-center transition-all",
                "hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary",
                active
                  ? "border-[var(--alert-warning)] bg-[var(--alert-warning)]/10 dark:bg-[var(--alert-warning)]/40 dark:border-[var(--alert-warning)]"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50",
                readOnly && "cursor-default hover:border-border"
              )}
            >
              <span className="text-lg leading-none">{a.emoji}</span>
              <span
                className={cn(
                  "text-[9px] font-medium leading-tight",
                  active ? "text-[var(--alert-warning)] dark:text-[var(--alert-warning)]" : ""
                )}
              >
                {a.label}
              </span>
            </button>
          )
        })}
      </div>
      {selected.size > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.size} alérgeno{selected.size > 1 ? "s" : ""}:{" "}
          {[...selected].map((k) => ALLERGENS.find((a) => a.key === k)?.label).join(", ")}
        </p>
      )}
    </div>
  )
}
