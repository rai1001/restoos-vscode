"use client";

import { useState } from "react";
import Link from "next/link";
import { useMenus } from "@/features/recipes/hooks/use-menus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart2, Plus, Search, UtensilsCrossed } from "lucide-react";
import { TableSkeleton } from "@/components/page-skeleton";
import { EmptyState } from "@/components/empty-state";

export default function MenusPage() {
  const { data: menus, isLoading } = useMenus();
  const [search, setSearch] = useState("");

  const filtered = menus?.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">
            GESTION DE CARTA
          </p>
          <h1 className="text-2xl font-bold text-[#E5E2E1]">Menus & Cartas</h1>
          <p className="text-[#A78B7D] mt-1">
            {menus?.length ?? 0} menus registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/menus/engineering">
            <Button variant="outline" className="border-[#A78B7D]/20 bg-[#1A1A1A] text-[#E5E2E1] hover:bg-[#222222] hover:text-[#F97316]">
              <BarChart2 className="mr-2 h-4 w-4" />
              Ingenieria de menu
            </Button>
          </Link>
          <Link href="/menus/new">
            <Button className="bg-[#F97316] text-white hover:bg-[#F97316]/90">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo menu
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="text-[#A78B7D] absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar menus..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#1A1A1A] border-[#A78B7D]/20 text-[#E5E2E1] placeholder:text-[#A78B7D]/50"
        />
      </div>

      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : filtered?.length === 0 && !search ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No hay menus"
          description="Crea tu primer menu para asociar recetas a eventos"
          actionLabel="Nuevo menu"
          actionHref="/menus/new"
        />
      ) : (
        <div className="rounded-lg overflow-hidden bg-[#1A1A1A]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#A78B7D]/10 hover:bg-transparent">
                <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Nombre</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Tipo</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Estado</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Coste total</TableHead>
                <TableHead className="text-xs font-medium uppercase tracking-widest text-[#A78B7D]">Food cost %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((menu) => (
                <TableRow key={menu.id} className="border-b border-[#A78B7D]/10 hover:bg-[#222222] transition-colors">
                  <TableCell>
                    <Link href={`/menus/${menu.id}`} className="text-[#F97316] font-medium hover:underline">
                      <span className="flex items-center gap-1.5">
                        <UtensilsCrossed className="h-3.5 w-3.5" />
                        {menu.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize text-[#E5E2E1]">{menu.menu_type ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={
                        menu.status === "active"
                          ? "inline-flex items-center rounded-md bg-[#F97316]/10 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-[#F97316]"
                          : menu.status === "draft"
                            ? "inline-flex items-center rounded-md bg-[#A78B7D]/10 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-[#A78B7D]"
                            : "inline-flex items-center rounded-md bg-[#A78B7D]/10 px-2 py-0.5 text-xs font-medium uppercase tracking-widest text-[#A78B7D]/60"
                      }
                    >
                      {menu.status === "active" ? "Activo" : menu.status === "draft" ? "Borrador" : "Archivado"}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#E5E2E1]">
                    {menu.total_cost != null ? `${menu.total_cost.toFixed(2)} €` : "—"}
                  </TableCell>
                  <TableCell className="text-[#E5E2E1]">
                    {menu.target_food_cost_pct != null ? `${menu.target_food_cost_pct}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-[#A78B7D] text-center">
                    Sin resultados para &quot;{search}&quot;
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
