"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileText, Loader2, Trash2, Plus, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import readExcelFile from "read-excel-file/browser"

interface ProductRow {
  name: string
  category: string
  unit: string
  price: number
}

interface ImportProductsExcelProps {
  items: ProductRow[]
  onItemsChange: (items: ProductRow[]) => void
}

// Column name patterns (ES + EN)
const NAME_HEADERS = ["nombre", "producto", "item", "ingrediente", "descripcion", "descripción", "name", "product"]
const CATEGORY_HEADERS = ["categoria", "categoría", "category", "tipo", "type", "familia", "grupo"]
const UNIT_HEADERS = ["unidad", "ud", "unit", "medida", "uom"]
const PRICE_HEADERS = ["precio", "pvp", "price", "coste", "cost", "importe"]

function findCol(headers: string[], patterns: string[]): number {
  return headers.findIndex(h => patterns.some(p => h.toLowerCase().trim().includes(p)))
}

async function parseFile(file: File): Promise<ProductRow[]> {
  let rows: string[][]

  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "csv" || ext === "tsv") {
    const text = await file.text()
    const firstLine = text.split("\n")[0] ?? ""
    let sep = ","
    if (firstLine.includes("\t")) sep = "\t"
    else if (firstLine.includes(";")) sep = ";"

    rows = text.split("\n").map(l => l.trim()).filter(l => l.length > 0).map(l => l.split(sep).map(c => c.trim()))
  } else {
    const excelRows = await readExcelFile(file)
    rows = excelRows.map(row => row.map(cell => String(cell ?? "")))
  }

  if (rows.length < 2) return []

  const headers = rows[0] ?? []
  const nameIdx = findCol(headers, NAME_HEADERS)
  const catIdx = findCol(headers, CATEGORY_HEADERS)
  const unitIdx = findCol(headers, UNIT_HEADERS)
  const priceIdx = findCol(headers, PRICE_HEADERS)

  const ni = nameIdx >= 0 ? nameIdx : 0
  const startRow = nameIdx >= 0 ? 1 : 0

  const products: ProductRow[] = []
  for (let i = startRow; i < rows.length; i++) {
    const cols = rows[i] ?? []
    const name = cols[ni]?.trim()
    if (!name) continue

    products.push({
      name,
      category: catIdx >= 0 ? (cols[catIdx]?.trim() || "General") : "General",
      unit: unitIdx >= 0 ? (cols[unitIdx]?.trim() || "ud") : "ud",
      price: priceIdx >= 0 ? (parseFloat((cols[priceIdx] ?? "0").replace(",", ".")) || 0) : 0,
    })
  }

  return products
}

export function ImportProductsExcel({ items, onItemsChange }: ImportProductsExcelProps) {
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const products = await parseFile(file)
      if (products.length === 0) {
        toast.error("No se encontraron productos en el archivo")
        return
      }
      onItemsChange(products)
      toast.success(`${products.length} productos importados de "${file.name}"`)
    } catch {
      toast.error("Error al leer el archivo")
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function removeItem(idx: number) {
    onItemsChange(items.filter((_, i) => i !== idx))
  }

  function addItem() {
    onItemsChange([...items, { name: "", category: "General", unit: "ud", price: 0 }])
  }

  function updateItem(idx: number, field: keyof ProductRow, value: string | number) {
    onItemsChange(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {items.length === 0 && (
        <div
          className="border-2 border-dashed border-border-subtle rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv"
            className="hidden"
            onChange={handleFileUpload}
          />
          {loading ? (
            <div className="space-y-2">
              <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Leyendo archivo...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <FileSpreadsheet className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-sm text-foreground font-medium">
                Importar desde Excel o CSV
              </p>
              <p className="text-xs text-muted-foreground">
                Columnas: nombre, categoría, unidad, precio. Se detectan automáticamente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <FileText className="h-4 w-4 inline mr-1" />
              {items.length} productos — revisa y corrige
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => fileRef.current?.click()}
                className="h-7 text-xs border-border-subtle"
              >
                <Upload className="h-3 w-3 mr-1" />
                Reimportar
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="outline" size="sm" onClick={addItem} className="h-7 text-xs border-border-subtle">
                <Plus className="h-3 w-3 mr-1" />
                Añadir
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-[1fr_100px_60px_70px_28px] gap-2 px-2 text-xs text-muted-foreground font-medium">
              <span>Producto</span>
              <span>Categoría</span>
              <span>Ud</span>
              <span>Precio</span>
              <span></span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_100px_60px_70px_28px] gap-2 items-center">
                <Input
                  value={item.name}
                  onChange={e => updateItem(idx, "name", e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Nombre"
                />
                <Input
                  value={item.category}
                  onChange={e => updateItem(idx, "category", e.target.value)}
                  className="h-8 text-sm"
                  placeholder="Cat."
                />
                <Input
                  value={item.unit}
                  onChange={e => updateItem(idx, "unit", e.target.value)}
                  className="h-8 text-sm"
                  placeholder="ud"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.price || ""}
                  onChange={e => updateItem(idx, "price", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                  placeholder="0.00"
                />
                <Button
                  variant="ghost" size="sm"
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
