"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  useRecipe,
  useSubmitForReview,
  useApproveRecipe,
  useDeprecateRecipe,
  useRecipeIngredients,
  useAddIngredient,
  useRemoveIngredient,
  useRecipeSteps,
  useAddStep,
  useRemoveStep,
} from "@/features/recipes/hooks/use-recipes";
import { ProductCombobox } from "@/components/product-combobox";
import { RecipeCombobox } from "@/components/recipe-combobox";
import { CreateSubRecipeDialog } from "@/components/create-sub-recipe-dialog";
import { MOCK_PRODUCTS, MOCK_SUPPLIER_OFFERS, MOCK_VOLUME_DISCOUNTS, MOCK_RECIPE_INGREDIENTS, getPreferredPrice } from "@/lib/mock-data";
import { RECIPE_TRANSITIONS, type RecipeStatus } from "@/contracts/enums";
import { calculateRecipeCost, collectAllergens } from "@/lib/calculations/costEngine";
import { calculatePricingByChannel } from "@/lib/calculations/marginEngine";
import { scaleRecipe, generateShoppingList } from "@/lib/calculations/scalingEngine";
import type { ShoppingListItem } from "@/lib/calculations/scalingEngine";
import type { RecipeMap, ProductMap, CatalogMap, PricingConfig, PricingRecommendation, RecipeCostResult, RecipeIngredientCalc, AllergenCode, RecipeIngredient, ScaledRecipe } from "@/lib/calculations/types";
import { ALLERGENS } from "@/features/catalog/allergen-types";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Clock, Users, Calculator, Plus, Trash2, FileText, Scale3D, ShoppingCart, Copy, Download, RefreshCw } from "lucide-react";
import { RoleGate } from "@/components/role-gate";
import { TechSheetDialog } from "@/features/recipes/components/TechSheetDialog";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

/* ─── Design Tokens ──────────────────────────────────────────── */
const T = {
  bg: "#0A0A0A",
  card: "#1A1A1A",
  primary: "#B8906F",
  text: "#E5E2E1",
  secondary: "#A78B7D",
  muted: "#6B5B50",
  surface: "#242424",
} as const;

/* ─── Status config (replacing RecipeStatusBadge import) ──── */
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "BORRADOR", color: "#6B7280" },
  review_pending: { label: "EN REVISION", color: "#F59E0B" },
  approved: { label: "EN PRODUCCION", color: "#10B981" },
  deprecated: { label: "DEPRECADA", color: "#EF4444" },
  archived: { label: "ARCHIVADA", color: "#6B7280" },
};

