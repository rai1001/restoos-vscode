"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveHotel, useSession } from "@/lib/auth/hooks";
import { MOCK_FEEDBACK_TICKETS } from "../mock/feedback-mock-data";
import type {
  FeedbackTicket,
  CreateTicketInput,
  UpdateTicketInput,
} from "../schemas/feedback.schema";
import { toast } from "sonner";

// ─── In-memory mock store ────────────────────────────────────
let mockTickets: FeedbackTicket[] = [...MOCK_FEEDBACK_TICKETS];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Queries ─────────────────────────────────────────────────

export function useFeedbackTickets(filters?: {
  status?: string;
  type?: string;
}) {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  return useQuery({
    queryKey: ["feedback-tickets", hotelId, filters],
    queryFn: async () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 200));
        let result = [...mockTickets];
        if (filters?.status) {
          result = result.filter((t) => t.status === filters.status);
        }
        if (filters?.type) {
          result = result.filter((t) => t.type === filters.type);
        }
        return result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      // TODO: real Supabase query
      return [] as FeedbackTicket[];
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });
}

export function useMyTickets() {
  const { hotelId } = useActiveHotel();
  const { user } = useSession();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  return useQuery({
    queryKey: ["my-feedback-tickets", hotelId, user?.id],
    queryFn: async () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 200));
        // In mock mode return tickets from a fixed mock user
        const mockUserId = "00000000-0000-0000-0000-000000000010";
        return mockTickets
          .filter((t) => t.created_by === (user?.id ?? mockUserId))
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
      }
      // TODO: real Supabase query
      return [] as FeedbackTicket[];
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });
}

export function useOpenTicketCount() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  return useQuery({
    queryKey: ["feedback-open-count", hotelId],
    queryFn: async () => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        return mockTickets.filter(
          (t) => t.status === "open" || t.status === "needs_info"
        ).length;
      }
      // TODO: real Supabase count
      return 0;
    },
    enabled: isDev ? true : !!hotelId,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ───────────────────────────────────────────────

export function useCreateTicket() {
  const { hotelId } = useActiveHotel();
  const { user } = useSession();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      input,
      screenshot,
    }: {
      input: CreateTicketInput;
      screenshot?: File;
    }) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 400));

        let screenshotUrl: string | null = null;
        if (screenshot) {
          screenshotUrl = await fileToDataUrl(screenshot);
        }

        const newTicket: FeedbackTicket = {
          id: crypto.randomUUID(),
          type: input.type,
          title: input.title,
          description: input.description,
          screenshot_url: screenshotUrl,
          status: "open",
          priority: input.priority,
          created_by: user?.id ?? "00000000-0000-0000-0000-000000000010",
          created_by_name: user?.user_metadata?.full_name ?? "Usuario Dev",
          created_by_email: user?.email ?? "dev@hotel.com",
          admin_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          resolved_at: null,
        };

        mockTickets.unshift(newTicket);
        return newTicket;
      }

      // TODO: real Supabase insert + storage upload
      throw new Error("Not implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-feedback-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-open-count"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTicket() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      input,
    }: {
      ticketId: string;
      input: UpdateTicketInput;
    }) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 300));
        const idx = mockTickets.findIndex((t) => t.id === ticketId);
        if (idx === -1) throw new Error("Ticket no encontrado");

        if (input.status) {
          mockTickets[idx]!.status = input.status;
          if (input.status === "resolved") {
            mockTickets[idx]!.resolved_at = new Date().toISOString();
          }
        }
        if (input.admin_notes !== undefined) {
          mockTickets[idx]!.admin_notes = input.admin_notes ?? null;
        }
        mockTickets[idx]!.updated_at = new Date().toISOString();

        return mockTickets[idx];
      }

      // TODO: real Supabase update
      throw new Error("Not implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-feedback-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-open-count"] });
      toast.success("Ticket actualizado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTicket() {
  const { hotelId } = useActiveHotel();
  const isDev = process.env.NODE_ENV === "development";
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      if ((isDev && skipAuth) || (!hotelId && isDev)) {
        await new Promise((r) => setTimeout(r, 200));
        const idx = mockTickets.findIndex((t) => t.id === ticketId);
        if (idx === -1) throw new Error("Ticket no encontrado");
        mockTickets = mockTickets.filter((t) => t.id !== ticketId);
        return;
      }

      // TODO: real Supabase delete
      throw new Error("Not implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["my-feedback-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-open-count"] });
      toast.success("Ticket eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
