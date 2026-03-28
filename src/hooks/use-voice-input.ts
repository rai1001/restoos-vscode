"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type VoiceStatus = "idle" | "listening" | "processing" | "error"

interface UseVoiceInputOptions {
  lang?: string
  continuous?: boolean
  onResult?: (transcript: string) => void
  onError?: (error: string) => void
}

interface UseVoiceInputReturn {
  status: VoiceStatus
  transcript: string
  isSupported: boolean
  start: () => void
  stop: () => void
  reset: () => void
}

// ── Web Speech API type declarations ──────────────────────────────────────────
interface SpeechRecognitionResultItem {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionResultItem
  [index: number]: SpeechRecognitionResultItem
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export function useVoiceInput({
  lang = "es-ES",
  continuous = false,
  onResult,
  onError,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [transcript, setTranscript] = useState("")
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setStatus("idle")
  }, [])

  const start = useCallback(() => {
    if (!isSupported) {
      onError?.("Tu navegador no soporta reconocimiento de voz")
      return
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => setStatus("listening")

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ""
      let interimTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result && result.isFinal) {
          finalTranscript += result[0]?.transcript ?? ""
        } else if (result) {
          interimTranscript += result[0]?.transcript ?? ""
        }
      }

      const current = finalTranscript || interimTranscript
      setTranscript(current)

      if (finalTranscript) {
        setStatus("processing")
        onResult?.(finalTranscript.trim())
        if (!continuous) {
          recognition.stop()
          setStatus("idle")
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const messages: Record<string, string> = {
        "no-speech": "No se detectó voz. Habla más cerca del micrófono.",
        "audio-capture": "No se detectó micrófono.",
        "not-allowed": "Permiso de micrófono denegado.",
        "network": "Error de red.",
      }
      const msg = messages[event.error] ?? `Error: ${event.error}`
      onError?.(msg)
      setStatus("error")
    }

    recognition.onend = () => {
      if (status === "listening") setStatus("idle")
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, lang, continuous, onResult, onError, status])

  const reset = useCallback(() => {
    setTranscript("")
    setStatus("idle")
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  return { status, transcript, isSupported, start, stop, reset }
}
