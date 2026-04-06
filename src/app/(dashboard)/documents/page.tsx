"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Receipt,
  FileCheck,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type DocStatus =
  | "digitalizando"
  | "digitalizado"
  | "necesita_revision"
  | "rechazado"
  | "eliminado";

type DocType = "factura" | "albaran" | "ticket";

interface Document {
  id: string;
  type: DocType;
  number: string;
  supplier: string;
  date: string;
  dueDate: string | null;
  total: number;
  status: DocStatus;
  category: string;
  confidence: number | null;
  missingFields: string[];
  deletedAt: string | null;
}

// ── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DocStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  digitalizando: {
    label: "Digitalizando",
    className: "bg-blue-500/10 text-blue-400",
    icon: Loader2,
  },
  digitalizado: {
    label: "Digitalizado",
    className: "bg-emerald-500/10 text-emerald-400",
    icon: CheckCircle2,
  },
  necesita_revision: {
    label: "Necesita revisión",
    className: "bg-[var(--alert-warning)]/10 text-[var(--alert-warning)]",
    icon: AlertCircle,
  },
  rechazado: {
    label: "Rechazado",
    className: "bg-[var(--alert-critical)]/10 text-[var(--alert-critical)]",
    icon: XCircle,
  },
  eliminado: {
    label: "Eliminado",
    className: "bg-muted text-muted-foreground",
    icon: Trash2,
  },
};

const DOC_TYPE_CONFIG: Record<
  DocType,
  { label: string; icon: typeof FileText; className: string }
> = {
  factura: {
    label: "Factura",
    icon: Receipt,
    className: "text-primary",
  },
  albaran: {
    label: "Albarán",
    icon: Truck,
    className: "text-blue-400",
  },
  ticket: {
    label: "Ticket",
    icon: FileCheck,
    className: "text-emerald-400",
  },
};

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_DOCUMENTS: Document[] = [
  {
    id: "doc-1",
    type: "factura",
    number: "F-2026/0412",
    supplier: "Makro España",
    date: "2026-04-01",
    dueDate: "2026-04-30",
    total: 1284.5,
    status: "digitalizado",
    category: "Alimentación",
    confidence: 97,
    missingFields: [],
    deletedAt: null,
  },
  {
    id: "doc-2",
    type: "albaran",
    number: "ALB-8834",
    supplier: "Pescaderías O Grove",
    date: "2026-04-02",
    dueDate: null,
    total: 456.8,
    status: "digitalizado",
    category: "Pescado",
    confidence: 95,
    missingFields: [],
    deletedAt: null,
  },
  {
    id: "doc-3",
    type: "factura",
    number: "F-2026/0398",
    supplier: "Distribuciones Galicia",
    date: "2026-03-29",
    dueDate: "2026-04-28",
    total: 2340.0,
    status: "necesita_revision",
    category: "Alimentación",
    confidence: 72,
    missingFields: ["NIF proveedor", "Líneas de IVA"],
    deletedAt: null,
  },
  {
    id: "doc-4",
    type: "ticket",
    number: "T-00291",
    supplier: "Carnicería Hermanos López",
    date: "2026-04-02",
    dueDate: null,
    total: 89.3,
    status: "digitalizando",
    category: "Carne",
    confidence: null,
    missingFields: [],
    deletedAt: null,
  },
  {
    id: "doc-5",
    type: "factura",
    number: "F-2026/0401",
    supplier: "Bodegas Albariño",
    date: "2026-03-31",
    dueDate: "2026-04-30",
    total: 1890.0,
    status: "digitalizado",
    category: "Bebidas",
    confidence: 99,
    missingFields: [],
    deletedAt: null,
  },
  {
    id: "doc-6",
    type: "albaran",
    number: "ALB-8820",
    supplier: "Makro España",
    date: "2026-03-30",
    dueDate: null,
    total: 780.25,
    status: "necesita_revision",
    category: "Alimentación",
    confidence: 65,
    missingFields: ["Cantidad línea 3"],
    deletedAt: null,
  },
  {
    id: "doc-7",
    type: "factura",
    number: "F-2026/0385",
    supplier: "Cleaning Pro SL",
    date: "2026-03-28",
    dueDate: "2026-04-27",
    total: 312.0,
    status: "rechazado",
    category: "Limpieza",
    confidence: 40,
    missingFields: ["Documento ilegible"],
    deletedAt: null,
  },
  {
    id: "doc-8",
    type: "albaran",
    number: "ALB-8801",
    supplier: "Lácteos del Norte",
    date: "2026-03-27",
    dueDate: null,
    total: 245.6,
    status: "eliminado",
    category: "Lácteos",
    confidence: 88,
    missingFields: [],
    deletedAt: "2026-04-01",
  },
  {
    id: "doc-9",
    type: "factura",
    number: "F-2026/0410",
    supplier: "Gas Natural",
    date: "2026-04-01",
    dueDate: "2026-05-01",
    total: 543.2,
    status: "digitalizando",
    category: "Suministros",
    confidence: null,
    missingFields: [],
    deletedAt: null,
  },
  {
    id: "doc-10",
    type: "ticket",
    number: "T-00288",
    supplier: "Mercado de Abastos",
    date: "2026-04-01",
    dueDate: null,
    total: 67.5,
    status: "digitalizado",
    category: "Verduras",
    confidence: 91,
    missingFields: [],
    deletedAt: null,
  },
  {
    id: "doc-11",
    type: "factura",
    number: "F-2026/0395",
    supplier: "Aceites Sierra Mágina",
    date: "2026-03-29",
    dueDate: "2026-04-28",
    total: 420.0,
    status: "digitalizado",
    category: "Alimentación",
    confidence: 98,
    missingFields: [],
    deletedAt: null,
  },
  {
    id: "doc-12",
    type: "albaran",
    number: "ALB-8840",
    supplier: "Frutas Selectas Pontevedra",
    date: "2026-04-03",
    dueDate: null,
    total: 198.7,
    status: "digitalizando",
    category: "Frutas",
    confidence: null,
    missingFields: [],
    deletedAt: null,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function daysUntilPermanentDelete(deletedAt: string): number {
  const deleted = new Date(deletedAt);
  const deadline = new Date(deleted);
  deadline.setDate(deadline.getDate() + 90);
  const now = new Date();
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86400000));
}

