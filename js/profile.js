/* ============================================================
   profile.js — страница профиля
   Проверяет авторизацию, заполняет данные игрока,
   показывает статистику и управляет выходом.
   ============================================================ */

'use strict';

/* ---------- Защита страницы ---------- */

/**
 * Если токена нет — отправляем на страницу регистрации.
 * Возвращает true, если пользователь авторизован.
 */
function checkAuth() {
  const authorized = isAuthorized();

  if (!authorized) {
    // Запоминаем, куда пользователь хотел попасть
    sessionStorage.setItem('redirectAfterLogin', 'profile.html');
    window.location.href = 'register.html';
    return false;
  }

  return true;
}

/* ---------- Заполнение страницы ---------- */

/**
 * Заполняет ник, аватар, уровень и XP.
 * Статистика считается по прогрессу уроков (js/progress.js).
 */
function fillProfile() {
  const user = getCurrentUser();
  const username = user ? user.username : 'Игрок';
  const stats = getStats();
  const achievements = getUnlockedAchievements();

  // Ник встречается в нескольких местах страницы
  document.querySelectorAll('[data-username]').forEach(el => {
    el.textContent = username;
  });

  // Уровень
  const levelEl = document.getElementById('playerLevel');
  if (levelEl) levelEl.textContent = stats.level;

  // XP-бар
  const xpText = document.getElementById('xpText');
  const xpFill = document.getElementById('xpFill');
  const percent = Math.min(100, Math.round((stats.xp / stats.xpMax) * 100));

  if (xpText) xpText.textContent = stats.xp + ' / ' + stats.xpMax + ' XP';
  if (xpFill) {
    // Небольшая задержка, чтобы полоска красиво «наполнилась» после загрузки
    setTimeout(() => (xpFill.style.width = percent + '%'), 250);
  }

  // Карточки статистики
  animateNumber('statLessons', stats.lessons);
  animateNumber('statWords', stats.words);
  animateNumber('statDays', stats.days);

  // Дата регистрации хранится в аккаунте (createdAt)
  const joinedEl = document.getElementById('joinedDate');
  if (joinedEl) {
    const created = user && user.createdAt ? new Date(user.createdAt) : new Date();
    joinedEl.textContent = formatDate(created);
  }

  // Почта в карточке профиля
  const emailEl = document.getElementById('playerEmail');
  if (emailEl) emailEl.textContent = user ? user.email : '';

  // Серия дней подряд
  const streakEl = document.getElementById('streakDays');
  if (streakEl) {
    streakEl.textContent = stats.days > 0
      ? stats.days + ' ' + pluralDays(stats.days) + ' 🔥'
      : 'пока нет 🔥';
  }

  // Достижения и активность
  renderAchievements(achievements);
  renderActivity(stats);

  // Аватар
  updateAllAvatars();
}

/**
 * Рисует сетку достижений: открытые светятся, закрытые — приглушены.
 * @param {Array<string>} unlockedIds
 */
function renderAchievements(unlockedIds) {
  const grid = document.getElementById('achGrid');
  if (!grid) return;

  grid.innerHTML = '';

  ACHIEVEMENTS.forEach(achievement => {
    const unlocked = unlockedIds.includes(achievement.id);

    const item = document.createElement('div');
    item.className = 'ach' + (unlocked ? ' unlocked' : '');
    item.title = achievement.description;

    const icon = document.createElement('div');
    icon.className = 'ach-icon';
    icon.textContent = achievement.icon;

    const name = document.createElement('div');
    name.className = 'ach-name';
    name.textContent = achievement.name;

    item.appendChild(icon);
    item.appendChild(name);
    grid.appendChild(item);
  });

  // Счётчик в заголовке блока
  const note = document.getElementById('achNote');
  if (note) note.textContent = 'открыто ' + unlockedIds.length + ' из ' + ACHIEVEMENTS.length;
}

/**
 * Лента активности: пройденные уроки из прогресса + достижения.
 * Если прогресса нет — показываем подсказку.
 */
function renderActivity(stats) {
  const list = document.getElementById('activityList');
  if (!list) return;

  const progress = getProgress();
  const lessons = window.nihongo_lessons || [];
  const events = [];

  Object.keys(progress.lessons).forEach(id => {
    const record = progress.lessons[id];
    const lesson = lessons.find(item => String(item.id) === id);

    if (record && record.completed && lesson) {
      events.push({
        icon: 'あ',
        text: 'Пройден урок «' + lesson.title + '» — ' + record.best + '%',
        time: record.updatedAt ? timeAgo(new Date(record.updatedAt)) : 'недавно',
        sort: record.updatedAt ? new Date(record.updatedAt).getTime() : 0
      });
    }
  });

  if (stats.words > 0) {
    events.push({
      icon: '語',
      text: 'В копилке ' + stats.words + ' слов',
      time: 'всего',
      sort: 1
    });
  }

  list.innerHTML = '';

  if (!events.length) {
    list.innerHTML = '<div class="empty-state">Пока пусто. Пройди первый урок — и здесь появится история.</div>';
    return;
  }

  events
    .sort((a, b) => b.sort - a.sort)
    .slice(0, 5)
    .forEach(event => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `
        <div class="activity-dot"></div>
        <div class="activity-text"></div>
        <div class="activity-time"></div>
      `;
      item.querySelector('.activity-dot').textContent = event.icon;
      item.querySelector('.activity-text').textContent = event.text;
      item.querySelector('.activity-time').textContent = event.time;
      list.appendChild(item);
    });
}

/** Склонение слова «день»: 1 день, 2 дня, 5 дней. */
function pluralDays(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

/** «2 часа назад», «вчера» — для ленты активности. */
function timeAgo(date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return minutes + ' мин назад';

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' ч назад';

  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 30) return days + ' дн назад';

  return formatDate(date);
}

/** Красиво «докручивает» число от нуля до значения. */
function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    // easeOutCubic — замедление к концу
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/** Форматирует дату в виде «12 марта 2026». */
function formatDate(date) {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
}

/* ---------- Подтверждение выхода ---------- */

/** Открывает модалку «Точно выйти?». */
function showLogoutConfirm() {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.classList.add('open');
}

/** Закрывает модалку выхода. */
function closeLogoutModal() {
  const modal = document.getElementById('logoutModal');
  if (modal) modal.classList.remove('open');
}

/** Подтверждённый выход: чистим сессию и уходим на главную. */
function confirmLogout() {
  closeLogoutModal();
  logout();
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // Без токена дальше не идём
  if (!checkAuth()) return;

  updateHeaderAuth();
  fillProfile();

  // Закрытие модалки выхода по клику на фон
  const logoutModal = document.getElementById('logoutModal');
  if (logoutModal) {
    logoutModal.addEventListener('click', event => {
      if (event.target === logoutModal) closeLogoutModal();
    });
  }

  // Esc закрывает модалку выхода
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLogoutModal();
  });
});

/* Экспорт в глобальную область */
window.checkAuth = checkAuth;
window.showLogoutConfirm = showLogoutConfirm;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
