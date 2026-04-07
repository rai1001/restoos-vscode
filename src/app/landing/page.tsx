"use client";

import { Badge } from "@/components/ui/badge";
import {
  ChefHat, Calculator, Package, Truck, ShieldCheck, Flame,
  Check, ArrowRight, Star, ChevronRight, BookOpen, BarChart3,
  Brain, FileText, ScanLine, Users, CalendarDays, Warehouse,
  Tag, QrCode, Building2, Lock, ClipboardCheck, Bot, MailSearch,
  TrendingUp, Scale, Utensils, MessageSquareWarning, LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ─────────────────────── Navbar ─────────────────────── */

function Navbar() {
  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)]/95 px-6 py-3 shadow-lg backdrop-blur-sm">
        <Link href="/landing" className="flex items-center gap-2">
          <ChefHat className="size-6 text-[var(--accent)]" />
          <span className="text-lg font-bold tracking-tight text-[var(--fg-strong)]">RestoOS</span>
        </Link>
        <div className="hidden items-center gap-6 text-sm md:flex">
          <a href="#features" className="text-[var(--muted)] transition-colors hover:text-[var(--fg)]">Funcionalidades</a>
          <a href="#testimonials" className="text-[var(--muted)] transition-colors hover:text-[var(--fg)]">Testimonios</a>
          <a href="#pricing" className="text-[var(--muted)] transition-colors hover:text-[var(--fg)]">Precios</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="inline-flex items-center justify-center rounded-md text-sm font-medium text-[var(--fg)] h-11 px-4 transition-colors hover:bg-[var(--card)]">
            Iniciar sesión
          </Link>
          <Link href="#pricing" className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] text-[var(--background)] text-sm font-medium h-11 px-4 hover:opacity-90">
            Empezar gratis
            <ChevronRight className="ml-1 size-3.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ─────────────────────── Hero ─────────────────────── */

function Hero() {
  return (
    <section className="relative min-h-screen bg-[var(--background)]">
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-20">
        <div className="mx-auto max-w-3xl space-y-8 text-center">
          <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-sm font-medium text-[var(--fg)]">
            Programa Fundadores — Plazas limitadas
          </span>

          <h1 className="text-balance text-5xl font-light tracking-tight text-[var(--fg-strong)] sm:text-6xl lg:text-7xl">
            Tu cocina{" "}
            <span className="font-medium italic">bajo control.</span>
            <br />
            <span className="font-bold">Tu negocio en crecimiento.</span>
          </h1>

          <p className="mx-auto max-w-xl text-lg text-[var(--muted-light)]">
            Plataforma integral para restaurantes independientes. Controla costes,
            inventario, recetas y proveedores desde una sola pantalla.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="#pricing" className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] text-[var(--background)] px-8 py-4 text-base font-medium hover:opacity-90">
              Empezar prueba gratuita
            </Link>
            <Link href="#features" className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] px-8 py-4 text-base font-medium hover:bg-[var(--card-hover)]">
              Ver funcionalidades
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[var(--accent)]" /> Sin permanencia
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[var(--accent)]" /> Setup en 15 min
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[var(--accent)]" /> Soporte en español
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Features ─────────────────────── */

