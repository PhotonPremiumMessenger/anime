/* ============================================================
   report.js — недельный отчёт
   Собирает последние 7 дней из nihongo_xp_days и счётчиков,
   сравнивает с прошлой неделей и рисует карточку в профиле.
   ============================================================ */

'use strict';

/** Ключ даты. */
function reportDayKey(date) {
  const copy = new Date(date);
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, '0');
  const day = String(copy.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * Данные за последние 7 дней и за 7 дней до них.
 * @param {number} shift — сдвиг в неделях назад
 */
function reportWeek(shift = 0) {
  const days = typeof getXPDays === 'function' ? getXPDays() : {};
  const result = [];
  const today = new Date();

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i - shift * 7);
    const key = reportDayKey(date);

    result.push({
      key: key,
      date: date,
      label: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][date.getDay()],
      xp: Number(days[key]) || 0
    });
  }

  return result;
}

/** Итоги недели. */
function getWeeklyReport() {
  const week = reportWeek(0);
  const prev = reportWeek(1);

  const sum = list => list.reduce((total, day) => total + day.xp, 0);
  const xp = sum(week);
  const prevXP = sum(prev);
  const best = week.reduce((top, day) => (day.xp > top.xp ? day : top), week[0]);

  const counters = typeof getCounters === 'function' ? getCounters() : {};

  return {
    days: week,
    xp: xp,
    prevXP: prevXP,
    delta: prevXP ? Math.round(((xp - prevXP) / prevXP) * 100) : (xp ? 100 : 0),
    best: best,
    active: week.filter(day => day.xp > 0).length,
    lessons: Number(counters.lesson) || 0,
    words: Number(counters.word) || 0,
    quizzes: Number(counters.quiz) || 0
  };
}

/** Рисует отчёт в профиле. */
function renderWeeklyReport() {
  const box = document.getElementById('weeklyReport');
  if (!box) return;

  const report = getWeeklyReport();
  const max = Math.max.apply(null, report.days.map(day => day.xp).concat([1]));
  const trendText = report.delta > 0 ? '+' + report.delta + '%' : report.delta + '%';
  const trendClass = report.delta > 0 ? 'is-up' : report.delta < 0 ? 'is-down' : '';

  box.innerHTML = `
    <div class="report-head">
      <div>
        <span class="report-kicker">Неделя в цифрах</span>
        <h3>${report.xp} XP <span class="report-trend ${trendClass}">${trendText}</span></h3>
        <p class="muted small">к прошлой неделе было ${report.prevXP} XP</p>
      </div>
      <div class="report-badges">
        <div><b>${report.active}/7</b><span>дней с занятиями</span></div>
        <div><b>${report.best.label}</b><span>лучший день (${report.best.xp} XP)</span></div>
      </div>
    </div>

    <div class="report-chart">
      ${report.days.map(day => `
        <div class="report-bar-wrap" title="${day.key}: ${day.xp} XP">
          <div class="report-bar" style="height:${Math.max(6, Math.round((day.xp / max) * 100))}%"></div>
          <span>${day.label}</span>
        </div>
      `).join('')}
    </div>

    <div class="report-foot">
      <span>Уроков пройдено: <b>${report.lessons}</b></span>
      <span>Слов собрано: <b>${report.words}</b></span>
      <span>Викторин: <b>${report.quizzes}</b></span>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('weeklyReport')) renderWeeklyReport();
});

/* Экспорт в глобальную область */
window.getWeeklyReport = getWeeklyReport;
window.renderWeeklyReport = renderWeeklyReport;
