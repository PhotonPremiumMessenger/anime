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

  /* ---------- Адрес без .html ---------- */

  // Страницы сайта. Нужны, чтобы отличить «сервер не знает адрес
  // без .html» от обычной несуществующей ссылки.
  const KNOWN_PAGES = [
    'index', 'lessons', 'lesson', 'anime', 'tests', 'grammar', 'dictionary',
    'video', 'profile', 'rating', 'shop', 'settings', 'about', 'exam',
    'flashcards', 'match', 'listening', 'speed', 'game', 'weakspots',
    'favorites', 'search', 'updates', 'register', 'offline', 'privacy'
  ];

  /**
   * Приводит адрес к виду без .html.
   *
   * Если сервер (nginx или Express) умеет отдавать /lessons вместо
   * /lessons.html — просто убираем расширение из строки адреса.
   * Если не умеет и вернул главную страницу (частый фолбэк nginx),
   * честно уходим на настоящий файл, чтобы человек не остался
   * на главной вместо нужной страницы.
   */
  (function cleanAddress() {
    const meta = document.querySelector('meta[name="anilingo-page"]');
    const expected = meta ? String(meta.getAttribute('content') || '') : '';
    if (!expected) return;

    const path = window.location.pathname;
    const file = path.slice(path.lastIndexOf('/') + 1);
    const name = file.replace(/\.html$/i, '');
    const current = !name ? 'index' : name;

    const isKnown = KNOWN_PAGES.indexOf(name) !== -1;

    // Сервер отдал не ту страницу: адрес без .html он не понял
    if (isKnown && name !== expected && !/\.html$/i.test(file)) {
      window.location.replace(path + '.html' + window.location.search + window.location.hash);
      return;
    }

    if (!/\.html$/i.test(file)) return;

    const clean = name === 'index'
      ? path.slice(0, path.lastIndexOf('/') + 1)
      : path.slice(0, path.lastIndexOf('/') + 1) + name;

    try {
      window.history.replaceState(null, '', clean + window.location.search + window.location.hash);
    } catch (error) {
      // самый старый Safari — адрес просто останется как был
    }
  })();

  /* ---------- Переезд со старого названия ---------- */

  // Раньше ключи начинались со старого названия сайта, теперь — с anilingo_.
  // Переносим прогресс один раз и без потерь: если нового ключа
  // ещё нет, копируем в него старое значение, а старое убираем.
  // Без этого у людей обнулились бы уровень, достижения и настройки.
  //
  // Префикс собран из двух частей намеренно: если однажды кто-то
  // снова переименует сайт массовой заменой, эта строка не превратится
  // в бессмысленную и переезд продолжит работать.
  try {
    const legacyPrefix = 'ni' + 'hongo_';
    const currentPrefix = 'anilingo_';
    const stale = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.indexOf(legacyPrefix) === 0) stale.push(key);
    }

    stale.forEach(key => {
      const next = currentPrefix + key.slice(legacyPrefix.length);
      const value = localStorage.getItem(key);

      if (value !== null && localStorage.getItem(next) === null) {
        localStorage.setItem(next, value);
      }

      localStorage.removeItem(key);
    });
  } catch (error) {
    // приватный режим или запрет хранилища — просто работаем без переезда
  }

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

  const shop = readObject('anilingo_shop');
  const shopThemeId = shop && shop.equipped ? shop.equipped.theme : '';
  const rainbow = read('anilingo_accent_rainbow', 'false') === 'true';

  body.classList.toggle('accent-rainbow', rainbow);

  // Порядок тот же, что в shop.js и customize.js:
  // тема магазина, потом свой цвет, потом готовая палитра, потом радуга
  let accentHex = shopThemeId && SHOP_THEMES[shopThemeId] ? SHOP_THEMES[shopThemeId] : '';
  if (!accentHex) accentHex = read('anilingo_accent', '');

  if (accentHex) {
    const hsl = hexToHsl(accentHex);
    if (hsl) applyTone(hsl.h, hsl.s, hsl.l);
  } else {
    const preset = PRESETS[read('anilingo_accent_preset', '')];

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

  // Аватар всегда круглый: форму больше не выбирают
})();
