export interface CommandItem {
  id: string
  type: "navigation" | "action" | "recipe" | "event" | "product"
  label: string
  description?: string
  keywords?: string[]
  href?: string
  icon?: string  // lucide icon name as string
  shortcut?: string
}

export const NAVIGATION_COMMANDS: CommandItem[] = [
  { id: "nav-dashboard", type: "navigation", label: "Dashboard", description: "KPIs y métricas ejecutivas", href: "/", icon: "LayoutDashboard", keywords: ["inicio", "home", "kpi"] },
  { id: "nav-recipes", type: "navigation", label: "Recetas", description: "Gestión de recetas", href: "/recipes", icon: "ChefHat", keywords: ["recetas", "cocina"] },
  { id: "nav-recipes-new", type: "navigation", label: "Nueva receta", description: "Crear nueva receta", href: "/recipes/new", icon: "Plus", keywords: ["crear receta", "nueva receta"] },
  { id: "nav-reservations", type: "navigation", label: "Reservas", description: "Gestión de reservas", href: "/reservations", icon: "CalendarDays", keywords: ["reservas", "mesas", "turnos"] },
  { id: "nav-pos", type: "navigation", label: "TPV", description: "Terminal punto de venta", href: "/pos", icon: "CreditCard", keywords: ["tpv", "cobrar", "pedidos", "caja"] },
  { id: "nav-delivery", type: "navigation", label: "Delivery", description: "Pedidos a domicilio", href: "/delivery", icon: "Truck", keywords: ["delivery", "glovo", "uber", "domicilio"] },
  { id: "nav-digital-menu", type: "navigation", label: "Carta Digital", description: "Carta QR y menú público", href: "/digital-menu", icon: "UtensilsCrossed", keywords: ["carta", "qr", "menú digital"] },
  { id: "nav-loyalty", type: "navigation", label: "Fidelización", description: "Programa de puntos", href: "/loyalty", icon: "Gift", keywords: ["fidelización", "puntos", "clientes"] },
  { id: "nav-procurement", type: "navigation", label: "Pedidos de compra", description: "Órdenes de compra", href: "/procurement/orders", icon: "ShoppingCart", keywords: ["compras", "pedidos", "proveedores"] },
  { id: "nav-procurement-requests", type: "navigation", label: "Solicitudes de compra", href: "/procurement/requests", icon: "ClipboardList" },
  { id: "nav-inventory", type: "navigation", label: "Inventario", description: "Stock y movimientos", href: "/inventory", icon: "Package", keywords: ["stock", "almacén", "inventario"] },
  { id: "nav-inventory-lots", type: "navigation", label: "Lotes", href: "/inventory/lots", icon: "Layers" },
  { id: "nav-inventory-movements", type: "navigation", label: "Movimientos de stock", href: "/inventory/movements", icon: "ArrowRightLeft" },
  { id: "nav-menus", type: "navigation", label: "Menús", href: "/menus", icon: "UtensilsCrossed", keywords: ["menús", "carta"] },
  { id: "nav-menu-engineering", type: "navigation", label: "Ingeniería de menú", href: "/menu-engineering", icon: "TrendingUp", keywords: ["boston matrix", "rentabilidad", "popularidad"] },
  { id: "nav-escandallo", type: "navigation", label: "Escandallo dinámico", href: "/escandallo", icon: "Calculator", keywords: ["costes", "escandallo", "food cost"] },
  { id: "nav-staffing", type: "navigation", label: "Personal", href: "/staffing", icon: "Users2", keywords: ["staff", "turnos", "personal"] },
{ id: "nav-appcc", type: "navigation", label: "APPCC", description: "Control de puntos críticos", href: "/appcc", icon: "ShieldCheck", keywords: ["haccp", "seguridad alimentaria", "temperatura"] },
  { id: "nav-catalog-products", type: "navigation", label: "Productos", href: "/catalog/products", icon: "Package", keywords: ["catálogo", "productos"] },
  { id: "nav-catalog-suppliers", type: "navigation", label: "Proveedores", href: "/catalog/suppliers", icon: "Truck", keywords: ["proveedores"] },
  { id: "nav-catalog-categories", type: "navigation", label: "Categorías", href: "/catalog/categories", icon: "FolderTree" },
  { id: "nav-catalog-units", type: "navigation", label: "Unidades", href: "/catalog/units", icon: "Ruler" },
  { id: "nav-forecasting", type: "navigation", label: "Previsión de demanda", description: "Pronóstico de demanda futura", href: "/forecasting", icon: "TrendingUp", keywords: ["previsión", "forecast", "demanda", "pronóstico"] },
  { id: "nav-alerts", type: "navigation", label: "Alertas", href: "/alerts", icon: "Bell", keywords: ["alertas", "avisos"] },
{ id: "nav-settings", type: "navigation", label: "Configuración", href: "/settings", icon: "Settings", keywords: ["ajustes", "config"] },
]

// Mock recipe suggestions for search
export const RECIPE_COMMANDS: CommandItem[] = [
  { id: "recipe-risotto", type: "recipe", label: "Risotto de setas", description: "Principal · €4.20/ración", href: "/recipes", keywords: ["risotto", "setas", "arroz"] },
  { id: "recipe-salmon", type: "recipe", label: "Salmón a la plancha", description: "Principal · €6.80/ración", href: "/recipes", keywords: ["salmón", "pescado"] },
  { id: "recipe-tiramisu", type: "recipe", label: "Tiramisú clásico", description: "Postre · €2.10/ración", href: "/recipes", keywords: ["tiramisú", "postre", "café"] },
  { id: "recipe-gazpacho", type: "recipe", label: "Gazpacho andaluz", description: "Entrante · €1.40/ración", href: "/recipes", keywords: ["gazpacho", "tomate", "frío"] },
  { id: "recipe-croquetas", type: "recipe", label: "Croquetas de jamón", description: "Snack · €1.80/ración", href: "/recipes", keywords: ["croquetas", "jamón"] },
]
