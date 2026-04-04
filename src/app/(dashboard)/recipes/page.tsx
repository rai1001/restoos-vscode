"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRecipes } from "@/features/recipes/hooks/use-recipes";
import { Plus, Upload, Clock, Heart, SlidersHorizontal, Search, ChefHat } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ImportRecipeModal } from "@/features/recipes/components/ImportRecipeModal";
import { RoleGate } from "@/components/role-gate";

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string }> = {
  entrante: { label: "Entrantes" },
  principal: { label: "Carnes" },
  pescado: { label: "Pescados" },
  postre: { label: "Postres" },
  vegano: { label: "Vegano" },
};

const SEASON_FILTERS = [
  { key: "otono", label: "Menu Otono" },
  { key: "invierno", label: "Invierno" },
  { key: "primavera", label: "Primavera" },
  { key: "verano", label: "Verano" },
];

const CATEGORY_FILTERS = ["Entrantes", "Pescados", "Carnes", "Postres", "Vegano"];

const ITEMS_PER_PAGE = 8;

function getCategoryKey(category: string | null): string {
  if (!category) return "entrante";
  const lower = category.toLowerCase();
  if (lower.includes("pescado") || lower.includes("merluza") || lower.includes("salmon")) return "pescado";
  if (lower.includes("postre") || lower.includes("tarta") || lower.includes("coulant")) return "postre";
  if (lower.includes("vegano")) return "vegano";
  if (lower.includes("principal") || lower.includes("carne") || lower.includes("pollo") || lower.includes("ternera")) return "principal";
  return "entrante";
}

function getCategoryConfig(category: string | null) {
  const key = getCategoryKey(category);
  const fallback = { label: "Entrantes" };
  return CATEGORY_CONFIG[key] ?? fallback;
}

