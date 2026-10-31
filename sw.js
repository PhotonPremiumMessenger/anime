/* ============================================================
   sw.js — service worker для офлайн-режима
   Стратегии подобраны так, чтобы не отдавать устаревший код:
   HTML — сначала сеть, потом кеш; JS и CSS — сначала сеть
   с обновлением кеша; картинки — из кеша (они не меняются).
   ============================================================ */

'use strict';

const VERSION = 'anilingo-v21';
const STATIC_CACHE = VERSION + '-static';
const IMAGE_CACHE = VERSION + '-images';

// Базовый набор: главная и офлайн-заглушка
const CORE = [
  './',
  'index.html',
  'offline.html',
  'privacy.html',
  'lessons.html',
  'lesson.html',
  'profile.html',
  'search.html',
  'settings.html',
  'game.html',
  'css/style.css',
  'css/perf.css',
  'css/mobile.css',
  'manifest.json',
  'assets/images/background.webp',
  // Волна 12: плавность и аниме-слой
  'js/perf.js',
  'js/anime-style.js',
  // Волна 13: слой данных, синхронизация и оформление до отрисовки
  'js/boot.js',
  'js/config.js',
  'js/api-local.js',
  'js/api.js',
  'js/sync.js',
  // Скрипты волны 10: учёба, подсказки, фокус, дневник ошибок
  'js/search-data.js',
  'js/suggest.js',
  'js/study.js',
  'js/quick-review.js',
  'js/mistakes.js',
  'js/progress-map.js',
  'js/lesson-tools.js',
  'js/game.js'
];

/* ---------- Установка ---------- */

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

/* ---------- Активация ---------- */

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => !key.startsWith(VERSION)).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- Обработка запросов ---------- */

/**
 * Страница из кеша, когда сети нет.
 * Адрес без .html (чистые ссылки сайта) ищет в кеше сам файл,
 * иначе офлайн-переход на /lessons открывал бы заглушку.
 */
function navigateFromCache(request) {
  const url = new URL(request.url);
  const bare = url.pathname.replace(/\/$/, '');

  const variants = [
    request,
    new URL(bare + '.html', url.origin).href,
    new URL(bare + '/index.html', url.origin).href
  ];

  return variants.reduce(
    (chain, target) => chain.then(hit => hit || caches.match(target)),
    Promise.resolve(null)
  ).then(hit => hit || caches.match('offline.html'));
}

/**
 * Адрес без .html на хостинге, который чистых адресов не понимает
 * (GitHub Pages). Если сервер ответил 404 — пробуем сам файл:
 * страница откроется, а в адресной строке останется /lessons.
 */
function navigateAlternative(url) {
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return Promise.resolve(null);

  const bare = url.pathname.replace(/\/+$/, '');
  const candidates = [bare + '.html', bare + '/index.html'];

  return candidates.reduce(
    (chain, path) => chain.then(hit => hit || fetch(new URL(path + url.search, url.origin))
      .then(response => (response.ok ? response : null))
      .catch(() => null)),
    Promise.resolve(null)
  );
}

self.addEventListener('fetch', event => {
  const request = event.request;

  // Только GET и только свой домен
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Страницы: сеть, при обрыве — кеш, в крайнем случае заглушка
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Чистый адрес, которого хостинг не знает: подставляем файл
          if (response.status === 404) {
            return navigateAlternative(url).then(found => found || response);
          }

          // 404 в кеш не кладём: иначе офлайн откроется ошибка
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          }

          return response;
        })
        .catch(() => navigateFromCache(request))
    );
    return;
  }

  // Картинки: кеш, потом сеть
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(response => {
        const copy = response.clone();
        caches.open(IMAGE_CACHE).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => hit))
    );
    return;
  }

  // Скрипты и стили: сеть с обновлением кеша, при обрыве — кеш
  if (['script', 'style', 'font'].includes(request.destination)) {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Остальное — из кеша, если есть
  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request).catch(() => hit))
  );
});
