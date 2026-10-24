/* ============================================================
   xp.js — ядро прогресса: XP, уровни, стрики и шина событий
   Через него проходят все награды, чтобы задания, достижения,
   челленджи и магазин не дублировали логику.
   ============================================================ */

'use strict';

/* ---------- Ключи localStorage ---------- */

const XP_KEYS = {
  streak: 'nihongo_streak',        // серия дней подряд
  counters: 'nihongo_counters',    // счётчики действий (для достижений)
  daily: 'nihongo_daily',          // ежедневные задания
  weekly: 'nihongo_weekly',        // челлендж недели
  quiz: 'nihongo_quiz',            // викторина дня
  speed: 'nihongo_speed',          // тест на скорость
  shop: 'nihongo_shop',            // покупки магазина
  achievements: 'nihongo_achievements',
  guestXP: 'nihongo_guest_xp'
};

// Максимальный уровень аккаунта
const MAX_LEVEL = 100;

/* ---------- Даты ---------- */

/** Сегодняшняя дата в формате YYYY-MM-DD. */
function xpTodayKey() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

/** Дата со сдвигом на N дней назад в том же формате. */
function xpDateKey(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

/** Ключ недели вида 2026-W43 — по ISO-неделе. */
function xpWeekKey() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - start) / 86400000);
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return now.getFullYear() + '-W' + String(week).padStart(2, '0');
}

/** Порядковый номер дня с 1970 года — удобно для «выбора по дате». */
function xpDayNumber() {
  return Math.floor(Date.now() / 86400000);
}

/* ---------- Уровни ---------- */

/**
 * Сколько всего XP нужно, чтобы получить уровень.
 * Формула подогнана под ТЗ: 1 → 0, 2 → 100, 3 → 250, 4 → 450, 5 → 700…
 */
function levelThreshold(level) {
  if (level <= 1) return 0;
  const n = level - 1;
  return 100 * n + (50 * n * (n - 1)) / 2;
}

// Награды за уровни: тема, рамка, значок или титул
const LEVEL_REWARDS = {
  2: { kind: 'title', title: 'Новичок', text: 'Титул «Новичок»' },
  3: { kind: 'frame', itemId: 'frame-bamboo', text: 'Рамка «Бамбук»' },
  4: { kind: 'badge', itemId: 'badge-first-steps', text: 'Значок «Первые шаги»' },
  5: { kind: 'theme', itemId: 'theme-sakura-plus', text: 'Тема «Сакура+»' },
  7: { kind: 'frame', itemId: 'frame-lantern', text: 'Рамка «Фонарь»' },
  10: { kind: 'badge', itemId: 'badge-samurai', text: 'Значок «Самурай»' },
  12: { kind: 'theme', itemId: 'theme-midnight', text: 'Тема «Полночь»' },
  15: { kind: 'frame', itemId: 'frame-torii', text: 'Рамка «Тории»' },
  20: { kind: 'badge', itemId: 'badge-sensei', text: 'Значок «Сэнсэй»' },
  25: { kind: 'theme', itemId: 'theme-neon', text: 'Тема «Неон»' },
  30: { kind: 'frame', itemId: 'frame-sakura', text: 'Рамка «Сакура»' },
  40: { kind: 'badge', itemId: 'badge-master', text: 'Значок «Мастер»' },
  50: { kind: 'theme', itemId: 'theme-gold', text: 'Тема «Золото»' },
  60: { kind: 'frame', itemId: 'frame-dragon', text: 'Рамка «Дракон»' },
  75: { kind: 'badge', itemId: 'badge-legend', text: 'Значок «Легенда»' },
  100: { kind: 'title', title: 'Легенда Nihongo', text: 'Титул «Легенда Nihongo»' }
};

