/* ============================================================
   badges.js — красивые SVG-значки вместо эмодзи
   У каждого значка редкость, свой градиент и свечение.
   Значок рисуется инлайн-SVG, поэтому масштабируется без потерь.
   ============================================================ */

'use strict';

/** Акцент для SVG-значков: цвет берётся со всего сайта. */
function badgeAccent(shift = 0, alpha = 1) {
  if (typeof getAccentColor === 'function') return getAccentColor(shift, alpha);

  const light = Math.max(0, Math.min(100, 64 + shift));
  return alpha >= 1 ? `hsl(220 6% ${light}%)` : `hsla(220, 6%, ${light}%, ${alpha})`;
}

/* ---------- Редкости ---------- */

const BADGE_RARITY = {
  common:    { title: 'обычный',    color1: '#9CA3AF', color2: '#4B5563', glow: 'rgba(156,163,175,0.45)' },
  rare:      { title: 'редкий',     color1: '#60A5FA', color2: '#1D4ED8', glow: 'rgba(96,165,250,0.5)' },
  epic:      { title: 'эпический',  color1: '#C084FC', color2: '#6D28D9', glow: 'rgba(192,132,252,0.5)' },
  legendary: {
    title: 'легендарный',
    get color1() { return badgeAccent(12); },
    get color2() { return badgeAccent(-22); },
    get glow() { return badgeAccent(8, 0.55); }
  }
};

/* ---------- Каталог значков ---------- */

const BADGES = [
  { id: 'first_steps', name: 'Первые шаги', kanji: '始', rarity: 'common',    desc: 'С первого захода на сайт' },
  { id: 'sakura',      name: 'Сакура',      kanji: '桜', rarity: 'common',    desc: 'За любовь к весне' },
  { id: 'samurai',     name: 'Самурай',     kanji: '侍', rarity: 'rare',      desc: 'Для упорных учеников' },
  { id: 'sensei',      name: 'Сэнсэй',      kanji: '師', rarity: 'rare',      desc: 'За знание грамматики' },
  { id: 'neon',        name: 'Неон',        kanji: '雷', rarity: 'epic',      desc: 'Скорость на максимуме' },
  { id: 'master',      name: 'Мастер',      kanji: '達', rarity: 'epic',      desc: 'Половина пути пройдена' },
  { id: 'legend',      name: 'Легенда',     kanji: '龍', rarity: 'legendary', desc: 'Высший уровень Nihongo' },
  { id: 'weekly',      name: 'Челленджер',  kanji: '週', rarity: 'legendary', desc: 'Только за челлендж недели' }
];

/** Значок по id. */
function getBadge(id) {
  return BADGES.find(badge => badge.id === id) || null;
}

/** Сколько всего значков такой редкости. */
function countBadgesByRarity(rarity) {
  return BADGES.filter(badge => badge.rarity === rarity).length;
}

/* ---------- Отрисовка ---------- */

// Счётчик для уникальных id градиентов в SVG
let badgeCounter = 0;

/**
 * Разметка значка.
 * @param {string} id — id значка
 * @param {number} size — размер в пикселях
 * @param {boolean} animate — добавить блик
 */
function badgeMarkup(id, size = 28, animate = false) {
  const badge = getBadge(id);
  if (!badge) return '';

  const rarity = BADGE_RARITY[badge.rarity] || BADGE_RARITY.common;
  const uid = 'bg' + (badgeCounter += 1);

  // Щит с гранёным верхом — читается и в 16 px, и в 96 px
  return `
<svg class="badge-svg${animate ? ' is-animated' : ''}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <defs>
    <linearGradient id="${uid}a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${rarity.color1}"/>
      <stop offset="100%" stop-color="${rarity.color2}"/>
    </linearGradient>
    <linearGradient id="${uid}b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.18"/>
    </linearGradient>
  </defs>

  <path d="M32 2 L58 12 V34 C58 47 46 57 32 62 C18 57 6 47 6 34 V12 Z"
        fill="url(#${uid}a)" stroke="${rarity.color1}" stroke-width="1.2"/>

  <path d="M32 2 L58 12 V34 C58 47 46 57 32 62 Z"
        fill="#000000" opacity="0.14"/>

  <path d="M32 6 L53 15 V33 C53 43 44 51 32 56 C20 51 11 43 11 33 V15 Z"
        fill="url(#${uid}b)" opacity="0.7"/>

  <text x="32" y="41" text-anchor="middle" font-size="26"
        font-family="'Noto Sans JP', sans-serif" font-weight="700"
        fill="#ffffff" opacity="0.96">${badge.kanji}</text>

  <circle cx="32" cy="49" r="1.6" fill="#ffffff" opacity="0.5"/>
</svg>`.trim();
}

