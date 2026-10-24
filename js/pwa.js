/* ============================================================
   pwa.js — офлайн-режим
   Регистрирует service worker, показывает состояние сети и
   подсказку «можно установить». Сайт живёт на GitHub Pages,
   поэтому все пути относительные: работает и в подкаталоге.
   ============================================================ */

'use strict';

/** Регистрирует service worker. */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(registration => {
      // Если файл обновился — мягко сообщаем
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            if (typeof pushNotification === 'function') {
              pushNotification('system', 'Сайт обновился', 'Перезагрузи страницу, чтобы увидеть новое');
            }
          }
        });
      });
    }).catch(() => {
      // Тихо: без service worker сайт работает как раньше
    });
  });
}

/** Следит за сетью. */
function watchConnection() {
  const badge = () => {
    const offline = !navigator.onLine;
    document.body.classList.toggle('is-offline', offline);

    if (offline) {
      if (typeof showToast === 'function') {
        showToast('Нет сети', 'Открыты сохранённые страницы, прогресс не потеряется', 'warning');
      }
    }
  };

  window.addEventListener('online', () => {
    document.body.classList.remove('is-offline');
    if (typeof showToast === 'function') showToast('Снова онлайн', 'Можно продолжать', 'success');
  });
  window.addEventListener('offline', badge);

  badge();
}

/** Подсказка про установку приложения. */
function mountInstallHint() {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    window.nihongoInstallPrompt = event;

    const box = document.getElementById('installHint');
    if (box) box.classList.remove('hidden');
  });
}

/** Запускает установку (если браузер разрешает). */
function installNihongo() {
  const prompt = window.nihongoInstallPrompt;
  if (!prompt) {
    if (typeof showToast === 'function') {
      showToast('Установка недоступна', 'Открой меню браузера → «Установить приложение»', 'info');
    }
    return;
  }

  prompt.prompt();
  prompt.userChoice.then(() => {
    window.nihongoInstallPrompt = null;
    const box = document.getElementById('installHint');
    if (box) box.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  watchConnection();
  mountInstallHint();
});

/* Экспорт в глобальную область */
window.installNihongo = installNihongo;
window.registerServiceWorker = registerServiceWorker;
