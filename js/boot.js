/* ============================================================
   boot.js — оформление ставится до первой отрисовки

   Подключается первым делом внутри <body>, то есть раньше,
   чем браузер успевает показать страницу.

   Зачем: раньше тему, цвет сайта и размер шрифта применял
   design.js на DOMContentLoaded. Страница уже была на экране,
   поэтому при переходе между страницами было видно, как она
   сначала рисуется в стандартных цветах и только потом
   перекрашивается в выбранные.

   Здесь только чтение localStorage и классы на <body>:
   ни сети, ни ожидания события. Всё остальное — сакура,
   плеер, счётчики, свои обои — по-прежнему делают
   design.js, customize.js и player.js.

   Таблицы палитр и тем магазина скопированы из customize.js
   и shop.js намеренно: этот файл грузится раньше них. Совпадают
   ли копии, проверяет тест, поэтому рассинхрон не пройдёт молча.
   ============================================================ */

'use strict';

(function () {
  const root = document.documentElement;
  const body = document.body;

  if (!body) return;

  /** Строка из localStorage; undefined при запрете хранилища. */
  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  /** Объект из localStorage: битый JSON не должен ломать страницу. */
  function readObject(key) {
    try {
      const value = localStorage.getItem(key);
      const parsed = value ? JSON.parse(value) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  const settings = readObject('settings');

  /* ---------- Тема ---------- */

  // Настройки важнее отдельного ключа theme — так же, как в design.js
  const theme = settings['interface.theme'] || read('theme', 'default');

  body.classList.toggle('theme-sakura', theme === 'sakura');
  body.classList.toggle('theme-light', theme === 'light');

  /* ---------- Цвет сайта ---------- */

  // Копия ACCENT_PRESETS из customize.js: id → [оттенок, насыщенность, светлота]
  const PRESETS = {
    graphite: [220, 6, 64],
    steel: [212, 14, 60],
    sky: [205, 88, 62],
    mint: [158, 68, 56],
    violet: [268, 78, 68],
    crimson: [352, 78, 64],
    sakura: [340, 88, 76],
    ice: [186, 78, 66]
  };

  // Копия тем магазина из shop.js: id → цвет акцента
  const SHOP_THEMES = {
    'theme-sakura-plus': '#FF9EC0',
    'theme-midnight': '#7DB7FF',
    'theme-neon': '#5EEAD4',
    'theme-gold': '#FFD166'
  };

  /** #RRGGBB → оттенок, насыщенность и светлота (как в customize.js). */
  function hexToHsl(hex) {
    const clean = String(hex || '').replace('#', '').trim();
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean)) return null;

    const full = clean.length === 3
      ? clean.split('').map(ch => ch + ch).join('')
      : clean;

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

    return { h: h, s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  /** Ставит три числа, из которых CSS считает всю палитру сайта. */
  function applyTone(hue, sat, light) {
    root.style.setProperty('--accent-hue', String(Math.round(hue)));
    root.style.setProperty('--accent-sat', Math.round(sat) + '%');
    root.style.setProperty('--accent-l', Math.round(light) + '%');
    body.classList.add('accent-custom');
  }

  const shop = readObject('nihongo_shop');
  const shopThemeId = shop && shop.equipped ? shop.equipped.theme : '';
  const rainbow = read('nihongo_accent_rainbow', 'false') === 'true';

  body.classList.toggle('accent-rainbow', rainbow);

  // Порядок тот же, что в shop.js и customize.js:
  // тема магазина, потом свой цвет, потом готовая палитра, потом радуга
  let accentHex = shopThemeId && SHOP_THEMES[shopThemeId] ? SHOP_THEMES[shopThemeId] : '';
  if (!accentHex) accentHex = read('nihongo_accent', '');

  if (accentHex) {
    const hsl = hexToHsl(accentHex);
    if (hsl) applyTone(hsl.h, hsl.s, hsl.l);
  } else {
    const preset = PRESETS[read('nihongo_accent_preset', '')];

    if (preset) applyTone(preset[0], preset[1], preset[2]);
    else if (rainbow) applyTone(340, 88, 64);
  }

  /* ---------- Остальное оформление ---------- */

  // Город, ровный фон или ворота
  const background = settings['interface.background'] || 'city';
  if (background === 'plain') body.classList.add('bg-plain');
  else if (background === 'torii') body.classList.add('bg-torii');

  body.classList.toggle('cursor-accent', settings['interface.cursor'] === 'accent');
  body.classList.toggle('no-anim', settings['interface.animations'] === false);
  body.classList.toggle('compact', Boolean(settings['interface.compact']));

  // Все размеры в стилях заданы в rem, поэтому меняем базу у <html>:
  // текст масштабируется на весь сайт, а не только в одном блоке
  let fontSize = Number(settings['interface.fontSize']);
  if (!(fontSize >= 13 && fontSize <= 19)) fontSize = 15;

  root.style.fontSize = Math.round(fontSize) + 'px';
  root.dataset.fontSize = String(Math.round(fontSize));

  // Форма аватаров
  const avatarStyle = settings['features.avatarStyle'];
  const avatar = ['circle', 'rounded', 'square'].includes(avatarStyle) ? avatarStyle : 'circle';
  body.classList.add('avatar-' + avatar);
})();
