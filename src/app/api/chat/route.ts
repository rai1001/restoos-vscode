import { NextRequest, NextResponse } from "next/server"
import { processMessage } from "@/features/assistant/services/assistant.service"
import { requireAuth } from "@/lib/api/require-auth"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const body = await request.json()
    const message = body?.message

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "El campo 'message' es obligatorio" },
        { status: 400 },
      )
    }

    const response = await processMessage(message)

    return NextResponse.json(response)
  } catch (err) {
    // Loguear internamente pero no exponer detalles al cliente
    console.error("[chat/route] Error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
