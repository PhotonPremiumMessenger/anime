/* ============================================================
   api.js — фасад данных AniLingo

   Одна точка входа для всего сайта. Внутри два режима:

     remote — есть сервер (папка server/), все аккаунты,
              настройки и прогресс живут в SQLite и
              синхронизируются между устройствами;

     local  — сервер не ответил, сайт работает как раньше,
              на localStorage (демо-режим, данные в браузере).

   Режим выбирается один раз при загрузке по GET /api/health.
   Имена функций и формы ответов не изменились — остальные
   файлы сайта о переезде ничего не знают.

   Синхронные функции (getCurrentUser, isAuthorized) читают
   кэш в localStorage: экран рисуется сразу, без ожидания сети.
   Сервер подтягивается следом — см. js/sync.js.
   ============================================================ */

'use strict';

/* ---------- Подключение ---------- */

const ANILINGO_API_BASE = String(
  (window.ANILINGO_CONFIG && window.ANILINGO_CONFIG.apiBase) || ''
).replace(/\/+$/, '');

const API_PROBE_TIMEOUT = Number(
  (window.ANILINGO_CONFIG && window.ANILINGO_CONFIG.probeTimeout) || 2500
);

// Таймаут обычного запроса
const API_TIMEOUT = 10000;

// null — ещё не проверяли
let apiMode = null;
let apiModePromise = null;

/** Полный адрес метода API. */
function apiUrl(path) {
  return ANILINGO_API_BASE + path;
}

/** Запрос с таймаутом: зависший сервер не должен вешать интерфейс. */
async function apiFetch(url, options, timeout) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout || API_TIMEOUT);

  try {
    return await fetch(url, Object.assign({ signal: controller.signal }, options));
  } finally {
    window.clearTimeout(timer);
  }
}

/** Отвечает ли сервер. */
async function apiProbe() {
  try {
    const response = await apiFetch(apiUrl('/api/health'), { method: 'GET' }, API_PROBE_TIMEOUT);
    if (!response.ok) return false;

    const data = await response.json();
    return Boolean(data && data.ok);
  } catch (error) {
    return false;
  }
}

/**
 * Определяет режим работы: remote или local.
 * Результат запоминается до перезагрузки страницы.
 */
function apiDetectMode() {
  if (apiModePromise) return apiModePromise;

  apiModePromise = apiProbe().then(remote => {
    apiMode = remote ? 'remote' : 'local';

    // Полезно для отладки: <html data-api="remote">
    document.documentElement.dataset.api = apiMode;

    return apiMode;
  });

  return apiModePromise;
}

/** Текущий или вычисленный режим. */
async function apiModeNow() {
  return apiMode || apiDetectMode();
}

/* ---------- Запросы ---------- */

/**
 * Запрос к API.
 * @returns {Promise<{ok: boolean, status: number, data: object}>}
 */
async function apiRequest(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { 'Content-Type': 'application/json' };

  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;

  try {
    const response = await apiFetch(apiUrl(path), {
      method: method,
      headers: headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      data: data || {}
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { message: 'Сервер не отвечает. Проверьте соединение' }
    };
  }
}

/* ---------- Кэш пользователя ---------- */

// Ключи те же, что были раньше: старые данные не теряются,
// а миграция localStorage пользователю не нужна.
const CACHE_USERS_KEY = 'nihongo_users';
const CACHE_CURRENT_KEY = 'nihongo_current_user';
const CACHE_TOKEN_KEY = 'nihongo_token';

/** Приводит запись пользователя к единому виду. */
function apiNormalizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email || '',
    avatar: user.avatar || '',
    createdAt: user.createdAt || user.created_at || new Date().toISOString(),
    jlpt: user.jlpt,
    xp: user.xp,
    custom: user.custom || null
  };
}

/**
 * Кладёт пользователя в кэш после входа или регистрации.
 * Токен — отдельно: он единственное доказательство сессии.
 */
function apiCacheUser(user, token) {
  const normalized = apiNormalizeUser(user);
  if (!normalized) return null;

  const others = getUsers().filter(item => item.username !== normalized.username);
  writeJSON(CACHE_USERS_KEY, others.concat([normalized]));

  try {
    localStorage.setItem(CACHE_CURRENT_KEY, normalized.username);
    if (token) localStorage.setItem(CACHE_TOKEN_KEY, token);
  } catch (error) {
    // Приватный режим — сессия проживёт до перезагрузки
  }

  return normalized;
}

/** Очищает кэш пользователя, но не серверные данные. */
function apiClearUserCache() {
  try {
    localStorage.removeItem(CACHE_CURRENT_KEY);
    localStorage.removeItem(CACHE_TOKEN_KEY);
  } catch (error) {
    // ничего не поделать
  }
}

/* ---------- Синхронные геттеры (читают кэш) ---------- */

/** Все известные этому браузеру аккаунты (кэш). */
function getUsers() {
  const list = readJSON(CACHE_USERS_KEY, []);
  return Array.isArray(list) ? list : [];
}

