"use client"

import Image from "next/image"
import { useState, useRef } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, FileText, CheckCircle, Loader2, AlertTriangle, Camera } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface OCRItem {
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
}

interface OCRResult {
  supplier_name: string | null
  delivery_date: string | null
  invoice_number: string | null
  items: OCRItem[]
  total_amount: number | null
  notes: string | null
}

interface OCRAlbaranDialogProps {
  open: boolean
  onClose: () => void
  onApply?: (result: OCRResult) => void
}

export function OCRAlbaranDialog({ open, onClose, onApply }: OCRAlbaranDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OCRResult | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    if (f.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleScan() {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/ocr-albaran", { method: "POST", body: fd })
      const data = await res.json() as { result: OCRResult; mock: boolean }
      setResult(data.result)
      setIsMock(data.mock)
      if (data.mock) {
        toast.info("Resultado de demostración (configura MISTRAL_API_KEY para OCR real)")
      } else {
        toast.success("Albarán escaneado correctamente")
      }
    } catch {
      toast.error("Error al procesar el albarán")
    } finally {
      setLoading(false)
    }
  }

  function handleApply() {
    if (result) {
      onApply?.(result)
      toast.success("Datos aplicados al pedido")
      onClose()
    }
  }

  function handleClose() {
    setFile(null)
    setPreview(null)
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            OCR Albarán
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              {preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  width={960}
                  height={480}
                  unoptimized
                  className="max-h-48 mx-auto rounded-md object-contain"
                />
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Arrastra el albarán aquí</p>
                  <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar — JPG, PNG, PDF</p>
                </>
              )}
              {file && !preview && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{file.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Scan button */}
          {file && !result && (
            <Button onClick={handleScan} disabled={loading} className="w-full">
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analizando con IA...</>
              ) : (
                <><Camera className="h-4 w-4 mr-2" />Escanear albarán</>
              )}
            </Button>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3">
              {isMock && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Resultado de demostración. Configura <code className="font-mono">MISTRAL_API_KEY</code> para OCR real.
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-[var(--alert-ok)]" />
                  <span className="font-medium text-sm">Albarán detectado</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  {result.supplier_name && (
                    <div><span className="text-muted-foreground">Proveedor:</span> <span className="font-medium">{result.supplier_name}</span></div>
                  )}
                  {result.invoice_number && (
                    <div><span className="text-muted-foreground">Nº albarán:</span> <span className="font-medium font-mono">{result.invoice_number}</span></div>
                  )}
                  {result.delivery_date && (
                    <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{result.delivery_date}</span></div>
                  )}
                  {result.total_amount && (
                    <div><span className="text-muted-foreground">Total:</span> <span className="font-medium text-[var(--alert-ok)]">€{result.total_amount.toFixed(2)}</span></div>
                  )}
                </div>

                {result.items.length > 0 && (
                  <div className="rounded-md overflow-hidden border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left px-3 py-2">Producto</th>
                          <th className="text-right px-3 py-2">Cantidad</th>
                          <th className="text-right px-3 py-2">Precio</th>
                          <th className="text-right px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-right font-mono">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-2 text-right font-mono">€{item.unit_price.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono font-medium">€{item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {result.notes && (
                  <p className="text-xs text-muted-foreground italic">{result.notes}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleApply} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aplicar al pedido
                </Button>
                <Button variant="outline" onClick={() => { setResult(null); setFile(null); setPreview(null) }}>
                  Nuevo escaneo
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
