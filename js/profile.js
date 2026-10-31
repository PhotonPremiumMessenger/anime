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
  // Публичный просмотр чужого профиля (?user=ник) не требует входа
  if (typeof isPublicView === 'function' && isPublicView()) return true;

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
 * Опыт, уровень и стрик берутся из системы XP (js/xp.js).
 */
function fillProfile() {
  const user = getCurrentUser();
  const username = user ? user.username : 'Игрок';
  const stats = getPlayerStats();

  // Ник встречается в нескольких местах страницы
  document.querySelectorAll('[data-username]').forEach(el => {
    el.textContent = username;
  });

  // Почта в карточке профиля
  const emailEl = document.getElementById('playerEmail');
  if (emailEl) emailEl.textContent = user ? user.email : '';

  // Уровень, опыт и награды
  const levelEl = document.getElementById('playerLevel');
  if (levelEl) levelEl.textContent = stats.level;

  const xpMax = stats.levelInfo.maxLevel ? stats.xp : stats.levelInfo.nextAt;
  const percent = Math.min(100, stats.levelInfo.percent);

  const xpText = document.getElementById('xpText');
  const xpFill = document.getElementById('xpFill');

  if (xpText) xpText.textContent = stats.xp + ' / ' + xpMax + ' XP';
  if (xpFill) {
    // Небольшая задержка, чтобы полоска красиво «наполнилась» после загрузки
    setTimeout(() => (xpFill.style.width = percent + '%'), 250);
  }

  // Карточки статистики
  animateNumber('statLessons', stats.lessons);
  animateNumber('statWords', stats.words);
  animateNumber('statDays', stats.streak);

  // Дата регистрации хранится в аккаунте (createdAt)
  const joinedEl = document.getElementById('joinedDate');
  if (joinedEl) {
    const created = user && user.createdAt ? new Date(user.createdAt) : new Date();
    joinedEl.textContent = formatDate(created);
  }

  // Серия дней подряд
  const streakEl = document.getElementById('streakDays');
  if (streakEl) {
    streakEl.textContent = stats.streak > 0
      ? stats.streak + ' ' + pluralDays(stats.streak) + ' 🔥'
      : 'пока нет 🔥';
  }

  // Достижения и активность
  renderAchievements();
  renderActivity(stats);
  renderProfileLevel();
  renderAchievementsPreview();

  // Аватар и надетые предметы из магазина
  updateAllAvatars();
  if (typeof applyShopStyles === 'function') applyShopStyles();
}

/**
 * Блок «Уровень» в профиле: крупный уровень, титул, полоса опыта,
 * сколько осталось до следующего уровня и ближайшая награда.
 */
function renderProfileLevel() {
  const xp = getXP();
  const info = getLevelInfo(xp);

  const big = document.getElementById('profileLevelBig');
  if (big) big.textContent = info.level;

  const title = getPlayerTitle(info.level);

  // Две подписи звания: в шапке профиля и в блоке уровня
  ['profileTitle', 'profileTitleBig'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = title;
  });

  const text = document.getElementById('profileXPText');
  if (text) {
    text.textContent = info.maxLevel
      ? xp + ' XP · максимальный уровень'
      : info.intoLevel + ' / ' + (info.nextAt - info.currentFrom) + ' XP';
  }

  const fill = document.getElementById('profileXPFill');
  if (fill) {
    setTimeout(() => (fill.style.width = info.percent + '%'), 280);
  }

  const left = document.getElementById('profileXPLeft');
  if (left) {
    left.textContent = info.maxLevel
      ? 'Ты на вершине — 100 уровень достигнут!'
      : 'до ' + (info.level + 1) + ' уровня: ' + info.need + ' XP';
  }

  const total = document.getElementById('profileXPTotal');
  if (total) total.textContent = xp + ' XP';

  // Ближайшая награда
  const nextReward = document.getElementById('profileNextReward');
  if (nextReward) {
    const next = getNextLevelReward(info.level);
    nextReward.innerHTML = '';

    if (next) {
      const span = document.createElement('span');
      span.className = 'level-reward-note';
      span.textContent = 'Награда за ' + next.level + ' уровень: ' + next.reward.text;
      nextReward.appendChild(span);
    } else {
      const span = document.createElement('span');
      span.className = 'level-reward-note muted';
      span.textContent = 'Все награды уровней уже открыты';
      nextReward.appendChild(span);
    }
  }

  renderLevelRoad(info.level);
}

