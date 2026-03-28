"use client";

import { useState } from "react";
import { useCategories, useCreateCategory } from "@/features/catalog/hooks/use-categories";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateCategorySchema,
  type CreateCategoryInput,
} from "@/features/catalog/schemas/catalog.schema";
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
import { Plus, FolderTree } from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(CreateCategorySchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(data: CreateCategoryInput) {
    await createCategory.mutateAsync(data);
    setDialogOpen(false);
    form.reset();
  }

  const rootCategories = categories?.filter((c) => !c.parent_id) ?? [];
  const getChildren = (parentId: string) =>
    categories?.filter((c) => c.parent_id === parentId) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-muted-foreground mt-1">
            Organiza tus productos en categorías.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva categoría
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva categoría</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Nombre</Label>
                <Input id="cat-name" {...form.register("name")} placeholder="Nombre de la categoría" />
                {form.formState.errors.name && (
                  <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Categoría padre</Label>
                <select
                  id="parent"
                  {...form.register("parent_id")}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                >
                  <option value="">Raíz (sin padre)</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={createCategory.isPending}>
                {createCategory.isPending ? "Creando..." : "Crear categoría"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <TableSkeleton cols={3} />
      ) : rootCategories.length === 0 ? (
        <EmptyState icon={FolderTree} title="No hay categorías" description="Crea la primera categoría para organizar tus productos" />
      ) : (
        <div className="space-y-2">
          {rootCategories.map((cat) => (
            <div key={cat.id} className="rounded-md border p-3">
              <p className="font-medium">{cat.name}</p>
              {getChildren(cat.id).length > 0 && (
                <div className="ml-6 mt-2 space-y-1">
                  {getChildren(cat.id).map((child) => (
                    <div key={child.id} className="text-muted-foreground text-sm">
                      └ {child.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
