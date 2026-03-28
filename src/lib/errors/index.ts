import { ERROR_CODE, type ErrorCode } from "@/contracts/enums";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Parses a Supabase RPC error message into a typed AppError.
 * RPC errors follow the pattern: "ERROR_CODE: Human-readable message"
 */
export function parseRpcError(errorMessage: string): AppError {
  const codes = Object.values(ERROR_CODE) as string[];

  for (const code of codes) {
    if (errorMessage.includes(code)) {
      const message = errorMessage.replace(`${code}: `, "").trim();
      return new AppError(code as ErrorCode, message);
    }
  }

  return new AppError("EXTERNAL_ERROR", errorMessage);
}

/**
 * User-friendly error messages by error code.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  ACCESS_DENIED: "No tienes permisos para realizar esta acción",
  NOT_FOUND: "El recurso no fue encontrado",
  INVALID_STATE: "La acción no es válida en el estado actual",
  ALREADY_APPLIED: "Esta operación ya fue aplicada",
  MISSING_REQUIRED_DATA: "Faltan datos obligatorios",
  CONFLICT: "Conflicto de concurrencia. Recarga e intenta de nuevo",
  INSUFFICIENT_STOCK: "Stock insuficiente para esta operación",
  LOW_CONFIDENCE_REVIEW_REQUIRED: "Confianza baja — se requiere revisión manual",
  EXTERNAL_ERROR: "Error de comunicación con servicio externo",
  VALIDATION_ERROR: "Error de validación en los datos enviados",
};