/* ─── Donut chart colors ──────────────────────────────────── */
const DONUT_COLORS = ["#B8906F", "#A78B7D", "#6B5B50", "#D97706", "#92400E"];

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: recipe, isLoading } = useRecipe(id);
  const { data: ingredients } = useRecipeIngredients(id);
  const { data: steps } = useRecipeSteps(id);
  const submitForReview = useSubmitForReview();
  const approveRecipe = useApproveRecipe();
  const deprecateRecipe = useDeprecateRecipe();
  const addIngredient = useAddIngredient(id);
  const removeIngredient = useRemoveIngredient(id);
  const addStep = useAddStep(id);
  const removeStep = useRemoveStep(id);

  const [ingredientDialog, setIngredientDialog] = useState(false);
  const [stepDialog, setStepDialog] = useState(false);
  const [techSheetOpen, setTechSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"base" | "racion">("base");

  // Ingredient form state
  const [ingType, setIngType] = useState<"product" | "sub_recipe">("product");
  const [ingProductId, setIngProductId] = useState("");
  const [ingSubRecipeId, setIngSubRecipeId] = useState("");
  const [ingSubRecipeName, setIngSubRecipeName] = useState("");
  const [ingQuantity, setIngQuantity] = useState("");
  const [ingNotes, setIngNotes] = useState("");

  // Step form state
  const [stepInstruction, setStepInstruction] = useState("");
  const [stepDuration, setStepDuration] = useState("");

  // Cost calculation result
  const [costResult, setCostResult] = useState<RecipeCostResult | null>(null);

  // Scaling dialog state
  const [scalingDialog, setScalingDialog] = useState(false);
  const [targetServings, setTargetServings] = useState("");
  const [scaledResult, setScaledResult] = useState<ScaledRecipe | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[] | null>(null);
  const [scalingIngredients, setScalingIngredients] = useState<RecipeIngredient[]>([]);

  // Channel pricing derived from costResult via margin engine
  const channelPricing: PricingRecommendation[] = useMemo(() => {
    if (!costResult) return [];
    const config: PricingConfig = {
      target_food_cost_pct: 0.30,
      target_margin_pct: 0.65,
      commercial_rounding: 0.50,
      channel_commissions: {
        sala: 0,
        delivery_glovo: 0.30,
        delivery_uber: 0.35,
      },
    };
    return calculatePricingByChannel(costResult.cost_per_serving, config);
  }, [costResult]);

  // Donut chart data derived from cost result
  const donutData = useMemo(() => {
    if (!costResult || !costResult.lines || costResult.lines.length === 0) return [];
    // Group by category-like buckets based on ingredient cost
    const lines = costResult.lines;
    const total = costResult.total_cost || 1;
    // Find the most expensive line as "Proteina Principal"
    const sorted = [...lines].sort((a, b) => b.line_cost - a.line_cost);
    const proteinCost = sorted[0]?.line_cost ?? 0;
    const restCost = sorted.slice(1).reduce((s, l) => s + l.line_cost, 0);
    const indirectCost = total - proteinCost - restCost;
    const data = [];
    if (proteinCost > 0) data.push({ name: "Proteina Principal", value: Number(((proteinCost / total) * 100).toFixed(1)), cost: proteinCost });
    if (restCost > 0) data.push({ name: "Guarnicion & Salsas", value: Number(((restCost / total) * 100).toFixed(1)), cost: restCost });
    if (indirectCost > 0) data.push({ name: "Costes Indirectos", value: Number(((indirectCost / total) * 100).toFixed(1)), cost: indirectCost });
    return data;
  }, [costResult]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p style={{ color: T.secondary }}>Cargando...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p style={{ color: "#EF4444" }}>Receta no encontrada</p>
      </div>
    );
  }

  const getProductName = (productId: string | null) => {
    if (!productId) return "Desconocido";
    return MOCK_PRODUCTS.find(p => p.id === productId)?.name ?? productId.slice(0, 8) + "..."
  }

  const getIngredientName = (ing: { product_id: string | null; sub_recipe_id?: string | null; sub_recipe_name?: string | null; notes?: string | null }) => {
    if (ing.sub_recipe_id) {
      return ing.sub_recipe_name || ing.notes || `Sub-receta`;
    }
    return getProductName(ing.product_id);
  }

  const ingredientsCost = (ingredients ?? []).reduce((sum, ing) => {
    if (!ing.product_id) return sum; // sub-recipes calculated separately
    const price = getPreferredPrice(ing.product_id)
    return sum + (price ? ing.quantity * price : 0)
  }, 0)

  const canSubmit = recipe.status === "draft";
  const canApprove = RECIPE_TRANSITIONS[recipe.status as RecipeStatus]?.includes("approved" as RecipeStatus);
  const canDeprecate = recipe.status === "approved";
  const isEditable = recipe.status === "draft" || recipe.status === "review_pending";

  const statusCfg = STATUS_CONFIG[recipe.status] ?? { label: recipe.status.toUpperCase(), color: "#6B7280" };

  function handleAddIngredient() {
    if (!ingQuantity) return;
    if (ingType === "product" && !ingProductId) return;
    if (ingType === "sub_recipe" && !ingSubRecipeId) return;

    const input = ingType === "product"
      ? { product_id: ingProductId, sub_recipe_id: null, quantity: parseFloat(ingQuantity), notes: ingNotes || undefined }
      : { product_id: null, sub_recipe_id: ingSubRecipeId, quantity: parseFloat(ingQuantity), notes: ingNotes || ingSubRecipeName || undefined };

    addIngredient.mutate(input, {
      onSuccess: () => {
        setIngredientDialog(false);
        setIngType("product");
        setIngProductId("");
        setIngSubRecipeId("");
        setIngSubRecipeName("");
        setIngQuantity("");
        setIngNotes("");
      },
    });
  }

  function handleAddStep() {
    if (!stepInstruction) return;
    const nextNumber = (steps?.length ?? 0) + 1;
    addStep.mutate(
      {
        step_number: nextNumber,
        instruction: stepInstruction,
        duration_min: stepDuration ? parseInt(stepDuration) : undefined,
      },
      {
        onSuccess: () => {
          setStepDialog(false);
          setStepInstruction("");
          setStepDuration("");
        },
      }
    );
  }

  function handleCalculateCost() {
    const mockIngredientsRaw = MOCK_RECIPE_INGREDIENTS[id as keyof typeof MOCK_RECIPE_INGREDIENTS];
    const mockIngredients: RecipeIngredientCalc[] | undefined = mockIngredientsRaw
      ? (mockIngredientsRaw as unknown as RecipeIngredientCalc[])
      : undefined;

    const recipeIngredients: RecipeIngredientCalc[] = mockIngredients
      ? [...mockIngredients]
      : (ingredients ?? []).map((ing) => ({
          id: ing.id,
          product_id: ing.product_id,
          product_name: getProductName(ing.product_id),
          sub_recipe_id: ing.sub_recipe_id ?? null,
          quantity: ing.quantity,
          unit: {
            id: "unit-kg",
            name: "Kilogramo",
            abbreviation: "kg",
          },
          unit_id: "unit-kg",
          waste_percent: 0.05,
          catalog_entry_id: null,
          notes: ing.notes ?? null,
        }));

    if (recipeIngredients.length === 0) {
      toast.info("Anade ingredientes primero");
      return;
    }

    if (!recipe) return;

    const recipeMap: RecipeMap = {
      [id]: {
        id,
        name: recipe.name,
        servings: recipe.servings,
        category: recipe.category ?? null,
        ingredients: recipeIngredients,
      },
    };

    const productMap: ProductMap = {};
    for (const p of MOCK_PRODUCTS) {
      productMap[p.id] = {
        id: p.id,
        name: p.name,
        yield_percent: p.yield_percent,
        allergens: (p.allergens ?? []) as AllergenCode[],
      };
    }

    const catalogMap: CatalogMap = {};
    for (const offer of MOCK_SUPPLIER_OFFERS) {
      if (!catalogMap[offer.product_id]) {
        catalogMap[offer.product_id] = [];
      }
      catalogMap[offer.product_id]!.push({
        id: offer.id,
        supplier_id: offer.supplier_id,
        supplier_name: offer.supplier_name,
        product_id: offer.product_id,
        unit_price: offer.price,
        min_order_qty: 1,
        pack_size: 1,
        is_preferred: offer.is_preferred,
        volume_discounts: MOCK_VOLUME_DISCOUNTS[offer.id] ?? [],
      });
    }

    const pricingConfig: PricingConfig = {
      target_food_cost_pct: 0.30,
      target_margin_pct: 0.70,
      commercial_rounding: 0.50,
      channel_commissions: {},
    };

    try {
      const result = calculateRecipeCost(id, recipeMap, productMap, catalogMap, pricingConfig);
      const allergens = collectAllergens(result);
      setCostResult(result);

      toast.success(
        `Coste calculado: ${result.total_cost.toFixed(2)} EUR total - ${result.cost_per_serving.toFixed(2)} EUR/racion - PVP sugerido ${result.suggested_pvp.toFixed(2)} EUR${allergens.length > 0 ? ` - ${allergens.length} alergenos` : ""}`,
      );
    } catch (err) {
      toast.error(`Error al calcular: ${err instanceof Error ? err.message : "desconocido"}`);
    }
  }

  // ─── Scaling helpers ─────────────────────────────────────────

  function buildScalingCatalogMap(): CatalogMap {
    const catalogMap: CatalogMap = {};
    for (const offer of MOCK_SUPPLIER_OFFERS) {
      if (!catalogMap[offer.product_id]) {
        catalogMap[offer.product_id] = [];
      }
      catalogMap[offer.product_id]!.push({
        id: offer.id,
        supplier_id: offer.supplier_id,
        supplier_name: offer.supplier_name,
        product_id: offer.product_id,
        unit_price: offer.price,
        min_order_qty: 1,
        pack_size: 1,
        is_preferred: offer.is_preferred,
        volume_discounts: MOCK_VOLUME_DISCOUNTS[offer.id] ?? [],
      });
    }
    return catalogMap;
  }

  function buildScalingIngredients(): RecipeIngredient[] {
    const mockIngredientsRaw = MOCK_RECIPE_INGREDIENTS[id as keyof typeof MOCK_RECIPE_INGREDIENTS];
    if (mockIngredientsRaw) {
      return (mockIngredientsRaw as unknown as RecipeIngredientCalc[]).map((ing) => ({
        product_id: ing.product_id,
        product_name: ing.product_name,
        unit_id: ing.unit_id,
        unit: ing.unit,
        quantity: ing.quantity,
        waste_percent: ing.waste_percent,
      }));
    }
    return (ingredients ?? []).map((ing) => ({
      product_id: ing.product_id,
      product_name: getProductName(ing.product_id),
      unit_id: "unit-kg",
      unit: { id: "unit-kg", name: "Kilogramo", abbreviation: "kg" },
      quantity: ing.quantity,
      waste_percent: 0.05,
    }));
  }

  function handleScaleRecipe() {
    const target = parseInt(targetServings);
    if (!target || target <= 0) {
      toast.error("Introduce un numero de raciones valido");
      return;
    }

    if (!recipe) return;

    const scalingIngs = buildScalingIngredients();
    if (scalingIngs.length === 0) {
      toast.info("Anade ingredientes primero");
      return;
    }

    const catalogMap = buildScalingCatalogMap();
    try {
      const result = scaleRecipe(recipe.servings, target, scalingIngs, catalogMap);
      setScaledResult(result);
      setScalingIngredients(scalingIngs);
      setShoppingList(null);
      toast.success(`Receta escalada: x${result.scale_factor} -> ${result.total_cost.toFixed(2)} EUR`);
    } catch (err) {
      toast.error(`Error al escalar: ${err instanceof Error ? err.message : "desconocido"}`);
    }
  }

  function handleGenerateShoppingList() {
    if (!scaledResult) return;
    const catalogMap = buildScalingCatalogMap();
    try {
      const list = generateShoppingList(scaledResult, catalogMap, scalingIngredients);
      setShoppingList(list);
      const totalEstimated = list.reduce((s, item) => s + item.estimated_cost, 0);
      toast.success(`Lista de compra: ${list.length} productos - ${totalEstimated.toFixed(2)} EUR estimado`);
    } catch (err) {
      toast.error(`Error al generar lista: ${err instanceof Error ? err.message : "desconocido"}`);
    }
  }

  const getAllergenInfo = (code: string) =>
    ALLERGENS.find((a) => a.key === code);

  /* ─── KPI helpers ─────────────────────────────────────────── */
  const kpiCostPerServing = costResult?.cost_per_serving ?? recipe.cost_per_serving ?? 0;
  const kpiMarginTarget = costResult ? (1 - costResult.food_cost_pct) * 100 : 72.0;
  const kpiPVP = costResult?.suggested_pvp ?? 0;
  const kpiMarginReal = costResult
    ? ((costResult.margin_gross / (costResult.suggested_pvp || 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg, color: T.text }}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ─── Breadcrumb ──────────────────────────────────── */}
        <div className="flex items-center gap-2 text-sm" style={{ color: T.secondary }}>
          <Link href="/recipes" className="hover:underline" style={{ color: T.secondary }}>
            <span className="flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Recetas
            </span>
          </Link>
          <span>/</span>
          {recipe.category && (
            <>
              <span className="capitalize">{recipe.category}</span>
              <span>/</span>
            </>
          )}
          <span style={{ color: T.text }}>{recipe.name}</span>
        </div>

        {/* ─── Header ──────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: T.text }}>
                Escandallo: {recipe.name}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest"
                style={{
                  backgroundColor: `${statusCfg.color}20`,
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.color}40`,
                }}
              >
                {statusCfg.label}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-sm" style={{ color: T.secondary }}>
              <span>Version {recipe.version}</span>
              <span style={{ color: T.muted }}>|</span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {recipe.servings} raciones
              </span>
              {recipe.prep_time_min && (
                <>
                  <span style={{ color: T.muted }}>|</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Prep: {recipe.prep_time_min}min
                  </span>
                </>
              )}
              {recipe.cook_time_min && (
                <>
                  <span style={{ color: T.muted }}>|</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Coccion: {recipe.cook_time_min}min
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: T.surface, color: T.text, border: `1px solid ${T.muted}30` }}
              onClick={() => toast.info("Duplicar escandallo")}
            >
              <Copy className="h-4 w-4" />
              Duplicar Escandallo
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: T.surface, color: T.text, border: `1px solid ${T.muted}30` }}
              onClick={() => setTechSheetOpen(true)}
            >
              <FileText className="h-4 w-4" />
              Ficha Tecnica
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: T.surface, color: T.text, border: `1px solid ${T.muted}30` }}
              onClick={() => toast.info("Export PDF")}
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: T.primary, color: "#fff" }}
              onClick={handleCalculateCost}
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar Precios
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: T.surface, color: T.text, border: `1px solid ${T.muted}30` }}
              onClick={() => {
                setScalingDialog(true);
                setScaledResult(null);
                setShoppingList(null);
                setTargetServings("");
              }}
            >
              <Scale3D className="h-4 w-4" />
              Escalar
            </button>
            {canSubmit && (
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: T.primary, color: "#fff" }}
                onClick={() => submitForReview.mutate(id)}
                disabled={submitForReview.isPending}
              >
                {submitForReview.isPending ? "Enviando..." : "Enviar a revision"}
              </button>
            )}
            {canApprove && (
              <RoleGate permission="recipe:approve">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: "#10B981", color: "#fff" }}
                  onClick={() => approveRecipe.mutate(id)}
                  disabled={approveRecipe.isPending}
                >
                  {approveRecipe.isPending ? "Aprobando..." : "Aprobar"}
                </button>
              </RoleGate>
            )}
            {canDeprecate && (
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: "#EF4444", color: "#fff" }}
                onClick={() => deprecateRecipe.mutate(id)}
                disabled={deprecateRecipe.isPending}
              >
                Deprecar
              </button>
            )}
          </div>
        </div>

        {/* ─── KPI Cards Row ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "COSTE TOTAL POR RACION",
              value: `\u20AC${kpiCostPerServing.toFixed(2)}`,
              border: T.primary,
              sub: costResult ? `Total: \u20AC${costResult.total_cost.toFixed(2)}` : undefined,
            },
            {
              label: "MARGEN OBJETIVO",
              value: `${kpiMarginTarget.toFixed(1)}%`,
              border: "#10B981",
              sub: costResult ? `Food cost: ${(costResult.food_cost_pct * 100).toFixed(1)}%` : undefined,
            },
            {
              label: "PRECIO RECOMENDADO",
              value: `\u20AC${kpiPVP.toFixed(2)}`,
              border: "#8B5CF6",
              sub: costResult ? `Margen bruto: \u20AC${costResult.margin_gross.toFixed(2)}` : undefined,
            },
            {
              label: "MARGEN REAL VS TEORICO",
              value: `${kpiMarginReal.toFixed(1)}%`,
              border: kpiMarginReal >= 65 ? "#10B981" : kpiMarginReal >= 50 ? "#F59E0B" : "#EF4444",
              sub: kpiMarginReal >= 65 ? "Dentro del objetivo" : "Por debajo del objetivo",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl p-5"
              style={{
                backgroundColor: T.card,
                borderLeft: `4px solid ${kpi.border}`,
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: T.secondary }}
              >
                {kpi.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: T.text }}>
                {kpi.value}
              </p>
              {kpi.sub && (
                <p className="text-xs mt-1" style={{ color: T.muted }}>
                  {kpi.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ─── Ingredients + Donut Chart ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ingredients table - 2 cols */}
          <div className="lg:col-span-2 rounded-xl p-6" style={{ backgroundColor: T.card }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: T.secondary }}
                >
                  DESGLOSE DE INGREDIENTES
                </p>
                <p className="text-xs" style={{ color: T.muted }}>
                  {ingredients?.length ?? 0} ingredientes
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Base / Racion toggle */}
                <div
                  className="flex rounded-lg overflow-hidden text-xs"
                  style={{ border: `1px solid ${T.muted}30` }}
                >
                  <button
                    className="px-3 py-1.5 font-medium transition-colors"
                    style={{
                      backgroundColor: viewMode === "base" ? T.primary : "transparent",
                      color: viewMode === "base" ? "#fff" : T.secondary,
                    }}
                    onClick={() => setViewMode("base")}
                  >
                    Base
                  </button>
                  <button
                    className="px-3 py-1.5 font-medium transition-colors"
                    style={{
                      backgroundColor: viewMode === "racion" ? T.primary : "transparent",
                      color: viewMode === "racion" ? "#fff" : T.secondary,
                    }}
                    onClick={() => setViewMode("racion")}
                  >
                    / Racion
                  </button>
                </div>
                {isEditable && (
                  <Dialog open={ingredientDialog} onOpenChange={setIngredientDialog}>
                    <DialogTrigger render={
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: T.primary, color: "#fff" }}
                      />
                    }>
                      <Plus className="h-3.5 w-3.5" />
                      Anadir
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Anadir ingrediente</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: `${T.muted}15` }}>
                          <button
                            type="button"
                            onClick={() => { setIngType("product"); setIngSubRecipeId(""); setIngSubRecipeName(""); }}
                            className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: ingType === "product" ? T.card : "transparent",
                              color: ingType === "product" ? T.text : T.secondary,
                            }}
                          >
                            Producto
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIngType("sub_recipe"); setIngProductId(""); }}
                            className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: ingType === "sub_recipe" ? T.card : "transparent",
                              color: ingType === "sub_recipe" ? T.text : T.secondary,
                            }}
                          >
                            Sub-receta
                          </button>
                        </div>

                        <div className="space-y-2">
                          <Label>{ingType === "product" ? "Producto" : "Sub-receta"}</Label>
                          {ingType === "product" ? (
                            <ProductCombobox
                              value={ingProductId || null}
                              onSelect={(p) => setIngProductId(p?.id ?? "")}
                              placeholder="Buscar producto del catalogo..."
                            />
                          ) : (
                            <>
                              <RecipeCombobox
                                value={ingSubRecipeId || null}
                                excludeRecipeId={id}
                                onSelect={(r) => {
                                  setIngSubRecipeId(r?.id ?? "");
                                  setIngSubRecipeName(r?.name ?? "");
                                }}
                                placeholder="Buscar receta aprobada..."
                              />
                              <CreateSubRecipeDialog
                                onCreated={(r) => {
                                  setIngSubRecipeId(r.id);
                                  setIngSubRecipeName(r.name);
                                }}
                              />
                            </>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>{ingType === "sub_recipe" ? "Raciones" : "Cantidad"}</Label>
                          <Input
                            type="number"
                            step={ingType === "sub_recipe" ? "1" : "0.001"}
                            value={ingQuantity}
                            onChange={(e) => setIngQuantity(e.target.value)}
                            placeholder={ingType === "sub_recipe" ? "Num. raciones de la sub-receta" : ""}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Notas</Label>
                          <Input
                            value={ingNotes}
                            onChange={(e) => setIngNotes(e.target.value)}
                            placeholder="Opcional"
                          />
                        </div>
                        <Button onClick={handleAddIngredient} disabled={addIngredient.isPending} className="w-full">
                          {addIngredient.isPending ? "Anadiendo..." : ingType === "sub_recipe" ? "Anadir sub-receta" : "Anadir ingrediente"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {ingredients && ingredients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.muted}20` }}>
                      {["INGREDIENTE", "UNIDAD / CANTIDAD", "P.NETO", "MERMA %", "COSTE FINAL"].map((h, i) => (
                        <th
                          key={h}
                          className={`pb-3 text-[10px] font-semibold uppercase tracking-widest ${i >= 2 ? "text-right" : "text-left"}`}
                          style={{ color: T.muted }}
                        >
                          {h}
                        </th>
                      ))}
                      {isEditable && <th className="w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing) => {
                      const price = ing.product_id ? getPreferredPrice(ing.product_id) : null;
                      const qty = viewMode === "racion" ? ing.quantity / (recipe.servings || 1) : ing.quantity;
                      const costFinal = price ? qty * price : 0;
                      return (
                        <tr
                          key={ing.id}
                          style={{ borderBottom: `1px solid ${T.muted}10` }}
                          className="group"
                        >
                          <td className="py-3 font-medium" style={{ color: T.text }}>
                            <span className="flex items-center gap-2">
                              {ing.sub_recipe_id && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${T.secondary}20`, color: T.secondary }}>
                                  SUB
                                </span>
                              )}
                              {getIngredientName(ing)}
                            </span>
                          </td>
                          <td className="py-3" style={{ color: T.secondary }}>
                            {qty.toFixed(3)} kg
                          </td>
                          <td className="py-3 text-right" style={{ color: T.secondary }}>
                            {(qty * 0.95).toFixed(3)} kg
                          </td>
                          <td className="py-3 text-right" style={{ color: T.secondary }}>
                            5.0%
                          </td>
                          <td className="py-3 text-right font-medium" style={{ color: T.text }}>
                            {costFinal > 0 ? `\u20AC${costFinal.toFixed(2)}` : "\u2014"}
                          </td>
                          {isEditable && (
                            <td className="py-3">
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10"
                                onClick={() => removeIngredient.mutate(ing.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" style={{ color: "#EF4444" }} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {ingredientsCost > 0 && (
                  <div
                    className="flex justify-end pt-4 mt-2"
                    style={{ borderTop: `1px solid ${T.muted}20` }}
                  >
                    <span className="text-sm font-medium" style={{ color: T.secondary }}>
                      Total ingredientes:{" "}
                      <span style={{ color: T.primary }}>{`\u20AC${ingredientsCost.toFixed(2)}`}</span>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: T.muted }}>
                Sin ingredientes. Anade productos del catalogo.
              </p>
            )}
          </div>

          {/* Donut Chart - 1 col */}
          <div className="rounded-xl p-6" style={{ backgroundColor: T.card }}>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-6"
              style={{ color: T.secondary }}
            >
              DISTRIBUCION DE COSTES
            </p>
            {donutData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="relative w-52 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {donutData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: T.surface,
                          border: "none",
                          borderRadius: "8px",
                          color: T.text,
                          fontSize: "12px",
                        }}
                        formatter={((value: number) => [`${value}%`, ""]) as never}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: T.text }}>
                      {`\u20AC${kpiCostPerServing.toFixed(2)}`}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: T.muted }}>
                      / racion
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 space-y-3 w-full">
                  {donutData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                        />
                        <span className="text-xs" style={{ color: T.secondary }}>
                          {entry.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium" style={{ color: T.text }}>
                        {entry.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-52">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: T.surface }}>
                  <Calculator className="h-8 w-8" style={{ color: T.muted }} />
                </div>
                <p className="text-xs mt-4 text-center" style={{ color: T.muted }}>
                  Calcula el coste para ver<br />la distribucion
                </p>
              </div>
            )}

            {/* Tip de Rentabilidad */}
            {costResult && (
              <div
                className="mt-6 rounded-lg p-4"
                style={{ backgroundColor: `${T.surface}` }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#10B981" }}>
                  TIP DE RENTABILIDAD
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#10B981" }}>
                  {costResult.food_cost_pct <= 0.30
                    ? "Excelente food cost. El plato esta dentro del rango optimo de rentabilidad para alta cocina."
                    : costResult.food_cost_pct <= 0.35
                      ? "Food cost aceptable. Considera ajustar gramajes o buscar proveedores alternativos."
                      : "Food cost elevado. Revisa ingredientes premium y busca alternativas sin comprometer calidad."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── PVP por canal ───────────────────────────────── */}
        {costResult && channelPricing.length > 0 && (
          <div className="rounded-xl p-6" style={{ backgroundColor: T.card }}>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: T.secondary }}
            >
              PVP POR CANAL
            </p>
            <p className="text-xs mb-6" style={{ color: T.muted }}>
              Precios recomendados segun margenes objetivo y comisiones de plataforma
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.muted}20` }}>
                    <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-widest" style={{ color: T.muted }}>Canal</th>
                    <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-widest" style={{ color: T.muted }}>PVP Recomendado</th>
                    <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-widest" style={{ color: T.muted }}>Margen Efectivo %</th>
                  </tr>
                </thead>
                <tbody>
                  {channelPricing.map((rec) => {
                    const marginPct = rec.effective_margin_pct * 100;
                    const marginColor =
                      marginPct >= 65 ? "#10B981" : marginPct >= 50 ? "#F59E0B" : "#EF4444";
                    const channelLabel: Record<string, string> = {
                      sala: "Sala",
                      delivery_glovo: "Glovo",
                      delivery_uber: "Uber Eats",
                    };
                    return (
                      <tr key={rec.channel} style={{ borderBottom: `1px solid ${T.muted}10` }}>
                        <td className="py-3 font-medium" style={{ color: T.text }}>
                          {channelLabel[rec.channel] ?? rec.channel}
                        </td>
                        <td className="py-3 text-right" style={{ color: T.text }}>
                          {`\u20AC${rec.pvp_recommended.toFixed(2)}`}
                        </td>
                        <td className="py-3 text-right font-medium" style={{ color: marginColor }}>
                          {marginPct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Ejecucion Culinaria (Mise en Place) ─────────── */}
        <div className="rounded-xl p-6" style={{ backgroundColor: T.card }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                style={{ color: T.secondary }}
              >
                EJECUCION CULINARIA (MISE EN PLACE)
              </p>
              <p className="text-xs" style={{ color: T.muted }}>
                {steps?.length ?? 0} pasos de preparacion
              </p>
            </div>
            {isEditable && (
              <Dialog open={stepDialog} onOpenChange={setStepDialog}>
                <DialogTrigger render={
                  <button
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: T.primary, color: "#fff" }}
                  />
                }>
                  <Plus className="h-3.5 w-3.5" />
                  Anadir paso
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Anadir paso</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Instruccion</Label>
                      <Input
                        value={stepInstruction}
                        onChange={(e) => setStepInstruction(e.target.value)}
                        placeholder="Describe el paso..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duracion (min)</Label>
                      <Input
                        type="number"
                        value={stepDuration}
                        onChange={(e) => setStepDuration(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                    <Button onClick={handleAddStep} disabled={addStep.isPending} className="w-full">
                      {addStep.isPending ? "Anadiendo..." : "Anadir paso"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {steps && steps.length > 0 ? (
            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-start gap-4 p-4 rounded-lg group"
                  style={{ backgroundColor: T.surface }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${T.primary}20`, color: T.primary }}
                  >
                    {String(step.step_number).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1" style={{ color: T.text }}>
                      Paso {step.step_number}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: T.secondary }}>
                      {step.instruction}
                    </p>
                    {step.duration_min && (
                      <p className="text-xs mt-2 flex items-center gap-1" style={{ color: T.muted }}>
                        <Clock className="h-3 w-3" />
                        {step.duration_min} min
                      </p>
                    )}
                  </div>
                  {isEditable && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-500/10"
                      onClick={() => removeStep.mutate(step.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: "#EF4444" }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: T.muted }}>
              Sin pasos de preparacion. Anade pasos para documentar la mise en place.
            </p>
          )}
        </div>

        {/* ─── Alergenos & Dieta ───────────────────────────── */}
        {costResult && costResult.allergens.length > 0 && (
          <div className="rounded-xl p-6" style={{ backgroundColor: T.card }}>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-6"
              style={{ color: T.secondary }}
            >
              ALERGENOS & DIETA
            </p>
            <div className="flex flex-wrap gap-4">
              {costResult.allergens.map((code) => {
                const info = getAllergenInfo(code);
                return (
                  <div key={code} className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-xl"
                      style={{
                        backgroundColor: T.surface,
                        border: `2px solid ${T.primary}40`,
                      }}
                    >
                      {info?.emoji ?? "?"}
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: T.secondary }}>
                      {info?.label ?? code}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Estrategia de Emplatado (Recipe Photo) ──────── */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: T.card }}>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest p-6 pb-0"
            style={{ color: T.secondary }}
          >
            ESTRATEGIA DE EMPLATADO
          </p>
          <div className="p-6">
            <div
              className="w-full h-64 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: T.surface }}
            >
              <div className="text-center">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${T.primary}15` }}
                >
                  <FileText className="h-7 w-7" style={{ color: T.primary }} />
                </div>
                <p className="text-sm font-medium" style={{ color: T.secondary }}>
                  Foto de emplatado
                </p>
                <p className="text-xs mt-1" style={{ color: T.muted }}>
                  Arrastra o haz clic para subir
                </p>
              </div>
            </div>
          </div>
          {recipe.description && (
            <div className="px-6 pb-6">
              <p className="text-sm leading-relaxed" style={{ color: T.secondary }}>
                {recipe.description}
              </p>
            </div>
          )}
          {recipe.notes && (
            <div className="px-6 pb-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: T.muted }}>
                NOTAS
              </p>
              <p className="text-sm leading-relaxed" style={{ color: T.secondary }}>
                {recipe.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Preserved: TechSheetDialog ────────────────────── */}
      <TechSheetDialog
        recipeId={id}
        recipeName={recipe?.name ?? ""}
        open={techSheetOpen}
        onOpenChange={setTechSheetOpen}
      />

      {/* ─── Preserved: Scaling Dialog ─────────────────────── */}
      <Dialog open={scalingDialog} onOpenChange={setScalingDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escalar receta - {recipe.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Input section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <Label>Raciones actuales</Label>
                <Input value={recipe.servings} disabled className="w-28" />
              </div>
              <div className="space-y-2">
                <Label>Raciones objetivo</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ej: 100"
                  value={targetServings}
                  onChange={(e) => setTargetServings(e.target.value)}
                  className="w-28"
                  onKeyDown={(e) => { if (e.key === "Enter") handleScaleRecipe(); }}
                />
              </div>
              <Button onClick={handleScaleRecipe}>
                <Calculator className="mr-1 h-4 w-4" />
                Calcular
              </Button>
            </div>

            {/* Scaled result */}
            {scaledResult && (
              <div className="rounded-lg p-4" style={{ backgroundColor: T.surface }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold" style={{ color: T.text }}>Resultado del escalado</p>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: `${T.primary}20`, color: T.primary }}
                  >
                    x{scaledResult.scale_factor}
                  </span>
                </div>
                <p className="text-xs mb-4" style={{ color: T.muted }}>
                  {scaledResult.original_servings} {"→"} {scaledResult.target_servings} raciones
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cant. original</TableHead>
                        <TableHead className="text-right">Cant. escalada</TableHead>
                        <TableHead className="text-right">Con merma</TableHead>
                        <TableHead className="text-right">Coste linea</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scaledResult.lines.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{line.product_name}</TableCell>
                          <TableCell className="text-right">
                            {line.original_qty} {line.unit.abbreviation}
                          </TableCell>
                          <TableCell className="text-right">
                            {line.scaled_qty} {line.unit.abbreviation}
                          </TableCell>
                          <TableCell className="text-right">
                            {line.scaled_qty_with_waste} {line.unit.abbreviation}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {line.line_cost.toFixed(2)} EUR
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-2 border-t pt-3 mt-3 text-sm sm:flex-row sm:justify-between">
                  <div>
                    <span style={{ color: T.muted }}>Coste total: </span>
                    <span className="font-semibold">{scaledResult.total_cost.toFixed(2)} EUR</span>
                  </div>
                  <div>
                    <span style={{ color: T.muted }}>Coste/racion: </span>
                    <span className="font-semibold">{scaledResult.cost_per_serving.toFixed(2)} EUR</span>
                  </div>
                </div>

                <Button variant="outline" onClick={handleGenerateShoppingList} className="w-full mt-4">
                  <ShoppingCart className="mr-1 h-4 w-4" />
                  Generar lista de compra
                </Button>
              </div>
            )}

            {/* Shopping list */}
            {shoppingList && (
              <div className="rounded-lg p-4" style={{ backgroundColor: T.surface }}>
                <p className="text-sm font-semibold mb-1" style={{ color: T.text }}>Lista de compra</p>
                <p className="text-xs mb-4" style={{ color: T.muted }}>
                  {shoppingList.length} productos - ajustado a MOQ y tamanos de pack
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Necesario</TableHead>
                        <TableHead className="text-right">A pedir</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Coste estimado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shoppingList.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-right">
                            {item.qty_needed} {item.unit.abbreviation}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.qty_to_order} {item.unit.abbreviation}
                          </TableCell>
                          <TableCell>{item.supplier_name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {item.estimated_cost.toFixed(2)} EUR
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end border-t pt-3 mt-3 text-sm">
                  <div>
                    <span style={{ color: T.muted }}>Total estimado: </span>
                    <span className="font-semibold" style={{ color: T.primary }}>
                      {shoppingList.reduce((s, item) => s + item.estimated_cost, 0).toFixed(2)} EUR
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
