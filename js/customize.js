/* ============================================================
   customize.js — «сделай сайт своим»
   Всё живёт только в браузере, сервер не нужен:
   • свой фон из файла (картинка или видео) + затемнение и размытие;
   • цвет сайта: готовые палитры, любой свой цвет и радужный режим.
   Музыка живёт в player.js — там плейлист и плеер.
   Курсоры удалены: на сайте обычный указатель.
   ============================================================ */

'use strict';

// Ключи localStorage
const CUSTOM_BG_KEY = 'anilingo_custom_bg';        // data URL картинки
const CUSTOM_BG_KIND = 'anilingo_custom_bg_kind';  // 'image' | 'video'
const CUSTOM_BG_DIM = 'anilingo_bg_dim';           // затемнение, 0–90
const CUSTOM_BG_BLUR = 'anilingo_bg_blur';         // размытие, 0–20 px

// Видео в localStorage не помещается (там всего ~5 МБ), поэтому
// ролик лежит в IndexedDB — это тоже память браузера, сервер не нужен.
const BG_DB_NAME = 'anilingo_bg';
const BG_DB_STORE = 'bg';
const BG_VIDEO_KEY = 'video';
const CUSTOM_ACCENT_KEY = 'anilingo_accent';       // свой цвет, #rrggbb
const CUSTOM_PRESET_KEY = 'anilingo_accent_preset'; // id готовой палитры
const CUSTOM_RAINBOW_KEY = 'anilingo_accent_rainbow'; // радужный режим

// Ограничения: localStorage небольшой, поэтому картинки ужимаем
const BG_MAX_SIDE = 1920;
const BG_QUALITY = 0.82;
const BG_IMAGE_LIMIT = 5 * 1024 * 1024;  // 5 МБ на картинку
const BG_VIDEO_LIMIT = 10 * 1024 * 1024; // 10 МБ на видео

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

/* ---------- Видео-фон в IndexedDB ---------- */

/** Открывает базу браузера для видео-фона. */
function bgDbOpen() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Браузер не умеет хранить видео'));
      return;
    }

    const request = indexedDB.open(BG_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BG_DB_STORE)) db.createObjectStore(BG_DB_STORE);
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Не открылась память браузера'));
  });
}

/** Кладёт файл видео в IndexedDB. */
async function bgSaveVideo(file) {
  const db = await bgDbOpen();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(BG_DB_STORE, 'readwrite');
    tx.objectStore(BG_DB_STORE).put(file, BG_VIDEO_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Видео не сохранилось'));
  });

  db.close();
}

