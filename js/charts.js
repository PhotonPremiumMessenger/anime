/* ============================================================
   charts.js — графики на чистом SVG (без библиотек)
   1) столбики опыта за 14 дней;
   2) радиальный прогресс уроков;
   3) кольцо достижений;
   4) мини-график серии дней.
   ============================================================ */

'use strict';

/**
 * Цвет акцента для графиков. SVG и canvas не видят CSS-переменные,
 * поэтому берём готовую строку из getAccentColor() — и график
 * перекрашивается вместе с сайтом.
 * @param {number} shift — сдвиг светлоты, %
 * @param {number} alpha — прозрачность
 */
function chartAccent(shift = 0, alpha = 1) {
  if (typeof getAccentColor === 'function') return getAccentColor(shift, alpha);

  const light = Math.max(0, Math.min(100, 64 + shift));
  return alpha >= 1 ? `hsl(220 6% ${light}%)` : `hsla(220, 6%, ${light}%, ${alpha})`;
}

/* ---------- Помощники ---------- */

/** Склонение числительных. */
function chartPlural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Уникальный id для градиентов. */
let chartUid = 0;

/* ---------- 1. Опыт за 14 дней ---------- */

/**
 * Столбики опыта.
 * @param {string} containerId
 * @param {number} days — сколько дней показывать
 */
function renderXPChart(containerId = 'xpChart', days = 14) {
  const box = document.getElementById(containerId);
  if (!box) return;

  const uid = 'xp' + (chartUid += 1);
  const data = [];

  for (let i = days - 1; i >= 0; i--) {
    const key = typeof xpDateKey === 'function'
      ? xpDateKey(i)
      : new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);

    const date = new Date(key + 'T00:00:00');
    data.push({
      key: key,
      value: typeof getXPDay === 'function' ? getXPDay(key) : 0,
      day: date.getDate(),
      weekday: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][date.getDay()]
    });
  }

  const max = Math.max(30, ...data.map(item => item.value));
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const active = data.filter(item => item.value > 0).length;

  const width = 640;
  const height = 190;
  const padLeft = 8;
  const padBottom = 26;
  const padTop = 16;
  const plotHeight = height - padBottom - padTop;
  const slot = (width - padLeft * 2) / data.length;
  const barWidth = Math.max(8, slot - 8);

  const bars = data.map((item, index) => {
    const barHeight = item.value ? Math.max(4, (item.value / max) * plotHeight) : 3;
    const x = padLeft + index * slot + (slot - barWidth) / 2;
    const y = padTop + plotHeight - barHeight;
    const isToday = index === data.length - 1;

    return `
      <g class="xp-bar-group">
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}"
              rx="5" fill="url(#${uid}bar)" opacity="${item.value ? (isToday ? 1 : 0.82) : 0.22}">
          <title>${item.key}: ${item.value} XP</title>
        </rect>
        ${item.value ? `<text x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle"
              class="chart-bar-value">${item.value}</text>` : ''}
        <text x="${(x + barWidth / 2).toFixed(1)}" y="${height - 8}" text-anchor="middle"
              class="chart-axis ${isToday ? 'is-today' : ''}">${isToday ? 'Сегодня' : item.day}</text>
      </g>
    `;
  }).join('');

  box.innerHTML = `
    <div class="chart-head">
      <div>
        <b>${total.toLocaleString('ru-RU')} XP</b>
        <span>за ${days} ${chartPlural(days, 'день', 'дня', 'дней')} · активных дней: ${active}</span>
      </div>
      <span class="chart-legend"><i></i> опыт за день</span>
    </div>

    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="График опыта за ${days} дней">
      <defs>
        <linearGradient id="${uid}bar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${chartAccent(10)}"/>
        <stop offset="100%" stop-color="${chartAccent(-25)}"/>
        </linearGradient>
      </defs>

      <line x1="0" y1="${padTop + plotHeight}" x2="${width}" y2="${padTop + plotHeight}"
            stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

      ${bars}
    </svg>
  `;
}

/* ---------- 2. Радиальный прогресс ---------- */

/**
 * Кольцо прогресса с числом внутри.
 * @param {string} containerId
 * @param {number} percent — 0..100
 * @param {object} options — { title, caption, color }
 */
function radialProgressMarkup(percent, options = {}) {
  const uid = 'rd' + (chartUid += 1);
  const size = options.size || 132;
  const stroke = options.stroke || 10;
  const radius = (size - stroke) / 2;
  const circle = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  const offset = circle * (1 - safe / 100);

  const color = options.color || chartAccent(0);
  const color2 = options.color2 || chartAccent(-25);

  return `
    <svg class="radial-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img"
         aria-label="${options.title || 'Прогресс'}: ${safe}%">
      <defs>
        <linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${color2}"/>
        </linearGradient>
      </defs>

      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none"
              stroke="rgba(255,255,255,0.08)" stroke-width="${stroke}"/>

      <circle class="radial-value" cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none"
              stroke="url(#${uid}g)" stroke-width="${stroke}" stroke-linecap="round"
              stroke-dasharray="${circle.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
              transform="rotate(-90 ${size / 2} ${size / 2})"/>

      <text x="50%" y="49%" text-anchor="middle" class="radial-number">${safe}%</text>
      <text x="50%" y="65%" text-anchor="middle" class="radial-caption">${options.caption || ''}</text>
    </svg>
  `;
}