/** Подробности уровня по количеству XP. */
function getLevelInfo(xpValue) {
  const xp = Math.max(0, Number(xpValue) || 0);

  let level = 1;
  while (level < MAX_LEVEL && xp >= levelThreshold(level + 1)) level += 1;

  const currentFrom = levelThreshold(level);
  const nextAt = level >= MAX_LEVEL ? currentFrom : levelThreshold(level + 1);
  const span = Math.max(1, nextAt - currentFrom);

  return {
    level: level,
    xp: xp,
    currentFrom: currentFrom,
    nextAt: nextAt,
    intoLevel: xp - currentFrom,
    need: level >= MAX_LEVEL ? 0 : Math.max(0, nextAt - xp),
    percent: level >= MAX_LEVEL ? 100 : Math.min(100, Math.round(((xp - currentFrom) / span) * 100)),
    maxLevel: level >= MAX_LEVEL,
    reward: LEVEL_REWARDS[level] || null
  };
}

/** Награда за конкретный уровень (или null). */
function getLevelReward(level) {
  return LEVEL_REWARDS[level] || null;
}

/* ---------- XP игрока ---------- */

/** Текущий баланс XP: у авторизованного — из аккаунта, у гостя — отдельно. */
function getXP() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (user) return Math.max(0, Number(user.xp) || 0);
  return Math.max(0, Number(readJSON(XP_KEYS.guestXP, 0)) || 0);
}

/** Записывает баланс XP. */
function setXP(value) {
  const safe = Math.max(0, Math.round(Number(value) || 0));
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  if (user && typeof updateUserRecord === 'function') {
    updateUserRecord(user.username, { xp: safe });
  } else {
    writeJSON(XP_KEYS.guestXP, safe);
  }

  return safe;
}

/**
 * Начисляет XP и проверяет повышение уровня.
 * @param {number} amount
 * @param {string} reason — короткая подпись для всплывашки
 */
function addXP(amount, reason = '') {
  const delta = Math.round(Number(amount) || 0);
  if (!delta) return { xp: getXP(), level: getLevelInfo(getXP()).level, leveledUp: false };

  const before = getLevelInfo(getXP());
  const total = setXP(getXP() + delta);
  const after = getLevelInfo(total);

  xpPop(delta);
  bumpCounter('xpEarned', delta);
  recordXPDay(delta);

  // Повышение уровня: награда + уведомление
  if (after.level > before.level) {
    for (let level = before.level + 1; level <= after.level; level++) {
      const reward = getLevelReward(level);
      setTimeout(() => {
        showToast(
          'Уровень ' + level + '!',
          reward ? reward.text : 'Новый уровень аккаунта',
          'success',
          {
            icon: 'crown',
            duration: 5600,
            rewards: [
              { icon: 'bolt', text: 'Новый уровень' },
              reward && reward.itemId ? { icon: 'gift', text: 'Награда' } : null
            ].filter(Boolean)
          }
        );
        if (reward && reward.itemId && typeof unlockShopItem === 'function') {
          unlockShopItem(reward.itemId, 'level');
        }
        if (typeof logActivity === 'function') {
          logActivity('level', 'Уровень ' + level + (reward ? ': ' + reward.text : ''));
        }
      }, 320);
    }
  }

  if (typeof refreshNihongoUI === 'function') refreshNihongoUI();
  return { xp: total, level: after.level, leveledUp: after.level > before.level };
}

/** Тратит XP (магазин). Возвращает false, если не хватает. */
function spendXP(amount) {
  const price = Math.max(0, Math.round(Number(amount) || 0));
  if (getXP() < price) return false;
  setXP(getXP() - price);
  bumpCounter('xpSpent', price);
  if (typeof refreshNihongoUI === 'function') refreshNihongoUI();
  return true;
}

/* ---------- Опыт по дням ---------- */

const XP_DAYS_KEY = 'nihongo_xp_days';

/** Опыт по дням: { '2026-10-24': 120, ... }. */
function getXPDays() {
  const saved = readJSON(XP_DAYS_KEY, {});
  return saved && typeof saved === 'object' ? saved : {};
}

/** Записывает опыт в копилку дня. */
function recordXPDay(amount) {
  const delta = Math.round(Number(amount) || 0);
  if (!delta) return;

  const days = getXPDays();
  const key = xpTodayKey();
  days[key] = Math.max(0, (Number(days[key]) || 0) + delta);

  // Храним только последние 120 дней
  const keys = Object.keys(days).sort();
  while (keys.length > 120) delete days[keys.shift()];

  writeJSON(XP_DAYS_KEY, days);
}

