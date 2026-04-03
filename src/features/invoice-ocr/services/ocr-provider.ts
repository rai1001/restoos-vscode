/**
 * OCR Provider abstraction.
 * Swap providers by changing the implementation here.
 * Currently uses a structured extraction approach that works with
 * Google Document AI, Azure Form Recognizer, or Mistral.
 */

export interface OcrInvoiceLine {
  description: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total: number | null;
  raw_text: string;
}

export interface OcrResult {
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  lines: OcrInvoiceLine[];
  raw_text: string;
  confidence: number;
}

/**
 * Extract invoice lines from a base64-encoded image or PDF.
 * This is a MOCK implementation for development.
 * Replace with actual API call to Google Document AI / Azure / Mistral.
 */
export async function extractInvoice(
  fileBase64: string,
  _mimeType: string
): Promise<OcrResult> {
  const provider = process.env.OCR_PROVIDER ?? "mock";

  if (provider === "mock") {
    return mockExtraction();
  }

  if (provider === "google") {
    return googleDocumentAI(fileBase64, _mimeType);
  }

  // Fallback to mock
  return mockExtraction();
}

/**
 * Mock extraction for development/testing.
 * Returns realistic Spanish supplier invoice data.
 */
function mockExtraction(): OcrResult {
  return {
    supplier_name: "Pescadería O Porto",
    invoice_number: "F-2026/0412",
    invoice_date: "2026-04-01",
    lines: [
      {
        description: "MERLUZA FRESCA NAC. 2-3KG",
        quantity: 5,
        unit: "kg",
        unit_price: 12.5,
        total: 62.5,
        raw_text: "MERLUZA FRESCA NAC. 2-3KG  5 KG  12,50  62,50",
      },
      {
        description: "SALMON NOR. FILETE 1KG",
        quantity: 3,
        unit: "kg",
        unit_price: 14.8,
        total: 44.4,
        raw_text: "SALMON NOR. FILETE 1KG  3 KG  14,80  44,40",
      },
      {
        description: "PULPO FRESCO GALLEGO",
        quantity: 2,
        unit: "kg",
        unit_price: 18.0,
        total: 36.0,
        raw_text: "PULPO FRESCO GALLEGO  2 KG  18,00  36,00",
      },
      {
        description: "LANGOSTINOS TIGRE 30/40",
        quantity: 1,
        unit: "kg",
        unit_price: 22.0,
        total: 22.0,
        raw_text: "LANGOSTINOS TIGRE 30/40  1 KG  22,00  22,00",
      },
    ],
    raw_text:
      "PESCADERÍA O PORTO\nCIF: B12345678\nFACTURA F-2026/0412\nFecha: 01/04/2026\n\nMERLUZA FRESCA NAC. 2-3KG  5 KG  12,50  62,50\nSALMON NOR. FILETE 1KG  3 KG  14,80  44,40\nPULPO FRESCO GALLEGO  2 KG  18,00  36,00\nLANGOSTINOS TIGRE 30/40  1 KG  22,00  22,00\n\nBase: 164,90  IVA 10%: 16,49  TOTAL: 181,39",
    confidence: 0.92,
  };
}

/**
 * Google Document AI integration.
 * Requires GOOGLE_DOCUMENT_AI_PROCESSOR env var.
 */
async function googleDocumentAI(
  _fileBase64: string,
  _mimeType: string
): Promise<OcrResult> {
  const processorName = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR;
  if (!processorName) {
    throw new Error(
      "GOOGLE_DOCUMENT_AI_PROCESSOR env var not set. Get it from Google Cloud Console."
    );
  }

  // TODO: Implement actual Google Document AI call
  // For now, fall back to mock
  console.warn("Google Document AI not yet implemented, using mock");
  return mockExtraction();
}
