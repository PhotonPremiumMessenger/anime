/* ============================================================
   hotkeys.js — горячие клавиши и палитра команд
   Ctrl/⌘ + K открывает палитру: по ней ищутся страницы и действия.
   «?» показывает шпаргалку по клавишам. Ничего не ломает формы:
   в полях ввода шорткаты не срабатывают.
   ============================================================ */

'use strict';

// Куда можно прыгнуть из палитры
const COMMAND_PAGES = [
  { title: 'Главная', hint: 'главная', url: './', icon: '🏠' },
  { title: 'Поиск по сайту', hint: 'search', url: 'search', icon: '🔎' },
  { title: 'Уроки', hint: 'lessons', url: 'lessons', icon: '📚' },
  { title: 'Флешкарты', hint: 'flashcards', url: 'flashcards', icon: '🃏' },
  { title: 'Кандзи-пары', hint: 'match', url: 'match', icon: '🧩' },
  { title: 'Избранное', hint: 'favorites', url: 'favorites', icon: '⭐' },
  { title: 'Слабые места', hint: 'weakspots', url: 'weakspots', icon: '🎯' },
  { title: 'Аудирование', hint: 'listening', url: 'listening', icon: '🎧' },
  { title: 'Пробный экзамен JLPT', hint: 'exam', url: 'exam', icon: '📝' },
  { title: 'Аниме', hint: 'anime', url: 'anime', icon: '🎌' },
  { title: 'Тесты', hint: 'tests', url: 'tests', icon: '✅' },
  { title: 'Грамматика', hint: 'grammar', url: 'grammar', icon: '🈴' },
  { title: 'Словарь', hint: 'dictionary', url: 'dictionary', icon: '📖' },
  { title: 'Видео-уроки', hint: 'video', url: 'video', icon: '🎬' },
  { title: 'Рейтинг', hint: 'rating', url: 'rating', icon: '🏆' },
  { title: 'Магазин', hint: 'shop', url: 'shop', icon: '🛍' },
  { title: 'Тест на скорость', hint: 'speed', url: 'speed', icon: '⚡' },
  { title: 'Профиль', hint: 'profile', url: 'profile', icon: '👤' },
  { title: 'Настройки', hint: 'settings', url: 'settings', icon: '⚙️' },
  { title: 'Обновления', hint: 'updates', url: 'updates', icon: '🆕' },
  { title: 'О проекте', hint: 'about', url: 'about', icon: 'ℹ️' }
];

const COMMAND_ACTIONS = [
  { id: 'theme', title: 'Переключить тему', hint: 'тёмная → сакура → светлая', icon: '🎨' },
  { id: 'design', title: 'Открыть панель дизайна', hint: 'цвета и сакура', icon: '🖌' },
  { id: 'notify', title: 'Показать уведомления', hint: 'колокольчик в шапке', icon: '🔔' },
  { id: 'refresh', title: 'Перезагрузить страницу', hint: 'F5', icon: '🔄' }
];

const HOTKEY_HELP = [
  ['Ctrl / ⌘ + K', 'Палитра команд'],
  ['Shift + ?', 'Эта шпаргалка'],
  ['Esc', 'Закрыть окно или панель'],
  ['Space / Enter', 'Перевернуть флешкарту'],
  ['1 – 3', 'Оценка карточки, 1 – 4 ответ в экзамене'],
  ['T', 'Сменить тему'],
  ['P', 'Профиль']
];

let paletteOpen = false;

/* ---------- Палитра ---------- */

/** Открывает палитру. */
function openCommandPalette() {
  const box = document.getElementById('commandPalette');
  if (!box) return;

  box.classList.add('open');
  paletteOpen = true;

  const input = document.getElementById('commandInput');
  if (input) {
    input.value = '';
    input.focus();
  }

  renderCommandResults('');
  document.body.classList.add('modal-open');
}

/** Закрывает палитру. */
function closeCommandPalette() {
  const box = document.getElementById('commandPalette');
  if (box) box.classList.remove('open');
  paletteOpen = false;
  document.body.classList.remove('modal-open');
}

/** Фильтрует и рисует результаты. */
function renderCommandResults(query) {
  const box = document.getElementById('commandResults');
  if (!box) return;

  const needle = String(query || '').trim().toLowerCase();

  const pages = COMMAND_PAGES.filter(item =>
    !needle || item.title.toLowerCase().includes(needle) || item.hint.includes(needle)
  );

  const actions = COMMAND_ACTIONS.filter(item =>
    !needle || item.title.toLowerCase().includes(needle)
  );

  if (!pages.length && !actions.length) {
    box.innerHTML = '<div class="command-empty">Ничего не нашлось. Попробуй «уроки» или «экзамен».</div>';
    return;
  }

  box.innerHTML = `
    ${pages.length ? `<div class="command-group-title">Страницы</div>` : ''}
    ${pages.map(item => `
      <button class="command-item" onclick="runCommandPage('${item.url}')">
        <span class="command-icon">${item.icon}</span>
        <span class="command-title">${item.title}</span>
        <span class="command-hint">${item.hint}</span>
      </button>
    `).join('')}

    ${actions.length ? `<div class="command-group-title">Действия</div>` : ''}
    ${actions.map(item => `
      <button class="command-item" onclick="runCommandAction('${item.id}')">
        <span class="command-icon">${item.icon}</span>
        <span class="command-title">${item.title}</span>
        <span class="command-hint">${item.hint}</span>
      </button>
    `).join('')}
  `;
}

