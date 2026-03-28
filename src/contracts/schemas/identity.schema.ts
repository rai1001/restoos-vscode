import { z } from "zod";
import { ROLE } from "../enums";

const roleValues = Object.values(ROLE) as [string, ...string[]];

// --- Tenant ---
export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Tenant = z.infer<typeof TenantSchema>;

// --- Hotel ---
export const HotelSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  timezone: z.string(),
  currency: z.string(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Hotel = z.infer<typeof HotelSchema>;

export const CreateHotelSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  timezone: z.string().default("Europe/Madrid"),
  currency: z.string().default("EUR"),
});
export type CreateHotelInput = z.infer<typeof CreateHotelSchema>;

export const UpdateHotelSchema = CreateHotelSchema.partial();
export type UpdateHotelInput = z.infer<typeof UpdateHotelSchema>;

// --- Profile ---
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  phone: z.string().nullable(),
  preferred_locale: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional(),
  preferred_locale: z.enum(["es", "en", "ca", "fr"]).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// --- Membership ---
export const MembershipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  hotel_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role: z.enum(roleValues),
  is_active: z.boolean(),
  is_default: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Membership = z.infer<typeof MembershipSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email("Email no válido"),
  role: z.enum(roleValues),
});
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

// --- Active Hotel (RPC response) ---
export const ActiveHotelSchema = z.object({
  hotel_id: z.string().uuid(),
  hotel_name: z.string(),
  hotel_slug: z.string(),
  tenant_id: z.string().uuid(),
  tenant_name: z.string(),
  role: z.enum(roleValues),
  timezone: z.string(),
  currency: z.string(),
});
export type ActiveHotel = z.infer<typeof ActiveHotelSchema>;
