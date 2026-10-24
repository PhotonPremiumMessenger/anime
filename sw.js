/* ============================================================
   sw.js — service worker для офлайн-режима
   Стратегии подобраны так, чтобы не отдавать устаревший код:
   HTML — сначала сеть, потом кеш; JS и CSS — сначала сеть
   с обновлением кеша; картинки — из кеша (они не меняются).
   ============================================================ */

'use strict';

const VERSION = 'nihongo-v2';
const STATIC_CACHE = VERSION + '-static';
const IMAGE_CACHE = VERSION + '-images';

// Базовый набор: главная и офлайн-заглушка
const CORE = [
  './',
  'index.html',
  'offline.html',
  'privacy.html',
  'css/style.css',
  'manifest.json'
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
