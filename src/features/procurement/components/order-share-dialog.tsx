"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MessageCircle, Mail, FileText, Share2 } from "lucide-react"
import { generateOrderPDF, generateOrderText } from "@/lib/utils/generate-order-pdf"
import { toast } from "sonner"

interface OrderShareDialogProps {
  open: boolean
  onClose: () => void
  order: {
    orderNumber: string
    date: string
    expectedDelivery?: string
    notes?: string
  }
  supplier: {
    name: string
    contactName?: string
    email?: string
    phone?: string
    address?: string
  }
  restaurant: {
    name: string
    address?: string
    phone?: string
  }
  lines: Array<{
    productName: string
    quantity: number
    unit: string
    unitPrice: number
  }>
  onShared?: () => void
}

export function OrderShareDialog({
  open,
  onClose,
  order,
  supplier,
  restaurant,
  lines,
  onShared,
}: OrderShareDialogProps) {
  const pdfData = {
    orderNumber: order.orderNumber,
    date: order.date,
    expectedDelivery: order.expectedDelivery,
    notes: order.notes,
    restaurant,
    supplier,
    lines,
  }

  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const total = subtotal * 1.21

  function handleWhatsApp() {
    const text = generateOrderText(pdfData)
    const phone = supplier.phone?.replace(/[^0-9+]/g, "") ?? ""
    const url = phone
      ? `https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
    onShared?.()
    onClose()
    toast.success("Pedido compartido por WhatsApp")
  }

  function handleEmail() {
    const text = generateOrderText(pdfData)
    const subject = `Pedido ${order.orderNumber} — ${restaurant.name}`
    const mailto = supplier.email
      ? `mailto:${supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
      : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
    window.open(mailto, "_blank")
    onShared?.()
    onClose()
    toast.success("Pedido compartido por email")
  }

  function handlePDF() {
    generateOrderPDF(pdfData)
    onShared?.()
    toast.success("PDF generado")
  }

  async function handleWebShare() {
    if (!navigator.share) {
      toast.error("Compartir no disponible en este navegador")
      return
    }
    const text = generateOrderText(pdfData)
    try {
      await navigator.share({
        title: `Pedido ${order.orderNumber}`,
        text,
      })
      onShared?.()
      onClose()
      toast.success("Pedido compartido")
    } catch {
      // User cancelled — no action needed
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {/* Summary */}
          <div className="rounded-lg bg-card p-4 mb-4">
            <p className="text-sm font-semibold text-foreground">{order.orderNumber}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {supplier.name} · {lines.length} productos · {total.toFixed(2)} €
            </p>
          </div>

          {/* Share options */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            <div className="text-left">
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                {supplier.phone ? `Enviar a ${supplier.phone}` : "Abrir WhatsApp"}
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleEmail}
          >
            <Mail className="h-5 w-5 text-blue-400" />
            <div className="text-left">
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">
                {supplier.email ?? "Abrir cliente de email"}
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handlePDF}
          >
            <FileText className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="text-sm font-medium">Descargar PDF</p>
              <p className="text-xs text-muted-foreground">Hoja de pedido imprimible</p>
            </div>
          </Button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={handleWebShare}
            >
              <Share2 className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">Mas opciones</p>
                <p className="text-xs text-muted-foreground">AirDrop, mensaje, etc.</p>
              </div>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
