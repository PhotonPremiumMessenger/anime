/* ============================================================
   design.js — панель дизайна, темы, сакура и таймер релиза
   Подключается на всех страницах, потому что шапка общая.
   ============================================================ */

'use strict';

const THEME_KEY = 'theme';
const SAKURA_KEY = 'sakuraOn';
const RELEASE_KEY = 'releaseDate';

/* ---------- Панель дизайна ---------- */

/**
 * Открывает или закрывает выпадающую панель «Дизайн».
 */
function toggleDesignPanel() {
  const panel = document.getElementById('designPanel');
  const button = document.getElementById('designToggle');
  if (!panel) return;

  const isOpen = panel.classList.toggle('open');

  if (button) {
    button.classList.toggle('open', isOpen);
    button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  // Пока панель открыта, клики вне её закрывают
  if (isOpen) {
    setTimeout(() => document.addEventListener('click', closeDesignOnOutsideClick), 0);
  } else {
    document.removeEventListener('click', closeDesignOnOutsideClick);
  }
}

/** Закрывает панель при клике мимо неё. */
function closeDesignOnOutsideClick(event) {
  const panel = document.getElementById('designPanel');

  if (panel && !panel.contains(event.target) && !event.target.closest('#designToggle')) {
    toggleDesignPanel();
  }
}

/** Закрывает панель принудительно. */
function closeDesignPanel() {
  const panel = document.getElementById('designPanel');
  if (panel && panel.classList.contains('open')) toggleDesignPanel();
}

/* ---------- Темы ---------- */

/**
 * Переключает тему сайта.
 * @param {string} theme — 'default', 'sakura' или 'light'
 * @param {boolean} notify — показывать ли toast
 * @param {object} options — { source: 'user' | 'auto' | 'restore' }
 *
 * Ручной выбор важнее любого авто-режима: если человек сам поставил
 * тему, «тема по времени суток» отключается, иначе она перебивала
 * выбор при каждом переходе на другую страницу.
 */
function setTheme(theme, notify = true, options = {}) {
  // Три допустимые темы: default (тёмная), sakura (розовая), light (светлая)
  const themeName = ['sakura', 'light'].includes(theme) ? theme : 'default';
  const source = options.source || 'user';

  document.body.classList.toggle('theme-sakura', themeName === 'sakura');
  document.body.classList.toggle('theme-light', themeName === 'light');
  localStorage.setItem(THEME_KEY, themeName);

  // Ручной выбор выключает авто-режим, чтобы тема не прыгала сама
  if (source === 'user' && typeof isAutoThemeOn === 'function' && isAutoThemeOn()) {
    try {
      localStorage.setItem('nihongo_autotheme', 'false');
      if (typeof renderAutoThemeSwitch === 'function') renderAutoThemeSwitch();
    } catch (error) {
      /* приватный режим — не страшно */
    }
  }

  // Держим настройки интерфейса и панель дизайна синхронными,
  // иначе после перезагрузки тема из настроек перекроет выбор в панели
  const settings = readSettingsSafe();
  if (settings['interface.theme'] !== themeName) {
    settings['interface.theme'] = themeName;
    localStorage.setItem('settings', JSON.stringify(settings));
  }

  // Обновляем превью в панели дизайна
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.toggle('active', card.dataset.theme === themeName);
  });

  // Синхронизируем переключатель «Светлая тема» в настройках
  const lightSwitch = document.getElementById('lightThemeSwitch');
  if (lightSwitch) lightSwitch.checked = themeName === 'light';

  if (notify && typeof showToast === 'function') {
    const messages = {
      default: 'Включена стандартная тема',
      sakura: 'Включена тема «Сакура»',
      light: 'Включена светлая тема'
    };

    showToast('Тема изменена', messages[themeName], 'success');
  }
}

/** Переключатель «Светлая тема» в настройках. */
function toggleLightTheme(checkbox) {
  setTheme(checkbox.checked ? 'light' : 'default');
}

/* ---------- Сакура ---------- */

/**
 * Запускает падающие лепестки.
 * Количество зависит от настройки «уровень сакуры».
 */