const featureSections = [
  {
    title: "Cocina & Recetas",
    subtitle: "Tu conocimiento culinario, digitalizado y rentabilizado.",
    features: [
      { icon: BookOpen, title: "Recetas con Versionado", description: "Gestiona recetas con historial de versiones, ingredientes con rendimiento y merma, e instrucciones paso a paso." },
      { icon: Calculator, title: "Escandallo Automático", description: "Coste por ración calculado al instante. Actualizado automáticamente cuando cambian los precios de proveedor." },
      { icon: BarChart3, title: "Ingeniería de Menú", description: "Matriz de Boston automática. Identifica estrellas, caballos de batalla, puzzles y perros. Recomendaciones IA semanales." },
      { icon: Scale, title: "Escalado de Recetas", description: "Escala cualquier receta por factor o comensales con conversión automática de unidades." },
      { icon: ScanLine, title: "OCR de Recetas", description: "Fotografía una receta en papel y la IA la convierte en ficha técnica digital con ingredientes y pasos." },
      { icon: Utensils, title: "Menús y Secciones", description: "Crea menús con secciones organizadas. Asigna recetas, calcula costes del menú completo y analiza rentabilidad." },
    ],
  },
  {
    title: "Operaciones",
    subtitle: "Del proveedor al plato, todo bajo control.",
    features: [
      { icon: Package, title: "Catálogo de Productos", description: "Catálogo centralizado con categorías, unidades y aliases. Búsqueda inteligente y matching automático con proveedores." },
      { icon: Truck, title: "Compras Inteligentes", description: "Solicitudes, pedidos y recepción de mercancía. Sugerencias automáticas basadas en stock + previsión + lead time." },
      { icon: Warehouse, title: "Inventario FIFO", description: "Trazabilidad completa por lotes. Movimientos de stock: recepción, consumo, merma, ajuste y transferencia entre locales." },
      { icon: Users, title: "Gestión de Proveedores", description: "Base de proveedores con ofertas de precio por ubicación. Compara precios, historial y gestiona comunicaciones." },
      { icon: ScanLine, title: "OCR de Albaranes", description: "Digitaliza albaranes con una foto. Extracción automática de productos, cantidades y precios para entrada rápida." },
      { icon: TrendingUp, title: "Motor de Previsión", description: "Forecasting por patrones día/semana, estacionalidad y eventos confirmados. Anticipa la demanda antes de que llegue." },
    ],
  },
  {
    title: "Cumplimiento & Seguridad Alimentaria",
    subtitle: "APPCC digital. Siempre listo para inspección.",
    features: [
      { icon: ShieldCheck, title: "APPCC Completo", description: "40+ plantillas de control: temperaturas, limpieza, recepción. Validación automática contra límites críticos." },
      { icon: ClipboardCheck, title: "Cierre Diario Automático", description: "Agente IA que cierra el día APPCC, genera hash SHA-256 de integridad y detecta anomalías en los registros." },
      { icon: Tag, title: "Etiquetado y Lotes", description: "Crea lotes de producción con alertas de alérgenos y caducidad. Imprime etiquetas con QR y código de barras." },
      { icon: FileText, title: "Bóveda de Documentos", description: "Archivo legal inmutable para facturas, albaranes y registros APPCC. Cadena de custodia y retención legal automática." },
      { icon: MessageSquareWarning, title: "Incidencias y Correctivas", description: "Registro de incidencias APPCC con acciones correctivas. Historial completo para auditorías y visitas de Sanidad." },
      { icon: Lock, title: "Integridad Verificable", description: "Cada documento sellado con hash. Verificación de integridad en cualquier momento. Cumple normativa fiscal española." },
    ],
  },
  {
    title: "Sala & Comercial",
    subtitle: "Reservas, clientes y ventas conectados con la cocina.",
    features: [
      { icon: CalendarDays, title: "Reservas con Calendario", description: "Gestión visual de reservas por día y turno. Asignación de mesas y personal por servicio." },
      { icon: Users, title: "Base de Clientes", description: "Historial de visitas, preferencias y gasto por cliente. Datos que informan tu menú y tu marketing." },
      { icon: LayoutDashboard, title: "Dashboard Multi-Local", description: "Compara KPIs entre locales en tiempo real. Alertas configurables cuando un indicador se sale de rango." },
    ],
  },
  {
    title: "CLARA — IA de Facturación",
    subtitle: "Tu administrativa que nunca duerme. Facturas en piloto automático.",
    features: [
      { icon: MailSearch, title: "Ingesta Automática", description: "CLARA recoge facturas del email, las clasifica y extrae datos con OCR Gemini Vision + validación de NIF." },
      { icon: Bot, title: "Reconciliación Inteligente", description: "Cruza cada factura con albaranes (±7 días, 2% tolerancia). Detecta discrepancias de precio, cantidad y duplicados." },
      { icon: FileText, title: "Comunicación a Proveedores", description: "Genera mensajes profesionales automáticos para reclamar discrepancias. Cola de reintentos para operaciones fallidas." },
    ],
  },
  {
    title: "6 Agentes IA Autónomos",
    subtitle: "Trabajan por ti 24/7. Tú decides, ellos ejecutan.",
    features: [
      { icon: Calculator, title: "Agente Escandallo", description: "Recalcula costes de todas las recetas afectadas cuando un proveedor cambia precios." },
      { icon: BarChart3, title: "Agente Menu Engineering", description: "Análisis semanal con Matriz de Boston y recomendaciones de IA para optimizar tu carta." },
      { icon: Warehouse, title: "Agente Inventario", description: "Gestión FIFO automática y sugerencias de compra agrupadas por proveedor." },
      { icon: ShieldCheck, title: "Agente APPCC", description: "Cierre diario con sellado criptográfico y detección de anomalías en registros." },
      { icon: ScanLine, title: "Agente OCR", description: "Digitalización de facturas con visión artificial y validación fiscal automática." },
      { icon: Brain, title: "Briefing Diario IA", description: "Resumen ejecutivo cada mañana: KPIs, alertas, pendientes y recomendaciones de acción." },
    ],
  },
  {
    title: "Plataforma Enterprise",
    subtitle: "Multi-local, multi-rol, auditable. Crece sin fricción.",
    features: [
      { icon: Building2, title: "Multi-Tenant", description: "Grupos con múltiples locales. Cada hotel/restaurante con su configuración, pero datos consolidados arriba." },
      { icon: Lock, title: "9 Roles, 15 Permisos", description: "Desde superadmin hasta recepción. Control granular con Row Level Security en cada tabla de la base de datos." },
      { icon: Flame, title: "Modo Cocina", description: "Vista optimizada para tablet durante el servicio. Mise en place, tareas por estación, acceso rápido." },
    ],
  },
];

