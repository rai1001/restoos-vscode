import { type ZodSchema, type ZodError } from "zod";

/**
 * Validates data against a Zod schema and returns a typed result.
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ZodError<T> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
