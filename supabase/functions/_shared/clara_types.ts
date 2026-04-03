// CLARA — Tipos TypeScript para el agente de administracion financiera

// ─── Enums ─────────────────────────────────────────────────────────────────

export enum EstadoFactura {
  Pendiente = 'pendiente',
  Procesada = 'procesada',
  Discrepancia = 'discrepancia',
  RevisionManual = 'revision_manual',
}

export enum TipoDiscrepancia {
  PrecioIncorrecto = 'precio_incorrecto',
  CantidadIncorrecta = 'cantidad_incorrecta',
  CargoDuplicado = 'cargo_duplicado',
  DocumentoFaltante = 'documento_faltante',
  ProveedorDesconocido = 'proveedor_desconocido',
}

export enum EstadoDiscrepancia {
  Abierta = 'abierta',
  Resuelta = 'resuelta',
  Ignorada = 'ignorada',
}

export enum TipoDocumentoFaltante {
  Factura = 'factura',
  Albaran = 'albaran',
}

export enum EstadoRetry {
  Pendiente = 'pendiente',
  Procesando = 'procesando',
  Completado = 'completado',
  Fallido = 'fallido',
}

// ─── Entidades de BD ───────────────────────────────────────────────────────

export interface FacturaRecibida {
  id: string;
  hotel_id: string;
  supplier_id: string | null;
  fecha_factura: string | null;
  numero_factura: string | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  estado: EstadoFactura;
  confianza_ocr: number | null;
  ruta_documento: string | null;
  hash_documento: string | null;
  datos_extraidos: Record<string, unknown> | null;
  campos_faltantes: string[] | null;
  email_origin: string | null;
  created_at: string;
  updated_at: string;
}

export interface LineaFactura {
  id: string;
  factura_id: string;
  hotel_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total_linea: number;
  iva_tipo: number;
  product_id: string | null;
  created_at: string;
}

export interface DiscrepanciaClara {
  id: string;
  hotel_id: string;
  factura_id: string;
  receipt_id: string | null;
  tipo_discrepancia: TipoDiscrepancia;
  valor_esperado: string | null;
  valor_recibido: string | null;
  diferencia: number | null;
  estado: EstadoDiscrepancia;
  mensaje_proveedor: string | null;
  resuelto_por: string | null;
  resuelto_at: string | null;
  created_at: string;
}

export interface DocumentoFaltante {
  id: string;
  hotel_id: string;
  supplier_id: string | null;
  tipo: TipoDocumentoFaltante;
  fecha_esperada: string | null;
  referencia: string | null;
  estado: string;
  created_at: string;
}

export interface ClaraRetryItem {
  id: string;
  hotel_id: string;
  modulo: string;
  payload: Record<string, unknown>;
  intentos: number;
  max_intentos: number;
  ultimo_error: string | null;
  estado: EstadoRetry;
  proximo_intento: string;
  created_at: string;
}

// ─── Gemini Request/Response ───────────────────────────────────────────────

export interface ClasificacionEmailResult {
  es_factura: boolean;
  confianza: number;
  razon: string;
}

export interface OcrFieldConfidence {
  valor: string | number | null;
  confianza: number;
}

export interface OcrLineaExtraida {
  descripcion: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  total_linea: number;
  iva_tipo: number;
  confianza: number;
}

export interface OcrFacturaExtraida {
  proveedor_nombre: string;
  proveedor_nif: string;
  numero_factura: string;
  fecha_factura: string;
  lineas: OcrLineaExtraida[];
  subtotal: number;
  iva_total: number;
  total: number;
  confianza_global: number;
  campos_faltantes: string[];
}

export interface AnalisisDiscrepanciaResult {
  resumen: string;
  impacto_economico: number;
  recomendacion: string;
}

export interface MensajeProveedorResult {
  asunto: string;
  cuerpo: string;
}

// ─── Trigger / Payload del orquestador ─────────────────────────────────────

export type ClaraTrigger =
  | 'email_recibido'
  | 'documento_subido'
  | 'retry'
  | 'manual';

export interface ClaraPayload {
  trigger: ClaraTrigger;
  hotel_id: string;
  // email_recibido
  email_raw?: string;
  // documento_subido
  documento_base64?: string;
  documento_mime?: string;
  documento_nombre?: string;
  // retry
  retry_id?: string;
  // manual — factura ya insertada
  factura_id?: string;
}

export interface ClaraResult {
  success: boolean;
  factura_id: string | null;
  estado: EstadoFactura | null;
  discrepancias_count: number;
  mensajes_redactados: number;
  tokens_input: number;
  tokens_output: number;
  coste_usd: number;
  duration_ms: number;
  errores: string[];
}

// ─── Deps inyectables (portabilidad VPS) ───────────────────────────────────

export interface ClaraDeps {
  supabase: {
    from: (table: string) => unknown;
    storage: { from: (bucket: string) => unknown };
  };
  callGemini: (opts: {
    prompt: string;
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    image?: { base64: string; mimeType: string };
  }) => Promise<{ text: string; tokensInput: number; tokensOutput: number }>;
  logAgent: (log: Record<string, unknown>) => Promise<void>;
}
