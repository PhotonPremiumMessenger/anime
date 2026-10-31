/* ============================================================
   auth.js — регистрация, вход, сброс пароля, toast-уведомления
   ============================================================ */

'use strict';

/* ---------- Состояние страницы ---------- */

// Куда положить email, который ждёт подтверждения
const PENDING_EMAIL_KEY = 'pendingEmail';
// Временный пароль до подтверждения кода (в localStorage не кладём)
let pendingPassword = '';
// На каком шаге находится модалка: 'send' — код ещё не отправлен
let codeStage = 'send';

/* ---------- Toast-уведомления ---------- */

/**
 * Показывает всплывающее уведомление справа сверху.
 *
 * @param {string} title   — заголовок
 * @param {string} message — текст
 * @param {string} type    — success | error | warning | info
 * @param {object} options — { icon, duration, rewards } — необязательные детали
 */
function showToast(title, message = '', type = 'info', options = {}) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Иконка по типу уведомления (или своя, если передали)
  const typeIcons = {
    success: 'check',
    error: 'flag',
    warning: 'bulb',
    info: 'bell'
  };

  const iconName = options.icon || typeIcons[type] || 'bell';
  const iconMarkup = (typeof icon === 'function')
    ? icon(iconName)
    : '<span>i</span>';

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;

  const duration = Number(options.duration) > 0 ? Number(options.duration) : 4500;
  toast.style.setProperty('--toast-duration', duration + 'ms');

  toast.innerHTML = `
    <div class="toast-icon">${iconMarkup}</div>
    <div class="toast-content">
      <div class="toast-title"></div>
      <div class="toast-message"></div>
      ${Array.isArray(options.rewards) && options.rewards.length
        ? '<ul class="toast-rewards"></ul>'
        : ''}
    </div>
    <button class="toast-close" aria-label="Закрыть">×</button>
    <span class="toast-progress"></span>
  `;

  // Текст подставляем через textContent — так безопаснее, чем innerHTML
  toast.querySelector('.toast-title').textContent = title;
  toast.querySelector('.toast-message').textContent = message;
  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));

  // Плашки наград: «+50 XP», «Аватар» и т.п.
  const rewardList = toast.querySelector('.toast-rewards');
  if (rewardList) {
    options.rewards.slice(0, 4).forEach(reward => {
      const item = document.createElement('li');
      if (typeof icon === 'function') {
        item.innerHTML = icon(typeof reward === 'object' && reward.icon ? reward.icon : 'sparkles');
      }
      const label = document.createElement('span');
      label.textContent = typeof reward === 'string' ? reward : (reward.text || '');
      item.appendChild(label);
      rewardList.appendChild(item);
    });
  }

  container.appendChild(toast);

  // Больше 4 уведомлений одновременно не держим
  while (container.children.length > 4) {
    removeToast(container.firstElementChild, true);
  }

  // Автоматически скрываем — время берём из опций
  const timer = setTimeout(() => removeToast(toast), duration);
  toast.dataset.timer = timer;
}

/**
 * Убирает уведомление с анимацией.
 */
function removeToast(toast, instant = false) {
  if (!toast || toast.classList.contains('hide')) return;
  clearTimeout(Number(toast.dataset.timer));

  if (instant) {
    toast.remove();
    return;
  }

  toast.classList.add('hide');
  setTimeout(() => toast.remove(), 320);
}

/* ---------- Переключение форм ---------- */

/** Показывает форму входа. */
function showLogin() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (!loginForm || !registerForm) return;

  loginForm.classList.add('active');
  registerForm.classList.remove('active');

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === 'login');
  });

  // Сбрасываем подсветку ошибок
  clearFieldErrors();
  const emailField = document.getElementById('loginEmail');
  if (emailField) emailField.focus();
}

/** Показывает форму регистрации. */
function showRegister() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (!loginForm || !registerForm) return;

  registerForm.classList.add('active');
  loginForm.classList.remove('active');

  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === 'register');
  });

  clearFieldErrors();
  const nick = document.getElementById('regNickname');
  if (nick) nick.focus();
}

/* ---------- Валидация ---------- */

/** Убирает все красные рамки и тексты ошибок. */
function clearFieldErrors() {
  document.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
}

/**
 * Помечает поле как ошибочное.
 * @param {string} fieldId — id поля ввода
 * @param {string} text    — текст ошибки
 */
