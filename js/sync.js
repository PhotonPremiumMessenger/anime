/* ============================================================
   sync.js — синхронизация настроек и прогресса с сервером

   Как это работает:

   1. При загрузке страницы (если пользователь вошёл и сервер
      доступен) настройки и профиль забираются из базы и
      кладутся в localStorage-кэш. Интерфейс к этому моменту
      уже отрисован по кэшу, поэтому экран не мигает.

   2. При изменении настройки сначала обновляется кэш (мгновенно),
      затем через 600 мс уходит PUT на сервер. Несколько быстрых
      изменений подряд склеиваются в один запрос.

   3. При выходе серверные данные остаются на сервере, а
      локальный кэш пользователя очищается — настройки вернутся
      при следующем входе, в том числе с другого устройства.

   Чего здесь больше нет: перезагрузки страницы после загрузки
   настроек. Раньше она применяла пришедшую тему и цвет, но
   выглядела как «страница открылась обычной, потом перекрасилась».
   Теперь значения применяются на месте, а до первой отрисовки
   всё нужное ставит boot.js.

   Что синхронизируется:
     • настройки интерфейса и контента (ключ settings);
     • цвет сайта: свой цвет, палитра, радуга (appearance.*);
     • профиль: XP, аватар, JLPT, оформление профиля;
     • прогресс уроков, достижения, серия дней, ошибки, флешкарты,
       магазин, избранное и остальные данные аккаунта (data.*).

   Что НЕ синхронизируется (остаётся на устройстве):
     • фон сайта, загруженный пользователем;
     • флаги «показано окно приветствия», тур, cookie-баннер;
     • плейлист и своя музыка (данные на много мегабайт);
     • состояние интерфейса: свёрнутые блоки, фокус, помодоро.

   У каждой настройки на сервере есть отметка времени. По ней
   видно, чьё значение свежее, поэтому телефон и компьютер не
   затирают прогресс друг друга, когда оба что-то меняли.
   ============================================================ */

'use strict';

/* ---------- Состояние ---------- */

// Ключ настроек в localStorage — тот же, что читает settings.js
const SYNC_SETTINGS_KEY = 'settings';

// Пауза перед отправкой: склеиваем частые изменения
const SYNC_DELAY = 600;

let syncPushTimer = 0;
let syncPendingSettings = {};

// Сколько раз подряд пытаемся дослать изменения
let syncRetries = 0;
const SYNC_RETRIES = 5;
let syncPendingProfile = null;

// Пока идёт загрузка с сервера, встречные отправки не нужны
let syncApplying = false;

// Пользователь уже что-то нажимал: перезагружать страницу нельзя
let syncUserBusy = false;

// До первой сверки с сервером прогресс никуда не отправляем: модули
// при загрузке заново записывают его в localStorage, и если отправить
// это сразу, пустой прогресс затрёт серверный
let syncDataArmed = false;

// Каким было значение в прошлый раз — чтобы не считать перезапись
// тем же самым изменением
const syncDataSnapshot = {};

// Страница только открылась — время для одной перезагрузки
const syncPageStart = Date.now();

/**
 * Оформление лежит отдельными ключами, а на сервере — в общих
 * настройках с префиксом appearance. Сопоставление в одну сторону:
 * ключ браузера → ключ настройки.
 */
const SYNC_APPEARANCE_KEYS = {
  anilingo_accent: 'appearance.accent',
  anilingo_accent_preset: 'appearance.accentPreset',
  anilingo_accent_rainbow: 'appearance.accentRainbow'
};

/**
 * Данные аккаунта, которые лежат отдельными ключами браузера.
 * На сервере у них префикс data. Список намеренно короткий:
 * только то, что имеет смысл открыть на другом устройстве.
 *
 * Здесь нет музыки, своего фона и курсоров — это файлы на
 * много мегабайт, они остаются на устройстве.
 */
