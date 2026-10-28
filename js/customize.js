/* ============================================================
   customize.js — «сделай сайт своим»
   Всё живёт только в localStorage, сервер не нужен:
   • свой фон из файла + затемнение и размытие;
   • цвет сайта: готовые палитры, любой свой цвет и радужный режим;
   • курсоры и палитры. Музыка живёт в player.js — там плейлист и плеер;
   • восемь аниме-курсоров, плюс кнопка «загрузить свой» (заглушка).
   ============================================================ */

'use strict';

// Ключи localStorage
const CUSTOM_BG_KEY = 'nihongo_custom_bg';        // data URL картинки
const CUSTOM_BG_DIM = 'nihongo_bg_dim';           // затемнение, 0–90
const CUSTOM_BG_BLUR = 'nihongo_bg_blur';         // размытие, 0–20 px
const CUSTOM_ACCENT_KEY = 'nihongo_accent';       // свой цвет, #rrggbb
const CUSTOM_PRESET_KEY = 'nihongo_accent_preset'; // id готовой палитры
const CUSTOM_RAINBOW_KEY = 'nihongo_accent_rainbow'; // радужный режим
const CUSTOM_CURSOR_KEY = 'nihongo_cursor';       // id курсора

// Ограничения: localStorage небольшой, поэтому файлы ужимаем
const BG_MAX_SIDE = 1920;
const BG_QUALITY = 0.82;

/* ---------- Готовые палитры ---------- */

/*
 * Готовые палитры. Три числа — оттенок, насыщенность и светлота —
 * и есть весь цвет сайта: из них считается каждый акцентный элемент.
 * Без них сайт графитовый: серый на чёрном, без жёлтого оттенка.
 */
const ACCENT_PRESETS = [
  { id: 'graphite', name: 'Графит', hue: 220, sat: 6,  light: 64 },
  { id: 'steel',    name: 'Сталь',  hue: 212, sat: 14, light: 60 },
  { id: 'sky',      name: 'Небо',   hue: 205, sat: 88, light: 62 },
  { id: 'mint',     name: 'Мята',   hue: 158, sat: 68, light: 56 },
  { id: 'violet',   name: 'Фиалка', hue: 268, sat: 78, light: 68 },
  { id: 'crimson',  name: 'Алый',   hue: 352, sat: 78, light: 64 },
  { id: 'sakura',   name: 'Сакура', hue: 340, sat: 88, light: 76 },
  { id: 'ice',      name: 'Лёд',    hue: 186, sat: 78, light: 66 }
];

/* ---------- Аниме-курсоры ---------- */

/**
 * Собирает SVG-курсор в data URL.
 * @param {string} body — внутренности svg 32×32
 * @param {number} hotX — точка нажатия по X
 * @param {number} hotY — точка нажатия по Y
 */
function animeCursor(body, hotX = 4, hotY = 4) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    body + '</svg>';

  return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + hotX + ' ' + hotY;
}

