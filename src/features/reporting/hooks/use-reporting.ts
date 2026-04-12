"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveRestaurant } from "@/lib/auth/hooks";
import { reportingService } from "../services/reporting.service";
import { toast } from "sonner";

export function useDashboardData() {
  const { hotelId } = useActiveRestaurant();
  return useQuery({
    queryKey: ["dashboard", hotelId],
    queryFn: () => reportingService.getDashboardData(hotelId!),
    enabled: !!hotelId,
    staleTime: 10 * 60_000,
  });
}

export function useGenerateSnapshot() {
  const { hotelId } = useActiveRestaurant();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) => reportingService.generateSnapshot(hotelId!, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", hotelId] });
      toast.success("Snapshot generado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCheckAlerts() {
  const { hotelId } = useActiveRestaurant();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reportingService.checkAlertThresholds(hotelId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", hotelId] });
      queryClient.invalidateQueries({ queryKey: ["alerts", hotelId] });
      toast.success("Alertas verificadas");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDismissAlert() {
  const { hotelId } = useActiveRestaurant();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => reportingService.dismissAlert(hotelId!, alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", hotelId] });
      queryClient.invalidateQueries({ queryKey: ["alerts", hotelId] });
      toast.success("Alerta descartada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAlerts(dismissed?: boolean) {
  const { hotelId } = useActiveRestaurant();
  return useQuery({
    queryKey: ["alerts", hotelId, dismissed],
    queryFn: () => reportingService.listAlerts(hotelId!, dismissed),
    enabled: !!hotelId,
    staleTime: 10 * 60_000,
  });
}
