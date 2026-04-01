"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Search, ArrowRight, ChefHat, CalendarDays, Package, Kanban,
  LayoutDashboard, Plus, ShoppingCart, ClipboardList, ArrowRightLeft,
  Users, Users2, UtensilsCrossed, TrendingUp, Calculator, ShieldCheck,
  FolderTree, Ruler, Bell, Zap, Settings, Truck, Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NAVIGATION_COMMANDS, RECIPE_COMMANDS, type CommandItem } from "@/lib/command-palette-data"

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, ChefHat, CalendarDays, Package, Kanban, Plus,
  ShoppingCart, ClipboardList, ArrowRightLeft, Users, Users2,
  UtensilsCrossed, TrendingUp, Calculator, ShieldCheck, FolderTree,
  Ruler, Bell, Zap, Settings, Truck, Layers,
}

const ALL_COMMANDS = [...NAVIGATION_COMMANDS, ...RECIPE_COMMANDS]

function scoreMatch(item: CommandItem, query: string): number {
  const q = query.toLowerCase()
  const label = item.label.toLowerCase()
  const desc = item.description?.toLowerCase() ?? ""
  const keywords = item.keywords?.join(" ").toLowerCase() ?? ""

  if (label.startsWith(q)) return 100
  if (label.includes(q)) return 80
  if (desc.includes(q)) return 60
  if (keywords.includes(q)) return 40
  return 0
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? ALL_COMMANDS
        .map(item => ({ item, score: scoreMatch(item, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item)
        .slice(0, 8)
    : NAVIGATION_COMMANDS.slice(0, 8)

  const resetPalette = useCallback(() => {
    setQuery("")
    setSelectedIndex(0)
  }, [])

  const handleClose = useCallback(() => {
    resetPalette()
    onClose()
  }, [onClose, resetPalette])

  const handleSelect = useCallback((item: CommandItem) => {
    if (item.href) {
      router.push(item.href)
    }
    handleClose()
  }, [router, handleClose])

  useEffect(() => {
    if (open) {
      const focusTimeout = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(focusTimeout)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        if (filtered.length > 0) {
          setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        if (filtered.length > 0) {
          setSelectedIndex(i => Math.max(i - 1, 0))
        }
      } else if (e.key === "Enter") {
        e.preventDefault()
        const item = filtered[selectedIndex]
        if (item) handleSelect(item)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, filtered, selectedIndex, handleSelect, handleClose])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  if (!open) return null

  const TYPE_LABEL: Record<CommandItem["type"], string> = {
    navigation: "Ir a",
    action: "Acción",
    recipe: "Receta",
    event: "Evento",
    product: "Producto",
  }

  const TYPE_COLOR: Record<CommandItem["type"], string> = {
    navigation: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    action: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    recipe: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    event: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    product: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border bg-background shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Buscar páginas, recetas, eventos..."
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon ? (ICON_MAP[item.icon] ?? Search) : Search
              const isSelected = i === selectedIndex
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-none">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium",
                      TYPE_COLOR[item.type]
                    )}>
                      {TYPE_LABEL[item.type]}
                    </span>
                    {isSelected && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">↑↓</kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">↵</kbd> abrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1">esc</kbd> cerrar
          </span>
        </div>
      </div>
    </>
  )
}