function getTotalTime(prep: number | null, cook: number | null): string {
  const total = (prep ?? 0) + (cook ?? 0);
  if (total === 0) return "--";
  if (total >= 60) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${total} min`;
}

// ── Card skeleton ────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden" style={{ backgroundColor: "#1A1A1A" }}>
      <div className="aspect-[4/3]" style={{ backgroundColor: "#252525" }} />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded" style={{ backgroundColor: "#252525", width: "75%" }} />
        <div className="flex justify-between">
          <div className="h-3 rounded" style={{ backgroundColor: "#252525", width: "40%" }} />
          <div className="h-3 rounded" style={{ backgroundColor: "#252525", width: "25%" }} />
        </div>
      </div>
    </div>
  );
}

// ── Recipe card ──────────────────────────────────────────────────────────────
function RecipeCard({ recipe }: { recipe: {
  id: string;
  name: string;
  category: string | null;
  cost_per_serving: number | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  description: string | null;
} }) {
  const config = getCategoryConfig(recipe.category);
  const [liked, setLiked] = useState(false);

  return (
    <Link href={`/recipes/${recipe.id}`} className="group block">
      <div
        className="rounded-2xl overflow-hidden transition-transform duration-200 group-hover:scale-[1.02]"
        style={{ backgroundColor: "#1A1A1A" }}
      >
        {/* Photo placeholder */}
        <div className="relative aspect-[4/3]" style={{ backgroundColor: "#141414" }}>
          {/* Category badge — neutral per DESIGN.md */}
          <span
            className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#8A8078" }}
          >
            {config.label}
          </span>

          {/* Favorite icon */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLiked(!liked);
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full transition-colors"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-white/70"}`}
            />
          </button>

          {/* Decorative bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#1A1A1A] to-transparent" />
        </div>

        {/* Content */}
        <div className="px-4 pt-3 pb-4">
          <h3
            className="font-semibold text-sm leading-tight line-clamp-2 mb-3"
            style={{ color: "#E5E2E1" }}
          >
            {recipe.name}
          </h3>

          {/* Bottom row: cost + time */}
          <div className="flex items-center justify-between">
            <div>
              <span
                className="text-[10px] font-bold uppercase tracking-widest block mb-0.5"
                style={{ color: "#A78B7D" }}
              >
                Coste/Racion
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: "#B8906F" }}
              >
                {recipe.cost_per_serving != null
                  ? `${recipe.cost_per_serving.toFixed(2)} \u20AC`
                  : "-- \u20AC"}
              </span>
            </div>

            <div className="flex items-center gap-1.5" style={{ color: "#A78B7D" }}>
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {getTotalTime(recipe.prep_time_min, recipe.cook_time_min)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RecipesPage() {
  const { data: recipes, isLoading } = useRecipes();
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSeason, setActiveSeason] = useState("otono");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const filtered = useMemo(() => {
    if (!recipes) return [];
    let result = recipes.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
    if (activeCategory) {
      const catMap: Record<string, string[]> = {
        Entrantes: ["entrante"],
        Pescados: ["pescado"],
        Carnes: ["principal"],
        Postres: ["postre"],
        Vegano: ["vegano"],
      };
      const keys = catMap[activeCategory] ?? [];
      result = result.filter((r) => keys.includes(getCategoryKey(r.category)));
    }
    return result;
  }, [recipes, search, activeCategory]);

  const visible = filtered.slice(0, visibleCount);
  const totalCount = recipes?.length ?? 0;

  if (!isLoading && (!recipes || recipes.length === 0)) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alta Cocina Digital</p>
          <h1 className="text-2xl font-bold text-foreground">Biblioteca de Recetas</h1>
        </div>
        <EmptyState
          icon={ChefHat}
          title="Tu biblioteca de recetas esta vacia"
          description="Crea tu primera receta con ingredientes, pasos y fotos. O importa recetas desde un archivo."
          actionLabel="+ Nueva Receta"
          actionHref="/recipes/new"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A0A0A" }}>
      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.25em] mb-2"
              style={{ color: "#A78B7D" }}
            >
              Alta Cocina Digital
            </p>
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: "#E5E2E1" }}
            >
              Biblioteca de Recetas
            </h1>
            <p
              className="text-sm max-w-xl leading-relaxed"
              style={{ color: "#A78B7D" }}
            >
              Gestion integral de escandallos, fichas tecnicas y procesos creativos para la brigada elite.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors"
              style={{ backgroundColor: "#1A1A1A", color: "#A78B7D" }}
            >
              <Upload className="h-4 w-4" />
              Importar
            </button>
            <RoleGate permission="recipe:create">
              <Link href="/recipes/new">
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-colors hover:brightness-110"
                  style={{ backgroundColor: "#F97316" }}
                >
                  <Plus className="h-4 w-4" />
                  Nueva Receta
                </button>
              </Link>
            </RoleGate>
          </div>
        </div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div className="relative mb-6">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: "#A78B7D" }}
          />
          <input
            type="text"
            placeholder="Buscar recetas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(ITEMS_PER_PAGE);
            }}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary/40"
            style={{ backgroundColor: "#1A1A1A", color: "#E5E2E1" }}
          />
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="mb-8 space-y-4">
          {/* Season row */}
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.2em] shrink-0"
              style={{ color: "#A78B7D" }}
            >
              Temporada Activa
            </span>
            <div className="flex gap-2">
              {SEASON_FILTERS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSeason(s.key)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: activeSeason === s.key ? "#F97316" : "#1A1A1A",
                    color: activeSeason === s.key ? "#FFFFFF" : "#A78B7D",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(activeCategory === cat ? null : cat);
                    setVisibleCount(ITEMS_PER_PAGE);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: activeCategory === cat ? "#F97316" : "#1A1A1A",
                    color: activeCategory === cat ? "#FFFFFF" : "#A78B7D",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: "#1A1A1A", color: "#A78B7D" }}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros Avanzados
            </button>
          </div>
        </div>

        {/* ── Card grid ──────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "#1A1A1A" }}
            >
              <Search className="h-7 w-7" style={{ color: "#A78B7D" }} />
            </div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: "#E5E2E1" }}>
              No hay recetas
            </h3>
            <p className="text-sm mb-6" style={{ color: "#A78B7D" }}>
              Crea tu primera receta para empezar
            </p>
            <Link href="/recipes/new">
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white"
                style={{ backgroundColor: "#F97316" }}
              >
                <Plus className="h-4 w-4" />
                Crear Receta
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visible.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        {/* ── Load more + count ──────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="flex flex-col items-center mt-10 gap-4">
            {visibleCount < filtered.length && (
              <button
                onClick={() => setVisibleCount((c) => c + ITEMS_PER_PAGE)}
                className="px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors hover:brightness-110"
                style={{ backgroundColor: "#1A1A1A", color: "#F97316" }}
              >
                Cargar mas creaciones
              </button>
            )}
            <p
              className="text-[10px] font-bold uppercase tracking-[0.25em]"
              style={{ color: "#A78B7D" }}
            >
              Mostrando {visible.length} de {totalCount} recetas magistrales
            </p>
          </div>
        )}
      </div>

      <ImportRecipeModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
