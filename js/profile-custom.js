/* ============================================================
   profile-custom.js — оформление профиля и био
   Пункт 21: шапка профиля, акцент, свечение карточек, эффект ника.
   Пункт 22: био, город и любимый тайтл.
   Всё хранится в localStorage: anilingo_custom и поле bio в аккаунте.
   ============================================================ */

'use strict';

const CUSTOM_KEY = 'anilingo_custom';
const BIO_LIMIT = 200;

/* ---------- Пресеты ---------- */

const CUSTOM_GRADIENTS = [
  { id: 'graphite', name: 'Графит', css: 'linear-gradient(135deg, #d8d8de, #8a8a94 55%, #3a3a42)' },
  { id: 'sunset',  name: 'Закат',   css: 'linear-gradient(135deg, #FF8A3D, #B7410E 55%, #4A1D0B)' },
  { id: 'sakura',  name: 'Сакура',  css: 'linear-gradient(135deg, #FF9EC0, #C2477B 60%, #4C1D3A)' },
  { id: 'midnight', name: 'Полночь', css: 'linear-gradient(135deg, #3B82F6, #1E3A8A 60%, #0B1220)' },
  { id: 'matcha',  name: 'Матча',   css: 'linear-gradient(135deg, #6EE7B7, #047857 60%, #052E24)' },
  { id: 'violet',  name: 'Аметист', css: 'linear-gradient(135deg, #C084FC, #6D28D9 60%, #2A1046)' },
  { id: 'gold',    name: 'Золото',  css: 'linear-gradient(135deg, #FFD166, #B45309 60%, #3B1E05)' }
];

/* Акцент профиля — те же три числа, что и цвет сайта целиком */
const CUSTOM_ACCENTS = [
  { id: 'graphite', name: 'Графит',   hue: 220, sat: 6,  light: 64 },
  { id: 'rose',     name: 'Розовый',  hue: 340, sat: 88, light: 76 },
  { id: 'blue',     name: 'Синий',    hue: 212, sat: 90, light: 68 },
  { id: 'mint',     name: 'Мятный',   hue: 168, sat: 70, light: 62 },
  { id: 'violet',   name: 'Аметист',  hue: 268, sat: 78, light: 68 }
];

const CUSTOM_NAME_EFFECTS = [
  { id: 'none',   name: 'Обычный' },
  { id: 'glow',   name: 'Свечение' },
  { id: 'gradient', name: 'Градиент' },
  { id: 'mirror', name: 'Зеркальный' }
];

/* ---------- Состояние ---------- */

/** Настройки оформления. */
function getCustomState() {
  const saved = readJSON(CUSTOM_KEY, null);

  return {
    gradient: (saved && saved.gradient) || 'graphite',
    accent: (saved && saved.accent) || 'graphite',
    nameEffect: (saved && saved.nameEffect) || 'glow',
    glow: saved ? Boolean(saved.glow) : true,
    glass: saved ? Boolean(saved.glass) : true,
    compact: saved ? Boolean(saved.compact) : false
  };
}

/** Сохраняет настройки. */
function saveCustomState(state) {
  writeJSON(CUSTOM_KEY, state);
}

/**
 * Применяет оформление ко всей странице.
 * Вызывается при загрузке и после каждого изменения.
 */
function applyProfileCustomization() {
  const state = getCustomState();
  const gradient = CUSTOM_GRADIENTS.find(item => item.id === state.gradient) || CUSTOM_GRADIENTS[0];
  const accent = CUSTOM_ACCENTS.find(item => item.id === state.accent) || CUSTOM_ACCENTS[0];

  const root = document.documentElement;
  const body = document.body;

  // Шапка профиля
  root.style.setProperty('--profile-gradient', gradient.css);

  // Акцент: не перебиваем тему из магазина
  const shopState = typeof getShopState === 'function' ? getShopState() : null;
  const shopTheme = shopState && shopState.equipped ? shopState.equipped.theme : '';

  if (!shopTheme) {
    if (state.accent === 'graphite') {
      // Графит — это и есть цвет по умолчанию, просто снимаем свои значения
      root.style.removeProperty('--accent-hue');
      root.style.removeProperty('--accent-sat');
      root.style.removeProperty('--accent-l');
    } else {
      root.style.setProperty('--accent-hue', String(accent.hue));
      root.style.setProperty('--accent-sat', accent.sat + '%');
      root.style.setProperty('--accent-l', accent.light + '%');
    }
  }

  // Классы состояния
  body.classList.toggle('no-glow', !state.glow);
  body.classList.toggle('glass-heavy', state.glass);
  body.classList.toggle('compact-cards', state.compact);
  body.dataset.nameEffect = state.nameEffect;
}

