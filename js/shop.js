/* ============================================================
   shop.js — магазин за XP
   Товары: аватары, темы, рамки профиля и значки.
   Состояние покупок и надетых предметов — в anilingo_shop.
   ============================================================ */

'use strict';

/* ---------- Товары ---------- */

const SHOP_ITEMS = [
  /* --- Аватары (премиальные образы) --- */
  { id: 'avatar-9',  category: 'avatar', name: 'Серебряный журавль', desc: 'Аватар с золотой заколкой', price: 300, preview: 'assets/images/avatars/avatar9.png', value: 'assets/images/avatars/avatar9.png' },
  { id: 'avatar-10', category: 'avatar', name: 'Алый клинок',       desc: 'Аватар с повязкой и углями', price: 300, preview: 'assets/images/avatars/avatar10.png', value: 'assets/images/avatars/avatar10.png' },
  { id: 'avatar-11', category: 'avatar', name: 'Лисья жрица',       desc: 'Аватар с духом кицунэ', price: 350, preview: 'assets/images/avatars/avatar11.png', value: 'assets/images/avatars/avatar11.png' },
  { id: 'avatar-12', category: 'avatar', name: 'Они-воин',          desc: 'Аватар с золотой маской', price: 350, preview: 'assets/images/avatars/avatar12.png', value: 'assets/images/avatars/avatar12.png' },
  { id: 'avatar-13', category: 'avatar', name: 'Звёздный час',       desc: 'Аватар с розовыми заколками', price: 400, preview: 'assets/images/avatars/avatar13.png', value: 'assets/images/avatars/avatar13.png' },
  { id: 'avatar-14', category: 'avatar', name: 'Ледяной клинок',     desc: 'Аватар со серебряными волосами', price: 400, preview: 'assets/images/avatars/avatar14.png', value: 'assets/images/avatars/avatar14.png' },
  { id: 'avatar-15', category: 'avatar', name: 'Мико',               desc: 'Аватар жрицы в храме', price: 450, preview: 'assets/images/avatars/avatar15.png', value: 'assets/images/avatars/avatar15.png' },
  { id: 'avatar-16', category: 'avatar', name: 'Странник в капюшоне', desc: 'Аватар с янтарными глазами', price: 500, preview: 'assets/images/avatars/avatar16.png', value: 'assets/images/avatars/avatar16.png' },

  /* --- Темы (акцентные цвета) --- */
  { id: 'theme-sakura-plus', category: 'theme', name: 'Сакура+',   desc: 'Розовый акцент и мягкое свечение', price: 450, accent: '#FF9EC0', accentDark: '#C2477B', icon: 'sakura' },
  { id: 'theme-midnight',    category: 'theme', name: 'Полночь',   desc: 'Холодный синий акцент',            price: 450, accent: '#7DB7FF', accentDark: '#2F5DA8', icon: 'moon' },
  { id: 'theme-neon',        category: 'theme', name: 'Неон',      desc: 'Яркий бирюзовый акцент',           price: 500, accent: '#5EEAD4', accentDark: '#0E7C6B', icon: 'bolt' },
  { id: 'theme-gold',        category: 'theme', name: 'Золото',    desc: 'Роскошный золотой акцент',         price: 600, accent: '#FFD166', accentDark: '#A67C00', icon: 'crown' },

  /* --- Рамки аватара --- */
  { id: 'frame-bamboo',  category: 'frame', name: 'Бамбук',  desc: 'Зелёная рамка вокруг аватара',   price: 200, frame: 'frame-bamboo',  icon: 'leaf' },
  { id: 'frame-lantern', category: 'frame', name: 'Фонарь',  desc: 'Тёплая оранжевая окантовка',     price: 250, frame: 'frame-lantern', icon: 'lantern' },
  { id: 'frame-torii',   category: 'frame', name: 'Тории',   desc: 'Красная рамка в стиле врат',     price: 400, frame: 'frame-torii',   icon: 'torii' },
  { id: 'frame-sakura',  category: 'frame', name: 'Сакура',  desc: 'Розовые лепестки по кругу',      price: 550, frame: 'frame-sakura',  icon: 'sakura' },
  { id: 'frame-dragon',  category: 'frame', name: 'Дракон',  desc: 'Золотая чешуя, свечение',        price: 800, frame: 'frame-dragon',  icon: 'fire' },

  /* --- Значки у ника --- */
  { id: 'badge-first-steps', category: 'badge', name: 'Первые шаги', desc: 'Значок новичка',        price: 150, badge: '👣', badgeId: 'first_steps', icon: 'star',   rarity: 'common' },
  { id: 'badge-sakura',      category: 'badge', name: 'Сакура',      desc: 'Нежный значок',         price: 200, badge: '🌸', badgeId: 'sakura',      icon: 'sakura', rarity: 'common' },
  { id: 'badge-samurai',     category: 'badge', name: 'Самурай',     desc: 'Значок для упорных',    price: 300, badge: '⚔', badgeId: 'samurai',     icon: 'sword',  rarity: 'rare' },
  { id: 'badge-sensei',      category: 'badge', name: 'Сэнсэй',      desc: 'Значок знатока',        price: 500, badge: '👘', badgeId: 'sensei',      icon: 'book',   rarity: 'rare' },
  { id: 'badge-neon',        category: 'badge', name: 'Неон',        desc: 'Значок скорости',       price: 650, badge: '⚡', badgeId: 'neon',        icon: 'bolt',   rarity: 'epic' },
  { id: 'badge-master',      category: 'badge', name: 'Мастер',      desc: 'Значок профессионала',  price: 800, badge: '🎋', badgeId: 'master',      icon: 'trophy', rarity: 'epic' },
  { id: 'badge-legend',      category: 'badge', name: 'Легенда',     desc: 'Значок для легенд',     price: 1200, badge: '🐉', badgeId: 'legend',     icon: 'crown',  rarity: 'legendary' },
  { id: 'badge-weekly',      category: 'badge', name: 'Челленджер',  desc: 'Только за челлендж недели', price: 0, badge: '🏅', badgeId: 'weekly', icon: 'flag', exclusive: true, rarity: 'legendary' }
];

