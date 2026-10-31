/* ============================================================
   search.js — поиск по всему сайту
   Ищет по урокам, словарю, грамматике, аниме, тестам и видео.
   Работает на уже загруженных данных, без сети. Используется
   страницей search.html и палитрой команд.
   ============================================================ */

'use strict';

// Какие разделы участвуют и как они подписаны
const SEARCH_SECTION = {
  lesson: { icon: '📘', title: 'Уроки', color: 'lesson' },
  word: { icon: '📖', title: 'Словарь', color: 'word' },
  grammar: { icon: '🈴', title: 'Грамматика', color: 'grammar' },
  anime: { icon: '🎌', title: 'Аниме', color: 'anime' },
  test: { icon: '✅', title: 'Тесты', color: 'test' },
  video: { icon: '🎬', title: 'Видео', color: 'video' }
};

/* ---------- Индекс ---------- */

/** Собирает всё, по чему можно искать. */
function buildSearchIndex() {
  const items = [];

  // Уроки
  (window.anilingo_lessons || []).forEach(lesson => {
    items.push({
      type: 'lesson',
      title: lesson.title,
      jp: '',
      text: (lesson.description || '') + ' ' + (lesson.words || []).map(word => word.jp + ' ' + word.ru).join(' '),
      url: 'lesson.html?id=' + lesson.id,
      meta: lesson.level || ''
    });
  });

  // Словарь
  (typeof getAllDictionaryWords === 'function' ? getAllDictionaryWords() : []).forEach(word => {
    items.push({
      type: 'word',
      title: word.jp + ' — ' + word.ru,
      jp: word.jp,
      text: (word.romaji || '') + ' ' + (word.tag || ''),
      url: 'dictionary.html?q=' + encodeURIComponent(word.jp),
      meta: word.level || ''
    });
  });

  // Грамматика
  (window.GRAMMAR_RULES || []).forEach(rule => {
    items.push({
      type: 'grammar',
      title: rule.title,
      jp: rule.jp,
      text: (rule.short || '') + ' ' + (rule.explanation || []).join(' '),
      url: 'grammar.html?rule=' + rule.id,
      meta: rule.level || ''
    });
  });

  // Аниме
  (window.ANIME_CATALOG || []).forEach(anime => {
    items.push({
      type: 'anime',
      title: anime.title,
      jp: anime.jp,
      text: (anime.genres || []).join(' ') + ' ' + anime.phrase.jp + ' ' + anime.phrase.ru,
      url: 'anime.html?title=' + anime.id,
      meta: anime.level || ''
    });
  });

  // Тесты
  (function () { return typeof getAllTests === 'function' ? getAllTests() : []; })().forEach(test => {
    items.push({
      type: 'test',
      title: test.title,
      jp: '',
      text: test.subtitle || '',
      url: 'tests.html?test=' + test.id,
      meta: test.level || ''
    });
  });

  // Видео-уроки
  (window.VIDEO_LESSONS || []).forEach(video => {
    items.push({
      type: 'video',
      title: video.title,
      jp: '',
      text: video.description || '',
      url: 'video.html',
      meta: ''
    });
  });

  return items;
}

/* ---------- Поиск ---------- */

/**
 * Ищет по индексу.
 * @param {string} query
 * @param {number} limit
 */
function searchSite(query, limit = 30) {
  const needle = String(query || '').trim().toLowerCase();

  // Один кандзи или кана — уже полноценный запрос, две латинские буквы — ещё нет
  const isJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(needle);
  if (needle.length < (isJapanese ? 1 : 2)) return [];

  const index = buildSearchIndex();

  return index
    .map(item => {
      const haystack = (item.title + ' ' + item.jp + ' ' + item.text + ' ' + item.meta).toLowerCase();
      if (!haystack.includes(needle)) return null;

      // Заголовок важнее описания
      let score = 1;
      if (item.title.toLowerCase().includes(needle)) score += 4;
      if (item.jp && item.jp.toLowerCase().includes(needle)) score += 3;
      if (item.title.toLowerCase().startsWith(needle)) score += 3;

      return Object.assign({}, item, { score: score });
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ---------- Страница поиска ---------- */

let searchFilterType = 'all';

/** Читает запрос из адресной строки. */
function searchFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('q') || '';
}

/** Обрабатывает ввод. */
function onSiteSearchInput(value) {
  const box = document.getElementById('searchResults');
  const state = document.getElementById('searchState');

  if (!box) return;

  const query = String(value || '').trim();

  const japanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(query);

  if (query.length < (japanese ? 1 : 2)) {
    box.innerHTML = '';
    if (state) state.textContent = 'Введи хотя бы два символа — или один кандзи. По-русски, ромадзи или кандзи.';
    return;
  }

  const results = searchSite(query).filter(item => searchFilterType === 'all' || item.type === searchFilterType);

  if (state) {
    state.textContent = results.length
      ? 'Найдено: ' + results.length + ' — ' + query
      : 'Ничего не нашлось. Попробуй короче или иначе.';
  }

  box.innerHTML = results.map(item => {
    const section = SEARCH_SECTION[item.type] || { icon: '•', title: 'Разное' };
    return `
      <a class="search-hit" href="${item.url}">
        <span class="search-icon">${section.icon}</span>
        <span class="search-body">
          <b>${item.title}</b>
          ${item.jp ? `<span class="search-jp">${item.jp}</span>` : ''}
        </span>
        <span class="search-meta">${section.title}${item.meta ? ' · ' + item.meta : ''}</span>
      </a>
    `;
  }).join('');
}

/** Меняет фильтр раздела. */
function setSearchFilter(type, button) {
  searchFilterType = type;
  document.querySelectorAll('.search-filters .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');

  const input = document.getElementById('searchInput');
  if (input) onSiteSearchInput(input.value);
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const query = searchFromUrl();
  if (query) {
    input.value = query;
    onSiteSearchInput(query);
  }
});

/* Экспорт в глобальную область */
window.buildSearchIndex = buildSearchIndex;
window.searchSite = searchSite;
window.onSiteSearchInput = onSiteSearchInput;
window.setSearchFilter = setSearchFilter;
