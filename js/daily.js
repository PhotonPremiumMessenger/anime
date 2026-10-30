/* ============================================================
   daily.js — ежедневные задания, стрик и челлендж недели
   Состояние хранится в nihongo_daily и nihongo_weekly,
   серия дней — в nihongo_streak (см. xp.js).
   ============================================================ */

'use strict';

/* ---------- Пул ежедневных заданий ---------- */

// type совпадает с типом действия в notifyAction()
const DAILY_POOL = [
  { id: 'visit',     title: 'Зайди на сайт',              desc: 'Открыть AniLingo сегодня',       type: 'visit',        target: 1,  xp: 10, icon: 'sun' },
  { id: 'lesson_1',  title: 'Пройди урок',                desc: 'Завершить один урок',           type: 'lesson',       target: 1,  xp: 30, icon: 'book' },
  { id: 'words_5',   title: 'Выучи 5 слов',               desc: 'Добавить 5 новых слов',         type: 'word',         target: 5,  xp: 25, icon: 'leaf' },
  { id: 'words_10',  title: 'Выучи 10 слов',              desc: 'Добавить 10 новых слов',        type: 'word',         target: 10, xp: 40, icon: 'gem' },
  { id: 'quiz_1',    title: 'Пройди викторину дня',       desc: 'Ответить на 5 вопросов',        type: 'quiz',         target: 1,  xp: 20, icon: 'compass' },
  { id: 'quiz_3',    title: 'Три верных ответа',          desc: 'Правильно ответить 3 раза',     type: 'quiz_correct', target: 3,  xp: 25, icon: 'target' },
  { id: 'speed_1',   title: 'Тест на скорость',           desc: 'Пройти забег на 60 секунд',     type: 'speed',        target: 1,  xp: 20, icon: 'bolt' },
  { id: 'speed_10',  title: 'Десять верных на скорость',  desc: 'Дать 10 верных ответов',        type: 'speed_correct', target: 10, xp: 25, icon: 'clock' },
  { id: 'shop_1',    title: 'Загляни в магазин',          desc: 'Купить любой предмет',          type: 'shop',         target: 1,  xp: 15, icon: 'gift' },
  { id: 'easter_1',  title: 'Найди пасхалку',             desc: 'Обнаружить скрытую фишку',      type: 'easter',       target: 1,  xp: 20, icon: 'eye' },
  { id: 'grammar_1', title: 'Правило грамматики',         desc: 'Прочитать любое правило',       type: 'grammar',      target: 1,  xp: 15, icon: 'scroll' },
  { id: 'avatar_1',  title: 'Смени образ',                desc: 'Поставить новый аватар',        type: 'avatar',       target: 1,  xp: 15, icon: 'camera' }
];

/* ---------- Состояние дня ---------- */

/** Простой детерминированный генератор — задания не меняются до полуночи. */
function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