/** Разметка с подписью и рамкой редкости (для магазина и профиля). */
function badgeCardMarkup(id, size = 56) {
  const badge = getBadge(id);
  if (!badge) return '';

  const rarity = BADGE_RARITY[badge.rarity] || BADGE_RARITY.common;

  return `
    <div class="badge-plate rarity-${badge.rarity}" style="--badge-glow:${rarity.glow}">
      ${badgeMarkup(id, size, true)}
      <b>${badge.name}</b>
      <span>${rarity.title}</span>
    </div>
  `.trim();
}

/* ---------- Значок у ника ---------- */

/**
 * Рисует надетый значок во все слоты [data-profile-badge].
 * Вызывается после смены значка в магазине.
 */
function renderEquippedBadge() {
  const state = typeof getShopState === 'function' ? getShopState() : null;
  const item = state && state.equipped.badge && typeof getShopItem === 'function'
    ? getShopItem(state.equipped.badge)
    : null;

  const badgeId = item ? item.badgeId : '';

  document.querySelectorAll('[data-profile-badge]').forEach(slot => {
    if (!badgeId) {
      slot.innerHTML = '';
      slot.classList.add('hidden');
      return;
    }

    slot.innerHTML = badgeMarkup(badgeId, 26, true);
    slot.classList.remove('hidden');
    slot.title = (getBadge(badgeId) || {}).name || '';
  });
}

/* ---------- Витрина ---------- */

/** Рисует все значки (для страницы магазина или профиля). */
function renderBadgeGallery(containerId = 'badgeGallery') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const owned = typeof getShopState === 'function'
    ? getShopState().owned
    : [];

  // Какие значки уже открыты: по id предмета магазина
  const ownedBadgeIds = new Set();
  if (typeof SHOP_ITEMS !== 'undefined') {
    SHOP_ITEMS.forEach(item => {
      if (item.category === 'badge' && owned.includes(item.id) && item.badgeId) {
        ownedBadgeIds.add(item.badgeId);
      }
    });
  }

  box.innerHTML = '';

  BADGES.forEach(badge => {
    const isOwned = ownedBadgeIds.has(badge.id);
    const plate = document.createElement('div');
    plate.className = 'badge-plate' + (isOwned ? ' is-owned' : ' is-locked') + ' rarity-' + badge.rarity;
    plate.style.setProperty('--badge-glow', BADGE_RARITY[badge.rarity].glow);
    plate.innerHTML = `
      ${badgeMarkup(badge.id, 54, isOwned)}
      <b>${badge.name}</b>
      <span>${BADGE_RARITY[badge.rarity].title}</span>
      <i>${isOwned ? 'получен' : badge.desc}</i>
    `;
    box.appendChild(plate);
  });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderBadgeGallery();
  renderEquippedBadge();
});

/* Экспорт в глобальную область */
window.BADGES = BADGES;
window.BADGE_RARITY = BADGE_RARITY;
window.getBadge = getBadge;
window.badgeMarkup = badgeMarkup;
window.badgeCardMarkup = badgeCardMarkup;
window.renderEquippedBadge = renderEquippedBadge;
window.renderBadgeGallery = renderBadgeGallery;
window.countBadgesByRarity = countBadgesByRarity;
