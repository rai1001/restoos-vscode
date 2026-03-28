"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { format, parseISO, differenceInHours, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { Printer, Plus, PackageSearch, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import type { PrepBatch } from "../schemas/labeling.schema";
import { EU_ALLERGENS } from "../schemas/labeling.schema";

// ─── Helpers ───────────────────────────────────────────────

function formatDate(iso: string) {
  return format(parseISO(iso), "dd/MM/yyyy", { locale: es });
}

function isExpiryUrgent(expiryIso: string): boolean {
  const expiry = parseISO(expiryIso);
  if (isPast(expiry)) return true;
  return differenceInHours(expiry, new Date()) <= 24;
}

function getAllergenDisplay(ids: string[]) {
  return ids
    .map((id) => {
      const found = EU_ALLERGENS.find((a) => a.id === id);
      return found ? `${found.emoji} ${found.label}` : id;
    })
    .join(", ");
}

function buildQrPayload(batch: PrepBatch): string {
  return JSON.stringify({
    batchId: batch.id,
    batchCode: batch.batch_code,
    prepName: batch.prep_name,
    expiry: batch.expiry_date,
    qty: batch.quantity,
    unit: batch.unit,
  });
}

// ─── Single Label ──────────────────────────────────────────

function LabelCard({ batch }: { batch: PrepBatch }) {
  const urgent = isExpiryUrgent(batch.expiry_date);

  return (
    <div className="label-card">
      {/* Header */}
      <div className="label-header">
        <span className="label-brand">RestoOS</span>
      </div>

      <hr className="label-divider" />

      {/* Prep name */}
      <div className="label-prep-name">{batch.prep_name}</div>

      <hr className="label-divider" />

      {/* Details */}
      <div className="label-details">
        <div className="label-row">
          <span className="label-key">Cantidad:</span>
          <span>
            {batch.quantity} {batch.unit}
          </span>
        </div>
        <div className="label-row">
          <span className="label-key">Elaboracion:</span>
          <span>{formatDate(batch.elaboration_date)}</span>
        </div>
        <div className={`label-row ${urgent ? "label-expiry-urgent" : ""}`}>
          <span className="label-key">CADUCA:</span>
          <span>{formatDate(batch.expiry_date)}</span>
        </div>
        {batch.station && (
          <div className="label-row">
            <span className="label-key">Partida:</span>
            <span>{batch.station}</span>
          </div>
        )}
        {batch.location && (
          <div className="label-row">
            <span className="label-key">Ubicacion:</span>
            <span>{batch.location}</span>
          </div>
        )}
        {batch.chef_name && (
          <div className="label-row">
            <span className="label-key">Chef:</span>
            <span>{batch.chef_name}</span>
          </div>
        )}
      </div>

      {/* Allergens */}
      {batch.allergens.length > 0 && (
        <>
          <hr className="label-divider" />
          <div className="label-allergens">
            <span className="label-key">Alergenos:</span>{" "}
            {getAllergenDisplay(batch.allergens)}
          </div>
        </>
      )}

      <hr className="label-divider" />

      {/* Codes */}
      <div className="label-codes">
        <div className="label-qr">
          <QRCodeSVG value={buildQrPayload(batch)} size={64} level="M" />
        </div>
        <div className="label-batch-code">{batch.batch_code}</div>
      </div>
      <div className="label-barcode">
        <Barcode
          value={batch.batch_code}
          format="CODE128"
          width={1.2}
          height={28}
          fontSize={8}
          margin={0}
          displayValue={false}
        />
      </div>

      {/* Print-only styles embedded in the label */}
      <style jsx>{`
        .label-card {
          width: 62mm;
          min-height: 100mm;
          padding: 3mm;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9pt;
          color: #000;
          background: #fff;
          box-sizing: border-box;
          page-break-after: always;
        }
        .label-header {
          text-align: left;
        }
        .label-brand {
          font-size: 11pt;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .label-divider {
          border: none;
          border-top: 1px solid #000;
          margin: 2mm 0;
        }
        .label-prep-name {
          font-size: 13pt;
          font-weight: 700;
          text-transform: uppercase;
          line-height: 1.2;
          word-break: break-word;
        }
        .label-details {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .label-row {
          display: flex;
          gap: 4px;
        }
        .label-key {
          font-weight: 600;
        }
        .label-expiry-urgent {
          color: #dc2626;
          font-weight: 700;
        }
        .label-allergens {
          font-size: 8pt;
          line-height: 1.3;
        }
        .label-codes {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2mm;
        }
        .label-qr {
          flex-shrink: 0;
        }
        .label-batch-code {
          font-size: 8pt;
          font-weight: 600;
          text-align: right;
          word-break: break-all;
        }
        .label-barcode {
          margin-top: 1mm;
          text-align: center;
        }
      `}</style>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────

interface LabelPreviewProps {
  batch: PrepBatch;
  onNewLabel: () => void;
  onPrintDone?: () => void;
}

export default function LabelPreview({
  batch,
  onNewLabel,
  onPrintDone,
}: LabelPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const multiRef = useRef<HTMLDivElement>(null);

  const [copies, setCopies] = useState(2);

  const handlePrint = useReactToPrint({
    contentRef,
    onAfterPrint: onPrintDone,
  });

  const handlePrintMulti = useReactToPrint({
    contentRef: multiRef,
    onAfterPrint: onPrintDone,
  });

  const urgent = isExpiryUrgent(batch.expiry_date);

  return (
    <>
      {/* ── Print-global styles ─────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-area,
          .print-area * {
            visibility: visible !important;
          }
          .print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }
          @page {
            size: 62mm 100mm;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* ── Preview card ──────────────────────────────────── */}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <h3 className="text-lg font-semibold">Vista previa de etiqueta</h3>

            {urgent && (
              <Badge variant="destructive">
                {isPast(parseISO(batch.expiry_date))
                  ? "CADUCADO"
                  : "Caduca en menos de 24h"}
              </Badge>
            )}

            {/* Single-label print target */}
            <div
              ref={contentRef}
              className="print-area border rounded-lg shadow-sm"
            >
              <LabelCard batch={batch} />
            </div>
          </CardContent>
        </Card>

        {/* ── Actions (hidden during print) ─────────────────── */}
        <Card className="no-print">
          <CardContent className="flex flex-col gap-3 pt-4">
            {/* Print single */}
            <Button onClick={() => handlePrint()} className="w-full">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir etiqueta
            </Button>

            {/* Print multiple */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={2}
                max={50}
                value={copies}
                onChange={(e) =>
                  setCopies(
                    Math.max(2, Math.min(50, Number(e.target.value) || 2))
                  )
                }
                className="w-20"
              />
              <Button
                variant="outline"
                onClick={() => handlePrintMulti()}
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Imprimir {copies} copias
              </Button>
            </div>

            {/* New label */}
            <Button variant="outline" onClick={onNewLabel} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Nueva etiqueta
            </Button>

            {/* Inventory link */}
            <Link href="/labeling/inventory" className="inline-flex w-full items-center justify-center rounded-lg px-2.5 h-8 text-sm font-medium hover:bg-muted hover:text-foreground transition-all">
              <PackageSearch className="mr-2 h-4 w-4" />
              Ver en inventario
            </Link>
          </CardContent>
        </Card>

        {/* ── Hidden multi-copy print target ────────────────── */}
        <div ref={multiRef} className="print-area hidden print:block">
          {Array.from({ length: copies }, (_, i) => (
            <LabelCard key={i} batch={batch} />
          ))}
        </div>
      </div>
    </>
  );
}
