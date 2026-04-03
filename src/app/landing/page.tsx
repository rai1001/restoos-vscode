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
          colors={["#000000", "#7C2D12", "#F97316", "#1C1917", "#431407"]}
          speed={0.3}
          backgroundColor="#0A0A0A"
        />
        <MeshGradient
          className="absolute inset-0 h-full w-full opacity-40"
          colors={["#000000", "#FFFFFF", "#F97316", "#000000"]}
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

const features = [
  {
    icon: ChefHat,
    title: "Recetas y Escandallos",
    description:
      "Calcula el coste por ración en segundos. Importa recetas con IA y genera fichas técnicas profesionales.",
  },
  {
    icon: Calculator,
    title: "Control de Costes",
    description:
      "Food cost en tiempo real. Matriz Boston para ingeniería de menú. Detecta platos que no rinden.",
  },
  {
    icon: Package,
    title: "Inventario Inteligente",
    description:
      "FIFO automático, alertas de caducidad, control de merma. Sabe qué tienes y cuándo caduca.",
  },
  {
    icon: Truck,
    title: "Compras y Proveedores",
    description:
      "Órdenes de compra automáticas basadas en stock mínimo. OCR de albaranes para entrada rápida.",
  },
  {
    icon: ShieldCheck,
    title: "APPCC y Cumplimiento",
    description:
      "Checklists digitales, registro de temperaturas, exportación PDF lista para Sanidad.",
  },
  {
    icon: Flame,
    title: "Modo Cocina",
    description:
      "Vista tablet para el servicio. Mise en place, tareas por estación, temporizadores integrados.",
  },
];

function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <MeshGradient
          className="absolute inset-0 h-full w-full opacity-20"
          colors={["#0A0A0A", "#431407", "#F97316", "#1C1917", "#0A0A0A"]}
          speed={0.12}
          backgroundColor="#0A0A0A"
        />
      </div>
      <div className="mx-auto max-w-5xl space-y-16 px-6">
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
            6 módulos diseñados por un chef con 27 años de experiencia en cocinas profesionales.
          </motion.p>
        </motion.div>

        <motion.div
          className="mx-auto grid max-w-4xl gap-px rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="group cursor-pointer space-y-3 bg-background p-8 transition-colors hover:bg-card"
            >
              <div className="flex items-center gap-2.5">
                <f.icon className="size-5 text-primary" />
                <h3 className="text-sm font-semibold">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
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
          colors={["#0A0A0A", "#7C2D12", "#0A0A0A", "#F97316", "#1C1917"]}
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
    name: "Fundador",
    badge: "Plazas limitadas",
    price: "59",
    period: "/mes",
    description: "Para los primeros 20 restaurantes. Precio de por vida.",
    featured: false,
    features: [
      "5 módulos completos",
      "Hasta 200 recetas",
      "Inventario FIFO",
      "Alertas de caducidad",
      "OCR albaranes",
      "Soporte por email",
      "Acceso tablet (PWA)",
    ],
    cta: "Reservar plaza",
  },
  {
    name: "Profesional",
    badge: "Más popular",
    price: "79",
    period: "/mes",
    description: "Todo lo que necesitas. Sin permanencia.",
    featured: true,
    features: [
      "Todo en Fundador",
      "Recetas ilimitadas",
      "Modo Cocina completo",
      "APPCC y cumplimiento",
      "Menu Engineering",
      "Informes mensuales PDF",
      "Soporte prioritario",
      "API acceso datos",
    ],
    cta: "Empezar prueba gratis",
  },
  {
    name: "Combo",
    badge: "Máximo valor",
    price: "199",
    period: "/mes",
    description: "RestoOS + AutoChef. Gestión + automatización.",
    featured: false,
    features: [
      "Todo en Profesional",
      "Contenido semanal IA",
      "Gestión de reseñas",
      "Chatbot reservas WhatsApp",
      "Analytics avanzados",
      "Dashboard reputación",
      "Soporte dedicado",
      "Onboarding personalizado",
    ],
    cta: "Contactar ventas",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
      {/* Subtle animated background for pricing */}
      <div className="absolute inset-0 -z-10">
        <MeshGradient
          className="absolute inset-0 h-full w-full opacity-30"
          colors={["#0A0A0A", "#1C1917", "#F97316", "#0A0A0A", "#431407"]}
          speed={0.15}
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
          <motion.h2
            variants={fadeUp}
            className="text-4xl font-extralight tracking-tight lg:text-5xl"
          >
            Encuentra el{" "}
            <span className="text-primary font-medium">plan perfecto</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-muted-foreground">
            Sin sorpresas. Sin permanencia. Cancela cuando quieras.
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-12 flex flex-col items-center justify-center gap-6 md:mt-20 md:flex-row md:gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={fadeUp}
              whileHover={{ scale: 1.03, y: -4 }}
              transition={{ duration: 0.3, ease: "easeOut" as const }}
              className={`
                relative flex max-w-xs flex-1 flex-col rounded-2xl px-7 py-8
                backdrop-blur-[14px] shadow-xl transition-shadow
                bg-gradient-to-br from-white/[0.08] to-white/[0.02]
                border border-white/10
                ${plan.featured
                  ? "scale-105 ring-2 ring-primary/30 from-white/[0.15] to-white/[0.06] border-primary/30 shadow-2xl shadow-primary/10"
                  : "hover:shadow-lg"
                }
              `}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 right-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {plan.badge}
                </div>
              )}

              <div className="mb-3">
                <h3 className="text-[2.5rem] font-extralight tracking-tight leading-tight">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="my-5 flex items-baseline gap-2">
                <span className="text-[2.5rem] font-extralight tracking-tight">
                  €{plan.price}
                </span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              {/* Glassy divider */}
              <div className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <ul className="mb-6 flex flex-col gap-2.5 text-sm text-foreground/80">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#contacto"
                className={`
                  mt-auto w-full block cursor-pointer rounded-xl py-3 text-sm font-semibold text-center transition-all duration-200
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
          colors={["#0A0A0A", "#F97316", "#7C2D12", "#0A0A0A", "#431407"]}
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
          © 2026 CulinaryOS. Hecho en A Coruña con experiencia real de cocina.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <a href="#" className="transition-colors hover:text-foreground">
            Privacidad
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            Términos
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
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
