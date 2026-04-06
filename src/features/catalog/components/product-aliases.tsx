"use client"
import { useState } from "react"
import { Plus, Trash2, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export interface ProductAlias {
  id: string
  product_id: string
  supplier_id: string | null
  supplier_name: string | null
  alias_name: string
  supplier_reference: string | null
}

interface ProductAliasesProps {
  productId: string
  initialAliases?: ProductAlias[]
}

export function ProductAliases({ productId, initialAliases = [] }: ProductAliasesProps) {
  const [aliases, setAliases] = useState<ProductAlias[]>(initialAliases)
  const [newAlias, setNewAlias] = useState("")
  const [newRef, setNewRef] = useState("")
  const [newSupplier, setNewSupplier] = useState("")
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleAdd() {
    if (!newAlias.trim()) return
    setAdding(true)
    await new Promise<void>((r) => setTimeout(r, 300))
    const alias: ProductAlias = {
      id: `alias-${Date.now()}`,
      product_id: productId,
      supplier_id: null,
      supplier_name: newSupplier.trim() || null,
      alias_name: newAlias.trim(),
      supplier_reference: newRef.trim() || null,
    }
    setAliases((prev) => [...prev, alias])
    setNewAlias("")
    setNewRef("")
    setNewSupplier("")
    setShowForm(false)
    setAdding(false)
    toast.success("Alias añadido")
  }

  async function handleRemove(id: string) {
    setAliases((prev) => prev.filter((a) => a.id !== id))
    toast.success("Alias eliminado")
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Nombres alternativos / aliases</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir alias
        </Button>
      </div>

      {showForm && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre alternativo *</label>
              <Input
                placeholder="ej: Filete de res"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Proveedor</label>
              <Input
                placeholder="ej: Proveedor García"
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Referencia del proveedor</label>
            <Input
              placeholder="ej: REF-001-TERNERA"
              value={newRef}
              onChange={(e) => setNewRef(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!newAlias.trim() || adding}
              onClick={handleAdd}
            >
              {adding ? "Añadiendo..." : "Añadir"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {aliases.length === 0 && !showForm ? (
        <p className="text-xs text-muted-foreground italic">
          Sin aliases definidos. Los aliases permiten identificar este producto con los nombres que usan
          distintos proveedores.
        </p>
      ) : (
        <div className="space-y-1.5">
          {aliases.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{a.alias_name}</span>
                {a.supplier_name && (
                  <span className="text-xs text-muted-foreground ml-2">— {a.supplier_name}</span>
                )}
                {a.supplier_reference && (
                  <span className="text-xs text-muted-foreground ml-2 font-mono">
                    #{a.supplier_reference}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-[var(--alert-critical)]"
                onClick={() => handleRemove(a.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
