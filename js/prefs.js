/* ============================================================
   prefs.js — «живые» настройки
   Всё, что раньше только сохранялось, начинает работать: звуки
   интерфейса, фильтр уведомлений, напоминания, стиль перевода,
   транскрипция и пасхалки. Сервер не нужен — только браузер.
   ============================================================ */

'use strict';

/* ---------- Чтение настроек ---------- */

/** Значение настройки с запасным вариантом. */
function prefValue(key, fallback) {
  const getter = typeof getSettingValue === 'function'
    ? getSettingValue
    : (typeof window.getSettingValue === 'function' ? window.getSettingValue : null);

  if (getter) {
    const value = getter(key, fallback);
    return value === undefined || value === null ? fallback : value;
  }

  try {
    const all = JSON.parse(localStorage.getItem('settings') || '{}');
    return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : fallback;
  } catch (error) {
    return fallback;
  }
}

/* ============================================================
   1. Звук интерфейса
   ============================================================ */

let prefAudio = null;

/** Создаёт AudioContext при первом действии пользователя. */
function ensureAudio() {
  if (prefAudio) return prefAudio;

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  try {
    prefAudio = new Ctx();
  } catch (error) {
    prefAudio = null;
  }

  return prefAudio;
}

/** Громкость эффектов 0…1 с учётом ползунка. */
function soundVolume() {
  const volume = Number(prefValue('sound.volume', 60));
  return Math.min(1, Math.max(0, (Number.isFinite(volume) ? volume : 60) / 100));
}

/** Громкость фоновой музыки 0…1 — отдельный ползунок. */
function musicVolume() {
  const volume = Number(prefValue('sound.musicVolume', 40));
  return Math.min(1, Math.max(0, (Number.isFinite(volume) ? volume : 40) / 100));
}

/**
 * Короткий тон.
 * @param {number} freq — частота
 * @param {number} duration — секунды
 * @param {string} type — форма волны
 * @param {number} level — относительная громкость
 * @param {number} delay — задержка старта
 */
function playTone(freq, duration, type = 'sine', level = 0.2, delay = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;

  const volume = soundVolume();
  if (volume <= 0) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  // Мягкая атака и затухание — чтобы не щёлкало
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level * volume), now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** Наборы звуков. */
const UI_SOUNDS = {
  click: () => playTone(520, 0.07, 'triangle', 0.14),
  tap: () => playTone(380, 0.06, 'sine', 0.12),
  success: () => {
    playTone(660, 0.13, 'sine', 0.18);
    playTone(880, 0.16, 'sine', 0.16, 0.09);
  },
  error: () => {
    playTone(300, 0.16, 'sawtooth', 0.1);
    playTone(220, 0.2, 'sawtooth', 0.09, 0.1);
  },
  info: () => playTone(740, 0.1, 'sine', 0.13),
  translate: () => {
    playTone(880, 0.08, 'triangle', 0.12);
    playTone(1180, 0.1, 'triangle', 0.1, 0.06);
  },
  levelup: () => {
    playTone(523, 0.12, 'triangle', 0.16);
    playTone(659, 0.12, 'triangle', 0.16, 0.1);
    playTone(784, 0.18, 'triangle', 0.16, 0.2);
  }
};

/**
 * Проигрывает звук интерфейса, если он включён в настройках.
 * @param {string} kind — ключ из UI_SOUNDS
 */
function playUiSound(kind) {
  const preset = UI_SOUNDS[kind];
  if (!preset) return;

  // Выключенные категории молчат
  if (kind === 'click' || kind === 'tap') {
    if (prefValue('sound.buttons', true) === false) return;
  } else if (kind === 'translate') {
    if (prefValue('sound.translate', true) === false) return;
  } else if (kind === 'success' || kind === 'info' || kind === 'levelup') {
    if (prefValue('sound.notifications', true) === false) return;
  }

  preset();
}

/* ---------- Фоновая музыка (мягкий синтез, без файлов) ---------- */

let ambientNodes = null;

/** Запускает тихий эмбиент из двух расстроенных синусов. */
function startAmbient() {
  if (ambientNodes) return;

  const ctx = ensureAudio();
  if (!ctx) return;

  const master = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.value = 620;

  const level = Math.min(0.06, 0.002 + musicVolume() * 0.07);
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 3);

  const freqs = [110, 164.81, 220];
  const oscs = freqs.map((freq, index) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = index % 2 ? 6 : -6;
    osc.connect(filter);
    osc.start();
    return osc;
  });

  // Медленное «дыхание» громкости
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.06;
  lfoGain.gain.value = level * 0.35;
  lfo.connect(lfoGain).connect(master.gain);
  lfo.start();

  filter.connect(master).connect(ctx.destination);

  ambientNodes = { oscs, lfo, master };
}

