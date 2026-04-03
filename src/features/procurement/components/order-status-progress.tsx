import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { getVisualStatus, PO_STEPS, PO_VISUAL_CONFIG } from "../po-fsm"

interface OrderStatusProgressProps {
  status: string
  compact?: boolean
}

export function OrderStatusProgress({ status, compact = false }: OrderStatusProgressProps) {
  const visual = getVisualStatus(status)
  const config = PO_VISUAL_CONFIG[visual]

  // Cancelled is a special case — show inline badge instead of stepper
  if (visual === "cancelado") {
    return (
      <div className={cn("flex items-center gap-2", compact && "scale-90 origin-left")}>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", config.badge)}>
          {config.label}
        </span>
      </div>
    )
  }

  const currentStep = config.step

  return (
    <div className={cn("flex items-center gap-0", compact ? "gap-0" : "gap-0")}>
      {PO_STEPS.map((step, i) => {
        const stepConfig = PO_VISUAL_CONFIG[step.key]
        const isComplete = i < currentStep
        const isCurrent = i === currentStep
        const isFuture = i > currentStep

        return (
          <div key={step.key} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-colors",
                  compact ? "h-5 w-5" : "h-7 w-7",
                  isComplete && "bg-primary/20",
                  isCurrent && "bg-primary ring-2 ring-primary/30",
                  isFuture && "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]"
                )}
              >
                {isComplete ? (
                  <Check className={cn("text-primary", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
                ) : isCurrent ? (
                  <div className={cn("rounded-full bg-white", compact ? "h-1.5 w-1.5" : "h-2 w-2")} />
                ) : null}
              </div>
              {!compact && (
                <span
                  className={cn(
                    "mt-1.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap",
                    isComplete && "text-primary",
                    isCurrent && "text-primary",
                    isFuture && "text-muted-foreground/50"
                  )}
                >
                  {stepConfig.label}
                </span>
              )}
            </div>

            {/* Connector line */}
            {i < PO_STEPS.length - 1 && (
              <div
                className={cn(
                  "transition-colors",
                  compact ? "w-6 h-px mx-1" : "w-10 h-px mx-2",
                  i < currentStep ? "bg-primary/40" : "bg-[rgba(255,255,255,0.06)]"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
