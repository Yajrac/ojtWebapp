const CACHE_NAME = 'ojt-shell-22993769e9f5aee5';
const APP_FILES = [
    "assets/app-icon.svg",
    "css/daily-gallery.css",
    "css/desktop.css",
    "css/gallery.css",
    "css/gallery-upload.css",
    "css/Home.css",
    "css/onboarding.css",
    "css/personal-gallery.css",
    "css/photo-document.css",
    "css/profile.css",
    "css/profile-layout.css",
    "css/report.css",
    "css/report-time.css",
    "css/shared.css",
    "css/skeleton.css",
    "css/theme.css",
    "Home.html",
    "index.html",
    "js/app-entry.js",
    "js/daily-document.js",
    "js/daily-photos.js",
    "js/delete-photo-data.js",
    "js/docx-export.js",
    "js/home-calendar.js",
    "js/home-clock.js",
    "js/home-reports.js",
    "js/offline.js",
    "js/onboarding.js",
    "js/pdf-export.js",
    "js/personal-photos.js",
    "js/profile.js",
    "js/profile-identity.js",
    "js/profile-validation.js",
    "js/report.js",
    "js/report-camera.js",
    "js/report-status.js",
    "js/reset-test-data.js",
    "js/skeleton.js",
    "manifest.webmanifest",
    "pages/gallery.html",
    "pages/gallery-daily-document.html",
    "pages/gallery-document.html",
    "pages/gallery-personal.html",
    "pages/gallery-upload.html",
    "pages/logs.html",
    "pages/onboarding.html",
    "pages/profile.html",
    "pages/report.html"
];
const ROOT = new URL('./', self.location.href);
const urlFor = path => new URL(path, ROOT).href;
const allowed = new Set(APP_FILES.map(path => new URL(path, ROOT).pathname));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES.map(path => new Request(urlFor(path), { cache: 'reload' })));
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('ojt-shell-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== ROOT.origin) return;
  const path = url.pathname === ROOT.pathname ? new URL('index.html', ROOT).pathname : url.pathname;
  if (!allowed.has(path)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(new URL(path, ROOT.origin).href);
    // Serve one coherent, versioned app shell, including report links with date queries.
    if (cached) return cached;
    return fetch(request);
  })());
});
