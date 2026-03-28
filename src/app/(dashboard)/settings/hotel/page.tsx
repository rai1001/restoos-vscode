"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/db/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UpdateHotelSchema,
  type UpdateHotelInput,
} from "@/contracts/schemas/identity.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function HotelSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const supabase = createClient();

  const form = useForm<UpdateHotelInput>({
    resolver: zodResolver(UpdateHotelSchema),
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.rpc("get_active_hotel", {
        p_user_id: user.id,
      });

      if (data?.hotel_id) {
        setHotelId(data.hotel_id);
        const { data: hotel } = await supabase
          .from("hotels")
          .select("*")
          .eq("id", data.hotel_id)
          .single();

        if (hotel) {
          form.reset({
            name: hotel.name,
            slug: hotel.slug,
            timezone: hotel.timezone,
            currency: hotel.currency,
          });
        }
      }
      setLoading(false);
    }
    load();
  }, [supabase, form]);

  async function onSubmit(input: UpdateHotelInput) {
    if (!hotelId) return;

    const { error } = await supabase
      .from("hotels")
      .update(input)
      .eq("id", hotelId);

    if (error) {
      toast.error("Error al actualizar el restaurante");
      return;
    }

    toast.success("Restaurante actualizado");
  }

  if (loading) {
    return <div className="text-muted-foreground p-6">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración del restaurante</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona los datos de tu restaurante.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
          <CardDescription>
            Nombre, zona horaria y moneda del establecimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input id="slug" {...form.register("slug")} />
              {form.formState.errors.slug && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.slug.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Zona horaria</Label>
                <Input id="timezone" {...form.register("timezone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input id="currency" {...form.register("currency")} />
              </div>
            </div>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
