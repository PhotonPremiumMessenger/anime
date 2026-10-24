/* ============================================================
   activity.js — история активности
   Каждое заметное действие пишется в nihongo_activity (до 120 событий).
   Используется в профиле и для графиков на странице статистики.
   ============================================================ */

'use strict';

const ACTIVITY_KEY = 'nihongo_activity';
const ACTIVITY_LIMIT = 120;

/* ---------- Типы событий ---------- */

const ACTIVITY_TYPES = {
  lesson:       { icon: '本', group: 'study',  title: 'Пройден урок' },
  word:         { icon: '語', group: 'study',  title: 'Новые слова' },
  test:         { icon: '✓', group: 'study',  title: 'Пройден тест' },
  grammar:      { icon: '文', group: 'study',  title: 'Правило грамматики' },
  quiz:         { icon: '?', group: 'study',  title: 'Викторина дня' },
  speed:        { icon: '⚡', group: 'study',  title: 'Тест на скорость' },
  visit:        { icon: '🌅', group: 'study',  title: 'Заход на сайт' },
  achievement:  { icon: '🏆', group: 'reward', title: 'Достижение' },
  level:        { icon: '↑', group: 'reward', title: 'Новый уровень' },
  shop:         { icon: '🎁', group: 'reward', title: 'Покупка в магазине' },
  easter:       { icon: '🕵️', group: 'reward', title: 'Пасхалка' },
  friend:       { icon: '👥', group: 'social', title: 'Новый друг' },
  share:        { icon: '↗', group: 'social', title: 'Поделился' },
  bio:          { icon: '✎', group: 'social', title: 'Профиль' },
  custom:       { icon: '🎨', group: 'social', title: 'Оформление' }
};

/* ---------- Запись ---------- */

/** Вся история, новые события первыми. */
function getActivity() {
  const list = readJSON(ACTIVITY_KEY, []);
  return Array.isArray(list) ? list : [];
}

/**
 * Добавляет событие в историю.
 * @param {string} type — ключ из ACTIVITY_TYPES
 * @param {string} text — что именно произошло
 * @param {number} xp — сколько опыта начислено
 */
function logActivity(type, text, xp = 0) {
  const meta = ACTIVITY_TYPES[type] || { icon: '•', group: 'study', title: 'Событие' };

  const list = getActivity();
  list.unshift({
    type: type,
    group: meta.group,
    text: String(text || ''),
    xp: Number(xp) || 0,
    at: new Date().toISOString()
  });

  writeJSON(ACTIVITY_KEY, list.slice(0, ACTIVITY_LIMIT));

  // Если блок открыт — обновляем сразу
  if (document.getElementById('activityBlock')) renderActivityHistory();
}

/** Очищает историю (кнопка в профиле). */
function clearActivity() {
  writeJSON(ACTIVITY_KEY, []);
  renderActivityHistory();

  if (typeof showToast === 'function') showToast('История очищена', 'События удалены из этого браузера', 'info');
}

/* ---------- Отрисовка ---------- */

let activityFilter = 'all';

/** Меняет фильтр истории. */
function filterActivity(group, button) {
  activityFilter = group;
  document.querySelectorAll('.activity-filters .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');
  renderActivityHistory();
}

/** Группирует события по дням. */
function groupActivityByDay(list) {
  const groups = new Map();

  list.forEach(event => {
    const date = new Date(event.at);
    const key = date.toISOString().slice(0, 10);

    if (!groups.has(key)) groups.set(key, { date: date, items: [] });
    groups.get(key).items.push(event);
  });

  return Array.from(groups.values());
}

/** Заголовок дня: «Сегодня», «Вчера» или дата. */
function activityDayLabel(date) {
  const today = new Date();
  const key = date.toISOString().slice(0, 10);
  const todayKey = today.toISOString().slice(0, 10);

  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (key === todayKey) return 'Сегодня';
  if (key === yesterdayKey) return 'Вчера';

  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  return date.getDate() + ' ' + months[date.getMonth()];
}

/** Время события «14:32». */
function activityTime(iso) {
  const date = new Date(iso);
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

/** Рисует ленту активности. */
function renderActivityHistory(containerId = 'activityBlock') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const all = getActivity();
  const list = activityFilter === 'all'
    ? all
    : all.filter(event => event.group === activityFilter);

  const counter = document.getElementById('activityCount');
  if (counter) counter.textContent = list.length ? 'событий: ' + list.length : 'пока пусто';

  if (!list.length) {
    box.innerHTML = `
      <div class="empty-state">
        Пока ничего не происходило. Пройди урок или ответь на викторину — и здесь появится история.
      </div>
    `;
    return;
  }

  const groups = groupActivityByDay(list);
  box.innerHTML = '';

  groups.forEach(group => {
    const day = document.createElement('div');
    day.className = 'activity-day';

    const head = document.createElement('div');
    head.className = 'activity-day-head';
    head.textContent = activityDayLabel(group.date);
    day.appendChild(head);

    group.items.forEach(event => {
      const meta = ACTIVITY_TYPES[event.type] || { icon: '•', title: 'Событие' };

      const row = document.createElement('div');
      row.className = 'activity-event group-' + event.group;
      row.innerHTML = `
        <span class="activity-event-icon">${meta.icon}</span>
        <span class="activity-event-body">
          <b></b>
          <span></span>
        </span>
        <span class="activity-event-time">${activityTime(event.at)}</span>
      `;

      row.querySelector('.activity-event-body b').textContent = meta.title;
      row.querySelector('.activity-event-body span').textContent = event.text;

      if (event.xp) {
        const xp = document.createElement('i');
        xp.className = 'activity-event-xp';
        xp.textContent = '+' + event.xp + ' XP';
        row.appendChild(xp);
      }

      day.appendChild(row);
    });

    box.appendChild(day);
  });
}

/* ---------- Автоматическая запись ---------- */

// Любое действие через notifyAction попадает в историю
if (typeof registerActionHook === 'function') {
  registerActionHook((type, amount) => {
    const mapped = {
      lesson: ['lesson', 'Урок пройден'],
      word: ['word', 'Добавлено слов: ' + amount],
      quiz: ['quiz', 'Викторина дня пройдена'],
      quiz_correct: ['quiz', 'Верных ответов: ' + amount],
      speed_correct: ['speed', 'Верных на скорость: ' + amount],
      visit: ['visit', 'Заход на сайт'],
      grammar: ['grammar', 'Изучено правило грамматики'],
      easter: ['easter', 'Найдена пасхалка'],
      share: ['share', 'Поделился фразой'],
      friend: ['friend', 'Добавлен друг'],
      bio: ['bio', 'Обновлено био'],
      shop: ['shop', 'Покупка в магазине']
    };

    const entry = mapped[type];
    if (!entry) return;

    logActivity(entry[0], entry[1]);
  });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderActivityHistory();
});

/* Экспорт в глобальную область */
window.ACTIVITY_TYPES = ACTIVITY_TYPES;
window.getActivity = getActivity;
window.logActivity = logActivity;
window.clearActivity = clearActivity;
window.renderActivityHistory = renderActivityHistory;
window.filterActivity = filterActivity;
