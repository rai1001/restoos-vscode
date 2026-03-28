"use client";

import { useRouter } from "next/navigation";
import { useCreateMenu } from "@/features/recipes/hooks/use-menus";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateMenuSchema,
  type CreateMenuInput,
} from "@/features/recipes/schemas/recipe.schema";
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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const MENU_TYPES = [
  "degustación", "buffet", "carta", "ejecutivo", "banquete", "cocktail", "otro",
];

export default function NewMenuPage() {
  const router = useRouter();
  const createMenu = useCreateMenu();

  const form = useForm<CreateMenuInput>({
    resolver: zodResolver(CreateMenuSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(data: CreateMenuInput) {
    const result = await createMenu.mutateAsync(data);
    if (result?.id) {
      router.push(`/menus/${result.id}`);
    } else {
      router.push("/menus");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/menus">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nuevo menú</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del menú</CardTitle>
          <CardDescription>
            Crea el menú y luego añade secciones con recetas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del menú</Label>
              <Input id="name" {...form.register("name")} placeholder="Menú degustación primavera" />
              {form.formState.errors.name && (
                <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="menu_type">Tipo</Label>
                <select
                  id="menu_type"
                  {...form.register("menu_type")}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                >
                  <option value="">Sin tipo</option>
                  {MENU_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_food_cost_pct">Food cost % objetivo</Label>
                <Input
                  id="target_food_cost_pct"
                  type="number"
                  step="0.1"
                  {...form.register("target_food_cost_pct", { valueAsNumber: true })}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" {...form.register("description")} placeholder="Descripción del menú" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input id="notes" {...form.register("notes")} placeholder="Notas adicionales" />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={createMenu.isPending}>
                {createMenu.isPending ? "Creando..." : "Crear menú"}
              </Button>
              <Link href="/menus">
                <Button variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