/** Переход по странице из палитры. */
function runCommandPage(url) {
  closeCommandPalette();
  window.location.href = url;
}

/** Действие из палитры. */
function runCommandAction(id) {
  closeCommandPalette();

  if (id === 'theme' && typeof cycleTheme === 'function') cycleTheme();
  if (id === 'design' && typeof toggleDesignPanel === 'function') toggleDesignPanel();
  if (id === 'notify' && typeof toggleNotifyPanel === 'function') toggleNotifyPanel();
  if (id === 'refresh') window.location.reload();
}

/* ---------- Шпаргалка ---------- */

/** Показывает список клавиш. */
function openHotkeyHelp() {
  const box = document.getElementById('hotkeyHelp');
  if (!box) return;

  const body = document.getElementById('hotkeyHelpBody');
  if (body) {
    body.innerHTML = HOTKEY_HELP.map(([keys, text]) => `
      <div class="hotkey-row">
        <kbd>${keys}</kbd>
        <span>${text}</span>
      </div>
    `).join('');
  }

  box.classList.add('open');
}

/** Закрывает шпаргалку. */
function closeHotkeyHelp() {
  const box = document.getElementById('hotkeyHelp');
  if (box) box.classList.remove('open');
}

/* ---------- Смена темы по кругу ---------- */

/** Переключает три темы по очереди. */
function cycleTheme() {
  const order = ['default', 'sakura', 'light'];

  // Тема живёт в localStorage и в классах body: theme-sakura / theme-light
  let current = localStorage.getItem('theme') || 'default';
  if (document.body.classList.contains('theme-light')) current = 'light';
  if (document.body.classList.contains('theme-sakura')) current = 'sakura';

  const next = order[(order.indexOf(current) + 1) % order.length];

  if (typeof setTheme === 'function') setTheme(next);
  if (typeof showToast === 'function') showToast('Тема', next === 'default' ? 'Стандарт' : next === 'sakura' ? 'Сакура' : 'Светлая', 'info');
}

/* ---------- Сборка разметки ---------- */

/** Вставляет палитру и шпаргалку в страницу. */
function mountHotkeyUI() {
  if (!document.getElementById('commandPalette')) {
    const palette = document.createElement('div');
    palette.className = 'command-overlay';
    palette.id = 'commandPalette';
    palette.innerHTML = `
      <div class="command-box" role="dialog" aria-label="Палитра команд">
        <input class="command-input" id="commandInput" placeholder="Куда идём? Уроки, экзамен, магазин…"
               autocomplete="off" oninput="renderCommandResults(this.value)">
        <div class="command-results" id="commandResults"></div>
        <div class="command-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> — выбор</span>
          <span><kbd>Enter</kbd> — открыть</span>
          <span><kbd>Esc</kbd> — закрыть</span>
        </div>
      </div>
    `;
    palette.addEventListener('click', event => {
      if (event.target === palette) closeCommandPalette();
    });
    document.body.appendChild(palette);
  }

  if (!document.getElementById('hotkeyHelp')) {
    const help = document.createElement('div');
    help.className = 'command-overlay';
    help.id = 'hotkeyHelp';
    help.innerHTML = `
      <div class="command-box hotkey-box" role="dialog" aria-label="Горячие клавиши">
        <div class="hotkey-head">
          <b>Горячие клавиши</b>
          <button class="btn btn-ghost btn-small" onclick="closeHotkeyHelp()">Закрыть</button>
        </div>
        <div id="hotkeyHelpBody"></div>
      </div>
    `;
    help.addEventListener('click', event => {
      if (event.target === help) closeHotkeyHelp();
    });
    document.body.appendChild(help);
  }
}

/* ---------- Клавиши ---------- */

document.addEventListener('DOMContentLoaded', () => {
  mountHotkeyUI();

  document.addEventListener('keydown', event => {
    const tag = (event.target.tagName || '').toLowerCase();
    const inField = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target.isContentEditable;

    // Палитра: работает и из поля ввода
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (paletteOpen) closeCommandPalette();
      else openCommandPalette();
      return;
    }

    if (event.key === 'Escape') {
      if (paletteOpen) closeCommandPalette();
      closeHotkeyHelp();
      return;
    }

    if (inField) return;

    // Enter в открытой палитре открывает первый результат
    if (paletteOpen && event.key === 'Enter') {
      const first = document.querySelector('#commandResults .command-item');
      if (first) {
        event.preventDefault();
        first.click();
      }
      return;
    }

    if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
      event.preventDefault();
      openHotkeyHelp();
      return;
    }

    if (event.key.toLowerCase() === 't') cycleTheme();
    if (event.key.toLowerCase() === 'p') window.location.href = 'profile';
  });
});

/* Экспорт в глобальную область */
window.openCommandPalette = openCommandPalette;
window.closeCommandPalette = closeCommandPalette;
window.renderCommandResults = renderCommandResults;
window.runCommandPage = runCommandPage;
window.runCommandAction = runCommandAction;
window.openHotkeyHelp = openHotkeyHelp;
window.closeHotkeyHelp = closeHotkeyHelp;
window.cycleTheme = cycleTheme;
