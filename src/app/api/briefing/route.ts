import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api/require-auth"

interface BriefingData {
  date: string
  events_today: number
  events_week: number
  pending_tasks: number
  blocked_tasks: number
  expiring_lots: number
  low_stock_items: number
  food_cost_week: number
}

function generateMockBriefing(data: BriefingData): string {
  return `**Briefing de cocina — ${new Date(data.date).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}**

**Eventos:** Hoy tienes ${data.events_today} evento${data.events_today !== 1 ? "s" : ""} activo${data.events_today !== 1 ? "s" : ""}. Esta semana se celebrarán ${data.events_week} en total.

**Producción:** Hay ${data.pending_tasks} tareas pendientes${data.blocked_tasks > 0 ? ` y ${data.blocked_tasks} bloqueadas que requieren atención inmediata` : ""}. Prioriza la preparación de mise en place con al menos 2 horas de antelación.

**Inventario:** ${data.expiring_lots > 0 ? `⚠️ ${data.expiring_lots} lote${data.expiring_lots !== 1 ? "s" : ""} próximos a caducar — revisar y usar hoy.` : "✅ Sin lotes próximos a caducar."} ${data.low_stock_items > 0 ? `${data.low_stock_items} producto${data.low_stock_items !== 1 ? "s" : ""} con stock bajo.` : ""}

**Food cost:** El food cost de esta semana está en **${data.food_cost_week.toFixed(1)}%** — ${data.food_cost_week <= 30 ? "✅ dentro del objetivo." : data.food_cost_week <= 35 ? "⚠️ ligeramente elevado, vigilar porciones y mermas." : "🔴 por encima del objetivo — acción correctiva urgente."}

**Recomendación del día:** Revisa los alérgenos para el evento de esta tarde y confirma que el personal de servicio tiene el briefing de alérgenos actualizado.`
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const body = await request.json() as BriefingData
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey || apiKey === "your_gemini_api_key") {
      await new Promise(r => setTimeout(r, 800))
      return NextResponse.json({ briefing: generateMockBriefing(body), mock: true })
    }

    // Real Gemini call
    const prompt = `Eres el asistente de gestión de un restaurante independiente.
Genera un briefing diario conciso y accionable para el jefe de cocina en español.

Datos del día:
- Fecha: ${body.date}
- Eventos hoy: ${body.events_today}
- Eventos esta semana: ${body.events_week}
- Tareas pendientes: ${body.pending_tasks}
- Tareas bloqueadas: ${body.blocked_tasks}
- Lotes próximos a caducar: ${body.expiring_lots}
- Productos con stock bajo: ${body.low_stock_items}
- Food cost semanal: ${body.food_cost_week}%

Formato: usa emojis, secciones claras, máximo 200 palabras. Sé directo y práctico.`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    )

    if (!res.ok) {
      return NextResponse.json({ briefing: generateMockBriefing(body), mock: true })
    }

    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? generateMockBriefing(body)
    return NextResponse.json({ briefing: text, mock: false })
  } catch {
    return NextResponse.json({ briefing: "Error al generar el briefing", mock: true })
  }
}
