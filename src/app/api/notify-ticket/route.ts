import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/db/server"

// Escapa HTML para prevenir XSS en emails generados con datos del usuario
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

interface TicketPayload {
  type: string
  title: string
  description: string
  priority: string
  created_by_name: string
  created_by_email: string
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  bug: "#DC2626",
  feature: "#2563EB",
  mejora: "#7C3AED",
  pregunta: "#D97706",
  otro: "#6B7280",
}

const PRIORITY_COLORS: Record<string, string> = {
  critica: "#DC2626",
  alta: "#EA580C",
  media: "#D97706",
  baja: "#16A34A",
}

function buildEmailHtml(ticket: TicketPayload): string {
  // Escapar TODOS los campos que vienen del usuario antes de insertar en HTML
  const safeTitle       = escapeHtml(ticket.title)
  const safeDescription = escapeHtml(ticket.description)
  const safeName        = escapeHtml(ticket.created_by_name)
  const safeEmail       = escapeHtml(ticket.created_by_email)
  const safeType        = escapeHtml(ticket.type)
  const safePriority    = escapeHtml(ticket.priority)

  const typeColor = TYPE_COLORS[ticket.type.toLowerCase()] ?? "#6B7280"
  const priorityColor = PRIORITY_COLORS[ticket.priority.toLowerCase()] ?? "#6B7280"
  const formattedDate = new Date(ticket.created_at).toLocaleString("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
  })

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:#111827;padding:24px 32px;">
            <span style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">
              CulinaryOS
            </span>
            <span style="font-size:14px;color:#9CA3AF;margin-left:8px;">Feedback</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <!-- Badges -->
            <div style="margin-bottom:20px;">
              <span style="display:inline-block;background:${typeColor};color:#FFFFFF;font-size:12px;font-weight:600;padding:4px 10px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.5px;">
                ${safeType}
              </span>
              <span style="display:inline-block;background:${priorityColor};color:#FFFFFF;font-size:12px;font-weight:600;padding:4px 10px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.5px;margin-left:6px;">
                ${safePriority}
              </span>
            </div>

            <!-- Title -->
            <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
              ${safeTitle}
            </h2>

            <!-- Description -->
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;">${safeDescription}</p>
            </div>

            <!-- User info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="font-size:13px;color:#6B7280;padding:4px 0;">
                  <strong style="color:#374151;">Reportado por:</strong> ${safeName}
                </td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6B7280;padding:4px 0;">
                  <strong style="color:#374151;">Email:</strong>
                  <a href="mailto:${safeEmail}" style="color:#2563EB;text-decoration:none;">${safeEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6B7280;padding:4px 0;">
                  <strong style="color:#374151;">Fecha:</strong> ${formattedDate}
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;margin:28px 0 8px;">
              <a href="/admin/tickets" style="display:inline-block;background:#111827;color:#FFFFFF;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
                Ver en panel de admin
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">
              Este email fue generado automaticamente por CulinaryOS
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario está autenticado antes de enviar emails
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const ticket = (await request.json()) as TicketPayload

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ sent: false, reason: "no_api_key" })
    }

    const to = process.env.NOTIFY_EMAIL ?? "admin@culinaryos.com"

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "CulinaryOS Feedback <feedback@culinaryos.com>",
        to,
        subject: `[CulinaryOS Feedback] ${escapeHtml(ticket.type)} · ${escapeHtml(ticket.priority)} — ${escapeHtml(ticket.title)}`,
        html: buildEmailHtml(ticket),
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: err }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
