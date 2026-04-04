"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ChefHat } from "lucide-react";
import { useCreateQuickSubRecipe } from "@/features/recipes/hooks/use-recipes";

interface CreateSubRecipeDialogProps {
  onCreated?: (recipe: { id: string; name: string }) => void;
}

export function CreateSubRecipeDialog({ onCreated }: CreateSubRecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [servings, setServings] = useState("10");
  const createSubRecipe = useCreateQuickSubRecipe();

  function handleCreate() {
    if (!name.trim()) return;
    createSubRecipe.mutate(
      { name: name.trim(), servings: parseInt(servings) || 10, category: "Base" },
      {
        onSuccess: (result) => {
          if (result?.recipe_id) {
            onCreated?.({ id: result.recipe_id, name: name.trim() });
          }
          setOpen(false);
          setName("");
          setServings("10");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-colors mt-1.5"
        />
      }>
        <Plus className="h-3 w-3" />
        Crear sub-receta
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Nueva sub-receta
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Crea una receta base (sofrito, caldo, salsa...) que podras usar como ingrediente en otras recetas.
        </p>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Sofrito gallego, Caldo de marisco..."
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Raciones que produce</Label>
            <Input
              type="number"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              min="1"
            />
            <p className="text-xs text-muted-foreground">
              Al usar esta sub-receta en otra receta, indicaras cuantas raciones necesitas.
            </p>
          </div>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || createSubRecipe.isPending}
            className="w-full"
          >
            {createSubRecipe.isPending ? "Creando..." : "Crear sub-receta"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Despues podras editarla para anadir sus ingredientes y pasos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
