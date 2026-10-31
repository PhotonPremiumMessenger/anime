/* ============================================================
   sw.js — service worker для офлайн-режима
   Стратегии подобраны так, чтобы не отдавать устаревший код:
   HTML — сначала сеть, потом кеш; JS и CSS — сначала сеть
   с обновлением кеша; картинки — из кеша (они не меняются).
   ============================================================ */

'use strict';

const VERSION = 'anilingo-v18';
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
  'js/tts-select.js',
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
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(hit => hit || caches.match('offline.html')))
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
