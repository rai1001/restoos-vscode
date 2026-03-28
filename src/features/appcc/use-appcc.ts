"use client"

// TODO: Replace with Supabase queries once APPCC tables are migrated

import { useMemo } from "react"
import { MOCK_TEMPLATES, generateMockRecordsForDate } from "./appcc-mock-data"
import type { CheckTemplate } from "./types"

export function useAppccTemplates() {
  return { templates: MOCK_TEMPLATES, isLoading: false }
}

export function useAppccRecords(date: string) {
  const records = useMemo(() => generateMockRecordsForDate(date), [date])
  return { records, isLoading: false }
}

export function useAppccDailySummary(daysBack = 7) {
  const summaries = useMemo(() => {
    const result = []
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const records = generateMockRecordsForDate(dateStr)
      const ok = records.filter((r) => r.status === "ok").length
      const alerts = records.filter((r) => r.status === "alerta").length
      const critical = records.filter((r) => r.status === "critico").length
      result.push({
        date: dateStr,
        total: records.length,
        ok,
        alerts,
        critical,
        completion_pct: 100,
        pending_templates: [] as CheckTemplate[],
      })
    }
    return result
  }, [daysBack])
  return { summaries, isLoading: false }
}
