/* ============================================================
   google.js — вход через Google на стороне браузера

   Две страницы пользуются этим файлом:

     register.html         — кнопка «Войти через Google» и показ
                             причины, если Google не пустил;
     complete-profile.html — принимает токен из адреса, проверяет
                             его на сервере и просит ник с паролем,
                             если аккаунт создан впервые.

   Серверную часть смотри в server/google.js и server/routes/google.js.
   Обычный вход по почте и паролю сюда не заходит — он остался
   в js/auth.js и js/api.js без изменений.
   ============================================================ */

'use strict';

// Почему Google не пустил — понятным языком.
// Коды ставит server/routes/google.js в адресе: #google_error=код
const GOOGLE_ERROR_TEXT = {
  'not-configured': 'На сервере не заданы ключи GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET. Пока войдите по почте и паролю.',
  'state': 'Ссылка устарела или уже использована. Нажмите «Войти через Google» ещё раз.',
  'denied': 'Вход отменён или доступ не выдан. Можно попробовать снова или войти по почте.',
  'no-email': 'Google не передал почту. Без неё связать аккаунт нельзя.',
  'server': 'Сервер не смог завершить вход. Попробуйте через минуту.'
};

// Куда вернуть после входа. Сервер присылает это в адресе,
// а мы держим здесь, пока человек придумывает ник.
let googleReturnNext = '/profile';

// Настроен ли вход через Google на сервере: null — ещё не спрашивали
let googleAvailable = null;

/* ---------- Адреса ---------- */

/**
 * Приводит адрес возврата к безопасному виду.
 * Только путь на своём сайте: чужие домены и «//site» отбрасываем,
 * иначе через ссылку можно увести человека на подставную страницу.
 */
function googleSafeNext(value) {
  let next = String(value || '').trim();

  if (!next) return '/profile';

  // Схема в начале («https://…», «javascript:…») — точно не наш путь
  if (/^[a-z][a-z0-9+.-]*:/i.test(next)) return '/profile';

  if (next.charAt(0) !== '/') next = '/' + next;

  // «//evil.com» — это чужой сайт, а не путь
  if (next.charAt(1) === '/' || next.includes('\\')) return '/profile';

  return next;
}

/** Куда вернуть человека после входа: страница, куда он шёл, или профиль. */
function googleNextPath() {
  let stored = '';

  try {
    stored = sessionStorage.getItem('redirectAfterLogin') || '';
  } catch (error) {
    stored = '';
  }

  return googleSafeNext(stored || '/profile');
}

/** Полный адрес начала входа на сервере. */
function googleLoginUrl(next) {
  return apiUrl('/auth/google') + '?next=' + encodeURIComponent(googleSafeNext(next));
}

/* ---------- Настроен ли вход ---------- */

/**
 * Спрашивает у сервера, есть ли ключи Google (GET /api/health).
 * Ответ запоминается: повторные нажатия не ходят в сеть.
 */
async function googleCheck() {
  if (googleAvailable !== null) return googleAvailable;

  try {
    const response = await apiFetch(apiUrl('/api/health'), { method: 'GET' }, 3000);

    if (!response.ok) {
      googleAvailable = false;
      return googleAvailable;
    }

    const data = await response.json();
    googleAvailable = Boolean(data && data.ok && data.google);
  } catch (error) {
    // Сервер не отвечает или сайт открыт без него (GitHub Pages)
    googleAvailable = false;
  }

  return googleAvailable;
}

/* ---------- Кнопка «Войти через Google» ---------- */

/**
 * Нажатие на кнопку на странице входа.
 *
 * Проверяем, что сервер вообще умеет Google: без ключей или без
 * сервера лучше честно сказать это сейчас, чем увести человека
 * на страницу с ошибкой Google.
 */
