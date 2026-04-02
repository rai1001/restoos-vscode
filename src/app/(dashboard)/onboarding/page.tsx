"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, ChevronRight, FileText, Truck, Rocket } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ImportMenuStep } from "@/features/onboarding/components/import-menu-step"
import { ImportInvoicesStep } from "@/features/onboarding/components/import-invoices-step"

const STEPS = [
  { id: 1, label: "Tu restaurante", icon: Rocket },
  { id: 2, label: "Carta / Menú", icon: FileText },
  { id: 3, label: "Proveedores", icon: Truck },
  { id: 4, label: "Listo", icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)

  // Step 1 state
  const [restaurantName, setRestaurantName] = useState("")
  const [address, setAddress] = useState("")
  const [cuisineType, setCuisineType] = useState("")
  const [avgCovers, setAvgCovers] = useState("")

  // Step 2 state
  const [menuItems, setMenuItems] = useState<Array<{ name: string; category: string; price: number }>>([])

  // Step 3 state
  const [invoiceItems, setInvoiceItems] = useState<Array<{
    supplier: string; products: Array<{ name: string; quantity: number; unit: string; price: number }>
  }>>([])

  function nextStep() {
    if (step === 1 && !restaurantName.trim()) {
      toast.error("Introduce el nombre de tu restaurante")
      return
    }
    setStep(s => Math.min(s + 1, 4))
  }

  function prevStep() {
    setStep(s => Math.max(s - 1, 1))
  }

  const completionPct = step === 4 ? 100 : Math.round(((step - 1) / 3) * 100 +
    (step === 1 && restaurantName ? 10 : 0) +
    (menuItems.length > 0 ? 15 : 0) +
    (invoiceItems.length > 0 ? 15 : 0))

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
          CONFIGURACIÓN INICIAL
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Configura tu restaurante
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          En 5 minutos tendrás tu restaurante funcionando en RestoOS
        </p>
      </div>

      {/* Progress stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, idx) => {
          const Icon = s.icon
          const isActive = s.id === step
          const isCompleted = s.id < step
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full",
                  isActive && "bg-primary/15 text-primary border border-primary/30",
                  isCompleted && "bg-[rgba(255,255,255,0.03)] text-foreground cursor-pointer",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isCompleted && "text-foreground")} />
                <span className="hidden sm:inline truncate">{s.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-card rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
      </div>

      {/* Step content */}
      <div className="rounded-xl bg-card border border-border-subtle p-6">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Datos de tu restaurante</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Información básica para configurar tu espacio
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre del restaurante *</Label>
                <Input
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                  placeholder="Culuca Cociña-Bar"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de cocina</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={cuisineType}
                  onChange={e => setCuisineType(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="gallega">Gallega / Atlántica</option>
                  <option value="mediterranea">Mediterránea</option>
                  <option value="fusion">Fusión</option>
                  <option value="tapas">Tapas / Raciones</option>
                  <option value="internacional">Internacional</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Dirección</Label>
                <Input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Av. Arteixo 10, A Coruña"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comensales/día (media)</Label>
                <Input
                  type="number"
                  value={avgCovers}
                  onChange={e => setAvgCovers(e.target.value)}
                  placeholder="80"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <ImportMenuStep
            items={menuItems}
            onItemsChange={setMenuItems}
          />
        )}

        {step === 3 && (
          <ImportInvoicesStep
            invoices={invoiceItems}
            onInvoicesChange={setInvoiceItems}
          />
        )}

        {step === 4 && (
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {restaurantName || "Tu restaurante"} está listo
            </h2>
            <div className="text-sm text-muted-foreground space-y-1">
              {menuItems.length > 0 && (
                <p>{menuItems.length} platos importados de tu carta</p>
              )}
              {invoiceItems.length > 0 && (
                <p>{invoiceItems.reduce((sum, inv) => sum + inv.products.length, 0)} productos de {invoiceItems.length} albarán(es)</p>
              )}
              {menuItems.length === 0 && invoiceItems.length === 0 && (
                <p>Puedes importar datos en cualquier momento desde Catálogo e Inventario</p>
              )}
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 text-white mt-4"
              onClick={() => {
                toast.success("Onboarding completado")
                window.location.href = "/"
              }}
            >
              Ir al Dashboard
            </Button>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {step < 4 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
            className="border-border-subtle"
          >
            Atrás
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={nextStep}
                className="text-muted-foreground"
              >
                Saltar paso
              </Button>
            )}
            <Button
              onClick={nextStep}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {step === 3 ? "Finalizar" : "Siguiente"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
