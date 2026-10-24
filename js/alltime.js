/* ============================================================
   alltime.js — статистика за всё время
   Считает то, что не влезает в недельный отчёт: суммарный опыт,
   дни в проекте, лучший стрик, сколько уроков и слов собрано,
   сколько достижений открыто и сколько дней были занятия.
   ============================================================ */

'use strict';

/** Сколько дней между двумя датами. */
function daysBetween(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  return Math.max(0, Math.floor((end - start) / 86400000));
}

/** Собирает статистику за всё время. */
function getAllTimeStats() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const xp = typeof getXP === 'function' ? getXP() : 0;
  const days = typeof getXPDays === 'function' ? getXPDays() : {};
  const counters = typeof getCounters === 'function' ? getCounters() : {};
  const achievements = typeof getUnlockedAchievements === 'function' ? getUnlockedAchievements() : [];
  // Пройденные уроки берём из прогресса: там отметки completed по id
  const progress = typeof getProgress === 'function' ? getProgress() : { lessons: {} };
  const lessons = Object.keys(progress.lessons || {})
    .filter(id => progress.lessons[id] && progress.lessons[id].completed);
  const streak = typeof getStreak === 'function' ? getStreak() : { count: 0 };

  const activeDays = Object.keys(days).filter(key => Number(days[key]) > 0).length;
  const totalXP = Object.values(days).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const since = user && user.createdAt ? user.createdAt : null;
  const best = Math.max(Number(readJSON('nihongo_best_streak', 0)) || 0, streak.count || 0);

  // Обновляем лучший стрик, если текущий его побил
  if ((streak.count || 0) > (Number(readJSON('nihongo_best_streak', 0)) || 0)) {
    writeJSON('nihongo_best_streak', streak.count);
  }

  return {
    xp: xp,
    totalXP: totalXP || xp,
    level: typeof getLevelInfo === 'function' ? getLevelInfo(xp).level : 1,
    daysInProject: since ? daysBetween(since, new Date()) : activeDays,
    activeDays: activeDays,
    streak: streak.count || 0,
    bestStreak: Math.max(best, streak.count || 0),
    lessons: Array.isArray(lessons) ? lessons.length : 0,
    words: typeof getMyWords === 'function' ? getMyWords().length : 0,
    achievements: achievements.length,
    quizzes: Number(counters.quiz) || 0,
    tests: Number(counters.test) || 0,
    favorites: typeof getFavorites === 'function' ? getFavorites().length : 0,
    mistakes: typeof getMistakes === 'function' ? getMistakes().length : 0
  };
}

/** Рисует блок «за всё время». */
function renderAllTime(containerId = 'allTimeStats') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const stats = getAllTimeStats();

  const cards = [
    { value: stats.totalXP, label: 'опыта всего', note: 'за всё время' },
    { value: stats.level, label: 'уровень', note: 'из 100' },
    { value: stats.daysInProject, label: 'дней в проекте', note: 'с регистрации' },
    { value: stats.activeDays, label: 'дней с занятиями', note: 'не пропускаешь' },
    { value: stats.lessons, label: 'уроков пройдено', note: 'из 5' },
    { value: stats.words, label: 'слов собрано', note: 'в копилке' },
    { value: stats.achievements, label: 'достижений', note: 'из 100' },
    { value: stats.bestStreak, label: 'лучший стрик', note: 'дней подряд' }
  ];

  box.innerHTML = `
    <div class="alltime-grid">
      ${cards.map(card => `
        <div class="alltime-card">
          <b>${card.value}</b>
          <span>${card.label}</span>
          <i>${card.note}</i>
        </div>
      `).join('')}
    </div>

    <div class="alltime-foot">
      <span>Викторин: <b>${stats.quizzes}</b></span>
      <span>Тестов: <b>${stats.tests}</b></span>
      <span>В избранном: <b>${stats.favorites}</b></span>
      <span>Ошибок в разборе: <b>${stats.mistakes}</b></span>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  renderAllTime();
});

/* Экспорт в глобальную область */
window.getAllTimeStats = getAllTimeStats;
window.renderAllTime = renderAllTime;
