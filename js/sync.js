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

   Что НЕ синхронизируется (остаётся на устройстве):
     • фон сайта, загруженный пользователем (может быть локальным);
     • флаги «показано окно приветствия», тур, cookie-баннер;
     • плейлист и своя музыка (данные на много мегабайт).
   ============================================================ */

'use strict';

/* ---------- Состояние ---------- */

// Ключ настроек в localStorage — тот же, что читает settings.js
const SYNC_SETTINGS_KEY = 'settings';

// Пауза перед отправкой: склеиваем частые изменения
const SYNC_DELAY = 600;

let syncPushTimer = 0;
let syncPendingSettings = {};
let syncPendingProfile = null;

// Пока идёт загрузка с сервера, встречные отправки не нужны
let syncApplying = false;

/**
 * Ключи, которые принадлежат аккаунту и чистятся при выходе.
 * Всё, что не в списке, считается настройкой устройства.
 */
const SYNC_USER_KEYS = [
  'settings',
  'nihongo_progress',
  'nihongo_achievements',
  'nihongo_streak',
  'nihongo_counters',
  'nihongo_daily',
  'nihongo_weekly',
  'nihongo_quiz',
  'nihongo_speed',
  'nihongo_shop',
  'nihongo_completed_lessons',
  'nihongo_favorites',
  'nihongo_mistakes',
  'nihongo_activity',
  'nihongo_goals',
  'nihongo_xp_days',
  'nihongo_weakspots',
  'nihongo_review',
  'nihongo_exam',
  'nihongo_jlpt',
  'nihongo_friends',
  'nihongo_music',
  'nihongo_playlist',
  'nihongo_player'
];

// Флаг «страницу уже перезагружали после входа»
const SYNC_RELOAD_KEY = 'anilingo_sync_reloaded';

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

  if (key !== SYNC_SETTINGS_KEY || syncApplying) return;

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

/** Отправляет накопленные настройки одним запросом. */
async function syncFlushSettings() {
  syncPushTimer = 0;

  const patch = syncPendingSettings;
  syncPendingSettings = {};

  if (!Object.keys(patch).length) return;
  if (!(await syncReady())) return;

  // Ответ сервера не применяем: локально уже стоит новое значение,
  // а гонять лишнюю перерисовку ни к чему
  await apiRequest('/api/user/settings', { method: 'PUT', body: { patch: patch } });
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
async function syncFlushProfile() {
  syncPushTimer = 0;

  const profile = syncPendingProfile;
  const settings = syncPendingSettings;

  syncPendingProfile = null;
  syncPendingSettings = {};

  if (!(await syncReady())) return;

  if (profile) {
    await apiRequest('/api/user/profile', { method: 'PUT', body: profile });
  }

  if (Object.keys(settings).length) {
    await apiRequest('/api/user/settings', { method: 'PUT', body: { patch: settings } });
  }
}

/* ---------- Загрузка с сервера ---------- */

/**
 * Забирает настройки и профиль с сервера при входе на страницу.
 *
 * Если на сервере настроек ещё нет (новый аккаунт), туда уезжают
 * текущие настройки этого устройства — пользователь не теряет
 * выбранную тему после регистрации.
 */
async function syncPullAll() {
  if (!(await syncReady())) return false;

  const [settingsResponse, profileResponse] = await Promise.all([
    apiRequest('/api/user/settings', { method: 'GET' }),
    apiRequest('/api/user/profile', { method: 'GET' })
  ]);

  if (!settingsResponse.ok) return false;

  syncApplying = true;

  try {
    const serverSettings = settingsResponse.data.settings || {};
    const localSettings = syncReadSettings();

    // На сервере пусто — забираем локальные настройки туда
    if (!Object.keys(serverSettings).length && Object.keys(localSettings).length) {
      await apiRequest('/api/user/settings', { method: 'PUT', body: { patch: localSettings } });
    } else {
      const merged = Object.assign({}, localSettings, serverSettings);

      // Применять новые значения будем после перезагрузки:
      // так тема, шрифт и сакура точно встанут на место
      const changed = JSON.stringify(merged) !== JSON.stringify(localSettings);
      syncLastSettings = merged;
      syncWriteSettings(merged);

      if (changed) syncReloadOnce();
    }

    // Профиль: XP и уровень с сервера важнее локального кэша
    if (profileResponse.ok) {
      const profile = profileResponse.data.profile || {};
      const user = getCurrentUser();

      if (user && profile.xp !== undefined) {
        const users = getUsers().map(item => (
          item.username === user.username ? Object.assign({}, item, { xp: profile.xp }) : item
        ));

        writeJSON('nihongo_users', users);
      }
    }
  } finally {
    syncApplying = false;
  }

  return true;
}

/** Перезагружает страницу один раз, чтобы применить пришедшие настройки. */
function syncReloadOnce() {
  try {
    if (sessionStorage.getItem(SYNC_RELOAD_KEY) === '1') return;
    sessionStorage.setItem(SYNC_RELOAD_KEY, '1');
  } catch (error) {
    return;
  }

  window.location.reload();
}

/* ---------- События входа и выхода ---------- */

/** После входа и регистрации: подтянуть данные аккаунта. */
function syncAfterLogin() {
  // Свежая сессия — разрешаем одну перезагрузку для применения настроек
  try {
    sessionStorage.removeItem(SYNC_RELOAD_KEY);
  } catch (error) {
    // приватный режим
  }

  syncPullAll().catch(() => {});
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
    localStorage.removeItem('nihongo_current_user');
    localStorage.removeItem('nihongo_token');
  } catch (error) {
    // ничего не поделать
  }

  syncLastSettings = {};

  // Флаг «страницу перезагружали» тоже сбрасываем
  try {
    sessionStorage.removeItem(SYNC_RELOAD_KEY);
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
    syncPullAll().catch(() => {});
  }, 120);
});

// Уходя со страницы, досылаем то, что не успело уйти
window.addEventListener('pagehide', () => {
  if (syncPushTimer) {
    syncFlushSettings().catch(() => {});
  }
});

/* ---------- Экспорт ---------- */

window.syncPushSetting = syncPushSetting;
window.syncPushUserPatch = syncPushUserPatch;
window.syncPullAll = syncPullAll;
window.syncAfterLogin = syncAfterLogin;
window.syncAfterLogout = syncAfterLogout;
window.syncExportAccount = syncExportAccount;
window.syncFlushSettings = syncFlushSettings;
