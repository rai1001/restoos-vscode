"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveRestaurant } from "@/lib/auth/hooks";
import { clientService } from "../services/client.service";
import type { CreateClientInput, Client } from "../schemas/client.schema";
import { toast } from "sonner";
import { MOCK_CLIENTS } from "@/lib/mock-data";

export function useClients() {
  const { hotelId } = useActiveRestaurant();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  return useQuery({
    queryKey: ["clients", hotelId],
    queryFn: () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) return Promise.resolve(MOCK_CLIENTS as unknown as Client[]);
      return clientService.listClients(hotelId!);
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 30 * 60_000,
  });
}

export function useCreateClient() {
  const { hotelId } = useActiveRestaurant();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => clientService.createClient(hotelId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients", hotelId] });
      toast.success("Cliente creado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
