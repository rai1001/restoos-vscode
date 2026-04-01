"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Send, PackageCheck, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getPOValidTransitions, type POStatus } from "../po-fsm"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  enviada: Send,
  recibida: PackageCheck,
  cancelada: XCircle,
}

interface POStatusActionsProps {
  poId: string
  currentStatus: POStatus
  onStatusChange?: (newStatus: POStatus) => void
}

export function POStatusActions({ currentStatus, onStatusChange }: POStatusActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const transitions = getPOValidTransitions(currentStatus)
  if (transitions.length === 0) return null

  async function handleTransition(newStatus: POStatus, label: string) {
    setLoading(newStatus)
    setConfirmOpen(false)
    try {
      // TODO: Replace with Supabase RPC when cloud connected
      await new Promise<void>((r) => setTimeout(r, 600))
      toast.success(label + " completado")
      onStatusChange?.(newStatus)
    } catch {
      toast.error("Error al cambiar estado")
    } finally {
      setLoading(null)
    }
  }

  const cancelTransition = transitions.find(([s]) => s === "cancelada")

  return (
    <>
      <div className="flex items-center gap-1.5">
        {transitions.map(([newStatus, transition]) => {
          const Icon = ICONS[newStatus] ?? Send
          const isDestructive = newStatus === "cancelada"

          if (isDestructive) {
            return (
              <Button
                key={newStatus}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                onClick={() => setConfirmOpen(true)}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                {transition.label}
              </Button>
            )
          }

          return (
            <Button
              key={newStatus}
              variant={transition.variant}
              size="sm"
              disabled={!!loading}
              onClick={() => handleTransition(newStatus, transition.label)}
            >
              {loading === newStatus
                ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                : <Icon className="h-3.5 w-3.5 mr-1" />
              }
              {transition.label}
            </Button>
          )
        })}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Cancelar la orden?</DialogTitle>
            <DialogDescription>
              {cancelTransition?.[1].description ?? "La orden se cancelará definitivamente."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Volver
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={!!loading}
              onClick={() => {
                if (cancelTransition) {
                  handleTransition("cancelada", cancelTransition[1].label)
                }
              }}
            >
              Confirmar cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