/* ---------- Состояние магазина ---------- */

const SHOP_CATEGORIES = [
  { id: 'all',    name: 'Все' },
  { id: 'avatar', name: 'Аватары' },
  { id: 'theme',  name: 'Темы' },
  { id: 'frame',  name: 'Рамки' },
  { id: 'badge',  name: 'Значки' }
];

/** Читает состояние магазина. */
function getShopState() {
  const saved = readJSON(XP_KEYS.shop, null);

  return {
    owned: Array.isArray(saved && saved.owned) ? saved.owned : [],
    equipped: {
      frame: (saved && saved.equipped && saved.equipped.frame) || '',
      badge: (saved && saved.equipped && saved.equipped.badge) || '',
      theme: (saved && saved.equipped && saved.equipped.theme) || ''
    },
    purchases: Number(saved && saved.purchases) || 0
  };
}

/** Сохраняет состояние магазина. */
function saveShopState(state) {
  writeJSON(XP_KEYS.shop, state);
}

/** Находит товар по id. */
function getShopItem(id) {
  return SHOP_ITEMS.find(item => item.id === id) || null;
}

/** Куплен ли товар (или выдан наградой). */
function ownsShopItem(id) {
  return getShopState().owned.includes(id);
}

/**
 * Выдаёт предмет бесплатно: за уровень, челлендж или пасхалку.
 * @param {string} id
 * @param {string} source — 'level' | 'weekly' | 'easter' | 'event'
 */
function unlockShopItem(id, source = 'event', silent = false) {
  const item = getShopItem(id);
  if (!item) return false;

  const state = getShopState();
  if (state.owned.includes(id)) return false;

  state.owned.push(id);
  saveShopState(state);

  if (!silent && typeof showToast === 'function') {
    const labels = {
      level: 'Награда за уровень',
      weekly: 'Награда за челлендж',
      easter: 'Секретная награда',
      event: 'Новый предмет'
    };
    showToast(labels[source] || 'Новый предмет', item.name + ' теперь твой', 'success');
  }

  applyShopStyles();
  if (typeof renderShop === 'function') renderShop();
  return true;
}

/* ---------- Покупка и экипировка ---------- */

/** Покупает предмет за XP. */
function buyShopItem(id) {
  const item = getShopItem(id);
  if (!item) return;

  if (item.exclusive) {
    showToast('Эксклюзив', 'Этот значок нельзя купить — только заработать', 'warning');
    return;
  }

  if (ownsShopItem(id)) {
    equipShopItem(id);
    return;
  }

  if (getXP() < item.price) {
    const missing = item.price - getXP();
    showToast('Не хватает XP', 'Нужно ещё ' + missing + ' XP. Проходи уроки и задания', 'warning');
    return;
  }

  if (!spendXP(item.price)) {
    showToast('Ошибка', 'Не удалось списать XP', 'error');
    return;
  }

  const state = getShopState();
  state.owned.push(id);
  state.purchases += 1;
  saveShopState(state);

  notifyAction('shop', 1, { reason: 'Покупка: ' + item.name });

  showToast('Куплено', item.name + ' за ' + item.price + ' XP', 'success');

  // Аватар сразу надеваем, остальное — экипируем на себя
  if (item.category === 'avatar') {
    if (typeof setAvatar === 'function') setAvatar(item.value);
  } else {
    equipShopItem(id, true);
  }
  if (typeof renderShop === 'function') renderShop();
  if (typeof renderProfileLevel === 'function') renderProfileLevel();
}

