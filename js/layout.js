/* ============================================================
   layout.js — своя раскладка страниц
   Любой блок с data-sortable можно двигать: в шапке (кроме логотипа),
   на главной (секции и виджеты «Твой день»), в профиле и в других
   местах. Порядок хранится в localStorage (nihongo_layout), поэтому
   он остаётся после перезагрузки и переходов между страницами.

   Как это работает:
   • «Редактировать блоки» включает режим правки (body.layout-edit);
   • блок можно тащить мышью (HTML5 drag & drop) или двигать
     стрелками на панели внизу — стрелки работают и на телефоне;
   • кнопка «Сбросить» возвращает исходный порядок.
   ============================================================ */

'use strict';

const LAYOUT_KEY = 'nihongo_layout';
const LAYOUT_MIN_MOVE = 1;

// Режим правки включён?
let layoutEditMode = false;
// Выбранный блок (для стрелок)
let layoutSelected = null;
// Что тащим сейчас
let layoutDragEl = null;

/* ---------- Хранение ---------- */

/** Весь сохранённый порядок: { ключ контейнера: [ключи блоков] }. */
function readLayout() {
  try {
    const raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (error) {
    return {};
  }
}

/** Сохраняет порядок одного контейнера. */
function saveLayout(containerKey, keys) {
  const all = readLayout();
  all[containerKey] = keys;

  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(all));
  } catch (error) {
    if (typeof showToast === 'function') {
      showToast('Не удалось сохранить', 'В браузере нет места для раскладки', 'error');
    }
  }
}

/* ---------- Ключи блоков ---------- */

/**
 * Устойчивый ключ блока.
 * Порядок: свой ключ → id → подпись блока → класс → позиция.
 * Подпись (data-block-title) важна для профиля: там у всех блоков
 * один класс «block», и без неё все ключи совпадали.
 */
function blockKey(el, index) {
  if (el.dataset && el.dataset.blockKey) return el.dataset.blockKey;
  if (el.id) return 'id-' + el.id;
  if (el.dataset && el.dataset.blockTitle) return 't-' + el.dataset.blockTitle;

  const cls = Array.prototype.find.call(el.classList || [], name => (
    name && !/^(reveal|visible|is-|has-|theme-|active|open|layout-)/.test(name)
  ));

  if (cls) return 'c-' + cls;

  return 'n-' + index;
}

/** Блоки, которые можно двигать (логотип и служебные — нельзя). */
function sortableChildren(container) {
  return Array.prototype.filter.call(container.children, el => {
    if (el.hasAttribute('data-sortable-pin')) return false;
    if (/^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName)) return false;
    return true;
  });
}

/**
 * Ближайший блок-ребёнок контейнера.
 * @param {Element} target — куда кликнули
 * @param {HTMLElement} container — контейнер с data-sortable
 */
function sortableItemFrom(target, container) {
  let el = target;

  while (el && el !== container) {
    if (el.parentNode === container) return el;
    el = el.parentNode;
  }

  return null;
}

/** Текущий порядок блока в виде массива ключей. */
function currentOrder(container) {
  return sortableChildren(container).map((el, index) => blockKey(el, index));
}

/* ---------- Применение сохранённого порядка ---------- */

/**
 * Расставляет блоки контейнера по сохранённому порядку.
 * @param {HTMLElement} container — элемент с data-sortable
 */
function applyContainerOrder(container) {
  const containerKey = container.dataset.sortable;
  const saved = readLayout()[containerKey];

  if (!Array.isArray(saved) || !saved.length) return;

  const children = sortableChildren(container);
  const map = new Map();

  children.forEach((el, index) => {
    // Один и тот же ключ может встретиться дважды — тогда добавляем индекс
    let key = blockKey(el, index);
    if (map.has(key)) key = key + '-' + index;
    map.set(key, el);
  });

  const ordered = [];
  saved.forEach(key => {
    const el = map.get(key);
    if (!el) return;
    ordered.push(el);
    map.delete(key);
  });

  // Новые блоки, которых не было в сохранённом порядке, — в конец
  map.forEach(el => ordered.push(el));

  // Если порядок уже такой же — ничего не трогаем (не дёргаем раскладку)
  const same = ordered.length === children.length
    && ordered.every((el, index) => el === children[index]);

  if (same) return;

  const fragment = document.createDocumentFragment();
  ordered.forEach(el => fragment.appendChild(el));
  container.appendChild(fragment);
}