function startSakura() {
  // Берём уровень из настроек: 0–100, по умолчанию 40
  const level = Number(getSettingValueSafe('features.sakuraLevel', 40));
  let count = Math.max(6, Math.round((level / 100) * 40));

  // На слабых устройствах и телефонах оставляем меньше лепестков:
  // 40 анимированных слоёв с 3D-поворотом — заметная нагрузка на GPU
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lite = document.documentElement.classList.contains('perf-lite');

  if (reduced) count = 6;
  else if (lite) count = Math.max(5, Math.round(count * 0.4));
  else if (window.innerWidth <= 760) count = Math.max(6, Math.round(count * 0.5));
  else if ((navigator.hardwareConcurrency || 8) <= 4) count = Math.max(6, Math.round(count * 0.6));

  // Уже нарисовано столько же лепестков — не пересобираем слой.
  // Раньше каждое изменение настроек создавало 40 новых анимированных
  // узлов, и страница заметно тормозила.
  const existing = document.querySelector('.sakura-layer');
  if (existing && existing.childElementCount === count) {
    localStorage.setItem(SAKURA_KEY, 'on');
    syncSakuraSwitch(true);
    return;
  }

  stopSakura(true);

  let layer = document.querySelector('.sakura-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'sakura-layer';
    document.body.appendChild(layer);
  }

  for (let i = 0; i < count; i++) {
    const petal = document.createElement('span');
    petal.className = 'petal';

    // Размер, скорость и позиция — случайные, чтобы не было «строя»
    const size = 8 + Math.random() * 8;
    const duration = 9 + Math.random() * 9;
    const delay = -Math.random() * duration;

    petal.style.left = Math.random() * 100 + 'vw';
    petal.style.width = size + 'px';
    petal.style.height = size * 1.1 + 'px';
    petal.style.animationDuration = duration + 's';
    petal.style.animationDelay = delay + 's';
    petal.style.opacity = (0.5 + Math.random() * 0.5).toFixed(2);

    layer.appendChild(petal);
  }

  localStorage.setItem(SAKURA_KEY, 'on');
  syncSakuraSwitch(true);
}

/**
 * Останавливает лепестки и убирает слой.
 * @param {boolean} keepState — не менять сохранённое состояние (для перезапуска)
 */
function stopSakura(keepState = false) {
  const layer = document.querySelector('.sakura-layer');
  if (layer) layer.remove();

  if (!keepState) {
    localStorage.setItem(SAKURA_KEY, 'off');
    syncSakuraSwitch(false);
  }
}

/** Синхронизирует переключатель в панели дизайна. */
function syncSakuraSwitch(isOn) {
  const input = document.getElementById('sakuraSwitch');
  if (input) input.checked = isOn;
}

/** Включает/выключает сакуру по переключателю. */
function toggleSakura(checkbox) {
  if (checkbox.checked) {
    startSakura();
  } else {
    stopSakura();
  }
}

/** Меняет количество лепестков на лету. */
function setSakuraLevel(level) {
  const value = Math.max(0, Math.min(100, Number(level) || 0));
  localStorage.setItem('sakuraLevel', String(value));

  const settings = readSettingsSafe();
  settings['features.sakuraLevel'] = value;
  localStorage.setItem('settings', JSON.stringify(settings));

  if (value === 0) {
    stopSakura();
    return;
  }

  if (localStorage.getItem(SAKURA_KEY) === 'on') startSakura();
}

/**
 * Ставит базовый размер текста на <html>.
 * В css/style.css все размеры шрифтов переведены в rem, поэтому
 * одно значение меняет текст на всех страницах и во всех блоках.
 * @param {number} size — 13…19 px
 */
function applyBaseFontSize(size) {
  const value = size >= 13 && size <= 19 ? Math.round(size) : 15;
  document.documentElement.style.fontSize = value + 'px';
  document.documentElement.dataset.fontSize = String(value);

  // Старое значение на body могло остаться от прошлых версий
  document.body.style.fontSize = '';
}

/** Безопасное чтение настройки (settings.js грузится не на всех страницах). */
function getSettingValueSafe(key, fallback) {
  try {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}') || {};
    return Object.prototype.hasOwnProperty.call(settings, key) ? settings[key] : fallback;
  } catch (e) {
    return fallback;
  }
}

/** Безопасное чтение всего объекта настроек. */
function readSettingsSafe() {
  try {
    return JSON.parse(localStorage.getItem('settings') || '{}') || {};
  } catch (e) {
    return {};
  }
}

/* ---------- Применение сохранённых настроек ---------- */

/**
 * Применяет к странице всё, что пользователь выбрал в настройках:
 * тему, фон, шрифт, анимации, компактный режим, форму аватара.
 * Вызывается при загрузке и после сохранения настроек.
 */
