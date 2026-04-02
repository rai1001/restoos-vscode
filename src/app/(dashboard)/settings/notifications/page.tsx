"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageCircle, Bell, Send, Eye, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Channel = "email" | "whatsapp" | "none"

export default function NotificationsSettingsPage() {
  const [channel, setChannel] = useState<Channel>("email")
  const [email, setEmail] = useState("chisco@culuca.com")
  const [phone, setPhone] = useState("+34 600 123 456")
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily")
  const [time, setTime] = useState("07:00")
  const [sending, setSending] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  async function sendTestDigest() {
    setSending(true)
    try {
      const res = await fetch("/api/digest", { method: "POST" })
      const data = await res.json()
      if (data.sent) {
        toast.success(`Digest enviado a ${email}`)
      } else {
        toast.success(`Digest generado (modo demo) — ${data.digest.itemCount} alertas, ${data.digest.critical} críticas`)
      }
    } catch {
      toast.error("Error al enviar digest")
    } finally {
      setSending(false)
    }
  }

  async function previewDigest() {
    try {
      const res = await fetch("/api/digest")
      const html = await res.text()
      setPreviewHtml(html)
    } catch {
      toast.error("Error al generar preview")
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          CONFIGURACIÓN
        </p>
        <h1 className="text-3xl font-bold text-foreground">Notificaciones</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen diario con alertas de precio, caducidades, stock bajo, APPCC pendiente y pedido sugerido
        </p>
      </div>

      {/* Channel selector */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Canal de envío</Label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: "email" as Channel, icon: Mail, label: "Email", desc: "Resumen HTML completo" },
            { value: "whatsapp" as Channel, icon: MessageCircle, label: "WhatsApp", desc: "Texto resumido" },
            { value: "none" as Channel, icon: Bell, label: "Solo app", desc: "Sin notificación externa" },
          ]).map(opt => (
            <button
              key={opt.value}
              onClick={() => setChannel(opt.value)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                channel === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border-subtle bg-card hover:border-border-hover"
              )}
            >
              <opt.icon className={cn("h-5 w-5 mb-2", channel === opt.value ? "text-primary" : "text-muted-foreground")} />
              <p className="text-sm font-medium text-foreground">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Channel config */}
      {channel === "email" && (
        <div className="space-y-3 rounded-lg bg-card border border-border-subtle p-4">
          <Label>Email de envío</Label>
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
        </div>
      )}
      {channel === "whatsapp" && (
        <div className="space-y-3 rounded-lg bg-card border border-border-subtle p-4">
          <Label>Número WhatsApp</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600 000 000" />
          <p className="text-xs text-muted-foreground">Requiere UltraMsg o WhatsApp Business API configurado</p>
        </div>
      )}

      {/* Frequency */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Frecuencia</Label>
        <div className="flex gap-3">
          <button
            onClick={() => setFrequency("daily")}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm transition-colors",
              frequency === "daily" ? "border-primary bg-primary/10 text-primary" : "border-border-subtle text-muted-foreground"
            )}
          >
            Diario (7:00)
          </button>
          <button
            onClick={() => setFrequency("weekly")}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm transition-colors",
              frequency === "weekly" ? "border-primary bg-primary/10 text-primary" : "border-border-subtle text-muted-foreground"
            )}
          >
            Semanal (lunes)
          </button>
        </div>
        {frequency === "daily" && (
          <div className="flex items-center gap-2">
            <Label className="text-sm">Hora de envío:</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-28" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={previewDigest} variant="outline" className="border-border-subtle">
          <Eye className="h-4 w-4 mr-1.5" />
          Ver preview
        </Button>
        <Button onClick={sendTestDigest} disabled={sending || channel === "none"} className="bg-primary hover:bg-primary/90 text-white">
          {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
          Enviar digest de prueba
        </Button>
        <Button variant="outline" className="border-border-subtle ml-auto" onClick={() => toast.success("Configuración guardada")}>
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          Guardar
        </Button>
      </div>

      {/* Preview */}
      {previewHtml && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Preview del digest</Label>
            <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)} className="text-xs text-muted-foreground">
              Cerrar
            </Button>
          </div>
          <div
            className="rounded-lg border border-border-subtle overflow-hidden bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

      {/* What's included */}
      <div className="rounded-lg bg-card border border-border-subtle p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Qué incluye el digest</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <Badge className="bg-red-500/15 text-red-400 border-0 text-xs">Precio</Badge>
            Subidas de precio &gt;5%
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Badge className="bg-yellow-500/15 text-yellow-400 border-0 text-xs">Caducidad</Badge>
            Productos próximos a caducar
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Badge className="bg-primary/15 text-[var(--alert-warning)] border-0 text-xs">Stock</Badge>
            Productos bajo mínimo
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Badge className="bg-blue-500/15 text-blue-400 border-0 text-xs">APPCC</Badge>
            Controles pendientes
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Badge className="bg-purple-500/15 text-purple-400 border-0 text-xs">Margen</Badge>
            Plato con peor margen/hora
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-xs">Pedido</Badge>
            Propuesta de pedido automática
          </div>
        </div>
      </div>
    </div>
  )
}