/** Перемешивание Фишера–Йетса на seededRandom. */
function shuffleWithSeed(list, seed) {
  const random = seededRandom(seed);
  const array = list.slice();

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

/** Создаёт набор из трёх заданий на сегодня. */
function createDailyState() {
  const today = xpTodayKey();
  const random = seededRandom(xpDayNumber() * 7919);

  // Обязательные задания дня: вход, урок и слова — остальное добираем
  const required = DAILY_POOL.filter(q => ['visit', 'lesson_1', 'words_5'].includes(q.id));
  const extra = DAILY_POOL.filter(q => !required.includes(q));
  const shuffledExtra = shuffleWithSeed(extra, xpDayNumber() * 31 + 7);

  // Два обязательных + одно случайное: вход и урок всегда, слова — тоже
  const picked = required.slice(0, 2).concat(shuffledExtra.slice(0, 1));

  return {
    date: today,
    quests: picked.map(quest => ({
      id: quest.id,
      title: quest.title,
      desc: quest.desc,
      type: quest.type,
      target: quest.target,
      xp: quest.xp,
      icon: quest.icon,
      progress: 0,
      done: false
    })),
    xpEarned: 0,
    allDone: false,
    randomPick: Math.floor(random() * 1000)
  };
}

/** Текущее состояние ежедневных заданий (с автоматическим сбросом по дате). */
function getDailyState() {
  const today = xpTodayKey();
  const saved = readJSON(XP_KEYS.daily, null);

  if (saved && saved.date === today && Array.isArray(saved.quests) && saved.quests.length === 3) {
    return saved;
  }

  const fresh = createDailyState();
  writeJSON(XP_KEYS.daily, fresh);

  // После сброса заданий засчитываем визит, если он был сегодня
  if (getStreak().last === today) {
    progressDaily('visit', 1);
  }

  return readJSON(XP_KEYS.daily, fresh);
}

/** Сохраняет состояние дня. */
function saveDailyState(state) {
  writeJSON(XP_KEYS.daily, state);
}

/* ---------- Прогресс заданий ---------- */

/**
 * Продвигает задания дня. Вызывается из notifyAction и напрямую.
 * @param {string} type — тип действия
 * @param {number} amount
 */
function progressDaily(type, amount = 1) {
  const state = getDailyState();
  const today = xpTodayKey();
  if (state.date !== today) return;

  let changed = false;

  state.quests.forEach(quest => {
    if (quest.done || quest.type !== type) return;

    quest.progress = Math.min(quest.target, quest.progress + amount);
    changed = true;

    if (quest.progress >= quest.target) {
      quest.done = true;
      state.xpEarned += quest.xp;

      // XP за задание начисляем после сохранения, чтобы не было рекурсии
      setTimeout(() => {
        addXP(quest.xp, 'Задание: ' + quest.title);
        bumpCounter('daily', 1);
        if (typeof showToast === 'function') {
          showToast('Задание выполнено', quest.title + ' · +' + quest.xp + ' XP', 'success');
        }
        checkDailyCompletion();
      }, 120);
    }
  });

  if (changed) {
    saveDailyState(state);
    renderDailyBlock();
  }
}

/** Проверяет, выполнены ли все три задания, и ставит флаг дня. */
function checkDailyCompletion() {
  const state = getDailyState();
  const allDone = state.quests.every(quest => quest.done);

  if (allDone && !state.allDone) {
    state.allDone = true;
    saveDailyState(state);

    if (typeof setAchievementFlag === 'function') setAchievementFlag('dailyAllDone');

    // Бонус за все задания дня
    setTimeout(() => {
      addXP(50, 'Все задания дня');
      if (typeof showToast === 'function') {
        showToast('Все задания дня закрыты', 'Бонус +50 XP. Возвращайся завтра', 'success');
      }
      if (typeof checkAchievements === 'function') checkAchievements();
      renderDailyBlock();
    }, 400);
  }
}

/* ---------- Отрисовка блока на главной ---------- */

/** Рисует блок «Задания на сегодня». */
function renderDailyBlock() {
  const box = document.getElementById('dailyBlock');
  if (!box) return;

  const authorized = typeof isAuthorized === 'function' && isAuthorized();

  if (!authorized) {
    box.innerHTML = `
      <div class="block-head">
        <h3>Задания на сегодня</h3>
        <span class="block-note">нужен аккаунт</span>
      </div>
      <div class="empty-state">
        Войди в аккаунт, чтобы получать ежедневные задания и XP.
        <a class="btn btn-primary btn-small" href="register.html" style="margin-left:12px">Войти</a>
      </div>
    `;
    return;
  }

  const state = getDailyState();
  const doneCount = state.quests.filter(q => q.done).length;

  box.innerHTML = `
    <div class="block-head">
      <h3>Задания на сегодня</h3>
      <span class="block-note">${doneCount} из ${state.quests.length} · +${state.xpEarned} XP</span>
    </div>
    <div class="daily-list"></div>
    <div class="daily-footer">
      <span>Новые задания появятся после полуночи</span>
      <b>${doneCount === 3 ? 'Все выполнено ✓' : 'Осталось: ' + (3 - doneCount)}</b>
    </div>
  `;

  const list = box.querySelector('.daily-list');

  state.quests.forEach(quest => {
    const item = document.createElement('div');
    item.className = 'daily-item' + (quest.done ? ' is-done' : '');

    item.innerHTML = `
      <span class="daily-check">${quest.done ? '✓' : ''}</span>
      <span class="daily-icon">${achievementIconMarkup({ icon: quest.icon }, quest.done)}</span>
      <span class="daily-body">
        <b class="daily-title"></b>
        <span class="daily-desc"></span>
      </span>
      <span class="daily-progress">
        <b>${quest.progress}/${quest.target}</b>
        <span>+${quest.xp} XP</span>
      </span>
    `;

    item.querySelector('.daily-title').textContent = quest.title;
    item.querySelector('.daily-desc').textContent = quest.desc;

    list.appendChild(item);
  });
}

/* ---------- Стрик: блоки на страницах ---------- */

/** Рисует блок стрика на главной (#streakBlock). */
function renderStreakBlocks() {
  const box = document.getElementById('streakBlock');
  if (!box) return;

  const authorized = typeof isAuthorized === 'function' && isAuthorized();
  const streak = getStreak();

  if (!authorized) {
    box.innerHTML = `
      <div class="streak-icon">🔥</div>
      <div class="streak-info">
        <b>Серия дней</b>
        <span>Войди, чтобы считать дни подряд</span>
      </div>
      <a class="btn btn-outline btn-small" href="register.html">Начать</a>
    `;
    return;
  }

  // Дни недели: отмечаем, были ли заходы
  const today = xpTodayKey();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    days.push(xpDateKey(i));
  }

  const visitedDays = readJSON('nihongo_visits', []);
  const visited = days.map(day => (day === today ? true : visitedDays.includes(day)));

  box.innerHTML = `
    <div class="streak-icon">🔥</div>
    <div class="streak-info">
      <b class="streak-count">${streak.count} ${pluralRu(streak.count, 'день', 'дня', 'дней')} подряд</b>
      <span>Лучшая серия: ${streak.best} · заходи каждый день</span>
      <div class="streak-days">
        ${visited.map((on, index) => '<i class="' + (on ? 'on' : '') + '">' + ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(new Date(days[index]).getDay() + 6) % 7] + '</i>').join('')}
      </div>
    </div>
  `;
}

