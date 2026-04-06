"use client";

import { useState } from "react";
import { useClients, useCreateClient } from "@/features/clients/hooks/use-clients";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateClientSchema,
  type CreateClientInput,
  type Client,
} from "@/features/clients/schemas/client.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, Users } from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients() as { data: Client[] | undefined; isLoading: boolean };
  const createClient = useCreateClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm<CreateClientInput>({
    resolver: zodResolver(CreateClientSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(data: CreateClientInput) {
    await createClient.mutateAsync(data);
    setDialogOpen(false);
    form.reset();
  }

  const filtered = clients?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            GESTION DE CLIENTES
          </p>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">{clients?.length ?? 0} clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 text-white border-0" />}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </DialogTrigger>
          <DialogContent className="bg-card border-border-subtle text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Nuevo cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nombre</Label>
                <Input id="client-name" {...form.register("name")} placeholder="Nombre del cliente" className="bg-sidebar border-border-subtle text-foreground placeholder:text-muted-foreground/50" />
                {form.formState.errors.name && (
                  <p className="text-[var(--alert-critical)] text-sm">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Empresa</Label>
                <Input id="company" {...form.register("company")} className="bg-sidebar border-border-subtle text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-email" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</Label>
                  <Input id="client-email" type="email" {...form.register("email")} className="bg-sidebar border-border-subtle text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Telefono</Label>
                  <Input id="client-phone" {...form.register("phone")} className="bg-sidebar border-border-subtle text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-tax" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">CIF/NIF</Label>
                <Input id="client-tax" {...form.register("tax_id")} className="bg-sidebar border-border-subtle text-foreground" />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white border-0" disabled={createClient.isPending}>
                {createClient.isPending ? "Creando..." : "Crear cliente"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar clientes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card border-border-subtle text-foreground placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filtered?.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay clientes"
          description="Registra tu primer cliente para asociar eventos"
        />
      ) : (
        <div className="rounded-lg bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border-subtle hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Empresa</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Email</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Telefono</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((client) => (
                <TableRow key={client.id} className="border-b border-card-hover hover:bg-card-hover/50">
                  <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">{client.company ?? "\u2014"}</TableCell>
                  <TableCell className="text-muted-foreground">{client.email ?? "\u2014"}</TableCell>
                  <TableCell className="text-muted-foreground">{client.phone ?? "\u2014"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
