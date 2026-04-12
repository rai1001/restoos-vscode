"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Loader2, Plus, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface InvoiceProduct {
  name: string
  quantity: number
  unit: string
  price: number
}

interface Invoice {
  supplier: string
  products: InvoiceProduct[]
}

interface ImportInvoicesStepProps {
  invoices: Invoice[]
  onInvoicesChange: (invoices: Invoice[]) => void
}

const MAX_CONCURRENT = 3

export function ImportInvoicesStep({ invoices, onInvoicesChange }: ImportInvoicesStepProps) {
  const [processing, setProcessing] = useState(0)
  const [total, setTotal] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  async function processFile(file: File): Promise<Invoice | null> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/ocr-albaran", { method: "POST", body: formData })
      const data = await res.json()

      if (data.result) {
        return {
          supplier: data.result.supplier_name || "Proveedor desconocido",
          products: data.result.items.map((item: { description: string; quantity: number; unit: string; unit_price: number }) => ({
            name: item.description,
            quantity: item.quantity,
            unit: item.unit,
            price: item.unit_price,
          })),
        }
      }
    } catch {
      toast.error(`Error procesando ${file.name}`)
    }
    return null
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setTotal(files.length)
    setProcessing(0)

    const newInvoices: Invoice[] = []

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
      const batch = files.slice(i, i + MAX_CONCURRENT)
      const results = await Promise.all(batch.map(f => processFile(f)))

      for (const result of results) {
        if (result) newInvoices.push(result)
      }

      setProcessing(Math.min(i + MAX_CONCURRENT, files.length))
    }

    if (newInvoices.length > 0) {
      onInvoicesChange([...invoices, ...newInvoices])
      const totalProducts = newInvoices.reduce((sum, inv) => sum + inv.products.length, 0)
      toast.success(`${newInvoices.length} albarán(es) procesados — ${totalProducts} productos extraídos`)
    }

    setTotal(0)
    setProcessing(0)
    if (fileRef.current) fileRef.current.value = ""
  }

  const isLoading = total > 0
  const totalProducts = invoices.reduce((sum, inv) => sum + inv.products.length, 0)
  const totalSuppliers = new Set(invoices.map(inv => inv.supplier)).size

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Importar albaranes / facturas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sube fotos de 2-3 albaranes recientes y crearemos tu catálogo de productos con precios reales.
          Puedes seleccionar varios archivos a la vez.
        </p>
      </div>

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-border-subtle rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => !isLoading && fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          multiple
          onChange={handleFileUpload}
        />
        {isLoading ? (
          <div className="space-y-2">
            <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">
              Procesando {processing} de {total} albarán(es)...
            </p>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${total > 0 ? (processing / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">
              {invoices.length === 0 ? "Sube tus albaranes" : "Añadir más albaranes"}
            </p>
            <p className="text-xs text-muted-foreground">
              Fotos de albaranes o facturas de proveedor. Puedes seleccionar varios. Max 10MB cada uno.
            </p>
          </div>
        )}
      </div>

      {/* Imported invoices summary */}
      {invoices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{invoices.length} albarán(es) · {totalSuppliers} proveedor(es) · {totalProducts} productos</span>
          </div>

          {invoices.map((inv, idx) => (
            <div key={idx} className="rounded-lg border border-border-subtle p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-foreground">{inv.supplier}</span>
                </div>
                <span className="text-xs text-muted-foreground">{inv.products.length} productos</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {inv.products.map((prod, pidx) => (
                  <div key={pidx} className="text-xs text-muted-foreground truncate">
                    {prod.name} — {prod.quantity}{prod.unit} a {prod.price.toFixed(2)}€
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="border-border-subtle"
            disabled={isLoading}
          >
            <Plus className="h-3 w-3 mr-1" />
            Añadir más albaranes
          </Button>
        </div>
      )}
    </div>
  )
}
