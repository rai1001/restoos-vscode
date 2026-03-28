"use client"
import { useMemo, useState, useCallback } from "react"
import { MOCK_RESERVATIONS, MOCK_TABLES, MOCK_TURNS } from "@/lib/resto-mock-data"
import type { Reservation, Table, Turn } from "@/features/reservations/schemas/reservation.schema"

export function useReservations(date?: string) {
  const reservations = useMemo(() => {
    if (!date) return MOCK_RESERVATIONS
    return MOCK_RESERVATIONS.filter((r) => r.date === date)
  }, [date])

  return { reservations, isLoading: false }
}

export function useReservationsByDateRange(startDate: string, endDate: string) {
  const reservations = useMemo(() => {
    return MOCK_RESERVATIONS.filter((r) => r.date >= startDate && r.date <= endDate)
  }, [startDate, endDate])

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of reservations) {
      if (!map[r.date]) map[r.date] = []
      map[r.date]!.push(r)
    }
    return map
  }, [reservations])

  return { reservations, reservationsByDate }
}

export function useReservationsCalendar(year: number, month: number) {
  // month is 1-based
  const reservationsInMonth = useMemo(() => {
    return MOCK_RESERVATIONS.filter((r) => {
      const [y, m] = r.date.split("-").map(Number)
      return y === year && m === month
    })
  }, [year, month])

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of reservationsInMonth) {
      if (!map[r.date]) map[r.date] = []
      map[r.date]!.push(r)
    }
    return map
  }, [reservationsInMonth])

  // Calendar grid: 6 weeks x 7 days, starting Monday
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    // Monday = 0 offset
    const startOffset = (firstDay.getDay() + 6) % 7 // Mon-based
    const daysInMonth = new Date(year, month, 0).getDate()
    const days: Array<{
      date: string | null
      dayNum: number | null
      isCurrentMonth: boolean
    }> = []

    // padding before
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month - 1, -startOffset + i + 1)
      days.push({
        date: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      })
    }
    // current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      days.push({ date: dateStr, dayNum: d, isCurrentMonth: true })
    }
    // padding after (fill to 42)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month, i)
      days.push({
        date: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      })
    }
    return days
  }, [year, month])

  return { reservationsInMonth, reservationsByDate, calendarDays }
}

export function useReservationsWeek(startDate: string) {
  const weekReservations = useMemo(() => {
    const start = new Date(startDate)
    const end = new Date(startDate)
    end.setDate(end.getDate() + 6)
    return MOCK_RESERVATIONS.filter((r) => {
      const d = new Date(r.date)
      return d >= start && d <= end
    })
  }, [startDate])

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of weekReservations) {
      if (!map[r.date]) map[r.date] = []
      map[r.date]!.push(r)
    }
    return map
  }, [weekReservations])

  return { weekReservations, reservationsByDate }
}

export function useTables() {
  return { tables: MOCK_TABLES, isLoading: false }
}

export function useTurns() {
  return { turns: MOCK_TURNS, isLoading: false }
}

export function useCreateReservation() {
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS)

  const mutate = useCallback(
    (
      data: Omit<Reservation, "id" | "created_at" | "hotel_id">,
      options?: { onSuccess?: () => void },
    ) => {
      const newReservation: Reservation = {
        ...data,
        id: `res-${Date.now()}`,
        created_at: new Date().toISOString(),
        hotel_id: "r1",
      }
      setReservations((prev) => [...prev, newReservation])
      options?.onSuccess?.()
      return newReservation
    },
    [],
  )

  return { mutate, isPending: false }
}
