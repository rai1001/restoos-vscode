"use client";

import { useState } from "react";
import { useUnits, useCreateUnit } from "@/features/catalog/hooks/use-units";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateUnitSchema,
  type CreateUnitInput,
} from "@/features/catalog/schemas/catalog.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Ruler } from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";

const UNIT_TYPE_LABELS: Record<string, string> = {
  weight: "Peso",
  volume: "Volumen",
  unit: "Unidad",
  length: "Longitud",
};

export default function UnitsPage() {
  const { data: units, isLoading } = useUnits();
  const createUnit = useCreateUnit();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<CreateUnitInput>({
    resolver: zodResolver(CreateUnitSchema),
    defaultValues: { name: "", abbreviation: "", unit_type: "weight", conversion_factor: 1 },
  });

  async function onSubmit(data: CreateUnitInput) {
    await createUnit.mutateAsync(data);
    setDialogOpen(false);
    form.reset();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unidades de medida</h1>
          <p className="text-muted-foreground mt-1">
            Define las unidades para productos y recetas.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva unidad
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva unidad</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit-name">Nombre</Label>
                  <Input id="unit-name" {...form.register("name")} placeholder="Kilogramo" />
                  {form.formState.errors.name && (
                    <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abbr">Abreviatura</Label>
                  <Input id="abbr" {...form.register("abbreviation")} placeholder="kg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <select
                    id="type"
                    {...form.register("unit_type")}
                    className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                  >
                    {Object.entries(UNIT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="factor">Factor conversión</Label>
                  <Input
                    id="factor"
                    type="number"
                    step="any"
                    {...form.register("conversion_factor", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createUnit.isPending}>
                {createUnit.isPending ? "Creando..." : "Crear unidad"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Abreviatura</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Factor</TableHead>
                <TableHead>Base</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units?.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>{unit.abbreviation}</TableCell>
                  <TableCell>{UNIT_TYPE_LABELS[unit.unit_type] ?? unit.unit_type}</TableCell>
                  <TableCell>{unit.conversion_factor}</TableCell>
                  <TableCell>
                    {unit.is_base && <Badge>Base</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {units?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState icon={Ruler} title="No hay unidades de medida" description="Define las unidades que usarás en recetas y compras" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