/** Опыт за конкретный день (0 — если не было). */
function getXPDay(dateKey) {
  return Number(getXPDays()[dateKey]) || 0;
}

/** Серия дней с ненулевым опытом подряд (с сегодня назад). */
function getXPDayStreak() {
  const days = getXPDays();
  let streak = 0;

  for (let i = 0; i < 120; i++) {
    const key = xpDateKey(i);
    if ((Number(days[key]) || 0) > 0) streak += 1;
    else if (i > 0) break;
  }

  return streak;
}

/* ---------- Всплывашка «+N XP» ---------- */

/** Показывает короткую плашку с начислением в правом верхнем углу. */
function xpPop(amount) {
  if (document.body.classList.contains('no-anim') && false) return;

  let layer = document.querySelector('.xp-pop-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'xp-pop-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }

  const pop = document.createElement('div');
  pop.className = 'xp-pop' + (amount < 0 ? ' is-minus' : '');
  pop.textContent = (amount > 0 ? '+' : '') + amount + ' XP';
  layer.appendChild(pop);

  // Держим не больше трёх плашек одновременно
  while (layer.children.length > 3) layer.firstElementChild.remove();

  setTimeout(() => pop.remove(), 1600);
}

/* ---------- Счётчики действий ---------- */

/** Все счётчики действий. */
function getCounters() {
  const saved = readJSON(XP_KEYS.counters, {});
  return saved && typeof saved === 'object' ? saved : {};
}

/** Увеличивает счётчик. */
function bumpCounter(key, delta = 1) {
  const counters = getCounters();
  counters[key] = (Number(counters[key]) || 0) + delta;
  writeJSON(XP_KEYS.counters, counters);
  return counters[key];
}

/* ---------- Стрик ---------- */

/**
 * Читает стрик. Если нового ключа ещё нет — переносит данные
 * из старого прогресса, чтобы серия не потерялась.
 */
function getStreak() {
  const saved = readJSON(XP_KEYS.streak, null);

  if (saved && typeof saved === 'object') {
    return {
      count: Math.max(0, Number(saved.count) || 0),
      best: Math.max(0, Number(saved.best) || Number(saved.count) || 0),
      last: saved.last || ''
    };
  }

  // Миграция из nihongo_progress.streak
  const progress = typeof getProgress === 'function' ? getProgress() : null;
  const legacy = progress && progress.streak ? progress.streak : null;

  if (legacy && legacy.count) {
    const migrated = {
      count: Number(legacy.count) || 0,
      best: Number(legacy.count) || 0,
      last: legacy.last || ''
    };
    writeJSON(XP_KEYS.streak, migrated);
    return migrated;
  }

  return { count: 0, best: 0, last: '' };
}

/** Сохраняет стрик и дублирует его в прогресс — старые экраны не сломаются. */
function saveStreak(streak) {
  writeJSON(XP_KEYS.streak, streak);

  if (typeof getProgress === 'function' && typeof saveProgress === 'function') {
    const progress = getProgress();
    progress.streak = { count: streak.count, last: streak.last };
    saveProgress(progress);
  }
}

/**
 * Отмечает визит: растит серию или сбрасывает её при пропуске.
 * Возвращает объект { count, isNew, broken }.
 */
function touchStreakOnVisit() {
  const streak = getStreak();
  const today = xpTodayKey();
  const yesterday = xpDateKey(1);

  if (streak.last === today) {
    return { count: streak.count, isNew: false, broken: false };
  }

  const wasBroken = Boolean(streak.last) && streak.last !== yesterday;

  if (!streak.last) {
    streak.count = 1;
  } else if (streak.last === yesterday) {
    streak.count += 1;
  } else {
    streak.count = 1;
  }

  streak.last = today;
  streak.best = Math.max(streak.best, streak.count);
  saveStreak(streak);

  return { count: streak.count, isNew: true, broken: wasBroken, best: streak.best };
}

/* ---------- Сводная статистика игрока ---------- */