function applyStoredSettings() {
  const settings = readSettingsSafe();

  // Тема: настройки важнее отдельного ключа
  const theme = settings['interface.theme'] || localStorage.getItem(THEME_KEY) || 'default';
  setTheme(theme, false, { source: 'restore' });

  // Фон
  const background = settings['interface.background'] || 'city';
  document.body.classList.remove('bg-plain', 'bg-torii');
  if (background === 'plain') document.body.classList.add('bg-plain');
  if (background === 'torii') document.body.classList.add('bg-torii');

  // Курсор
  document.body.classList.toggle('cursor-accent', settings['interface.cursor'] === 'accent');

  // Анимации
  const animations = settings['interface.animations'] !== false;
  document.body.classList.toggle('no-anim', !animations);

  // Компактный режим
  document.body.classList.toggle('compact', Boolean(settings['interface.compact']));

  // Размер шрифта: все размеры в стилях заданы в rem,
  // поэтому меняем базу у html — текст растёт по всему сайту
  applyBaseFontSize(Number(settings['interface.fontSize'] || 15));

  // Форма аватара
  const avatarStyle = settings['features.avatarStyle'] || 'circle';
  document.body.classList.remove('avatar-circle', 'avatar-rounded', 'avatar-square');
  document.body.classList.add('avatar-' + avatarStyle);

  // Сакура
  const sakuraLevel = Number(settings['features.sakuraLevel'] ?? 40);
  if (localStorage.getItem(SAKURA_KEY) === 'on' && sakuraLevel > 0) {
    startSakura();
  } else {
    syncSakuraSwitch(false);
  }
}

/* ---------- Таймер до релиза ---------- */

// Сколько всего дней растёт платформа (пункт 1: было «60 месяцев», стало 250 дней)
const RELEASE_DAYS = 250;

// Ключ схемы: если он изменился — отсчёт начинается заново
const RELEASE_SCHEMA = 'nihongo_release_start_v2';

/**
 * Дата старта отсчёта. Хранится в localStorage, поэтому при перезагрузке
 * и переходах между страницами ничего не обнуляется.
 * Старый ключ releaseDate больше не используется — счёт идёт от старта.
 */
function getReleaseStart() {
  let saved = Number(localStorage.getItem(RELEASE_SCHEMA));

  if (!Number.isFinite(saved) || saved <= 0) {
    saved = Date.now();
    try {
      localStorage.setItem(RELEASE_SCHEMA, String(saved));
      // Чистим устаревшую дату «через 6 месяцев»
      localStorage.removeItem(RELEASE_KEY);
    } catch (error) {
      /* приватный режим — считаем от текущей сессии */
    }
  }

  return saved;
}

/** Дата открытия платформы: старт + 250 дней. */
function getReleaseDate() {
  return new Date(getReleaseStart() + RELEASE_DAYS * 86400000);
}

/**
 * Сколько платформа уже растёт.
 * @returns {{passed:number, left:number, percent:number, ms:number, total:number}}
 */
function getReleaseProgress() {
  const start = getReleaseStart();
  const total = RELEASE_DAYS * 86400000;
  const passedMs = Math.max(0, Date.now() - start);
  const leftMs = Math.max(0, total - passedMs);

  return {
    total: RELEASE_DAYS,
    ms: leftMs,
    passed: Math.floor(passedMs / 86400000),
    left: Math.ceil(leftMs / 86400000),
    percent: Math.min(100, Math.max(0, (passedMs / total) * 100))
  };
}

/**
 * Запускает обратный отсчёт до открытия и двигает полосу готовности.
 * Полоса растёт сама: её ширина — это доля прошедшего времени,
 * поэтому она обновляется и без перезагрузки страницы.
 */
