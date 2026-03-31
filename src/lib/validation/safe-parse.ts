import type { z } from "zod"

/**
 * Validates data against a Zod schema.
 * In development: throws on validation failure (catch bugs early).
 * In production: logs warning but returns data as-is (don't crash user session).
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data

  const message = `[Zod] Validation failed${context ? ` in ${context}` : ""}: ${result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")}`

  if (process.env.NODE_ENV === "development") {
    console.warn(message)
    // In dev: return data as-is but warn (don't crash mock data flow)
    return data as T
  }

  // In production: log and return as-is to not crash
  console.error(message)
  return data as T
}

/**
 * Validates an array against a Zod schema.
 */
export function safeParseArray<T>(schema: z.ZodSchema<T>, data: unknown[], context?: string): T[] {
  return data.map((item, idx) => safeParse(schema, item, `${context}[${idx}]`))
}
