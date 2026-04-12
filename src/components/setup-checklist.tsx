"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChecklistItem {
  id: string
  label: string
  href: string
  completed: boolean
}

interface SetupChecklistProps {
  items: ChecklistItem[]
  onDismiss?: () => void
}

export function SetupChecklist({ items, onDismiss }: SetupChecklistProps) {
  const [collapsed, setCollapsed] = useState(false)

  const completed = items.filter(i => i.completed).length
  const total = items.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  if (completed === total) return null

  return (
    <div className="rounded-xl border border-border-subtle bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          Configura tu restaurante
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{completed}/{total}</span>
          {onDismiss && (
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="space-y-1">
          {items.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                item.completed
                  ? "text-muted-foreground"
                  : "text-foreground hover:bg-primary/5"
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              )}
              <span className={cn(item.completed && "line-through")}>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