async function googleLogin() {
  const button = document.querySelector('.google-btn');

  if (button) button.classList.add('is-busy');

  const ready = await googleCheck();

  if (!ready) {
    if (button) button.classList.remove('is-busy');

    const mode = typeof apiModeNow === 'function' ? await apiModeNow() : 'local';

    showToast(
      'Вход через Google',
      mode === 'remote'
        ? 'На сервере не заданы ключи Google. Пока войдите по почте и паролю.'
        : 'Сервер недоступен — вход через Google работает только на основном сайте.',
      'warning',
      { duration: 6500 }
    );

    return;
  }

  window.location.href = googleLoginUrl(googleNextPath());
}

/* ---------- Возврат с кодом ошибки на странице входа ---------- */

/**
 * Если в адресе есть #google_error=…, показываем причину и чистим
 * адрес: перезагрузка страницы не должна повторять уведомление.
 */
function googleHandleErrorHash() {
  const params = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
  const reason = params.get('google_error');

  if (!reason) return;

  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch (error) {
    // старый браузер — адрес останется как был
  }

  const text = GOOGLE_ERROR_TEXT[reason] || GOOGLE_ERROR_TEXT.server;

  if (typeof showToast === 'function') {
    showToast('Вход через Google не удался', text, 'error', { duration: 7500 });
  }
}

/* ---------- Страница complete-profile ---------- */

/** Показывает состояние ошибки вместо формы. */
function googleShowError(text) {
  const loading = document.getElementById('googleLoading');
  const form = document.getElementById('googleProfileForm');
  const box = document.getElementById('googleErrorState');
  const message = document.getElementById('googleErrorText');

  if (loading) loading.classList.add('hidden');
  if (form) {
    form.classList.add('hidden');
    form.classList.remove('active');
  }
  if (box) box.classList.remove('hidden');
  if (message && text) message.textContent = text;
}

/** Показывает форму «ник и пароль». */
function googleShowForm(user) {
  const loading = document.getElementById('googleLoading');
  const form = document.getElementById('googleProfileForm');
  const box = document.getElementById('googleErrorState');
  const email = document.getElementById('googleEmail');

  if (loading) loading.classList.add('hidden');
  if (box) box.classList.add('hidden');
  if (email) email.textContent = user.email || '';

  if (!form) return;

  // .auth-form по умолчанию скрыт (display: none) и показывается
  // только классом .active — одного снятия .hidden мало
  form.classList.remove('hidden');
  form.classList.add('active');

  // Ник из почты: берём часть до @, если она уже похожа на ник
  const nick = document.getElementById('googleNickname');
  const local = String(user.email || '').split('@')[0] || '';

  if (nick && !nick.value && typeof isValidNickname === 'function' && isValidNickname(local)) {
    nick.value = local;
  }

  const password = document.getElementById('googlePassword');

  if (nick && !nick.value) nick.focus();
  else if (password) password.focus();
}

/**
 * Похож ли текст на наш токен: три части через точку, только
 * допустимые в base64url символы. Нужно, чтобы мусор в адресе не
 * уходил в заголовок Authorization — там живут только ASCII-символы.
 */
function googleLooksLikeToken(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || ''));
}

/**
 * Принимает токен из адреса после возврата с google.com.
 *
 * Порядок: токен → кэш сессии → проверка на сервере → либо форма
 * для нового аккаунта, либо сразу внутрь сайта.
 */
async function googleHandleReturn() {
  const params = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
  const token = params.get('token') || '';

  googleReturnNext = googleSafeNext(params.get('next'));

  // Токен не должен оставаться ни в адресной строке, ни в истории
  if (window.location.hash) {
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (error) {
      // ничего страшного: адрес просто останется как был
    }
  }

  if (!token) {
    // Зашли на страницу сами, без Google: если уже вошли — в профиль
    if (typeof isAuthorized === 'function' && isAuthorized()) {
      window.location.replace('profile');
      return;
    }

    googleShowError('Здесь завершается вход через Google. Начните его на странице входа — кнопкой «Войти через Google».');
    return;
  }

  // Мусор в адресе — не наша сессия. Сервер такое всё равно отвергнет,
  // но незачем отправлять его в заголовке запроса
  if (!googleLooksLikeToken(token)) {
    googleShowError('Ссылка устарела или повреждена. Начните вход через Google заново — на странице входа.');
    return;
  }

  if (typeof apiSaveToken !== 'function') {
    googleShowError('Не загрузился модуль данных. Обновите страницу.');
    return;
  }

  apiSaveToken(token);

  const result = await apiMe();

  if (!result.ok) {
    googleShowError(result.data.message || 'Сессия не найдена. Начните вход через Google заново.');
    return;
  }

  const user = result.data.user;

  // Аккаунт уже с ником и паролем — знакомство не нужно
  if (!user.needsProfile) {
    apiAcceptSession(user, token);
    window.location.replace(googleReturnNext);
    return;
  }

  googleShowForm(user);
}