const SYNC_DATA_KEYS = [
  'anilingo_progress',          // пройденные уроки и слова
  'anilingo_completed_lessons',
  'anilingo_lessons',
  'anilingo_achievements',
  'anilingo_streak',            // серия дней
  'anilingo_best_streak',
  'anilingo_counters',          // счётчики для достижений
  'anilingo_daily',
  'anilingo_weekly',
  'anilingo_quiz',
  'anilingo_speed',
  'anilingo_shop',              // покупки за XP
  'anilingo_favorites',
  'anilingo_mistakes',          // дневник ошибок
  'anilingo_weak',
  'anilingo_weakspots',
  'anilingo_activity',
  'anilingo_goals',
  'anilingo_xp_days',
  'anilingo_review',
  'anilingo_exam',
  'anilingo_jlpt',
  'anilingo_friends',
  'anilingo_tests',
  'anilingo_listening',
  'anilingo_lesson_steps',
  'anilingo_grammar_read',
  'anilingo_game_best',
  'anilingo_match',
  'anilingo_srs',               // коробки повторения флешкарт
  'anilingo_words_log',
  'anilingo_easter',
  'anilingo_autotheme',
  'anilingo_voice',
  'anilingo_voice_tuning'
];

// Префикс этих ключей на сервере: data.anilingo_progress
const SYNC_DATA_PREFIX = 'data.';

// Крупные значения на сервер не отправляем: место на диске не резиновое
const SYNC_VALUE_LIMIT = 32 * 1024;

/**
 * Ключи, которые принадлежат аккаунту и чистятся при выходе.
 * Всё, что не в списке, считается настройкой устройства и
 * переживает выход: музыка, свой фон, флаги, состояние интерфейса.
 */
const SYNC_USER_KEYS = ['settings']
  .concat(SYNC_DATA_KEYS)
  .concat(Object.keys(SYNC_APPEARANCE_KEYS));

// Отметки времени, которые сервер выдал в прошлый раз:
// по ним видно, менял ли кто-то данные с другого устройства
const SYNC_META_KEY = 'anilingo_sync_meta';

// Что изменилось здесь, но ещё не улетело на сервер
const SYNC_DIRTY_KEY = 'anilingo_sync_dirty';

// Перезагрузить страницу из-за приехавшего прогресса можно только раз
const SYNC_DATA_RELOAD_KEY = 'anilingo_data_reloaded';

/* ---------- Помощники ---------- */

/** Настройки из кэша как объект. */
function syncReadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_SETTINGS_KEY) || '{}') || {};
  } catch (error) {
    return {};
  }
}

/** Записывает настройки в кэш. */
function syncWriteSettings(settings) {
  try {
    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    // переполнение или приватный режим — не критично
  }
}

// Запоминаем, с чем страница стартовала
SYNC_DATA_KEYS.forEach(key => {
  try {
    syncDataSnapshot[key] = localStorage.getItem(key);
  } catch (error) {
    syncDataSnapshot[key] = null;
  }
});

