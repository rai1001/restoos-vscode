// =============================================================================
// src/contracts/document-vault.ts — Document Vault domain types
// =============================================================================
// Single source of truth for document vault statuses, types, and interfaces.
// Used in schemas, RPCs, UI, and Edge Functions.
// =============================================================================

// --- DOCUMENT STATUS ---
export const DOC_STATUS = {
  DIGITALIZANDO: "digitalizando",
  DIGITALIZADO: "digitalizado",
  NECESITA_REVISION: "necesita_revision",
  RECHAZADO: "rechazado",
  ELIMINADO: "eliminado",
} as const;
export type DocStatus = (typeof DOC_STATUS)[keyof typeof DOC_STATUS];

// Valid status transitions
export const DOC_STATUS_TRANSITIONS: Record<DocStatus, DocStatus[]> = {
  digitalizando: ["digitalizado", "necesita_revision", "rechazado"],
  digitalizado: ["eliminado"],
  necesita_revision: ["digitalizado", "rechazado", "eliminado"],
  rechazado: ["eliminado"],
  eliminado: [], // terminal — permanent delete after 90 days
};

// --- DOCUMENT TYPE ---
export const DOC_TYPE = {
  FACTURA: "factura",
  ALBARAN: "albaran",
  TICKET: "ticket",
  APPCC_CIERRE: "appcc_cierre",
  APPCC_INCIDENCIA: "appcc_incidencia",
  CERTIFICADO_PROVEEDOR: "certificado_proveedor",
} as const;
export type DocType = (typeof DOC_TYPE)[keyof typeof DOC_TYPE];

// --- DOCUMENT SOURCE ---
export const DOC_SOURCE = {
  UPLOAD_MANUAL: "upload_manual",
  EMAIL_AUTO: "email_auto",
  OCR_SCAN: "ocr_scan",
  API_IMPORT: "api_import",
} as const;
export type DocSource = (typeof DOC_SOURCE)[keyof typeof DOC_SOURCE];

// --- CUSTODY ACTION ---
export const CUSTODY_ACTION = {
  CREATED: "created",
  VIEWED: "viewed",
  DOWNLOADED: "downloaded",
  VERIFIED: "verified",
  EXPORTED: "exported",
  SHARED: "shared",
  ARCHIVED: "archived",
  STATUS_CHANGED: "status_changed",
  BACKUP_CREATED: "backup_created",
  RESTORED: "restored",
} as const;
export type CustodyAction = (typeof CUSTODY_ACTION)[keyof typeof CUSTODY_ACTION];

// --- INTEGRITY CHECK ---
export const INTEGRITY_STATUS = {
  PASSED: "passed",
  FAILED: "failed",
  WARNING: "warning",
} as const;
export type IntegrityStatus =
  (typeof INTEGRITY_STATUS)[keyof typeof INTEGRITY_STATUS];

export const CHECK_TYPE = {
  HASH_VERIFY: "hash_verify",
  BACKUP_VERIFY: "backup_verify",
  CROSS_REFERENCE: "cross_reference",
} as const;
export type CheckType = (typeof CHECK_TYPE)[keyof typeof CHECK_TYPE];

// --- LINKED ENTITY TYPE ---
export const LINKED_ENTITY_TYPE = {
  FACTURA_RECIBIDA: "factura_recibida",
  GOODS_RECEIPT: "goods_receipt",
  APPCC_DAILY_CLOSURE: "appcc_daily_closure",
  APPCC_INCIDENT: "appcc_incident",
  PURCHASE_ORDER: "purchase_order",
} as const;
export type LinkedEntityType =
  (typeof LINKED_ENTITY_TYPE)[keyof typeof LINKED_ENTITY_TYPE];

// =============================================================================
// Interfaces
// =============================================================================

export interface VaultDocument {
  id: string;
  hotel_id: string;
  tenant_id: string;
  doc_type: DocType;
  doc_number: string | null;
  doc_date: string | null;
  doc_status: DocStatus;
  storage_path: string;
  storage_path_backup: string | null;
  file_hash_sha256: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  source: DocSource;
  linked_entity_type: LinkedEntityType | null;
  linked_entity_id: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  total_amount: number | null;
  currency: string;
  ocr_confidence: number | null;
  extracted_data: Record<string, unknown>;
  missing_fields: string[];
  retention_until: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CustodyEntry {
  id: string;
  document_id: string;
  action: CustodyAction;
  actor_id: string | null;
  actor_role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface IntegrityCheck {
  id: string;
  document_id: string;
  check_type: CheckType;
  status: IntegrityStatus;
  expected_hash: string | null;
  actual_hash: string | null;
  details: Record<string, unknown>;
  checked_at: string;
  checked_by: string | null;
}

export interface RetentionPolicy {
  id: string;
  doc_type: DocType;
  retention_years: number;
  requires_backup: boolean;
  requires_encryption: boolean;
  description: string | null;
}

export interface VaultStats {
  total_documents: number;
  total_digitalizando: number;
  total_digitalizado: number;
  total_revision: number;
  total_rechazado: number;
  total_eliminado: number;
  integrity_passed: number;
  integrity_failed: number;
  docs_without_backup: number;
  retention_warnings: number;
}

export interface MissingDocumentReport {
  document_id: string;
  doc_type: DocType;
  doc_number: string | null;
  doc_date: string;
  supplier_name: string | null;
  total_amount: number | null;
  has_matching: boolean;
  matching_doc_id: string | null;
}

// =============================================================================
// Store document input
// =============================================================================

export interface StoreDocumentInput {
  hotel_id: string;
  tenant_id: string;
  doc_type: DocType;
  doc_number?: string;
  doc_date?: string;
  storage_path: string;
  file_hash: string;
  file_size?: number;
  mime_type?: string;
  source?: DocSource;
  linked_type?: LinkedEntityType;
  linked_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  total_amount?: number;
  ocr_confidence?: number;
  extracted_data?: Record<string, unknown>;
  missing_fields?: string[];
}