/* ---------- Форма «ник и пароль» ---------- */

/** Индикатор сложности пароля (три полоски, как при регистрации). */
function googleUpdateStrength(value) {
  const bars = document.querySelectorAll('#googleStrength i');
  if (!bars.length) return;

  const text = String(value || '');
  let score = 0;

  if (text.length >= 8) score++;
  if (/[A-Za-zА-Яа-я]/.test(text) && /\d/.test(text)) score++;
  if (text.length >= 12 || /[^A-Za-zА-Яа-я0-9]/.test(text)) score++;

  const className = score <= 1 ? 'on-weak' : score === 2 ? 'on-mid' : 'on-good';

  bars.forEach((bar, index) => {
    bar.className = '';
    if (index < score) bar.classList.add(className);
  });
}

/**
 * Отправка ника и пароля на POST /api/auth/complete-google-profile.
 * Почту не передаём: она уже в аккаунте, её дал Google.
 */
async function completeGoogleProfile() {
  if (typeof clearFieldErrors === 'function') clearFieldErrors();

  const nickInput = document.getElementById('googleNickname');
  const passInput = document.getElementById('googlePassword');
  const button = document.getElementById('googleCompleteBtn');

  const username = nickInput ? nickInput.value.trim() : '';
  const password = passInput ? passInput.value : '';

  if (typeof isValidNickname === 'function' && !isValidNickname(username)) {
    setFieldError('googleNickname', 'Ник: 3–20 символов, буквы, цифры, _ или -');
    if (nickInput) nickInput.focus();
    return;
  }

  if (password.length < 8) {
    setFieldError('googlePassword', 'Пароль должен быть не короче 8 символов');
    if (passInput) passInput.focus();
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Сохраняем…';
  }

  const result = await apiCompleteGoogleProfile(username, password);

  if (!result.ok) {
    if (button) {
      button.disabled = false;
      button.textContent = 'Готово — войти';
    }

    // Занятый ник — ошибка поля, остальное показываем уведомлением
    if (result.status === 409) {
      setFieldError('googleNickname', result.data.message);
      if (nickInput) nickInput.focus();
      return;
    }

    showToast('Не удалось сохранить', result.data.message || 'Попробуйте ещё раз', 'error');
    return;
  }

  if (typeof updateHeaderAuth === 'function') updateHeaderAuth();

  showToast('Добро пожаловать, ' + result.data.username + '!', 'Аккаунт готов — можно учиться', 'success', {
    icon: 'heart',
    duration: 3600
  });

  setTimeout(() => window.location.replace(googleReturnNext), 700);
}

/* ---------- Запуск ---------- */

document.addEventListener('DOMContentLoaded', () => {
  const page = document.querySelector('meta[name="anilingo-page"]');
  const name = page ? String(page.getAttribute('content') || '') : '';

  if (name === 'complete-profile') {
    googleHandleReturn().catch(() => {
      googleShowError('Не удалось проверить вход. Обновите страницу и попробуйте снова.');
    });
    return;
  }

  googleHandleErrorHash();
});

/* Экспорт в глобальную область */
window.googleLogin = googleLogin;
window.googleUpdateStrength = googleUpdateStrength;
window.completeGoogleProfile = completeGoogleProfile;
window.googleHandleReturn = googleHandleReturn;
window.googleSafeNext = googleSafeNext;
window.googleLoginUrl = googleLoginUrl;