/** Применяет раскладку ко всем контейнерам страницы. */
function applyLayout() {
  document.querySelectorAll('[data-sortable]').forEach(applyContainerOrder);
}

/* ---------- Режим правки ---------- */

/** Собирает нижнюю панель управления. */
function mountLayoutBar() {
  if (document.getElementById('layoutBar')) return;

  const bar = document.createElement('div');
  bar.className = 'layout-bar';
  bar.id = 'layoutBar';
  bar.innerHTML = `
    <div class="layout-bar-hint" id="layoutBarHint">Нажми на блок, чтобы выбрать</div>
    <div class="layout-bar-actions">
      <button class="btn btn-ghost btn-small" type="button" data-move="-1" title="Двинуть назад">←</button>
      <button class="btn btn-ghost btn-small" type="button" data-move="1" title="Двинуть вперёд">→</button>
      <button class="btn btn-outline btn-small" type="button" id="layoutDone">Готово</button>
      <button class="btn btn-ghost btn-small" type="button" id="layoutReset">Сбросить</button>
    </div>
  `;

  bar.addEventListener('click', event => {
    const moveBtn = event.target.closest('[data-move]');

    if (moveBtn) {
      moveSelectedBlock(Number(moveBtn.dataset.move));
      return;
    }

    if (event.target.closest('#layoutDone')) {
      toggleLayoutEdit(false);
      return;
    }

    if (event.target.closest('#layoutReset')) {
      resetLayout();
    }
  });

  document.body.appendChild(bar);
}

/** Подсвечивает выбранный блок и обновляет подсказку. */
function selectBlock(el) {
  if (layoutSelected) layoutSelected.classList.remove('is-layout-selected');

  layoutSelected = el || null;

  if (layoutSelected) layoutSelected.classList.add('is-layout-selected');

  const hint = document.getElementById('layoutBarHint');
  if (!hint) return;

  if (!layoutSelected) {
    hint.textContent = 'Нажми на блок, чтобы выбрать';
    return;
  }

  const title = (layoutSelected.dataset.blockTitle
    || layoutSelected.getAttribute('aria-label')
    || (layoutSelected.querySelector('h1, h2, h3, h4, b') || {}).textContent
    || layoutSelected.textContent
    || 'блок').trim().slice(0, 40);

  hint.textContent = 'Выбрано: ' + title;
}

/** Двигает выбранный блок на шаг (стрелками). */
function moveSelectedBlock(direction) {
  if (!layoutSelected) {
    if (typeof showToast === 'function') showToast('Сначала выбери блок', 'Нажми на любой блок на странице', 'info', { duration: 2200 });
    return;
  }

  const container = layoutSelected.closest('[data-sortable]');
  if (!container) return;

  const siblings = sortableChildren(container);
  const index = siblings.indexOf(layoutSelected);

  if (index === -1) return;

  const targetIndex = index + direction * LAYOUT_MIN_MOVE;
  if (targetIndex < 0 || targetIndex >= siblings.length) return;

  const neighbour = siblings[targetIndex];

  if (direction < 0) container.insertBefore(layoutSelected, neighbour);
  else container.insertBefore(neighbour, layoutSelected);

  saveLayout(container.dataset.sortable, currentOrder(container));

  // Плавная подсказка, что блок встал на место
  layoutSelected.classList.add('is-layout-moved');
  setTimeout(() => layoutSelected.classList.remove('is-layout-moved'), 320);
}

/** Включает и выключает режим правки. */
function toggleLayoutEdit(force) {
  layoutEditMode = typeof force === 'boolean' ? force : !layoutEditMode;

  document.body.classList.toggle('layout-edit', layoutEditMode);

  // Тащить можно только в режиме правки: иначе мышью нельзя выделять текст
  document.querySelectorAll('[data-sortable]').forEach(container => {
    sortableChildren(container).forEach(el => {
      if (layoutEditMode) el.setAttribute('draggable', 'true');
      else el.removeAttribute('draggable');
    });
  });

  if (layoutEditMode) {
    mountLayoutBar();
    document.body.classList.add('layout-edit-ready');
    if (typeof showToast === 'function') {
      showToast('Раскладка включена', 'Тащи блоки мышью или выбери блок и жми стрелки внизу', 'info', { duration: 4200 });
    }
  } else {
    selectBlock(null);
    if (typeof showToast === 'function') {
      showToast('Раскладка сохранена', 'Порядок блоков запомнен в этом браузере', 'success', { duration: 2600 });
    }
  }
}

