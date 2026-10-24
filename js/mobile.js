/* ============================================================
   mobile.js — мобильное меню
   На узких экранах ссылки прячутся в бургер. Кнопка добавляется
   сама, закрытие — по клику мимо и по Esc. На десктопе ничего
   не меняется.
   ============================================================ */

'use strict';

/** Открывает и закрывает мобильное меню. */
function toggleMobileNav(event) {
  if (event) event.stopPropagation();

  const nav = document.querySelector('.nav');
  const button = document.querySelector('.nav-burger');
  if (!nav) return;

  const open = nav.classList.toggle('is-mobile-open');
  if (button) {
    button.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  }
  document.body.classList.toggle('nav-open', open);
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
}

/** Добавляет кнопку-бургер в шапку. */
function mountMobileNav() {
  const header = document.querySelector('.header .container');
  const nav = document.querySelector('.nav');
  if (!header || !nav || document.querySelector('.nav-burger')) return;

  const button = document.createElement('button');
  button.className = 'nav-burger';
  button.type = 'button';
  button.setAttribute('aria-label', 'Меню');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span></span><span></span><span></span>';
  button.addEventListener('click', toggleMobileNav);

  // На телефоне панель «Ещё» прячется, поэтому её пункты переносим
  // в меню теми же группами, но без аккордеона: там удобнее прокрутка
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
        clone.className = 'nav-link' + (link.classList.contains('is-active') ? ' active' : '');
        clone.innerHTML = '<b>' + link.querySelector('b').textContent + '</b>';
        clone.addEventListener('click', closeMobileNav);
        more.appendChild(clone);
      });
    });

    nav.appendChild(more);
  }

  header.appendChild(button);

  // Клик по ссылке закрывает меню
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileNav));
}

document.addEventListener('DOMContentLoaded', () => {
  mountMobileNav();

  document.addEventListener('click', event => {
    if (!event.target.closest('.nav') && !event.target.closest('.nav-burger')) closeMobileNav();
  });

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
