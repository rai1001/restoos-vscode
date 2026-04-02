# RestoOS Design System

## Theme: Calm Darkness

Negro mate, sin brillos. El color SOLO aparece cuando algo necesita tu
atencion. Todo lo demas esta en silencio. El ojo del chef va directo a
lo que importa.

## Product Context
- **What this is:** SaaS de gestion de restaurante (escandallos, APPCC, inventario, ingenieria de menu)
- **Who it's for:** Jefes de cocina y gerentes de restaurante medio (2-8 locales) en Espana
- **Space:** Restaurant management (Apicbase, MarketMan, Toast, Lightspeed)
- **Project type:** Dark-first web app / dashboard

## Aesthetic Direction
- **Direction:** Calm Darkness
- **Decoration level:** Minimal. Sin ornamentos.
- **Mood:** Taller de relojero, no cockpit de avion. Silencio visual, precision.
- **Principle:** Si no es una alerta, no tiene color. Los KPIs son numeros claros sobre negro. Las categorias son texto gris. Solo lo critico usa color.

## Typography

Una sola familia: **DM Sans** (Google Fonts). Limpia, geometrica, excelente legibilidad.

| Element | Size | Weight | Color | Notes |
|---------|------|--------|-------|-------|
| Page title | 28px | 700 | `--fg-strong` | letter-spacing: -0.01em |
| Section label | 13px | 600 | `--muted` | uppercase, tracking: 0.12em |
| Body text | 15px | 400 | `--fg` | line-height: 1.6 |
| Table body | 14px | 400 | `--fg` | |
| Table headers | 12px | 600 | `--muted` | uppercase, tracking: 0.1em |
| Caption/meta | 13px | 400 | `--muted` | |
| KPI value | 24px | 700 | `--fg-strong` | tabular-nums |
| Button | 14px | 600 | varies | |

**Minimum text size:** 12px (table headers only). Body never below 14px.
**Font loading:** Google Fonts CDN, `font-display: swap`.
**No monospace for data.** Los numeros usan DM Sans con `font-variant-numeric: tabular-nums`.

## Color

**Approach:** Ultra-restrained. Color = alerta. Todo lo demas es escala de grises calidos.

### Surfaces
| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#090909` | Page background (near-black matte) |
| `--sidebar` | `#0F0F0F` | Sidebar background |
| `--card` | `#141414` | Card/panel background |
| `--card-hover` | `#1A1A1A` | Card hover state |
| `--elevated` | `#1E1E1E` | Popovers, dialogs |

### Text (warm grays, NOT pure white)
| Token | Value | Usage |
|-------|-------|-------|
| `--fg-strong` | `#E0DCDA` | Titles, KPI values, emphasis |
| `--fg` | `#C8C2BF` | Body text, table data |
| `--muted-light` | `#8A8078` | Tertiary text |
| `--muted` | `#706860` | Labels, metadata, section headers |

### Borders (barely visible)
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(255,255,255,0.04)` | Default borders |
| `--border-hover` | `rgba(255,255,255,0.08)` | Hover/focus borders |

### Color: ONLY for alerts and brand accent
| Token | Value | When to use |
|-------|-------|-------------|
| `--alert-critical` | `#DC4A4A` | Accion inmediata requerida |
| `--alert-warning` | `#D4920A` | Atencion necesaria |
| `--alert-ok` | `#2D8A56` | Resuelto/confirmado (nunca como estado default) |
| `--accent` | `#B8906F` | CTAs, nav activa, links. Warm bronze. |

### Color Rules
1. **KPIs: NO color.** Numeros en `--fg-strong`. Color SOLO si el KPI esta fuera de rango.
2. **Tablas: NO color.** Filas en gris. Color solo en la columna de alertas.
3. **Badges status neutral:** `rgba(255,255,255,0.03)` background con texto `--muted-light`. Sin color.
4. **Verde solo confirma resolucion.** Nunca como estado por defecto.
5. **Naranja #F97316 se retira.** Reemplazado por bronze #B8906F (mas calido, menos electrico).

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** xs(4) sm(8) md(12) lg(16) xl(24) 2xl(32) 3xl(48)
- Card padding: 16px-20px
- Section gap: 24px
- Page padding: 24px

## Layout
- **Approach:** Grid disciplinado
- **Sidebar:** Fixed left, 64px collapsed / 256px expanded
- **Content:** Scrollable, max-width fluid
- **Border radius:** 6px default, 8px cards, 10px dashboard containers
- **Grid:** Responsive con sm, md, lg breakpoints

## Motion
- **Approach:** Minimal-functional
- **Easing:** ease-out para entradas, ease-in para salidas
- **Duration:** 100-200ms transiciones de hover/focus. Nada mas lento.
- **Rule:** Si no ayuda a entender un cambio de estado, no animes.

## Anti-Patterns (DO NOT)

1. **No color en KPIs** excepto alertas
2. **No badges de color** para estados normales (usar gris neutro)
3. **No naranja electrico** (#F97316 retirado, usar bronze #B8906F)
4. **No colored left-border** en cards (border-l-4 prohibido)
5. **No hardcoded hex** (usar CSS tokens siempre)
6. **No texto menor de 12px** (y body nunca menor de 14px)
7. **No emojis** como elementos de diseno
8. **No gradientes decorativos**
9. **No multiples colores compitiendo** en la misma vista
10. **No blanco puro** (#FFFFFF) para texto. Usar warm off-whites.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-02 | Calm Darkness direction | Chef pidio: negro mate, sin brillos, legible, sin semaforo, solo alertas con color |
| 2026-04-02 | DM Sans unica familia | Una sola fuente, consistencia total, tabular-nums para datos |
| 2026-04-02 | Bronze #B8906F accent | Reemplaza naranja electrico. Mas calido, discreto, guia sin gritar |
| 2026-04-02 | Letras mas grandes | Body 15px, KPIs 24px. Legibilidad en entorno de cocina |
| 2026-04-02 | Color = alerta only | Si no es critico/warning, no tiene color. Reduce ruido visual |
