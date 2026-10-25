/* ============================================================
   smoothscroll.js — плавная прокрутка
   1) Колесо мыши двигает страницу с мягкой инерцией, а не рывками.
   2) Ссылки-якоря прокручивают с плавным замедлением и поправкой
      на высоту шапки.

   Важное про зависания: анимация — один rAF-цикл с жёсткими
   рамками (не больше 240 кадров, стоп при отсутствии движения,
   стоп в фоновой вкладке). Раньше цикл мог крутиться бесконечно,
   если страница уже не могла прокрутиться, — вкладка «умирала».

   Отключается при «меньше движения», выключенных анимациях,
   на тач-экранах и внутри окон со своей прокруткой.
   ============================================================ */

'use strict';

const SMOOTH = {
  target: 0,      // куда стремимся
  current: 0,     // где находимся сейчас
  running: false, // идёт ли анимация
  frameId: 0,     // номер кадра rAF
  frames: 0,      // сколько кадров уже прошло
  ease: 0.16      // чем больше, тем резче
};

// Больше этого анимация не длится (примерно 4 секунды при 60 fps)
const SMOOTH_MAX_FRAMES = 240;

/* ---------- Условия работы ---------- */

/** Нужна ли плавная прокрутка. */
function smoothScrollEnabled() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  // Настройка «Анимации» в интерфейсе
  if (typeof prefValue === 'function' && prefValue('interface.animations', true) === false) return false;

  // Тач-устройства прокручивают нативно — не мешаем
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return false;

  return true;
}

/** Максимальная прокрутка страницы. */
function maxScroll() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

/**
 * Страница сейчас заблокирована оверлеем или окном?
 * В этом случае крутить нечего и перехватывать колесо нельзя.
 */
function smoothPageLocked() {
  if (document.hidden) return true;
  if (maxScroll() < 2) return true;

  const html = document.documentElement;
  if (html.classList.contains('is-page-loading')) return true;
  if (document.body.classList.contains('nav-open')) return true;
  if (document.body.style.overflow === 'hidden') return true;

  return Boolean(document.querySelector('.modal-overlay.open, .command-overlay.open, .cs-menu.open'));
}

/* ---------- Анимация ---------- */

/** Останавливает цикл и убирает служебные стили. */
function stopSmoothScroll() {
  if (SMOOTH.frameId) cancelAnimationFrame(SMOOTH.frameId);

  SMOOTH.frameId = 0;
  SMOOTH.frames = 0;
  SMOOTH.running = false;
  SMOOTH.target = window.scrollY;
  SMOOTH.current = window.scrollY;
}

/** Один кадр анимации. */
function smoothStep() {
  SMOOTH.frames += 1;

  const distance = SMOOTH.target - SMOOTH.current;

  // Приехали
  if (Math.abs(distance) < 0.5) {
    window.scrollTo(0, SMOOTH.target);
    stopSmoothScroll();
    return;
  }

  // Предохранители от бесконечного цикла
  if (SMOOTH.frames > SMOOTH_MAX_FRAMES || document.hidden) {
    window.scrollTo(0, SMOOTH.target);
    stopSmoothScroll();
    return;
  }

  const before = window.scrollY;

  SMOOTH.current += distance * SMOOTH.ease;
  window.scrollTo(0, Math.round(SMOOTH.current));

  // Страница не двигается (упёрлись в край) — прекращаем
  if (window.scrollY === before && SMOOTH.frames > 4) {
    stopSmoothScroll();
    return;
  }

  SMOOTH.frameId = requestAnimationFrame(smoothStep);
}

/** Запускает цикл, если он ещё не идёт. */
function startSmoothScroll() {
  if (SMOOTH.running) return;

  SMOOTH.running = true;
  SMOOTH.frames = 0;
  SMOOTH.current = window.scrollY;
  SMOOTH.frameId = requestAnimationFrame(smoothStep);
}

