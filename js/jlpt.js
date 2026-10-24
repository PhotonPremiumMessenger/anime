/* ============================================================
   jlpt.js — уровень японского N5 / N4 / N3
   Выбор хранится в nihongo_jlpt и в аккаунте (поле jlpt).
   Уровень фильтрует уроки, тесты, словарь и каталог аниме.
   ============================================================ */

'use strict';

const JLPT_KEY = 'nihongo_jlpt';

/** Доступные уровни. */
const JLPT_LEVELS = [
  { id: 'all', name: 'Все уровни', short: 'Все', desc: 'Показывать всё подряд' },
  { id: 'N5', name: 'N5 — начальный', short: 'N5', desc: 'Хирагана, катакана, базовые фразы' },
  { id: 'N4', name: 'N4 — базовый', short: 'N4', desc: 'Простая грамматика и бытовая лексика' },
  { id: 'N3', name: 'N3 — средний', short: 'N3', desc: 'Сложные тексты и идиомы' }
];

/** Текущий уровень. */
function getJLPT() {
  const saved = readJSON(JLPT_KEY, null);
  if (saved && JLPT_LEVELS.some(level => level.id === saved)) return saved;

  // Пробуем взять из аккаунта
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (user && user.jlpt && JLPT_LEVELS.some(level => level.id === user.jlpt)) return user.jlpt;

  return 'all';
}

/**
 * Устанавливает уровень.
 * @param {string} level — 'all' | 'N5' | 'N4' | 'N3'
 * @param {boolean} silent — без всплывашки
 */
function setJLPT(level, silent = false) {
  const value = JLPT_LEVELS.some(item => item.id === level) ? level : 'all';

  writeJSON(JLPT_KEY, value);

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (user && typeof updateUserRecord === 'function') {
    updateUserRecord(user.username, { jlpt: value });
  }

  renderJLPTSwitchers();
  applyJLPTToPage();

  if (!silent) {
    const info = JLPT_LEVELS.find(item => item.id === value);
    if (typeof showToast === 'function') {
      showToast('Уровень: ' + info.short, info.desc, 'info');
    }
  }

  return value;
}

/** Название текущего уровня. */
function getJLPTName() {
  return (JLPT_LEVELS.find(item => item.id === getJLPT()) || JLPT_LEVELS[0]).name;
}

/* ---------- Применение к странице ---------- */

/** Находит chip по тексту. */
function findChip(containerSelector, text) {
  return Array.from(document.querySelectorAll(containerSelector + ' .chip'))
    .find(chip => chip.textContent.trim() === text) || null;
}

/**
 * Прокидывает выбранный уровень в фильтры активной страницы.
 * Каждая страница использует свою функцию фильтрации.
 */
function applyJLPTToPage() {
  const level = getJLPT();

  // Уроки
  if (typeof filterLessons === 'function' && document.getElementById('lessonsGrid')) {
    const chip = findChip('.filter-chips', level === 'all' ? 'Все' : level);
    if (chip) filterLessons(level, chip);
  }

  // Аниме
  if (typeof filterAnimeLevel === 'function' && document.getElementById('animeGrid')) {
    const chip = findChip('.anime-levels', level === 'all' ? 'Все' : level);
    if (chip) filterAnimeLevel(level, chip);
  }

  // Словарь
  if (typeof filterDictionaryLevel === 'function' && document.getElementById('dictGrid')) {
    const chip = findChip('.dict-levels', level === 'all' ? 'Все уровни' : level);
    if (chip) filterDictionaryLevel(level, chip);
  }

  // Тесты
  if (typeof filterTestsLevel === 'function' && document.getElementById('testsGrid')) {
    filterTestsLevel(level);
  }

  // Грамматика
  if (typeof filterGrammar === 'function' && document.getElementById('grammarGrid')) {
    const chip = findChip('.grammar-filters', level === 'all' ? 'Все' : level);
    if (chip) filterGrammar(level, chip);
  }
}

/* ---------- Переключатель ---------- */

/** Рисует все переключатели уровня на странице. */
function renderJLPTSwitchers() {
  const level = getJLPT();

  document.querySelectorAll('[data-jlpt-switcher]').forEach(box => {
    box.innerHTML = '';

    JLPT_LEVELS.forEach(item => {
      const button = document.createElement('button');
      button.className = 'jlpt-chip' + (item.id === level ? ' is-active' : '');
      button.type = 'button';
      button.innerHTML = `<b>${item.short}</b><span>${item.desc}</span>`;
      button.title = item.name;
      button.addEventListener('click', () => setJLPT(item.id));
      box.appendChild(button);
    });
  });

  // Подписи в интерфейсе
  document.querySelectorAll('[data-jlpt-label]').forEach(el => {
    el.textContent = getJLPTName();
  });
}

/* ---------- Прогресс по уровням ---------- */

/** Сколько уроков каждого уровня пройдено. */
function getJLPTProgress() {
  const lessons = window.nihongo_lessons || [];
  const progress = typeof getProgress === 'function' ? getProgress() : { lessons: {} };

  const byLevel = {};

  lessons.forEach(lesson => {
    const level = lesson.level || 'N5';
    if (!byLevel[level]) byLevel[level] = { total: 0, done: 0 };
    byLevel[level].total += 1;

    const record = progress.lessons[String(lesson.id)];
    if (record && record.completed) byLevel[level].done += 1;
  });

  return byLevel;
}

/** Рисует карточки прогресса по уровням (в профиле или настройках). */
function renderJLPTProgress(containerId = 'jlptProgress') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const byLevel = getJLPTProgress();
  const current = getJLPT();

  box.innerHTML = '';

  ['N5', 'N4', 'N3'].forEach(level => {
    const data = byLevel[level] || { total: 0, done: 0 };
    const percent = data.total ? Math.round((data.done / data.total) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'jlpt-progress-card' + (current === level ? ' is-current' : '');
    card.innerHTML = `
      <div class="jlpt-progress-top">
        <b>${level}</b>
        <span>${data.done} / ${data.total}</span>
      </div>
      <div class="progress-bar"><span style="width:${percent}%"></span></div>
      <span class="jlpt-progress-note">${data.total
        ? percent + '% уроков уровня'
        : 'уроки появятся позже'}</span>
    `;

    box.appendChild(card);
  });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderJLPTSwitchers();
  renderJLPTProgress();

  // Применяем фильтр после того, как страница нарисовала свои блоки
  setTimeout(() => {
    if (getJLPT() !== 'all') applyJLPTToPage();
  }, 60);
});

/* Экспорт в глобальную область */
window.JLPT_LEVELS = JLPT_LEVELS;
window.getJLPT = getJLPT;
window.setJLPT = setJLPT;
window.getJLPTName = getJLPTName;
window.applyJLPTToPage = applyJLPTToPage;
window.renderJLPTSwitchers = renderJLPTSwitchers;
window.renderJLPTProgress = renderJLPTProgress;
window.getJLPTProgress = getJLPTProgress;