function setFieldError(fieldId, text) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  const field = input.closest('.field');
  if (!field) return;

  field.classList.add('invalid');
  const errorBox = field.querySelector('.field-error');
  if (errorBox && text) errorBox.textContent = text;
}

/** Проверка ника: 3–20 символов, буквы, цифры, _ и - . */
function isValidNickname(value) {
  return /^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/.test(value);
}

/** Простая проверка почты. */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(value);
}

/* ---------- Регистрация ---------- */

/**
 * Шаг 1: проверяем поля и открываем модалку подтверждения почты.
 * Сам аккаунт создаётся после успешной проверки кода.
 */
function register() {
  clearFieldErrors();

  const nickInput = document.getElementById('regNickname');
  const emailInput = document.getElementById('regEmail');
  const passInput = document.getElementById('regPassword');
  const agreeInput = document.getElementById('regAgree');

  const nickname = nickInput ? nickInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const password = passInput ? passInput.value : '';

  let valid = true;

  if (!isValidNickname(nickname)) {
    setFieldError('regNickname', 'Ник: 3–20 символов, буквы, цифры, _ или -');
    valid = false;
  }

  if (!isValidEmail(email)) {
    setFieldError('regEmail', 'Введите корректный адрес почты');
    valid = false;
  }

  if (password.length < 8) {
    setFieldError('regPassword', 'Пароль должен быть не короче 8 символов');
    valid = false;
  }

  if (agreeInput && !agreeInput.checked) {
    showToast('Нужно согласие', 'Примите условия использования, чтобы продолжить', 'warning');
    valid = false;
  }

  if (!valid) return;

  // Запоминаем данные до подтверждения кода
  pendingPassword = password;
  localStorage.setItem(PENDING_EMAIL_KEY, email);

  // Открываем модалку
  const modal = document.getElementById('emailModal');
  const emailField = document.getElementById('codeEmail');
  const codeInput = document.getElementById('codeInput');

  if (emailField) emailField.value = email;
  if (codeInput) codeInput.value = '';
  if (modal) modal.classList.add('open');

  // Сбрасываем кнопку в состояние «Отправить код»
  codeStage = 'send';
  updateCodeButton();
  updateCodeSteps(1);

  showToast('Проверьте почту', 'Нажмите «Отправить код», чтобы получить код', 'info');
}

/* ---------- Модалка подтверждения почты ---------- */

/** Меняет текст кнопки в зависимости от шага. */
function updateCodeButton() {
  const btn = document.getElementById('codeActionBtn');
  if (!btn) return;
  btn.textContent = codeStage === 'send' ? 'Отправить код' : 'Проверить код';
}

/** Подсвечивает шаги «почта → код → готово». */
function updateCodeSteps(activeStep) {
  document.querySelectorAll('.code-step').forEach((step, index) => {
    const number = index + 1;
    step.classList.toggle('active', number === activeStep);
    step.classList.toggle('done', number < activeStep);
  });
}

/** Одна кнопка на два действия: сначала отправка, потом проверка. */
function handleCodeAction() {
  if (codeStage === 'send') {
    sendCode();
  } else {
    verifyCode();
  }
}

/** Отправляет код на почту. */
async function sendCode() {
  const email = (document.getElementById('codeEmail') || {}).value || localStorage.getItem(PENDING_EMAIL_KEY);
  const btn = document.getElementById('codeActionBtn');

  if (!email) {
    showToast('Ошибка', 'Почта не найдена. Заполните форму заново', 'error');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Отправляем...';
  }

  // purpose: сервер должен знать, что это регистрация, а не удаление
  const result = await apiSendCode(email, 'register');

  if (btn) btn.disabled = false;

  if (!result.ok) {
    updateCodeButton();
    showToast('Не удалось отправить код', result.data.message || 'Попробуйте позже', 'error');
    startResendCooldown();
    return;
  }

  // Переходим к шагу проверки
  codeStage = 'verify';
  updateCodeButton();
  updateCodeSteps(2);

  const codeInput = document.getElementById('codeInput');

  // Демо-режим: письмо не отправляется, код возвращается в ответе
  const demoCode = result.data && result.data.code;

  if (demoCode) {
    showToast('Ваш код: ' + demoCode, 'Демо-режим: письмо не отправляется, код действует 10 минут', 'success');
    // Подставляем код в поле — на GitHub Pages почты нет, зато всё работает
    if (codeInput) codeInput.value = demoCode;
  } else {
    showToast('Код отправлен', 'Проверьте почту ' + email, 'success');
  }

  if (codeInput) codeInput.focus();

  startResendCooldown();
}