/**
 * Надевает предмет нужной категории.
 * @param {string} id
 * @param {boolean} silent
 */
function equipShopItem(id, silent = false) {
  const item = getShopItem(id);
  if (!item || !['frame', 'badge', 'theme'].includes(item.category)) return false;

  const state = getShopState();
  const same = state.equipped[item.category] === item.id;

  // Повторный клик снимает предмет (кроме темы)
  state.equipped[item.category] = same && item.category !== 'theme' ? '' : item.id;
  saveShopState(state);

  applyShopStyles();

  if (!silent && typeof showToast === 'function') {
    showToast(
      state.equipped[item.category] ? 'Надето' : 'Снято',
      item.name,
      'info'
    );
  }

  if (typeof renderShop === 'function') renderShop();
  if (typeof renderProfileLevel === 'function') renderProfileLevel();
  return true;
}

/* ---------- Применение стилей ---------- */

/**
 * Применяет надетые рамку, значок и тему ко всем страницам.
 * Вызывается при загрузке и после покупки.
 */
function applyShopStyles() {
  const state = getShopState();

  // Рамка аватара
  const frame = state.equipped.frame ? getShopItem(state.equipped.frame) : null;
  document.querySelectorAll('.avatar-frame').forEach(el => {
    el.classList.remove('frame-bamboo', 'frame-lantern', 'frame-torii', 'frame-sakura', 'frame-dragon');
    if (frame && frame.frame) el.classList.add(frame.frame);
  });

  // Значок у ника: рисуем SVG, если модуль значков подключён
  if (typeof renderEquippedBadge === 'function') {
    renderEquippedBadge();
  } else {
    document.querySelectorAll('[data-profile-badge]').forEach(el => {
      const badge = state.equipped.badge ? getShopItem(state.equipped.badge) : null;
      el.textContent = badge ? badge.badge : '';
      el.classList.toggle('hidden', !badge);
    });
  }

  // Акцентная тема из магазина
  const theme = state.equipped.theme ? getShopItem(state.equipped.theme) : null;
  const root = document.documentElement;

  if (theme && theme.accent) {
    // Тема магазина тоже задаёт три числа цвета — тогда перекрашивается всё
    const tone = hexToHslTone(theme.accent);

    root.style.setProperty('--accent-hue', String(tone.hue));
    root.style.setProperty('--accent-sat', tone.sat + '%');
    root.style.setProperty('--accent-l', tone.light + '%');

    document.body.classList.add('has-shop-theme');
    document.body.dataset.shopTheme = theme.id;
  } else {
    // Возвращаем цвет из настроек: он хранится отдельно и не теряется
    if (typeof applyAccentSettings === 'function') {
      applyAccentSettings();
    } else {
      root.style.removeProperty('--accent-hue');
      root.style.removeProperty('--accent-sat');
      root.style.removeProperty('--accent-l');
    }

    document.body.classList.remove('has-shop-theme');
    delete document.body.dataset.shopTheme;
  }
}

