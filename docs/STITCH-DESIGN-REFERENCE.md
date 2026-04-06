# ChefOS — Stitch Design Reference

## Source: C:\culinary claude\stitch_chefos_kitchen_management_saas\

## 8 Reference Screens (PNG + HTML)
1. **Dashboard Matte Kitchen** — KPIs con borde naranja izq, charts area+line, eventos tabla, alertas
2. **Dashboard Executive** — 6 KPIs, top 5 platos, alertas etiquetado, ingresos 7d, food cost real vs obj, eventos, modulos, briefing IA
3. **Dashboard** — 3 KPIs grandes + 3 small, centro alertas, ingresos+food cost charts, top platos, eventos, quick actions bottom bar
4. **Escandallo Solomillo** — 4 KPIs (coste, margen obj, PVP, margen real), tabla ingredientes con merma, donut costes, mise en place numerada, alergenos iconos, foto plato
5. **Biblioteca Recetas** — Cards con fotos grandes, badges categoria, coste/racion, tiempo, filtros temporada+categoria, grid 4 cols
6. **Catalogo y Compras** — Comparativa precios, proveedores homologados cards, carrito lateral, ultimos pedidos
7. **Inventario** — KPIs (valor stock, bajo minimo, rotacion, mermas), tabla con thumbnails, rendimiento chart, entregas programadas
8. **Informes** — Food cost evolucion, pareto mermas, ingenieria menu tabla, ventas vs objetivos, hallazgos operativos

## 2 Design System Documents (DESIGN.md)
- **Haute** — "The Culinary Alchemist" — premium, glass+gradient, xl corners, backdrop-blur sidebar
- **Matte Kitchen** — "The Tactical Monolith" — austere, no shadows, sm corners, anti-gloss, instrument-grade

## Chosen Direction: MATTE KITCHEN (confirmed by user preference)

## Key Design Tokens
- Surface (bg): #0A0A0A
- Sidebar: #111111
- Cards: #1A1A1A
- Interactive: #2A2A2A
- Modals: #353534
- Primary accent: #B8906F
- Text primary: #E5E2E1
- Text secondary: #A78B7D
- Ghost border: #584237 at 15% opacity
- Font: Inter
- Label: 0.6875rem, ALL CAPS, tracking +0.05em
- Display: 3.5rem, tracking -0.02em

## Rules
- NO borders (use tonal shift only)
- NO shadows (value-based elevation)
- NO gradients (matte only)
- NO pure white (use #E5E2E1)
- NO dividers (use spacing gaps)
- KPIs: 4px left accent bar (orange/green/red)
- Corners: sm (0.125rem) or none
- Spanish culinary terminology
- 60%+ screen is #0A0A0A
