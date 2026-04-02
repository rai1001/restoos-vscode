import { NextRequest, NextResponse } from "next/server";
import { extractInvoice } from "@/features/invoice-ocr/services/ocr-provider";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no soportado. Usa JPG, PNG, WebP o PDF." },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Archivo demasiado grande. Máximo 10MB." },
        { status: 400 }
      );
    }

    // Convert to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Extract invoice data via OCR
    const result = await extractInvoice(base64, file.type);

    return NextResponse.json(result);
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json(
      { error: "Error procesando la factura. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
