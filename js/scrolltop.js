/* ============================================================
   scrolltop.js — кнопка «наверх»

   Кружок со стрелкой появляется по центру сверху, как только
   человек прокрутил страницу вниз. Нажатие плавно возвращает
   к началу — с уважением к «уменьшить движение» и к настройке
   «Анимации» в интерфейсе.

   Иконка своя: стрелка-торий, нарисованная линиями под стиль
   сайта. Отдельный файл, потому что кнопка нужна на всех
   страницах, а не только там, где есть прокрутка с инерцией.
   ============================================================ */

'use strict';

// С какой прокрутки показывать кнопку
const SCROLL_TOP_AFTER = 420;

let scrollTopButton = null;
let scrollTopVisible = false;
let scrollTopTicking = false;

/** Разметка кнопки: кружок и своя стрелка. */
function scrollTopMarkup() {
  return '' +
    '<svg class="st-arrow" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path class="st-shaft" d="M12 19.5V7.2"></path>' +
      '<path class="st-head" d="M6.6 12.2 12 6.6l5.4 5.6"></path>' +
      '<path class="st-base" d="M8.4 21h7.2"></path>' +
    '</svg>';
}

/** Создаёт кнопку один раз и вешает обработчик. */
function mountScrollTop() {
  if (scrollTopButton) return scrollTopButton;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scroll-top';
  button.setAttribute('aria-label', 'Наверх');
  button.setAttribute('title', 'Наверх');
  button.innerHTML = scrollTopMarkup();

  button.addEventListener('click', event => {
    event.preventDefault();
    scrollTopGo();
  });

  document.body.appendChild(button);
  scrollTopButton = button;
  return button;
}

/** Плавно поднимает страницу в самое начало. */
function scrollTopGo() {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animations = typeof prefValue === 'function' ? prefValue('interface.animations', true) !== false : true;

  // Своя прокрутка с инерцией уже есть на странице — отдаём ей
  if (!reduce && animations && typeof smoothScrollTo === 'function') {
    try {
      smoothScrollTo(0);
      return;
    } catch (error) {
      // ниже — обычный вариант
    }
  }

  if (reduce || !animations) {
    window.scrollTo(0, 0);
    return;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Показывает или прячет кнопку по текущей прокрутке. */
function syncScrollTop() {
  const button = scrollTopButton || mountScrollTop();
  const shouldShow = window.scrollY > SCROLL_TOP_AFTER;

  if (shouldShow === scrollTopVisible) return;
  scrollTopVisible = shouldShow;

  button.classList.toggle('is-visible', shouldShow);
  button.tabIndex = shouldShow ? 0 : -1;
  button.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
}

/** Один обработчик на прокрутку, не чаще кадра. */
function onScrollTopScroll() {
  if (scrollTopTicking) return;
  scrollTopTicking = true;

  window.requestAnimationFrame(() => {
    scrollTopTicking = false;
    syncScrollTop();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  mountScrollTop();
  syncScrollTop();

  window.addEventListener('scroll', onScrollTopScroll, { passive: true });
  window.addEventListener('resize', onScrollTopScroll, { passive: true });
});

/* Экспорт */
window.scrollTopGo = scrollTopGo;
window.syncScrollTop = syncScrollTop;
