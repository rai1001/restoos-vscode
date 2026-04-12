"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useActiveRestaurant } from "@/lib/auth/hooks"
import { transferService, type CreateTransferLineInput } from "../services/transfer.service"

export function useTransfers() {
  const { tenantId } = useActiveRestaurant()

  return useQuery({
    queryKey: ["transfers", tenantId],
    queryFn: () => transferService.listTransfers(tenantId!),
    enabled: !!tenantId,
    staleTime: 2 * 60_000,
  })
}

export function useTransferLines(transferId: string) {
  return useQuery({
    queryKey: ["transfer-lines", transferId],
    queryFn: () => transferService.getTransferLines(transferId),
    enabled: !!transferId,
  })
}

export function useCreateTransfer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ originHotelId, destinationHotelId, lines, notes }: {
      originHotelId: string
      destinationHotelId: string
      lines: CreateTransferLineInput[]
      notes?: string
    }) => transferService.createTransfer(originHotelId, destinationHotelId, lines, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] })
    },
  })
}

export function useConfirmTransfer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (transferId: string) => transferService.confirmTransfer(transferId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] })
      qc.invalidateQueries({ queryKey: ["stock-levels"] })
      qc.invalidateQueries({ queryKey: ["stock-lots"] })
    },
  })
}

export function useReceiveTransfer() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ transferId, lines }: {
      transferId: string
      lines?: Array<{ line_id: string; quantity_received: number; dest_product_id?: string }>
    }) => transferService.receiveTransfer(transferId, lines),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transfers"] })
      qc.invalidateQueries({ queryKey: ["stock-levels"] })
      qc.invalidateQueries({ queryKey: ["stock-lots"] })
      qc.invalidateQueries({ queryKey: ["tenant-overview"] })
    },
  })
}