// Семь аниме-курсоров: каждый — маленькая картинка, нарисованная кодом
const ANIME_CURSORS = [
  {
    id: 'katana',
    name: 'Катана',
    css: animeCursor(
      '<path d="M4 26 L22 6" stroke="#e8eef7" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M22 6 L26 3" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M4 26 L8 28" stroke="#b23a48" stroke-width="4" stroke-linecap="round"/>'
    )
  },
  {
    id: 'sakura',
    name: 'Сакура',
    css: animeCursor(
      '<g fill="#ffb6cd"><ellipse cx="16" cy="8" rx="5" ry="7"/>' +
      '<ellipse cx="16" cy="24" rx="5" ry="7"/><ellipse cx="8" cy="16" rx="7" ry="5"/>' +
      '<ellipse cx="24" cy="16" rx="7" ry="5"/></g>' +
      '<circle cx="16" cy="16" r="3.4" fill="#ffd166"/>'
    , 16, 16)
  },
  {
    id: 'star',
    name: 'Звезда',
    css: animeCursor(
      '<path d="M16 2 L20 12 L30 13 L22 20 L24 30 L16 25 L8 30 L10 20 L2 13 L12 12 Z" ' +
      'fill="#ffd166" stroke="#b8860b" stroke-width="1.4" stroke-linejoin="round"/>'
    , 16, 16)
  },
  {
    id: 'shuriken',
    name: 'Сюрикэн',
    css: animeCursor(
      '<path d="M16 2 L20 12 L30 16 L20 20 L16 30 L12 20 L2 16 L12 12 Z" fill="#c9d6e8" ' +
      'stroke="#7b8a9e" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<circle cx="16" cy="16" r="2.6" fill="#1b2130"/>'
    , 16, 16)
  },
  {
    id: 'onigiri',
    name: 'Онигири',
    css: animeCursor(
      '<path d="M16 4 L29 26 H3 Z" fill="#f4f6f9" stroke="#c7ced8" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<rect x="11" y="17" width="10" height="9" rx="1.6" fill="#24313f"/>'
    , 16, 12)
  },
  {
    id: 'kitsune',
    name: 'Кицунэ',
    css: animeCursor(
      '<path d="M6 6 L12 14 L20 14 L26 6 L26 22 C26 26 22 29 16 29 C10 29 6 26 6 22 Z" ' +
      'fill="#ff9f43" stroke="#b25f10" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle cx="12" cy="20" r="1.8" fill="#241a12"/><circle cx="20" cy="20" r="1.8" fill="#241a12"/>' +
      '<path d="M14 24 L18 24 L16 26 Z" fill="#241a12"/>'
    , 16, 10)
  },
  {
    id: 'heart',
    name: 'Сердце',
    css: animeCursor(
      '<path d="M16 28 C4 20 2 13 6 8 C10 3 16 6 16 10 C16 6 22 3 26 8 C30 13 28 20 16 28 Z" ' +
      'fill="#ff5e7a" stroke="#b2263c" stroke-width="1.5"/>'
    , 16, 14)
  }
];

/** CSS-значение курсора по id. */
function cursorCss(id) {
  if (id === 'accent') return 'var(--cursor-accent, pointer)';
  if (id === 'default' || !id) return '';

  const found = ANIME_CURSORS.find(item => item.id === id);
  return found ? found.css : '';
}

/* ---------- Чтение и запись ---------- */

/** Безопасно читает строку из localStorage. */
function customGet(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

/** Безопасно пишет в localStorage, сообщая о нехватке места. */
function customSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (typeof showToast === 'function') {
      showToast('Не хватило места', 'Файл слишком большой для этого браузера — попробуй поменьше', 'error', { duration: 5200 });
    }
    return false;
  }
}

/* ---------- Свой фон ---------- */

/** Слой с пользовательским фоном (создаётся один раз). */
function customBgLayer() {
  let layer = document.querySelector('.bg-custom');

  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'bg-custom';
    layer.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(layer, document.body.firstChild);
  }

  return layer;
}

/** Применяет фон, затемнение и размытие. */
function applyCustomBackground() {
  const image = customGet(CUSTOM_BG_KEY, '');
  const dim = Math.min(90, Math.max(0, Number(customGet(CUSTOM_BG_DIM, 35)) || 0));
  const blur = Math.min(20, Math.max(0, Number(customGet(CUSTOM_BG_BLUR, 0)) || 0));

  document.documentElement.style.setProperty('--bg-dim', String(dim / 100));
  document.documentElement.style.setProperty('--bg-blur', blur + 'px');

  if (!image) {
    document.body.classList.remove('has-custom-bg');
    const layer = document.querySelector('.bg-custom');
    if (layer) {
      layer.style.backgroundImage = '';
    }
    return;
  }

  const layer = customBgLayer();
  layer.style.backgroundImage = 'url("' + image + '")';
  document.body.classList.add('has-custom-bg');
}

/**
 * Уменьшает картинку в canvas и отдаёт data URL.
 * Так фон не съедает всё место в localStorage.
 */
function shrinkImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error('Это не похоже на картинку'));

      img.onload = () => {
        try {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (error) {
          reject(error);
        }
      };

      img.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

/** Загружает свой фон из выбранного файла. */
async function pickCustomBackground(input) {
  const file = input && input.files && input.files[0];
  if (!file) return;

  if (!/^image\//.test(file.type)) {
    if (typeof showToast === 'function') showToast('Нужна картинка', 'Выбери JPG, PNG или WebP', 'error');
    input.value = '';
    return;
  }

  if (typeof showToast === 'function') showToast('Готовим фон', 'Ужимаем картинку, чтобы она поместилась в браузер', 'info', { duration: 2400 });

  try {
    const dataUrl = await shrinkImage(file, BG_MAX_SIDE, BG_QUALITY);

    // Старый фон убираем заранее — иначе места может не хватить
    try { localStorage.removeItem(CUSTOM_BG_KEY); } catch (error) { /* пусто */ }

    if (!customSet(CUSTOM_BG_KEY, dataUrl)) return;

    applyCustomBackground();
    renderCustomizationState();

    if (typeof showToast === 'function') showToast('Фон обновлён', 'Теперь страницу украшает твоя картинка', 'success', { icon: 'image' });
  } catch (error) {
    if (typeof showToast === 'function') showToast('Не получилось', error.message || 'Попробуй другую картинку', 'error');
  }

  input.value = '';
}

/** Убирает свой фон и возвращает стандартный. */
function clearCustomBackground() {
  try { localStorage.removeItem(CUSTOM_BG_KEY); } catch (error) { /* пусто */ }

  applyCustomBackground();
  renderCustomizationState();

  if (typeof showToast === 'function') showToast('Фон убран', 'Вернули стандартный фон сайта', 'info');
}

/** Меняет затемнение фона. */
function setBackgroundDim(value) {
  const dim = Math.min(90, Math.max(0, Number(value) || 0));
  customSet(CUSTOM_BG_DIM, String(dim));
  applyCustomBackground();
  updateCustomLabels();
}

/** Меняет размытие фона. */
function setBackgroundBlur(value) {
  const blur = Math.min(20, Math.max(0, Number(value) || 0));
  customSet(CUSTOM_BG_BLUR, String(blur));
  applyCustomBackground();
  updateCustomLabels();
}

/* ---------- Цвет сайта ---------- */

/** HEX → {h, s, l}. */
function hexToHsl(hex) {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean;

  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Применяет цвет сайта: оттенок, насыщенность, светлота.
 * Больше ничего менять не нужно — весь CSS считает цвета из этих трёх чисел.
 */
function applyAccentTone(hue, sat, light) {
  const root = document.documentElement;

  if (hue === null || hue === undefined) {
    root.style.removeProperty('--accent-hue');
    root.style.removeProperty('--accent-sat');
    root.style.removeProperty('--accent-l');
    document.body.classList.remove('accent-custom');
    return;
  }

  root.style.setProperty('--accent-hue', String(Math.round(hue)));
  root.style.setProperty('--accent-sat', Math.round(sat) + '%');
  root.style.setProperty('--accent-l', Math.round(light) + '%');
  document.body.classList.add('accent-custom');
}

/** Совместимость: раньше сюда приходил только оттенок. */
function applyAccent(hue, custom) {
  applyAccentTone(hue, hue === null ? 0 : 82, 64);

  if (custom) customSet(CUSTOM_ACCENT_KEY, custom);
}

/**
 * Цвет акцента строкой — для canvas и SVG, где CSS-переменные не работают.
 * @param {number} shift — сдвиг светлоты, %
 * @param {number} alpha — прозрачность 0…1
 */
function getAccentColor(shift = 0, alpha = 1) {
  // Сначала инлайновые значения на <html>, потом посчитанные браузером
  const inline = document.documentElement.style;
  const computed = getComputedStyle(document.body);
  const read = prop => (inline.getPropertyValue(prop) || computed.getPropertyValue(prop) || '').trim();

  const hue = read('--accent-hue') || '220';
  const sat = read('--accent-sat') || '6%';
  const base = parseFloat(read('--accent-l')) || 64;
  const light = Math.max(0, Math.min(100, base + shift));

  return alpha >= 1
    ? 'hsl(' + hue + ' ' + sat + ' ' + light + '%)'
    : 'hsla(' + hue + ', ' + sat + ', ' + light + '%, ' + alpha + ')';
}

/** Выбирает готовый цвет из палитры. */
function setAccentPreset(id, hue) {
  const preset = ACCENT_PRESETS.find(item => item.id === id);

  customSet(CUSTOM_RAINBOW_KEY, 'false');
  document.body.classList.remove('accent-rainbow');
  customSet(CUSTOM_ACCENT_KEY, '');
  customSet(CUSTOM_PRESET_KEY, id);

  applyAccentTone(
    preset ? preset.hue : hue,
    preset ? preset.sat : 82,
    preset ? preset.light : 64
  );

  renderCustomizationState();

  if (typeof showToast === 'function') {
    showToast('Цвет сайта', 'Палитра: ' + (preset ? preset.name : id), 'success', { duration: 1800 });
  }
}

/** Свой цвет через палитру браузера. */
function setAccentCustom(value) {
  const hsl = hexToHsl(value);

  customSet(CUSTOM_RAINBOW_KEY, 'false');
  document.body.classList.remove('accent-rainbow');
  customSet(CUSTOM_ACCENT_KEY, value);
  customSet(CUSTOM_PRESET_KEY, '');
  applyAccentTone(hsl.h, hsl.s, hsl.l);

  document.documentElement.style.setProperty('--accent-preview', value);
  renderCustomizationState();
}

/** Радужный режим: оттенок плавно меняется по кругу. */
function toggleRainbowAccent(input) {
  const on = input ? input.checked : customGet(CUSTOM_RAINBOW_KEY, 'false') !== 'true';

  customSet(CUSTOM_RAINBOW_KEY, on ? 'true' : 'false');
  document.body.classList.toggle('accent-rainbow', on);

  if (on) {
    document.body.classList.add('accent-custom');

    // Радуге нужна насыщенность: на графите переливание не видно
    const rootStyle = document.documentElement.style;
    if (!rootStyle.getPropertyValue('--accent-hue')) rootStyle.setProperty('--accent-hue', '340');
    rootStyle.setProperty('--accent-sat', '85%');
    rootStyle.setProperty('--accent-l', '66%');
  } else {
    applyAccentSettings();
  }

  if (typeof showToast === 'function') {
    showToast(on ? 'Радужный режим' : 'Радужный режим выключен',
      on ? 'Акцент переливается всеми цветами' : 'Вернули выбранный цвет',
      'info', { duration: 2200 });
  }
}

/** Применяет сохранённый цвет сайта на каждой странице. */
function applyAccentSettings() {
  // Тема из магазина важнее: она уже выставила свои три числа
  const shop = typeof getShopState === 'function' ? getShopState() : null;
  if (shop && shop.equipped && shop.equipped.theme) return;

  const rainbow = customGet(CUSTOM_RAINBOW_KEY, 'false') === 'true';
  const saved = customGet(CUSTOM_ACCENT_KEY, '');
  const presetId = customGet(CUSTOM_PRESET_KEY, '');

  document.body.classList.toggle('accent-rainbow', rainbow);

  // Свой цвет важнее готовой палитры
  if (saved) {
    const hsl = hexToHsl(saved);
    applyAccentTone(hsl.h, hsl.s, hsl.l);
    return;
  }

  if (presetId) {
    const preset = ACCENT_PRESETS.find(item => item.id === presetId);
    if (preset) {
      applyAccentTone(preset.hue, preset.sat, preset.light);
      return;
    }
  }

  if (rainbow) applyAccentTone(340, 88, 64);
}

/* ---------- Курсоры ---------- */

/** Применяет выбранный курсор. */
function applyCursorSetting(value, silent) {
  const id = value || 'default';
  customSet(CUSTOM_CURSOR_KEY, id);

  // Держим настройку интерфейса синхронной, если она доступна
  if (!silent && typeof setSettingValue === 'function') {
    setSettingValue('interface.cursor', id);
  }

  document.body.classList.remove('cursor-accent', 'cursor-anime');
  document.documentElement.style.removeProperty('--cursor-image');

  if (id === 'default') {
    renderCustomizationState();
    return;
  }

  if (id === 'accent') {
    document.body.classList.add('cursor-accent');
    renderCustomizationState();
    return;
  }

  const css = cursorCss(id);
  if (!css) return;

  document.documentElement.style.setProperty('--cursor-image', css);
  document.body.classList.add('cursor-anime');
  renderCustomizationState();
}

/** Заглушка загрузки своего курсора (сделаем позже). */
function uploadCustomCursor() {
  if (typeof showToast === 'function') {
    showToast('Скоро будет',
      'Загрузка своих курсоров появится в следующем обновлении. Пока выбери один из восьми',
      'info', { duration: 4200, icon: 'cursor' });
  }
}

/** Применяет сохранённый курсор при загрузке страницы. */
function applyCursorSettings() {
  // Настройка интерфейса главнее: она же видна в списке «Курсор»
  let saved = customGet(CUSTOM_CURSOR_KEY, 'default');

  if (typeof prefValue === 'function') {
    const fromSettings = String(prefValue('interface.cursor', ''));
    if (fromSettings) saved = fromSettings;
  }

  applyCursorSetting(saved, true);
}

/* ---------- Подписи и активные состояния в настройках ---------- */

/** Обновляет подписи, превью и активные кнопки. */
function updateCustomLabels() {
  const dimRange = document.getElementById('bgDimRange');
  const dimLabel = document.getElementById('bgDimValue');
  const blurRange = document.getElementById('bgBlurRange');
  const blurLabel = document.getElementById('bgBlurValue');

  if (dimRange && dimLabel) dimLabel.textContent = dimRange.value + '%';
  if (blurRange && blurLabel) blurLabel.textContent = blurRange.value + 'px';
}

/** Подсвечивает выбранные цвет и курсор. */
function renderCustomizationState() {
  const currentCursor = customGet(CUSTOM_CURSOR_KEY, 'default');
  document.querySelectorAll('[data-cursor-id]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.cursorId === currentCursor);
  });

  const currentAccent = customGet(CUSTOM_ACCENT_KEY, '');
  const currentPreset = customGet(CUSTOM_PRESET_KEY, '') || (currentAccent ? '' : 'graphite');
  const rainbow = customGet(CUSTOM_RAINBOW_KEY, 'false') === 'true';

  document.querySelectorAll('[data-accent-id]').forEach(btn => {
    btn.classList.toggle('is-active', !rainbow && btn.dataset.accentId === currentPreset);
  });

  const rainbowSwitch = document.getElementById('rainbowSwitch');
  if (rainbowSwitch) rainbowSwitch.checked = rainbow;

  const colorInput = document.getElementById('accentColorInput');
  if (colorInput && currentAccent) colorInput.value = currentAccent;

  const bgState = document.getElementById('customBgState');
  if (bgState) {
    bgState.textContent = customGet(CUSTOM_BG_KEY, '')
      ? 'Свой фон загружен'
      : 'Сейчас стандартный фон сайта';
  }

  // Кружки панели дизайна тоже должны знать, что цвет сменился
  renderPanelAccent();
  updateCustomLabels();
}

/* ---------- Старт ---------- */

/**
 * Кружки палитры в панели дизайна. Панель есть на каждой странице,
 * поэтому цвет сайта можно поменять где угодно, не уходя в настройки.
 */
function renderPanelAccent() {
  const box = document.getElementById('panelSwatches');
  if (!box) return;

  const saved = customGet(CUSTOM_ACCENT_KEY, '');
  const current = saved ? '' : (customGet(CUSTOM_PRESET_KEY, '') || 'graphite');

  box.innerHTML = ACCENT_PRESETS.map(item => `
    <button class="panel-swatch${item.id === current ? ' is-active' : ''}" type="button"
            data-panel-accent="${item.id}"
            style="--swatch-color:hsl(${item.hue} ${item.sat}% ${item.light}%)"
            title="${item.name}" aria-label="Цвет сайта: ${item.name}"
            onclick="setAccentPreset('${item.id}')"></button>
  `).join('');

  const input = document.getElementById('panelAccentColor');
  if (input && saved) input.value = saved;
}

/** Применяет всё, что сохранено в браузере. */
function applyCustomization() {
  applyCustomBackground();
  applyAccentSettings();
  applyCursorSettings();
  renderPanelAccent();
}

document.addEventListener('DOMContentLoaded', () => {
  applyCustomization();

  // Настройки могли поменять в другой вкладке
  window.addEventListener('storage', event => {
    if (!event.key) return;
    if (!/^nihongo_(custom_|accent|bg_|cursor)/.test(event.key)) return;

    applyCustomization();
    renderCustomizationState();
  });

});

/* Экспорт */
window.ANIME_CURSORS = ANIME_CURSORS;
window.ACCENT_PRESETS = ACCENT_PRESETS;
window.applyAccentTone = applyAccentTone;
window.renderPanelAccent = renderPanelAccent;
window.getAccentColor = getAccentColor;
window.applyCustomization = applyCustomization;
window.applyCustomBackground = applyCustomBackground;
window.applyAccentSettings = applyAccentSettings;
window.applyCursorSettings = applyCursorSettings;
window.pickCustomBackground = pickCustomBackground;
window.clearCustomBackground = clearCustomBackground;
window.setBackgroundDim = setBackgroundDim;
window.setBackgroundBlur = setBackgroundBlur;
window.setAccentPreset = setAccentPreset;
window.setAccentCustom = setAccentCustom;
window.toggleRainbowAccent = toggleRainbowAccent;
window.applyCursorSetting = applyCursorSetting;
window.uploadCustomCursor = uploadCustomCursor;
window.renderCustomizationState = renderCustomizationState;
