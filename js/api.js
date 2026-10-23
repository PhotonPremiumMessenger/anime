/* ============================================================
   api.js — слой работы с бэкендом Nihongo
   Все запросы к серверу идут только отсюда.
   Каждая функция возвращает объект { ok, data }:
     ok   — true, если сервер ответил успешно (HTTP 2xx)
     data — тело ответа (объект) либо описание ошибки
   ============================================================ */

'use strict';

// Адрес бэкенда (Node.js + Express + SQLite на отдельном сервере).
// Если сервер переедет — меняем только эту строку.
const API_URL = 'http://194.55.236.245:8080';

// Сколько ждём ответ, прежде чем показать ошибку (в миллисекундах)
const API_TIMEOUT = 12000;

/* ---------- Вспомогательные функции ---------- */

/**
 * Достаёт токен из localStorage.
 * Токен кладёт туда auth.js после успешного входа.
 */
function getToken() {
  return localStorage.getItem('token') || '';
}

/**
 * Достаёт имя пользователя из localStorage.
 */
function getUsername() {
  return localStorage.getItem('username') || '';
}

/**
 * Базовый запрос к API.
 *
 * @param {string} path   — путь, например '/login'
 * @param {object} body   — тело запроса (уйдёт как JSON)
 * @param {object} options — { auth: true } добавит заголовок Authorization
 * @returns {Promise<{ok: boolean, data: any}>}
 */
async function apiRequest(path, body = {}, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };

  // Для защищённых ручек прикладываем JWT
  if (options.auth) {
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }

  // AbortController не даёт запросу «висеть» вечно
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(API_URL + path, {
      method: options.method || 'POST',
      headers: headers,
      body: options.method === 'GET' ? undefined : JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timer);

    // Пытаемся прочитать JSON, даже если сервер вернул ошибку
    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Сервер ответил не JSON — отдаём текст как есть
        data = { message: text };
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        data: {
          message: (data && (data.message || data.error)) || 'Ошибка сервера (' + response.status + ')',
          status: response.status,
          raw: data
        }
      };
    }

    return { ok: true, data: data || {} };
  } catch (error) {
    clearTimeout(timer);

    // Отдельно обрабатываем два частых случая: таймаут и сеть
    const isTimeout = error.name === 'AbortError';
    return {
      ok: false,
      data: {
        message: isTimeout
          ? 'Сервер не отвечает. Попробуйте ещё раз через минуту.'
          : 'Нет связи с сервером. Проверьте интернет-соединение.',
        network: true
      }
    };
  }
}

/* ---------- Публичные функции API ---------- */

/**
 * Отправка кода подтверждения на почту.
 * @param {string} email
 */
async function apiSendCode(email) {
  return apiRequest('/send-code', { email: email });
}

/**
 * Проверка кода из письма.
 * @param {string} email
 * @param {string} code — 10 символов
 */
async function apiVerifyCode(email, code) {
  return apiRequest('/verify-code', { email: email, code: code });
}

/**
 * Регистрация нового пользователя.
 * Отправляем и username, и nickname: бэкенд может ждать любое из полей.
 * @param {string} nickname
 * @param {string} email
 * @param {string} password
 */
async function apiRegister(nickname, email, password) {
  return apiRequest('/register', {
    username: nickname,
    nickname: nickname,
    email: email,
    password: password
  });
}

/**
 * Вход в аккаунт. В ответе ожидаем { token, username }.
 * @param {string} nickname
 * @param {string} password
 */
async function apiLogin(nickname, password) {
  return apiRequest('/login', {
    username: nickname,
    nickname: nickname,
    password: password
  });
}

/**
 * Сброс пароля. Если бэкенд ждёт только email — лишние поля он проигнорирует.
 * @param {string} email
 * @param {string} newPassword — может быть пустым, если сброс идёт по коду
 */
async function apiResetPassword(email, newPassword) {
  const body = { email: email };
  if (newPassword) body.newPassword = newPassword;
  return apiRequest('/reset-password', body);
}

/* ---------- Ручки настроек ---------- */

/**
 * Смена пароля: старый → новый.
 */
async function apiChangePassword(oldPassword, newPassword) {
  return apiRequest('/change-password', {
    oldPassword: oldPassword,
    newPassword: newPassword
  }, { auth: true });
}

/**
 * Смена ника (доступна раз в 30 дней).
 */
async function apiChangeNickname(nickname) {
  return apiRequest('/change-nickname', { nickname: nickname, username: nickname }, { auth: true });
}

/**
 * Запрос кода на новую почту.
 */
async function apiChangeEmailRequest(newEmail) {
  return apiRequest('/change-email-request', { newEmail: newEmail, email: newEmail }, { auth: true });
}

/**
 * Подтверждение новой почты кодом из письма.
 */
async function apiChangeEmailConfirm(newEmail, code) {
  return apiRequest('/change-email-confirm', {
    newEmail: newEmail,
    email: newEmail,
    code: code
  }, { auth: true });
}

/* Экспорт в глобальную область — проект без сборщика, модули не используем */
window.API_URL = API_URL;
window.apiRequest = apiRequest;
window.apiSendCode = apiSendCode;
window.apiVerifyCode = apiVerifyCode;
window.apiRegister = apiRegister;
window.apiLogin = apiLogin;
window.apiResetPassword = apiResetPassword;
window.apiChangePassword = apiChangePassword;
window.apiChangeNickname = apiChangeNickname;
window.apiChangeEmailRequest = apiChangeEmailRequest;
window.apiChangeEmailConfirm = apiChangeEmailConfirm;
window.getToken = getToken;
window.getUsername = getUsername;
