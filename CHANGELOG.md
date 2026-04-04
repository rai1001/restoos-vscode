# Changelog

Todos los cambios relevantes en RestoOS se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Añadido
- Sub-recetas: recetas como ingredientes de otras recetas (migración 39)
- Datos sintéticos para testing en producción
- Script `npm run seed` para carga automática de datos demo
- Páginas de error personalizadas (404 y error genérico) con branding

### Corregido
- Recursión infinita en política RLS de memberships (migración 38)
- Service worker: error `Response body is already used` al cachear assets estáticos
- Manifest PWA: separar `purpose` de iconos para compatibilidad con Chrome

### Seguridad
- Fix RBAC overbreadth (migración 37)
- Fix aislamiento de feedback tickets (migración 36)
- Document vault: inmutabilidad y hash único (migraciones 34-35)

## [0.1.0] - 2026-03-28

### Añadido
- Lanzamiento inicial: 10 módulos, 39 migraciones, 6 agentes IA
- Multi-tenant con RLS completo (4 locales demo)
- 6 motores de cálculo (coste, demanda, forecast, margen, procurement, scaling)
- CLARA agent: pipeline OCR facturas + conciliación + mensajería
- Pipeline CI: TypeScript + ESLint + Vitest + Playwright + Slack
- PWA: service worker + manifest + install prompt
- Design system Calm Darkness documentado en DESIGN.md
