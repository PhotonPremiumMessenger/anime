/* ============================================================
   google.js — вход через Google (OAuth 2.0)

   Здесь живёт всё, что знает про Google: настройка стратегии
   passport, проверка ответа Google и пара помощников для адресов.

   Как устроено:

     1. Браузер идёт на GET /auth/google — сервер отправляет его
        на страницу согласия Google.
     2. Google возвращает человека на GET /auth/google/callback
        с кодом подтверждения.
     3. Passport меняет код на профиль, а мы ищем аккаунт по почте:
          есть    → входим в него;
          нет     → создаём аккаунт без пароля и без ника
                    (его дозаполнят на /complete-profile);
          был вход через Google раньше, а почту в Google сменили
                  → находим по google_id и тоже пускаем.
     4. Дальше выдаём обычный JWT — тот же, что при входе по почте.

   Состояние (state) подписываем сами, коротким JWT: сессий на
   сервере нет, а без проверки state можно подсунуть чужой ответ
   Google и войти не в свой аккаунт.
   ============================================================ */

'use strict';

const jwt = require('jsonwebtoken');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const db = require('./db');

const CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || '').trim();
const CLIENT_SECRET = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();

// Тот же секрет, что у обычных токенов входа (см. auth.js)
const JWT_SECRET = process.env.JWT_SECRET || 'anilingo-dev-secret-change-me';

// Сколько живёт подписанный state: ровно столько человек может
// провести на странице согласия Google, прежде чем вернуться
const STATE_TTL = '10m';

// Какие данные просим у Google. Ничего лишнего: почта и имя профиля
const SCOPES = ['profile', 'email'];

let strategyReady = false;

/** Настроены ли ключи. Без них кнопку показывать незачем. */
function isConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

/* ---------- Адреса ---------- */

/** Убирает хвостовые слэши: из двух «https://site/» и «https://site» нужен один вид. */
function trimSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

/** Адрес, на котором сейчас работает API (за nginx — уже https). */
function baseUrl(req) {
  return trimSlash(req.protocol + '://' + req.get('host'));
}

/**
 * Куда Google вернёт человека.
 * По умолчанию — тот же домен, что у API. Если сайт живёт отдельно
 * (GitHub Pages, другой домен), адрес задаётся в .env:
 *     GOOGLE_CALLBACK_URL=https://www.anilingo.fun/auth/google/callback
 */
function callbackUrl(req) {
  const configured = trimSlash(process.env.GOOGLE_CALLBACK_URL);
  return configured || baseUrl(req) + '/auth/google/callback';
}

/**
 * Адрес сайта, на который возвращаем после входа.
 * SITE_URL — тот же, что у GOOGLE_CALLBACK_URL, только без пути:
 *     SITE_URL=https://www.anilingo.fun
 * Если не задан — берём домен, на котором пришёл запрос.
 */
function siteUrl(req) {
  return trimSlash(process.env.SITE_URL) || baseUrl(req);
}

/**
 * Куда вернуть человека внутри сайта после входа.
 * Принимаем только путь на своём сайте: «//чужой.сайт», «http://…»
 * и обратные слэши отбрасываем — иначе через ссылку можно было бы
 * увести человека на подставную страницу уже с его токеном.
 */
function safeNext(value) {
  const next = String(value || '').trim();

  if (!next || next.charAt(0) !== '/' || next.charAt(1) === '/' || next.includes('\\')) {
    return '/profile';
  }

  return next;
}

/* ---------- State ---------- */

/** Подписывает state: короткий JWT с адресом возврата. */
function signState(next) {
  return jwt.sign(
    { purpose: 'google-state', next: safeNext(next) },
    JWT_SECRET,
    { expiresIn: STATE_TTL }
  );
}

/** Проверяет state из ответа Google. Возвращает payload или null. */
function verifyState(state) {
  const value = String(state || '');

  if (!value) return null;

  try {
    const payload = jwt.verify(value, JWT_SECRET);
    if (!payload || payload.purpose !== 'google-state') return null;
    return payload;
  } catch (error) {
    // истёк, подделан, обрезан — всё это «не пускать»
    return null;
  }
}

/* ---------- Стратегия ---------- */

/**
 * Проверка профиля от Google: единственное место, где решается,
 * в какой аккаунт входить.
 *
 * Гостям здесь ничего не показывается — только отметка для маршрута:
 *   created — аккаунт создан прямо сейчас (нужен /complete-profile)
 */
function verifyProfile(req, accessToken, refreshToken, profile, done) {
  try {
    const list = Array.isArray(profile.emails) ? profile.emails : [];
    const email = String((list[0] && list[0].value) || '').trim().toLowerCase();

    // Без почты аккаунт не связать с сайтом
    if (!email) return done(null, false, { message: 'no-email' });

    const googleId = String(profile.id || '');

    // 1. Почта уже есть на сайте — входим в этот аккаунт
    let user = db.findUserByEmail(email);

    if (user) {
      // Первый вход через Google к обычному аккаунту: запоминаем
      // идентификатор, чтобы почту в Google потом можно было сменить
      if (!user.google_id && googleId) {
        user = db.setUserGoogleId(user.id, googleId);
      }

      return done(null, user, { created: false });
    }

    // 2. Почта в Google сменилась, но аккаунт уже привязан к Google
    user = db.findUserByGoogleId(googleId);
    if (user) return done(null, user, { created: false });

    // 3. Совсем новый человек: аккаунт без пароля и без ника
    user = db.createGoogleUser({ email: email, googleId: googleId });
    db.saveProfile(user.id, { xp: 0, level: 1 });

    return done(null, user, { created: true });
  } catch (error) {
    return done(error);
  }
}

/**
 * Готовит стратегию. Вызывается один раз при старте сервера.
 * Без ключей ничего не регистрирует и не падает.
 * @returns {boolean} настроен ли вход через Google
 */
function setup() {
  if (strategyReady) return isConfigured();
  strategyReady = true;

  if (!isConfigured()) {
    console.log('[google] Ключи GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET не заданы — вход через Google выключен');
    return false;
  }

  passport.use('google', new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    // Настоящий адрес подставляется в каждом запросе (callbackUrl),
    // здесь — запасной из .env, чтобы стратегия была валидной
    callbackURL: trimSlash(process.env.GOOGLE_CALLBACK_URL) || '/auth/google/callback',
    passReqToCallback: true
  }, verifyProfile));

  console.log('[google] Вход через Google включён');
  return true;
}

module.exports = {
  isConfigured,
  setup,
  scopes: SCOPES,
  baseUrl,
  siteUrl,
  callbackUrl,
  safeNext,
  signState,
  verifyState,
  passport
};
