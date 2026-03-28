import { z } from "zod";

// --- Client ---
export const ClientSchema = z.object({
  id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  name: z.string(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  tax_id: z.string().nullable(),
  address: z.string().nullable(),
  notes: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Client = z.infer<typeof ClientSchema>;

export const CreateClientSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  company: z.string().max(200).optional(),
  email: z.string().email("Email no v\u00e1lido").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  tax_id: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateClientInput = z.infer<typeof CreateClientSchema>;
