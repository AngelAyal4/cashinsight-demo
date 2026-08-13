const CACHE_NAME = 'cashinsight-shell-v1';
const SHELL_URLS = ['/', '/login', '/perfil'];
const STATIC_EXTENSIONS = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function revalidate(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => undefined);
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    // No se sirven respuestas redirigidas ni con URL distinta a la pedida:
    // el precache de rutas autenticadas que redirigen (307 -> /login) cachea
    // la respuesta final, y devolverla para una navegación rompe la carga.
    if (cached && !cached.redirected && cached.url === request.url) {
      revalidate(request);
      return cached;
    }

    return revalidate(request).then((response) => response || undefined);
  });
}

function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const network = revalidate(request);
    return cached || network;
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  // Los datos siempre salen a la red: no se cachea la API.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    STATIC_EXTENSIONS.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  const targetHref = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (new URL(client.url).origin === self.location.origin) {
            return client.focus().then((focused) => {
              if (focused && 'navigate' in focused) {
                return focused.navigate(targetHref);
              }
              return focused;
            });
          }
        }

        return self.clients.openWindow(targetHref);
      })
  );
});

self.addEventListener('notificationclose', () => {
  // Sin acción: el cierre no dispara navegación ni analítica.
});