/** Проверяет введённый код, затем создаёт аккаунт. */
async function verifyCode() {
  const email = (document.getElementById('codeEmail') || {}).value || localStorage.getItem(PENDING_EMAIL_KEY);
  const codeInput = document.getElementById('codeInput');
  const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
  const btn = document.getElementById('codeActionBtn');

  if (code.length !== 10) {
    showToast('Код неполный', 'Код состоит из 10 символов', 'warning');
    if (codeInput) codeInput.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Проверяем...';
  }

  const verifyResult = await apiVerifyCode(email, code);

  if (!verifyResult.ok) {
    if (btn) {
      btn.disabled = false;
      updateCodeButton();
    }
    showToast('Код неверный', verifyResult.data.message || 'Проверьте код и попробуйте снова', 'error');
    return;
  }

  // Код верный — создаём аккаунт
  const nickname = (document.getElementById('regNickname') || {}).value || '';
  const password = pendingPassword || (document.getElementById('regPassword') || {}).value || '';

  const registerResult = await apiRegister(nickname.trim(), email, password);

  if (btn) btn.disabled = false;

  if (!registerResult.ok) {
    updateCodeButton();
    showToast('Ошибка регистрации', registerResult.data.message || 'Попробуйте другой ник', 'error');
    return;
  }

  updateCodeSteps(3);

  // Аккаунт создан, сессия уже записана в localStorage — входим автоматически
  const data = registerResult.data || {};
  localStorage.removeItem(PENDING_EMAIL_KEY);
  pendingPassword = '';

  // Приветственная награда — новичок сразу видит, что получил
  const welcomeXP = 50;
  if (typeof addXP === 'function') addXP(welcomeXP, 'Регистрация');

  const rewards = [];
  if (typeof addXP === 'function') rewards.push({ icon: 'star', text: '+' + welcomeXP + ' XP' });
  rewards.push({ icon: 'user', text: 'Профиль' });
  rewards.push({ icon: 'cards', text: '140 слов' });
  rewards.push({ icon: 'trophy', text: '100 наград' });

  closeEmailModal();
  showToast(
    'Аккаунт создан',
    'Добро пожаловать, ' + (data.username || nickname.trim()) + '! Вот что уже доступно:',
    'success',
    { icon: 'sparkles', duration: 7000, rewards: rewards }
  );

  setTimeout(() => (window.location.href = 'profile'), 900);
}

/** Закрывает модалку подтверждения. */
function closeEmailModal() {
  const modal = document.getElementById('emailModal');
  if (modal) modal.classList.remove('open');
  codeStage = 'send';
  updateCodeButton();
}

/* ---------- Повторная отправка кода ---------- */

let resendTimer = null;

/** Запускает паузу 60 секунд для ссылки «Отправить повторно». */
function startResendCooldown() {
  const resendBtn = document.getElementById('resendCodeBtn');
  if (!resendBtn) return;

  let seconds = 60;
  clearInterval(resendTimer);

  resendBtn.disabled = true;
  resendBtn.textContent = 'Отправить повторно (60)';

  resendTimer = setInterval(() => {
    seconds -= 1;
    if (seconds <= 0) {
      clearInterval(resendTimer);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Отправить повторно';
      return;
    }
    resendBtn.textContent = 'Отправить повторно (' + seconds + ')';
  }, 1000);
}

/** Повторная отправка кода из модалки. */
async function resendCode() {
  const email = (document.getElementById('codeEmail') || {}).value;
  if (!email) return;

  const resendBtn = document.getElementById('resendCodeBtn');
  if (resendBtn) resendBtn.disabled = true;

  const result = await apiSendCode(email, 'register');

  if (result.ok) {
    showToast('Код отправлен повторно', 'Проверьте почту ' + email, 'success');
  } else {
    showToast('Ошибка', result.data.message || 'Не удалось отправить код', 'error');
  }

  startResendCooldown();
}

/* ---------- Вход ---------- */

