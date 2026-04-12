"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveRestaurant } from "@/lib/auth/hooks";
import { matchProducts, saveAlias, updatePrices } from "../services/product-matcher";
import type { MatchedLine } from "../services/product-matcher";
import type { OcrResult } from "../services/ocr-provider";
import { toast } from "sonner";

export type OcrStep = "upload" | "review" | "confirm" | "done";

export function useInvoiceOcr() {
  const { hotelId } = useActiveRestaurant();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<OcrStep>("upload");
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [matchedLines, setMatchedLines] = useState<MatchedLine[]>([]);

  // Step 1: Upload and extract
  const extractMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error OCR");
      }
      return (await res.json()) as OcrResult;
    },
    onSuccess: async (result) => {
      setOcrResult(result);
      // Auto-match products
      if (hotelId) {
        const matched = await matchProducts(hotelId, null, result.lines);
        setMatchedLines(matched);
      } else {
        // Dev mode: lines without matching
        setMatchedLines(
          result.lines.map((l) => ({
            ...l,
            product_id: null,
            product_name: null,
            match_confidence: 0,
            match_source: "none" as const,
          }))
        );
      }
      setStep("review");
      toast.success(
        `Factura procesada: ${result.lines.length} líneas extraídas`
      );
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Step 2: User corrects matches, then confirms
  const confirmMutation = useMutation({
    mutationFn: async ({
      supplierId,
      lines,
    }: {
      supplierId: string;
      lines: MatchedLine[];
    }) => {
      if (!hotelId) throw new Error("No hotel selected");

      // Save aliases for confirmed matches
      for (const line of lines) {
        if (line.product_id && line.match_source !== "alias") {
          await saveAlias(
            hotelId,
            line.product_id,
            line.description,
            supplierId
          );
        }
      }

      // Update prices in supplier_offers
      const updatedCount = await updatePrices(hotelId, supplierId, lines);
      return updatedCount;
    },
    onSuccess: (count) => {
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["escandallos"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["menu-engineering-dishes"] });
      toast.success(
        `${count} precios actualizados. Los costes de tus recetas se han recalculado.`
      );
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateLineMatch = useCallback(
    (index: number, productId: string, productName: string) => {
      setMatchedLines((prev) =>
        prev.map((line, i) =>
          i === index
            ? {
                ...line,
                product_id: productId,
                product_name: productName,
                match_confidence: 1,
                match_source: "manual" as const,
              }
            : line
        )
      );
    },
    []
  );

  const reset = useCallback(() => {
    setStep("upload");
    setOcrResult(null);
    setMatchedLines([]);
  }, []);

  return {
    step,
    ocrResult,
    matchedLines,
    extractMutation,
    confirmMutation,
    updateLineMatch,
    reset,
    isExtracting: extractMutation.isPending,
    isConfirming: confirmMutation.isPending,
  };
}