/** Титул игрока по уровню (ближайший открытый титул). */
function getPlayerTitle(level) {
  let title = 'Гость';

  Object.keys(LEVEL_REWARDS).forEach(key => {
    const reward = LEVEL_REWARDS[key];
    if (reward.kind === 'title' && Number(key) <= level) title = reward.title;
  });

  // До 2 уровня титула нет — используем нейтральный
  return level >= 2 ? title : 'Новичок';
}

/** Следующая награда за уровень (первая после текущего). */
function getNextLevelReward(level) {
  const levels = Object.keys(LEVEL_REWARDS).map(Number).filter(n => n > level).sort((a, b) => a - b);
  if (!levels.length) return null;
  return { level: levels[0], reward: LEVEL_REWARDS[levels[0]] };
}

/** Дорожная карта наград: крупные вехи до 100 уровня. */
function renderLevelRoad(currentLevel) {
  const box = document.getElementById('levelRoad');
  if (!box) return;

  const milestones = [2, 3, 5, 7, 10, 15, 20, 30, 40, 50, 60, 75, 100];
  box.innerHTML = '';

  milestones.forEach(level => {
    const reward = LEVEL_REWARDS[level];
    if (!reward) return;

    const item = document.createElement('div');
    item.className = 'level-node' +
      (currentLevel >= level ? ' is-open' : '') +
      (currentLevel === level ? ' is-current' : '');

    item.innerHTML = '<b>' + level + '</b><span></span>';
    item.querySelector('span').textContent = reward.text;
    item.title = reward.text + (currentLevel >= level ? ' — получено' : ' — на уровне ' + level);

    box.appendChild(item);
  });
}

/** Мини-сетка из шести последних достижений для карточки игрока. */
function renderAchievementsPreview() {
  const box = document.getElementById('achPreview');
  if (!box) return;

  const unlocked = getUnlockedAchievements();
  box.innerHTML = '';

  // Сначала показываем открытые, затем закрытые
  const unlockedList = ACHIEVEMENTS.filter(a => unlocked.includes(a.id));
  const lockedList = ACHIEVEMENTS.filter(a => !unlocked.includes(a.id));
  const preview = unlockedList.concat(lockedList).slice(0, 6);

  if (!preview.length) return;

  preview.forEach(achievement => {
    const isOpen = unlocked.includes(achievement.id);
    const cell = document.createElement('div');
    cell.className = 'ach-preview-cell' + (isOpen ? ' is-unlocked' : '');
    cell.title = achievement.name + ' — ' + achievement.description;
    cell.innerHTML = achievementIconMarkup(achievement, isOpen);
    box.appendChild(cell);
  });
}

/**
 * Рисует сетку достижений из js/achievements.js:
 * открытые — цветные, закрытые — серые.
 */
function renderAchievements() {
  if (typeof renderAchievementGrid === 'function') {
    renderAchievementGrid('achGrid');
    return;
  }

  // Запасной простой вариант, если модуль достижений не подключён
  const grid = document.getElementById('achGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state">Достижения не загрузились. Обнови страницу.</div>';
}

/**
 * Лента активности: пройденные уроки из прогресса + достижения.
 * Если прогресса нет — показываем подсказку.
 */
function renderActivity(stats) {
  const list = document.getElementById('activityList');
  if (!list) return;

  const progress = getProgress();
  const lessons = window.anilingo_lessons || [];
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
  const button = document.querySelector('#logoutModal .btn-primary');

  // Видно, что нажатие сработало: страница уходит не мгновенно
  if (button) {
    button.disabled = true;
    button.textContent = 'Выходим…';
  }

  closeLogoutModal();

  try {
    logout();
  } catch (error) {
    // Даже если что-то пошло не так — уходим и показываем сообщение
    if (typeof showToast === 'function') {
      showToast('Не удалось выйти', 'Обновите страницу и попробуйте снова', 'error');
    }
  }
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // Без токена дальше не идём
  if (!checkAuth()) return;

  updateHeaderAuth();

  // Публичный профиль рисует js/public.js — личные блоки не трогаем
  if (typeof isPublicView === 'function' && isPublicView()) return;

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
window.copyProfileLink = typeof copyProfileLink === 'function' ? copyProfileLink : null;
window.renderProfileLevel = renderProfileLevel;
window.renderLevelRoad = renderLevelRoad;
window.getPlayerTitle = getPlayerTitle;
window.showLogoutConfirm = showLogoutConfirm;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
