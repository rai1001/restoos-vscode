"use client";

import { useState } from "react";
import Link from "next/link";
import { Tag, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabelForm } from "@/features/labeling/components/LabelForm";
import LabelPreview from "@/features/labeling/components/LabelPreview";
import { usePrepBatches } from "@/features/labeling/hooks/use-prep-batches";
import type { PrepBatch } from "@/features/labeling/schemas/labeling.schema";

export default function LabelingPage() {
  const [createdBatch, setCreatedBatch] = useState<PrepBatch | null>(null);
  const { createBatch } = usePrepBatches();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10">
            <Tag className="h-5 w-5 text-[#F97316]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316] mb-0.5">
              TRAZABILIDAD
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#E5E2E1]">Etiquetado</h1>
            <p className="text-sm text-[#A78B7D]">
              Genera etiquetas de preparaciones con trazabilidad completa
            </p>
          </div>
        </div>
        <Link href="/labeling/inventory">
          <Button variant="outline" className="gap-2 border-[#333] bg-transparent text-[#E5E2E1] hover:bg-[#1A1A1A]">
            <ClipboardList className="h-4 w-4" />
            Control de preparaciones
          </Button>
        </Link>
      </div>

      {/* Content */}
      {!createdBatch ? (
        <LabelForm
          onBatchCreated={(batch) => setCreatedBatch(batch)}
          createBatch={createBatch}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LabelForm
            onBatchCreated={(batch) => setCreatedBatch(batch)}
            createBatch={createBatch}
          />
          <LabelPreview
            batch={createdBatch}
            onNewLabel={() => setCreatedBatch(null)}
          />
        </div>
      )}
    </div>
  );
}
