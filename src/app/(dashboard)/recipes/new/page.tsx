"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateRecipe } from "@/features/recipes/hooks/use-recipes";
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
import { matchIngredientToProduct } from "@/lib/product-matcher";
import { MOCK_PRODUCTS, getPreferredPrice } from "@/lib/mock-data";

const CATEGORIES = [
  "entrante", "principal", "postre", "guarnicion", "salsa",
  "pan", "bebida", "snack", "otro",
];

const UNITS = ["kg", "g", "L", "ml", "ud", "manojo", "diente", "cucharada", "cucharadita"];

export default function NewRecipePage() {
  const router = useRouter();
  const createRecipe = useCreateRecipe();

  const form = useForm<CreateRecipeInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(CreateRecipeSchema) as any,
    defaultValues: { servings: 4 },
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
  const [ingProductId, setIngProductId] = useState<string | null>(null);

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
          MOCK_PRODUCTS.map((p) => ({ id: p.id, name: p.name }))
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
        product_id: ingProductId ?? undefined,
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
    toast.success(`Receta "${data.name}" creada con ${ingredients.length} ingredientes y ${steps.length} pasos`);
    if (result?.recipe_id) {
      router.push(`/recipes/${result.recipe_id}`);
    } else {
      router.push("/recipes");
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/recipes">
          <Button variant="ghost" size="sm" className="text-[#A78B7D] hover:text-[#E5E2E1] hover:bg-[#1A1A1A]">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316] mb-0.5">
            RECETARIO
          </p>
          <h1 className="text-2xl font-bold text-[#E5E2E1]">Nueva receta</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="basicos">
          <TabsList className="mb-4 bg-[#111] border border-[#333]">
            <TabsTrigger value="basicos" className="data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-[#F97316] text-[#A78B7D]">Datos basicos</TabsTrigger>
            <TabsTrigger value="ingredientes" className="data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-[#F97316] text-[#A78B7D]">
              Ingredientes {ingredients.length > 0 && `(${ingredients.length})`}
            </TabsTrigger>
            <TabsTrigger value="pasos" className="data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-[#F97316] text-[#A78B7D]">
              Pasos {steps.length > 0 && `(${steps.length})`}
            </TabsTrigger>
            <TabsTrigger value="foto" className="data-[state=active]:bg-[#1A1A1A] data-[state=active]:text-[#F97316] text-[#A78B7D]">Foto</TabsTrigger>
          </TabsList>

          {/* -- Tab 1: Datos basicos -- */}
          <TabsContent value="basicos">
            <div className="rounded-lg bg-[#1A1A1A] p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#E5E2E1]">Datos de la receta</h2>
                <p className="text-sm text-[#A78B7D] mt-0.5">Informacion general de la receta</p>
              </div>

              {/* Voice panel */}
              {voice.isSupported && (
                <div className={cn(
                  "rounded-lg p-4 transition-all",
                  voice.status === "listening"
                    ? "bg-red-500/10 border border-red-500/30"
                    : "bg-[#111] border border-[#333]"
                )}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium flex items-center gap-1.5 text-[#E5E2E1]">
                        <Mic className="h-4 w-4" />
                        Dictado por voz
                      </p>
                      <p className="text-xs text-[#A78B7D] mt-0.5">
                        Ej: <em>&quot;Risotto de setas, principal, cuatro raciones, 20 minutos de preparacion&quot;</em>
                      </p>
                      {voice.transcript && (
                        <p className={cn(
                          "mt-2 text-sm rounded px-2 py-1 italic",
                          voice.status === "listening"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-[#111] text-[#A78B7D]"
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
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Nombre de la receta</Label>
                <Input id="name" {...form.register("name")} placeholder="Risotto de setas" className="bg-[#111] border-[#333] text-[#E5E2E1] placeholder:text-[#A78B7D]/50" />
                {form.formState.errors.name && (
                  <p className="text-red-400 text-sm">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Categoria</Label>
                  <select
                    id="category"
                    {...form.register("category")}
                    className="flex h-9 w-full rounded-md bg-[#111] border border-[#333] text-[#E5E2E1] px-3 py-1 text-sm"
                  >
                    <option value="">Sin categoria</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Raciones</Label>
                  <Input
                    id="servings"
                    type="number"
                    {...form.register("servings", { valueAsNumber: true })}
                    className="bg-[#111] border-[#333] text-[#E5E2E1]"
                  />
                  {form.formState.errors.servings && (
                    <p className="text-red-400 text-sm">{form.formState.errors.servings.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prep_time_min" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Tiempo prep. (min)</Label>
                  <Input
                    id="prep_time_min"
                    type="number"
                    {...form.register("prep_time_min", { valueAsNumber: true })}
                    className="bg-[#111] border-[#333] text-[#E5E2E1]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cook_time_min" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Tiempo coccion (min)</Label>
                  <Input
                    id="cook_time_min"
                    type="number"
                    {...form.register("cook_time_min", { valueAsNumber: true })}
                    className="bg-[#111] border-[#333] text-[#E5E2E1]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Descripcion</Label>
                <Input id="description" {...form.register("description")} placeholder="Breve descripcion de la receta" className="bg-[#111] border-[#333] text-[#E5E2E1] placeholder:text-[#A78B7D]/50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Notas</Label>
                <Input id="notes" {...form.register("notes")} placeholder="Notas adicionales" className="bg-[#111] border-[#333] text-[#E5E2E1] placeholder:text-[#A78B7D]/50" />
              </div>
            </div>
          </TabsContent>

          {/* -- Tab 2: Ingredientes -- */}
          <TabsContent value="ingredientes">
            <div className="rounded-lg bg-[#1A1A1A] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#E5E2E1]">Ingredientes</h2>
                  <p className="text-sm text-[#A78B7D]">{ingredients.length} ingredientes anadidos</p>
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
                    ? "bg-red-500/10 text-red-400"
                    : "bg-[#111] text-[#A78B7D]"
                )}>
                  &quot;{ingredientVoice.transcript}&quot;
                </p>
              )}

              {ingredients.length > 0 && (
                <div className="rounded-lg bg-[#111] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#333] hover:bg-transparent">
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Ingrediente</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D] text-right">Cantidad</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Unidad</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Notas</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D] text-right">Coste</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredients.map((ing) => {
                        const price = ing.product_id ? getPreferredPrice(ing.product_id) : null;
                        const cost = price != null ? (ing.quantity * price) : null;
                        return (
                          <TableRow key={ing.id} className="border-b border-[#222] hover:bg-[#222]/50">
                            <TableCell className="font-medium text-[#E5E2E1]">
                              {ing.name}
                              {ing.product_id && (
                                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" title="Vinculado al catalogo" />
                              )}
                            </TableCell>
                            <TableCell className="text-right text-[#E5E2E1]">{ing.quantity}</TableCell>
                            <TableCell className="text-[#A78B7D]">{ing.unit}</TableCell>
                            <TableCell className="text-[#A78B7D]">{ing.notes ?? "\u2014"}</TableCell>
                            <TableCell className="text-right tabular-nums text-[#E5E2E1]">
                              {cost != null ? `${cost.toFixed(2)} \u20AC` : "\u2014"}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeIngredient(ing.id)}
                                className="text-[#A78B7D] hover:text-red-400 hover:bg-red-500/10"
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
                    <p className="text-sm font-medium text-[#A78B7D]">
                      Coste estimado:{" "}
                      <span className="text-[#E5E2E1] font-semibold tabular-nums">
                        {ingredientTotal.toFixed(2)} {"\u20AC"}
                      </span>
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Add ingredient row */}
              <div className="rounded-lg bg-[#111] p-4 space-y-3 border border-[#333]">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Anadir ingrediente</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="col-span-2 sm:col-span-1">
                    <ProductCombobox
                      value={ingProductId}
                      onSelect={(p) => {
                        setIngProductId(p?.id ?? null);
                        setNewIngName(p?.name ?? "");
                        if (p?.unit) setNewIngUnit(p.unit);
                      }}
                      placeholder="Buscar producto del catalogo..."
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      value={newIngQty}
                      onChange={(e) => setNewIngQty(e.target.value)}
                      placeholder="Cantidad"
                      className="bg-[#0A0A0A] border-[#333] text-[#E5E2E1] placeholder:text-[#A78B7D]/50"
                    />
                  </div>
                  <div>
                    <select
                      value={newIngUnit}
                      onChange={(e) => setNewIngUnit(e.target.value)}
                      className="flex h-9 w-full rounded-md bg-[#0A0A0A] border border-[#333] text-[#E5E2E1] px-3 py-1 text-sm"
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
                    className="flex-1 bg-[#0A0A0A] border-[#333] text-[#E5E2E1] placeholder:text-[#A78B7D]/50"
                  />
                  <Button type="button" variant="outline" onClick={addIngredient} className="border-[#333] bg-transparent text-[#E5E2E1] hover:bg-[#222]">
                    <Plus className="mr-1 h-4 w-4" />
                    Anadir
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* -- Tab 3: Pasos -- */}
          <TabsContent value="pasos">
            <div className="rounded-lg bg-[#1A1A1A] p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#E5E2E1]">Pasos de preparacion</h2>
                <p className="text-sm text-[#A78B7D]">{steps.length} pasos anadidos</p>
              </div>

              {steps.length > 0 && (
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-3 rounded-lg bg-[#111] p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-white text-xs font-medium">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-[#E5E2E1]">{step.instruction}</p>
                        {step.duration_min && (
                          <p className="text-[#A78B7D] mt-1 text-xs">{step.duration_min} min</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        className="text-[#A78B7D] hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add step */}
              <div className="rounded-lg bg-[#111] p-4 space-y-3 border border-[#333]">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Anadir paso</p>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md bg-[#0A0A0A] border border-[#333] text-[#E5E2E1] px-3 py-2 text-sm placeholder:text-[#A78B7D]/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F97316] resize-none"
                  value={newStepInstruction}
                  onChange={(e) => setNewStepInstruction(e.target.value)}
                  placeholder="Describe el paso de preparacion..."
                />
                <div className="flex gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-widest text-[#A78B7D]">Duracion (min)</Label>
                    <Input
                      type="number"
                      value={newStepDuration}
                      onChange={(e) => setNewStepDuration(e.target.value)}
                      placeholder="Opcional"
                      className="w-32 bg-[#0A0A0A] border-[#333] text-[#E5E2E1] placeholder:text-[#A78B7D]/50"
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={addStep} className="border-[#333] bg-transparent text-[#E5E2E1] hover:bg-[#222]">
                    <Plus className="mr-1 h-4 w-4" />
                    Anadir paso
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* -- Tab 4: Foto -- */}
          <TabsContent value="foto">
            <div className="rounded-lg bg-[#1A1A1A] p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-[#E5E2E1]">Foto de la receta</h2>
                <p className="text-sm text-[#A78B7D]">Sube una foto del plato terminado</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-[#A78B7D]">Imagen</Label>
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="bg-[#111] border-[#333] text-[#E5E2E1]"
                />
              </div>

              {photoUrl ? (
                <div className="rounded-lg bg-[#111] overflow-hidden">
                  <Image
                    src={photoUrl}
                    alt="Vista previa"
                    width={1024}
                    height={512}
                    unoptimized
                    className="max-h-64 w-full object-contain bg-[#0A0A0A]"
                  />
                  <div className="p-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoUrl(null)}
                      className="text-[#A78B7D] hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Eliminar foto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#333] p-12 text-center bg-[#111]">
                  <ImageIcon className="mx-auto h-10 w-10 text-[#A78B7D]/50" />
                  <p className="mt-2 text-sm text-[#A78B7D]">
                    Sin foto seleccionada
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Submit button (outside tabs) */}
        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={createRecipe.isPending} className="bg-[#F97316] hover:bg-[#EA680C] text-white border-0">
            {createRecipe.isPending ? "Creando..." : "Crear receta"}
          </Button>
          <Link href="/recipes">
            <Button type="button" variant="outline" className="border-[#333] bg-transparent text-[#E5E2E1] hover:bg-[#1A1A1A]">Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