/** #RRGGBB → три числа цвета сайта: оттенок, насыщенность, светлота. */
function hexToHslTone(hex) {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;

  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let hue = 0;
  if (delta) {
    if (max === rn) hue = ((gn - bn) / delta) % 6;
    else if (max === gn) hue = (bn - rn) / delta + 2;
    else hue = (rn - gn) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  const light = (max + min) / 2;
  const sat = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;

  return { hue: hue, sat: Math.round(sat * 100), light: Math.round(light * 100) };
}

/** #RRGGBB → rgba(r, g, b, a) для мягких подложек. */
function hexToRgba(hex, alpha) {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(ch => ch + ch).join('')
    : clean;

  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;

  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

/* ---------- Отрисовка страницы магазина ---------- */

let shopFilter = 'all';

/** Переключает категорию магазина. */
function filterShop(category, button) {
  shopFilter = category;
  document.querySelectorAll('.shop-filters .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');
  renderShop();
}

/** Рисует сетку товаров. */
function renderShop() {
  const grid = document.getElementById('shopGrid');
  if (!grid) return;

  const state = getShopState();
  const xp = getXP();
  const items = SHOP_ITEMS.filter(item => shopFilter === 'all' || item.category === shopFilter);

  // Баланс и сводка в шапке страницы
  const balance = document.getElementById('shopBalance');
  if (balance) balance.textContent = xp + ' XP';

  const levelEl = document.getElementById('shopLevel');
  if (levelEl) levelEl.textContent = getLevelInfo(xp).level;

  const ownedEl = document.getElementById('shopOwned');
  if (ownedEl) {
    const total = SHOP_ITEMS.filter(item => !item.exclusive).length;
    ownedEl.textContent = state.owned.filter(id => getShopItem(id)).length + ' / ' + total;
  }

  grid.innerHTML = '';

  items.forEach(item => {
    const owned = state.owned.includes(item.id);
    const equipped = state.equipped[item.category] === item.id;
    const affordable = xp >= item.price;

    const card = document.createElement('article');
    card.className = 'shop-card' + (owned ? ' is-owned' : '') + (equipped ? ' is-equipped' : '') +
      (item.rarity ? ' rarity-' + item.rarity : '');

    // Превью: картинка для аватаров, иконка для остального
    const preview = item.preview
      ? '<img src="' + item.preview + '" alt="' + item.name + '">'
      : (item.badgeId && typeof badgeMarkup === 'function'
          ? badgeMarkup(item.badgeId, 68, true)
          : achievementIconMarkup({ icon: item.icon || 'star' }, true));

    card.innerHTML = `
      <div class="shop-preview ${item.preview ? 'is-image' : ''} ${item.category === 'theme' ? 'is-theme' : ''}">
        ${item.category === 'theme'
          ? '<span class="shop-swatch" style="background:linear-gradient(135deg,' + item.accent + ',' + item.accentDark + ')"></span>'
          : preview}
      </div>
      <div class="shop-body">
        <div class="shop-head">
          <h3 class="shop-name"></h3>
          <span class="shop-price">${item.exclusive ? 'эксклюзив' : item.price + ' XP'}</span>
        </div>
        <p class="shop-desc"></p>
        <div class="shop-actions"></div>
      </div>
    `;

    card.querySelector('.shop-name').textContent = item.name;
    card.querySelector('.shop-desc').textContent = item.desc;

    const actions = card.querySelector('.shop-actions');

    if (item.exclusive) {
      const note = document.createElement('span');
      note.className = 'shop-note';
      note.textContent = owned ? 'Заработано' : 'Только за челлендж недели';
      actions.appendChild(note);
    } else if (!owned) {
      const buy = document.createElement('button');
      buy.className = 'btn btn-primary btn-small';
      buy.textContent = affordable ? 'Купить' : 'Не хватает XP';
      buy.disabled = !affordable;
      buy.addEventListener('click', () => buyShopItem(item.id));
      actions.appendChild(buy);
    } else if (item.category === 'avatar') {
      const isCurrent = typeof getCurrentAvatar === 'function' && getCurrentAvatar() === item.value;
      const wear = document.createElement('button');
      wear.className = isCurrent ? 'btn btn-ghost btn-small' : 'btn btn-outline btn-small';
      wear.textContent = isCurrent ? 'На аватаре ✓' : 'Надеть';
      wear.addEventListener('click', () => {
        if (typeof setAvatar === 'function') setAvatar(item.value);
        renderShop();
      });
      actions.appendChild(wear);
    } else if (['frame', 'badge', 'theme'].includes(item.category)) {
      const equip = document.createElement('button');
      equip.className = equipped ? 'btn btn-ghost btn-small' : 'btn btn-outline btn-small';
      equip.textContent = equipped ? 'Надето ✓' : 'Надеть';
      equip.addEventListener('click', () => equipShopItem(item.id));
      actions.appendChild(equip);
    } else {
      const note = document.createElement('span');
      note.className = 'shop-note is-ok';
      note.textContent = 'Куплено';
      actions.appendChild(note);
    }

    grid.appendChild(card);
  });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  applyShopStyles();
  if (document.getElementById('shopGrid')) {
    renderShop();
  }
});

/* Экспорт в глобальную область */
window.SHOP_ITEMS = SHOP_ITEMS;
window.SHOP_CATEGORIES = SHOP_CATEGORIES;
window.getShopState = getShopState;
window.getShopItem = getShopItem;
window.ownsShopItem = ownsShopItem;
window.unlockShopItem = unlockShopItem;
window.buyShopItem = buyShopItem;
window.equipShopItem = equipShopItem;
window.applyShopStyles = applyShopStyles;
window.hexToRgba = hexToRgba;
window.filterShop = filterShop;
window.renderShop = renderShop;