/** Текущий пользователь или null. */
function getCurrentUser() {
  let nickname = '';

  try {
    nickname = localStorage.getItem(CACHE_CURRENT_KEY) || '';
  } catch (error) {
    return null;
  }

  if (!nickname) return null;

  return getUsers().find(user => user.username === nickname) || null;
}

/** Ник текущего пользователя. */
function getUsername() {
  const user = getCurrentUser();
  return user ? user.username : '';
}

/** Токен сессии: JWT с сервера или псевдо-токен в демо-режиме. */
function getToken() {
  try {
    return localStorage.getItem(CACHE_TOKEN_KEY) || '';
  } catch (error) {
    return '';
  }
}

/** Авторизован ли пользователь. */
function isAuthorized() {
  return Boolean(getToken()) && Boolean(getCurrentUser());
}

/** Пользователь по нику из кэша. */
function findUserByNickname(nickname) {
  const needle = String(nickname || '').trim().toLowerCase();
  if (!needle) return null;

  return getUsers().find(user => String(user.username).toLowerCase() === needle) || null;
}

/**
 * Обновляет запись пользователя.
 * Сначала пишем в кэш (интерфейс меняется мгновенно), потом —
 * на сервер в фоне. Ошибка сети не отменяет локальное изменение.
 */
function updateUserRecord(username, patch) {
  const users = getUsers();
  const index = users.findIndex(user => user.username === username);

  if (index === -1) return null;

  users[index] = Object.assign({}, users[index], patch || {});
  writeJSON(CACHE_USERS_KEY, users);

  // В фоне отправляем то, что относится к серверным данным
  if (typeof syncPushUserPatch === 'function') {
    syncPushUserPatch(patch || {});
  }

  return users[index];
}

/* ---------- Отправка кода ---------- */

/**
 * «Отправка» кода на почту.
 * На сервере — реальное письмо (если настроены EMAIL_USER/EMAIL_PASS),
 * иначе код возвращается в ответе и показывается на экране.
 */
async function apiSendCode(email, purpose) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.sendCode(email);
  }

  const response = await apiRequest('/api/auth/send-code', {
    method: 'POST',
    body: { email: email, purpose: purpose }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Не удалось отправить код' } };
  }

  return {
    ok: true,
    data: {
      demo: Boolean(response.data.demo),
      code: response.data.code,
      message: response.data.message || 'Код отправлен'
    }
  };
}

/** Проверка кода подтверждения. */
async function apiVerifyCode(email, code, purpose) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.verifyCode(email, code);
  }

  const response = await apiRequest('/api/auth/verify-code', {
    method: 'POST',
    body: { email: email, code: code, purpose: purpose }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Код неверный' } };
  }

  return { ok: true, data: { verified: true } };
}

/* ---------- Регистрация и вход ---------- */

/** Регистрация: аккаунт создаётся после проверки кода. */
async function apiRegister(nickname, email, password) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.register(nickname, email, password);
  }

  const response = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: { username: nickname, email: email, password: password }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Не удалось создать аккаунт' } };
  }

  apiCacheUser(response.data.user, response.data.token);

  // Сразу подтягиваем настройки нового аккаунта
  if (typeof syncAfterLogin === 'function') syncAfterLogin();

  return {
    ok: true,
    data: {
      token: response.data.token,
      username: response.data.user.username,
      avatar: response.data.user.avatar
    }
  };
}

/** Вход по нику или почте. */
async function apiLogin(nickname, password) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.login(nickname, password);
  }

  const response = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { login: nickname, password: password }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Не удалось войти' } };
  }

  apiCacheUser(response.data.user, response.data.token);

  if (typeof syncAfterLogin === 'function') syncAfterLogin();

  return {
    ok: true,
    data: {
      token: response.data.token,
      username: response.data.user.username,
      avatar: response.data.user.avatar
    }
  };
}

/**
 * Выход из аккаунта.
 * Данные на сервере остаются, локальный кэш очищается —
 * ровно как требует задание. Прогресс вернётся при следующем входе.
 */
async function apiLogout() {
  const mode = await apiModeNow();

  if (mode === 'remote') {
    // Сообщаем серверу, но не ждём: выход не должен зависеть от сети
    apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
  } else {
    return ApiLocal.logout();
  }

  apiClearUserCache();

  if (typeof syncAfterLogout === 'function') syncAfterLogout();

  return { ok: true, data: { loggedOut: true } };
}

/** Удаление аккаунта вместе с настройками и прогрессом. */
async function apiDeleteAccount(password) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.deleteAccount();
  }

  const response = await apiRequest('/api/auth/account', {
    method: 'DELETE',
    body: { password: password || '' }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Не удалось удалить аккаунт' } };
  }

  apiClearUserCache();

  if (typeof syncAfterLogout === 'function') syncAfterLogout();

  return { ok: true, data: { username: getUsername() } };
}