/**
 * Собирает всё, что нужно для достижений, уровней и рейтинга.
 */
function getPlayerStats() {
  const progress = typeof getProgress === 'function' ? getProgress() : { lessons: {}, words: [] };
  const counters = getCounters();
  const streak = getStreak();
  const xp = getXP();
  const levelInfo = getLevelInfo(xp);

  const lessons = Object.keys(progress.lessons || {}).filter(
    id => progress.lessons[id] && progress.lessons[id].completed
  ).length;

  const words = Array.isArray(progress.words) ? progress.words.length : 0;
  const achievements = typeof getUnlockedAchievements === 'function'
    ? getUnlockedAchievements().length
    : 0;

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  return {
    username: user ? user.username : 'Гость',
    authorized: Boolean(user),
    xp: xp,
    level: levelInfo.level,
    levelInfo: levelInfo,
    lessons: lessons,
    totalLessons: (window.nihongo_lessons || []).length || 5,
    words: words,
    streak: streak.count,
    bestStreak: streak.best,
    achievements: achievements,
    quizzes: Number(counters.quiz) || 0,
    quizCorrect: Number(counters.quiz_correct) || 0,
    speedRuns: Number(counters.speed) || 0,
    speedCorrect: Number(counters.speed_correct) || 0,
    speedBest: Number((readJSON(XP_KEYS.speed, {}) || {}).best) || 0,
    purchases: Number(counters.shop) || 0,
    avatarChanges: Number(counters.avatar) || 0,
    themeChanges: Number(counters.theme) || 0,
    sakuraOpens: Number(counters.sakura) || 0,
    easterEggs: Number(counters.easter) || 0,
    shares: Number(counters.share) || 0,
    friends: Number(counters.friend) || 0,
    bioSaves: Number(counters.bio) || 0,
    dailyDone: Number(counters.daily) || 0,
    weeklyDone: Number(counters.weekly) || 0,
    visits: Number(counters.visit) || 0,
    grammarRead: Number(counters.grammar) || 0,
    hasBio: Boolean(user && user.bio),
    joinedDays: user && user.createdAt
      ? Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000) + 1)
      : 1
  };
}

/* ---------- Шина действий ---------- */

// Сюда модули (задания, челленджи) добавляют свои обработчики
const nihongoActionHooks = [];

/** Регистрирует обработчик действий. */
function registerActionHook(fn) {
  if (typeof fn === 'function') nihongoActionHooks.push(fn);
}

// Сколько XP даёт каждое действие
const ACTION_XP = {
  lesson: 80,
  word: 5,
  quiz: 25,
  quiz_correct: 10,
  speed_correct: 4,
  visit: 5,
  grammar: 15,
  easter: 20,
  share: 15,
  friend: 10,
  bio: 10
};

/**
 * Единая точка входа для всех действий на сайте.
 * Начисляет XP, обновляет счётчики, задания, челлендж и достижения.
 *
 * @param {string} type — lesson | word | quiz | quiz_correct | speed_correct | …
 * @param {number} amount
 * @param {object} extra
 */
function notifyAction(type, amount = 1, extra = {}) {
  const value = Number(amount) || 0;
  if (value <= 0) return;

  bumpCounter(type, value);

  // Автоматическое начисление XP по таблице
  const xp = (ACTION_XP[type] || 0) * value;
  if (xp > 0) addXP(xp, extra.reason || '');

  // Сообщаем модулям (задания, челлендж, достижения)
  nihongoActionHooks.forEach(hook => {
    try {
      hook(type, value, extra);
    } catch (error) {
      console.warn('Ошибка обработчика действия:', error);
    }
  });

  if (typeof refreshNihongoUI === 'function') refreshNihongoUI();
}

/* ---------- Обновление интерфейса ---------- */

/**
 * Перерисовывает все динамические блоки, которые есть на странице.
 * Каждая страница подменяет window.refreshNihongoUI своей версией.
 */
/**
 * Плашка уровня и опыта в hero на главной странице.
 * Если элемента нет — ничего не делает.
 */
