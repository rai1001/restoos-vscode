"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateRecipe } from "@/features/recipes/hooks/use-recipes";
import { recipeService } from "@/features/recipes/services/recipe.service";
import { useActiveHotel } from "@/lib/auth/hooks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateRecipeSchema,
  type CreateRecipeInput,
} from "@/features/recipes/schemas/recipe.schema";
import type { LocalIngredient, LocalStep } from "@/features/recipes/schemas/recipe-form.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Mic, Plus, Trash2, ImageIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { parseRecipeVoice, parseIngredientVoice } from "@/lib/voice-parser";
import { VoiceMicButton } from "@/components/voice-mic-button";
import { cn } from "@/lib/utils";
import { ProductCombobox } from "@/components/product-combobox";
import { RecipeCombobox } from "@/components/recipe-combobox";
import { CreateSubRecipeLink } from "@/components/create-sub-recipe-dialog";
import { matchIngredientToProduct } from "@/lib/product-matcher";
import { useProducts } from "@/features/catalog/hooks/use-products";
import { useAllOffers } from "@/features/catalog/hooks/use-suppliers";

const CATEGORIES = [
  "entrante", "principal", "postre", "guarnicion", "salsa",
  "pan", "bebida", "snack", "otro",
];

const UNITS = ["kg", "g", "L", "ml", "ud", "manojo", "diente", "cucharada", "cucharadita"];

