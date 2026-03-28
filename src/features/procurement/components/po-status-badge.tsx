import { cn } from "@/lib/utils"
import { PO_STATUS_CONFIG, type POStatus } from "../po-fsm"

export function POStatusBadge({ status }: { status: POStatus }) {
  const config = PO_STATUS_CONFIG[status]
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      config?.badge
    )}>
      {config?.label ?? status}
    </span>
  )
}