/** Проверяет данные и выполняет вход. */
async function login() {
  clearFieldErrors();

  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const btn = document.getElementById('loginBtn');

  // Вход только по почте: ник знают все, почту — только владелец
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const password = passInput ? passInput.value : '';

  if (!isValidEmail(email)) {
    setFieldError('loginEmail', 'Введите почту, на которую регистрировались');
    if (emailInput) emailInput.focus();
    return;
  }

  if (!password) {
    setFieldError('loginPassword', 'Введите пароль');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Входим...';
  }

  const result = await apiLogin(email, password);

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }

  if (!result.ok) {
    showToast('Не удалось войти', result.data.message || 'Проверьте почту и пароль', 'error');
    return;
  }

  // Токен и ник уже записаны в localStorage внутри apiLogin
  const data = result.data || {};

  // Шапка сразу показывает ник и аватар нового аккаунта
  updateHeaderAuth();

  showToast('С возвращением!', 'Рады видеть вас снова, ' + (data.username || email), 'success', {
    icon: 'heart',
    duration: 3600
  });

  // Если пользователя выкинуло с защищённой страницы — возвращаем его туда
  // Старые вкладки могли сохранить адрес с .html — приводим к новому виду
  const redirect = String(sessionStorage.getItem('redirectAfterLogin') || '')
    .replace(/\.html(?=$|[?#])/, '');
  sessionStorage.removeItem('redirectAfterLogin');

  setTimeout(() => (window.location.href = redirect || 'profile'), 700);
}

/* ---------- Выход ---------- */

/**
 * Чистит всё, что принадлежит аккаунту: кэш настроек и прогресса,
 * токен, ник. Музыка, свой фон и флаги устройства остаются.
 */
function clearAccountCache() {
  // Основная уборка: settings, data.*, appearance.*, сессия
  if (typeof syncAfterLogout === 'function') {
    try {
      syncAfterLogout();
    } catch (error) {
      // приватный режим — добьём вручную ниже
    }
  }

  ['anilingo_current_user', 'anilingo_token', 'token', 'username',
   'anilingo_pending_code', 'anilingo_pending_email'].forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // ничего не поделать
    }
  });

  try {
    sessionStorage.removeItem('redirectAfterLogin');
  } catch (error) {
    // ничего не поделать
  }
}

/**
 * Выход из аккаунта.
 *
 * Раньше здесь вызывалась clearSession() — внутренняя функция модуля
 * ApiLocal. После разделения api.js на два файла она перестала быть
 * глобальной, выход падал с ошибкой, окно закрывалось и всё.
 *
 * Теперь: сообщаем серверу (не ждём ответа), чистим кэш аккаунта,
 * уходим на главную. Сеть не может помешать выйти.
 */
function logout() {
  // 1. Сервер забывает сессию. keepalive — чтобы запрос дошёл,
  //    даже если страница уже уходит
  try {
    if (typeof apiRequest === 'function' && typeof getToken === 'function' && getToken()) {
      apiRequest('/api/auth/logout', { method: 'POST', keepalive: true }).catch(() => {});
    }
  } catch (error) {
    // офлайн или демо-режим — не мешает выйти
  }

  // 2. Уборка в браузере: настройки, прогресс, токен
  clearAccountCache();

  try {
    localStorage.removeItem(STORAGE_KEYS.avatar);
    localStorage.removeItem(PENDING_EMAIL_KEY);

    // Уведомления и отметка «до какого уровня дошёл» принадлежат
    // аккаунту: после выхода гость не должен видеть чужие события
    localStorage.removeItem('anilingo_notifications');
    localStorage.removeItem('anilingo_notify_level');
  } catch (error) {
    // ничего не поделать
  }

  // 3. На главную
  window.location.href = './';
}

/* ---------- Сброс пароля ---------- */

/** Открывает/закрывает блок сброса пароля. */
function toggleResetBox() {
  const box = document.getElementById('resetBox');
  if (!box) return;

  box.classList.toggle('open');
  if (box.classList.contains('open')) {
    const input = document.getElementById('resetEmail');
    const loginEmail = document.getElementById('loginEmail');
    if (input && loginEmail && loginEmail.value.includes('@')) input.value = loginEmail.value.trim();
    if (input) input.focus();
  }
}