/* ---------- 3. Кольцо достижений ---------- */

/** Достижения: сколько открыто из 100, разбивка по группам. */
function renderAchievementDonut(containerId = 'achDonut') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const unlocked = typeof getUnlockedAchievements === 'function' ? getUnlockedAchievements() : [];
  const total = (window.ACHIEVEMENTS || []).length || 100;
  const percent = total ? Math.round((unlocked.length / total) * 100) : 0;

  box.innerHTML = `
    ${radialProgressMarkup(percent, {
      title: 'Достижения',
      caption: unlocked.length + ' из ' + total,
      color: chartAccent(8),
      color2: chartAccent(-20),
      size: 148
    })}

    <div class="donut-legend">
      <div><span>Открыто</span><b>${unlocked.length}</b></div>
      <div><span>Осталось</span><b>${Math.max(0, total - unlocked.length)}</b></div>
    </div>
  `;
}

/* ---------- 4. Прогресс уроков и серия ---------- */

/** Компактная карточка «уроки + серия». */
function renderStudyRings(containerId = 'studyRings') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const progress = typeof getProgress === 'function' ? getProgress() : { lessons: {} };
  const lessons = window.nihongo_lessons || [];

  const done = Object.keys(progress.lessons || {}).filter(
    id => progress.lessons[id] && progress.lessons[id].completed
  ).length;

  const total = lessons.length || 5;
  const lessonPercent = Math.round((done / total) * 100);

  const streak = typeof getStreak === 'function' ? getStreak() : { count: 0, best: 0 };
  const streakPercent = Math.min(100, Math.round((streak.count / 30) * 100));

  const words = Array.isArray(progress.words) ? progress.words.length : 0;

  box.innerHTML = `
    <div class="ring-card">
      ${radialProgressMarkup(lessonPercent, {
        title: 'Уроки',
        caption: done + ' / ' + total,
        color: chartAccent(0),
        color2: chartAccent(-25),
        size: 122
      })}
      <span>Уроки пройдены</span>
    </div>

    <div class="ring-card">
      ${radialProgressMarkup(streakPercent, {
        title: 'Серия дней',
        caption: streak.count + ' 🔥',
        color: chartAccent(-16),
        color2: chartAccent(-42),
        size: 122
      })}
      <span>Серия ${streak.count} ${chartPlural(streak.count, 'день', 'дня', 'дней')} · рекорд ${streak.best}</span>
    </div>

    <div class="ring-card">
      ${radialProgressMarkup(Math.min(100, Math.round((words / 100) * 100)), {
        title: 'Слова',
        caption: words + ' слов',
        color: chartAccent(14),
        color2: chartAccent(-10),
        size: 122
      })}
      <span>Копилка слов</span>
    </div>
  `;
}

/* ---------- 5. Мини-спарклайн ---------- */

/** Маленький график последних 7 дней (для шапки профиля). */
function sparklineMarkup(containerId = 'xpSpark') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const values = [];
  for (let i = 6; i >= 0; i--) {
    const key = typeof xpDateKey === 'function' ? xpDateKey(i) : '';
    values.push(typeof getXPDay === 'function' ? getXPDay(key) : 0);
  }

  const max = Math.max(1, ...values);
  const width = 120;
  const height = 34;
  const step = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - (value / max) * (height - 6) - 3;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  box.innerHTML = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <polyline points="${points}" fill="none" stroke="url(#sparkG)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
      <defs>
        <linearGradient id="sparkG" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${chartAccent(-25)}"/>
        <stop offset="100%" stop-color="${chartAccent(10)}"/>
        </linearGradient>
      </defs>
    </svg>
  `;
}

/* ---------- Инициализация ---------- */

/** Рисует всё, что есть на странице. */
function renderAllCharts() {
  renderXPChart();
  renderAchievementDonut();
  renderStudyRings();
  sparklineMarkup();
}

document.addEventListener('DOMContentLoaded', () => {
  renderAllCharts();
});

/* Экспорт в глобальную область */
window.renderXPChart = renderXPChart;
window.radialProgressMarkup = radialProgressMarkup;
window.renderAchievementDonut = renderAchievementDonut;
window.renderStudyRings = renderStudyRings;
window.sparklineMarkup = sparklineMarkup;
window.renderAllCharts = renderAllCharts;
