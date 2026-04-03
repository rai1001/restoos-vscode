import { cn } from "@/lib/utils"
import { getVisualStatus, PO_VISUAL_CONFIG } from "../po-fsm"

export function POStatusBadge({ status }: { status: string }) {
  const visual = getVisualStatus(status)
  const config = PO_VISUAL_CONFIG[visual]
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
      config.badge
    )}>
      {config.label}
    </span>
  )
}
