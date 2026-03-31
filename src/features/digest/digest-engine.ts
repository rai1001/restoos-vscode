// Digest engine — generates daily/weekly summary for a restaurant
// In real mode: queries Supabase. In mock mode: returns demo data.

/** Escape HTML to prevent XSS when injecting user data into email templates */
function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, char => map[char] ?? char)
}

export interface DigestItem {
  icon: string // emoji
  category: "precio" | "caducidad" | "stock" | "appcc" | "margen" | "pedido"
  title: string
  detail: string
  severity: "info" | "warning" | "critical"
}

export interface DigestSummary {
  restaurantName: string
  date: string
  greeting: string
  items: DigestItem[]
  suggestedOrder: Array<{ product: string; quantity: string; supplier: string }>
  kpis: {
    foodCostPct: number
    stockValue: number
    wasteThisWeek: number
    appccCompletionPct: number
  }
}

export function generateMockDigest(): DigestSummary {
  const today = new Date()
  const dateStr = today.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })
  const hour = today.getHours()
  const greeting = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches"

  return {
    restaurantName: "Culuca Cociña-Bar",
    date: dateStr,
    greeting,
    items: [
      {
        icon: "📈",
        category: "precio",
        title: "Solomillo de ternera +8.3%",
        detail: "Carnicería Rial subió de 18.00€ a 19.50€/kg. Afecta a 3 recetas: Callos, Lacón Burger, Raxo.",
        severity: "warning",
      },
      {
        icon: "📈",
        category: "precio",
        title: "Aceite oliva virgen +6.7%",
        detail: "Distribuciones Gallaecia: 4.50€ → 4.80€/L. Impacto: +0.12€ por ración en 5 recetas.",
        severity: "warning",
      },
      {
        icon: "⏰",
        category: "caducidad",
        title: "Calamar fresco caduca mañana",
        detail: "4 uds en stock. Considerar menú especial o congelar hoy.",
        severity: "critical",
      },
      {
        icon: "⏰",
        category: "caducidad",
        title: "Pulpo fresco caduca en 2 días",
        detail: "6 uds. Hay demanda suficiente para servicio de mañana.",
        severity: "warning",
      },
      {
        icon: "📦",
        category: "stock",
        title: "Aceite oliva bajo mínimo",
        detail: "5L restantes (mínimo: 8L). Pedido sugerido: 10L.",
        severity: "warning",
      },
      {
        icon: "🔍",
        category: "appcc",
        title: "Limpieza campana pendiente",
        detail: "Control semanal programado para hoy (lunes). No registrado aún.",
        severity: "info",
      },
      {
        icon: "📊",
        category: "margen",
        title: "Tortilla jugosa: peor margen/hora",
        detail: "Margen bruto €3.20 pero 25 min de prep → €7.68/hora. Considerar subir PVP +€1 o reducir gramaje huevo 10g.",
        severity: "info",
      },
    ],
    suggestedOrder: [
      { product: "Aceite oliva virgen extra", quantity: "10 L", supplier: "Distribuciones Gallaecia" },
      { product: "Tomate fresco", quantity: "5 kg", supplier: "Frutas García" },
      { product: "Nata 35% MG", quantity: "3 L", supplier: "Lácteos do Campo" },
    ],
    kpis: {
      foodCostPct: 28.4,
      stockValue: 2850.20,
      wasteThisWeek: 45.60,
      appccCompletionPct: 92,
    },
  }
}

