import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"

interface OCRResult {
  supplier_name: string | null
  delivery_date: string | null
  invoice_number: string | null
  items: Array<{
    description: string
    quantity: number
    unit: string
    unit_price: number
    total: number
  }>
  total_amount: number | null
  notes: string | null
}

// Mock OCR result for when API key is not set
function mockOCRResult(): OCRResult {
  return {
    supplier_name: "Carnes Premium García S.L.",
    delivery_date: new Date().toISOString().slice(0, 10),
    invoice_number: `ALB-${Math.floor(Math.random() * 9000) + 1000}`,
    items: [
      { description: "Lomo de ternera", quantity: 10, unit: "kg", unit_price: 18.50, total: 185.00 },
      { description: "Entrecot de buey", quantity: 5, unit: "kg", unit_price: 32.00, total: 160.00 },
      { description: "Costillas de cerdo", quantity: 8, unit: "kg", unit_price: 9.80, total: 78.40 },
    ],
    total_amount: 423.40,
    notes: "Temperatura de recepción: 2°C ✓",
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

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

    // If no API key, return mock result
    if (!apiKey || apiKey === "your_mistral_api_key") {
      await new Promise(r => setTimeout(r, 1500)) // simulate processing
      return NextResponse.json({ result: mockOCRResult(), mock: true })
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
                text: `Analiza este albarán de entrega y extrae la información en formato JSON con esta estructura exacta:
{
  "supplier_name": "nombre del proveedor",
  "delivery_date": "YYYY-MM-DD",
  "invoice_number": "número de albarán",
  "items": [
    { "description": "producto", "quantity": número, "unit": "kg/L/ud", "unit_price": precio, "total": total }
  ],
  "total_amount": total_factura,
  "notes": "observaciones"
}
Responde SOLO con el JSON, sin markdown ni explicaciones.`,
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ result: mockOCRResult(), mock: true })
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content ?? ""

    const result = JSON.parse(content) as OCRResult
    return NextResponse.json({ result, mock: false })
  } catch {
    return NextResponse.json({ result: mockOCRResult(), mock: true })
  }
}
