/* ============================================================
   collapse.js — сворачиваемые блоки профиля
   Каждый блок вида .block получает кнопку в заголовке: нажал —
   содержимое схлопнулось, нажал ещё раз — раскрылось. Состояние
   запоминается в localStorage, чтобы профиль выглядел так же
   при следующем заходе.
   ============================================================ */

'use strict';

const COLLAPSE_KEY = 'nihongo_blocks';

/** Состояние блоков: { 'заголовок': true/false }. */
function getBlockStates() {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

/** Запоминает состояние блока. */
function saveBlockState(key, collapsed) {
  const states = getBlockStates();
  states[key] = Boolean(collapsed);

  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(states));
  } catch (error) {
    /* приватный режим — просто не запоминаем */
  }
}

/** Иконка-шеврон для кнопки. */
function blockChevron() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
}

/**
 * Оборачивает содержимое блока в анимированную обёртку.
 * @param {HTMLElement} block
 * @param {HTMLElement} head
 */
function prepareBlockBody(block, head) {
  if (block.querySelector(':scope > .block-body')) return block.querySelector(':scope > .block-body');

  const body = document.createElement('div');
  body.className = 'block-body';

  const inner = document.createElement('div');
  inner.className = 'block-body-inner';

  // Всё, кроме заголовка, переезжает внутрь
  Array.from(block.children).forEach(child => {
    if (child === head) return;
    inner.appendChild(child);
  });

  body.appendChild(inner);
  block.appendChild(body);

  return body;
}

/** Включает сворачивание для одного блока. */
function makeBlockCollapsible(block) {
  if (!block || block.dataset.collapsible === '1') return;

  const head = block.querySelector(':scope > .block-head');
  if (!head) return;

  block.dataset.collapsible = '1';

  // Название блока — ключ для запоминания
  const titleEl = head.querySelector('h3, h4');
  const key = titleEl ? titleEl.textContent.trim() : 'block-' + Math.random().toString(36).slice(2, 7);

  prepareBlockBody(block, head);

  head.classList.add('is-toggle');
  head.setAttribute('role', 'button');
  head.setAttribute('tabindex', '0');
  head.setAttribute('aria-expanded', 'true');

  const toggle = document.createElement('span');
  toggle.className = 'block-toggle';
  toggle.innerHTML = blockChevron();
  head.appendChild(toggle);

  const states = getBlockStates();
  if (states[key]) {
    block.classList.add('is-collapsed');
    head.setAttribute('aria-expanded', 'false');
  }

  /** Переключает блок. */
  function flip() {
    const collapsed = !block.classList.contains('is-collapsed');
    block.classList.toggle('is-collapsed', collapsed);
    head.setAttribute('aria-expanded', String(!collapsed));
    saveBlockState(key, collapsed);
  }

  head.addEventListener('click', flip);

  head.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      flip();
    }
  });
}

/** Раскрывает или сворачивает все блоки сразу. */
function toggleAllBlocks(collapse) {
  const blocks = Array.from(document.querySelectorAll('.profile-main .block'));
  const shouldCollapse = typeof collapse === 'boolean'
    ? collapse
    : !blocks.every(block => block.classList.contains('is-collapsed'));

  blocks.forEach(block => {
    const head = block.querySelector(':scope > .block-head');
    const titleEl = head ? head.querySelector('h3, h4') : null;
    const key = titleEl ? titleEl.textContent.trim() : '';

    block.classList.toggle('is-collapsed', shouldCollapse);
    if (head) head.setAttribute('aria-expanded', String(!shouldCollapse));
    if (key) saveBlockState(key, shouldCollapse);
  });

  if (typeof showToast === 'function') {
    showToast(
      shouldCollapse ? 'Блоки свёрнуты' : 'Блоки раскрыты',
      shouldCollapse ? 'Остались только заголовки — нажми на любой, чтобы открыть' : 'Вся статистика снова на экране',
      'info',
      { duration: 2600 }
    );
  }
}

/** Панель «свернуть всё / раскрыть всё». */
function mountBlockTools() {
  const main = document.querySelector('.profile-main');
  if (!main || document.getElementById('blockTools')) return;

  const tools = document.createElement('div');
  tools.className = 'profile-blocks-tools';
  tools.id = 'blockTools';
  tools.innerHTML = `
    <button class="btn btn-ghost btn-small" onclick="toggleAllBlocks(true)">Свернуть все</button>
    <button class="btn btn-ghost btn-small" onclick="toggleAllBlocks(false)">Раскрыть все</button>
  `;

  main.insertBefore(tools, main.firstElementChild);
}

document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('.profile-main');
  if (!main) return; // на других страницах ничего не делаем

  main.querySelectorAll('.block').forEach(makeBlockCollapsible);
  mountBlockTools();
});

window.toggleAllBlocks = toggleAllBlocks;
window.makeBlockCollapsible = makeBlockCollapsible;