/** Возвращает исходный порядок всех блоков на странице. */
function resetLayout() {
  const layout = readLayout();

  document.querySelectorAll('[data-sortable]').forEach(container => {
    delete layout[container.dataset.sortable];
  });

  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch (error) {
    /* пусто */
  }

  // Исходный порядок описан в HTML — перезагрузка вернёт его точно
  // (у части блоков ключи зависят от позиции, поэтому так надёжнее)
  if (typeof showToast === 'function') {
    showToast('Раскладка сброшена', 'Возвращаем блоки на свои места…', 'info', { duration: 1600 });
  }

  selectBlock(null);

  setTimeout(() => window.location.reload(), 700);
}

/* ---------- Мышь: перетаскивание ---------- */

/** Делает блоки контейнера перетаскиваемыми в режиме правки. */
function enableDrag(container) {
  if (container.dataset.dragReady === '1') return;
  container.dataset.dragReady = '1';

  container.addEventListener('dragstart', event => {
    if (!layoutEditMode) {
      event.preventDefault();
      return;
    }

    const item = sortableItemFrom(event.target, container);
    if (!item || item.hasAttribute('data-sortable-pin')) return;

    layoutDragEl = item;
    item.classList.add('is-layout-dragging');

    try {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', blockKey(item, 0));
    } catch (error) {
      /* старые браузеры */
    }

    selectBlock(item);
  });

  container.addEventListener('dragover', event => {
    if (!layoutEditMode || !layoutDragEl) return;
    if (!container.contains(layoutDragEl)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const over = sortableItemFrom(event.target, container);
    if (!over || over === layoutDragEl || over.hasAttribute('data-sortable-pin')) return;

    const rect = over.getBoundingClientRect();
    const horizontal = rect.width > rect.height;
    const after = horizontal
      ? event.clientX > rect.left + rect.width / 2
      : event.clientY > rect.top + rect.height / 2;

    container.insertBefore(layoutDragEl, after ? over.nextSibling : over);
  });

  container.addEventListener('drop', event => {
    if (!layoutEditMode || !layoutDragEl) return;

    event.preventDefault();
    layoutDragEl.classList.remove('is-layout-dragging');
    saveLayout(container.dataset.sortable, currentOrder(container));
    layoutDragEl = null;
  });

  container.addEventListener('dragend', () => {
    if (layoutDragEl) layoutDragEl.classList.remove('is-layout-dragging');
    layoutDragEl = null;
  });
}

/** Клик в режиме правки: выбираем блок и не уходим по ссылке. */
function onEditClick(event) {
  if (!layoutEditMode) return;
  if (event.target.closest('.layout-bar')) return;

  const container = event.target.closest('[data-sortable]');
  const item = container ? sortableItemFrom(event.target, container) : null;

  // Служебные элементы (логотип, кнопка меню, панель блоков) не двигаются
  if (!item || item.hasAttribute('data-sortable-pin')) {
    selectBlock(null);
    return;
  }

  // Внутри блока могли нажать кнопку — в режиме правки это выбор блока
  event.preventDefault();
  event.stopPropagation();
  selectBlock(item);
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  applyLayout();

  document.querySelectorAll('[data-sortable]').forEach(container => {
    enableDrag(container);

    const used = new Set();

    sortableChildren(container).forEach((el, index) => {
      // Ключ должен быть уникальным внутри контейнера
      let key = blockKey(el, index);
      let suffix = 1;
      const base = key;

      while (used.has(key)) {
        suffix += 1;
        key = base + '~' + suffix;
      }

      used.add(key);
      el.dataset.blockKey = key;
    });
  });

  // Клик-выбор работает в фазе перехвата, чтобы не сработали ссылки
  document.addEventListener('click', onEditClick, true);

  // Esc выключает режим правки
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && layoutEditMode) toggleLayoutEdit(false);
  });
});

/* Экспорт */
window.toggleLayoutEdit = toggleLayoutEdit;
window.resetLayout = resetLayout;
window.applyLayout = applyLayout;
window.moveSelectedBlock = moveSelectedBlock;
window.isLayoutEditMode = () => layoutEditMode;
