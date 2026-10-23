/* ============================================================
   profile.js — страница профиля
   Проверяет авторизацию, заполняет данные игрока,
   показывает статистику и управляет выходом.
   ============================================================ */

'use strict';

// Базовые значения прогресса (пока бэкенд не отдаёт статистику)
const DEFAULT_STATS = {
  lessons: 12,
  words: 148,
  days: 5,
  level: 3,
  xp: 340,
  xpMax: 500
};

/* ---------- Защита страницы ---------- */

/**
 * Если токена нет — отправляем на страницу регистрации.
 * Возвращает true, если пользователь авторизован.
 */
function checkAuth() {
  const token = localStorage.getItem('token');

  if (!token) {
    // Запоминаем, куда пользователь хотел попасть
    sessionStorage.setItem('redirectAfterLogin', 'profile.html');
    window.location.href = 'register.html';
    return false;
  }

  return true;
}

/* ---------- Заполнение страницы ---------- */

/** Читает статистику из localStorage, недостающее берёт из DEFAULT_STATS. */
function readStats() {
  let saved = {};

  try {
    saved = JSON.parse(localStorage.getItem('stats') || '{}') || {};
  } catch (e) {
    saved = {};
  }

  return Object.assign({}, DEFAULT_STATS, saved);
}

/** Заполняет ник, аватар, уровень и XP. */
function fillProfile() {
  const username = localStorage.getItem('username') || 'Игрок';
  const stats = readStats();

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

  // Дата регистрации (если сохранена при входе)
  const joined = localStorage.getItem('joinedAt');
  const joinedEl = document.getElementById('joinedDate');
  if (joinedEl) {
    joinedEl.textContent = joined ? formatDate(new Date(joined)) : 'сегодня';
  }

  // Аватар
  updateAllAvatars();
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
