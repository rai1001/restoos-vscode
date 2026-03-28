"use client"

import { Mic, MicOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { VoiceStatus } from "@/hooks/use-voice-input"

interface VoiceMicButtonProps {
  status: VoiceStatus
  isSupported: boolean
  onStart: () => void
  onStop: () => void
  size?: "sm" | "default"
  className?: string
  label?: string
}

export function VoiceMicButton({
  status,
  isSupported,
  onStart,
  onStop,
  size = "default",
  className,
  label,
}: VoiceMicButtonProps) {
  if (!isSupported) return null

  const isListening = status === "listening"
  const isProcessing = status === "processing"

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "outline"}
      size={size === "sm" ? "sm" : "default"}
      onClick={isListening ? onStop : onStart}
      disabled={isProcessing}
      className={cn(
        "gap-1.5 transition-all",
        isListening && "animate-pulse ring-2 ring-red-500 ring-offset-1",
        className
      )}
      title={isListening ? "Detener grabación" : "Dictado por voz (español)"}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      {label && (
        <span className="hidden sm:inline">
          {isListening ? "Detener" : isProcessing ? "Procesando..." : label}
        </span>
      )}
    </Button>
  )
}
