"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/db/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  InviteMemberSchema,
  type InviteMemberInput,
} from "@/contracts/schemas/identity.schema";
import { ROLE } from "@/contracts/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  direction: "Dirección",
  commercial: "Comercial",
  head_chef: "Jefe de Cocina",
  cook: "Cocinero",
  procurement: "Compras",
  room: "Sala",
  reception: "Recepción",
  admin: "Administrador",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const supabase = createClient();

  const loadMembers = useCallback(async (hId: string) => {
    const { data } = await supabase
      .from("memberships")
      .select("id, user_id, role, is_active, profiles(full_name, avatar_url)")
      .eq("hotel_id", hId)
      .eq("is_active", true);

    if (data) setMembers(data as unknown as TeamMember[]);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.rpc("get_active_hotel", {
        p_user_id: user.id,
      });

      if (data?.hotel_id) {
        setHotelId(data.hotel_id);
        setCurrentUserId(user.id);
        await loadMembers(data.hotel_id);
      }
      setLoading(false);
    }
    init();
  }, [supabase, loadMembers]);

  const inviteForm = useForm<InviteMemberInput>({
    resolver: zodResolver(InviteMemberSchema),
    defaultValues: { role: ROLE.COOK },
  });

  async function onInvite(input: InviteMemberInput) {
    if (!hotelId) return;

    const { error } = await supabase.rpc("invite_member", {
      p_hotel_id: hotelId,
      p_email: input.email,
      p_role: input.role,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Miembro invitado");
    setDialogOpen(false);
    inviteForm.reset();
    await loadMembers(hotelId);
  }

  async function handleDeactivate(targetUserId: string) {
    if (!hotelId) return;

    const { error } = await supabase.rpc("deactivate_member", {
      p_hotel_id: hotelId,
      p_target_user_id: targetUserId,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Miembro desactivado");
    await loadMembers(hotelId);
  }

  if (loading) {
    return <div className="text-muted-foreground p-6">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los miembros de tu restaurante.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar miembro</DialogTitle>
              <DialogDescription>
                Añade un nuevo miembro al equipo del restaurante.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={inviteForm.handleSubmit(onInvite)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  {...inviteForm.register("email")}
                  placeholder="usuario@email.com"
                />
                {inviteForm.formState.errors.email && (
                  <p className="text-destructive text-sm">
                    {inviteForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Rol</Label>
                <select
                  id="invite-role"
                  {...inviteForm.register("role")}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                >
                  {Object.entries(ROLE_LABELS)
                    .filter(([key]) => {
                      if (key === "superadmin") return false;
                      const currentRole = members.find(
                        (m) => m.user_id === currentUserId
                      )?.role;
                      if (
                        key === "admin" &&
                        currentRole !== "admin" &&
                        currentRole !== "superadmin"
                      )
                        return false;
                      return true;
                    })
                    .map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={inviteForm.formState.isSubmitting}
              >
                {inviteForm.formState.isSubmitting
                  ? "Invitando..."
                  : "Invitar miembro"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Miembros activos</CardTitle>
          <CardDescription>
            {members.length} miembro{members.length !== 1 && "s"} en el equipo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {member.profiles?.full_name ?? "Sin nombre"}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeactivate(member.user_id)}
                  className="text-destructive"
                >
                  Desactivar
                </Button>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-muted-foreground text-center text-sm">
                No hay miembros. Invita al primero.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