/* ---------- Пароль ---------- */

/** Сброс забытого пароля: новый приходит на почту. */
async function apiResetPassword(email, newPassword) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.resetPassword(email, newPassword);
  }

  const response = await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: email }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Не удалось сбросить пароль' } };
  }

  return {
    ok: true,
    data: {
      temporaryPassword: response.data.temporaryPassword,
      message: response.data.message || 'Пароль обновлён'
    }
  };
}

/** Смена пароля: старый → новый. */
async function apiChangePassword(oldPassword, newPassword) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.changePassword(oldPassword, newPassword);
  }

  const response = await apiRequest('/api/auth/password', {
    method: 'PUT',
    body: { oldPassword: oldPassword, newPassword: newPassword }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Не удалось сменить пароль' } };
  }

  return { ok: true, data: { changed: true } };
}

/* ---------- Ник и почта ---------- */

/** Смена ника. */
async function apiChangeNickname(nickname) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.changeNickname(nickname);
  }

  const response = await apiRequest('/api/auth/nickname', {
    method: 'PUT',
    body: { username: nickname }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Не удалось сменить ник' } };
  }

  // Перекэшируем под новым ником и обновляем токен
  apiClearUserCache();
  apiCacheUser(response.data.user, response.data.token);

  return { ok: true, data: { username: response.data.user.username } };
}

/** Запрос кода на новую почту. */
async function apiChangeEmailRequest(newEmail) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.changeEmailRequest(newEmail);
  }

  const response = await apiRequest('/api/auth/email/request', {
    method: 'POST',
    body: { email: newEmail }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Не удалось отправить код' } };
  }

  return {
    ok: true,
    data: {
      demo: Boolean(response.data.demo),
      code: response.data.code,
      message: response.data.message || 'Код отправлен'
    }
  };
}

/** Подтверждение новой почты кодом. */
async function apiChangeEmailConfirm(newEmail, code) {
  const mode = await apiModeNow();

  if (mode === 'local') {
    return ApiLocal.changeEmailConfirm(newEmail, code);
  }

  const response = await apiRequest('/api/auth/email/confirm', {
    method: 'POST',
    body: { email: newEmail, code: code }
  });

  if (!response.ok) {
    return { ok: false, data: { message: response.data.message || 'Код неверный' } };
  }

  // Обновляем почту в кэше пользователя
  const user = getCurrentUser();
  if (user) updateUserRecord(user.username, { email: newEmail });

  return { ok: true, data: { email: newEmail } };
}

/* ---------- Выгрузка данных ---------- */

/** Все данные аккаунта для кнопки «Скачать мои данные». */
function getAccountData() {
  const user = getCurrentUser();

  if (apiMode === 'remote') {
    // В удалённом режиме полную выгрузку отдаёт сервер,
    // готовим её отдельной функцией syncExportAccount()
    if (typeof syncExportAccount === 'function') {
      syncExportAccount();
    }
  }

  return {
    account: user
      ? { username: user.username, email: user.email, avatar: user.avatar, createdAt: user.createdAt }
      : null,
    progress: readJSON('nihongo_progress', {}),
    achievements: readJSON('nihongo_achievements', []),
    settings: readJSON('settings', {}),
    exportedAt: new Date().toISOString()
  };
}

/* ---------- Экспорт ---------- */

window.STORAGE_KEYS = ApiLocal.STORAGE_KEYS;
window.readJSON = ApiLocal.readJSON;
window.writeJSON = ApiLocal.writeJSON;
window.generateToken = ApiLocal.generateToken;

window.getUsers = getUsers;
window.updateUserRecord = updateUserRecord;
window.findUserByNickname = findUserByNickname;
window.getCurrentUser = getCurrentUser;
window.getUsername = getUsername;
window.getToken = getToken;
window.isAuthorized = isAuthorized;

window.apiSendCode = apiSendCode;
window.apiVerifyCode = apiVerifyCode;
window.apiRegister = apiRegister;
window.apiLogin = apiLogin;
window.apiLogout = apiLogout;
window.apiDeleteAccount = apiDeleteAccount;
window.apiResetPassword = apiResetPassword;
window.apiChangePassword = apiChangePassword;
window.apiChangeNickname = apiChangeNickname;
window.apiChangeEmailRequest = apiChangeEmailRequest;
window.apiChangeEmailConfirm = apiChangeEmailConfirm;
window.getAccountData = getAccountData;

/* ---------- Проверка связи при загрузке ---------- */

// Режим определяем сразу после разбора документа: к этому моменту
// кэш уже прочитан, а сеть подтянется в фоне и ничего не заблокирует.
document.addEventListener('DOMContentLoaded', () => {
  apiDetectMode().catch(() => {});
});

// Для js/sync.js и отладки
window.apiRequest = apiRequest;
window.apiModeNow = apiModeNow;
window.apiDetectMode = apiDetectMode;
window.apiCacheUser = apiCacheUser;
window.apiClearUserCache = apiClearUserCache;
