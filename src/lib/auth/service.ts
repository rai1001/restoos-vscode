import { createClient } from "@/lib/db/client";
import type {
  InviteMemberInput,
  ActiveHotel,
  Membership,
  Profile,
} from "@/contracts/schemas/identity.schema";

function getSupabase() {
  return createClient();
}

export const authService = {
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
  },

  async getProfile(): Promise<Profile | null> {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("*")
      .single();
    if (error) return null;
    return data;
  },

  async updateProfile(input: { full_name?: string; phone?: string }) {
    const { data, error } = await getSupabase()
      .from("profiles")
      .update(input)
      .eq("id", (await getSupabase().auth.getUser()).data.user?.id ?? "")
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getActiveHotel(userId: string): Promise<ActiveHotel | null> {
    const { data, error } = await getSupabase().rpc("get_active_hotel", {
      p_user_id: userId,
    });
    if (error) throw error;
    if (!data || Object.keys(data).length === 0) return null;
    return data as ActiveHotel;
  },

  async switchHotel(userId: string, hotelId: string) {
    const { data, error } = await getSupabase().rpc("switch_active_hotel", {
      p_user_id: userId,
      p_hotel_id: hotelId,
    });
    if (error) throw error;
    return data;
  },

  async getMyMemberships(): Promise<Membership[]> {
    const { data, error } = await getSupabase()
      .from("memberships")
      .select("*")
      .eq("is_active", true);
    if (error) throw error;
    return data ?? [];
  },

  async getHotelMembers(hotelId: string) {
    const { data, error } = await getSupabase()
      .from("memberships")
      .select("*, profiles(full_name, avatar_url)")
      .eq("hotel_id", hotelId)
      .eq("is_active", true);
    if (error) throw error;
    return data ?? [];
  },

  async inviteMember(hotelId: string, input: InviteMemberInput) {
    const { data, error } = await getSupabase().rpc("invite_member", {
      p_hotel_id: hotelId,
      p_email: input.email,
      p_role: input.role,
    });
    if (error) throw error;
    return data;
  },

  async updateMemberRole(
    hotelId: string,
    targetUserId: string,
    newRole: string
  ) {
    const { data, error } = await getSupabase().rpc("update_member_role", {
      p_hotel_id: hotelId,
      p_target_user_id: targetUserId,
      p_new_role: newRole,
    });
    if (error) throw error;
    return data;
  },

  async deactivateMember(hotelId: string, targetUserId: string) {
    const { data, error } = await getSupabase().rpc("deactivate_member", {
      p_hotel_id: hotelId,
      p_target_user_id: targetUserId,
    });
    if (error) throw error;
    return data;
  },
};
