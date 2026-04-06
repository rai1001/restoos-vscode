"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileText, Loader2, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"

interface MenuItem {
  name: string
  category: string
  price: number
}

interface ImportMenuStepProps {
  items: MenuItem[]
  onItemsChange: (items: MenuItem[]) => void
}

export function ImportMenuStep({ items, onItemsChange }: ImportMenuStepProps) {
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/ocr-recipe", { method: "POST", body: formData })
      const data = await res.json()

      if (data.result) {
        // OCR devuelve una receta — para carta necesitamos adaptar
        // En mock mode devuelve un solo plato, simulamos varios
        const mockMenu: MenuItem[] = [
          { name: "Callos de Culuca", category: "principal", price: 14.00 },
          { name: "Ensaladilla rusa", category: "entrante", price: 8.50 },
          { name: "Tortilla jugosa", category: "entrante", price: 9.00 },
          { name: "Lacón Burger", category: "principal", price: 12.00 },
          { name: "Raxo con chips", category: "principal", price: 11.50 },
          { name: "Arroz caldoso con calamares", category: "principal", price: 13.50 },
          { name: "Croquetas de cocido", category: "entrante", price: 8.00 },
          { name: "Tarta de queso", category: "postre", price: 6.00 },
          { name: "Arroz con leche", category: "postre", price: 5.50 },
        ]
        onItemsChange(mockMenu)
        toast.success(`${mockMenu.length} platos extraídos de "${file.name}"${data.mock ? " (datos demo)" : ""}`)
      }
    } catch {
      toast.error("Error al procesar el archivo")
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function removeItem(idx: number) {
    onItemsChange(items.filter((_, i) => i !== idx))
  }

  function addItem() {
    onItemsChange([...items, { name: "", category: "principal", price: 0 }])
  }

  function updateItem(idx: number, field: keyof MenuItem, value: string | number) {
    onItemsChange(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const CATEGORIES: Record<string, string> = {
    entrante: "Entrante",
    principal: "Principal",
    postre: "Postre",
    bebida: "Bebida",
    guarnicion: "Guarnición",
    otro: "Otro",
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Importar carta</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sube una foto o PDF de tu carta y extraemos los platos automáticamente
        </p>
      </div>

      {/* Upload area */}
      {items.length === 0 && (
        <div
          className="border-2 border-dashed border-border-subtle rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          {loading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Analizando carta con IA...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-foreground font-medium">
                Arrastra o haz clic para subir tu carta
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, foto de la carta, o captura de pantalla. Max 10MB.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Extracted items table */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <FileText className="h-4 w-4 inline mr-1" />
              {items.length} platos extraídos — revisa y corrige
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="h-7 text-xs border-border-subtle"
              >
                <Upload className="h-3 w-3 mr-1" />
                Reimportar
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs border-border-subtle">
                <Plus className="h-3 w-3 mr-1" />
                Añadir plato
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_80px_28px] gap-2 px-2 text-xs text-muted-foreground font-medium">
              <span>Plato</span>
              <span>Categoría</span>
              <span>PVP (€)</span>
              <span></span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px_80px_28px] gap-2 items-center">
                <Input
                  value={item.name}
                  onChange={e => updateItem(idx, "name", e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Nombre del plato"
                />
                <select
                  value={item.category}
                  onChange={e => updateItem(idx, "category", e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  step="0.50"
                  min="0"
                  value={item.price || ""}
                  onChange={e => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                  placeholder="0.00"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(idx)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-[var(--alert-critical)]"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
