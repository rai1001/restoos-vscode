import readExcelFile from "read-excel-file/browser"

interface ParsedIngredient {
  name: string
  quantity: number
  unit: string
}

interface ParsedImportRecipe {
  name?: string
  ingredients: ParsedIngredient[]
}

// Spanish column name patterns
const NAME_HEADERS = ["ingrediente", "producto", "nombre", "item", "descripcion", "descripción"]
const QTY_HEADERS = ["cantidad", "qty", "quantity", "cant"]
const UNIT_HEADERS = ["unidad", "ud", "unit", "medida", "uom"]

function findColumnIndex(headers: string[], patterns: string[]): number {
  return headers.findIndex((h) =>
    patterns.some((p) => h.toLowerCase().trim().includes(p))
  )
}

function parseRow(
  row: string[],
  nameIdx: number,
  qtyIdx: number,
  unitIdx: number
): ParsedIngredient | null {
  const name = row[nameIdx]?.trim()
  if (!name) return null

  const rawQty = row[qtyIdx]?.trim() ?? "1"
  const quantity = parseFloat(rawQty.replace(",", "."))
  if (isNaN(quantity) || quantity <= 0) return null

  const unit = row[unitIdx]?.trim() || "ud"

  return { name, quantity, unit }
}

export async function parseCSVRecipe(text: string): Promise<ParsedImportRecipe> {
  // Detect separator: tab, semicolon, or comma
  const firstLine = text.split("\n")[0] ?? ""
  let separator = ","
  if (firstLine.includes("\t")) separator = "\t"
  else if (firstLine.includes(";")) separator = ";"

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    return { ingredients: [] }
  }

  const headers = (lines[0] ?? "").split(separator).map((h) => h.trim())
  const nameIdx = findColumnIndex(headers, NAME_HEADERS)
  const qtyIdx = findColumnIndex(headers, QTY_HEADERS)
  const unitIdx = findColumnIndex(headers, UNIT_HEADERS)

  // If we can't find columns by header, assume col0=name, col1=qty, col2=unit
  const ni = nameIdx >= 0 ? nameIdx : 0
  const qi = qtyIdx >= 0 ? qtyIdx : 1
  const ui = unitIdx >= 0 ? unitIdx : 2

  const ingredients: ParsedIngredient[] = []
  const startRow = nameIdx >= 0 ? 1 : 0 // skip header if found

  for (let i = startRow; i < lines.length; i++) {
    const cols = (lines[i] ?? "").split(separator).map((c) => c.trim())
    const ing = parseRow(cols, ni, qi, ui)
    if (ing) ingredients.push(ing)
  }

  return { ingredients }
}

export async function parseExcelRecipe(file: File): Promise<ParsedImportRecipe> {
  const rows = await readExcelFile(file)

  if (rows.length < 2) {
    return { ingredients: [] }
  }

  const headers = (rows[0] ?? []).map((cell: unknown) => String(cell ?? ""))
  const nameIdx = findColumnIndex(headers, NAME_HEADERS)
  const qtyIdx = findColumnIndex(headers, QTY_HEADERS)
  const unitIdx = findColumnIndex(headers, UNIT_HEADERS)

  const ni = nameIdx >= 0 ? nameIdx : 0
  const qi = qtyIdx >= 0 ? qtyIdx : 1
  const ui = unitIdx >= 0 ? unitIdx : 2

  const ingredients: ParsedIngredient[] = []
  const startRow = nameIdx >= 0 ? 1 : 0

  for (let i = startRow; i < rows.length; i++) {
    const cols = (rows[i] ?? []).map((cell: unknown) => String(cell ?? ""))
    const ing = parseRow(cols, ni, qi, ui)
    if (ing) ingredients.push(ing)
  }

  return { ingredients }
}

export async function parseImportFile(file: File): Promise<ParsedImportRecipe> {
  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext === "csv" || ext === "tsv") {
    const text = await file.text()
    return parseCSVRecipe(text)
  }
  return parseExcelRecipe(file)
}
