// Offline support: cache the app shell, then serve cache-first.
const CACHE = 'tokotoko-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'styles/app.css',
  'vendor/three.module.min.js',
  'src/main.js', 'src/util.js',
  'src/world/voxel.js', 'src/world/tokyo.js', 'src/world/pets.js', 'src/world/scene.js',
  'src/game/state.js', 'src/game/tracker.js', 'src/game/journey.js', 'src/game/quests.js',
  'src/game/diary.js', 'src/game/data.js', 'src/game/game.js',
  'src/ui/pixel.js', 'src/ui/sfx.js', 'src/ui/common.js', 'src/ui/ui.js', 'src/ui/sheets.js', 'src/ui/onboarding.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok && (new URL(req.url).origin === location.origin || req.url.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