// ── Status card type ─────────────────────────────────────────────────────────

type StatusFilter =
  | "todos"
  | "necesita_revision"
  | "digitalizando"
  | "rechazado"
  | "eliminado";

// ── Component ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Counts for status cards
  const counts = useMemo(() => {
    return {
      necesita_revision: MOCK_DOCUMENTS.filter(
        (d) => d.status === "necesita_revision"
      ).length,
      digitalizando: MOCK_DOCUMENTS.filter(
        (d) => d.status === "digitalizando"
      ).length,
      rechazado: MOCK_DOCUMENTS.filter((d) => d.status === "rechazado").length,
      eliminado: MOCK_DOCUMENTS.filter((d) => d.status === "eliminado").length,
    };
  }, []);

  // Unique suppliers & categories
  const suppliers = useMemo(
    () => [...new Set(MOCK_DOCUMENTS.map((d) => d.supplier))].sort(),
    []
  );
  const categories = useMemo(
    () => [...new Set(MOCK_DOCUMENTS.map((d) => d.category))].sort(),
    []
  );

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return MOCK_DOCUMENTS.filter((doc) => {
      // Status filter
      if (statusFilter !== "todos" && doc.status !== statusFilter) return false;
      // When "todos", hide eliminados by default
      if (statusFilter === "todos" && doc.status === "eliminado") return false;

      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          doc.number.toLowerCase().includes(q) ||
          doc.supplier.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Supplier
      if (supplierFilter !== "todos" && doc.supplier !== supplierFilter)
        return false;

      // Category
      if (categoryFilter !== "todos" && doc.category !== categoryFilter)
        return false;

      // Type
      if (typeFilter !== "todos" && doc.type !== typeFilter) return false;

      return true;
    });
  }, [statusFilter, search, supplierFilter, categoryFilter, typeFilter]);

  // Totals
  const totalAmount = filteredDocs.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            GESTIÓN DOCUMENTAL
          </p>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Facturas, albaranes y tickets — digitalización, revisión y archivo
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Upload className="h-4 w-4 mr-2" />
          Subir documento
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() =>
            setStatusFilter(
              statusFilter === "necesita_revision"
                ? "todos"
                : "necesita_revision"
            )
          }
          className={cn(
            "rounded-lg border p-4 text-left transition-all",
            statusFilter === "necesita_revision"
              ? "border-[var(--alert-warning)] bg-[var(--alert-warning)]/5"
              : "border-border bg-card hover:border-border-hover"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-[var(--alert-warning)]" />
            <span className="text-xs font-medium text-[var(--alert-warning)]">
              Necesitan revisión
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {counts.necesita_revision}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Completar información
          </p>
        </button>

        <button
          onClick={() =>
            setStatusFilter(
              statusFilter === "digitalizando" ? "todos" : "digitalizando"
            )
          }
          className={cn(
            "rounded-lg border p-4 text-left transition-all",
            statusFilter === "digitalizando"
              ? "border-blue-500/50 bg-blue-500/5"
              : "border-border bg-card hover:border-border-hover"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">
              Digitalizando
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {counts.digitalizando}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            En proceso de OCR
          </p>
        </button>

        <button
          onClick={() =>
            setStatusFilter(
              statusFilter === "rechazado" ? "todos" : "rechazado"
            )
          }
          className={cn(
            "rounded-lg border p-4 text-left transition-all",
            statusFilter === "rechazado"
              ? "border-[var(--alert-critical)] bg-[var(--alert-critical)]/5"
              : "border-border bg-card hover:border-border-hover"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-[var(--alert-critical)]" />
            <span className="text-xs font-medium text-[var(--alert-critical)]">
              Rechazados
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {counts.rechazado}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Documento no válido
          </p>
        </button>

        <button
          onClick={() =>
            setStatusFilter(
              statusFilter === "eliminado" ? "todos" : "eliminado"
            )
          }
          className={cn(
            "rounded-lg border p-4 text-left transition-all",
            statusFilter === "eliminado"
              ? "border-muted-foreground/50 bg-muted/5"
              : "border-border bg-card hover:border-border-hover"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Eliminados
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {counts.eliminado}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Se eliminan en 90 días
          </p>
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número o proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              filtersOpen
                ? "border-primary/50 bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtrar
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                filtersOpen && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Expanded filters */}
        {filtersOpen && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tipo de documento
                </label>
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v ?? "todos")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los tipos</SelectItem>
                    <SelectItem value="factura">Facturas</SelectItem>
                    <SelectItem value="albaran">Albaranes</SelectItem>
                    <SelectItem value="ticket">Tickets</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Proveedor
                </label>
                <Select
                  value={supplierFilter}
                  onValueChange={(v) => setSupplierFilter(v ?? "todos")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos los proveedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los proveedores</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Categoría
                </label>
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => setCategoryFilter(v ?? "todos")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las categorías</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Fecha del documento
                </label>
                <Input type="date" className="w-full" />
              </div>
            </div>

            {/* Reset filters */}
            {(supplierFilter !== "todos" ||
              categoryFilter !== "todos" ||
              typeFilter !== "todos") && (
              <div className="mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => {
                    setSupplierFilter("todos");
                    setCategoryFilter("todos");
                    setTypeFilter("todos");
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {filteredDocs.length} documento{filteredDocs.length !== 1 && "s"}
          {statusFilter !== "todos" && (
            <span>
              {" "}
              —{" "}
              <button
                onClick={() => setStatusFilter("todos")}
                className="text-primary hover:underline"
              >
                Ver todos
              </button>
            </span>
          )}
        </p>
        <p className="text-muted-foreground">
          Total: <span className="text-foreground font-semibold">{formatCurrency(totalAmount)}</span>
        </p>
      </div>

      {/* Documents table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-widest w-[100px]">
                  Tipo
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Número
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Proveedor
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Fecha
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Vencimiento
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-right">
                  Importe
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest">
                  Estado
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest w-[80px]">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No hay documentos</p>
                    <p className="text-xs mt-1">
                      {statusFilter !== "todos"
                        ? "No hay documentos con este estado"
                        : "Sube tu primer documento para empezar"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => {
                  const statusCfg = STATUS_CONFIG[doc.status];
                  const typeCfg = DOC_TYPE_CONFIG[doc.type];
                  const StatusIcon = statusCfg.icon;
                  const TypeIcon = typeCfg.icon;

                  return (
                    <TableRow
                      key={doc.id}
                      className={cn(
                        "cursor-pointer",
                        doc.status === "eliminado" && "opacity-60"
                      )}
                    >
                      {/* Type */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon
                            className={cn("h-4 w-4", typeCfg.className)}
                          />
                          <span className="text-xs font-medium">
                            {typeCfg.label}
                          </span>
                        </div>
                      </TableCell>

                      {/* Number */}
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {doc.number}
                        </span>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell>
                        <span className="text-sm">{doc.supplier}</span>
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(doc.date)}
                        </span>
                      </TableCell>

                      {/* Due date */}
                      <TableCell>
                        {doc.dueDate ? (
                          <span className="text-sm text-muted-foreground">
                            {formatDate(doc.dueDate)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="text-right">
                        <span className="font-medium text-foreground">
                          {formatCurrency(doc.total)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="space-y-1">
                          <Badge className={cn(statusCfg.className, "border-0")}>
                            <StatusIcon
                              className={cn(
                                "h-3 w-3 mr-0.5",
                                doc.status === "digitalizando" && "animate-spin"
                              )}
                            />
                            {statusCfg.label}
                          </Badge>
                          {doc.missingFields.length > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              {doc.missingFields.join(", ")}
                            </p>
                          )}
                          {doc.status === "eliminado" && doc.deletedAt && (
                            <p className="text-[11px] text-muted-foreground">
                              {daysUntilPermanentDelete(doc.deletedAt)} días
                              restantes
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Ver documento"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {doc.status === "eliminado" ? (
                            <button
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Recuperar"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Descargar"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Info cards at bottom */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-foreground">
              Digitalizando
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Documentos subidos que se están procesando con OCR. El tiempo
            depende de la calidad del documento.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--alert-warning)]" />
            <span className="text-xs font-semibold text-foreground">
              Necesitan revisión
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Documentos que necesitan completar información manualmente — campos
            que el OCR no pudo extraer.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Eliminados
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Los documentos eliminados se borran permanentemente a los 90 días.
            Puedes recuperarlos antes de ese plazo.
          </p>
        </div>
      </div>
    </div>
  );
}