/** Достаёт файл видео из IndexedDB (или null). */
async function bgLoadVideo() {
  try {
    const db = await bgDbOpen();

    const file = await new Promise((resolve, reject) => {
      const tx = db.transaction(BG_DB_STORE, 'readonly');
      const request = tx.objectStore(BG_DB_STORE).get(BG_VIDEO_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return file;
  } catch (error) {
    return null;
  }
}

/** Удаляет видео-фон из IndexedDB. */
async function bgRemoveVideo() {
  try {
    const db = await bgDbOpen();

    await new Promise(resolve => {
      const tx = db.transaction(BG_DB_STORE, 'readwrite');
      tx.objectStore(BG_DB_STORE).delete(BG_VIDEO_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });

    db.close();
  } catch (error) {
    // нет базы — и удалять нечего
  }
}

// Ссылка на текущий ролик: старую отзываем, чтобы не текла память
let customBgVideoUrl = '';

/** Убирает <video> из слоя фона. */
function removeBgVideoElement() {
  const layer = document.querySelector('.bg-custom');
  if (!layer) return;

  const video = layer.querySelector('video');
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
  }

  if (customBgVideoUrl) {
    URL.revokeObjectURL(customBgVideoUrl);
    customBgVideoUrl = '';
  }
}

/** Показывает ролик в слое фона. */
async function paintBgVideo() {
  const layer = customBgLayer();
  const file = await bgLoadVideo();

  if (!file) {
    customSet(CUSTOM_BG_KIND, 'image');
    applyCustomBackground();
    return;
  }

  removeBgVideoElement();
  layer.style.backgroundImage = '';
  layer.classList.add('is-video');

  customBgVideoUrl = URL.createObjectURL(file);

  const video = document.createElement('video');
  video.className = 'bg-custom-video';
  video.src = customBgVideoUrl;
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.preload = 'auto';

  layer.appendChild(video);

  // Автозапуск может не сработать до первого касания — не страшно,
  // картинка всё равно уже на экране
  const play = video.play();
  if (play && typeof play.catch === 'function') play.catch(() => {});

  document.body.classList.add('has-custom-bg');
}

/** Применяет фон, затемнение и размытие. */
function applyCustomBackground() {
  const image = customGet(CUSTOM_BG_KEY, '');
  const kind = customGet(CUSTOM_BG_KIND, 'image');
  const dim = Math.min(90, Math.max(0, Number(customGet(CUSTOM_BG_DIM, 35)) || 0));
  const blur = Math.min(20, Math.max(0, Number(customGet(CUSTOM_BG_BLUR, 0)) || 0));

  document.documentElement.style.setProperty('--bg-dim', String(dim / 100));
  document.documentElement.style.setProperty('--bg-blur', blur + 'px');

  const layer = document.querySelector('.bg-custom');

  // Видео: картинки в localStorage нет, ролик лежит в IndexedDB
  if (kind === 'video') {
    paintBgVideo();
    return;
  }

  removeBgVideoElement();
  if (layer) layer.classList.remove('is-video');

  if (!image) {
    document.body.classList.remove('has-custom-bg');
    if (layer) layer.style.backgroundImage = '';
    return;
  }

  const target = customBgLayer();
  target.style.backgroundImage = 'url("' + image + '")';
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

/**
 * Загружает свой фон: картинку (до 5 МБ) или видео (до 10 МБ).
 * Картинка ужимается и уходит в localStorage, ролик — в IndexedDB.
 * Всё остаётся в браузере, на сервер ничего не отправляется.
 */
async function pickCustomBackground(input) {
  const file = input && input.files && input.files[0];
  if (!file) return;

  const isVideo = /^video\//.test(file.type);
  const isImage = /^image\//.test(file.type);

  if (!isVideo && !isImage) {
    if (typeof showToast === 'function') {
      showToast('Нужна картинка или видео', 'Подойдут JPG, PNG, WebP, MP4 и WebM', 'error');
    }
    input.value = '';
    return;
  }

  // Лимиты: фото до 5 МБ, видео до 10 МБ
  const limit = isVideo ? BG_VIDEO_LIMIT : BG_IMAGE_LIMIT;
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    if (typeof showToast === 'function') {
      showToast(
        'Файл слишком большой',
        (isVideo ? 'Видео' : 'Картинка') + ' до ' + mb + ' МБ. Ваш файл — ' +
          (file.size / (1024 * 1024)).toFixed(1) + ' МБ',
        'error',
        { duration: 5600 }
      );
    }
    input.value = '';
    return;
  }

  try {
    if (isVideo) {
      if (typeof showToast === 'function') {
        showToast('Готовим видео-фон', 'Ролик сохраняется в этом браузере', 'info', { duration: 2200 });
      }

      await bgSaveVideo(file);
      customSet(CUSTOM_BG_KIND, 'video');

      // Картинка больше не нужна — освобождаем место
      try { localStorage.removeItem(CUSTOM_BG_KEY); } catch (error) { /* пусто */ }

      await paintBgVideo();
      renderCustomizationState();

      if (typeof showToast === 'function') showToast('Видео-фон включён', 'Ролик крутится на фоне всех страниц', 'success', { icon: 'image' });
      input.value = '';
      return;
    }

    if (typeof showToast === 'function') showToast('Готовим фон', 'Ужимаем картинку, чтобы она поместилась в браузер', 'info', { duration: 2400 });

    const dataUrl = await shrinkImage(file, BG_MAX_SIDE, BG_QUALITY);

    // Старый фон убираем заранее — иначе места может не хватить
    try { localStorage.removeItem(CUSTOM_BG_KEY); } catch (error) { /* пусто */ }

    if (!customSet(CUSTOM_BG_KEY, dataUrl)) return;

    customSet(CUSTOM_BG_KIND, 'image');
    await bgRemoveVideo();

    applyCustomBackground();
    renderCustomizationState();

    if (typeof showToast === 'function') showToast('Фон обновлён', 'Теперь страницу украшает твоя картинка', 'success', { icon: 'image' });
  } catch (error) {
    if (typeof showToast === 'function') showToast('Не получилось', error.message || 'Попробуй другой файл', 'error');
  }

  input.value = '';
}

/** Убирает свой фон и возвращает стандартный. */
function clearCustomBackground() {
  try { localStorage.removeItem(CUSTOM_BG_KEY); } catch (error) { /* пусто */ }
  try { localStorage.removeItem(CUSTOM_BG_KIND); } catch (error) { /* пусто */ }

  removeBgVideoElement();
  bgRemoveVideo();

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

/* ---------- Курсоры удалены ---------- */

/*
  Раньше здесь можно было выбрать аниме-курсор или загрузить свой.
  Курсоры мешали читать текст и ломали наведение, поэтому выбор
  курсора убран целиком: на сайте обычный указатель.
*/

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

/** Подсвечивает выбранный цвет сайта. */
function renderCustomizationState() {
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
    const image = customGet(CUSTOM_BG_KEY, '');
    const kind = customGet(CUSTOM_BG_KIND, 'image');

    if (kind === 'video') bgState.textContent = 'Своё видео на фоне';
    else if (image) bgState.textContent = 'Своя картинка на фоне';
    else bgState.textContent = 'Сейчас стандартный фон сайта';
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
  renderPanelAccent();
}

document.addEventListener('DOMContentLoaded', () => {
  applyCustomization();

  // Настройки могли поменять в другой вкладке
  window.addEventListener('storage', event => {
    if (!event.key) return;
    if (!/^anilingo_(custom_|accent|bg_|cursor)/.test(event.key)) return;

    applyCustomization();
    renderCustomizationState();
  });

});

/* Экспорт */
window.ACCENT_PRESETS = ACCENT_PRESETS;
window.applyAccentTone = applyAccentTone;
window.renderPanelAccent = renderPanelAccent;
window.getAccentColor = getAccentColor;
window.applyCustomization = applyCustomization;
window.applyCustomBackground = applyCustomBackground;
window.applyAccentSettings = applyAccentSettings;
window.pickCustomBackground = pickCustomBackground;
window.clearCustomBackground = clearCustomBackground;
window.setBackgroundDim = setBackgroundDim;
window.setBackgroundBlur = setBackgroundBlur;
window.setAccentPreset = setAccentPreset;
window.setAccentCustom = setAccentCustom;
window.toggleRainbowAccent = toggleRainbowAccent;
window.renderCustomizationState = renderCustomizationState;