/** Останавливает эмбиент с затуханием. */
function stopAmbient() {
  if (!ambientNodes) return;

  const ctx = ensureAudio();
  const { oscs, lfo, master } = ambientNodes;
  ambientNodes = null;

  if (!ctx) return;

  try {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value || 0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

    setTimeout(() => {
      oscs.forEach(osc => { try { osc.stop(); } catch (error) { /* уже остановлен */ } });
      try { lfo.stop(); } catch (error) { /* уже остановлен */ }
    }, 800);
  } catch (error) {
    /* контекст закрыт — ничего страшного */
  }
}

/** Подстраивает уже играющую музыку под ползунок громкости. */
function setAmbientLevel() {
  if (!ambientNodes) return;

  const ctx = ensureAudio();
  if (!ctx) return;

  const level = Math.min(0.06, 0.002 + musicVolume() * 0.07);

  try {
    ambientNodes.master.gain.cancelScheduledValues(ctx.currentTime);
    ambientNodes.master.gain.setTargetAtTime(level, ctx.currentTime, 0.2);
  } catch (error) {
    /* контекст закрыт — ничего страшного */
  }
}

/** Включает или выключает музыку по настройке. */
function syncAmbient() {
  const on = prefValue('sound.music', false) !== false && musicVolume() > 0;

  if (!on) {
    stopAmbient();
    return;
  }

  if (ambientNodes) setAmbientLevel();
  else startAmbient();
}

/** Тест звука из настроек: короткая гамма. */
function testSound() {
  ensureAudio();
  playTone(523, 0.14, 'triangle', 0.2);
  playTone(659, 0.14, 'triangle', 0.2, 0.12);
  playTone(784, 0.2, 'triangle', 0.2, 0.24);

  if (typeof showToast === 'function') {
    showToast('Звук включён', 'Громкость берётся из настроек · ' + Math.round(soundVolume() * 100) + '%', 'info', {
      duration: 2600
    });
  }
}

/* ============================================================
   2. Уведомления: фильтр, напоминание и дайджест
   ============================================================ */

/** Можно ли показать это уведомление. */
function notificationAllowed(title) {
  const text = String(title || '');

  if (/достижен|уровень|награ/i.test(text)) return prefValue('notify.achievements', true) !== false;
  if (/урок|разбор/i.test(text)) return prefValue('notify.lessons', true) !== false;
  if (/аниме|тайтл/i.test(text)) return prefValue('notify.anime', true) !== false;
  if (/друг|друз/i.test(text)) return prefValue('notify.friends', true) !== false;

  return true;
}

/** Оборачивает показ уведомлений: фильтр и звук. */
function applyNotificationPreferences() {
  if (typeof window.showToast !== 'function' || window.showToast._prefsWrapped) return;

  const original = window.showToast;

  const wrapped = function (title, message, type, options) {
    if (!notificationAllowed(title)) return undefined;

    // Звуковое сопровождение
    if (type === 'success') playUiSound('success');
    else if (type === 'error') playUiSound('error');
    else if (type === 'warning' || type === 'info') playUiSound('info');

    return original(title, message, type, options);
  };

  wrapped._prefsWrapped = true;
  window.showToast = wrapped;
}

/** Ежедневное напоминание в выбранное время. */
function scheduleDailyReminder() {
  if (prefValue('notify.daily', true) === false) return;
  if (typeof pushNotification !== 'function') return;

  const time = String(prefValue('notify.dailyTime', '18:00'));
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (localStorage.getItem('anilingo_daily_ping') === today) return;

  const [hours, minutes] = time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hours || 18, minutes || 0, 0, 0);

  if (now < target) return;

  // Если сегодня уже занимались — не мешаем
  const practiced = localStorage.getItem('anilingo_last_practice');
  if (practiced === today) return;

  pushNotification('daily', 'Пора позаниматься', 'Дневная цель ждёт: 5 минут хватит, чтобы сохранить серию');
  localStorage.setItem('anilingo_daily_ping', today);

  showToast('Напоминание', 'Пять минут практики — и серия дней не прервётся', 'info', {
    icon: 'bell',
    duration: 5000
  });
}

/** Еженедельный дайджест вместо письма — в колокольчике. */
function scheduleWeeklyDigest() {
  if (prefValue('notify.email', false) !== true) return;
  if (typeof pushNotification !== 'function') return;

  const now = new Date();
  const week = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));

  if (localStorage.getItem('anilingo_digest_week') === String(week)) return;

  pushNotification('digest', 'Дайджест недели', 'Свежие разборы фраз и обновления каталога уже на сайте');
  localStorage.setItem('anilingo_digest_week', String(week));
}

/* ============================================================
   3. Перевод, транскрипция, пасхалки
   ============================================================ */