function Features() {
  return (
    <section id="features" className="py-24 md:py-32 bg-[var(--background)]">
      <div className="mx-auto max-w-6xl space-y-24 px-6">
        <div className="mx-auto max-w-xl space-y-4 text-center">
          <h2 className="text-balance text-3xl font-bold text-[var(--fg-strong)] lg:text-4xl">
            Todo lo que tu cocina necesita, en una sola plataforma
          </h2>
          <p className="text-[var(--muted)]">
            10 módulos + 6 agentes IA diseñados por un chef con 30 años de experiencia en cocinas profesionales.
          </p>
        </div>

        {featureSections.map((section) => (
          <div key={section.title} className="space-y-8">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-[var(--fg-strong)]">{section.title}</h3>
              <p className="text-[var(--muted)]">{section.subtitle}</p>
            </div>
            <div className="grid gap-px rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
              {section.features.map((f) => (
                <div key={f.title} className="space-y-3 bg-[var(--background)] p-7 transition-colors hover:bg-[var(--card)]">
                  <div className="flex items-center gap-2.5">
                    <f.icon className="size-5 text-[var(--accent)]" />
                    <h4 className="text-sm font-semibold text-[var(--fg-strong)]">{f.title}</h4>
                  </div>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Numbers bar */}
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 md:grid-cols-4">
          {[
            { value: "50+", label: "Tablas en la base de datos" },
            { value: "6", label: "Agentes IA autónomos" },
            { value: "6", label: "Motores de cálculo" },
            { value: "9", label: "Roles configurables" },
          ].map((stat) => (
            <div key={stat.label} className="space-y-1 text-center">
              <p className="text-3xl font-bold text-[var(--fg-strong)] tabular-nums">{stat.value}</p>
              <p className="text-xs text-[var(--muted)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Testimonials ─────────────────────── */

const testimonials = [
  { name: "Carlos Méndez", role: "Chef ejecutivo, La Taberna del Puerto", text: "Antes tardaba 2 horas semanales calculando escandallos en Excel. Con RestoOS lo tengo en tiempo real. Mi food cost bajó del 34% al 29% en dos meses.", rating: 5 },
  { name: "Ana García", role: "Propietaria, Bistró Galicia", text: "El control de inventario con alertas de caducidad nos ha reducido la merma un 40%. Y el modo cocina es exactamente lo que necesitaba para el servicio.", rating: 5 },
  { name: "Miguel Rodríguez", role: "Director de operaciones, Grupo Marea", text: "Probamos Apicbase y MarketMan antes. RestoOS entiende cómo funciona una cocina española de verdad. Y a un precio que tiene sentido para un independiente.", rating: 5 },
];

function Testimonials() {
  return (
    <section id="testimonials" className="py-24 md:py-32 bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-xl space-y-4 text-center">
          <Badge className="bg-[var(--card)] text-[var(--accent)] border-[var(--border)]">Testimonios</Badge>
          <h2 className="text-3xl font-bold text-[var(--fg-strong)]">Lo que dicen los chefs</h2>
          <p className="text-[var(--muted)]">Restaurantes reales que ya están controlando sus costes con RestoOS.</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-[var(--accent)] text-[var(--accent)]" />
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-[var(--muted-light)]">&ldquo;{t.text}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--accent)]/10 text-sm font-bold text-[var(--accent)]">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--fg)]">{t.name}</p>
                  <p className="text-xs text-[var(--muted)]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Pricing ─────────────────────── */

const plans = [
  {
    name: "Control", badge: "", price: "99", annualPrice: "89", period: "/local/mes",
    description: "Deja Excel y recupera control de coste.", target: "1 restaurante independiente", featured: false,
    sections: [
      { label: "Cocina", items: ["Recetas con versionado", "Escandallo automático", "Escalado de recetas", "OCR de recetas (foto a ficha)", "Menús y secciones"] },
      { label: "Operaciones", items: ["Catálogo de productos", "Gestión de proveedores", "Solicitudes y pedidos de compra", "Recepción de mercancía", "Inventario FIFO", "Control de mermas", "OCR de albaranes"] },
      { label: "Gestión", items: ["Dashboard con KPIs", "Alertas básicas", "Modo Cocina (tablet)", "Soporte por email"] },
    ],
    excluded: ["Ingeniería de Menú", "Forecasting y previsión", "Multi-local", "APPCC y compliance", "Facturación IA", "API / SSO"],
    onboarding: "300", cta: "Solicitar demo",
  },
  {
    name: "Operaciones", badge: "Recomendado", price: "149", annualPrice: "129", period: "/local/mes",
    description: "Estandariza compras, stock y margen.", target: "Premium independiente o grupo pequeño", featured: true,
    sections: [
      { label: "Todo en Control, más:", items: [] },
      { label: "Cocina avanzada", items: ["Ingeniería de Menú (Matriz Boston)", "Recomendaciones IA semanales", "Motor de previsión de demanda"] },
      { label: "Operaciones avanzadas", items: ["Motor de compras inteligente", "Sugerencias automáticas por proveedor", "Alertas avanzadas y aprobaciones", "Bóveda documental básica"] },
      { label: "Facturación IA (Lite)", items: ["OCR de facturas con Gemini Vision", "Reconciliación factura ↔ albarán", "Detección de discrepancias", "50 documentos OCR/mes incluidos"] },
      { label: "Gestión", items: ["Onboarding asistido", "3 integraciones", "Soporte prioritario"] },
    ],
    excluded: ["Multi-local corporativo", "APPCC completo", "SSO / 2FA", "API abierta"],
    onboarding: "600", cta: "Solicitar demo",
  },
  {
    name: "Grupo", badge: "Multi-local", price: "249", annualPrice: "219", period: "/local/mes",
    description: "Gobierna varios locales con trazabilidad y control central.", target: "Grupos de 3+ locales", featured: false,
    sections: [
      { label: "Todo en Operaciones, más:", items: [] },
      { label: "Multi-local", items: ["Vista multi-local y benchmarking", "Catálogos y precios por ubicación", "Permisos avanzados por rol y local"] },
      { label: "Compliance incluido", items: ["APPCC completo (40+ plantillas)", "Cierre diario automático con hash", "Incidencias y acciones correctivas", "Lotes, etiquetas QR y códigos de barras", "Bóveda documental inmutable", "Retención legal automática"] },
      { label: "Facturación IA (Pro)", items: ["300 documentos OCR/mes incluidos", "Ingesta automática por email", "Mensajes a proveedores automáticos", "Cola de reintentos"] },
      { label: "Plataforma", items: ["API abierta", "SSO / 2FA", "Soporte dedicado", "SLA prioritario"] },
    ],
    excluded: [],
    onboarding: "1.500", cta: "Hablar con ventas",
  },
];

const addons = [
  { name: "Compliance Pack", price: "59", unit: "/local/mes", note: "Para Control y Operaciones. Incluido en Grupo." },
  { name: "Pack Reservas y Clientes", price: "79", unit: "/local/mes", note: "Reservas, clientes, mesas, turnos y tracking de ventas." },
  { name: "Producción Central", price: "149", unit: "/central/mes", note: "Para obradores, dark kitchens y cocinas centrales." },
  { name: "Docs OCR extra", price: "25", unit: "/100 docs", note: "Cuando superes los docs incluidos en tu plan." },
  { name: "AutoChef", price: "79", unit: "/mes", note: "Contenido semanal IA, gestión de reseñas, chatbot WhatsApp y dashboard reputación." },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-xl space-y-4 text-center">
          <Badge className="bg-[var(--card)] text-[var(--accent)] border-[var(--border)]">Precios</Badge>
          <h2 className="text-3xl font-bold text-[var(--fg-strong)]">Precios claros, sin sorpresas</h2>
          <p className="text-[var(--muted)]">Todos los planes incluyen soporte, actualizaciones y datos ilimitados. Sin coste por usuario.</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={cn(
              "flex flex-col rounded-xl border p-6",
              plan.featured
                ? "border-[var(--accent)] bg-[var(--card)]"
                : "border-[var(--border)] bg-[var(--background)]"
            )}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--fg-strong)]">{plan.name}</h3>
                {plan.badge && (
                  <Badge className={cn(
                    "text-xs",
                    plan.featured ? "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30" : "bg-[var(--card)] text-[var(--muted)] border-[var(--border)]"
                  )}>{plan.badge}</Badge>
                )}
              </div>
              <p className="text-sm text-[var(--muted)] mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-[var(--fg-strong)]">{plan.price}€</span>
                <span className="text-sm text-[var(--muted)]">{plan.period}</span>
                <p className="mt-1 text-xs text-[var(--muted)]">Anual: {plan.annualPrice}€{plan.period}</p>
              </div>

              {plan.sections.map((sec) => (
                <div key={sec.label} className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-1.5">{sec.label}</p>
                  {sec.items.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-sm text-[var(--fg)] py-0.5">
                      <Check className="size-3.5 text-[var(--accent)] mt-0.5 shrink-0" />
                      {item}
                    </p>
                  ))}
                </div>
              ))}

              {plan.excluded.length > 0 && (
                <div className="mb-4 mt-2 border-t border-[var(--border)] pt-3">
                  {plan.excluded.map((item) => (
                    <p key={item} className="text-sm text-[var(--muted)] py-0.5 line-through">{item}</p>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-4">
                <p className="text-xs text-[var(--muted)] mb-3">Onboarding: {plan.onboarding}€</p>
                <Link href="mailto:hola@restoos.app" className={cn(
                  "flex items-center justify-center rounded-md h-11 text-sm font-medium",
                  plan.featured
                    ? "bg-[var(--accent)] text-[var(--background)] hover:opacity-90"
                    : "border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--card)]"
                )}>
                  {plan.cta}
                  <ArrowRight className="ml-2 size-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="mx-auto mt-16 max-w-4xl">
          <h3 className="text-xl font-bold text-[var(--fg-strong)] mb-6 text-center">Complementos</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addons.map((a) => (
              <div key={a.name} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-sm font-semibold text-[var(--fg)]">{a.name}</p>
                  <p className="text-sm font-bold text-[var(--fg-strong)]">{a.price}€<span className="text-xs font-normal text-[var(--muted)]">{a.unit}</span></p>
                </div>
                <p className="text-xs text-[var(--muted)]">{a.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Founders */}
        <div className="mx-auto mt-16 max-w-3xl rounded-xl border border-[var(--accent)]/30 bg-[var(--card)] p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-2">Programa Fundadores</p>
          <h3 className="text-2xl font-bold text-[var(--fg-strong)] mb-3">20 plazas — Precio preferente de por vida</h3>
          <p className="text-[var(--muted)] mb-6">Los primeros 20 restaurantes tendrán su plan con descuento permanente, acceso beta a nuevas funcionalidades y línea directa con el fundador.</p>
          <Link href="mailto:hola@restoos.app" className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] text-[var(--background)] h-11 px-6 text-sm font-medium hover:opacity-90">
            Reservar mi plaza <ArrowRight className="ml-2 size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── CTA Final ─────────────────────── */

function CTASection() {
  return (
    <section className="py-24 md:py-32 bg-[var(--background)]">
      <div className="mx-auto max-w-3xl space-y-8 px-6 text-center">
        <h2 className="text-3xl font-bold text-[var(--fg-strong)] lg:text-4xl">
          ¿Listo para controlar tu cocina?
        </h2>
        <p className="text-lg text-[var(--muted)]">
          Únete al programa de fundadores. Plazas limitadas a 20 restaurantes
          con precio preferente de por vida.
        </p>
        <Link href="#pricing" className="inline-flex items-center justify-center rounded-md bg-[var(--accent)] text-[var(--background)] h-12 px-8 text-base font-medium hover:opacity-90">
          Reservar mi plaza
          <ArrowRight className="ml-2 size-4" />
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────── Footer ─────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <ChefHat className="size-5 text-[var(--accent)]" />
          <span className="font-semibold text-[var(--fg)]">RestoOS</span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          © 2026 RestoOS. Hecho en A Coruña con experiencia real de cocina.
        </p>
        <div className="flex gap-6 text-sm text-[var(--muted)]">
          <a href="mailto:hola@restoos.app" className="transition-colors hover:text-[var(--fg)]">Contacto</a>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────── Page ─────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--fg)]">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <CTASection />
      <Footer />
    </div>
  );
}
