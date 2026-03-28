"use client"
import { useMemo } from "react"
import {
  MOCK_STAFF,
  MOCK_EVENTS_FOR_STAFFING,
  getShiftsForEvent,
  getEventSummaries,
} from "./staffing-mock-data"

export function useStaffMembers() {
  return { staff: MOCK_STAFF, isLoading: false }
}

export function useEventShifts(eventId: string) {
  const shifts = useMemo(() => getShiftsForEvent(eventId), [eventId])
  return { shifts, isLoading: false }
}

export function useStaffingSummaries() {
  const summaries = useMemo(() => getEventSummaries(), [])
  return { summaries, isLoading: false, events: MOCK_EVENTS_FOR_STAFFING }
}
