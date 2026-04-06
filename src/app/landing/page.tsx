"use client";

import { motion } from "framer-motion";
import { MeshGradient as MeshGradientBase } from "@paper-design/shaders-react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MeshGradient = MeshGradientBase as any;
import { Badge } from "@/components/ui/badge";
import {
  ChefHat,
  Calculator,
  Package,
  Truck,
  ShieldCheck,
  Flame,
  Check,
  ArrowRight,
  Star,
  ChevronRight,
  BookOpen,
  BarChart3,
  Brain,
  FileText,
  ScanLine,
  Users,
  CalendarDays,
  Warehouse,
  Tag,
  QrCode,
  Building2,
  Lock,
  ClipboardCheck,
  Bot,
  MailSearch,
  TrendingUp,
  Scale,
  Utensils,
  MessageSquareWarning,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

/* ─────────────────────── Animations ─────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─────────────────────── Navbar ─────────────────────── */

function Navbar() {
  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-xl border border-border/60 bg-background/80 px-6 py-3 shadow-lg backdrop-blur-xl">
        <Link href="/landing" className="flex items-center gap-2">
          <ChefHat className="size-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">RestoOS</span>
        </Link>
        <div className="hidden items-center gap-6 text-sm md:flex">
          <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
            Funcionalidades
          </a>
          <a href="#testimonials" className="text-muted-foreground transition-colors hover:text-foreground">
            Testimonios
          </a>
          <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
            Precios
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 px-3">
            Iniciar sesión
          </Link>
          <Link href="#pricing" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-8 px-3 hover:bg-primary/90">
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
    <section className="relative min-h-screen overflow-hidden">
      {/* Shader animated background */}
      <div className="absolute inset-0">
        <MeshGradient
          className="absolute inset-0 h-full w-full"
          colors={["#000000", "#3D2B1F", "#B8906F", "#1C1917", "#2C1E14"]}
          speed={0.3}
          backgroundColor="#0A0A0A"
        />
        <MeshGradient
          className="absolute inset-0 h-full w-full opacity-40"
          colors={["#000000", "#FFFFFF", "#B8906F", "#000000"]}
          speed={0.2}
          wireframe
          backgroundColor="transparent"
        />
      </div>

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 pt-20">
        <motion.div
          className="mx-auto max-w-3xl space-y-8 text-center"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              Programa Fundadores — Plazas limitadas
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-balance text-5xl font-light tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            Tu cocina{" "}
            <span className="font-medium italic">bajo control.</span>
            <br />
            <span className="font-bold">Tu negocio en crecimiento.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-xl text-lg text-white/80"
          >
            Plataforma integral para restaurantes independientes. Controla costes,
            inventario, recetas y proveedores desde una sola pantalla.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="#pricing" className="cursor-pointer rounded-full bg-white px-8 py-4 text-base font-medium text-gray-900 transition-transform duration-300 hover:scale-105 inline-block">
              Empezar prueba gratuita
            </Link>
            <Link href="#features" className="cursor-pointer rounded-full border border-white/30 bg-white/10 px-8 py-4 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:border-white/50 inline-block">
              Ver funcionalidades
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-white/70"
          >
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[var(--alert-warning)]" /> Sin permanencia
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[var(--alert-warning)]" /> Setup en 15 min
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-[var(--alert-warning)]" /> Soporte en español
            </span>
          </motion.div>
        </motion.div>
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
      {
        icon: BookOpen,
        title: "Recetas con Versionado",
        description: "Gestiona recetas con historial de versiones, ingredientes con rendimiento y merma, e instrucciones paso a paso.",
      },
      {
        icon: Calculator,
        title: "Escandallo Automático",
        description: "Coste por ración calculado al instante. Actualizado automáticamente cuando cambian los precios de proveedor.",
      },
      {
        icon: BarChart3,
        title: "Ingeniería de Menú",
        description: "Matriz de Boston automática. Identifica estrellas, caballos de batalla, puzzles y perros. Recomendaciones IA semanales.",
      },
      {
        icon: Scale,
        title: "Escalado de Recetas",
        description: "Escala cualquier receta por factor o comensales con conversión automática de unidades.",
      },
      {
        icon: ScanLine,
        title: "OCR de Recetas",
        description: "Fotografía una receta en papel y la IA la convierte en ficha técnica digital con ingredientes y pasos.",
      },
      {
        icon: Utensils,
        title: "Menús y Secciones",
        description: "Crea menús con secciones organizadas. Asigna recetas, calcula costes del menú completo y analiza rentabilidad.",
      },
    ],
  },
  {
    title: "Operaciones",
    subtitle: "Del proveedor al plato, todo bajo control.",
    features: [
      {
        icon: Package,
        title: "Catálogo de Productos",
        description: "Catálogo centralizado con categorías, unidades y aliases. Búsqueda inteligente y matching automático con proveedores.",
      },
      {
        icon: Truck,
        title: "Compras Inteligentes",
        description: "Solicitudes, pedidos y recepción de mercancía. Sugerencias automáticas basadas en stock + previsión + lead time.",
      },
      {
        icon: Warehouse,
        title: "Inventario FIFO",
        description: "Trazabilidad completa por lotes. Movimientos de stock: recepción, consumo, merma, ajuste y transferencia entre locales.",
      },
      {
        icon: Users,
        title: "Gestión de Proveedores",
        description: "Base de proveedores con ofertas de precio por ubicación. Compara precios, historial y gestiona comunicaciones.",
      },
      {
        icon: ScanLine,
        title: "OCR de Albaranes",
        description: "Digitaliza albaranes con una foto. Extracción automática de productos, cantidades y precios para entrada rápida.",
      },
      {
        icon: TrendingUp,
        title: "Motor de Previsión",
        description: "Forecasting por patrones día/semana, estacionalidad y eventos confirmados. Anticipa la demanda antes de que llegue.",
      },
    ],
  },
  {
    title: "Cumplimiento & Seguridad Alimentaria",
    subtitle: "APPCC digital. Siempre listo para inspección.",
    features: [
      {
        icon: ShieldCheck,
        title: "APPCC Completo",
        description: "40+ plantillas de control: temperaturas, limpieza, recepción. Validación automática contra límites críticos.",
      },
      {
        icon: ClipboardCheck,
        title: "Cierre Diario Automático",
        description: "Agente IA que cierra el día APPCC, genera hash SHA-256 de integridad y detecta anomalías en los registros.",
      },
      {
        icon: Tag,
        title: "Etiquetado y Lotes",
        description: "Crea lotes de producción con alertas de alérgenos y caducidad. Imprime etiquetas con QR y código de barras.",
      },
      {
        icon: FileText,
        title: "Bóveda de Documentos",
        description: "Archivo legal inmutable para facturas, albaranes y registros APPCC. Cadena de custodia y retención legal automática.",
      },
      {
        icon: MessageSquareWarning,
        title: "Incidencias y Correctivas",
        description: "Registro de incidencias APPCC con acciones correctivas. Historial completo para auditorías y visitas de Sanidad.",
      },
      {
        icon: Lock,
        title: "Integridad Verificable",
        description: "Cada documento sellado con hash. Verificación de integridad en cualquier momento. Cumple normativa fiscal española.",
      },
    ],
  },
  {
    title: "Sala & Comercial",
    subtitle: "Reservas, clientes y ventas conectados con la cocina.",
    features: [
      {
        icon: CalendarDays,
        title: "Reservas con Calendario",
        description: "Gestión visual de reservas por día y turno. Asignación de mesas y personal por servicio.",
      },
      {
        icon: Users,
        title: "Base de Clientes",
        description: "Historial de visitas, preferencias y gasto por cliente. Datos que informan tu menú y tu marketing.",
      },
      {
        icon: LayoutDashboard,
        title: "Dashboard Multi-Local",
        description: "Compara KPIs entre locales en tiempo real. Alertas configurables cuando un indicador se sale de rango.",
      },
    ],
  },
  {
    title: "CLARA — IA de Facturación",
    subtitle: "Tu administrativa que nunca duerme. Facturas en piloto automático.",
    features: [
      {
        icon: MailSearch,
        title: "Ingesta Automática",
        description: "CLARA recoge facturas del email, las clasifica y extrae datos con OCR Gemini Vision + validación de NIF.",
      },
      {
        icon: Bot,
        title: "Reconciliación Inteligente",
        description: "Cruza cada factura con albaranes (±7 días, 2% tolerancia). Detecta discrepancias de precio, cantidad y duplicados.",
      },
      {
        icon: FileText,
        title: "Comunicación a Proveedores",
        description: "Genera mensajes profesionales automáticos para reclamar discrepancias. Cola de reintentos para operaciones fallidas.",
      },
    ],
  },
  {
    title: "6 Agentes IA Autónomos",
    subtitle: "Trabajan por ti 24/7. Tú decides, ellos ejecutan.",
    features: [
      {
        icon: Calculator,
        title: "Agente Escandallo",
        description: "Recalcula costes de todas las recetas afectadas cuando un proveedor cambia precios.",
      },
      {
        icon: BarChart3,
        title: "Agente Menu Engineering",
        description: "Análisis semanal con Matriz de Boston y recomendaciones de IA para optimizar tu carta.",
      },
      {
        icon: Warehouse,
        title: "Agente Inventario",
        description: "Gestión FIFO automática y sugerencias de compra agrupadas por proveedor.",
      },
      {
        icon: ShieldCheck,
        title: "Agente APPCC",
        description: "Cierre diario con sellado criptográfico y detección de anomalías en registros.",
      },
      {
        icon: ScanLine,
        title: "Agente OCR",
        description: "Digitalización de facturas con visión artificial y validación fiscal automática.",
      },
      {
        icon: Brain,
        title: "Briefing Diario IA",
        description: "Resumen ejecutivo cada mañana: KPIs, alertas, pendientes y recomendaciones de acción.",
      },
    ],
  },
  {
    title: "Plataforma Enterprise",
    subtitle: "Multi-local, multi-rol, auditable. Crece sin fricción.",
    features: [
      {
        icon: Building2,
        title: "Multi-Tenant",
        description: "Grupos con múltiples locales. Cada hotel/restaurante con su configuración, pero datos consolidados arriba.",
      },
      {
        icon: Lock,
        title: "9 Roles, 15 Permisos",
        description: "Desde superadmin hasta recepción. Control granular con Row Level Security en cada tabla de la base de datos.",
      },
      {
        icon: Flame,
        title: "Modo Cocina",
        description: "Vista optimizada para tablet durante el servicio. Mise en place, tareas por estación, acceso rápido.",
      },
    ],
  },
];

