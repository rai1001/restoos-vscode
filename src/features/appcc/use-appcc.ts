"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useActiveHotel } from "@/lib/auth/hooks"
import { appccService } from "./services/appcc.service"
import type {
  CreateCheckRecordInput,
  CreateTemplateInput,
  CreateIncidentInput,
} from "./types"

// ─── Query Keys ──────────────────────────────────────────────

const keys = {
  templates: (hotelId: string) => ["appcc", "templates", hotelId] as const,
  records: (hotelId: string, date: string) => ["appcc", "records", hotelId, date] as const,
  closure: (hotelId: string, date: string) => ["appcc", "closure", hotelId, date] as const,
  summaries: (hotelId: string, days: number) => ["appcc", "summaries", hotelId, days] as const,
  incidents: (hotelId: string) => ["appcc", "incidents", hotelId] as const,
}

// ─── Templates ───────────────────────────────────────────────

export function useAppccTemplates() {
  const { hotelId } = useActiveHotel()

  const { data, isLoading } = useQuery({
    queryKey: keys.templates(hotelId ?? ""),
    queryFn: () => appccService.listTemplates(hotelId!),
    enabled: !!hotelId,
  })

  return { templates: data ?? [], isLoading }
}

export function useCreateTemplate() {
  const { hotelId } = useActiveHotel()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateTemplateInput) =>
      appccService.createTemplate(hotelId!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.templates(hotelId!) })
    },
  })
}

export function useUpdateTemplate() {
  const { hotelId } = useActiveHotel()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ templateId, updates }: {
      templateId: string
      updates: Partial<CreateTemplateInput & { is_active: boolean }>
    }) => appccService.updateTemplate(hotelId!, templateId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.templates(hotelId!) })
    },
  })
}

// ─── Records ─────────────────────────────────────────────────

export function useAppccRecords(date: string) {
  const { hotelId } = useActiveHotel()

  const { data, isLoading } = useQuery({
    queryKey: keys.records(hotelId ?? "", date),
    queryFn: () => appccService.listRecords(hotelId!, date),
    enabled: !!hotelId && !!date,
  })

  return { records: data ?? [], isLoading }
}

export function useCreateRecord() {
  const { hotelId } = useActiveHotel()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateCheckRecordInput) =>
      appccService.createRecord(hotelId!, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.records(hotelId!, variables.check_date) })
      qc.invalidateQueries({ queryKey: keys.closure(hotelId!, variables.check_date) })
      qc.invalidateQueries({ queryKey: ["appcc", "summaries"] })
      qc.invalidateQueries({ queryKey: keys.incidents(hotelId!) })
    },
  })
}

// ─── Daily Closure ───────────────────────────────────────────

export function useAppccDailyClosure(date: string) {
  const { hotelId } = useActiveHotel()

  const { data, isLoading } = useQuery({
    queryKey: keys.closure(hotelId ?? "", date),
    queryFn: () => appccService.getDailyClosure(hotelId!, date),
    enabled: !!hotelId && !!date,
  })

  return { closure: data, isLoading }
}

export function useValidateDayClosure() {
  const { hotelId } = useActiveHotel()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ date, notes }: { date: string; notes?: string }) =>
      appccService.validateDayClosure(hotelId!, date, notes),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.closure(hotelId!, variables.date) })
      qc.invalidateQueries({ queryKey: ["appcc", "summaries"] })
    },
  })
}

// ─── Daily Summaries (Historical) ────────────────────────────

export function useAppccDailySummary(daysBack = 7) {
  const { hotelId } = useActiveHotel()

  const { data, isLoading } = useQuery({
    queryKey: keys.summaries(hotelId ?? "", daysBack),
    queryFn: () => appccService.getDailySummaries(hotelId!, daysBack),
    enabled: !!hotelId,
  })

  return { summaries: data ?? [], isLoading }
}

// ─── Incidents ───────────────────────────────────────────────

export function useAppccIncidents(filters?: { status?: string; date?: string }) {
  const { hotelId } = useActiveHotel()

  const { data, isLoading } = useQuery({
    queryKey: [...keys.incidents(hotelId ?? ""), filters],
    queryFn: () => appccService.listIncidents(hotelId!, filters),
    enabled: !!hotelId,
  })

  return { incidents: data ?? [], isLoading }
}

export function useCreateIncident() {
  const { hotelId } = useActiveHotel()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateIncidentInput) =>
      appccService.createIncident(hotelId!, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.incidents(hotelId!) })
      qc.invalidateQueries({ queryKey: ["appcc", "summaries"] })
    },
  })
}

export function useResolveIncident() {
  const { hotelId } = useActiveHotel()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ incidentId, action, status }: {
      incidentId: string
      action: string
      status?: "resolved" | "closed"
    }) => appccService.resolveIncident(hotelId!, incidentId, action, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.incidents(hotelId!) })
      qc.invalidateQueries({ queryKey: ["appcc", "summaries"] })
      qc.invalidateQueries({ queryKey: ["appcc", "closure"] })
    },
  })
}