/** Отметки времени с сервера: { 'data.anilingo_progress': '2026-10-30T...' }. */
function syncReadMeta() {
  try {
    const value = JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch (error) {
    return {};
  }
}

/** Список ключей, которые изменились здесь и ещё не ушли на сервер. */
function syncReadDirty() {
  try {
    const value = JSON.parse(localStorage.getItem(SYNC_DIRTY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

let syncMeta = syncReadMeta();
const syncDirty = new Set(syncReadDirty());

/** Сохраняет список неотправленного, чтобы он не потерялся при закрытии. */
function syncSaveDirty() {
  try {
    localStorage.setItem(SYNC_DIRTY_KEY, JSON.stringify(Array.from(syncDirty)));
  } catch (error) {
    // приватный режим — обойдёмся памятью
  }
}

/** Сохраняет отметки времени. */
function syncSaveMeta() {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(syncMeta));
  } catch (error) {
    // приватный режим — обойдёмся памятью
  }
}

/**
 * Локальное изменение прогресса: запоминаем, что не отправлено,
 * и ставим значение в очередь. Вызывается из перехвата записи.
 */
function syncTouchData(key, rawValue, force) {
  const previous = syncDataSnapshot[key];
  syncDataSnapshot[key] = rawValue;

  // Слишком большое значение останется только на этом устройстве
  if (rawValue.length > SYNC_VALUE_LIMIT) return;

  // Записали то же самое — значит, ничего не изменилось
  if (!force && previous === rawValue) return;

  // Сервер ещё не ответил, чьи данные главнее
  if (!force && !syncDataArmed) return;

  if (!syncDirty.has(key)) {
    syncDirty.add(key);
    syncSaveDirty();
  }

  syncPushSetting(SYNC_DATA_PREFIX + key, syncParseValue(rawValue));
}

/** Значение из localStorage как есть: JSON или строка. */
function syncParseValue(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return raw;
  }
}

/** Можно ли сейчас говорить с сервером про данные пользователя. */
async function syncReady() {
  if (typeof apiModeNow !== 'function') return false;
  if (!isAuthorized()) return false;

  const mode = await apiModeNow();
  return mode === 'remote';
}

/* ---------- Перехват записи настроек ---------- */

// Последнее известное состояние настроек — чтобы понять, что изменилось
let syncLastSettings = syncReadSettings();

/**
 * Настройки пишут разные файлы: settings.js через setSettingValue,
 * design.js — напрямую. Чтобы не править каждый из них, перехватываем
 * запись в localStorage по ключу settings: любой автор изменения
 * автоматически попадает в очередь на отправку.
 */
const syncNativeSetItem = localStorage.setItem.bind(localStorage);

localStorage.setItem = function (key, value) {
  syncNativeSetItem(key, value);

  if (syncApplying) return;

  // Цвет сайта: свой цвет, палитра и радуга лежат отдельными ключами.
  // Пустая строка означает «сброшено» — на сервер уходит null.
  if (SYNC_APPEARANCE_KEYS[key]) {
    syncPushSetting(SYNC_APPEARANCE_KEYS[key], value === '' ? null : value);
    return;
  }

  // Прогресс, достижения, ошибки и остальные данные аккаунта
  if (SYNC_DATA_KEYS.indexOf(key) !== -1) {
    syncTouchData(key, String(value));
    return;
  }

  if (key !== SYNC_SETTINGS_KEY) return;

  let next = {};
  try {
    next = JSON.parse(value) || {};
  } catch (error) {
    return;
  }

  // Отправляем только реально изменённые ключи
  Object.keys(next).forEach(settingKey => {
    if (JSON.stringify(next[settingKey]) !== JSON.stringify(syncLastSettings[settingKey])) {
      syncPushSetting(settingKey, next[settingKey]);
    }
  });

  // Удалённые ключи возвращают значение по умолчанию — шлём null
  Object.keys(syncLastSettings).forEach(settingKey => {
    if (!Object.prototype.hasOwnProperty.call(next, settingKey)) {
      syncPushSetting(settingKey, null);
    }
  });

  syncLastSettings = next;
};

/* ---------- Отправка на сервер ---------- */

/**
 * Ставит настройку в очередь на отправку.
 * Вызывается автоматически при записи в localStorage.
 */
function syncPushSetting(key, value) {
  if (syncApplying) return;

  syncPendingSettings[key] = value;

  if (syncPushTimer) return;

  syncPushTimer = window.setTimeout(syncFlushSettings, SYNC_DELAY);
}

/**
 * Отправляет накопленные настройки одним запросом.
 * @param {boolean} keepalive — не обрывать запрос при уходе со страницы
 */
async function syncFlushSettings(keepalive) {
  syncPushTimer = 0;

  const patch = syncPendingSettings;
  syncPendingSettings = {};

  if (!Object.keys(patch).length) return;
  if (!(await syncReady())) return;

  // Само значение локально уже стоит — перерисовывать нечего.
  // А вот отметки времени с сервера нужны: по ним видно,
  // не изменил ли то же самое другое устройство
  const response = await apiRequest('/api/user/settings', {
    method: 'PUT',
    body: { patch: patch },
    keepalive: Boolean(keepalive)
  });

  // Не дошло — вернём в очередь и попробуем ещё раз, но не бесконечно
  if (!response.ok) {
    if (syncRetries < SYNC_RETRIES) {
      syncRetries++;

      Object.keys(patch).forEach(key => {
        if (!Object.prototype.hasOwnProperty.call(syncPendingSettings, key)) {
          syncPendingSettings[key] = patch[key];
        }
      });

      syncPushTimer = window.setTimeout(syncFlushSettings, SYNC_DELAY * 2);
    }

    return;
  }

  syncRetries = 0;

  const updated = (response.data && response.data.updated) || {};

  Object.keys(patch).forEach(key => {
    if (updated[key]) syncMeta[key] = updated[key];

    if (key.indexOf(SYNC_DATA_PREFIX) === 0) {
      syncDirty.delete(key.slice(SYNC_DATA_PREFIX.length));
    }
  });

  syncSaveDirty();
  syncSaveMeta();
}

/** Ставит в очередь всё, что не успело уйти в прошлый раз. */
function syncResendDirty() {
  if (!syncDirty.size) return;

  Array.from(syncDirty).forEach(key => {
    let raw = null;

    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      return;
    }

    if (raw === null) {
      syncDirty.delete(key);
      return;
    }

    syncTouchData(key, raw, true);
  });

  syncSaveDirty();
}

/**
 * Отправляет изменения записи пользователя (XP, аватар, JLPT,
 * оформление профиля). Вызывается из updateUserRecord.
 */
function syncPushUserPatch(patch) {
  if (syncApplying) return;
  if (!patch || typeof patch !== 'object') return;

  // XP и уровень — в профиль
  if (patch.xp !== undefined) {
    syncPendingProfile = Object.assign({}, syncPendingProfile, {
      xp: Math.max(0, Math.floor(Number(patch.xp) || 0))
    });
  }

  // Остальное — в настройки аккаунта
  const settingsPatch = {};

  if (patch.avatar !== undefined) settingsPatch['profile.avatar'] = patch.avatar;
  if (patch.jlpt !== undefined) settingsPatch['profile.jlpt'] = patch.jlpt;
  if (patch.custom !== undefined) settingsPatch['profile.custom'] = patch.custom;

  Object.keys(settingsPatch).forEach(key => {
    syncPendingSettings[key] = settingsPatch[key];
  });

  if (syncPushTimer) return;
  syncPushTimer = window.setTimeout(syncFlushProfile, SYNC_DELAY);
}

/** Отправляет XP и накопленные настройки профиля. */
async function syncFlushProfile(keepalive) {
  syncPushTimer = 0;

  const profile = syncPendingProfile;
  const settings = syncPendingSettings;

  syncPendingProfile = null;
  syncPendingSettings = {};

  if (!(await syncReady())) return;

  if (profile) {
    await apiRequest('/api/user/profile', {
      method: 'PUT',
      body: profile,
      keepalive: Boolean(keepalive)
    });
  }

  if (Object.keys(settings).length) {
    await apiRequest('/api/user/settings', {
      method: 'PUT',
      body: { patch: settings },
      keepalive: Boolean(keepalive)
    });
  }
}

/* ---------- Загрузка с сервера ---------- */

/**
 * Применяет пришедшее оформление прямо на открытой странице.
 * Раньше здесь была перезагрузка — из-за неё и было видно,
 * как сайт сначала обычный, а потом перекрашивается.
 */
function syncApplyDesign() {
  try {
    if (typeof applyStoredSettings === 'function') applyStoredSettings();
  } catch (error) {
    // страница без design.js — не критично
  }

  try {
    if (typeof applyCustomization === 'function') applyCustomization();
  } catch (error) {
    // страница без customize.js — не критично
  }
}

/**
 * Приехали данные, которые страница уже прочитала при отрисовке
 * (прогресс уроков, достижения, ошибки). Чтобы их увидеть, нужна
 * перезагрузка — но только одна за сессию и только пока человек
 * ещё ничего не делает на странице.
 */
function syncReloadForData() {
  if (syncUserBusy || Date.now() - syncPageStart > 8000) return;

  try {
    if (sessionStorage.getItem(SYNC_DATA_RELOAD_KEY) === '1') return;
    sessionStorage.setItem(SYNC_DATA_RELOAD_KEY, '1');
  } catch (error) {
    return;
  }

  window.location.reload();
}

/**
 * Забирает настройки и профиль с сервера при входе на страницу.
 *
 * Если на сервере настроек ещё нет (новый аккаунт), туда уезжают
 * текущие настройки этого устройства — пользователь не теряет
 * выбранную тему после регистрации.
 */
async function syncPullAll() {
  // Сначала досылаем своё: иначе сервер вернёт старое значение
  // и затрёт только что выбранное на этой странице
  if (syncPushTimer) await syncFlushSettings();

  if (!(await syncReady())) return false;

  const [settingsResponse, profileResponse] = await Promise.all([
    apiRequest('/api/user/settings', { method: 'GET' }),
    apiRequest('/api/user/profile', { method: 'GET' })
  ]);

  if (!settingsResponse.ok) return false;

  syncApplying = true;

  let redraw = false;

  // Что на сервере пусто, но есть здесь — отправим после синхронизации
  const uplift = {};

  // Прогресс, который приехал с сервера: страницу придётся перечитать
  const dataTaken = [];

  try {
    const serverSettings = settingsResponse.data.settings || {};
    const localSettings = syncReadSettings();

    // appearance.* — это цвет сайта, он живёт отдельными ключами браузера
    const serverPrefs = {};

    Object.keys(serverSettings).forEach(key => {
      if (key.indexOf('appearance.') === 0) return;
      serverPrefs[key] = serverSettings[key];
    });

    // На сервере пусто — забираем локальные настройки туда
    if (!Object.keys(serverSettings).length && Object.keys(localSettings).length) {
      await apiRequest('/api/user/settings', { method: 'PUT', body: { patch: localSettings } });
    } else {
      const merged = Object.assign({}, localSettings, serverPrefs);
      const changed = JSON.stringify(merged) !== JSON.stringify(localSettings);

      syncLastSettings = merged;
      syncWriteSettings(merged);
      if (changed) redraw = true;
    }

    // Цвет сайта: чего нет на сервере — досылаем, что есть — забираем
    Object.keys(SYNC_APPEARANCE_KEYS).forEach(localKey => {
      const serverKey = SYNC_APPEARANCE_KEYS[localKey];
      const serverValue = serverSettings[serverKey];
      const localValue = localStorage.getItem(localKey);

      if (serverValue === undefined || serverValue === null || serverValue === '') {
        if (localValue) uplift[serverKey] = localValue;
        return;
      }

      if (String(serverValue) !== localValue) {
        // syncApplying уже включён, поэтому эхо на сервер не уйдёт
        localStorage.setItem(localKey, String(serverValue));
        redraw = true;
      }
    });

    // Прогресс, достижения, ошибки: у каждого ключа своя отметка времени,
    // поэтому видно, чьё значение свежее — здешнее или с другого устройства
    const serverUpdated = settingsResponse.data.updated || {};

    SYNC_DATA_KEYS.forEach(localKey => {
      const fullKey = SYNC_DATA_PREFIX + localKey;
      const serverValue = serverSettings[fullKey];
      const serverTime = serverUpdated[fullKey] || '';
      const localValue = localStorage.getItem(localKey);
      const isDirty = syncDirty.has(localKey);

      // На сервере пусто — отправляем то, что накопилось здесь
      if (serverValue === undefined) {
        if (localValue && !isDirty) uplift[fullKey] = syncParseValue(localValue);
        return;
      }

      // Здесь есть неотправленное изменение — оно важнее
      if (isDirty) return;

      // Эту версию уже видели в прошлый раз
      if (serverTime && syncMeta[fullKey] === serverTime) return;

      const nextValue = JSON.stringify(serverValue);
      if (serverTime) syncMeta[fullKey] = serverTime;

      if (nextValue === localValue) return;

      localStorage.setItem(localKey, nextValue);
      syncDataSnapshot[localKey] = nextValue;
      dataTaken.push(localKey);
    });

    // Профиль: XP и уровень с сервера важнее локального кэша
    if (profileResponse.ok) {
      const profile = profileResponse.data.profile || {};
      const user = getCurrentUser();

      if (user && profile.xp !== undefined) {
        const users = getUsers().map(item => (
          item.username === user.username ? Object.assign({}, item, { xp: profile.xp }) : item
        ));

        writeJSON('anilingo_users', users);
      }
    }
  } finally {
    syncApplying = false;
  }

  Object.keys(uplift).forEach(key => syncPushSetting(key, uplift[key]));

  syncSaveMeta();

  if (redraw) syncApplyDesign();
  if (dataTaken.length) syncReloadForData();

  return true;
}

/* ---------- События входа и выхода ---------- */

/** После входа и регистрации: подтянуть данные аккаунта. */
function syncAfterLogin() {
  syncPullAll()
    .catch(() => {})
    .finally(() => {
      syncDataArmed = true;
      syncResendDirty();
    });
}

/**
 * После выхода: чистим локальный кэш пользователя.
 * На сервере всё осталось — вернётся при следующем входе.
 */
function syncAfterLogout() {
  SYNC_USER_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // ничего не поделать
    }
  });

  try {
    localStorage.removeItem('anilingo_current_user');
    localStorage.removeItem('anilingo_token');
  } catch (error) {
    // ничего не поделать
  }

  syncLastSettings = {};
  syncDirty.clear();
  syncSaveDirty();

  // Отметки времени тоже забываем: при следующем входе сервер снова
  // будет источником правды, а не «уже видели, ничего не менялось»
  syncMeta = {};
  syncSaveMeta();

  try {
    sessionStorage.removeItem(SYNC_DATA_RELOAD_KEY);
  } catch (error) {
    // ничего не поделать
  }
}

