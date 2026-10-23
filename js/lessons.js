/* ============================================================
   lessons.js — каталог уроков (lessons.html)
   Рисует карточки из nihongo_lessons, показывает прогресс
   и фильтрует по уровню и поиску.
   ============================================================ */

'use strict';

let activeLevel = 'all';
let searchQuery = '';

/* ---------- Отрисовка каталога ---------- */

/**
 * Перерисовывает сетку карточек с учётом фильтров.
 */
function renderLessons() {
  const grid = document.getElementById('lessonsGrid');
  if (!grid) return;

  const lessons = window.nihongo_lessons || [];
  const query = searchQuery.trim().toLowerCase();

  // Фильтр по уровню и поиску по названию/описанию/словам
  const filtered = lessons.filter(lesson => {
    const levelOk = activeLevel === 'all' || lesson.level === activeLevel;

    const textOk = !query ||
      lesson.title.toLowerCase().includes(query) ||
      lesson.description.toLowerCase().includes(query) ||
      lesson.words.some(word =>
        word.jp.includes(query) ||
        word.romaji.toLowerCase().includes(query) ||
        word.ru.toLowerCase().includes(query)
      );

    return levelOk && textOk;
  });

  grid.innerHTML = '';

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state">Ничего не нашлось. Попробуй другой запрос или уровень.</div>';
    return;
  }

  filtered.forEach((lesson, index) => {
    grid.appendChild(buildLessonCard(lesson, index));
  });
}

/**
 * Собирает карточку урока.
 * @param {object} lesson
 * @param {number} index — для задержки появления
 */
function buildLessonCard(lesson, index) {
  const record = getLessonProgress(lesson.id);
  const percent = record ? Math.max(record.best || 0, record.percent || 0) : 0;
  const completed = Boolean(record && record.completed);

  const card = document.createElement('a');
  card.className = 'lesson-card reveal';
  card.href = 'lesson.html?id=' + lesson.id;
  card.style.transitionDelay = (index * 60) + 'ms';

  // Статус в правом верхнем углу обложки
  const statusText = completed ? 'Пройден' : (percent > 0 ? 'Продолжить' : 'Начать');
  const statusClass = completed ? 'done' : (percent > 0 ? 'progress' : '');

  card.innerHTML = `
    <div class="lesson-cover">
      <img src="${lesson.cover}" alt="${lesson.title}" loading="lazy">
      <span class="lesson-level">${lesson.level}</span>
      <span class="lesson-status ${statusClass}">${statusText}</span>
    </div>

    <div class="lesson-card-body">
      <h3 class="lesson-title"></h3>
      <p class="lesson-desc"></p>

      <div class="lesson-chips">
        <span class="chip">⏱ ${lesson.duration} мин</span>
        <span class="chip">語 ${lesson.words.length} слов</span>
        <span class="chip">✓ ${lesson.test.length} вопросов</span>
      </div>

      <div class="lesson-progress">
        <div class="lesson-progress-top">
          <span>Прогресс</span>
          <b>${percent}%</b>
        </div>
        <div class="lesson-progress-bar">
          <span style="width:${percent}%"></span>
        </div>
      </div>
    </div>
  `;

  // Текст подставляем через textContent — безопаснее
  card.querySelector('.lesson-title').textContent = lesson.title;
  card.querySelector('.lesson-desc').textContent = lesson.description;

  return card;
}

/* ---------- Фильтры ---------- */

/**
 * Переключает уровень.
 * @param {string} level — all | N5 | N4
 * @param {HTMLElement} element — нажатый чип
 */
function filterLessons(level, element) {
  activeLevel = level;

  document.querySelectorAll('.filter-chips .chip').forEach(chip => {
    chip.classList.remove('chip-active');
  });

  if (element) element.classList.add('chip-active');

  renderLessons();
}

/** Обработчик строки поиска. */
function onLessonSearch(value) {
  searchQuery = value;
  renderLessons();
}

/* ---------- Верхняя статистика ---------- */

/** Заполняет полосу «пройдено уроков / слов / достижений». */
function renderCatalogStats() {
  const stats = getStats();
  const total = (window.nihongo_lessons || []).length;

  const doneEl = document.getElementById('catalogDone');
  const wordsEl = document.getElementById('catalogWords');
  const achEl = document.getElementById('catalogAchievements');
  const barEl = document.getElementById('catalogBar');
  const percentEl = document.getElementById('catalogPercent');

  if (doneEl) doneEl.textContent = stats.lessons + ' / ' + total;
  if (wordsEl) wordsEl.textContent = String(stats.words);
  if (achEl) achEl.textContent = stats.achievements.length + ' / ' + ACHIEVEMENTS.length;

  const percent = total ? Math.round((stats.lessons / total) * 100) : 0;
  if (barEl) barEl.style.width = percent + '%';
  if (percentEl) percentEl.textContent = percent + '%';
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  updateHeaderAuth();
  renderCatalogStats();
  renderLessons();

  // Esc очищает поиск
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const input = document.getElementById('lessonSearch');
      if (input && document.activeElement === input) {
        input.value = '';
        onLessonSearch('');
        input.blur();
      }
    }
  });
});

/* Экспорт в глобальную область */
window.renderLessons = renderLessons;
window.filterLessons = filterLessons;
window.onLessonSearch = onLessonSearch;
window.renderCatalogStats = renderCatalogStats;