/** Применяет стиль перевода и режим транскрипции. */
function applyReadingPreferences() {
  // Стиль попапа перевода
  const style = String(prefValue('features.translateStyle', 'popup'));
  document.body.classList.remove('tr-style-popup', 'tr-style-panel', 'tr-style-inline');
  document.body.classList.add('tr-style-' + (['popup', 'panel', 'inline'].includes(style) ? style : 'popup'));

  // Транскрипция
  const transcription = String(prefValue('features.transcription', 'romaji'));
  document.body.classList.remove('transcription-romaji', 'transcription-kana', 'transcription-off');
  document.body.classList.add('transcription-' + (['romaji', 'kana', 'off'].includes(transcription) ? transcription : 'romaji'));

  if (typeof setRomajiOn === 'function') {
    setRomajiOn(transcription !== 'off');
  }
}

/** Выключает пасхалки, если так решили в настройках. */
function applyEasterPreference() {
  const on = prefValue('features.easterEggs', true) !== false;
  document.body.classList.toggle('no-easter', !on);

  if (on) return;

  // Перехватываем срабатывание секретов
  if (typeof window.triggerEaster === 'function' && !window.triggerEaster._off) {
    const disabled = function () { return false; };
    disabled._off = true;
    window.triggerEaster = disabled;
  }
}

/* ============================================================
   4. Звук при переводах и переходах
   ============================================================ */

/** Звук клика по кнопкам и ссылкам. */
function bindClickSounds() {
  document.addEventListener('click', event => {
    const target = event.target.closest('.btn, .nav-link, .menu-item, .chip, .tab, .cs-option, .switch');
    if (!target) return;
    if (target.classList.contains('switch') || target.closest('.switch')) playUiSound('tap');
    else playUiSound('click');
  }, true);
}

/** Звук, когда появился перевод. */
function bindTranslateSound() {
  if (typeof MutationObserver !== 'function') return;

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.classList && node.classList.contains('translate-popup')) playUiSound('translate');
      });
    });
  });

  observer.observe(document.body, { childList: true });
}

/* ============================================================
   5. Поля ввода после вставки из буфера
   ------------------------------------------------------------
   Браузер иногда оставляет над полем служебный слой (автозаполнение,
   «умная вставка») — из-за него вставленный текст выглядит закрытым
   серым прямоугольником. После вставки принудительно перерисовываем
   поле и возвращаем ему нормальные цвета.
   ============================================================ */

function tidyPastedField(field) {
  if (!field) return;

  field.classList.remove('just-pasted');

  // Читаем layout один раз — это заставляет браузер перерисовать поле
  void field.offsetWidth;

  field.classList.add('just-pasted');

  setTimeout(() => field.classList.remove('just-pasted'), 700);
}

/** Перерисовка полей после вставки и автозаполнения. */
function bindPasteFix() {
  document.addEventListener('paste', event => {
    const field = event.target && event.target.closest
      ? event.target.closest('.input, .textarea, input, textarea')
      : null;

    if (!field) return;
    setTimeout(() => tidyPastedField(field), 0);
  }, true);

  document.addEventListener('input', event => {
    const field = event.target;

    // Срабатывает и на автозаполнение, и на подстановку из менеджера паролей
    if (!field || !field.classList) return;
    if (!field.classList.contains('input') && field.tagName !== 'INPUT' && field.tagName !== 'TEXTAREA') return;

    try {
      if (field.matches && field.matches(':-webkit-autofill')) tidyPastedField(field);
    } catch (error) {
      /* браузер не знает такой псевдокласс — ничего страшного */
    }
  }, true);
}

/* ============================================================
   6. Старт
   ============================================================ */

/** Перечитывает настройки и применяет всё заново. */
function applyAllPreferences() {
  applyNotificationPreferences();
  applyReadingPreferences();
  applyEasterPreference();
  syncAmbient();
  scheduleDailyReminder();
  scheduleWeeklyDigest();

  if (typeof applyLanguage === 'function') applyLanguage();
}

document.addEventListener('DOMContentLoaded', () => {
  applyAllPreferences();
  bindClickSounds();
  bindTranslateSound();
  bindPasteFix();

  // Первый клик разблокирует звук в браузере
  document.addEventListener('pointerdown', () => {
    ensureAudio();
    if (prefAudio && prefAudio.state === 'suspended') prefAudio.resume();
    syncAmbient();
  }, { once: true });
});

// Настройки могли поменять на другой вкладке
window.addEventListener('storage', event => {
  if (event.key === 'settings') applyAllPreferences();
});

/* Экспорт */
window.playUiSound = playUiSound;
window.testSound = testSound;
window.applyAllPreferences = applyAllPreferences;
window.syncAmbient = syncAmbient;
window.startAmbient = startAmbient;
window.stopAmbient = stopAmbient;
window.tidyPastedField = tidyPastedField;
window.musicVolume = musicVolume;
window.setAmbientLevel = setAmbientLevel;
