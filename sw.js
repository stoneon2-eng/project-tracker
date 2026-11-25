/* 프로젝트 노트 - 오프라인 캐시 (network-first, 캐시 폴백) */
var CACHE = 'project-note-v8';
var ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') { return; }
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  /* GitHub API(동기화)는 캐시하지 않고 항상 네트워크로 보낸다 */
  if (url.hostname === 'api.github.com' || url.hostname === 'github.com' || url.hostname === 'raw.githubusercontent.com') { return; }
  if (url.origin !== location.origin) { return; }
  if (req.url.indexOf('projects-data.json') !== -1) { return; }
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); });
    })
  );
});
