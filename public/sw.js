// RestoOS Service Worker — offline support for static assets
const STATIC_CACHE = "restoos-static-v3"

// Only precache truly static, public assets — never auth-protected routes
const PRECACHE_URLS = [
  "/manifest.json",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently fail for precaching — app will still work online
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return

  // Skip Supabase, API routes, and auth endpoints — always fresh
  if (
    url.pathname.startsWith("/rest/v1") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/callback") ||
    url.hostname.includes("supabase")
  ) return

  // Cache-first for static assets only (_next/static, fonts, images)
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/fonts")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first for navigation — do NOT cache auth-redirected responses
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached ?? new Response("Offline", { status: 503 }))
      )
    )
    return
  }
})
