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

  if (isOpen) openDefaultNavGroup();
}

/**
 * Раскрывает группу внутри «Ещё».
 * Открыта всегда одна группа: так панель остаётся компактной.
 */
function toggleNavGroup(event, button) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const group = button ? button.closest('.nav-group') : null;
  if (!group) return;

  const wasOpen = group.classList.contains('open');

  group.closest('.nav-more-panel').querySelectorAll('.nav-group').forEach(item => {
    item.classList.remove('open');
    const btn = item.querySelector('.nav-group-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });

  if (!wasOpen) {
    group.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
  }
}

/** Открывает группу с текущей страницей (или первую). */
function openDefaultNavGroup() {
  const panel = document.getElementById('navMorePanel');
  if (!panel || panel.querySelector('.nav-group.open')) return;

  const current = panel.querySelector('.nav-group a.is-active');
  const group = current ? current.closest('.nav-group') : panel.querySelector('.nav-group');
  if (!group) return;

  group.classList.add('open');
  const button = group.querySelector('.nav-group-btn');
  if (button) button.setAttribute('aria-expanded', 'true');
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
window.toggleNavGroup = toggleNavGroup;
window.openDefaultNavGroup = openDefaultNavGroup;
window.closeNavMore = closeNavMore;
