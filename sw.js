const VERSION = '10'; // bump VERSION on deploy
const CACHE = 'mise-' + VERSION;
const SHELL = ['./index.html', './manifest.json', './icon.svg', './js/interpret.js', './js/planner.js',
  './js/vendor/barcode-detector-ponyfill.js', './js/vendor/zxing_reader.wasm'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  // Let share-target navigations pass straight through so ?cl= params reach the page
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  // stale-while-revalidate for same-origin non-navigation
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.ok && new URL(e.request.url).origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
