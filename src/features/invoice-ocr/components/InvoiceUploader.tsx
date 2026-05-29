"use client";

import { useCallback, useRef } from "react";
import { Upload, FileText, Check, AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInvoiceOcr } from "../hooks/use-invoice-ocr";
import type { MatchedLine } from "../services/product-matcher";
import { cn } from "@/lib/utils";

export function InvoiceUploader() {
  const {
    step,
    ocrResult,
    matchedLines,
    extractMutation,
    confirmMutation,
    updateLineMatch,
    reset,
    isExtracting,
    isConfirming,
  } = useInvoiceOcr();

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      extractMutation.mutate(file);
    },
    [extractMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ─── Step 1: Upload ──────────────────────────────────────────────
  if (step === "upload") {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "rounded-xl border-2 border-dashed border-muted-foreground/20 p-8 text-center",
          "hover:border-primary/50 transition-colors cursor-pointer"
        )}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {isExtracting ? (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Procesando factura con OCR...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Sube una factura de proveedor
              </p>
              <p className="text-xs text-muted-foreground">
                Arrastra un PDF o foto, o haz clic para seleccionar
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Step 2: Review matched lines ────────────────────────────────
  if (step === "review") {
    const matchedCount = matchedLines.filter((l) => l.product_id).length;
    const totalLines = matchedLines.length;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              <FileText className="mr-1.5 inline h-4 w-4" />
              {ocrResult?.supplier_name ?? "Factura"}{" "}
              <span className="text-muted-foreground font-normal">
                {ocrResult?.invoice_number}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {matchedCount}/{totalLines} productos identificados
              {ocrResult?.confidence && (
                <span className="ml-2">
                  OCR: {Math.round(ocrResult.confidence * 100)}%
                </span>
              )}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Lines table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card text-muted-foreground text-xs uppercase tracking-widest">
                <th className="px-3 py-2 text-left">Descripci\u00f3n factura</th>
                <th className="px-3 py-2 text-right">Cant.</th>
                <th className="px-3 py-2 text-right">Precio</th>
                <th className="px-3 py-2 text-left">Producto detectado</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {matchedLines.map((line, i) => (
                <InvoiceLine
                  key={i}
                  line={line}
                  onMatch={(productId, productName) =>
                    updateLineMatch(i, productId, productName)
                  }
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={reset}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              confirmMutation.mutate({
                supplierId: "auto", // TODO: detect or ask
                lines: matchedLines,
              })
            }
            disabled={isConfirming || matchedCount === 0}
          >
            {isConfirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Confirmar {matchedCount} productos
          </Button>
        </div>
      </div>
    );
  }

  // ─── Step 3: Done ────────────────────────────────────────────────
  return (
    <div className="rounded-xl bg-[var(--alert-ok)]/10 p-6 text-center space-y-3">
      <Check className="mx-auto h-10 w-10 text-[var(--alert-ok)]" />
      <p className="text-sm font-medium text-foreground">
        Precios actualizados correctamente
      </p>
      <p className="text-xs text-muted-foreground">
        Los costes de tus recetas se han recalculado con los nuevos precios.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Subir otra factura
      </Button>
    </div>
  );
}

// RO-APPSEC-OCR-001: OCR-derived values may arrive as strings, null, or
// NaN when Mistral Vision can't parse a line. Coerce defensively before
// rendering — `.toFixed()` crashes on non-numbers and takes the whole UI
// with it (React error boundary bubbles up).
function formatPrice(value: unknown): string {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function InvoiceLine({
  line,
}: {
  line: MatchedLine;
  onMatch: (productId: string, productName: string) => void;
}) {
  const hasMatch = !!line.product_id;

  return (
    <tr className="border-t border-border hover:bg-card-hover transition-colors">
      <td className="px-3 py-2 text-foreground">{line.description}</td>
      <td className="px-3 py-2 text-right text-muted-foreground">
        {line.quantity} {line.unit}
      </td>
      <td className="px-3 py-2 text-right text-foreground font-medium">
        {formatPrice(line.unit_price)}€
      </td>
      <td className="px-3 py-2">
        {hasMatch ? (
          <span className="text-foreground">{line.product_name}</span>
        ) : (
          <span className="text-muted-foreground/50 italic">Sin match</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {hasMatch ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              line.match_source === "alias"
                ? "bg-[var(--alert-ok)]/10 text-[var(--alert-ok)]"
                : line.match_source === "fuzzy"
                  ? "bg-[var(--alert-warning)]/10 text-[var(--alert-warning)]"
                  : "bg-blue-500/10 text-blue-400"
            )}
          >
            {line.match_source === "alias" ? (
              <Check className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {Math.round(line.match_confidence * 100)}%
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </td>
    </tr>
  );
}
