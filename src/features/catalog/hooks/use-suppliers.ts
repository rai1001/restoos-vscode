"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveHotel } from "@/lib/auth/hooks";
import { catalogService } from "../services/catalog.service";
import type { CreateSupplierInput, SupplierOffer } from "../schemas/catalog.schema";
import { toast } from "sonner";
import { MOCK_SUPPLIERS, MOCK_SUPPLIER_OFFERS } from "@/lib/mock-data";

export function useSuppliers() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  return useQuery({
    queryKey: ["suppliers", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(MOCK_SUPPLIERS);
      return catalogService.listSuppliers(hotelId!);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });
}

export type SupplierOfferWithProduct = SupplierOffer & {
  product_name: string;
  unit_abbreviation: string;
};

export function useSupplierOffers(supplierId: string | undefined) {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  return useQuery({
    queryKey: ["supplier-offers", hotelId, supplierId],
    queryFn: (): Promise<SupplierOfferWithProduct[]> => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        const filtered = MOCK_SUPPLIER_OFFERS.filter(
          (o) => o.supplier_id === supplierId
        ).map((o) => ({
          id: o.id,
          hotel_id: "",
          supplier_id: o.supplier_id,
          product_id: o.product_id,
          unit_id: "",
          price: o.price,
          min_order_qty: null,
          lead_time_days: null,
          is_preferred: o.is_preferred,
          valid_from: null,
          valid_until: null,
          product_name: o.product_name,
          unit_abbreviation: o.unit ?? "ud",
        }));
        return Promise.resolve(filtered);
      }
      return catalogService.listOffersBySupplier(hotelId!, supplierId!);
    },
    enabled: !!supplierId && (isDev ? true : !!hotelId),
    staleTime: 5 * 60_000,
  });
}

export function useAllOffers() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  return useQuery({
    queryKey: ["all-offers", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(MOCK_SUPPLIER_OFFERS.map((o) => ({
        id: o.id,
        hotel_id: "",
        supplier_id: o.supplier_id,
        product_id: o.product_id,
        unit_id: "",
        price: o.price,
        min_order_qty: null,
        lead_time_days: null,
        is_preferred: o.is_preferred,
        valid_from: null,
        valid_until: null,
      })));
      return catalogService.listOffers(hotelId!);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });
}

export function useCreateSupplier() {
  const { hotelId } = useActiveHotel();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSupplierInput) =>
      catalogService.createSupplier(hotelId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", hotelId] });
      toast.success("Proveedor creado");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
