"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { CommandPalette } from "./command-palette"

interface CommandPaletteContextValue {
  open: () => void
  close: () => void
  toggle: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: () => {},
  close: () => {},
  toggle: () => {},
})

export function useCommandPalette() {
  return useContext(CommandPaletteContext)
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(v => !v), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [toggle])

  return (
    <CommandPaletteContext.Provider value={{ open, close, toggle }}>
      {children}
      <CommandPalette open={isOpen} onClose={close} />
    </CommandPaletteContext.Provider>
  )
}
