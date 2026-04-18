/**
 * Generate a printable HTML order sheet and trigger print/save as PDF.
 * Uses window.print() — no external dependencies.
 *
 * SECURITY: All user-controlled fields (product names, supplier/restaurant
 * data, notes, order numbers) MUST be passed through escapeHtml() before
 * interpolation into the HTML template. Otherwise a malicious actor who
 * can set any of those fields can inject <script> or event handlers that
 * execute with the app's origin when another user opens the PDF dialog.
 * RO-APPSEC-PDF-001
 */

// Escape HTML entities to prevent XSS when user content is interpolated
// into an HTML string that will be written via document.write().
function escapeHtml(input: string | number | undefined | null): string {
  if (input === null || input === undefined) return ""
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

interface OrderPDFData {
  orderNumber: string
  date: string
  expectedDelivery?: string
  notes?: string
  restaurant: {
    name: string
    address?: string
    phone?: string
  }
  supplier: {
    name: string
    contactName?: string
    email?: string
    phone?: string
    address?: string
  }
  lines: Array<{
    productName: string
    quantity: number
    unit: string
    unitPrice: number
  }>
}

export function generateOrderPDF(data: OrderPDFData) {
  const subtotal = data.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const iva = subtotal * 0.21
  const total = subtotal + iva

  const linesHTML = data.lines
    .map(
      (l) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(l.productName)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(l.quantity)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${escapeHtml(l.unit)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${l.unitPrice.toFixed(2)} €</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${(l.quantity * l.unitPrice).toFixed(2)} €</td>
    </tr>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Pedido ${escapeHtml(data.orderNumber)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; color:#1a1a1a; padding:40px; max-width:800px; margin:0 auto; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom:2px solid #B8906F; }
    .header h1 { font-size:24px; font-weight:700; color:#B8906F; }
    .header .order-num { font-size:14px; color:#666; margin-top:4px; }
    .meta { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:32px; }
    .meta-box { padding:16px; background:#f8f7f6; border-radius:8px; }
    .meta-box h3 { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#999; margin-bottom:8px; }
    .meta-box p { font-size:13px; line-height:1.6; }
    .meta-box .name { font-weight:600; font-size:14px; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    thead th { padding:10px 12px; text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:#999; border-bottom:2px solid #ddd; }
    .totals { margin-left:auto; width:240px; }
    .totals .row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; }
    .totals .total-row { border-top:2px solid #B8906F; margin-top:8px; padding-top:10px; font-size:16px; font-weight:700; color:#B8906F; }
    .notes { margin-top:24px; padding:16px; background:#f8f7f6; border-radius:8px; font-size:13px; }
    .notes h3 { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#999; margin-bottom:8px; }
    .footer { margin-top:40px; text-align:center; font-size:11px; color:#999; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(data.restaurant.name)}</h1>
      ${data.restaurant.address ? `<p style="font-size:12px;color:#666;margin-top:2px;">${escapeHtml(data.restaurant.address)}</p>` : ""}
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:700;">PEDIDO</div>
      <div class="order-num">${escapeHtml(data.orderNumber)}</div>
      <div style="font-size:12px;color:#666;margin-top:4px;">Fecha: ${escapeHtml(data.date)}</div>
      ${data.expectedDelivery ? `<div style="font-size:12px;color:#666;">Entrega: ${escapeHtml(data.expectedDelivery)}</div>` : ""}
    </div>
  </div>

  <div class="meta">
    <div class="meta-box">
      <h3>Proveedor</h3>
      <p class="name">${escapeHtml(data.supplier.name)}</p>
      ${data.supplier.contactName ? `<p>${escapeHtml(data.supplier.contactName)}</p>` : ""}
      ${data.supplier.phone ? `<p>${escapeHtml(data.supplier.phone)}</p>` : ""}
      ${data.supplier.email ? `<p>${escapeHtml(data.supplier.email)}</p>` : ""}
    </div>
    <div class="meta-box">
      <h3>Restaurante</h3>
      <p class="name">${escapeHtml(data.restaurant.name)}</p>
      ${data.restaurant.phone ? `<p>${escapeHtml(data.restaurant.phone)}</p>` : ""}
      ${data.restaurant.address ? `<p>${escapeHtml(data.restaurant.address)}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th style="text-align:right;">Cantidad</th>
        <th style="text-align:center;">Unidad</th>
        <th style="text-align:right;">Precio ud.</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${linesHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${subtotal.toFixed(2)} €</span></div>
    <div class="row"><span>IVA (21%)</span><span>${iva.toFixed(2)} €</span></div>
    <div class="row total-row"><span>Total</span><span>${total.toFixed(2)} €</span></div>
  </div>

  ${data.notes ? `<div class="notes"><h3>Notas</h3><p>${escapeHtml(data.notes)}</p></div>` : ""}

  <div class="footer">
    Generado por RestoOS · ${new Date().toLocaleDateString("es")}
  </div>
</body>
</html>`

  // Open in new window and trigger print
  const win = window.open("", "_blank")
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

/**
 * Generate a plain-text summary for WhatsApp/SMS sharing.
 */
export function generateOrderText(data: OrderPDFData): string {
  const subtotal = data.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const lines = data.lines
    .map((l) => `• ${l.productName}: ${l.quantity} ${l.unit} × ${l.unitPrice.toFixed(2)}€ = ${(l.quantity * l.unitPrice).toFixed(2)}€`)
    .join("\n")

  return `📋 PEDIDO ${data.orderNumber}
${data.restaurant.name}
Fecha: ${data.date}
${data.expectedDelivery ? `Entrega: ${data.expectedDelivery}` : ""}

Para: ${data.supplier.name}

${lines}

Subtotal: ${subtotal.toFixed(2)}€
IVA (21%): ${(subtotal * 0.21).toFixed(2)}€
TOTAL: ${(subtotal * 1.21).toFixed(2)}€
${data.notes ? `\nNotas: ${data.notes}` : ""}`
}
