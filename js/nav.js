/* ============================================================
   nav.js — выпадающее меню «Ещё» в шапке
   Ссылок стало много, поэтому часть пунктов живёт в панели.
   ============================================================ */

'use strict';

/** Открывает и закрывает панель «Ещё». */
function toggleNavMore(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const button = document.querySelector('.nav-more-btn');
  const panel = document.getElementById('navMorePanel');
  if (!button || !panel) return;

  const isOpen = panel.classList.toggle('open');
  button.classList.toggle('open', isOpen);
  button.setAttribute('aria-expanded', String(isOpen));
}

/** Закрывает панель. */
function closeNavMore() {
  const button = document.querySelector('.nav-more-btn');
  const panel = document.getElementById('navMorePanel');

  if (panel) panel.classList.remove('open');
  if (button) {
    button.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Клик мимо панели закрывает её
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-more')) closeNavMore();
  });

  // Esc тоже закрывает
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeNavMore();
  });
});

window.toggleNavMore = toggleNavMore;
window.closeNavMore = closeNavMore;
