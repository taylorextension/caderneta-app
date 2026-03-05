const CACHE_NAME = 'caderneta-v2'

self.addEventListener('install', (event) => {
  // Don't skipWaiting automatically — wait for the user to accept the update
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  const sameOrigin = url.origin === self.location.origin

  // Don't cache cross-origin requests, API calls, Supabase requests, auth pages or HTML documents
  if (
    !sameOrigin ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/auth/') ||
    event.request.mode === 'navigate' ||
    event.request.destination === 'document'
  ) {
    return
  }

  // Cache only static assets to avoid storing authenticated HTML/data pages.
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    ['style', 'script', 'image', 'font'].includes(event.request.destination)

  if (!isStaticAsset) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Listen for skip waiting message from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
