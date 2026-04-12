import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"
import { checkRateLimit } from "@/lib/api/rate-limit"

interface OCRRecipeResult {
  name: string
  category: string | null
  servings: number | null
  ingredients: Array<{
    name: string
    quantity: number
    unit: string
  }>
  steps: Array<{
    instruction: string
    duration_min: number | null
  }>
}

// Mock OCR result for when API key is not set
function mockOCRResult(): OCRRecipeResult {
  return {
    name: "Risotto de setas silvestres",
    category: "principal",
    servings: 4,
    ingredients: [
      { name: "Arroz arborio", quantity: 320, unit: "g" },
      { name: "Setas variadas", quantity: 250, unit: "g" },
      { name: "Caldo de verduras", quantity: 1, unit: "L" },
      { name: "Cebolla", quantity: 1, unit: "ud" },
      { name: "Vino blanco", quantity: 100, unit: "ml" },
      { name: "Parmesano", quantity: 80, unit: "g" },
      { name: "Mantequilla", quantity: 40, unit: "g" },
      { name: "Aceite de oliva", quantity: 30, unit: "ml" },
    ],
    steps: [
      { instruction: "Saltear la cebolla picada en aceite de oliva hasta que esté transparente", duration_min: 5 },
      { instruction: "Añadir el arroz y tostar 2 minutos removiendo constantemente", duration_min: 2 },
      { instruction: "Desglasar con vino blanco y dejar evaporar", duration_min: 3 },
      { instruction: "Añadir caldo caliente poco a poco, removiendo, hasta que el arroz esté al dente", duration_min: 18 },
      { instruction: "Saltear las setas aparte con ajo y añadirlas al risotto", duration_min: 5 },
      { instruction: "Incorporar mantequilla y parmesano rallado fuera del fuego", duration_min: 2 },
    ],
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const limited = await checkRateLimit(auth.user.id, "ai")
    if (limited) return limited

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validar tipo y tamaño de archivo (max 10MB, solo imágenes y PDF)
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo no puede superar 10MB" }, { status: 400 })
    }

    const apiKey = process.env.MISTRAL_API_KEY

    if (!apiKey || apiKey === "your_mistral_api_key") {
      return NextResponse.json(
        { error: "OCR no configurado. Falta MISTRAL_API_KEY en el servidor.", mock: true },
        { status: 503 }
      )
    }

    // Real Mistral Vision call
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")
    const mimeType = file.type || "image/jpeg"

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "pixtral-12b-2409",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
              {
                type: "text",
                text: `Analiza esta imagen de receta y extrae la información en formato JSON con esta estructura exacta:
{
  "name": "nombre de la receta",
  "category": "entrante|principal|postre|guarnición|salsa|pan|bebida|snack|otro",
  "servings": número_de_raciones,
  "ingredients": [
    { "name": "ingrediente", "quantity": número, "unit": "kg/g/L/ml/ud" }
  ],
  "steps": [
    { "instruction": "paso de preparación", "duration_min": minutos_o_null }
  ]
}
Responde SOLO con el JSON, sin markdown ni explicaciones.`,
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ result: mockOCRResult(), mock: true })
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content ?? ""

    const result = JSON.parse(content) as OCRRecipeResult
    return NextResponse.json({ result, mock: false })
  } catch {
    return NextResponse.json({ result: mockOCRResult(), mock: true })
  }
}