/**
 * Отправляет запрос на сервер и сохраняет ответ файлом —
 * кнопка «Скачать мои данные» в настройках.
 */
async function syncExportAccount() {
  if (!(await syncReady())) return false;

  const response = await apiRequest('/api/user/export', { method: 'GET' });
  if (!response.ok) return false;

  const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'anilingo-data.json';
  link.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/* ---------- Старт ---------- */

/**
 * Загружаем данные аккаунта один раз за страницу.
 * Ждём DOMContentLoaded: к этому моменту api.js уже определил
 * режим, а интерфейс отрисован по локальному кэшу.
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthorized()) return;

  // Не блокируем отрисовку: сеть подтянется в фоне
  window.setTimeout(() => {
    syncPullAll()
      .catch(() => {})
      .finally(() => {
        // Только теперь понятно, чьи данные главнее — можно отправлять своё
        syncDataArmed = true;
        syncResendDirty();
      });
  }, 120);
});

// Первое же действие человека отменяет перезагрузку ради прогресса:
// выдёргивать страницу из-под него нельзя
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(type => {
  window.addEventListener(type, () => { syncUserBusy = true; }, { passive: true, once: true });
});

/**
 * Уходя со страницы, досылаем то, что не успело уйти.
 * keepalive: без него браузер обрывает запрос вместе со страницей,
 * и выбранный за секунду до перехода цвет терялся.
 */
function syncFlushBeforeLeave() {
  if (syncPushTimer) syncFlushSettings(true).catch(() => {});
  if (syncPendingProfile) syncFlushProfile(true).catch(() => {});
}

window.addEventListener('pagehide', syncFlushBeforeLeave);

// Свернули вкладку или переключились на другую — тоже досылаем
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') syncFlushBeforeLeave();
});

/* ---------- Экспорт ---------- */

window.syncPushSetting = syncPushSetting;
window.syncPushUserPatch = syncPushUserPatch;
window.syncPullAll = syncPullAll;
window.syncAfterLogin = syncAfterLogin;
window.syncAfterLogout = syncAfterLogout;
window.syncExportAccount = syncExportAccount;
window.syncFlushSettings = syncFlushSettings;
window.syncApplyDesign = syncApplyDesign;