function renderHeroLevel() {
  const levelEl = document.getElementById('heroLevel');
  const barEl = document.getElementById('heroXPBar');
  const textEl = document.getElementById('heroXPText');
  const box = document.querySelector('.hero-level');

  if (!levelEl && !barEl && !textEl) return;

  const authorized = typeof isAuthorized === 'function' && isAuthorized();
  if (box) box.classList.toggle('hidden', !authorized);

  const xp = getXP();
  const info = getLevelInfo(xp);

  if (levelEl) levelEl.textContent = info.level;
  if (barEl) barEl.style.width = info.percent + '%';
  if (textEl) textEl.textContent = xp + ' XP';
}

/**
 * Догоняем награды за уже пройденные уровни.
 * Нужно для старых аккаунтов и после импорта прогресса: если опыт
 * был начислен раньше, предметы уровней всё равно должны появиться.
 */
function syncLevelRewards() {
  if (typeof unlockShopItem !== 'function') return;

  const level = getLevelInfo(getXP()).level;

  for (let current = 2; current <= level; current++) {
    const reward = getLevelReward(current);
    if (reward && reward.itemId) unlockShopItem(reward.itemId, 'level', true);
  }
}

/** Первичная отрисовка плашки уровня после загрузки страницы. */
document.addEventListener('DOMContentLoaded', () => {
  if (typeof renderHeroLevel === 'function') renderHeroLevel();

  // Небольшая задержка: магазин и аватар подключаются позже
  setTimeout(() => {
    if (typeof isAuthorized === 'function' && isAuthorized()) syncLevelRewards();
  }, 0);
});

function refreshNihongoUI() {
  if (typeof window.renderHeroLevel === 'function') window.renderHeroLevel();
  if (typeof window.renderStreakBlocks === 'function') window.renderStreakBlocks();
  if (typeof window.renderDailyBlock === 'function') window.renderDailyBlock();
  if (typeof window.renderWeeklyBlock === 'function') window.renderWeeklyBlock();
  if (typeof window.renderQuizBlock === 'function') window.renderQuizBlock();
  if (typeof window.renderProfileLevel === 'function') window.renderProfileLevel();
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // Визит засчитываем один раз в день и только авторизованным
  const stats = getPlayerStats();
  if (!stats.authorized) return;

  const visit = touchStreakOnVisit();

  // XP за вход + событие визита для ежедневных заданий
  if (visit.isNew) {
    notifyAction('visit', 1, { reason: 'Ежедневный вход' });

    if (visit.broken && visit.count === 1) {
      showToast('Стрик сброшен', 'Ты пропустил день. Новая серия началась сегодня', 'warning');
    } else if (visit.count > 1) {
      showToast('Стрик: ' + visit.count + ' дней', 'Заходи каждый день, чтобы не потерять серию', 'success');
    }
  }
});

/* Экспорт в глобальную область */
window.XP_KEYS = XP_KEYS;
window.MAX_LEVEL = MAX_LEVEL;
window.xpTodayKey = xpTodayKey;
window.xpDateKey = xpDateKey;
window.xpWeekKey = xpWeekKey;
window.xpDayNumber = xpDayNumber;
window.levelThreshold = levelThreshold;
window.getLevelInfo = getLevelInfo;
window.getLevelReward = getLevelReward;
window.getXP = getXP;
window.setXP = setXP;
window.addXP = addXP;
window.spendXP = spendXP;
window.xpPop = xpPop;
window.getCounters = getCounters;
window.bumpCounter = bumpCounter;
window.getStreak = getStreak;
window.saveStreak = saveStreak;
window.touchStreakOnVisit = touchStreakOnVisit;
window.getPlayerStats = getPlayerStats;
window.renderHeroLevel = renderHeroLevel;
window.getXPDays = getXPDays;
window.getXPDay = getXPDay;
window.getXPDayStreak = getXPDayStreak;
window.recordXPDay = recordXPDay;
window.syncLevelRewards = syncLevelRewards;
window.registerActionHook = registerActionHook;
window.notifyAction = notifyAction;
window.refreshNihongoUI = refreshNihongoUI;
