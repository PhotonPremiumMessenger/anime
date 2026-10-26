/* ============================================================
   mobile.js — мобильное меню-панель
   На узких экранах ссылки уезжают в выезжающую справа панель
   поверх страницы: затемнение, блокировка прокрутки, кнопка
   закрытия, Esc и клик мимо. На десктопе всё как раньше.
   ============================================================ */

'use strict';

/** Открывает и закрывает мобильное меню. */
function toggleMobileNav(event) {
  if (event) event.stopPropagation();

  const nav = document.querySelector('.nav');
  const button = document.querySelector('.nav-burger');
  if (!nav) return;

  const open = !nav.classList.contains('is-mobile-open');

  nav.classList.toggle('is-mobile-open', open);

  if (button) {
    button.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  }

  document.body.classList.toggle('nav-open', open);

  // Фон под панелью
  const backdrop = document.querySelector('.nav-backdrop');
  if (backdrop) backdrop.setAttribute('aria-hidden', String(!open));

  // Блокируем прокрутку страницы, пока панель открыта
  if (open) {
    document.documentElement.style.overflow = 'hidden';
  } else {
    document.documentElement.style.overflow = '';
  }
}

/** Закрывает меню. */
function closeMobileNav() {
  const nav = document.querySelector('.nav');
  const button = document.querySelector('.nav-burger');

  if (nav) nav.classList.remove('is-mobile-open');
  if (button) {
    button.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
  }

  document.body.classList.remove('nav-open');
  document.documentElement.style.overflow = '';
}

/** Шапка панели с заголовком и крестиком. */
function buildDrawerHead() {
  const head = document.createElement('div');
  head.className = 'nav-drawer-head';
  head.innerHTML = `
    <span class="nav-drawer-title">Меню</span>
    <button class="nav-drawer-close" type="button" aria-label="Закрыть меню" onclick="closeMobileNav()">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
  `;
  return head;
}

/** Затемнение под панелью. */
function buildBackdrop() {
  if (document.querySelector('.nav-backdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.addEventListener('click', closeMobileNav);
  document.body.appendChild(backdrop);
}

/** Добавляет кнопку-бургер и собирает панель. */
function mountMobileNav() {
  const header = document.querySelector('.header .container');
  const nav = document.querySelector('.nav');
  if (!header || !nav || document.querySelector('.nav-burger')) return;

  // Затемнение
  buildBackdrop();

  // Кнопка-бургер
  const button = document.createElement('button');
  button.className = 'nav-burger';
  // Кнопка меню всегда на своём месте: раскладка её не двигает
  button.setAttribute('data-sortable-pin', '1');
  button.type = 'button';
  button.setAttribute('aria-label', 'Меню');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span></span><span></span><span></span>';
  button.addEventListener('click', toggleMobileNav);
  header.appendChild(button);

  // Шапка панели
  if (!nav.querySelector('.nav-drawer-head')) {
    nav.insertBefore(buildDrawerHead(), nav.firstChild);
  }

  // На телефоне панель «Ещё» прячется, поэтому её пункты переносим
  // в меню теми же группами
  const panel = document.querySelector('.nav-more-panel');
  if (panel && !nav.querySelector('.mobile-more')) {
    const more = document.createElement('div');
    more.className = 'mobile-more';

    panel.querySelectorAll('.nav-group').forEach(group => {
      const title = group.querySelector('.nav-group-btn b');
      const titleEl = document.createElement('span');
      titleEl.className = 'mobile-more-title';
      titleEl.textContent = title ? title.textContent : 'Ещё';
      more.appendChild(titleEl);

      group.querySelectorAll('a').forEach(link => {
        const clone = document.createElement('a');
        clone.href = link.getAttribute('href');
        clone.className = 'nav-link';
        clone.innerHTML = '<b>' + link.querySelector('b').textContent + '</b>';
        clone.addEventListener('click', closeMobileNav);
        more.appendChild(clone);
      });
    });

    nav.appendChild(more);
  }

  // Клик по ссылке закрывает меню
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileNav));
}

document.addEventListener('DOMContentLoaded', () => {
  mountMobileNav();

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMobileNav();
  });

  // При переходе на широкий экран меню не должно остаться открытым
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMobileNav();
  });
});

/* Экспорт в глобальную область */
window.toggleMobileNav = toggleMobileNav;
window.closeMobileNav = closeMobileNav;
