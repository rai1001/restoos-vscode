// ChefOS Service Worker — offline support for static assets and API caching
const STATIC_CACHE = "chefos-static-v2"
const API_CACHE = "chefos-api-v2"

// Assets to cache immediately on install
const PRECACHE_URLS = [
  "/",
  "/recipes",
  "/events",
  "/inventory",
  "/appcc",
  "/operations",
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
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
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

  // Skip Supabase API calls — always fresh
  if (url.pathname.startsWith("/rest/v1") || url.hostname.includes("supabase")) return

  // Network-first for navigation and API routes
  if (request.mode === "navigate" || url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached ?? new Response("Offline", { status: 503 })))
    )
    return
  }

  // Cache-first for static assets (_next/static, fonts, images)
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
})
