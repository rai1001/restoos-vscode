"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveHotel } from "@/lib/auth/hooks";
import { procurementService } from "../services/procurement.service";
import type { CreateOrderLineInput } from "../schemas/procurement.schema";
import { toast } from "sonner";
import { MOCK_PURCHASE_ORDERS } from "@/lib/mock-data";

// --- Purchase Requests ---
export function usePurchaseRequests() {
  const { hotelId } = useActiveHotel();
  return useQuery({
    queryKey: ["purchase-requests", hotelId],
    queryFn: () => procurementService.listRequests(hotelId!),
    enabled: !!hotelId,
    staleTime: 10 * 60_000,
  });
}

export function useCreatePurchaseRequest() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ notes }: { notes?: string } = {}) =>
      procurementService.createRequest(hotelId!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests", hotelId] });
      toast.success("Solicitud creada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useApprovePurchaseRequest() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => procurementService.approveRequest(hotelId!, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests", hotelId] });
      toast.success("Solicitud aprobada");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// --- Purchase Orders ---
export function usePurchaseOrders() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  return useQuery({
    queryKey: ["purchase-orders", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(MOCK_PURCHASE_ORDERS);
      return procurementService.listOrders(hotelId!);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 10 * 60_000,
  });
}

export function usePurchaseOrder(orderId: string) {
  return useQuery({
    queryKey: ["purchase-order", orderId],
    queryFn: () => procurementService.getOrder(orderId),
    enabled: !!orderId,
    staleTime: 10 * 60_000,
  });
}

export function useCreatePurchaseOrder() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, expectedDelivery, notes }: {
      supplierId: string;
      expectedDelivery?: string;
      notes?: string;
    }) => procurementService.createOrder(hotelId!, supplierId, expectedDelivery, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", hotelId] });
      toast.success("Pedido creado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSendPurchaseOrder() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => procurementService.sendOrder(hotelId!, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Pedido enviado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useOrderLines(orderId: string) {
  return useQuery({
    queryKey: ["order-lines", orderId],
    queryFn: () => procurementService.getOrderLines(orderId),
    enabled: !!orderId,
    staleTime: 10 * 60_000,
  });
}

export function useAddOrderLine(orderId: string) {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderLineInput) =>
      procurementService.addOrderLine(hotelId!, orderId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-lines", orderId] });
      toast.success("Línea añadida");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useReceiveGoods() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, lines, notes }: {
      orderId: string;
      lines: Array<{
        order_line_id: string;
        quantity_received: number;
        unit_cost: number;
        lot_number?: string;
        expiry_date?: string;
        incident_type?: string;
        incident_notes?: string;
      }>;
      notes?: string;
    }) => procurementService.receiveGoods(hotelId!, orderId, lines, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order"] });
      queryClient.invalidateQueries({ queryKey: ["order-lines"] });
      queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      toast.success("Mercancia recibida");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateOrderWithLines() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplierId,
      expectedDelivery,
      notes,
      lines,
    }: {
      supplierId: string;
      expectedDelivery?: string;
      notes?: string;
      lines: Array<{ product_id: string; unit_id?: string; quantity_ordered: number; unit_price: number }>;
    }) => {
      const result = await procurementService.createOrder(hotelId!, supplierId, expectedDelivery, notes);
      const orderId = result?.order_id;
      if (!orderId) throw new Error("No se pudo crear el pedido");
      for (const line of lines) {
        await procurementService.addOrderLine(hotelId!, orderId, line);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders", hotelId] });
      toast.success("Pedido creado con todas las líneas");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useGoodsReceipts(orderId?: string) {
  const { hotelId } = useActiveHotel();
  return useQuery({
    queryKey: ["goods-receipts", hotelId, orderId],
    queryFn: () => procurementService.listReceipts(hotelId!, orderId),
    enabled: !!hotelId,
    staleTime: 10 * 60_000,
  });
}
