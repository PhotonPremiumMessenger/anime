/* ============================================================
   notify.js — центр уведомлений
   Колокольчик в шапке, панель со списком событий и счётчик
   непрочитанных. Уведомления пишутся в anilingo_notifications
   и не дублируются: одинаковые события за день схлопываются.
   ============================================================ */

'use strict';

const NOTIFY_KEY = 'anilingo_notifications';
const NOTIFY_LIMIT = 40;

/* ---------- Хранилище ---------- */

/** Все уведомления, новые сверху. */
function getNotifications() {
  const saved = readJSON(NOTIFY_KEY, []);
  return Array.isArray(saved) ? saved : [];
}

/** Сколько непрочитанных. */
function getUnreadCount() {
  return getNotifications().filter(item => !item.read).length;
}

/**
 * Добавляет уведомление.
 * @param {string} type — lesson | reward | social | system | exam
 * @param {string} title
 * @param {string} text
 */
function pushNotification(type, title, text = '') {
  const list = getNotifications();
  const day = new Date().toISOString().slice(0, 10);

  // Одно и то же событие за день не повторяем
  const duplicate = list.find(item =>
    item.title === title && item.text === text && String(item.at).slice(0, 10) === day
  );
  if (duplicate) return duplicate;

  const notice = {
    id: 'n' + Date.now() + Math.floor(Math.random() * 1000),
    type: type || 'system',
    title: title,
    text: text,
    at: new Date().toISOString(),
    read: false
  };

  list.unshift(notice);
  writeJSON(NOTIFY_KEY, list.slice(0, NOTIFY_LIMIT));

  renderNotifyBell();
  if (typeof refreshQuickNotifyCount === 'function') refreshQuickNotifyCount();

  if (document.getElementById('notifyPanel') && document.getElementById('notifyPanel').classList.contains('open')) {
    renderNotifyPanel();
  }

  return notice;
}

/** Помечает всё прочитанным. */
function markNotificationsRead() {
  const list = getNotifications().map(item => Object.assign({}, item, { read: true }));
  writeJSON(NOTIFY_KEY, list);
  renderNotifyBell();
  renderNotifyPanel();

  if (typeof refreshQuickNotifyCount === 'function') refreshQuickNotifyCount();
}

/** Удаляет все уведомления. */
function clearNotifications() {
  writeJSON(NOTIFY_KEY, []);
  renderNotifyBell();
  renderNotifyPanel();

  if (typeof refreshQuickNotifyCount === 'function') refreshQuickNotifyCount();
}

/* ---------- Отрисовка ---------- */

const NOTIFY_ICONS = {
  lesson: '📘',
  reward: '🏆',
  social: '🤝',
  system: '⚙️',
  exam: '📝'
};

/** Сколько дней назад. */
function notifyAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  if (diff < 1) return 'только что';
  if (diff < 60) return diff + ' мин назад';
  if (diff < 24 * 60) return Math.floor(diff / 60) + ' ч назад';
  return Math.floor(diff / (24 * 60)) + ' дн назад';
}

/** Рисует колокольчик и счётчик. */
function renderNotifyBell() {
  const button = document.getElementById('notifyBell');
  if (!button) return;

  const unread = getUnreadCount();
  button.classList.toggle('has-unread', unread > 0);

  const badge = button.querySelector('.notify-count');
  if (badge) {
    badge.textContent = unread > 9 ? '9+' : String(unread);
    badge.classList.toggle('hidden', unread === 0);
  }
}

/** Рисует панель. */
function renderNotifyPanel() {
  const panel = document.getElementById('notifyPanelBody');
  if (!panel) return;

  const list = getNotifications();

  if (!list.length) {
    panel.innerHTML = `
      <div class="notify-empty">
        <span>🔔</span>
        <p>Пока тихо. Уведомления появятся сами: достижения, уровни, повторения и напоминания.</p>
      </div>
    `;
    return;
  }

  panel.innerHTML = list.map(item => `
    <div class="notify-item${item.read ? '' : ' is-unread'}">
      <span class="notify-icon">${NOTIFY_ICONS[item.type] || '🔔'}</span>
      <div class="notify-body">
        <b>${item.title}</b>
        ${item.text ? `<span>${item.text}</span>` : ''}
        <time>${notifyAgo(item.at)}</time>
      </div>
    </div>
  `).join('');
}

/** Открывает и закрывает панель. */
function toggleNotifyPanel(event) {
  if (event) event.stopPropagation();

  const panel = document.getElementById('notifyPanel');
  if (!panel) return;

  const willOpen = !panel.classList.contains('open');

  // На телефоне одновременно открыта только одна панель:
  // меню и дизайн закрываются, прежде чем появятся уведомления
  if (willOpen && typeof closeOtherMobilePanels === 'function') {
    closeOtherMobilePanels('notify');
  }

  panel.classList.toggle('open', willOpen);

  if (willOpen) {
    renderNotifyPanel();
    setTimeout(markNotificationsRead, 900);
  }

  if (typeof syncPanelBackdrop === 'function') syncPanelBackdrop();
}

