// =============================================================================
// Document Vault Service
// =============================================================================
// Handles document upload, retrieval, integrity verification, and
// cross-referencing via Supabase RPCs and Storage.
// =============================================================================

import { createClient } from "@/lib/db/client";
import type {
  StoreDocumentInput,
  VaultDocument,
  CustodyEntry,
  VaultStats,
  MissingDocumentReport,
} from "@/contracts/document-vault";
import { computeFileHash } from "./integrity-checker";

const VAULT_BUCKET = "document-vault";
const BACKUP_BUCKET = "document-vault-backup";

// ─── Upload & Store ─────────────────────────────────────────────────────────

export async function uploadDocument(
  file: File,
  input: Omit<StoreDocumentInput, "storage_path" | "file_hash" | "file_size" | "mime_type">
): Promise<{ id: string; hash: string }> {
  const supabase = createClient();

  // 1. Compute hash before upload
  const hash = await computeFileHash(file);

  // 2. Upload to storage
  const path = `${input.hotel_id}/${input.doc_type}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from(VAULT_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // 3. Store in vault via RPC
  const { data, error } = await supabase.rpc("store_document", {
    p_hotel_id: input.hotel_id,
    p_tenant_id: input.tenant_id,
    p_doc_type: input.doc_type,
    p_doc_number: input.doc_number ?? null,
    p_doc_date: input.doc_date ?? new Date().toISOString().split("T")[0],
    p_storage_path: path,
    p_file_hash: hash,
    p_file_size: file.size,
    p_mime_type: file.type,
    p_source: input.source ?? "upload_manual",
    p_linked_type: input.linked_type ?? null,
    p_linked_id: input.linked_id ?? null,
    p_supplier_id: input.supplier_id ?? null,
    p_supplier_name: input.supplier_name ?? null,
    p_total_amount: input.total_amount ?? null,
    p_ocr_confidence: input.ocr_confidence ?? null,
    p_extracted_data: input.extracted_data ?? {},
    p_missing_fields: input.missing_fields ?? [],
  });

  if (error) throw new Error(`Store failed: ${error.message}`);

  return { id: data as string, hash };
}

// ─── Download with custody tracking ─────────────────────────────────────────

export async function downloadDocument(
  documentId: string
): Promise<{ blob: Blob; document: VaultDocument }> {
  const supabase = createClient();

  // Get doc + log custody (viewed/downloaded)
  const { data: docs, error } = await supabase.rpc(
    "get_document_with_custody",
    { p_document_id: documentId, p_action: "downloaded" }
  );

  if (error || !docs?.[0]) throw new Error("Document not found");
  const doc = docs[0] as VaultDocument;

  // Download from storage
  const { data: blob, error: dlError } = await supabase.storage
    .from(VAULT_BUCKET)
    .download(doc.storage_path);

  if (dlError || !blob) throw new Error(`Download failed: ${dlError?.message}`);

  return { blob, document: doc };
}

// ─── Verify integrity ───────────────────────────────────────────────────────

export async function verifyDocumentIntegrity(
  documentId: string,
  file: File
): Promise<{ passed: boolean; expected: string; actual: string }> {
  const supabase = createClient();
  const actualHash = await computeFileHash(file);

  const { data, error } = await supabase.rpc("verify_document_integrity", {
    p_document_id: documentId,
    p_actual_hash: actualHash,
  });

  if (error) throw new Error(`Verification failed: ${error.message}`);
  const results = data as Array<Record<string, unknown>>;
  const result = results[0];
  if (!result) throw new Error("No verification result returned");

  return {
    passed: result.match as boolean,
    expected: result.expected_hash as string,
    actual: result.actual_hash as string,
  };
}

// ─── Create backup copy ─────────────────────────────────────────────────────

export async function createBackup(documentId: string): Promise<string> {
  const supabase = createClient();

  // Get document
  const { data: docs } = await supabase
    .from("document_vault")
    .select("storage_path, hotel_id")
    .eq("id", documentId)
    .single();

  if (!docs) throw new Error("Document not found");

  // Download original
  const { data: blob } = await supabase.storage
    .from(VAULT_BUCKET)
    .download(docs.storage_path);

  if (!blob) throw new Error("Failed to download original");

  // Upload to backup bucket
  const backupPath = `backup/${docs.storage_path}`;
  const { error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(backupPath, blob, { upsert: true });

  if (error) throw new Error(`Backup failed: ${error.message}`);

  // Update backup path
  await supabase
    .from("document_vault")
    .update({ storage_path_backup: backupPath })
    .eq("id", documentId);

  // Log custody
  await supabase.from("document_custody_log").insert({
    document_id: documentId,
    action: "backup_created",
    details: { backup_path: backupPath },
  });

  return backupPath;
}

// ─── Get custody chain ──────────────────────────────────────────────────────

export async function getCustodyChain(
  documentId: string
): Promise<CustodyEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("document_custody_log")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CustodyEntry[];
}

// ─── Vault stats ────────────────────────────────────────────────────────────

export async function getVaultStats(hotelId: string): Promise<VaultStats> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_vault_stats", {
    p_hotel_id: hotelId,
  });

  if (error) throw new Error(error.message);
  const stats = (data as VaultStats[])[0];
  if (!stats) throw new Error("No vault stats returned");
  return stats;
}

// ─── Missing documents report ───────────────────────────────────────────────

export async function getMissingDocumentsReport(
  hotelId: string,
  fromDate?: string,
  toDate?: string
): Promise<MissingDocumentReport[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_missing_documents_report", {
    p_hotel_id: hotelId,
    ...(fromDate && { p_from_date: fromDate }),
    ...(toDate && { p_to_date: toDate }),
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as MissingDocumentReport[];
}

// ─── Cross-reference ────────────────────────────────────────────────────────

export async function crossReferenceDocuments(
  documentId: string,
  linkedType: string,
  linkedId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("cross_reference_documents", {
    p_document_id: documentId,
    p_linked_type: linkedType,
    p_linked_id: linkedId,
  });

  if (error) throw new Error(error.message);
}

// ─── Update status (soft delete, restore, etc.) ─────────────────────────────

export async function updateDocumentStatus(
  documentId: string,
  newStatus: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("document_vault")
    .update({ doc_status: newStatus })
    .eq("id", documentId);

  if (error) throw new Error(error.message);
}
