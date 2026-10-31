/* ============================================================
   api-local.js — локальный бэкенд на localStorage

   Это прежняя реализация «сервера» из старой версии сайта.
   Теперь она работает как запасной вариант: если настоящий
   сервер (server/) недоступен, сайт продолжает жить в демо-
   режиме, а не показывает пустые экраны.

   Выбирает между сервером и этим файлом js/api.js.
   Напрямую к ApiLocal обращаться не нужно.
   ============================================================ */

'use strict';

window.ApiLocal = (function () {
/* ============================================================
   api.js — слой «сервера» на localStorage
   Сайт работает на GitHub Pages без бэкенда: все данные
   (пользователи, сессия, прогресс) хранятся в браузере.
   Названия функций сохранены прежними, чтобы остальной код
   не пришлось переписывать.
   ============================================================ */

/* ---------- Ключи localStorage ---------- */

const STORAGE_KEYS = {
  users: 'anilingo_users',            // массив аккаунтов
  currentUser: 'anilingo_current_user', // ник активного пользователя
  token: 'anilingo_token',            // псевдо-токен сессии
  progress: 'anilingo_progress',      // прогресс по урокам и словам
  achievements: 'anilingo_achievements', // открытые достижения
  pendingCode: 'anilingo_pending_code',  // код подтверждения почты
  pendingEmail: 'anilingo_pending_email', // почта, ожидающая подтверждения
  avatar: 'avatar'                   // выбранный аватар (для гостя)
};

// Сколько живёт код подтверждения (10 минут)
const CODE_TTL = 10 * 60 * 1000;

/* ---------- Работа с localStorage ---------- */

/**
 * Читает JSON из localStorage. Если данных нет или они битые —
 * возвращает значение по умолчанию.
 */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (error) {
    return fallback;
  }
}

/** Записывает значение в localStorage как JSON. */
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // Например, переполнение хранилища или запрет приватного режима
    return false;
  }
}

/* ---------- Пользователи ---------- */

/** Возвращает массив всех аккаунтов. */
function getUsers() {
  const users = readJSON(STORAGE_KEYS.users, []);
  return Array.isArray(users) ? users : [];
}

/** Сохраняет массив аккаунтов. */
function saveUsers(users) {
  writeJSON(STORAGE_KEYS.users, users);
}

/** Ищет пользователя по нику без учёта регистра. */
function findUserByNickname(nickname) {
  const needle = String(nickname || '').trim().toLowerCase();
  return getUsers().find(user => String(user.username).toLowerCase() === needle) || null;
}

/** Ищет пользователя по почте без учёта регистра. */
function findUserByEmail(email) {
  const needle = String(email || '').trim().toLowerCase();
  return getUsers().find(user => String(user.email).toLowerCase() === needle) || null;
}

/** Обновляет запись пользователя (по прежнему нику). */
function updateUser(oldNickname, patch) {
  const users = getUsers();
  const index = users.findIndex(
    user => String(user.username).toLowerCase() === String(oldNickname).toLowerCase()
  );

  if (index === -1) return null;

  users[index] = Object.assign({}, users[index], patch);
  saveUsers(users);
  return users[index];
}

/* ---------- Сессия ---------- */

/** Генерирует случайный токен (32 символа). */
function generateToken() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789';
  let token = '';

  // crypto.getRandomValues есть во всех современных браузерах
  if (window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint32Array(32);
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < 32; i++) token += alphabet[bytes[i] % alphabet.length];
    return token;
  }

  // Запасной вариант
  for (let i = 0; i < 32; i++) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return token;
}

/** Записывает сессию: токен и ник текущего пользователя. */
function setSession(user) {
  const token = generateToken();

  localStorage.setItem(STORAGE_KEYS.currentUser, user.username);
  localStorage.setItem(STORAGE_KEYS.token, token);

  // Старые ключи мог оставить предыдущий вариант сайта — убираем
  localStorage.removeItem('token');
  localStorage.removeItem('username');

  return token;
}

/** Очищает сессию. */
function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem('token');
  localStorage.removeItem('username');
}

/** Текущий пользователь или null. */
function getCurrentUser() {
  const nickname = localStorage.getItem(STORAGE_KEYS.currentUser);
  if (!nickname) return null;
  return findUserByNickname(nickname);
}

/** Ник текущего пользователя. */
function getUsername() {
  const user = getCurrentUser();
  return user ? user.username : '';
}

/** Токен сессии. */
function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token) || '';
}

/**
 * Авторизован ли пользователь.
 * Проверяем и токен, и запись пользователя: если аккаунт удалён
 * из хранилища, сессия считается недействительной.
 */
function isAuthorized() {
  return Boolean(getToken()) && Boolean(getCurrentUser());
}

/* ---------- Коды подтверждения ---------- */

