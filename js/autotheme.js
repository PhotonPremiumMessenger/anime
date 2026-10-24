/* ============================================================
   autotheme.js — тема по времени суток
   Днём включается светлая тема, вечером — обычная, ночью —
   сакура (мягче для глаз). Работает только если игрок сам
   включил авто-режим в настройках. Ручной выбор темы сильнее:
   выключил авто — тема больше не прыгает.
   ============================================================ */

'use strict';

const AUTOTHEME_KEY = 'nihongo_autotheme';

/* ---------- Настройка ---------- */

/** Включён ли авто-режим. */
function isAutoThemeOn() {
  return readJSON(AUTOTHEME_KEY, false) === true;
}

/** Переключает авто-режим. */
function toggleAutoTheme(button) {
  const next = !isAutoThemeOn();
  writeJSON(AUTOTHEME_KEY, next);

  if (button) button.classList.toggle('chip-active', next);

  if (next) {
    applyAutoTheme(true);
    if (typeof showToast === 'function') showToast('Авто-тема включена', 'Днём светлая, вечером обычная, ночью сакура', 'success');
  } else if (typeof showToast === 'function') {
    showToast('Авто-тема выключена', 'Тема останется такой, какую выбрал', 'info');
  }

  renderAutoThemeSwitch();
}

/* ---------- Тема по часам ---------- */

/**
 * Тема, подходящая текущему времени.
 * 7–17 — светлая, 18–22 — обычная, 23–6 — сакура.
 */
function themeForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 7 && hour < 18) return 'light';
  if (hour >= 18 && hour < 23) return 'default';
  return 'sakura';
}

/**
 * Применяет тему.
 * @param {boolean} silent — без всплывашки
 */
function applyAutoTheme(silent = true) {
  if (!isAutoThemeOn()) return false;

  const next = themeForNow();
  const current = localStorage.getItem('theme') || 'default';

  if (next === current) return false;

  if (typeof setTheme === 'function') setTheme(next);

  if (!silent && typeof showToast === 'function') {
    showToast('Тема сменилась', next === 'light' ? 'Светлая — день' : next === 'sakura' ? 'Сакура — ночь' : 'Стандарт — вечер', 'info');
  }

  return true;
}

/* ---------- Отрисовка ---------- */

/** Рисует переключатель в настройках. */
function renderAutoThemeSwitch() {
  const box = document.getElementById('autoThemeSwitch');
  if (!box) return;

  const on = isAutoThemeOn();
  const next = themeForNow();

  box.innerHTML = `
    <div class="setting-row">
      <div class="setting-info">
        <div class="setting-name">Тема по времени суток</div>
        <div class="setting-desc">Днём светлая, вечером обычная, ночью сакура. Сейчас подошла бы «${
          next === 'light' ? 'Светлая' : next === 'sakura' ? 'Сакура' : 'Стандарт'
        }»</div>
      </div>
      <div class="setting-control">
        <button class="switch-btn${on ? ' is-on' : ''}" onclick="toggleAutoTheme(this)" aria-pressed="${on}">
          <span></span>
        </button>
      </div>
    </div>
  `;
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderAutoThemeSwitch();

  if (!isAutoThemeOn()) return;

  // Первый заход — применяем сразу, дальше проверяем раз в полчаса
  applyAutoTheme(true);
  setInterval(() => applyAutoTheme(true), 30 * 60 * 1000);
});

/* Экспорт в глобальную область */
window.isAutoThemeOn = isAutoThemeOn;
window.toggleAutoTheme = toggleAutoTheme;
window.themeForNow = themeForNow;
window.applyAutoTheme = applyAutoTheme;
window.renderAutoThemeSwitch = renderAutoThemeSwitch;
