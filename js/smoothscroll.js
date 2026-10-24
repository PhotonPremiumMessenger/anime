/* ============================================================
   smoothscroll.js — плавная прокрутка
   1) Колесо мыши двигает страницу с мягкой инерцией, а не
      рывками.
   2) Ссылки-якоря (#...) прокручивают с плавным замедлением.
   Отключается при системной настройке «меньше движения»,
   в окнах и панелях со своей прокруткой и на тач-экранах.
   ============================================================ */

'use strict';

const SMOOTH = {
  target: 0,      // куда стремимся
  current: 0,     // где находимся сейчас
  running: false, // идёт ли анимация
  ease: 0.14      // чем больше, тем резче
};

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

/** Один кадр анимации. */
function smoothStep() {
  // Пока анимируем сами — CSS-плавность отключаем, иначе получается рывками
  document.documentElement.style.scrollBehavior = 'auto';

  const distance = SMOOTH.target - SMOOTH.current;

  if (Math.abs(distance) < 0.4) {
    window.scrollTo(0, SMOOTH.target);
    SMOOTH.running = false;
    document.documentElement.style.scrollBehavior = '';
    return;
  }

  SMOOTH.current += distance * SMOOTH.ease;
  window.scrollTo(0, SMOOTH.current);
  requestAnimationFrame(smoothStep);
}

/** Прокручивает к позиции с инерцией. */
function smoothScrollTo(top) {
  const target = Math.min(maxScroll(), Math.max(0, top));
  SMOOTH.target = target;
  SMOOTH.current = window.scrollY;

  if (SMOOTH.running) return;
  SMOOTH.running = true;
  requestAnimationFrame(smoothStep);
}

/** Внутри какого-то элемента есть своя прокрутка? */
function insideScrollable(node) {
  let el = node;

  while (el && el !== document.body) {
    if (el.nodeType === 1) {
      const style = window.getComputedStyle(el);
      const scrollable = /(auto|scroll|overlay)/.test(style.overflowY);

      if (scrollable && el.scrollHeight > el.clientHeight + 2) return true;

      // Панели и окна прокручивают себя, даже если контента пока мало
      if (el.classList && (
        el.classList.contains('cs-menu') ||
        el.classList.contains('command-overlay') ||
        el.classList.contains('modal-body') ||
        el.classList.contains('modal') ||
        el.classList.contains('notify-panel') ||
        el.classList.contains('design-panel') ||
        el.classList.contains('player-card')
      )) return true;
    }

    el = el.parentElement;
  }

  return false;
}

/* ---------- Колесо мыши ---------- */

function onWheel(event) {
  if (!smoothScrollEnabled()) return;
  if (event.ctrlKey) return;            // масштабирование браузера
  if (event.defaultPrevented) return;
  if (insideScrollable(event.target)) return;

  // Горизонтальную прокрутку не трогаем
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

  const delta = event.deltaMode === 1 ? event.deltaY * 18 : event.deltaY;

  event.preventDefault();

  // Если анимация не идёт — стартуем от текущей позиции
  if (!SMOOTH.running) SMOOTH.current = window.scrollY;

  SMOOTH.target = Math.min(maxScroll(), Math.max(0, SMOOTH.target ? SMOOTH.target + delta : window.scrollY + delta));

  if (!SMOOTH.running) {
    SMOOTH.current = window.scrollY;
    SMOOTH.running = true;
    requestAnimationFrame(smoothStep);
  }
}

/* ---------- Якоря и кнопки «наверх» ---------- */

function onAnchorClick(event) {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const hash = link.getAttribute('href');
  if (!hash || hash === '#') return;

  const target = document.querySelector(hash);
  if (!target) return;

  event.preventDefault();

  const header = document.querySelector('.header');
  const offset = (header ? header.offsetHeight : 0) + 14;
  const top = target.getBoundingClientRect().top + window.scrollY - offset;

  // Плавность — либо своя, либо CSS
  if (smoothScrollEnabled()) {
    SMOOTH.target = top;
    SMOOTH.current = window.scrollY;
    if (!SMOOTH.running) {
      SMOOTH.running = true;
      requestAnimationFrame(smoothStep);
    }
  } else {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({ top, behavior: 'smooth' });
    setTimeout(() => { document.documentElement.style.scrollBehavior = ''; }, 600);
  }

  if (history.replaceState) history.replaceState(null, '', hash);
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!smoothScrollEnabled()) return;

  // passive: false нужен, чтобы можно было отменить «родной» скролл
  window.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('click', onAnchorClick);

  // Плавный возврат наверх при переходе между страницами
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
});

// Пользователь начал крутить сам — подстраиваемся под него
window.addEventListener('scroll', () => {
  if (!SMOOTH.running) SMOOTH.target = window.scrollY;
}, { passive: true });

window.smoothScrollTo = smoothScrollTo;
