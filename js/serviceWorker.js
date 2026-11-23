const cacheName = 'excellence-v1';
const filesToCache = [
    '../manifest.json',
    '../index.html',
    '../app.html',
    '../challenges.html',
    '../leaderboard.html',
    '../list.html',
    '../notes.html',
    '../start.html',
    '../css/style.css',
    '../css/theme.css',
    './apiFetcher.js',
    './cookies.js',
    './list.js'
];
//Start the service worker and cache all of the app's content.
self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(cacheName).then(function(cache) {
            return cache.addAll(filesToCache);
        })
    );
});
//Define which content to retrieve when the app is offline.
self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request).then(function(response) {
            return response || fetch(e.request);
        })
    );
});