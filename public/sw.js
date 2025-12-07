/**
 * Service Worker per Enciclopedia della Vita
 * Permette funzionalità offline e installazione come PWA
 */

const CACHE_NAME = 'nur-cache-v1';
const OFFLINE_URL = '/offline.html';

// Risorse da cachare immediatamente
const PRECACHE_URLS = [
    '/',
    '/chat',
    '/la-mia-vita',
    '/giornale',
    '/offline.html',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Installa il service worker e cacha le risorse essenziali
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching essential resources');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => {
                // Forza l'attivazione immediata
                return self.skipWaiting();
            })
            .catch((error) => {
                console.log('[SW] Cache failed:', error);
            })
    );
});

// Attiva il service worker e pulisci vecchie cache
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                // Prendi il controllo di tutte le pagine immediatamente
                return self.clients.claim();
            })
    );
});

// Strategia di fetch: Network First, fallback to cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip API calls - sempre dalla rete
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // Skip Clerk auth endpoints
    if (url.hostname.includes('clerk')) {
        return;
    }

    event.respondWith(
        // Prova prima la rete
        fetch(request)
            .then((response) => {
                // Se la risposta è valida, cachala per dopo
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(async () => {
                // Se la rete fallisce, prova la cache
                const cachedResponse = await caches.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Se è una navigazione, mostra la pagina offline
                if (request.mode === 'navigate') {
                    const offlinePage = await caches.match(OFFLINE_URL);
                    if (offlinePage) {
                        return offlinePage;
                    }
                }

                // Fallback generico
                return new Response('Offline - Contenuto non disponibile', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/plain'
                    })
                });
            })
    );
});

// Gestisci push notifications (per futuro)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Nuovo messaggio da NUR',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/giornale'
        },
        actions: [
            { action: 'open', title: 'Apri' },
            { action: 'close', title: 'Chiudi' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'NUR', options)
    );
});

// Gestisci click su notifiche
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Cerca una finestra già aperta
                for (const client of windowClients) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Altrimenti aprine una nuova
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Background sync per messaggi offline (futuro)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

async function syncMessages() {
    // Placeholder per sincronizzazione messaggi offline
    console.log('[SW] Syncing messages...');
}