function startReleaseTimer() {
  const daysEl = document.getElementById('timerDays');
  if (!daysEl) return; // таймера на этой странице нет

  const hoursEl = document.getElementById('timerHours');
  const minutesEl = document.getElementById('timerMinutes');
  const secondsEl = document.getElementById('timerSeconds');
  const barEl = document.getElementById('devProgress');
  const percentEl = document.getElementById('devPercent');
  const passedEl = document.getElementById('devPassed');
  const totalEl = document.getElementById('devTotal');

  const releaseDate = getReleaseDate().getTime();

  // Двузначные числа: 7 → 07
  const pad = value => String(value).padStart(2, '0');

  function updateProgress() {
    const progress = getReleaseProgress();

    if (barEl) barEl.style.width = progress.percent.toFixed(2) + '%';
    if (percentEl) percentEl.textContent = Math.floor(progress.percent) + '%';
    if (passedEl) passedEl.textContent = String(progress.passed);
    if (totalEl) totalEl.textContent = String(progress.total);

    // Подпись у полосы: сколько дней уже прошло
    const note = document.getElementById('devNote');
    if (note) {
      note.textContent = progress.left > 0
        ? 'Прошло ' + progress.passed + ' из ' + progress.total + ' дней · осталось ' + progress.left
        : 'Отсчёт закончен — платформа открыта';
    }
  }

  function update() {
    const diff = releaseDate - Date.now();

    // Время вышло — показываем нули и открытую платформу
    if (diff <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minutesEl) minutesEl.textContent = '00';
      if (secondsEl) secondsEl.textContent = '00';
      updateProgress();
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minutesEl) minutesEl.textContent = pad(minutes);
    if (secondsEl) secondsEl.textContent = pad(seconds);

    updateProgress();
  }

  update();

  // Секундный тик нужен только на видимой вкладке и когда таймер
  // действительно виден: лишние перерисовки грели процессор
  let timerId = null;

  function loop() {
    if (!document.hidden) update();
  }

  timerId = setInterval(loop, 1000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    update();
  });

  // Таймер ушёл из вида — обновляем реже
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      clearInterval(timerId);

      timerId = visible
        ? setInterval(loop, 1000)
        : setInterval(loop, 30000);
    }, { threshold: 0 });

    observer.observe(daysEl);
  }
}

/* ---------- Плавное появление блоков ---------- */

// Один наблюдатель на всю страницу: к нему добавляются и блоки,
// которые появились позже (карточки уроков, публичный профиль и т.п.)
let revealObserver = null;

/** Показывает блоки, которые ещё не попали в зону видимости. */
function observeReveals(root) {
  const scope = root || document;
  const items = scope.querySelectorAll('.reveal:not(.visible):not([data-reveal-watched])');

  if (!items.length) return;

  // Если браузер не умеет IntersectionObserver — просто показываем всё
  if (!('IntersectionObserver' in window) || !revealObserver) {
    items.forEach(item => item.classList.add('visible'));
    return;
  }

  items.forEach(item => {
    item.setAttribute('data-reveal-watched', '1');
    revealObserver.observe(item);
  });
}

/** Подсвечивает блоки .reveal, когда они попадают в экран. */
function initReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(item => item.classList.add('visible'));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add('visible');

        // Если блок так и не проявился за 1.2 с (например, анимация отключена
        // или элемент вне зоны), показываем принудительно — пустых блоков быть не должно
        setTimeout(() => entry.target.classList.add('visible'), 1200);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  }

  observeReveals(document);

  // Новые блоки приходят после отрисовки скриптов — подхватываем их
  [400, 1000, 2000, 3500].forEach(delay => {
    setTimeout(() => observeReveals(document), delay);
  });

  // И по событию от модулей, которые рисуют контент сами
  document.addEventListener('content-rendered', event => {
    observeReveals(event.detail && event.detail.root ? event.detail.root : document);
  });

  // Страховка: через 4 секунды в зоне видимости не должно быть невидимых блоков
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.visible)').forEach(item => {
      const rect = item.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;

      if (inView || !rect.height) item.classList.add('visible');
    });
  }, 4000);
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  applyStoredSettings();
  startReleaseTimer();
  initReveal();

  // Фоновая вкладка: останавливаем лепестки и прочие анимации,
  // чтобы браузер не жёг процессор и не подвешивал страницу
  document.body.classList.toggle('is-hidden', document.hidden);

  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('is-hidden', document.hidden);
  });

  // Страховка: если какой-то скрипт позже сбросил класс темы или размер
  // шрифта, возвращаем сохранённое значение (переходы, bfcache, вторая вкладка)
  window.addEventListener('load', () => setTimeout(applyStoredSettings, 120));
  window.addEventListener('pageshow', event => { if (event.persisted) applyStoredSettings(); });

  // Клик по затемнению не должен влиять на панель
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDesignPanel();
  });
});

/* Экспорт в глобальную область */
window.toggleDesignPanel = toggleDesignPanel;
window.closeDesignPanel = closeDesignPanel;
window.setTheme = setTheme;
window.toggleLightTheme = toggleLightTheme;
window.startSakura = startSakura;
window.stopSakura = stopSakura;
window.toggleSakura = toggleSakura;
window.setSakuraLevel = setSakuraLevel;
window.applyStoredSettings = applyStoredSettings;
window.applyBaseFontSize = applyBaseFontSize;
window.observeReveals = observeReveals;
window.startReleaseTimer = startReleaseTimer;
window.getReleaseDate = getReleaseDate;
window.getReleaseStart = getReleaseStart;
window.getReleaseProgress = getReleaseProgress;
window.RELEASE_DAYS = RELEASE_DAYS;