/** hex → rgba, если модуль магазина не подключён. */
function hexToRgbaSafe(hex, alpha) {
  if (typeof hexToRgba === 'function') return hexToRgba(hex, alpha);

  const clean = String(hex || '').replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;

  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

/* ---------- Панель оформления ---------- */

/** Открывает модалку оформления. */
function openCustomPanel() {
  const modal = document.getElementById('customModal');
  if (!modal) return;

  renderCustomPanel();
  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

/** Закрывает модалку. */
function closeCustomPanel() {
  const modal = document.getElementById('customModal');
  if (!modal) return;

  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

/** Меняет одну настройку и сразу применяет. */
function setCustom(key, value) {
  const state = getCustomState();

  if (key === 'glow' || key === 'glass' || key === 'compact') state[key] = Boolean(value);
  else state[key] = value;

  saveCustomState(state);
  applyProfileCustomization();
  renderCustomPanel();

  if (key === 'gradient' || key === 'accent') {
    if (typeof logActivity === 'function') logActivity('custom', 'Новое оформление профиля');
  }
}

/** Рисует содержимое панели. */
function renderCustomPanel() {
  const body = document.getElementById('customPanelBody');
  if (!body) return;

  const state = getCustomState();

  body.innerHTML = `
    <div class="custom-group">
      <h4>Шапка профиля</h4>
      <div class="custom-gradients">
        ${CUSTOM_GRADIENTS.map(item => `
          <button class="custom-gradient ${state.gradient === item.id ? 'is-active' : ''}"
                  style="background:${item.css}" onclick="setCustom('gradient', '${item.id}')"
                  title="${item.name}">
            <span>${item.name}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="custom-group">
      <h4>Акцентный цвет</h4>
      <div class="custom-accents">
        ${CUSTOM_ACCENTS.map(item => `
          <button class="custom-accent ${state.accent === item.id ? 'is-active' : ''}"
                  style="--swatch:hsl(${item.hue} ${item.sat}% ${item.light}%)"
                  onclick="setCustom('accent', '${item.id}')"
                  title="${item.name}">
            <i></i><span>${item.name}</span>
          </button>
        `).join('')}
      </div>
      <p class="custom-hint">Если в магазине надета тема, её цвет важнее.</p>
    </div>

    <div class="custom-group">
      <h4>Эффект ника</h4>
      <div class="custom-effects">
        ${CUSTOM_NAME_EFFECTS.map(item => `
          <button class="custom-effect ${state.nameEffect === item.id ? 'is-active' : ''}"
                  onclick="setCustom('nameEffect', '${item.id}')">${item.name}</button>
        `).join('')}
      </div>
    </div>

    <div class="custom-group">
      <h4>Детали</h4>

      <label class="custom-switch">
        <span><b>Свечение карточек</b><small>Мягкая подсветка при наведении</small></span>
        <input type="checkbox" ${state.glow ? 'checked' : ''} onchange="setCustom('glow', this.checked)">
      </label>

      <label class="custom-switch">
        <span><b>Зеркальное стекло</b><small>Отражения и блики на блоках</small></span>
        <input type="checkbox" ${state.glass ? 'checked' : ''} onchange="setCustom('glass', this.checked)">
      </label>

      <label class="custom-switch">
        <span><b>Компактные карточки</b><small>Меньше отступы, больше на экране</small></span>
        <input type="checkbox" ${state.compact ? 'checked' : ''} onchange="setCustom('compact', this.checked)">
      </label>
    </div>

    <div class="custom-preview" style="background:${(CUSTOM_GRADIENTS.find(g => g.id === state.gradient) || CUSTOM_GRADIENTS[0]).css}">
      <div class="custom-preview-avatar">日本語</div>
      <div>
        <b class="custom-preview-name effect-${state.nameEffect}">Предпросмотр</b>
        <span>Так выглядит шапка профиля</span>
      </div>
    </div>

  `;
}

/** Сбрасывает оформление к стандартному. */
function resetCustom() {
  saveCustomState({
    gradient: 'graphite',
    accent: 'graphite',
    nameEffect: 'glow',
    glow: true,
    glass: true,
    compact: false
  });

  // Убираем свой акцент, чтобы вернулся цвет сайта из настроек
  document.documentElement.style.removeProperty('--accent-hue');
  document.documentElement.style.removeProperty('--accent-sat');
  document.documentElement.style.removeProperty('--accent-l');

  if (typeof applyAccentSettings === 'function') applyAccentSettings();
  applyProfileCustomization();
  renderCustomPanel();

  if (typeof showToast === 'function') showToast('Оформление сброшено', 'Вернулись к стандартному виду', 'info');
}

/* ---------- Био ---------- */

/** Био текущего пользователя или null. */
function getBio() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (!user) return null;

  return {
    text: String(user.bio || ''),
    city: String(user.city || ''),
    favorite: String(user.favorite || '')
  };
}

/** Сохраняет био в аккаунт. */
function saveBio(text, city, favorite) {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  if (!user) {
    if (typeof showToast === 'function') showToast('Нужен аккаунт', 'Войди, чтобы сохранить био', 'warning');
    return false;
  }

  if (typeof updateUserRecord !== 'function') return false;

  const cleanText = String(text || '').trim().slice(0, BIO_LIMIT);
  const firstTime = !user.bio && cleanText.length > 0;

  updateUserRecord(user.username, {
    bio: cleanText,
    city: String(city || '').trim().slice(0, 40),
    favorite: String(favorite || '').trim().slice(0, 60)
  });

  if (firstTime && typeof notifyAction === 'function') {
    notifyAction('bio', 1, { reason: 'Заполнено био' });
    if (typeof logActivity === 'function') logActivity('bio', 'Заполнено био профиля');
  }

  renderBio();
  closeBioEditor();

  if (typeof showToast === 'function') {
    showToast('Сохранено', firstTime ? 'Био добавлено · +10 XP' : 'Профиль обновлён', 'success');
  }

  return true;
}

/** Показывает био в профиле. */
function renderBio() {
  const box = document.getElementById('bioBlock');
  if (!box) return;

  const bio = getBio();
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isOwn = Boolean(user);

  if (!bio || (!bio.text && !bio.city && !bio.favorite)) {
    box.innerHTML = `
      <div class="bio-empty">
        <div class="bio-empty-icon">✎</div>
        <div>
          <b>Расскажи о себе</b>
          <span>Пара предложений — и профиль станет живым</span>
        </div>
        ${isOwn ? '<button class="btn btn-outline btn-small" onclick="openBioEditor()">Заполнить · +10 XP</button>' : ''}
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="bio-card">
      <div class="bio-top">
        <div class="bio-avatar-frame">
          ${typeof avatarMarkup === 'function'
            ? avatarMarkup(user ? user.username : 'Гость', { size: 54, photo: user ? user.avatar : '' })
            : ''}
        </div>
        <div class="bio-head">
          <b class="bio-name" data-username>${user ? user.username : 'Игрок'}</b>
          <span class="bio-sub">${bio.city ? '📍 ' + escapeBio(bio.city) : 'AniLingo'}</span>
          ${bio.favorite ? '<span class="bio-fav">🎌 ' + escapeBio(bio.favorite) + '</span>' : ''}
        </div>
        ${isOwn ? '<button class="btn btn-ghost btn-small" onclick="openBioEditor()">Изменить</button>' : ''}
      </div>

      ${bio.text ? '<p class="bio-text">' + escapeBio(bio.text) + '</p>' : ''}
    </div>
  `;
}

/** Экранирование HTML в био. */
function escapeBio(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Открывает редактор био. */
function openBioEditor() {
  const modal = document.getElementById('bioModal');
  if (!modal) return;

  const bio = getBio() || { text: '', city: '', favorite: '' };

  const textarea = document.getElementById('bioText');
  const cityInput = document.getElementById('bioCity');
  const favoriteInput = document.getElementById('bioFavorite');
  const counter = document.getElementById('bioCounter');

  if (textarea) textarea.value = bio.text;
  if (cityInput) cityInput.value = bio.city;
  if (favoriteInput) favoriteInput.value = bio.favorite;
  if (counter) counter.textContent = bio.text.length + ' / ' + BIO_LIMIT;

  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

/** Закрывает редактор. */
function closeBioEditor() {
  const modal = document.getElementById('bioModal');
  if (!modal) return;

  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

/** Счётчик символов в поле био. */
function onBioInput(input) {
  const counter = document.getElementById('bioCounter');
  if (!counter) return;

  const length = String(input.value || '').length;
  counter.textContent = length + ' / ' + BIO_LIMIT;
  counter.classList.toggle('is-over', length > BIO_LIMIT);
}

/** Сохранение из формы. */
function submitBio() {
  const textarea = document.getElementById('bioText');
  const cityInput = document.getElementById('bioCity');
  const favoriteInput = document.getElementById('bioFavorite');

  saveBio(
    textarea ? textarea.value : '',
    cityInput ? cityInput.value : '',
    favoriteInput ? favoriteInput.value : ''
  );
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  applyProfileCustomization();
  renderBio();

  const textarea = document.getElementById('bioText');
  if (textarea) textarea.addEventListener('input', () => onBioInput(textarea));

  const modal = document.getElementById('customModal');
  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeCustomPanel();
    });
  }

  const bioModal = document.getElementById('bioModal');
  if (bioModal) {
    bioModal.addEventListener('click', event => {
      if (event.target === bioModal) closeBioEditor();
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeCustomPanel();
    closeBioEditor();
  });
});

/* Экспорт в глобальную область */
window.CUSTOM_GRADIENTS = CUSTOM_GRADIENTS;
window.CUSTOM_ACCENTS = CUSTOM_ACCENTS;
window.getCustomState = getCustomState;
window.applyProfileCustomization = applyProfileCustomization;
window.openCustomPanel = openCustomPanel;
window.closeCustomPanel = closeCustomPanel;
window.setCustom = setCustom;
window.renderCustomPanel = renderCustomPanel;
window.resetCustom = resetCustom;
window.getBio = getBio;
window.saveBio = saveBio;
window.renderBio = renderBio;
window.openBioEditor = openBioEditor;
window.closeBioEditor = closeBioEditor;
window.submitBio = submitBio;
window.onBioInput = onBioInput;
