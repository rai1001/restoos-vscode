import { NextResponse } from "next/server"
import { generateMockDigest, formatDigestHTML, formatDigestText } from "@/features/digest/digest-engine"
import { requireAuth } from "@/lib/api/require-auth"

export async function POST() {
  try {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const digest = generateMockDigest()
    const html = formatDigestHTML(digest)
    const text = formatDigestText(digest)

    const resendKey = process.env.RESEND_API_KEY
    const recipientEmail = process.env.DIGEST_RECIPIENT_EMAIL || "israel@restoos.com"

    // Try to send via Resend if API key is set
    if (resendKey && resendKey !== "your_resend_api_key") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "RestoOS <digest@restoos.com>",
          to: recipientEmail,
          subject: `📋 Resumen diario — ${digest.restaurantName} — ${digest.date}`,
          html,
        }),
      })

      if (res.ok) {
        return NextResponse.json({ sent: true, channel: "email", recipient: recipientEmail })
      }
    }

    // Fallback: return the digest content (for preview / mock mode)
    return NextResponse.json({
      sent: false,
      mock: true,
      digest: {
        subject: `📋 Resumen diario — ${digest.restaurantName} — ${digest.date}`,
        html,
        text,
        itemCount: digest.items.length,
        critical: digest.items.filter(i => i.severity === "critical").length,
        warnings: digest.items.filter(i => i.severity === "warning").length,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generating digest" },
      { status: 500 }
    )
  }
}

// GET: preview the digest without sending
export async function GET() {
  const digest = generateMockDigest()
  const html = formatDigestHTML(digest)
  // Return HTML directly for browser preview
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
