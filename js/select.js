/* ============================================================
   select.js — красивые выпадающие списки
   Нативный <select> остаётся в разметке (значение, формы,
   события change), но визуально заменяется на аккуратное
   меню в стиле сайта. Работает и для списков, которые
   добавляются позже (настройки, панель озвучки).
   ============================================================ */

'use strict';

// Класс-маркер: по нему понимаем, что список уже улучшен
const CS_READY = 'cs-ready';

/** Chevron для триггера. */
function csChevron() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
}

/** Галочка выбранного пункта. */
function csCheck() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';
}

/**
 * Превращает один <select> в кастомный список.
 * @param {HTMLSelectElement} select
 */
function enhanceSelect(select) {
  if (!select || select.classList.contains(CS_READY)) return;
  if (select.dataset.noCustom === '1') return;

  select.classList.add(CS_READY);
  select.classList.add('cs-native');
  select.setAttribute('tabindex', '-1');

  const wrap = document.createElement('div');
  wrap.className = 'cs';
  wrap.dataset.cs = '1';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cs-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<span class="cs-value"></span><span class="cs-arrow">' + csChevron() + '</span>';

  const menu = document.createElement('div');
  menu.className = 'cs-menu';
  menu.setAttribute('role', 'listbox');

  // Вставляем обёртку на место списка, сам список прячем внутрь
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  wrap.appendChild(trigger);
  document.body.appendChild(menu);

  /** Обновляет подпись и список пунктов. */
  function refresh() {
    const options = Array.from(select.options);
    const current = options.find(option => option.value === select.value) || options[0];

    trigger.querySelector('.cs-value').textContent = current ? current.textContent.trim() : '—';
    trigger.classList.toggle('is-empty', !select.value);

    menu.innerHTML = options.map(option => `
      <button type="button" class="cs-option${option.value === select.value ? ' is-selected' : ''}"
              role="option" aria-selected="${option.value === select.value}" data-value="${option.value}">
        <span>${option.textContent.trim()}</span>
        <span class="cs-tick">${csCheck()}</span>
      </button>
    `).join('');

    menu.querySelectorAll('.cs-option').forEach(item => {
      item.addEventListener('click', () => {
        select.value = item.dataset.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        refresh();
        close();
      });
    });
  }

  /** Ставит меню под триггером. */
  function place() {
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 180);

    menu.style.width = width + 'px';
    menu.style.left = Math.min(rect.left, window.innerWidth - width - 12) + 'px';

    // Не влезает вниз — показываем над триггером
    const menuHeight = menu.offsetHeight || 220;
    const below = window.innerHeight - rect.bottom;
    const openUp = below < menuHeight + 16 && rect.top > menuHeight + 16;

    menu.classList.toggle('is-up', openUp);
    menu.style.top = openUp
      ? (rect.top - Math.min(menuHeight, rect.top - 12) - 8) + 'px'
      : (rect.bottom + 8) + 'px';
  }

  /** Открывает меню. */
  function open() {
    closeAllSelects(wrap);
    refresh();
    menu.classList.add('is-open');
    trigger.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
    place();
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
  }

  /** Закрывает меню. */
  function close() {
    menu.classList.remove('is-open');
    trigger.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', place, true);
    window.removeEventListener('resize', place);
  }

  /** Клавиатура. */
  function onKey(event) {
    if (event.key === 'Escape') {
      close();
      trigger.focus();
      return;
    }

    const options = Array.from(select.options);
    const index = options.findIndex(option => option.value === select.value);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown'
        ? Math.min(options.length - 1, index + 1)
        : Math.max(0, index - 1);

      if (options[next]) {
        select.value = options[next].value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        refresh();
        place();
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      close();
      trigger.focus();
    }
  }

  trigger.addEventListener('click', () => {
    if (menu.classList.contains('is-open')) close();
    else open();
  });

  // Значение могло измениться программно — просто перерисуем при открытии
  trigger.addEventListener('focus', refresh);

  refresh();

  // Запоминаем функции на обёртке, чтобы закрывать снаружи
  wrap._csClose = close;
  wrap._csRefresh = refresh;
}

/** Закрывает все списки, кроме указанного. */
function closeAllSelects(except) {
  document.querySelectorAll('.cs').forEach(wrap => {
    if (wrap === except) return;
    if (typeof wrap._csClose === 'function') wrap._csClose();
  });

  // На всякий случай гасим все меню, оставшиеся без владельца
  document.querySelectorAll('.cs-menu.is-open').forEach(menu => menu.classList.remove('is-open'));
}

/** Улучшает все списки в поддереве. */
function enhanceSelects(root = document) {
  if (!root || root.nodeType !== 1) return;

  if (root.matches && root.matches('select')) enhanceSelect(root);

  root.querySelectorAll('select').forEach(select => {
    if (select.tagName === 'SELECT') enhanceSelect(select);
  });
}

/** Синхронизирует подписи после программного изменения значений. */
function syncCustomSelects(root = document) {
  root.querySelectorAll('.cs').forEach(wrap => {
    if (typeof wrap._csRefresh === 'function') wrap._csRefresh();
  });
}

/* ---------- Закрытие по клику вне меню ---------- */

document.addEventListener('click', event => {
  if (event.target.closest('.cs') || event.target.closest('.cs-menu')) return;
  closeAllSelects();
});

/* ---------- Автоулучшение ---------- */

document.addEventListener('DOMContentLoaded', () => enhanceSelects(document.body));

// Настройки перерисовывают вкладки, панель озвучки открывается позже —
// следим за новыми списками
const csObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.matches && (node.matches('select') || node.querySelector('select'))) {
        enhanceSelects(node);
      }
    });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  csObserver.observe(document.body, { childList: true, subtree: true });
});

window.enhanceSelects = enhanceSelects;
window.syncCustomSelects = syncCustomSelects;
window.closeAllSelects = closeAllSelects;
