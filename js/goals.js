/* ============================================================
   goals.js — цели на день и неделю
   Игрок сам выбирает дневную норму опыта и число уроков в неделю.
   Прогресс считается по nihongo_xp_days и счётчикам, цель
   сохраняется в nihongo_goals, закрытая цель даёт бонус XP.
   ============================================================ */

'use strict';

const GOALS_KEY = 'nihongo_goals';

const GOAL_PRESETS = {
  light: { title: 'Спокойный', daily: 40, weeklyLessons: 2, note: '10 минут в день' },
  normal: { title: 'Обычный', daily: 100, weeklyLessons: 4, note: '20 минут в день' },
  hard: { title: 'Серьёзный', daily: 200, weeklyLessons: 7, note: '40 минут в день' }
};

/* ---------- Хранилище ---------- */

/** Настройки целей. */
function getGoals() {
  const saved = readJSON(GOALS_KEY, null);

  return {
    preset: saved && saved.preset ? saved.preset : 'normal',
    daily: saved && saved.daily ? Number(saved.daily) : 100,
    weeklyLessons: saved && saved.weeklyLessons ? Number(saved.weeklyLessons) : 4,
    bonusDay: saved && saved.bonusDay ? saved.bonusDay : ''
  };
}

/** Сохраняет цели. */
function saveGoals(patch) {
  const goals = Object.assign(getGoals(), patch || {});
  writeJSON(GOALS_KEY, goals);
  renderGoals();
  return goals;
}

/** Меняет готовый набор целей. */
function setGoalPreset(preset) {
  const config = GOAL_PRESETS[preset];
  if (!config) return;

  saveGoals({ preset: preset, daily: config.daily, weeklyLessons: config.weeklyLessons });
  if (typeof showToast === 'function') {
    showToast('Цель обновлена', config.title + ' · ' + config.daily + ' XP в день', 'success');
  }
}

/* ---------- Прогресс ---------- */

/** Ключ сегодняшнего дня. */
function goalsTodayKey() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

/**
 * Прогресс по целям.
 * Возвращает { dailyXP, dailyGoal, dailyPercent, done, weeklyLessons, weeklyGoal, weeklyPercent }.
 */
function getGoalsProgress() {
  const goals = getGoals();
  const days = typeof getXPDays === 'function' ? getXPDays() : {};
  const todayXP = Number(days[goalsTodayKey()]) || 0;
  const counters = typeof getCounters === 'function' ? getCounters() : {};

  // Уроки за неделю: считаем по журналу активности, если он есть
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  // activity.js подключён не на всех страницах, поэтому читаем ключ напрямую
  const activity = typeof getActivity === 'function'
    ? getActivity()
    : (readJSON('nihongo_activity', []) || []);
  const weeklyLessons = activity.filter(item =>
    item.type === 'lesson' && new Date(item.at).getTime() >= weekAgo
  ).length;

  return {
    goals: goals,
    dailyXP: todayXP,
    dailyGoal: goals.daily,
    dailyPercent: Math.min(100, Math.round((todayXP / Math.max(1, goals.daily)) * 100)),
    dailyDone: todayXP >= goals.daily,
    weeklyLessons: weeklyLessons || 0,
    weeklyGoal: goals.weeklyLessons,
    weeklyPercent: Math.min(100, Math.round(((weeklyLessons || 0) / Math.max(1, goals.weeklyLessons)) * 100)),
    totalLessons: Number(counters.lesson) || 0
  };
}

/**
 * Начисляет бонус, когда дневная цель закрыта.
 * Вызывается из addXP через шину действий и при загрузке страницы.
 */
function checkGoalBonus() {
  const progress = getGoalsProgress();
  const goals = progress.goals;

  if (!progress.dailyDone) return false;
  if (goals.bonusDay === goalsTodayKey()) return false;

  writeJSON(GOALS_KEY, Object.assign(goals, { bonusDay: goalsTodayKey() }));

  if (typeof addXP === 'function') addXP(25, 'Дневная цель закрыта');
  if (typeof pushNotification === 'function') {
    pushNotification('reward', 'Дневная цель закрыта', progress.dailyXP + ' XP — нормы хватит с запасом');
  }
  if (typeof showToast === 'function') {
    showToast('Цель дня закрыта', '+25 XP бонусом. Так держать!', 'success');
  }
  if (typeof logActivity === 'function') {
    logActivity('reward', 'Закрыта дневная цель: ' + progress.dailyXP + ' XP', 25);
  }

  return true;
}

/* ---------- Отрисовка ---------- */

/**
 * Рисует виджет целей.
 * @param {string} containerId
 * @param {boolean} compact — короткая версия для главной
 */
function renderGoals(containerId = 'goalsBlock', compact = false) {
  const box = document.getElementById(containerId);
  if (!box) return;

  const progress = getGoalsProgress();
  const presets = Object.keys(GOAL_PRESETS);

  box.classList.toggle('goals-compact', compact);

  box.innerHTML = `
    <div class="goals-head">
      <div>
        <span class="goals-kicker">Цель дня</span>
        <b class="goals-value">${progress.dailyXP}<span> / ${progress.dailyGoal} XP</span></b>
      </div>
      <div class="goals-ring" style="--ring:${progress.dailyPercent}">
        <span>${progress.dailyPercent}%</span>
      </div>
    </div>

    <div class="progress-bar goals-bar"><span style="width:${progress.dailyPercent}%"></span></div>

    <div class="goals-week">
      <span>Уроков за неделю: <b>${progress.weeklyLessons}</b> из ${progress.weeklyGoal}</span>
      <div class="progress-bar"><span style="width:${progress.weeklyPercent}%"></span></div>
    </div>

    ${compact ? '' : `
      <div class="goals-presets">
        ${presets.map(key => `
          <button class="chip${progress.goals.preset === key ? ' chip-active' : ''}"
                  onclick="setGoalPreset('${key}')">${GOAL_PRESETS[key].title}</button>
        `).join('')}
      </div>
      <p class="custom-hint">${GOAL_PRESETS[progress.goals.preset] ? GOAL_PRESETS[progress.goals.preset].note : ''}.
        Закрыл норму — +25 XP бонусом, раз в день.</p>
    `}
  `;
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderGoals('goalsBlock');
  renderGoals('goalsMini', true);

  // Цель могла закрыться ещё до загрузки страницы
  setTimeout(checkGoalBonus, 1200);

  if (typeof registerActionHook === 'function') {
    registerActionHook(() => setTimeout(checkGoalBonus, 300));
  }
});

/* Экспорт в глобальную область */
window.GOAL_PRESETS = GOAL_PRESETS;
window.getGoals = getGoals;
window.saveGoals = saveGoals;
window.setGoalPreset = setGoalPreset;
window.getGoalsProgress = getGoalsProgress;
window.checkGoalBonus = checkGoalBonus;
window.renderGoals = renderGoals;
