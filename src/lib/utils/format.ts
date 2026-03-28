/**
 * Formats an ISO date string to a localized Spanish date.
 * @example formatDate("2026-03-17") → "17 mar 2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats an ISO date string to a short format.
 * @example formatDateShort("2026-03-17") → "17 mar"
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}

/**
 * Formats an ISO datetime string to localized Spanish datetime.
 * @example formatDateTime("2026-03-17T14:30:00Z") → "17 mar 2026, 14:30"
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Returns a relative time string in Spanish.
 * @example relativeDate("2026-03-20") → "en 3 días" (if today is 2026-03-17)
 */
export function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "mañana";
  if (diffDays === -1) return "ayer";
  if (diffDays > 1 && diffDays <= 30) return `en ${diffDays} días`;
  if (diffDays < -1 && diffDays >= -30) return `hace ${Math.abs(diffDays)} días`;
  return formatDate(dateStr);
}

/**
 * Formats a number as currency (EUR).
 * @example formatCurrency(42.5) → "42,50 €"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return amount.toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}
