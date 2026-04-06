"use client"

import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCreateRecipe } from "@/features/recipes/hooks/use-recipes"
import { parseImportFile } from "@/lib/excel-parser"
import { parseRecipeVoice } from "@/lib/voice-parser"
import { useVoiceInput } from "@/hooks/use-voice-input"
import { VoiceMicButton } from "@/components/voice-mic-button"
import type { OCRRecipeResult } from "@/features/recipes/schemas/recipe-form.schema"
import type { CreateRecipeInput } from "@/features/recipes/schemas/recipe.schema"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ProductCombobox } from "@/components/product-combobox"
import { matchIngredientsToProducts } from "@/lib/product-matcher"
import { MOCK_PRODUCTS } from "@/lib/mock-data"
import { FileSpreadsheet, Camera, Mic, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ImportRecipeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportRecipeModal({ open, onOpenChange }: ImportRecipeModalProps) {
  const router = useRouter()
  const createRecipe = useCreateRecipe()

  // Excel/CSV state
  const [excelIngredients, setExcelIngredients] = useState<Array<{ name: string; quantity: number; unit: string }>>([])
  const [excelName, setExcelName] = useState("")
  const [excelLoading, setExcelLoading] = useState(false)

  // OCR state
  const [ocrResult, setOcrResult] = useState<OCRRecipeResult | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null)

  // Voice state
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const [voiceParsed, setVoiceParsed] = useState<{ name?: string; category?: string; servings?: number } | null>(null)

  const voice = useVoiceInput({
    lang: "es-ES",
    continuous: true,
    onResult: (transcript) => {
      setVoiceTranscript((prev) => (prev ? prev + " " + transcript : transcript))
    },
    onError: (err) => toast.error(err),
  })

  // ── Product matching state ──
  const [matchedIngredients, setMatchedIngredients] = useState<Array<{
    original_name: string
    product_id: string | null
    product_name: string | null
    confidence: number
    quantity: number
    unit: string
  }>>([])
  const [showMatching, setShowMatching] = useState(false)

  function runMatching(ingredients: Array<{ name: string; quantity: number; unit: string }>) {
    const products = MOCK_PRODUCTS.map(p => ({ id: p.id, name: p.name }))
    const results = matchIngredientsToProducts(
      ingredients.map(i => i.name),
      products
    )

    const matched = ingredients.map(ing => {
      const matches = results.get(ing.name) ?? []
      const best = matches.length > 0 ? matches[0] : undefined
      return {
        original_name: ing.name,
        product_id: best && best.confidence >= 0.5 ? best.product_id : null,
        product_name: best && best.confidence >= 0.5 ? best.product_name : null,
        confidence: best?.confidence ?? 0,
        quantity: ing.quantity,
        unit: ing.unit,
      }
    })

    setMatchedIngredients(matched)
    setShowMatching(true)
  }

  // ── Excel/CSV handlers ──
  async function handleExcelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setExcelLoading(true)
    try {
      const result = await parseImportFile(file)
      setExcelIngredients(result.ingredients)
      if (result.name) setExcelName(result.name)
      if (result.ingredients.length === 0) {
        toast.info("No se encontraron ingredientes en el archivo")
      } else {
        toast.success(`${result.ingredients.length} ingredientes encontrados`)
        runMatching(result.ingredients)
      }
    } catch {
      toast.error("Error al leer el archivo")
    } finally {
      setExcelLoading(false)
    }
  }

  async function handleCreateFromExcel() {
    if (!excelName.trim()) {
      toast.error("Introduce un nombre para la receta")
      return
    }
    const linkedCount = matchedIngredients.filter(m => m.product_id).length
    const input: CreateRecipeInput = {
      name: excelName,
      servings: 4,
      is_sub_recipe: false,
      description: `Importada con ${excelIngredients.length} ingredientes (${linkedCount} vinculados al catálogo)`,
    }
    const result = await createRecipe.mutateAsync(input)
    onOpenChange(false)
    if (result?.recipe_id) {
      router.push(`/recipes/${result.recipe_id}`)
    } else {
      router.push("/recipes")
    }
  }

  // ── OCR handlers ──
  async function handleOCRFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (ev) => setOcrPreviewUrl(ev.target?.result as string)
    reader.readAsDataURL(file)

    setOcrLoading(true)
    setOcrResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/ocr-recipe", { method: "POST", body: formData })
      const data = await res.json()
      if (data.result) {
        const ocrData = data.result as OCRRecipeResult
        setOcrResult(ocrData)
        toast.success(data.mock ? "Receta analizada (datos de ejemplo)" : "Receta analizada correctamente")
        if (ocrData.ingredients.length > 0) {
          runMatching(ocrData.ingredients)
        }
      } else {
        toast.error("No se pudo analizar la imagen")
      }
    } catch {
      toast.error("Error al procesar la imagen")
    } finally {
      setOcrLoading(false)
    }
  }

  async function handleCreateFromOCR() {
    if (!ocrResult) return
    const linkedCount = matchedIngredients.filter(m => m.product_id).length
    const input: CreateRecipeInput = {
      name: ocrResult.name,
      category: ocrResult.category ?? undefined,
      servings: ocrResult.servings ?? 4,
      is_sub_recipe: false,
      description: `${ocrResult.ingredients.length} ingredientes (${linkedCount} vinculados), ${ocrResult.steps.length} pasos`,
    }
    const result = await createRecipe.mutateAsync(input)
    onOpenChange(false)
    if (result?.recipe_id) {
      router.push(`/recipes/${result.recipe_id}`)
    } else {
      router.push("/recipes")
    }
  }

  // ── Voice handlers ──
  function handleAnalyzeVoice() {
    if (!voiceTranscript.trim()) {
      toast.info("Dicta la receta primero")
      return
    }
    const parsed = parseRecipeVoice(voiceTranscript)
    setVoiceParsed(parsed)
    const fields: string[] = []
    if (parsed.name) fields.push("nombre")
    if (parsed.category) fields.push("categoría")
    if (parsed.servings) fields.push("raciones")
    if (fields.length > 0) {
      toast.success(`Detectado: ${fields.join(", ")}`)
    } else {
      toast.info("No se detectaron campos. Prueba con: 'Risotto de setas, principal, 4 raciones'")
    }
  }

  async function handleCreateFromVoice() {
    if (!voiceParsed?.name) {
      toast.error("No se detectó un nombre de receta")
      return
    }
    const input: CreateRecipeInput = {
      name: voiceParsed.name,
      category: voiceParsed.category ?? undefined,
      servings: voiceParsed.servings ?? 4,
      is_sub_recipe: false,
    }
    const result = await createRecipe.mutateAsync(input)
    onOpenChange(false)
    if (result?.recipe_id) {
      router.push(`/recipes/${result.recipe_id}`)
    } else {
      router.push("/recipes")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar receta</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="excel">
          <TabsList className="mb-4">
            <TabsTrigger value="excel">
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Excel/CSV
            </TabsTrigger>
            <TabsTrigger value="ocr">
              <Camera className="mr-1.5 h-4 w-4" />
              Imagen/OCR
            </TabsTrigger>
            <TabsTrigger value="voice">
              <Mic className="mr-1.5 h-4 w-4" />
              Voz
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Excel/CSV ── */}
          <TabsContent value="excel">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Archivo Excel o CSV</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  onChange={handleExcelFile}
                  disabled={excelLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Columnas esperadas: Ingrediente, Cantidad, Unidad
                </p>
              </div>

              {excelLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Leyendo archivo...
                </div>
              )}

              {excelIngredients.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Nombre de la receta</Label>
                    <Input
                      value={excelName}
                      onChange={(e) => setExcelName(e.target.value)}
                      placeholder="Nombre de la receta"
                    />
                  </div>

                  <div className="rounded-md border max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingrediente</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead>Unidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {excelIngredients.map((ing, i) => (
                          <TableRow key={i}>
                            <TableCell>{ing.name}</TableCell>
                            <TableCell className="text-right">{ing.quantity}</TableCell>
                            <TableCell>{ing.unit}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {showMatching && matchedIngredients.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Vinculación con catálogo</p>
                      <div className="rounded-md border max-h-60 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ingrediente</TableHead>
                              <TableHead>Producto catálogo</TableHead>
                              <TableHead className="text-center">Confianza</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {matchedIngredients.map((ing, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-muted-foreground">{ing.original_name}</TableCell>
                                <TableCell>
                                  {ing.product_id ? (
                                    <span className="flex items-center gap-1">
                                      <span className="text-[var(--alert-ok)]">&#10003;</span>
                                      {ing.product_name}
                                    </span>
                                  ) : (
                                    <ProductCombobox
                                      value={null}
                                      onSelect={(p) => {
                                        const updated = [...matchedIngredients]
                                        const prev = updated[i]!; updated[i] = { original_name: prev.original_name, quantity: prev.quantity, unit: prev.unit, product_id: p?.id ?? null, product_name: p?.name ?? null, confidence: p ? 1 : 0 }
                                        setMatchedIngredients(updated)
                                      }}
                                      placeholder="Buscar..."
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {ing.confidence > 0 ? (
                                    <Badge variant={ing.confidence >= 0.7 ? "default" : "secondary"}>
                                      {Math.round(ing.confidence * 100)}%
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">Sin match</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{ing.quantity} {ing.unit}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCreateFromExcel}
                    disabled={createRecipe.isPending}
                    className="w-full"
                  >
                    {createRecipe.isPending ? "Creando..." : "Crear receta"}
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── Tab: OCR ── */}
          <TabsContent value="ocr">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Imagen de la receta</Label>
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleOCRFile}
                  disabled={ocrLoading}
                />
              </div>

              {ocrPreviewUrl && (
                <div className="rounded-md border overflow-hidden">
                  <Image
                    src={ocrPreviewUrl}
                    alt="Vista previa"
                    width={960}
                    height={320}
                    unoptimized
                    className="max-h-40 w-full object-contain bg-muted"
                  />
                </div>
              )}

              {ocrLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando imagen...
                </div>
              )}

              {ocrResult && (
                <>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nombre</Label>
                      <p className="font-medium">{ocrResult.name}</p>
                    </div>
                    {ocrResult.category && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Categoría</Label>
                        <p className="text-sm capitalize">{ocrResult.category}</p>
                      </div>
                    )}
                  </div>

                  {ocrResult.ingredients.length > 0 && (
                    <div className="rounded-md border max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ingrediente</TableHead>
                            <TableHead className="text-right">Cantidad</TableHead>
                            <TableHead>Unidad</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ocrResult.ingredients.map((ing, i) => (
                            <TableRow key={i}>
                              <TableCell>{ing.name}</TableCell>
                              <TableCell className="text-right">{ing.quantity}</TableCell>
                              <TableCell>{ing.unit}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {ocrResult.steps.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Pasos ({ocrResult.steps.length})</Label>
                      <div className="max-h-40 overflow-y-auto space-y-1.5">
                        {ocrResult.steps.map((step, i) => (
                          <div key={i} className="flex gap-2 text-sm rounded-md border p-2">
                            <span className="bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p>{step.instruction}</p>
                              {step.duration_min && (
                                <p className="text-xs text-muted-foreground">{step.duration_min} min</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showMatching && matchedIngredients.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Vinculación con catálogo</p>
                      <div className="rounded-md border max-h-60 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ingrediente</TableHead>
                              <TableHead>Producto catálogo</TableHead>
                              <TableHead className="text-center">Confianza</TableHead>
                              <TableHead className="text-right">Cantidad</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {matchedIngredients.map((ing, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-muted-foreground">{ing.original_name}</TableCell>
                                <TableCell>
                                  {ing.product_id ? (
                                    <span className="flex items-center gap-1">
                                      <span className="text-[var(--alert-ok)]">&#10003;</span>
                                      {ing.product_name}
                                    </span>
                                  ) : (
                                    <ProductCombobox
                                      value={null}
                                      onSelect={(p) => {
                                        const updated = [...matchedIngredients]
                                        const prev = updated[i]!; updated[i] = { original_name: prev.original_name, quantity: prev.quantity, unit: prev.unit, product_id: p?.id ?? null, product_name: p?.name ?? null, confidence: p ? 1 : 0 }
                                        setMatchedIngredients(updated)
                                      }}
                                      placeholder="Buscar..."
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {ing.confidence > 0 ? (
                                    <Badge variant={ing.confidence >= 0.7 ? "default" : "secondary"}>
                                      {Math.round(ing.confidence * 100)}%
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">Sin match</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{ing.quantity} {ing.unit}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCreateFromOCR}
                    disabled={createRecipe.isPending}
                    className="w-full"
                  >
                    {createRecipe.isPending ? "Creando..." : "Crear receta"}
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── Tab: Voice ── */}
          <TabsContent value="voice">
            <div className="space-y-4">
              <div className={cn(
                "rounded-lg border-2 p-4 transition-all",
                voice.status === "listening"
                  ? "border-[var(--alert-critical)] bg-[var(--alert-critical)]/10 dark:bg-[var(--alert-critical)]/10"
                  : "border-dashed border-border bg-muted/30"
              )}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Dictado por voz</p>
                    <p className="text-xs text-muted-foreground">
                      Ej: &quot;Risotto de setas, principal, cuatro raciones, 20 minutos de preparación&quot;
                    </p>
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

              <div className="space-y-2">
                <Label>Transcripción</Label>
                <textarea
                  className="border-input bg-background flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="El texto dictado aparecerá aquí..."
                />
              </div>

              <Button variant="outline" onClick={handleAnalyzeVoice} className="w-full">
                Analizar
              </Button>

              {voiceParsed && (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">Resultado del análisis:</p>
                  {voiceParsed.name && (
                    <p className="text-sm"><span className="text-muted-foreground">Nombre:</span> {voiceParsed.name}</p>
                  )}
                  {voiceParsed.category && (
                    <p className="text-sm"><span className="text-muted-foreground">Categoría:</span> {voiceParsed.category}</p>
                  )}
                  {voiceParsed.servings && (
                    <p className="text-sm"><span className="text-muted-foreground">Raciones:</span> {voiceParsed.servings}</p>
                  )}

                  <Button
                    onClick={handleCreateFromVoice}
                    disabled={createRecipe.isPending || !voiceParsed.name}
                    className="w-full mt-2"
                  >
                    {createRecipe.isPending ? "Creando..." : "Crear receta"}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