function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <MeshGradient
          className="absolute inset-0 h-full w-full opacity-20"
          colors={["#0A0A0A", "#3D2B1F", "#B8906F", "#1C1917", "#0A0A0A"]}
          speed={0.12}
          backgroundColor="#0A0A0A"
        />
      </div>
      <div className="mx-auto max-w-6xl space-y-24 px-6">
        {/* Section header */}
        <motion.div
          className="mx-auto max-w-xl space-y-4 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-balance text-3xl font-bold lg:text-4xl">
            Todo lo que tu cocina necesita, en una sola plataforma
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground">
            10 módulos + 6 agentes IA diseñados por un chef con 30 años de experiencia en cocinas profesionales.
          </motion.p>
        </motion.div>

        {/* Feature sections */}
        {featureSections.map((section, sectionIdx) => (
          <motion.div
            key={section.title}
            className="space-y-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="space-y-2">
              <h3 className="text-2xl font-bold">{section.title}</h3>
              <p className="text-muted-foreground">{section.subtitle}</p>
            </motion.div>

            <motion.div
              className={`grid gap-px rounded-xl border bg-border ${
                section.features.length <= 3
                  ? "sm:grid-cols-2 lg:grid-cols-3"
                  : "sm:grid-cols-2 lg:grid-cols-3"
              }`}
              variants={stagger}
            >
              {section.features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  className="group space-y-3 bg-background p-7 transition-colors hover:bg-card"
                >
                  <div className="flex items-center gap-2.5">
                    <f.icon className="size-5 text-primary" />
                    <h4 className="text-sm font-semibold">{f.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ))}

        {/* Numbers bar */}
        <motion.div
          className="mx-auto grid max-w-4xl grid-cols-2 gap-8 rounded-xl border bg-card p-8 md:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          {[
            { value: "50+", label: "Tablas en la base de datos" },
            { value: "6", label: "Agentes IA autónomos" },
            { value: "6", label: "Motores de cálculo" },
            { value: "9", label: "Roles configurables" },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeUp} className="space-y-1 text-center">
              <p className="text-3xl font-bold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────── Testimonials ─────────────────────── */

const testimonials = [
  {
    name: "Carlos Méndez",
    role: "Chef ejecutivo, La Taberna del Puerto",
    text: "Antes tardaba 2 horas semanales calculando escandallos en Excel. Con RestoOS lo tengo en tiempo real. Mi food cost bajó del 34% al 29% en dos meses.",
    rating: 5,
  },
  {
    name: "Ana García",
    role: "Propietaria, Bistró Galicia",
    text: "El control de inventario con alertas de caducidad nos ha reducido la merma un 40%. Y el modo cocina es exactamente lo que necesitaba para el servicio.",
    rating: 5,
  },
  {
    name: "Miguel Rodríguez",
    role: "Director de operaciones, Grupo Marea",
    text: "Probamos Apicbase y MarketMan antes. RestoOS entiende cómo funciona una cocina española de verdad. Y a un precio que tiene sentido para un independiente.",
    rating: 5,
  },
];

function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <MeshGradient
          className="absolute inset-0 h-full w-full opacity-25"
          colors={["#0A0A0A", "#3D2B1F", "#0A0A0A", "#B8906F", "#1C1917"]}
          speed={0.18}
          backgroundColor="#0A0A0A"
        />
      </div>
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          className="mx-auto max-w-xl space-y-4 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Testimonios
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold">
            Lo que dicen los chefs
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground">
            Restaurantes reales que ya están controlando sus costes con RestoOS.
          </motion.p>
        </motion.div>

        <motion.div
          className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              className="flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3 border-t pt-4">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────── Pricing ─────────────────────── */

const plans = [
  {
    name: "Control",
    badge: "",
    price: "99",
    annualPrice: "89",
    period: "/local/mes",
    description: "Deja Excel y recupera control de coste.",
    target: "1 restaurante independiente",
    featured: false,
    sections: [
      {
        label: "Cocina",
        items: [
          "Recetas con versionado",
          "Escandallo automático",
          "Escalado de recetas",
          "OCR de recetas (foto a ficha)",
          "Menús y secciones",
        ],
      },
      {
        label: "Operaciones",
        items: [
          "Catálogo de productos",
          "Gestión de proveedores",
          "Solicitudes y pedidos de compra",
          "Recepción de mercancía",
          "Inventario FIFO",
          "Control de mermas",
          "OCR de albaranes",
        ],
      },
      {
        label: "Gestión",
        items: [
          "Dashboard con KPIs",
          "Alertas básicas",
          "Modo Cocina (tablet)",
          "Soporte por email",
        ],
      },
    ],
    excluded: [
      "Ingeniería de Menú",
      "Forecasting y previsión",
      "Multi-local",
      "APPCC y compliance",
      "Facturación IA",
      "API / SSO",
    ],
    onboarding: "300",
    cta: "Solicitar demo",
  },
  {
    name: "Operaciones",
    badge: "Recomendado",
    price: "149",
    annualPrice: "129",
    period: "/local/mes",
    description: "Estandariza compras, stock y margen.",
    target: "Premium independiente o grupo pequeño",
    featured: true,
    sections: [
      {
        label: "Todo en Control, más:",
        items: [],
      },
      {
        label: "Cocina avanzada",
        items: [
          "Ingeniería de Menú (Matriz Boston)",
          "Recomendaciones IA semanales",
          "Motor de previsión de demanda",
        ],
      },
      {
        label: "Operaciones avanzadas",
        items: [
          "Motor de compras inteligente",
          "Sugerencias automáticas por proveedor",
          "Alertas avanzadas y aprobaciones",
          "Bóveda documental básica",
        ],
      },
      {
        label: "Facturación IA (Lite)",
        items: [
          "OCR de facturas con Gemini Vision",
          "Reconciliación factura ↔ albarán",
          "Detección de discrepancias",
          "50 documentos OCR/mes incluidos",
        ],
      },
      {
        label: "Gestión",
        items: [
          "Onboarding asistido",
          "3 integraciones",
          "Soporte prioritario",
        ],
      },
    ],
    excluded: [
      "Multi-local corporativo",
      "APPCC completo",
      "SSO / 2FA",
      "API abierta",
    ],
    onboarding: "600",
    cta: "Solicitar demo",
  },
  {
    name: "Grupo",
    badge: "Multi-local",
    price: "249",
    annualPrice: "219",
    period: "/local/mes",
    description: "Gobierna varios locales con trazabilidad y control central.",
    target: "Grupos de 3+ locales",
    featured: false,
    sections: [
      {
        label: "Todo en Operaciones, más:",
        items: [],
      },
      {
        label: "Multi-local",
        items: [
          "Vista multi-local y benchmarking",
          "Catálogos y precios por ubicación",
          "Permisos avanzados por rol y local",
        ],
      },
      {
        label: "Compliance incluido",
        items: [
          "APPCC completo (40+ plantillas)",
          "Cierre diario automático con hash",
          "Incidencias y acciones correctivas",
          "Lotes, etiquetas QR y códigos de barras",
          "Bóveda documental inmutable",
          "Retención legal automática",
        ],
      },
      {
        label: "Facturación IA (Pro)",
        items: [
          "300 documentos OCR/mes incluidos",
          "Ingesta automática por email",
          "Mensajes a proveedores automáticos",
          "Cola de reintentos",
        ],
      },
      {
        label: "Plataforma",
        items: [
          "API abierta",
          "SSO / 2FA",
          "Soporte dedicado",
          "SLA prioritario",
        ],
      },
    ],
    excluded: [],
    onboarding: "1.500",
    cta: "Hablar con ventas",
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
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
      {/* Subtle animated background for pricing */}
      <div className="absolute inset-0 -z-10">
        <MeshGradient
          className="absolute inset-0 h-full w-full opacity-30"
          colors={["#0A0A0A", "#1C1917", "#B8906F", "#0A0A0A", "#2C1E14"]}
          speed={0.15}
          backgroundColor="#0A0A0A"
        />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          className="mx-auto max-w-xl space-y-4 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-4xl font-extralight tracking-tight lg:text-5xl"
          >
            Precio por local.{" "}
            <span className="text-primary font-medium">Sin sorpresas.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
            Usuarios ilimitados. Sin permanencia. 10-12% descuento anual.
          </motion.p>
        </motion.div>

        {/* Plan cards */}
        <motion.div
          className="mt-12 grid gap-6 md:mt-20 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={stagger}
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              className={`
                relative flex flex-col rounded-2xl px-7 py-8
                backdrop-blur-[14px] shadow-xl
                bg-gradient-to-br from-white/[0.08] to-white/[0.02]
                border border-white/10
                ${plan.featured
                  ? "ring-2 ring-primary/30 from-white/[0.15] to-white/[0.06] border-primary/30 shadow-2xl shadow-primary/10"
                  : ""
                }
              `}
            >
              {plan.badge && (
                <div className={`absolute -top-3.5 right-4 rounded-full px-3 py-1 text-xs font-semibold ${
                  plan.featured
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 text-foreground border border-white/20"
                }`}>
                  {plan.badge}
                </div>
              )}

              {/* Plan name and target */}
              <div className="mb-4">
                <h3 className="text-3xl font-extralight tracking-tight leading-tight">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">{plan.target}</p>
              </div>

              {/* Price */}
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-4xl font-extralight tracking-tight tabular-nums">
                  {plan.price}€
                </span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="mb-5 text-xs text-muted-foreground">
                {plan.annualPrice}€ con plan anual
              </p>

              {/* Glassy divider */}
              <div className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Feature sections */}
              <div className="mb-6 flex flex-1 flex-col gap-4">
                {plan.sections.map((section) => (
                  <div key={section.label}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.label}
                    </p>
                    {section.items.length > 0 && (
                      <ul className="flex flex-col gap-1.5">
                        {section.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                {/* Excluded */}
                {plan.excluded.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">
                      No incluido
                    </p>
                    <ul className="flex flex-col gap-1">
                      {plan.excluded.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground/50">
                          <span className="size-3.5 shrink-0 text-center">—</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Onboarding */}
              <div className="mb-4 rounded-lg bg-white/[0.03] px-4 py-2.5 text-center">
                <p className="text-xs text-muted-foreground">
                  Onboarding asistido: <span className="font-semibold text-foreground/80">{plan.onboarding}€</span>
                  <span className="text-muted-foreground/50"> (una vez)</span>
                </p>
              </div>

              {/* CTA */}
              <a
                href="#contacto"
                className={`
                  w-full block cursor-pointer rounded-xl py-3 text-sm font-semibold text-center transition-all duration-200
                  ${plan.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-white/20 bg-white/10 text-foreground hover:bg-white/20"
                  }
                `}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </motion.div>

        {/* Enterprise */}
        <motion.div
          className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] px-8 py-6 text-center backdrop-blur-[14px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <h3 className="text-xl font-semibold">Enterprise</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadenas, hoteles, central kitchens. Integraciones custom, data migration, CSM dedicado, SLA y formación.
          </p>
          <a href="#contacto" className="mt-4 inline-block rounded-xl border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-white/20">
            Hablar con ventas
          </a>
        </motion.div>

        {/* Add-ons */}
        <motion.div
          className="mx-auto mt-16 max-w-4xl"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          <motion.h3 variants={fadeUp} className="mb-6 text-center text-xl font-semibold">
            Add-ons
          </motion.h3>
          <motion.div className="grid gap-px rounded-xl border bg-border sm:grid-cols-2" variants={stagger}>
            {addons.map((addon) => (
              <motion.div key={addon.name} variants={fadeUp} className="flex items-start justify-between gap-4 bg-background p-5">
                <div>
                  <p className="text-sm font-semibold">{addon.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{addon.note}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {addon.price}€<span className="font-normal text-muted-foreground">{addon.unit}</span>
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Founding Partner */}
        <motion.div
          className="mx-auto mt-12 max-w-2xl rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] px-8 py-6 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Programa limitado</p>
          <h3 className="mt-2 text-2xl font-semibold">Founding Partner</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Plan Operaciones a <span className="font-semibold text-foreground">119€/local/mes</span> durante 12 meses.
            Compliance Pack incluido 6 meses. Onboarding al 50%.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            10 plazas. Hasta 3 locales por cuenta. Compromiso anual.
          </p>
          <a href="#contacto" className="mt-4 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90">
            Solicitar plaza
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ─────────────────────── CTA Final ─────────────────────── */

function CTASection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <MeshGradient
          className="absolute inset-0 h-full w-full opacity-35"
          colors={["#0A0A0A", "#B8906F", "#3D2B1F", "#0A0A0A", "#2C1E14"]}
          speed={0.25}
          backgroundColor="#0A0A0A"
        />
      </div>
      <motion.div
        className="mx-auto max-w-3xl space-y-8 px-6 text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={stagger}
      >
        <motion.h2 variants={fadeUp} className="text-3xl font-bold lg:text-4xl">
          ¿Listo para controlar tu cocina?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
          Únete al programa de fundadores. Plazas limitadas a 20 restaurantes
          con precio preferente de por vida.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Link href="#pricing" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-12 px-8 text-base font-medium cursor-pointer hover:bg-primary/90">
            Reservar mi plaza
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─────────────────────── Footer ─────────────────────── */

function Footer() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <ChefHat className="size-5 text-primary" />
          <span className="font-semibold">RestoOS</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 RestoOS. Hecho en A Coruña con experiencia real de cocina.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="mailto:hola@restoos.app" className="transition-colors hover:text-foreground">
            Contacto
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────── Page ─────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
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
