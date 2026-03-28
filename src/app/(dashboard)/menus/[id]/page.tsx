"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  useMenu,
  useMenuSections,
  useAddSection,
  useRemoveSection,
  useCalculateMenuCost,
} from "@/features/recipes/hooks/use-menus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Calculator, Plus, Trash2 } from "lucide-react";

export default function MenuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: menu, isLoading } = useMenu(id);
  const { data: sections } = useMenuSections(id);
  const addSection = useAddSection(id);
  const removeSection = useRemoveSection(id);
  const calculateCost = useCalculateMenuCost();

  const [sectionDialog, setSectionDialog] = useState(false);
  const [sectionName, setSectionName] = useState("");

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (!menu) {
    return <p className="text-destructive">Menú no encontrado</p>;
  }

  function handleAddSection() {
    if (!sectionName) return;
    addSection.mutate(
      { name: sectionName, sort_order: (sections?.length ?? 0) + 1 },
      {
        onSuccess: () => {
          setSectionDialog(false);
          setSectionName("");
        },
      }
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/menus">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Menús
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{menu.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <Badge variant={menu.status === "active" ? "default" : "secondary"}>
              {menu.status === "active" ? "Activo" : menu.status === "draft" ? "Borrador" : "Archivado"}
            </Badge>
            <Badge variant="outline">v{menu.version}</Badge>
            {menu.menu_type && (
              <span className="text-muted-foreground text-sm capitalize">{menu.menu_type}</span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => calculateCost.mutate(id)}
          disabled={calculateCost.isPending}
        >
          <Calculator className="mr-1 h-4 w-4" />
          {calculateCost.isPending ? "Calculando..." : "Calcular coste"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {menu.description && <p>{menu.description}</p>}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coste total</span>
              <span className="font-medium">
                {menu.total_cost != null ? `${menu.total_cost.toFixed(2)} €` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Food cost % objetivo</span>
              <span>
                {menu.target_food_cost_pct != null ? `${menu.target_food_cost_pct}%` : "—"}
              </span>
            </div>
            {menu.notes && (
              <div>
                <span className="text-muted-foreground">Notas:</span>
                <p className="mt-1">{menu.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plantilla</span>
              <span>{menu.is_template ? "Sí" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creado</span>
              <span>{new Date(menu.created_at).toLocaleDateString("es")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actualizado</span>
              <span>{new Date(menu.updated_at).toLocaleDateString("es")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Secciones</CardTitle>
              <CardDescription>
                Organiza el menú en secciones (entrantes, principales, postres...) y asigna recetas a cada una.
              </CardDescription>
            </div>
            <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="mr-1 h-4 w-4" />
                Añadir sección
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva sección</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={sectionName}
                      onChange={(e) => setSectionName(e.target.value)}
                      placeholder="Entrantes, Principales, Postres..."
                    />
                  </div>
                  <Button onClick={handleAddSection} disabled={addSection.isPending} className="w-full">
                    {addSection.isPending ? "Añadiendo..." : "Añadir sección"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {sections && sections.length > 0 ? (
            <div className="space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{section.name}</p>
                    <p className="text-muted-foreground text-xs">
                      Gestión de recetas por sección disponible próximamente.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection.mutate(section.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Sin secciones. Añade la primera para organizar el menú.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
