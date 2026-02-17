// Service Worker for Dashboard - Offline-First with Background Sync
const CACHE_NAME = 'dashboard-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './stats.html',
  './settings.html',
  './manifest.json',
  './icon.svg',
  './apple-touch-icon.png',
  './apple-touch-icon-120x120.png',
  './apple-touch-icon-precomposed.png'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) return;
  
  // HTML pages - Network first, fallback to cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update cache with fresh version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Last resort - return index.html for SPA routing
            return caches.match('./index.html');
          });
        })
    );
    return;
  }
  
  // Static assets - Cache first, network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached but update in background
        fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          }
        }).catch(() => {});
        return cached;
      }
      
      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Network failed
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Background Sync: Queue offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  const queue = await getSyncQueue();
  const failed = [];
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }
    } catch (error) {
      failed.push(item);
    }
  }
  
  // Save failed items back to retry later
  await saveSyncQueue(failed);
  
  // Notify client of sync completion
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      failed: failed.length
    });
  });
}

async function getSyncQueue() {
  return self.syncQueue || [];
}

async function saveSyncQueue(queue) {
  self.syncQueue = queue;
}

// Message handler for queue updates
self.addEventListener('message', (event) => {
  if (event.data.type === 'QUEUE_SYNC') {
    self.syncQueue = event.data.queue || [];
    
    if (navigator.onLine) {
      self.registration.sync.register('sync-data').catch(() => {
        processSyncQueue();
      });
    }
  }
  
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    scheduleNotification(event.data.notification);
  }
});

// Notification scheduling
let notificationTimers = {};

function scheduleNotification(notification) {
  const { id, title, body, timestamp, tag } = notification;
  const delay = timestamp - Date.now();
  
  if (notificationTimers[id]) {
    clearTimeout(notificationTimers[id]);
  }
  
  if (delay > 0) {
    notificationTimers[id] = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        tag,
        icon: './apple-touch-icon.png',
        badge: './apple-touch-icon-120x120.png',
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Open Dashboard' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
      
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'NOTIFICATION_SHOWN', id });
        });
      });
    }, delay);
  }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('./index.html');
        }
      })
    );
  }
});

// Periodic sync for background updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-check') {
    event.waitUntil(sendDailyReminder());
  }
});

async function sendDailyReminder() {
  self.registration.showNotification('Daily Check', {
    body: 'Time to review your goals for today!',
    icon: './apple-touch-icon.png',
    badge: './apple-touch-icon-120x120.png'
  });
}
