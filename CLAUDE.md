# RestoOS

## Estado del proyecto (actualizado 2026-04-12)

**Estado: ACTIVO** — Lanzamiento en curso. Deploy activo en Vercel y foco puesto en cerrar onboarding, billing y activacion real.

El codigo esta en fase activa de lanzamiento. Deploy activo en Vercel. Supabase real con 42 migraciones + RLS.

### Que esta hecho
- 50+ paginas, 11+ API routes, 6 motores de calculo
- Supabase real: PostgreSQL + RLS + RBAC (8 roles) + Auth
- Import masivo: CSV ventas (desde TPV), Excel/CSV recetas, OCR imagen, voz
- POS bridge: CSV import desde Cashlogy, ICG, Sighore (no API real)
- Landing + blog MDX + SEO + sitemap
- Security audit completada (2026-04-03)
- Design system: Calm Darkness (bronze #B8906F, DM Sans)
- Demo data: Grupo Culuca (4 locales, 71 productos, 24 recetas, 15 proveedores)
- Stripe integrado (checkout, portal, webhook)
- Onboarding persistente con 3 vias de import (OCR, Excel/CSV, Templates)
- Security hardening (CSP, CORS, rate limiting, API key fix)
- Trial 7 dias sin tarjeta
- Settings > Billing page
- Feature gating por plan
- Migration 042 (onboarding + subscriptions)
- Nuevas API routes: /api/onboarding, /api/billing/checkout, /api/billing/portal, /api/webhooks/stripe

### Blocker critico pendiente
1. **Configurar env vars Stripe en Vercel + crear productos en Stripe Dashboard** — El codigo esta listo, pero falta cerrar la configuracion de produccion para poder cobrar.

### Pendientes no bloqueantes
- Integracion POS API real (Lightspeed, Square, Toast) — el CSV bridge funciona como MVP
- Import masivo de catalogo completo (productos, proveedores bulk)
- Integraciones terceros (Glovo, UberEats)
- API publica documentada

### Mercado objetivo
- 882 grupos organizados en Espana, 16.300+ locales (Alimarket 2025)
- Sweet spot: grupos 2-10 locales con dolor de control
- Pricing actual: 129 EUR/mes flat (estudio recomienda pricing por local + add-ons)
- Competidores: Haddock (85-120 EUR), Prezo, Apicbase (300+ EUR)

## Design System
Always read DESIGN.md before making any visual or UI decisions.
Theme: Calm Darkness. Color ONLY for alerts. No semaphore KPIs.
Accent: bronze #B8906F (not orange #F97316).
Font: DM Sans only. Body 15px minimum.
Do not deviate without explicit user approval.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