/** Склонение по числу: 1 день, 2 дня, 5 дней. */
function pluralRu(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/* ---------- Челлендж недели (пункт 6) ---------- */

const WEEKLY_POOL = [
  { id: 'week_words_50',  title: 'Выучи 50 слов за неделю',      desc: 'Любые новые слова из уроков', type: 'word',        target: 50, xp: 200 },
  { id: 'week_lessons_3', title: 'Пройди 3 урока',               desc: 'Заверши три любых урока',     type: 'lesson',      target: 3,  xp: 180 },
  { id: 'week_quiz_3',    title: 'Три викторины дня',            desc: 'Ответь на вопросы в разные дни', type: 'quiz',     target: 3,  xp: 160 },
  { id: 'week_speed_3',   title: 'Три забега на скорость',       desc: 'Пройди тест на скорость',     type: 'speed',       target: 3,  xp: 160 },
  { id: 'week_words_100', title: 'Сотня слов за неделю',         desc: 'Для упорных: 100 новых слов', type: 'word',        target: 100, xp: 350 },
  { id: 'week_lesson_5',  title: 'Пять уроков за неделю',        desc: 'Марафон по урокам',           type: 'lesson',      target: 5,  xp: 260 },
  { id: 'week_quiz_correct_20', title: '20 верных в викторинах', desc: 'Точность важнее скорости',    type: 'quiz_correct', target: 20, xp: 220 },
  { id: 'week_daily_5',   title: 'Пять выполненных заданий',     desc: 'Ежедневные квесты недели',    type: 'daily',       target: 5,  xp: 240 }
];

/** Текущий челлендж недели. */
function getWeeklyState() {
  const week = xpWeekKey();
  const saved = readJSON(XP_KEYS.weekly, null);

  if (saved && saved.week === week && saved.challenge) {
    return saved;
  }

  // Выбор челленджа по номеру недели — стабилен до конца недели
  const index = Math.abs(week.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % WEEKLY_POOL.length;
  const challenge = WEEKLY_POOL[index];

  const fresh = {
    week: week,
    challenge: challenge,
    progress: 0,
    done: false,
    completedAt: ''
  };

  writeJSON(XP_KEYS.weekly, fresh);
  return fresh;
}

/** Прогресс челленджа недели. */
function progressWeekly(type, amount = 1) {
  const state = getWeeklyState();
  if (state.done) return;

  if (state.challenge.type !== type) return;

  state.progress = Math.min(state.challenge.target, state.progress + amount);
  writeJSON(XP_KEYS.weekly, state);

  if (state.progress >= state.challenge.target && !state.done) {
    state.done = true;
    state.completedAt = new Date().toISOString();
    writeJSON(XP_KEYS.weekly, state);

    setTimeout(() => {
      addXP(state.challenge.xp, 'Челлендж недели');
      bumpCounter('weekly', 1);

      // Эксклюзивный значок недели
      if (typeof unlockShopItem === 'function') unlockShopItem('badge-weekly', 'weekly');

      if (typeof showToast === 'function') {
        showToast('Челлендж недели закрыт!', state.challenge.title + ' · +' + state.challenge.xp + ' XP и значок', 'success');
      }
      if (typeof checkAchievements === 'function') checkAchievements();
      renderWeeklyBlock();
    }, 200);
  }

  renderWeeklyBlock();
}

/** Блок «Челлендж недели» на главной. */
function renderWeeklyBlock() {
  const box = document.getElementById('weeklyBlock');
  if (!box) return;

  const authorized = typeof isAuthorized === 'function' && isAuthorized();

  if (!authorized) {
    box.innerHTML = `
      <div class="block-head">
        <h3>Челлендж недели</h3>
        <span class="block-note">эксклюзивный значок</span>
      </div>
      <div class="empty-state">
        Войди в аккаунт, чтобы участвовать в недельном челлендже.
      </div>
    `;
    return;
  }

  const state = getWeeklyState();
  const percent = Math.round((state.progress / state.challenge.target) * 100);

  box.innerHTML = `
    <div class="weekly-top">
      <span class="badge"><span class="badge-dot"></span>Неделя ${state.week.split('-W')[1]}</span>
      <span class="weekly-reward">+${state.challenge.xp} XP · значок</span>
    </div>
    <h3 class="weekly-title"></h3>
    <p class="weekly-desc"></p>
    <div class="progress-bar"><span style="width:${percent}%"></span></div>
    <div class="weekly-bottom">
      <span>${state.progress} из ${state.challenge.target}</span>
      <b>${state.done ? 'Выполнено ✓' : percent + '%'}</b>
    </div>
  `;

  box.querySelector('.weekly-title').textContent = state.challenge.title;
  box.querySelector('.weekly-desc').textContent = state.challenge.desc;
}

/* ---------- Служебное: отметка визитов ---------- */

/** Запоминает день визита для полосы недели. */
function markVisitDay() {
  const today = xpTodayKey();
  const visited = readJSON('nihongo_visits', []);
  const list = Array.isArray(visited) ? visited : [];

  if (!list.includes(today)) {
    list.push(today);
    // Храним только две недели истории
    writeJSON('nihongo_visits', list.slice(-14));
  }
}

/* ---------- Подписка на действия ---------- */

registerActionHook((type, amount) => {
  progressDaily(type, amount);
  progressWeekly(type, amount);
});

document.addEventListener('DOMContentLoaded', () => {
  if (typeof isAuthorized === 'function' && isAuthorized()) {
    // Серия дней: первый заход за день продлевает стрик
    const visit = typeof touchStreakOnVisit === 'function' ? touchStreakOnVisit() : null;

    markVisitDay();

    if (visit && visit.isNew) {
      addXP(5, 'Ежедневный вход');

      if (visit.broken && typeof showToast === 'function') {
        showToast('Серия начата заново', 'Ты пропустил день — теперь ' + visit.count + ' 🔥', 'warning');
      } else if (visit.count > 1 && typeof showToast === 'function') {
        showToast('Серия ' + visit.count + ' 🔥', 'Заходи завтра, чтобы продлить', 'info');
      }
    }

    progressDaily('visit', 1);
  }

  renderDailyBlock();
  renderWeeklyBlock();
  renderStreakBlocks();
});

/* Экспорт в глобальную область */
window.DAILY_POOL = DAILY_POOL;
window.WEEKLY_POOL = WEEKLY_POOL;
window.getDailyState = getDailyState;
window.progressDaily = progressDaily;
window.renderDailyBlock = renderDailyBlock;
window.renderStreakBlocks = renderStreakBlocks;
window.getWeeklyState = getWeeklyState;
window.progressWeekly = progressWeekly;
window.renderWeeklyBlock = renderWeeklyBlock;
window.pluralRu = pluralRu;
