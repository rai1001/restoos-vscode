# ChefOS/RestoOS — Estrategia Mobile

## Objetivo
App movil para cocineros, camareros y dueños de restaurantes pequeños.
Cuota reducida (9-19€/mes). Android + iOS.

---

## 3 Caminos Posibles

### Opcion A: PWA (Progressive Web App) — RECOMENDADA para empezar

**Esfuerzo:** 1-2 dias
**Coste:** 0€
**Resultado:** App instalable desde Chrome, funciona offline parcial

La app Next.js que ya tenemos se convierte en PWA con:
- `next-pwa` package
- manifest.json (icono, nombre, colores)
- Service worker para cache offline
- Meta tags para fullscreen

**Ventajas:**
- Cero reescritura — la app ya es responsive
- Se instala como app nativa desde el navegador
- Sin app stores, sin review de Apple (deploy instantaneo)
- Actualizaciones inmediatas (no esperar aprobacion)
- Comparte 100% del codigo con web

**Limitaciones:**
- No aparece en App Store/Play Store (menos descubrimiento)
- Push notifications limitadas en iOS
- Acceso a camara/mic funciona pero con limitaciones Safari
- No se siente 100% nativa (gestos, transiciones)

**Para quien:** MVP rapido, validar mercado, primeros 100 usuarios.

### Opcion B: Capacitor (web → native shell) — RECOMENDADA para produccion

**Esfuerzo:** 1-2 semanas
**Coste:** 99€/año Apple Developer + 25€ one-time Google Play
**Resultado:** App nativa en stores, acceso a APIs nativas

Capacitor (de Ionic) envuelve la web app en un WebView nativo, dando acceso a:
- Camara nativa (mejor OCR)
- Microfono nativo (mejor voz)
- Push notifications reales
- Haptic feedback
- Biometria (Face ID / huella)
- App Store / Play Store

**Ventajas:**
- 95% del codigo es el mismo Next.js/React
- Solo se añade una capa nativa fina
- Acceso real a APIs del dispositivo
- Aparece en App Store y Play Store
- Se puede combinar con PWA (web + native)

**Limitaciones:**
- Rendimiento ligeramente inferior a nativo puro
- UI sigue siendo web (no componentes nativos)
- Necesita buildear para cada plataforma

**Para quien:** Produccion real, 100-10.000 usuarios, necesitas stores.

### Opcion C: React Native / Expo — FUTURO

**Esfuerzo:** 2-3 meses
**Coste:** Tiempo de desarrollo
**Resultado:** App 100% nativa, mejor UX

Reescritura de la UI con componentes nativos. Los engines (6 funciones puras JS) se reutilizan directamente.

**Ventajas:**
- UX nativa real (gestos, transiciones, velocidad)
- Mejor rendimiento
- Componentes nativos del OS

**Limitaciones:**
- Reescritura total de la UI (38 paginas)
- Mantener 2 codebases (web + mobile)
- Mas tiempo, mas coste

**Para quien:** Escala (10.000+ usuarios), cuando la facturacion lo justifique.

---

## Recomendacion: PWA ahora → Capacitor en 1 mes

```
Semana 1:  PWA → validar que cocineros usan el movil
Semana 3:  Capacitor → subir a stores con camara/mic nativos
Mes 3+:    Evaluar si React Native merece la pena
```

---

## Plan PWA (1-2 dias)

### Paso 1: Instalar next-pwa

```bash
npm install next-pwa
```

### Paso 2: Crear manifest.json

```
public/manifest.json
```

```json
{
  "name": "RestoOS",
  "short_name": "RestoOS",
  "description": "Gestion integral para tu restaurante",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0A0A0A",
  "theme_color": "#F97316",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Paso 3: Config next.config.ts

```typescript
import withPWA from "next-pwa";