/** Закрывает панель: она плавно уезжает вправо, а не пропадает. */
function closeNotifyPanel() {
  const panel = document.getElementById('notifyPanel');
  if (panel) panel.classList.remove('open');

  if (typeof syncPanelBackdrop === 'function') syncPanelBackdrop();
}

/* ---------- Умные напоминания ---------- */

/**
 * Проверяет состояние и добавляет полезные напоминания.
 * Вызывается один раз за загрузку страницы.
 */
function buildSmartNotifications() {
  // Карточки к повторению
  if (typeof getSRSStats === 'function') {
    const stats = getSRSStats(typeof getJLPT === 'function' ? getJLPT() : 'all');
    if (stats.due > 0) {
      pushNotification('system', 'Карточки ждут повторения', stats.due + ' слов(а) просят внимания');
    }
  }

  // Стрик под угрозой
  if (typeof getStreak === 'function' && typeof getXP === 'function') {
    const streak = getStreak();
    if (streak && streak.count === 0) {
      pushNotification('system', 'Стрик начинается заново', 'Один урок — и счётчик снова пойдёт');
    }
  }

  // Свежий уровень
  if (typeof getLevelInfo === 'function' && typeof getXP === 'function') {
    const level = getLevelInfo(getXP()).level;
    const flag = readJSON('anilingo_notify_level', 0);
    if (level > Number(flag || 0)) {
      pushNotification('reward', 'Новый уровень: ' + level, 'Открой магазин — там открылись предметы');
      writeJSON('anilingo_notify_level', level);
    }
  }
}

/* ---------- Вставка в шапку ---------- */

/** Добавляет колокольчик во все шапки страницы. */
function mountNotifyBell() {
  const container = document.querySelector('.header .container');
  if (!container || document.getElementById('notifyBell')) return;

  const bell = document.createElement('button');
  bell.className = 'notify-bell nav-design';
  bell.id = 'notifyBell';
  bell.type = 'button';
  bell.setAttribute('aria-label', 'Уведомления');
  bell.title = 'Уведомления';
  bell.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"></path>
      <path d="M10.5 20a2 2 0 0 0 3 0"></path>
    </svg>
    <span class="notify-count hidden">0</span>
  `;
  bell.addEventListener('click', toggleNotifyPanel);

  // Кнопка дизайна может лежать внутри .nav, поэтому вставляем рядом с ней
  const anchor = container.querySelector('.nav-design');
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bell, anchor);
  else container.appendChild(bell);

  const panel = document.createElement('div');
  panel.className = 'notify-panel';
  panel.id = 'notifyPanel';
  panel.innerHTML = `
    <div class="notify-head">
      <b>Уведомления</b>
      <div class="notify-actions">
        <button class="btn btn-ghost btn-small" onclick="markNotificationsRead()">Прочитать</button>
        <button class="btn btn-ghost btn-small" onclick="clearNotifications()">Очистить</button>
      </div>
    </div>
    <div class="notify-panel-body" id="notifyPanelBody"></div>
  `;
  document.body.appendChild(panel);

  renderNotifyBell();
  renderNotifyPanel();

  document.addEventListener('click', event => {
    if (!event.target.closest('#notifyPanel') && !event.target.closest('#notifyBell')) closeNotifyPanel();
  });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  mountNotifyBell();
  buildSmartNotifications();
  renderNotifyBell();

  // Следим за достижениями и уровнями: addXP уже шлёт события в шину
  if (typeof registerActionHook === 'function') {
    let lastLevel = typeof getLevelInfo === 'function' && typeof getXP === 'function'
      ? getLevelInfo(getXP()).level
      : 1;

    registerActionHook((type, value, extra) => {
      if (typeof getLevelInfo === 'function' && typeof getXP === 'function') {
        const level = getLevelInfo(getXP()).level;
        if (level > lastLevel) {
          pushNotification('reward', 'Новый уровень: ' + level, extra && extra.reason ? extra.reason : 'Так держать');
          lastLevel = level;
        }
      }
    });
  }
});

/* Экспорт в глобальную область */
window.getNotifications = getNotifications;
window.getUnreadCount = getUnreadCount;
window.pushNotification = pushNotification;
window.markNotificationsRead = markNotificationsRead;
window.clearNotifications = clearNotifications;
window.toggleNotifyPanel = toggleNotifyPanel;
window.closeNotifyPanel = closeNotifyPanel;
window.renderNotifyBell = renderNotifyBell;
window.renderNotifyPanel = renderNotifyPanel;