/** Генерирует код из 10 символов (латиница и цифры). */
function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/** Сохраняет код и почту, для которой он выпущен. */
function savePendingCode(email, code) {
  writeJSON(STORAGE_KEYS.pendingCode, {
    email: String(email).toLowerCase(),
    code: code,
    createdAt: Date.now()
  });
  localStorage.setItem(STORAGE_KEYS.pendingEmail, email);
}

/** Проверяет код: совпадение, срок жизни и почту. */
function checkPendingCode(email, code) {
  const pending = readJSON(STORAGE_KEYS.pendingCode, null);

  if (!pending) {
    return { ok: false, message: 'Код не найден. Запросите новый.' };
  }

  if (Date.now() - pending.createdAt > CODE_TTL) {
    return { ok: false, message: 'Код истёк. Запросите новый.' };
  }

  if (String(pending.email) !== String(email).toLowerCase()) {
    return { ok: false, message: 'Код выпущен для другой почты.' };
  }

  if (String(pending.code).toUpperCase() !== String(code).toUpperCase()) {
    return { ok: false, message: 'Код неверный.' };
  }

  return { ok: true };
}

/* ---------- Регистрация и вход ---------- */

/**
 * «Отправка» кода на почту.
 * В демо-режиме письмо не уходит: код возвращается в ответе,
 * а страница показывает его в уведомлении.
 */
async function apiSendCode(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
    return { ok: false, data: { message: 'Введите корректный адрес почты' } };
  }

  const code = generateCode();
  savePendingCode(cleanEmail, code);

  return {
    ok: true,
    data: {
      demo: true,
      code: code,
      message: 'Код готов. В демо-режиме письмо не отправляется — код показан на экране.'
    }
  };
}

/** Проверка кода подтверждения. */
async function apiVerifyCode(email, code) {
  const result = checkPendingCode(email, code);

  if (!result.ok) {
    return { ok: false, data: { message: result.message } };
  }

  return { ok: true, data: { verified: true } };
}

/**
 * Регистрация нового аккаунта.
 * Проверяет занятость ника и почты, затем сразу входит.
 */
async function apiRegister(nickname, email, password) {
  const nick = String(nickname || '').trim();
  const mail = String(email || '').trim().toLowerCase();

  if (!/^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/.test(nick)) {
    return { ok: false, data: { message: 'Ник: 3–20 символов, буквы, цифры, _ или -' } };
  }

  if (findUserByNickname(nick)) {
    return { ok: false, data: { message: 'Этот ник уже занят' } };
  }

  if (findUserByEmail(mail)) {
    return { ok: false, data: { message: 'На эту почту уже есть аккаунт' } };
  }

  if (String(password || '').length < 8) {
    return { ok: false, data: { message: 'Пароль должен быть не короче 8 символов' } };
  }

  // Создаём запись аккаунта
  const user = {
    username: nick,
    email: mail,
    password: String(password),
    avatar: localStorage.getItem(STORAGE_KEYS.avatar) || '',
    createdAt: new Date().toISOString()
  };

  const users = getUsers();
  users.push(user);
  saveUsers(users);

  // Сразу авторизуем
  const token = setSession(user);
  localStorage.removeItem(STORAGE_KEYS.pendingCode);

  return {
    ok: true,
    data: { token: token, username: user.username, avatar: user.avatar }
  };
}

/**
 * Вход по нику и паролю.
 * Дополнительно принимает почту вместо ника — так удобнее.
 */
async function apiLogin(loginValue, password) {
  const login = String(loginValue || '').trim();
  const pass = String(password || '');

  // Вход по почте. Старый способ — по нику — оставляем для совместимости:
  // так входят те, у кого в сохранённых данных ещё ник.
  const user = login.includes('@') ? findUserByEmail(login) : findUserByNickname(login);

  if (!user) {
    return { ok: false, data: { message: 'Аккаунт с такой почтой не найден' } };
  }

  if (String(user.password) !== pass) {
    return { ok: false, data: { message: 'Неверный пароль' } };
  }

  const token = setSession(user);

  return {
    ok: true,
    data: { token: token, username: user.username, avatar: user.avatar }
  };
}

/** Выход: чистим сессию, данные аккаунтов остаются. */
async function apiLogout() {
  clearSession();
  return { ok: true, data: { loggedOut: true } };
}

/**
 * Удаляет текущий аккаунт из localStorage.
 * Прогресс и настройки остаются — они привязаны к браузеру,
 * но войти в удалённый аккаунт уже нельзя.
 */
async function apiDeleteAccount() {
  const user = getCurrentUser();
  if (!user) return { ok: false, data: { message: 'Нет активного аккаунта' } };

  const users = getUsers().filter(item => item.username !== user.username);
  saveUsers(users);

  clearSession();
  return { ok: true, data: { username: user.username } };
}

/* ---------- Сброс и смена пароля ---------- */

/**
 * Сброс забытого пароля.
 * В демо-режиме новый пароль генерируется и показывается
 * пользователю, чтобы он мог войти.
 */
