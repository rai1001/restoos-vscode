"use client";

import { useState } from "react";
import Link from "next/link";
import { useMenus } from "@/features/recipes/hooks/use-menus";
import {
  useMenuEngineering,
  type EngineeringItem,
  type Quadrant,
} from "@/features/recipes/hooks/use-menu-engineering";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Info, UtensilsCrossed } from "lucide-react";

// ─── Quadrant metadata ─────────────────────────────────────────────────────

interface QuadrantMeta {
  label: string;
  emoji: string;
  subtitle: string;
  tip: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  textClass: string;
}

const QUADRANT_META: Record<Quadrant, QuadrantMeta> = {
  estrella: {
    label: "Estrellas",
    emoji: "⭐",
    subtitle: "Alta rentabilidad · Alta popularidad",
    tip: "Promociona estos platos. Son tu motor de negocio.",
    bgClass: "bg-[var(--alert-ok)]/10",
    borderClass: "border-[var(--alert-ok)]",
    badgeClass: "bg-[var(--alert-ok)]/10 text-[var(--alert-ok)] border-[var(--alert-ok)]",
    textClass: "text-[var(--alert-ok)]",
  },
  caballo: {
    label: "Caballos de batalla",
    emoji: "🐎",
    subtitle: "Baja rentabilidad · Alta popularidad",
    tip: "Muy pedidos pero poco rentables. Optimiza su coste.",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    textClass: "text-blue-700",
  },
  puzzle: {
    label: "Puzzles",
    emoji: "🧩",
    subtitle: "Alta rentabilidad · Baja popularidad",
    tip: "Rentables pero poco pedidos. Mejora su visibilidad.",
    bgClass: "bg-[var(--alert-warning)]/10",
    borderClass: "border-[var(--alert-warning)]",
    badgeClass: "bg-[var(--alert-warning)]/10 text-[var(--alert-warning)] border-[var(--alert-warning)]",
    textClass: "text-[var(--alert-warning)]",
  },
  perro: {
    label: "Perros",
    emoji: "🐕",
    subtitle: "Baja rentabilidad · Baja popularidad",
    tip: "Poco pedidos y poco rentables. Considera eliminarlos.",
    bgClass: "bg-[var(--alert-critical)]/10",
    borderClass: "border-[var(--alert-critical)]",
    badgeClass: "bg-[var(--alert-critical)]/10 text-[var(--alert-critical)] border-[var(--alert-critical)]",
    textClass: "text-[var(--alert-critical)]",
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────

function QuadrantBadge({ quadrant }: { quadrant: Quadrant }) {
  const meta = QUADRANT_META[quadrant];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.badgeClass}`}
    >
      <span>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function QuadrantCard({
  quadrant,
  items,
}: {
  quadrant: Quadrant;
  items: EngineeringItem[];
}) {
  const meta = QUADRANT_META[quadrant];
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border-2 p-4 ${meta.bgClass} ${meta.borderClass} min-h-[160px]`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <span className={`text-sm font-bold uppercase tracking-wide ${meta.textClass}`}>
            {meta.label}
          </span>
          <span
            className={`ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${meta.badgeClass}`}
          >
            {items.length}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">{meta.subtitle}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-xs italic">Sin platos en este cuadrante</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item.id}
              title={
                item.cost != null
                  ? `Coste: ${item.cost.toFixed(2)} €${item.price != null ? ` · PVP: ${item.price.toFixed(2)} €` : ""}`
                  : item.name
              }
              className={`cursor-default rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${meta.badgeClass}`}
            >
              {item.name}
            </span>
          ))}
        </div>
      )}

      <p className={`mt-auto text-xs italic ${meta.textClass}`}>{meta.tip}</p>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function MenuEngineeringPage() {
  const { data: menus, isLoading: menusLoading } = useMenus();
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);

  const { items, isLoading: itemsLoading } = useMenuEngineering(
    selectedMenuId || null
  );

  const selectedMenu = menus?.find((m) => m.id === selectedMenuId);

  // Group items by quadrant
  const byQuadrant: Record<Quadrant, EngineeringItem[]> = {
    estrella: items.filter((i) => i.quadrant === "estrella"),
    caballo: items.filter((i) => i.quadrant === "caballo"),
    puzzle: items.filter((i) => i.quadrant === "puzzle"),
    perro: items.filter((i) => i.quadrant === "perro"),
  };

  const hasPriceData = items.some((i) => i.price != null);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/menus">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Menús
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ingeniería de Menú</h1>
          <p className="text-muted-foreground mt-1">
            Análisis de rentabilidad y popularidad por plato
          </p>
        </div>

        {/* ── Menu selector ── */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm whitespace-nowrap">Analizar menú:</span>
          {menusLoading ? (
            <div className="bg-muted h-8 w-48 animate-pulse rounded-lg" />
          ) : (
            <Select
              value={selectedMenuId}
              onValueChange={(val) => setSelectedMenuId(val)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecciona un menú..." />
              </SelectTrigger>
              <SelectContent>
                {menus?.map((menu) => (
                  <SelectItem key={menu.id} value={menu.id}>
                    {menu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!selectedMenuId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UtensilsCrossed className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-semibold">Selecciona un menú para analizar</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Elige un menú de la lista para ver la matriz de ingeniería con la
              clasificación de cada plato por rentabilidad y popularidad.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Loading ── */}
      {selectedMenuId && itemsLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-40 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {/* ── Analysis ── */}
      {selectedMenuId && !itemsLoading && (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {hasPriceData ? (
                <span>
                  La rentabilidad se calcula a partir del margen de contribución (PVP − coste).
                  La popularidad es relativa al orden de aparición en el menú.{" "}
                  <strong>Conecta tu TPV para datos reales de ventas.</strong>
                </span>
              ) : (
                <span>
                  No hay precios de venta registrados. La rentabilidad se basa en coste relativo
                  (menor coste = mayor margen relativo) y la popularidad en el orden de aparición.{" "}
                  <strong>
                    Añade precios de venta a las recetas del menú o conecta tu TPV para un análisis
                    preciso.
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* No items */}
          {items.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <UtensilsCrossed className="text-muted-foreground mb-4 h-10 w-10" />
                <h3 className="font-semibold">Este menú no tiene recetas</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Añade recetas a las secciones del menú para generar la matriz.
                </p>
                {selectedMenu && (
                  <Link href={`/menus/${selectedMenu.id}`} className="mt-4">
                    <Button variant="outline" size="sm">
                      Ir al menú
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── 2×2 Quadrant matrix ── */}
          {items.length > 0 && (
            <>
              {/* Axis labels */}
              <div className="relative">
                {/* Y-axis label */}
                <div className="pointer-events-none absolute -left-2 top-1/2 hidden -translate-y-1/2 -translate-x-full md:flex">
                  <span
                    className="text-muted-foreground -rotate-90 whitespace-nowrap text-xs font-medium tracking-widest uppercase"
                    style={{ writingMode: "vertical-rl" }}
                  >
                    Rentabilidad →
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/*
                    Layout (reading order):
                      [0] Puzzles   — top-left:  low pop, high margin
                      [1] Estrellas — top-right: high pop, high margin
                      [2] Perros    — bot-left:  low pop, low margin
                      [3] Caballos  — bot-right: high pop, low margin
                  */}
                  <QuadrantCard quadrant="puzzle" items={byQuadrant.puzzle} />
                  <QuadrantCard quadrant="estrella" items={byQuadrant.estrella} />
                  <QuadrantCard quadrant="perro" items={byQuadrant.perro} />
                  <QuadrantCard quadrant="caballo" items={byQuadrant.caballo} />
                </div>

                {/* X-axis label */}
                <div className="mt-2 flex justify-center">
                  <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                    ← Baja popularidad · · · Alta popularidad →
                  </span>
                </div>
              </div>

              {/* ── Summary table ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Resumen por plato
                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                      {items.length} platos analizados
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-b-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Receta</TableHead>
                          <TableHead>Sección</TableHead>
                          <TableHead className="text-right">Coste</TableHead>
                          <TableHead className="text-right">PVP</TableHead>
                          <TableHead className="text-right">Margen</TableHead>
                          <TableHead>Popularidad rel.</TableHead>
                          <TableHead>Cuadrante</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const meta = QUADRANT_META[item.quadrant];
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.name}
                                {item.category && (
                                  <span className="text-muted-foreground ml-1.5 text-xs">
                                    ({item.category})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {item.sectionName}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {item.cost != null
                                  ? `${item.cost.toFixed(2)} €`
                                  : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {item.price != null
                                  ? `${item.price.toFixed(2)} €`
                                  : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {item.contributionMargin != null ? (
                                  <span
                                    className={
                                      item.contributionMargin >= 0
                                        ? "text-[var(--alert-ok)] font-medium"
                                        : "text-[var(--alert-critical)] font-medium"
                                    }
                                  >
                                    {item.contributionMargin >= 0 ? "+" : ""}
                                    {item.contributionMargin.toFixed(2)} €
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="bg-muted h-1.5 w-16 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${meta.bgClass.replace("-50", "-400")}`}
                                      style={{
                                        width: `${Math.round(item.popularityScore * 100)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-muted-foreground w-8 text-right text-xs">
                                    {Math.round(item.popularityScore * 100)}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <QuadrantBadge quadrant={item.quadrant} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* ── Legend / Key ── */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(["estrella", "caballo", "puzzle", "perro"] as Quadrant[]).map(
                  (q) => {
                    const meta = QUADRANT_META[q];
                    return (
                      <div
                        key={q}
                        className={`rounded-lg border p-3 text-sm ${meta.bgClass} ${meta.borderClass}`}
                      >
                        <div className={`font-semibold ${meta.textClass}`}>
                          {meta.emoji} {meta.label}
                        </div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          {meta.tip}
                        </div>
                        <Badge variant="outline" className={`mt-2 text-xs ${meta.badgeClass}`}>
                          {byQuadrant[q].length} platos
                        </Badge>
                      </div>
                    );
                  }
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
