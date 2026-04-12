"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"
import { getPlanLabel } from "@/lib/billing/feature-gate"

interface UpgradeWallProps {
  currentPlan: string
  requiredPlan: string
  feature: string
}

export function UpgradeWall({ currentPlan, requiredPlan, feature }: UpgradeWallProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-[rgba(184,144,111,0.1)] flex items-center justify-center">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        {feature} no está disponible en tu plan
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Tu plan actual es <span className="text-foreground font-medium">{getPlanLabel(currentPlan)}</span>.
        Esta funcionalidad requiere el plan <span className="text-primary font-medium">{getPlanLabel(requiredPlan)}</span> o superior.
      </p>
      <Button
        onClick={() => router.push("/settings/billing")}
        className="bg-primary hover:bg-primary/90 text-white mt-2"
      >
        Ver planes y upgrade
      </Button>
    </div>
  )
}
