"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

export function PWARegister() {
  const [, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        setRegistration(reg)

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              toast.info("Nueva versión disponible", {
                description: "Recarga la página para actualizar RestoOS",
                action: {
                  label: "Actualizar",
                  onClick: () => window.location.reload(),
                },
                duration: 10000,
              })
            }
          })
        })
      })
      .catch(() => {
        // SW registration failed — app still works normally
      })
  }, [])

  return null
}
