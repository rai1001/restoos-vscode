// =============================================================================
// src/lib/reports.ts — Browser-side report utilities (CSV export + PDF print)
// =============================================================================

// Browser-side CSV export (no library needed)
export function exportCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const escape = (val: string | number | null | undefined): string => {
    const str = String(val ?? "")
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n")

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Browser print as PDF
export function printReport(title: string) {
  const originalTitle = document.title
  document.title = `RestoOS — ${title}`
  window.print()
  document.title = originalTitle
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n)
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`
}
