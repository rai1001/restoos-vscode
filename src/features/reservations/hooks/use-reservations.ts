"use client";

import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveHotel } from "@/lib/auth/hooks";
import { reservationService } from "../services/reservation.service";
import type { ReservationRow } from "../services/reservation.service";
import { MOCK_RESERVATIONS, MOCK_TABLES, MOCK_TURNS } from "@/lib/resto-mock-data";
import type { Reservation } from "@/features/reservations/schemas/reservation.schema";
import { toast } from "sonner";

const isDev = process.env.NODE_ENV === "development";
const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
const useMock = isDev && skipAuth;

/** Map DB row → UI Reservation shape used by page.tsx */
function rowToReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    hotel_id: row.hotel_id,
    customer_name: row.contact_name,
    customer_phone: row.contact_phone ?? undefined,
    customer_email: row.contact_email ?? undefined,
    date: row.reservation_date,
    time: row.reservation_time,
    duration_min: row.duration_min,
    pax: row.party_size,
    status: row.status as Reservation["status"],
    source: (row.source === "manual" ? "phone" : row.source) as Reservation["source"],
    is_vip: row.is_vip,
    notes: row.notes ?? undefined,
    created_at: row.created_at,
  };
}

export function useReservations(date?: string) {
  const { hotelId } = useActiveHotel();

  const { data, isLoading } = useQuery({
    queryKey: ["reservations", hotelId, date],
    queryFn: async (): Promise<Reservation[]> => {
      if (useMock || (!hotelId && isDev)) {
        if (!date) return MOCK_RESERVATIONS;
        return MOCK_RESERVATIONS.filter((r) => r.date === date);
      }
      const rows = date
        ? await reservationService.listByDateRange(hotelId!, date, date)
        : await reservationService.list(hotelId!);
      return rows.map(rowToReservation);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 2 * 60_000,
  });

  return { reservations: data ?? [], isLoading };
}

export function useReservationsByDateRange(startDate: string, endDate: string) {
  const { hotelId } = useActiveHotel();

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations-range", hotelId, startDate, endDate],
    queryFn: async (): Promise<Reservation[]> => {
      if (useMock || (!hotelId && isDev)) {
        return MOCK_RESERVATIONS.filter(
          (r) => r.date >= startDate && r.date <= endDate
        );
      }
      const rows = await reservationService.listByDateRange(hotelId!, startDate, endDate);
      return rows.map(rowToReservation);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 2 * 60_000,
  });

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const r of reservations) {
      if (!map[r.date]) map[r.date] = [];
      map[r.date]!.push(r);
    }
    return map;
  }, [reservations]);

  return { reservations, reservationsByDate };
}

export function useReservationsCalendar(year: number, month: number) {
  const { hotelId } = useActiveHotel();

  const { data: reservationsInMonth = [] } = useQuery({
    queryKey: ["reservations-calendar", hotelId, year, month],
    queryFn: async (): Promise<Reservation[]> => {
      if (useMock || (!hotelId && isDev)) {
        return MOCK_RESERVATIONS.filter((r) => {
          const [y, m] = r.date.split("-").map(Number);
          return y === year && m === month;
        });
      }
      const rows = await reservationService.listByMonth(hotelId!, year, month);
      return rows.map(rowToReservation);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 2 * 60_000,
  });

  const reservationsByDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const r of reservationsInMonth) {
      if (!map[r.date]) map[r.date] = [];
      map[r.date]!.push(r);
    }
    return map;
  }, [reservationsInMonth]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: Array<{
      date: string | null;
      dayNum: number | null;
      isCurrentMonth: boolean;
    }> = [];
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month - 1, -startOffset + i + 1);
      days.push({
        date: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: dateStr, dayNum: d, isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }
    return days;
  }, [year, month]);

  return { reservationsInMonth, reservationsByDate, calendarDays };
}

export function useReservationsWeek(startDate: string) {
  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  }, [startDate]);

  const { reservations: weekReservations, reservationsByDate } =
    useReservationsByDateRange(startDate, endDate);

  return { weekReservations, reservationsByDate };
}

export function useTables() {
  return { tables: MOCK_TABLES, isLoading: false };
}

export function useTurns() {
  return { turns: MOCK_TURNS, isLoading: false };
}

export function useCreateReservation() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (
      data: Omit<Reservation, "id" | "created_at" | "hotel_id">
    ) => {
      if (useMock || (!hotelId && isDev)) {
        return {
          ...data,
          id: `res-${Date.now()}`,
          created_at: new Date().toISOString(),
          hotel_id: "r1",
        } as Reservation;
      }
      const row = await reservationService.create(hotelId!, {
        contact_name: data.customer_name,
        contact_phone: data.customer_phone,
        contact_email: data.customer_email,
        party_size: data.pax,
        reservation_date: data.date,
        reservation_time: data.time,
        duration_min: data.duration_min,
        status: data.status,
        source: data.source === "phone" ? "manual" : data.source,
        is_vip: data.is_vip,
        notes: data.notes,
      });
      return rowToReservation(row);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["reservations-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["reservations-range"] });
      toast.success("Reserva creada");
    },
    onError: (error) => {
      toast.error(`Error al crear reserva: ${error.message}`);
    },
  });

  return { mutate: mutation.mutate, isPending: mutation.isPending };
}