/** Отправляет запрос на сброс пароля. */
async function resetPassword() {
  const emailInput = document.getElementById('resetEmail');
  const btn = document.getElementById('resetBtn');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

  if (!isValidEmail(email)) {
    showToast('Проверьте почту', 'Введите корректный адрес почты', 'warning');
    if (emailInput) emailInput.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Отправляем...';
  }

  const result = await apiResetPassword(email);

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Отправить новый пароль';
  }

  if (!result.ok) {
    showToast('Ошибка', result.data.message || 'Не удалось отправить код', 'error');
    return;
  }

  const temporary = result.data && result.data.temporaryPassword;

  if (temporary) {
    // Почта не настроена на сервере — показываем пароль прямо здесь
    showToast('Новый пароль: ' + temporary, 'Сохраните его и войдите: почта сейчас в демо-режиме', 'success', { duration: 9000 });
    const passInput = document.getElementById('loginPassword');
    if (passInput) passInput.value = temporary;
    const emailField = document.getElementById('loginEmail');
    if (emailField) emailField.focus();
  } else {
    // Письмо ушло: пароль в письме, а не «какой-то новый»
    showToast('Письмо отправлено', 'Новый пароль придёт на ' + email + '. Войдите с ним', 'success', { duration: 7000 });
  }
}

/* ---------- Шапка: состояние авторизации ---------- */

/**
 * Обновляет шапку: если есть токен — показываем ник и аватар,
 * иначе — кнопки «Войти» и «Регистрация».
 */
function updateHeaderAuth() {
  const user = getCurrentUser();
  const authorized = isAuthorized();
  const nickname = user ? user.username : 'Игрок';

  document.body.classList.toggle('logged-in', authorized);

  document.querySelectorAll('[data-header-nick]').forEach(el => {
    el.textContent = nickname;
  });

  // Аватар — фото из аккаунта или первая буква ника (avatar.js)
  if (typeof paintAvatarSlots === 'function') {
    paintAvatarSlots();
  } else if (typeof avatarMarkup === 'function') {
    document.querySelectorAll('[data-header-avatar]').forEach(slot => {
      slot.innerHTML = avatarMarkup(nickname, { size: 34 });
    });
  }
}

/* ---------- Небольшие помощники форм ---------- */

/** Показать/скрыть пароль по кнопке с глазом. */
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (button) {
    button.classList.toggle('is-visible', isPassword);
    button.setAttribute('aria-label', isPassword ? 'Скрыть пароль' : 'Показать пароль');
  }
}

/** Индикатор сложности пароля (три полоски). */
function updatePasswordStrength(value) {
  const bars = document.querySelectorAll('#regStrength i');
  if (!bars.length) return;

  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Za-zА-Яа-я]/.test(value) && /\d/.test(value)) score++;
  if (value.length >= 12 || /[^A-Za-zА-Яа-я0-9]/.test(value)) score++;

  const className = score <= 1 ? 'on-weak' : score === 2 ? 'on-mid' : 'on-good';

  bars.forEach((bar, index) => {
    bar.className = '';
    if (index < score) bar.classList.add(className);
  });
}

/* ---------- Инициализация страницы входа ---------- */

document.addEventListener('DOMContentLoaded', () => {
  updateHeaderAuth();

  // Кнопка входа в шапке ведёт на страницу регистрации
  document.querySelectorAll('[data-goto-login]').forEach(btn => {
    btn.addEventListener('click', () => (window.location.href = 'register'));
  });

  // Enter в полях формы входа
  const loginEmail = document.getElementById('loginEmail');
  if (loginEmail) {
    loginEmail.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const pass = document.getElementById('loginPassword');
        if (pass && pass.value) login();
        else if (pass) pass.focus();
      }
    });
  }

  const loginPassword = document.getElementById('loginPassword');
  if (loginPassword) {
    loginPassword.addEventListener('keydown', event => {
      if (event.key === 'Enter') login();
    });
  }

  // Поле кода: только заглавные буквы и цифры
  const codeInput = document.getElementById('codeInput');
  if (codeInput) {
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    });
    codeInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' && codeStage === 'verify') verifyCode();
    });
  }

  // Закрытие модалки по клику на затемнение
  const emailModal = document.getElementById('emailModal');
  if (emailModal) {
    emailModal.addEventListener('click', event => {
      if (event.target === emailModal) closeEmailModal();
    });
  }
});

/* Экспорт в глобальную область */
window.showToast = showToast;
window.showRegister = showRegister;
window.showLogin = showLogin;
window.register = register;
window.login = login;
window.logout = logout;
window.resetPassword = resetPassword;
window.handleCodeAction = handleCodeAction;
window.sendCode = sendCode;
window.verifyCode = verifyCode;
window.closeEmailModal = closeEmailModal;
window.resendCode = resendCode;
window.toggleResetBox = toggleResetBox;
window.updateHeaderAuth = updateHeaderAuth;
window.togglePassword = togglePassword;
window.updatePasswordStrength = updatePasswordStrength;
window.clearFieldErrors = clearFieldErrors;