/** Прокручивает к позиции с инерцией. */
function smoothScrollTo(top) {
  if (!smoothScrollEnabled()) {
    window.scrollTo(0, Math.min(maxScroll(), Math.max(0, top)));
    return;
  }

  SMOOTH.target = Math.min(maxScroll(), Math.max(0, Math.round(top)));
  startSmoothScroll();
}

/* ---------- Вложенные прокрутки ---------- */

// Классы панелей, которые прокручиваются сами
const SMOOTH_OWN_SCROLL = [
  'cs-menu', 'command-overlay', 'modal-body', 'modal', 'modal-overlay',
  'notify-panel', 'design-panel', 'player-card', 'settings-menu',
  'nav', 'footer', 'table-wrap', 'code-block', 'pre'
];

/** Внутри какого-то элемента есть своя прокрутка? */
function insideScrollable(node) {
  let el = node;

  while (el && el !== document.body && el !== document.documentElement) {
    if (el.nodeType === 1) {
      // Дешёвая проверка по классу — без чтения стилей
      for (let i = 0; i < SMOOTH_OWN_SCROLL.length; i++) {
        if (el.classList && el.classList.contains(SMOOTH_OWN_SCROLL[i])) return true;
      }

      const overflowY = window.getComputedStyle(el).overflowY;

      if (/(auto|scroll|overlay)/.test(overflowY) && el.scrollHeight > el.clientHeight + 2) return true;
    }

    el = el.parentElement;
  }

  return false;
}

/* ---------- Колесо мыши ---------- */

function onWheel(event) {
  if (event.ctrlKey) return;              // масштабирование браузера
  if (event.defaultPrevented) return;
  if (!smoothScrollEnabled()) return;
  if (smoothPageLocked()) return;
  if (insideScrollable(event.target)) return;

  // Горизонтальную прокрутку не трогаем
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

  const delta = event.deltaMode === 1 ? event.deltaY * 18 : event.deltaY;
  if (!delta) return;

  event.preventDefault();

  // Если анимация не идёт — стартуем от текущей позиции
  if (!SMOOTH.running) {
    SMOOTH.current = window.scrollY;
    SMOOTH.target = window.scrollY;
  }

  SMOOTH.target = Math.min(maxScroll(), Math.max(0, SMOOTH.target + delta));
  startSmoothScroll();
}

/* ---------- Якоря и кнопки «наверх» ---------- */

function onAnchorClick(event) {
  const link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
  if (!link) return;

  const hash = link.getAttribute('href');
  if (!hash || hash === '#') return;

  const target = document.querySelector(hash);
  if (!target) return;

  event.preventDefault();

  const header = document.querySelector('.header');
  const offset = (header ? header.offsetHeight : 0) + 14;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;

  if (smoothScrollEnabled()) {
    smoothScrollTo(top);
  } else {
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  if (history.replaceState) history.replaceState(null, '', hash);
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!smoothScrollEnabled()) return;

  // passive: false нужен, чтобы можно было отменить «родной» скролл,
  // но обработчик выходит сразу, если крутить нечего
  window.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('click', onAnchorClick);

  // Своя инерция вместо CSS: иначе две плавности спорят между собой
  document.documentElement.style.scrollBehavior = 'auto';

  // Плавный возврат наверх при переходе между страницами
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
});

// Пользователь начал крутить сам — подстраиваемся под него
window.addEventListener('scroll', () => {
  if (!SMOOTH.running) SMOOTH.target = window.scrollY;
}, { passive: true });

// Ушли в другую вкладку — гасим анимацию, чтобы не жгли процессор
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopSmoothScroll();
});

// Открылось окно или панель — отпускаем колесо
document.addEventListener('click', () => {
  if (document.body.classList.contains('nav-open')) stopSmoothScroll();
}, true);

window.smoothScrollTo = smoothScrollTo;
window.stopSmoothScroll = stopSmoothScroll;