export default function NewRecipePage() {
  const router = useRouter();
  const { hotelId } = useActiveHotel();
  const createRecipe = useCreateRecipe();
  const { data: products } = useProducts();
  const { data: offers } = useAllOffers();

  const getPreferredPrice = (productId: string): number | null => {
    const productOffers = (offers ?? []).filter(o => o.product_id === productId);
    const preferred = productOffers.find(o => o.is_preferred);
    return preferred?.price ?? productOffers[0]?.price ?? null;
  };

  // Preselect sub-recipe if coming from ?sub=1
  const isSubFromUrl = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("sub") === "1";

  const form = useForm<CreateRecipeInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(CreateRecipeSchema) as any,
    defaultValues: { servings: 4, is_sub_recipe: isSubFromUrl },
  });

  // -- Local state for ingredients, steps, photo --
  const [ingredients, setIngredients] = useState<LocalIngredient[]>([]);
  const [steps, setSteps] = useState<LocalStep[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // -- Inline ingredient editing --
  const [newIngName, setNewIngName] = useState("");
  const [newIngQty, setNewIngQty] = useState("");
  const [newIngUnit, setNewIngUnit] = useState("g");
  const [newIngNotes, setNewIngNotes] = useState("");
  const [ingType, setIngType] = useState<"product" | "sub_recipe">("product");
  const [ingProductId, setIngProductId] = useState<string | null>(null);
  const [ingSubRecipeId, setIngSubRecipeId] = useState<string | null>(null);

  // -- Inline step editing --
  const [newStepInstruction, setNewStepInstruction] = useState("");
  const [newStepDuration, setNewStepDuration] = useState("");

  // -- Voice input for basic data --
  const voice = useVoiceInput({
    lang: "es-ES",
    onResult: (transcript) => {
      const parsed = parseRecipeVoice(transcript);
      const filled: string[] = [];

      if (parsed.name) { form.setValue("name", parsed.name); filled.push("nombre"); }
      if (parsed.category) { form.setValue("category", parsed.category as CreateRecipeInput["category"]); filled.push("categoria"); }
      if (parsed.servings) { form.setValue("servings", parsed.servings); filled.push("raciones"); }
      if (parsed.prep_time_min) { form.setValue("prep_time_min", parsed.prep_time_min); filled.push("tiempo prep."); }
      if (parsed.cook_time_min) { form.setValue("cook_time_min", parsed.cook_time_min); filled.push("tiempo coccion"); }
      if (parsed.description) { form.setValue("description", parsed.description); filled.push("descripcion"); }

      if (filled.length > 0) {
        toast.success(`Rellenado por voz: ${filled.join(", ")}`);
      } else {
        toast.info("Voz reconocida, pero no se detectaron campos. Intentalo con: 'Nombre, categoria, X raciones'");
      }
    },
    onError: (err) => toast.error(err),
  });

  // -- Voice input for ingredients --
  const ingredientVoice = useVoiceInput({
    lang: "es-ES",
    onResult: (transcript) => {
      const parsed = parseIngredientVoice(transcript);
      if (parsed) {
        const matches = matchIngredientToProduct(
          parsed.name,
          (products ?? []).map((p) => ({ id: p.id, name: p.name }))
        );
        let matchedProductId: string | undefined;
        let displayName = parsed.name;
        const bestMatch = matches[0];
        if (bestMatch && bestMatch.confidence >= 0.7) {
          matchedProductId = bestMatch.product_id;
          displayName = bestMatch.product_name;
        }

        const newIng: LocalIngredient = {
          id: crypto.randomUUID(),
          name: displayName,
          product_id: matchedProductId,
          quantity: parsed.quantity,
          unit: parsed.unit,
        };
        setIngredients((prev) => [...prev, newIng]);
        const matchLabel = matchedProductId ? " (vinculado al catalogo)" : "";
        toast.success(`Ingrediente anadido: ${parsed.quantity} ${parsed.unit} de ${displayName}${matchLabel}`);
      } else {
        toast.info("No se detecto ingrediente. Prueba: '300 gramos de harina'");
      }
    },
    onError: (err) => toast.error(err),
  });

  function addIngredient() {
    if (!newIngName.trim() || !newIngQty.trim()) return;
    const qty = parseFloat(newIngQty.replace(",", "."));
    if (isNaN(qty) || qty <= 0) {
      toast.error("Cantidad invalida");
      return;
    }
    setIngredients((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newIngName.trim(),
        product_id: ingType === "product" ? (ingProductId ?? undefined) : undefined,
        sub_recipe_id: ingType === "sub_recipe" ? (ingSubRecipeId ?? undefined) : undefined,
        quantity: qty,
        unit: newIngUnit,
        notes: newIngNotes.trim() || undefined,
      },
    ]);
    setNewIngName("");
    setNewIngQty("");
    setNewIngUnit("g");
    setNewIngNotes("");
    setIngProductId(null);
    setIngSubRecipeId(null);
    setIngType("product");
  }

  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  }

  function addStep() {
    if (!newStepInstruction.trim()) return;
    const duration = newStepDuration ? parseInt(newStepDuration) : undefined;
    setSteps((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        instruction: newStepInstruction.trim(),
        duration_min: duration && duration > 0 ? duration : undefined,
      },
    ]);
    setNewStepInstruction("");
    setNewStepDuration("");
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: CreateRecipeInput) {
    const result = await createRecipe.mutateAsync(data);
    const recipeId = result?.recipe_id;

    if (recipeId && hotelId) {
      // Save ingredients
      for (const ing of ingredients) {
        try {
          await recipeService.addIngredient(hotelId, recipeId, {
            product_id: ing.product_id,
            sub_recipe_id: ing.sub_recipe_id,
            unit_id: undefined,
            quantity: ing.quantity,
            notes: ing.notes,
          });
        } catch (err) {
          console.error("Error saving ingredient:", err);
        }
      }

      // Save steps
      for (const [i, step] of steps.entries()) {
        try {
          await recipeService.addStep(hotelId, recipeId, {
            step_number: i + 1,
            instruction: step.instruction,
            duration_min: step.duration_min,
          });
        } catch (err) {
          console.error("Error saving step:", err);
        }
      }
    }

    toast.success(`Receta "${data.name}" creada con ${ingredients.length} ingredientes y ${steps.length} pasos`);
    if (recipeId) {
      router.push(`/recipes/${recipeId}`);
    } else {
      router.push("/recipes");
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/recipes">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-card">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-0.5">
            RECETARIO
          </p>
          <h1 className="text-2xl font-bold text-foreground">{isSubFromUrl ? "Nueva sub-receta" : "Nueva receta"}</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="basicos">
          <TabsList className="mb-4 bg-sidebar border border-border-subtle">
            <TabsTrigger value="basicos" className="data-[state=active]:bg-card data-[state=active]:text-primary text-muted-foreground">Datos basicos</TabsTrigger>
            <TabsTrigger value="ingredientes" className="data-[state=active]:bg-card data-[state=active]:text-primary text-muted-foreground">
              Ingredientes {ingredients.length > 0 && `(${ingredients.length})`}
            </TabsTrigger>
            <TabsTrigger value="pasos" className="data-[state=active]:bg-card data-[state=active]:text-primary text-muted-foreground">
              Pasos {steps.length > 0 && `(${steps.length})`}
            </TabsTrigger>
            <TabsTrigger value="foto" className="data-[state=active]:bg-card data-[state=active]:text-primary text-muted-foreground">Foto</TabsTrigger>
          </TabsList>

          {/* -- Tab 1: Datos basicos -- */}
          <TabsContent value="basicos">
            <div className="rounded-lg bg-card p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Datos de la receta</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Informacion general de la receta</p>
              </div>

              {/* Voice panel */}
              {voice.isSupported && (
                <div className={cn(
                  "rounded-lg p-4 transition-all",
                  voice.status === "listening"
                    ? "bg-[var(--alert-critical)]/10 border border-[var(--alert-critical)]"
                    : "bg-sidebar border border-border-subtle"
                )}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium flex items-center gap-1.5 text-foreground">
                        <Mic className="h-4 w-4" />
                        Dictado por voz
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ej: <em>&quot;Risotto de setas, principal, cuatro raciones, 20 minutos de preparacion&quot;</em>
                      </p>
                      {voice.transcript && (
                        <p className={cn(
                          "mt-2 text-sm rounded px-2 py-1 italic",
                          voice.status === "listening"
                            ? "bg-[var(--alert-critical)]/10 text-[var(--alert-critical)]"
                            : "bg-sidebar text-muted-foreground"
                        )}>
                          &quot;{voice.transcript}&quot;
                        </p>
                      )}
                    </div>
                    <VoiceMicButton
                      status={voice.status}
                      isSupported={voice.isSupported}
                      onStart={voice.start}
                      onStop={voice.stop}
                      label="Dictar"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nombre de la receta</Label>
                <Input id="name" {...form.register("name")} placeholder="Risotto de setas" className="bg-sidebar border-border-subtle text-foreground placeholder:text-muted-foreground/50" />
                {form.formState.errors.name && (
                  <p className="text-[var(--alert-critical)] text-sm">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Categoria</Label>
                  <select
                    id="category"
                    {...form.register("category")}
                    className="flex h-9 w-full rounded-md bg-sidebar border border-border-subtle text-foreground px-3 py-1 text-sm"
                  >
                    <option value="">Sin categoria</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Raciones</Label>
                  <Input
                    id="servings"
                    type="number"
                    {...form.register("servings", { valueAsNumber: true })}
                    className="bg-sidebar border-border-subtle text-foreground"
                  />
                  {form.formState.errors.servings && (
                    <p className="text-[var(--alert-critical)] text-sm">{form.formState.errors.servings.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prep_time_min" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tiempo prep. (min)</Label>
                  <Input
                    id="prep_time_min"
                    type="number"
                    {...form.register("prep_time_min", { valueAsNumber: true })}
                    className="bg-sidebar border-border-subtle text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cook_time_min" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tiempo coccion (min)</Label>
                  <Input
                    id="cook_time_min"
                    type="number"
                    {...form.register("cook_time_min", { valueAsNumber: true })}
                    className="bg-sidebar border-border-subtle text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Descripcion</Label>
                <Input id="description" {...form.register("description")} placeholder="Breve descripcion de la receta" className="bg-sidebar border-border-subtle text-foreground placeholder:text-muted-foreground/50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notas</Label>
                <Input id="notes" {...form.register("notes")} placeholder="Notas adicionales" className="bg-sidebar border-border-subtle text-foreground placeholder:text-muted-foreground/50" />
              </div>

              <div className="flex items-center gap-3 pt-2 pb-1">
                <input
                  type="checkbox"
                  id="is_sub_recipe"
                  {...form.register("is_sub_recipe")}
                  className="h-4 w-4 rounded border-border-subtle accent-[#B8906F]"
                />
                <div>
                  <Label htmlFor="is_sub_recipe" className="text-sm font-medium text-foreground cursor-pointer">Es una sub-receta / base</Label>
                  <p className="text-xs text-muted-foreground">Sofrito, caldo, salsa... Se usa como ingrediente en otras recetas, no se vende directamente.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* -- Tab 2: Ingredientes -- */}
          <TabsContent value="ingredientes">
            <div className="rounded-lg bg-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Ingredientes</h2>
                  <p className="text-sm text-muted-foreground">{ingredients.length} ingredientes anadidos</p>
                </div>
                {ingredientVoice.isSupported && (
                  <VoiceMicButton
                    status={ingredientVoice.status}
                    isSupported={ingredientVoice.isSupported}
                    onStart={ingredientVoice.start}
                    onStop={ingredientVoice.stop}
                    size="sm"
                    label="Dictar"
                  />
                )}
              </div>

              {ingredientVoice.transcript && (
                <p className={cn(
                  "text-sm rounded px-2 py-1 italic",
                  ingredientVoice.status === "listening"
                    ? "bg-[var(--alert-critical)]/10 text-[var(--alert-critical)]"
                    : "bg-sidebar text-muted-foreground"
                )}>
                  &quot;{ingredientVoice.transcript}&quot;
                </p>
              )}

              {ingredients.length > 0 && (
                <div className="rounded-lg bg-sidebar overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border-subtle hover:bg-transparent">
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ingrediente</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Cantidad</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Unidad</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Notas</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Coste</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredients.map((ing) => {
                        const price = ing.product_id ? getPreferredPrice(ing.product_id) : null;
                        const cost = price != null ? (ing.quantity * price) : null;
                        return (
                          <TableRow key={ing.id} className="border-b border-card-hover hover:bg-card-hover/50">
                            <TableCell className="font-medium text-foreground">
                              <span className="flex items-center gap-1.5">
                                {ing.sub_recipe_id && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">SUB</span>
                                )}
                                {ing.name}
                                {ing.product_id && !ing.sub_recipe_id && (
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" title="Vinculado al catalogo" />
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-foreground">{ing.quantity}</TableCell>
                            <TableCell className="text-muted-foreground">{ing.unit}</TableCell>
                            <TableCell className="text-muted-foreground">{ing.notes ?? "\u2014"}</TableCell>
                            <TableCell className="text-right tabular-nums text-foreground">
                              {cost != null ? `${cost.toFixed(2)} \u20AC` : "\u2014"}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeIngredient(ing.id)}
                                className="text-muted-foreground hover:text-[var(--alert-critical)] hover:bg-[var(--alert-critical)]/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Estimated ingredient cost total */}
              {ingredients.length > 0 && (() => {
                const ingredientTotal = ingredients.reduce((sum, ing) => {
                  if (!ing.product_id) return sum;
                  const price = getPreferredPrice(ing.product_id);
                  return sum + (price ? ing.quantity * price : 0);
                }, 0);
                return ingredientTotal > 0 ? (
                  <div className="flex justify-end">
                    <p className="text-sm font-medium text-muted-foreground">
                      Coste estimado:{" "}
                      <span className="text-foreground font-semibold tabular-nums">
                        {ingredientTotal.toFixed(2)} {"\u20AC"}
                      </span>
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Add ingredient row */}
              <div className="rounded-lg bg-sidebar p-4 space-y-3 border border-border-subtle">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Anadir ingrediente</p>
                  <div className="flex gap-0.5 p-0.5 rounded-md bg-muted/30">
                    <button
                      type="button"
                      onClick={() => { setIngType("product"); setIngSubRecipeId(null); }}
                      className={cn("px-2.5 py-1 rounded text-[11px] font-medium transition-colors", ingType === "product" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                    >
                      Producto
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIngType("sub_recipe"); setIngProductId(null); }}
                      className={cn("px-2.5 py-1 rounded text-[11px] font-medium transition-colors", ingType === "sub_recipe" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                    >
                      Sub-receta
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2">
                    {ingType === "product" ? (
                      <ProductCombobox
                        value={ingProductId}
                        onSelect={(p) => {
                          setIngProductId(p?.id ?? null);
                          setNewIngName(p?.name ?? "");
                          if (p?.unit) setNewIngUnit(p.unit);
                        }}
                        placeholder="Buscar producto del catalogo..."
                      />
                    ) : (
                      <div className="space-y-1.5">
                        <RecipeCombobox
                          value={ingSubRecipeId}
                          onSelect={(r) => {
                            setIngSubRecipeId(r?.id ?? null);
                            setNewIngName(r?.name ?? "");
                          }}
                          placeholder="Buscar sub-receta..."
                        />
                        <CreateSubRecipeLink />
                      </div>
                    )}
                  </div>
                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      value={newIngQty}
                      onChange={(e) => setNewIngQty(e.target.value)}
                      placeholder="Cantidad"
                      className="bg-background border-border-subtle text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div>
                    <select
                      value={newIngUnit}
                      onChange={(e) => setNewIngUnit(e.target.value)}
                      className="flex h-9 w-full rounded-md bg-background border border-border-subtle text-foreground px-3 py-1 text-sm"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Input
                    value={newIngNotes}
                    onChange={(e) => setNewIngNotes(e.target.value)}
                    placeholder="Notas (opcional)"
                    className="flex-1 bg-background border-border-subtle text-foreground placeholder:text-muted-foreground/50"
                  />
                  <Button type="button" variant="outline" onClick={addIngredient} className="border-border-subtle bg-transparent text-foreground hover:bg-card-hover">
                    <Plus className="mr-1 h-4 w-4" />
                    Anadir
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* -- Tab 3: Pasos -- */}
          <TabsContent value="pasos">
            <div className="rounded-lg bg-card p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pasos de preparacion</h2>
                <p className="text-sm text-muted-foreground">{steps.length} pasos anadidos</p>
              </div>

              {steps.length > 0 && (
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-3 rounded-lg bg-sidebar p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-medium">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{step.instruction}</p>
                        {step.duration_min && (
                          <p className="text-muted-foreground mt-1 text-xs">{step.duration_min} min</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        className="text-muted-foreground hover:text-[var(--alert-critical)] hover:bg-[var(--alert-critical)]/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add step */}
              <div className="rounded-lg bg-sidebar p-4 space-y-3 border border-border-subtle">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Anadir paso</p>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md bg-background border border-border-subtle text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none"
                  value={newStepInstruction}
                  onChange={(e) => setNewStepInstruction(e.target.value)}
                  placeholder="Describe el paso de preparacion..."
                />
                <div className="flex gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Duracion (min)</Label>
                    <Input
                      type="number"
                      value={newStepDuration}
                      onChange={(e) => setNewStepDuration(e.target.value)}
                      placeholder="Opcional"
                      className="w-32 bg-background border-border-subtle text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={addStep} className="border-border-subtle bg-transparent text-foreground hover:bg-card-hover">
                    <Plus className="mr-1 h-4 w-4" />
                    Anadir paso
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* -- Tab 4: Foto -- */}
          <TabsContent value="foto">
            <div className="rounded-lg bg-card p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Foto de la receta</h2>
                <p className="text-sm text-muted-foreground">Sube una foto del plato terminado</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Imagen</Label>
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="bg-sidebar border-border-subtle text-foreground"
                />
              </div>

              {photoUrl ? (
                <div className="rounded-lg bg-sidebar overflow-hidden">
                  <Image
                    src={photoUrl}
                    alt="Vista previa"
                    width={1024}
                    height={512}
                    unoptimized
                    className="max-h-64 w-full object-contain bg-background"
                  />
                  <div className="p-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoUrl(null)}
                      className="text-muted-foreground hover:text-[var(--alert-critical)] hover:bg-[var(--alert-critical)]/10"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Eliminar foto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border-subtle p-12 text-center bg-sidebar">
                  <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sin foto seleccionada
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Submit button (outside tabs) */}
        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={createRecipe.isPending} className="bg-primary hover:bg-primary/90 text-white border-0">
            {createRecipe.isPending ? "Creando..." : "Crear receta"}
          </Button>
          <Link href="/recipes">
            <Button type="button" variant="outline" className="border-border-subtle bg-transparent text-foreground hover:bg-card">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
