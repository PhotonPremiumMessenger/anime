/* ============================================================
   suggest.js — подсказки под полем поиска
   Работает на всех страницах, где есть поиск: подключается к
   полям с id searchInput / lessonSearch / animeSearch /
   grammarSearch и к любым полям с атрибутом data-suggest.
   Данные лежат в js/search-data.js (массив SEARCH_SUGGESTIONS).
   Клик по подсказке ведёт на нужную страницу.
   ============================================================ */

'use strict';

// Сколько подсказок показываем
const SUGGEST_LIMIT = 5;

// Поля, к которым подключаемся по умолчанию
const SUGGEST_INPUTS = ['searchInput', 'lessonSearch', 'animeSearch', 'grammarSearch'];

/* ---------- Поиск ---------- */

/** Приводит строку к виду для сравнения: нижний регистр, ё → е. */
function suggestNormalize(text) {
  return String(text || '').toLowerCase().replace(/ё/g, 'е').trim();
}

/** Оценка совпадения: чем больше, тем выше в списке. */
function suggestScore(item, query) {
  const title = suggestNormalize(item.title);
  const keys = suggestNormalize(item.keys);
  const subtitle = suggestNormalize(item.subtitle);

  if (title.startsWith(query)) return 100;
  if (title.includes(query)) return 80;

  // Совпадение с началом отдельного слова в ключах
  if (keys.split(/\s+/).some(word => word.startsWith(query))) return 60;
  if (keys.includes(query)) return 40;
  if (subtitle.includes(query)) return 20;

  return 0;
}

/**
 * Первые подсказки по запросу.
 * @param {string} query — то, что ввёл игрок
 * @returns {Array} до пяти записей из SEARCH_SUGGESTIONS
 */
function searchSuggestions(query) {
  const needle = suggestNormalize(query);
  if (needle.length < 2) return [];

  const data = Array.isArray(window.SEARCH_SUGGESTIONS) ? window.SEARCH_SUGGESTIONS : [];

  return data
    .map(item => ({ item: item, score: suggestScore(item, needle) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.length - b.item.title.length)
    .slice(0, SUGGEST_LIMIT)
    .map(entry => entry.item);
}

/* ---------- Выпадающий список ---------- */

let suggestBox = null;      // сам список
let suggestInput = null;    // поле, к которому он привязан
let suggestItems = [];      // текущие подсказки
let suggestActive = -1;     // выбранная стрелками строка

/** Создаёт (один раз) общий список подсказок. */
function getSuggestBox() {
  if (suggestBox) return suggestBox;

  suggestBox = document.createElement('div');
  suggestBox.className = 'suggest-pop';
  suggestBox.id = 'suggestPop';
  suggestBox.setAttribute('role', 'listbox');
  suggestBox.hidden = true;
  document.body.appendChild(suggestBox);

  // Клик по строке — переход. mousedown, чтобы поле не потеряло фокус раньше времени
  suggestBox.addEventListener('mousedown', event => {
    const row = event.target.closest('.suggest-item');
    if (!row) return;
    event.preventDefault();
    openSuggestion(Number(row.dataset.index));
  });

  return suggestBox;
}

/** Ставит список под полем. */
function positionSuggestBox(input) {
  const box = getSuggestBox();
  const rect = input.getBoundingClientRect();

  box.style.top = Math.round(rect.bottom + 6) + 'px';
  box.style.left = Math.round(rect.left) + 'px';
  box.style.width = Math.max(220, Math.round(rect.width)) + 'px';
}

/** Прячет список. */
function hideSuggestions() {
  if (!suggestBox) return;
  suggestBox.hidden = true;
  suggestBox.innerHTML = '';
  suggestItems = [];
  suggestActive = -1;
}

/** Отрисовывает список подсказок. */
function renderSuggestions(input) {
  const box = getSuggestBox();
  const found = searchSuggestions(input.value);

  suggestInput = input;
  suggestItems = found;
  suggestActive = -1;

  if (!found.length) {
    hideSuggestions();
    return;
  }

  box.innerHTML = found.map((item, index) => `
    <button type="button" class="suggest-item" role="option" data-index="${index}">
      <span class="suggest-type">${item.type}</span>
      <span class="suggest-body">
        <b>${suggestEscape(item.title)}</b>
        <span>${suggestEscape(item.subtitle || '')}</span>
      </span>
    </button>
  `).join('');

  positionSuggestBox(input);
  box.hidden = false;
}

/** Экранирование текста для вставки в разметку. */
function suggestEscape(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Подсвечивает строку под номером. */
function highlightSuggestion(index) {
  if (!suggestBox || !suggestItems.length) return;

  // По кругу: выше первой — последняя, ниже последней — первая
  suggestActive = (index + suggestItems.length) % suggestItems.length;

  suggestBox.querySelectorAll('.suggest-item').forEach((row, i) => {
    row.classList.toggle('is-active', i === suggestActive);
  });
}

/** Переход по подсказке. */
function openSuggestion(index) {
  const item = suggestItems[index];
  if (!item) return;

  hideSuggestions();

  if (item.url) {
    window.location.href = item.url;
  } else if (suggestInput) {
    // Если адреса нет — просто подставляем название в поле
    suggestInput.value = item.title;
    suggestInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/* ---------- Подключение к полям ---------- */

/** Вешает подсказки на одно поле. */
function attachSuggestions(input) {
  if (!input || input.dataset.suggestReady === 'true') return;
  input.dataset.suggestReady = 'true';
  input.setAttribute('autocomplete', 'off');

  input.addEventListener('input', () => renderSuggestions(input));
  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 2) renderSuggestions(input);
  });

  input.addEventListener('keydown', event => {
    if (suggestBox && !suggestBox.hidden) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        highlightSuggestion(suggestActive + 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        highlightSuggestion(suggestActive - 1);
        return;
      }
      if (event.key === 'Enter' && suggestActive >= 0) {
        event.preventDefault();
        openSuggestion(suggestActive);
        return;
      }
      if (event.key === 'Escape') {
        hideSuggestions();
        return;
      }
    }

    // Enter без выбранной строки: на главной уводим на страницу поиска
    if (event.key === 'Enter' && input.dataset.suggestGo === 'search') {
      const query = input.value.trim();
      if (query) {
        event.preventDefault();
        window.location.href = 'search?q=' + encodeURIComponent(query);
      }
    }
  });

  // Список привязан к координатам поля — при прокрутке просто закрываем
  window.addEventListener('scroll', hideSuggestions, { passive: true });
  window.addEventListener('resize', hideSuggestions);
}

/** Находит все поля поиска на странице и подключает подсказки. */
function initSearchSuggestions() {
  const inputs = [];

  SUGGEST_INPUTS.forEach(id => {
    const input = document.getElementById(id);
    if (input) inputs.push(input);
  });

  document.querySelectorAll('input[data-suggest]').forEach(input => {
    if (!inputs.includes(input)) inputs.push(input);
  });

  if (!inputs.length) return;

  inputs.forEach(attachSuggestions);

  // Клик мимо списка и поля — закрываем
  document.addEventListener('click', event => {
    if (event.target.closest('.suggest-pop') || event.target.closest('[data-suggest]')) return;
    if (SUGGEST_INPUTS.some(id => event.target.id === id)) return;
    hideSuggestions();
  });
}

document.addEventListener('DOMContentLoaded', initSearchSuggestions);

/* Экспорт в глобальную область */
window.searchSuggestions = searchSuggestions;
window.initSearchSuggestions = initSearchSuggestions;
window.hideSuggestions = hideSuggestions;
