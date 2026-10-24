/* ============================================================
   loader.js — загрузка при переходе между страницами
   Оверлей с логотипом и спиннером. Подключается в <head>,
   чтобы на новой странице он появился раньше контента и не
   было мигания. Клики по своим ссылкам перехватываются:
   показываем оверлей, потом переходим.
   ============================================================ */

'use strict';

// Флаг в sessionStorage: значит, мы ушли со страницы сами
const PAGE_LOADER_KEY = 'nihongo_nav_loading';

// Сколько оверлей минимум висит, чтобы не мигал на быстрых страницах
const PAGE_LOADER_MIN = 420;

// Пауза перед переходом: успевает проявиться оверлей
const PAGE_LOADER_DELAY = 240;

let pageLoaderShownAt = 0;
let pageLoaderHideTimer = null;
let pageLoaderNavigating = false;

/* ---------- Разметка ---------- */

/** Собирает оверлей: логотип-тории, спиннер и подпись. */
function createPageLoader() {
  const loader = document.createElement('div');
  loader.id = 'pageLoader';
  loader.className = 'page-loader';
  loader.setAttribute('aria-hidden', 'true');
  loader.innerHTML = `
    <div class="page-loader-inner">
      <div class="page-loader-logo">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <rect x="4" y="9" width="40" height="5" rx="2.5" fill="currentColor"></rect>
          <rect x="9" y="18" width="30" height="3.4" rx="1.7" fill="currentColor" opacity="0.8"></rect>
          <rect x="13.5" y="16" width="4.6" height="26" rx="1.8" fill="currentColor"></rect>
          <rect x="29.9" y="16" width="4.6" height="26" rx="1.8" fill="currentColor"></rect>
          <rect x="20" y="24.5" width="8" height="3.2" rx="1.6" fill="currentColor" opacity="0.7"></rect>
        </svg>
      </div>

      <div class="page-loader-jp">日本語</div>
      <div class="page-loader-name">NIHONGO</div>

      <div class="page-loader-spinner" role="status" aria-label="Загрузка">
        <span></span>
        <span></span>
      </div>

      <div class="page-loader-text">Загружаем<span class="page-loader-dots"><i>.</i><i>.</i><i>.</i></span></div>
      <div class="page-loader-bar"><span></span></div>
    </div>
  `;
  document.documentElement.appendChild(loader);
  return loader;
}

/** Оверлей уже в документе? */
function getPageLoader() {
  return document.getElementById('pageLoader') || createPageLoader();
}

/* ---------- Показ и скрытие ---------- */

/** Проявляет оверлей. */
function showPageLoader() {
  const loader = getPageLoader();
  pageLoaderShownAt = Date.now();
  pageLoaderNavigating = true;

  document.documentElement.classList.add('is-page-loading');
  // Кадр ожидания: без этого transition не сработает на только что вставленном узле
  requestAnimationFrame(() => loader.classList.add('is-visible'));
}

/** Плавно убирает оверлей. */
function hidePageLoader(immediate) {
  const loader = document.getElementById('pageLoader');
  if (!loader) return;

  const elapsed = Date.now() - pageLoaderShownAt;
  const wait = immediate ? 0 : Math.max(0, PAGE_LOADER_MIN - elapsed);

  clearTimeout(pageLoaderHideTimer);
  pageLoaderHideTimer = setTimeout(() => {
    loader.classList.remove('is-visible');
    document.documentElement.classList.remove('is-page-loading');

    // Убираем узел после анимации, чтобы он не мешал кликам
    setTimeout(() => {
      if (loader && !loader.classList.contains('is-visible')) loader.remove();
    }, 420);
  }, wait);

  pageLoaderNavigating = false;
}

/* ---------- Переходы ---------- */

/** Своя ли это ссылка, на которую стоит вешать загрузку. */
function shouldShowPageLoader(link) {
  if (!link || !link.href) return false;
  if (link.dataset.noLoader === 'true') return false;
  if (link.hasAttribute('download')) return false;
  if (link.target && link.target !== '_self') return false;

  let url;
  try {
    url = new URL(link.href, window.location.href);
  } catch (error) {
    return false;
  }

  if (url.origin !== window.location.origin) return false;
  if (!/^https?:$/.test(url.protocol)) return false;

  const samePage = url.pathname === window.location.pathname && url.search === window.location.search;

  // Якорь на этой же странице — обычное поведение
  if (samePage && url.hash) return false;

  // Полностью та же ссылка — тоже не перезагружаем
  if (samePage && !url.hash) return false;

  return true;
}

/** Переход с оверлеем. */
function navigateWithLoader(href) {
  try {
    sessionStorage.setItem(PAGE_LOADER_KEY, '1');
  } catch (error) {
    // приватный режим — переходим без флага
  }

  setTimeout(() => {
    window.location.href = href;
  }, PAGE_LOADER_DELAY);
}

/* ---------- Слушатели ---------- */

document.addEventListener('click', event => {
  // Не мешаем средней кнопке, модификаторам и чужим обработчикам
  if (event.defaultPrevented) return;
  if (event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest ? event.target.closest('a') : null;
  if (!link || !shouldShowPageLoader(link)) return;

  event.preventDefault();

  if (pageLoaderNavigating) return;
  showPageLoader();
  navigateWithLoader(link.href);
});

// Возврат из кеша браузера: оверлей не должен остаться висеть
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    const loader = document.getElementById('pageLoader');
    if (loader) loader.remove();
    document.documentElement.classList.remove('is-page-loading');
    pageLoaderNavigating = false;
  }
});

/* ---------- Старт на новой странице ---------- */

(function bootPageLoader() {
  let navigating = false;

  try {
    navigating = sessionStorage.getItem(PAGE_LOADER_KEY) === '1';
    sessionStorage.removeItem(PAGE_LOADER_KEY);
  } catch (error) {
    navigating = false;
  }

  if (!navigating) return;

  showPageLoader();

  const finish = () => hidePageLoader(false);

  if (document.readyState === 'complete') {
    // Страница уже готова — держим оверлей минимальное время
    finish();
  } else {
    window.addEventListener('load', finish);
    // Если что-то грузится вечно (картинки, шрифты) — всё равно отпускаем
    setTimeout(() => hidePageLoader(true), 5000);
  }
})();

/* Экспорт в глобальную область */
window.showPageLoader = showPageLoader;
window.hidePageLoader = hidePageLoader;