async function apiResetPassword(email, newPassword) {
  const user = findUserByEmail(email);

  if (!user) {
    return { ok: false, data: { message: 'Аккаунт с такой почтой не найден' } };
  }

  // Если пароль не передан — генерируем временный из 8 символов
  const temporary = newPassword || generateCode().slice(0, 8).toLowerCase();

  updateUser(user.username, { password: String(temporary) });

  return {
    ok: true,
    data: {
      temporaryPassword: temporary,
      message: 'Пароль обновлён'
    }
  };
}

/** Смена пароля: старый → новый. */
async function apiChangePassword(oldPassword, newPassword) {
  const user = getCurrentUser();

  if (!user) {
    return { ok: false, data: { message: 'Нужно войти в аккаунт' } };
  }

  if (String(user.password) !== String(oldPassword || '')) {
    return { ok: false, data: { message: 'Текущий пароль указан неверно' } };
  }

  if (String(newPassword || '').length < 8) {
    return { ok: false, data: { message: 'Новый пароль должен быть не короче 8 символов' } };
  }

  updateUser(user.username, { password: String(newPassword) });
  return { ok: true, data: { changed: true } };
}

/* ---------- Смена ника и почты ---------- */

/** Смена ника с проверкой занятости. */
async function apiChangeNickname(nickname) {
  const user = getCurrentUser();
  const nick = String(nickname || '').trim();

  if (!user) {
    return { ok: false, data: { message: 'Нужно войти в аккаунт' } };
  }

  if (!/^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/.test(nick)) {
    return { ok: false, data: { message: 'Ник: 3–20 символов, буквы, цифры, _ или -' } };
  }

  const busy = findUserByNickname(nick);
  if (busy && busy.username !== user.username) {
    return { ok: false, data: { message: 'Этот ник уже занят' } };
  }

  updateUser(user.username, { username: nick });
  localStorage.setItem(STORAGE_KEYS.currentUser, nick);

  return { ok: true, data: { username: nick } };
}

/** Запрос кода на новую почту. */
async function apiChangeEmailRequest(newEmail) {
  const user = getCurrentUser();
  const mail = String(newEmail || '').trim().toLowerCase();

  if (!user) {
    return { ok: false, data: { message: 'Нужно войти в аккаунт' } };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
    return { ok: false, data: { message: 'Введите корректный адрес почты' } };
  }

  const busy = findUserByEmail(mail);
  if (busy && busy.username !== user.username) {
    return { ok: false, data: { message: 'Эта почта уже используется' } };
  }

  const code = generateCode();
  savePendingCode(mail, code);

  return { ok: true, data: { demo: true, code: code } };
}

/** Подтверждение новой почты кодом. */
async function apiChangeEmailConfirm(newEmail, code) {
  const user = getCurrentUser();
  const mail = String(newEmail || '').trim().toLowerCase();

  if (!user) {
    return { ok: false, data: { message: 'Нужно войти в аккаунт' } };
  }

  const result = checkPendingCode(mail, code);
  if (!result.ok) {
    return { ok: false, data: { message: result.message } };
  }

  updateUser(user.username, { email: mail });
  localStorage.removeItem(STORAGE_KEYS.pendingCode);

  return { ok: true, data: { email: mail } };
}

/* ---------- Выгрузка данных ---------- */

/** Все данные аккаунта для кнопки «Скачать мои данные». */
function getAccountData() {
  const user = getCurrentUser();

  return {
    account: user
      ? { username: user.username, email: user.email, avatar: user.avatar, createdAt: user.createdAt }
      : null,
    progress: readJSON(STORAGE_KEYS.progress, {}),
    achievements: readJSON(STORAGE_KEYS.achievements, []),
    settings: readJSON('settings', {}),
    exportedAt: new Date().toISOString()
  };
}

  /* ---------- Наружу ---------- */

  return {
    STORAGE_KEYS: STORAGE_KEYS,
    readJSON: readJSON,
    writeJSON: writeJSON,
    getUsers: getUsers,
    updateUser: updateUser,
    findUserByNickname: findUserByNickname,
    findUserByEmail: findUserByEmail,
    getCurrentUser: getCurrentUser,
    getUsername: getUsername,
    getToken: getToken,
    isAuthorized: isAuthorized,
    generateToken: generateToken,
    sendCode: apiSendCode,
    verifyCode: apiVerifyCode,
    register: apiRegister,
    login: apiLogin,
    logout: apiLogout,
    deleteAccount: apiDeleteAccount,
    resetPassword: apiResetPassword,
    changePassword: apiChangePassword,
    changeNickname: apiChangeNickname,
    changeEmailRequest: apiChangeEmailRequest,
    changeEmailConfirm: apiChangeEmailConfirm,
    getAccountData: getAccountData,
    setSession: setSession,
    clearSession: clearSession,
    savePendingCode: savePendingCode
  };
})();