/** Format digest as plain text (for WhatsApp) */
export function formatDigestText(d: DigestSummary): string {
  let text = `${d.greeting}, Chef 👋\n`
  text += `📋 *Resumen diario — ${d.restaurantName}*\n`
  text += `${d.date}\n\n`

  const critical = d.items.filter(i => i.severity === "critical")
  const warnings = d.items.filter(i => i.severity === "warning")
  const info = d.items.filter(i => i.severity === "info")

  if (critical.length > 0) {
    text += `🔴 *URGENTE*\n`
    critical.forEach(i => { text += `${i.icon} ${i.title}\n   ${i.detail}\n` })
    text += `\n`
  }

  if (warnings.length > 0) {
    text += `🟡 *ATENCIÓN*\n`
    warnings.forEach(i => { text += `${i.icon} ${i.title}\n   ${i.detail}\n` })
    text += `\n`
  }

  if (info.length > 0) {
    text += `🔵 *INFO*\n`
    info.forEach(i => { text += `${i.icon} ${i.title}\n   ${i.detail}\n` })
    text += `\n`
  }

  if (d.suggestedOrder.length > 0) {
    text += `🛒 *Pedido sugerido*\n`
    d.suggestedOrder.forEach(o => { text += `  • ${o.product}: ${o.quantity} (${o.supplier})\n` })
    text += `\n`
  }

  text += `📊 Food cost: ${d.kpis.foodCostPct}% | Stock: ${d.kpis.stockValue.toFixed(0)}€ | Merma semana: ${d.kpis.wasteThisWeek.toFixed(0)}€ | APPCC: ${d.kpis.appccCompletionPct}%`

  return text
}

/** Format digest as HTML (for email) */
export function formatDigestHTML(d: DigestSummary): string {
  const severityColor = { critical: "#ef4444", warning: "#f59e0b", info: "#3b82f6" }

  let html = `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#333">`
  html += `<div style="background:#F97316;color:white;padding:20px;border-radius:8px 8px 0 0">`
  html += `<h1 style="margin:0;font-size:20px">${escapeHtml(d.greeting)}, Chef 👋</h1>`
  html += `<p style="margin:4px 0 0;opacity:0.9;font-size:14px">Resumen diario — ${escapeHtml(d.restaurantName)}</p>`
  html += `<p style="margin:2px 0 0;opacity:0.7;font-size:12px">${escapeHtml(d.date)}</p>`
  html += `</div>`

  // KPIs bar
  html += `<div style="display:flex;gap:1px;background:#eee">`
  html += `<div style="flex:1;background:white;padding:12px;text-align:center"><strong>${d.kpis.foodCostPct}%</strong><br><small style="color:#888">Food cost</small></div>`
  html += `<div style="flex:1;background:white;padding:12px;text-align:center"><strong>${d.kpis.stockValue.toFixed(0)}€</strong><br><small style="color:#888">Stock</small></div>`
  html += `<div style="flex:1;background:white;padding:12px;text-align:center"><strong>${d.kpis.wasteThisWeek.toFixed(0)}€</strong><br><small style="color:#888">Merma</small></div>`
  html += `<div style="flex:1;background:white;padding:12px;text-align:center"><strong>${d.kpis.appccCompletionPct}%</strong><br><small style="color:#888">APPCC</small></div>`
  html += `</div>`

  // Items
  html += `<div style="padding:16px;background:white">`
  d.items.forEach(item => {
    const color = severityColor[item.severity]
    html += `<div style="border-left:3px solid ${color};padding:8px 12px;margin:8px 0;background:#fafafa;border-radius:0 4px 4px 0">`
    html += `<strong>${item.icon} ${escapeHtml(item.title)}</strong><br>`
    html += `<span style="color:#666;font-size:13px">${escapeHtml(item.detail)}</span>`
    html += `</div>`
  })

  // Suggested order
  if (d.suggestedOrder.length > 0) {
    html += `<div style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:4px">`
    html += `<strong>🛒 Pedido sugerido</strong><ul style="margin:8px 0;padding-left:20px">`
    d.suggestedOrder.forEach(o => {
      html += `<li>${escapeHtml(o.product)}: ${escapeHtml(o.quantity)} <span style="color:#888">(${escapeHtml(o.supplier)})</span></li>`
    })
    html += `</ul></div>`
  }

  html += `</div>`
  html += `<div style="padding:12px;text-align:center;background:#f5f5f5;border-radius:0 0 8px 8px;font-size:12px;color:#888">`
  html += `RestoOS — <a href="http://localhost:3002" style="color:#F97316">Abrir dashboard</a>`
  html += `</div></div>`

  return html
}