const config = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})({
  // existing next config...
});
```

### Paso 4: Meta tags en layout.tsx

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#F97316" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### Paso 5: Splash screen iOS

Generar splash screens para diferentes tamaños de iPhone/iPad.

---

## Plan Capacitor (1-2 semanas)

### Paso 1: Setup

```bash
npm install @capacitor/core @capacitor/cli
npx cap init RestoOS com.restoos.app
npm install @capacitor/android @capacitor/ios
```

### Paso 2: Plugins nativos

```bash
npm install @capacitor/camera      # OCR recetas
npm install @capacitor/microphone  # Dictado voz
npm install @capacitor/haptics     # Feedback tactil
npm install @capacitor/push-notifications
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/keyboard
```

### Paso 3: Build y sync

```bash
npm run build                      # Build Next.js
npx cap add android
npx cap add ios
npx cap sync                       # Copia build a native projects
npx cap open android               # Abre Android Studio
npx cap open ios                   # Abre Xcode
```

### Paso 4: Adaptaciones mobile

| Adaptacion | Detalle |
|-----------|---------|
| Navigation | Bottom tab bar para mobile (Dashboard, Reservas, TPV, Mas) |
| Camera | Usar plugin Capacitor en vez de input[type=file] |
| Voice | Usar plugin nativo en vez de Web Speech API |
| Push | Notificaciones para nuevas reservas, pedidos delivery |
| Offline | Cache de recetas y carta para consulta sin conexion |
| Haptics | Feedback al confirmar acciones (reserva, cobro) |

### Paso 5: Publicar

```bash
# Android
npx cap build android              # Genera APK/AAB
# Subir a Google Play Console

# iOS
npx cap build ios                  # Genera archive
# Subir desde Xcode a App Store Connect
```

---

## App Mobile: Que pantallas priorizar

No todas las 38 paginas necesitan estar en mobile. Para un cocinero o camarero en el dia a dia:

### Tier 1 — Pantallas diarias (mobile-first)

| Pantalla | Usuario | Accion principal |
|----------|---------|-----------------|
| Dashboard | Todos | Ver KPIs del dia |
| Reservas hoy | Host/Camarero | Ver, crear, sentar |
| TPV | Camarero | Tomar pedido, cobrar |
| Comandas cocina | Cocinero | Ver y marcar pedidos |
| Carta digital | Cliente | Ver menu QR |

### Tier 2 — Consulta frecuente

| Pantalla | Usuario | Accion |
|----------|---------|--------|
| Recetas | Cocinero | Consultar receta, escandallo |
| Inventario rapido | Jefe cocina | Ajustar stock, registrar merma |
| Delivery | Manager | Ver pedidos entrantes |
| APPCC | Cocinero | Registrar temperatura |

### Tier 3 — Gestion (mejor en desktop)

| Pantalla | Usuario |
|----------|---------|
| Ing. Menu, Forecast, Compras, Informes, Config | Manager/Dueño |

---

## Pricing Mobile

### Plan "Cocina" — 9€/mes
- 1 usuario
- Dashboard + Recetas + Escandallo
- Inventario basico
- APPCC
- Sin TPV, sin reservas

**Para quien:** Cocinero autonomo, food truck, cocina fantasma

### Plan "Restaurante" — 19€/mes
- 5 usuarios
- Todo Plan Cocina
- Reservas (hasta 50/dia)
- TPV basico
- Carta digital QR
- Push notifications

**Para quien:** Bar de barrio, restaurante pequeño (20-40 cubiertos)

### Plan "Profesional" — 49€/mes
- 15 usuarios
- Todo Plan Restaurante
- Delivery (Glovo/Uber/JustEat)
- Ing. Menu + Forecast
- Fidelizacion
- Informes avanzados
- Compras con sugerencias

**Para quien:** Restaurante mediano (40-100 cubiertos), gastrobar

### Plan "Multi" — 99€/mes
- Usuarios ilimitados
- Multi-local
- API acceso
- Soporte prioritario

---

## Calendario

```
Semana 1:   PWA + iconos + manifest → deploy Vercel
            → Ya instalable como app desde Chrome

Semana 2:   Capacitor setup + camera + mic plugins
            → Build Android APK para testing

Semana 3:   Bottom tab navigation mobile
            → Adaptar TPV y Reservas a touch-first

Semana 4:   Push notifications + offline cache
            → Subir a Play Store (beta)

Mes 2:      App Store (iOS) + feedback usuarios
            → Iterar UX mobile

Mes 3:      Evaluar React Native si metricas lo justifican
```

---

## Stack Tecnico Final

```
Web:     Next.js 16 + Tailwind + shadcn/ui + Supabase
PWA:     next-pwa (service worker + manifest)
Mobile:  Capacitor (Android + iOS)
Backend: Supabase (auth + DB + storage + realtime)
Push:    Supabase + Firebase Cloud Messaging
OCR:     Mistral Vision (API) + Capacitor Camera
Voz:     Web Speech API / Capacitor Speech Recognition
Deploy:  Vercel (web) + Play Store + App Store
```
