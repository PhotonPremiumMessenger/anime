/* ============================================================
   routes/auth.js — регистрация, вход, коды, пароль, почта

   Логика та же, что была на статичной версии сайта:
   ник + почта + пароль, подтверждение почты кодом из письма.
   Никакого OAuth и «Войти через Google» здесь нет и не будет:
   Google используется только как почтовый сервис в mailer.js.
   ============================================================ */

'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../db');
const { sendCodeEmail } = require('../mailer');
const { signToken, requireAuth, publicUser } = require('../auth');

const router = express.Router();

/* ---------- Вспомогательные ---------- */

// Те же правила, что проверяет фронтенд
const NICK_RE = /^[A-Za-zА-Яа-яЁё0-9_-]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Код из 10 символов: латиница без похожих букв и цифры
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code = '';
  for (let i = 0; i < 10; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Ответ с ошибкой: одинаковый формат для всех маршрутов. */
function fail(res, status, message) {
  return res.status(status).json({ message: message });
}

/* ---------- Почта: код подтверждения ---------- */

/**
 * POST /api/auth/send-code
 * { email, purpose }
 *
 * purpose:
 *   register     — новая почта, аккаунта быть не должно
 *   reset        — сброс пароля, аккаунт должен быть
 *   change-email — смена почты у вошедшего пользователя
 */
router.post('/send-code', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return fail(res, 400, 'Введите корректный адрес почты');
    }

    const existing = db.findUserByEmail(email);

    /**
     * Назначение кода. Интерфейс не всегда его передаёт:
     * одна и та же кнопка «Отправить код» работает и при
     * регистрации, и при удалении аккаунта. Тогда решаем по
     * состоянию базы:
     *   почты нет в базе      → register
     *   почта есть            → delete (подтверждение удаления)
     * Явно переданное значение всегда главнее.
     */
    let purpose = ['register', 'reset', 'change-email', 'delete'].includes(req.body.purpose)
      ? req.body.purpose
      : (existing ? 'delete' : 'register');

    if (purpose === 'register' && existing) {
      return fail(res, 409, 'На эту почту уже есть аккаунт');
    }

    if ((purpose === 'reset' || purpose === 'change-email' || purpose === 'delete') && !existing) {
      return fail(res, 404, 'Аккаунт с такой почтой не найден');
    }

    // Код на удаление высылаем только владельцу аккаунта
    if (purpose === 'delete') {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      const payload = token ? require('../auth').verifyToken(token) : null;

      if (!payload || Number(payload.sub) !== Number(existing.id)) {
        return fail(res, 403, 'Код на удаление высылается только владельцу аккаунта');
      }
    }

    // Не больше 6 писем в час на один адрес
    if (db.countCodesLastHour(email) >= 6) {
      return fail(res, 429, 'Слишком много запросов. Попробуйте через час');
    }

    const code = generateCode();
    db.issueCode(email, code, purpose);

    const delivery = await sendCodeEmail(email, code, purpose);

    return res.json({
      ok: true,
      purpose: purpose,
      // demo — только когда на сервере не настроена почта
      demo: !delivery.delivered,
      code: delivery.delivered ? undefined : delivery.demoCode,
      message: delivery.delivered
        ? 'Код отправлен на ' + email
        : 'Демо-режим: почта не настроена, код показан на экране'
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/auth/verify-code
 * { email, code, purpose }
 *
 * Помечает код проверенным и возвращает короткоживущий
 * verifyToken, который затем принимает /register.
 */
router.post('/verify-code', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim().toUpperCase();

  // Назначение не передали — подойдёт любой свежий код для этой почты
  const known = ['register', 'reset', 'change-email', 'delete'];
  const purpose = known.includes(req.body.purpose) ? req.body.purpose : null;

  const result = db.checkCode(email, code, purpose);

  if (!result.ok) {
    return fail(res, 400, result.message);
  }

  db.markCodeVerified(result.record);

  return res.json({ ok: true, verified: true });
});

/* ---------- Регистрация ---------- */

/**
 * POST /api/auth/register
 * { username, email, password }
 *
 * Аккаунт создаётся только если для этой почты уже был
 * проверенный код (шаг /verify-code).
 */
router.post('/register', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!NICK_RE.test(username)) {
      return fail(res, 400, 'Ник: 3–20 символов, буквы, цифры, _ или -');
    }

    if (!EMAIL_RE.test(email)) {
      return fail(res, 400, 'Введите корректный адрес почты');
    }

    if (password.length < 8) {
      return fail(res, 400, 'Пароль должен быть не короче 8 символов');
    }

    if (db.findUserByUsername(username)) {
      return fail(res, 409, 'Этот ник уже занят');
    }

    if (db.findUserByEmail(email)) {
      return fail(res, 409, 'На эту почту уже есть аккаунт');
    }

    // Код должен быть проверен на шаге выше
    const record = db.getLatestCode(email, 'register');
    if (!record || !Number(record.verified) || Number(record.used)) {
      return fail(res, 403, 'Сначала подтвердите почту кодом');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = db.createUser({
      username: username,
      email: email,
      passwordHash: passwordHash,
      avatar: req.body.avatar || null
    });

    db.markCodeUsed(record);
    db.saveProfile(user.id, { xp: 0, level: 1 });

    const token = signToken(user);
    return res.status(201).json({ ok: true, token: token, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

/* ---------- Вход и выход ---------- */

/**
 * POST /api/auth/login
 * { login, password } — login это ник или почта
 */
router.post('/login', async (req, res, next) => {
  try {
    const login = String(req.body.login || '').trim();
    const password = String(req.body.password || '');

    const user = login.includes('@')
      ? db.findUserByEmail(login)
      : db.findUserByUsername(login);

    if (!user) {
      return fail(res, 404, 'Пользователь с таким ником не найден');
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return fail(res, 401, 'Неверный пароль');
    }

    const token = signToken(user);
    return res.json({ ok: true, token: token, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/auth/logout
 * Сервер данные не трогает — только подтверждает выход.
 */
router.post('/logout', (req, res) => {
  res.json({ ok: true, loggedOut: true });
});

/** GET /api/auth/me — кто сейчас вошёл. */
router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: publicUser(req.user) });
});

/* ---------- Пароль ---------- */

/** POST /api/auth/reset-password { email, code, password } */
router.post('/reset-password', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim().toUpperCase();
    const password = String(req.body.password || '');

    if (password.length < 8) {
      return fail(res, 400, 'Пароль должен быть не короче 8 символов');
    }

    const result = db.checkCode(email, code, 'reset');
    if (!result.ok) {
      return fail(res, 400, result.message);
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return fail(res, 404, 'Аккаунт с такой почтой не найден');
    }

    const hash = await bcrypt.hash(password, 10);
    db.db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hash, db.nowIso(), user.id);
    db.markCodeUsed(result.record);

    return res.json({ ok: true, changed: true });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/auth/forgot-password { email }
 *
 * Генерирует временный пароль и отправляет его на почту.
 * В демо-режиме (почта не настроена) возвращает пароль в ответе,
 * чтобы им можно было сразу войти — как было на статичной версии.
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return fail(res, 400, 'Введите корректный адрес почты');
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return fail(res, 404, 'Аккаунт с такой почтой не найден');
    }

    // Временный пароль: 8 символов, легко прочитать в письме
    const temporary = generateCode().slice(0, 8).toLowerCase();
    const hash = await bcrypt.hash(temporary, 10);

    db.db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hash, db.nowIso(), user.id);

    // Отправляем письмо с тем же шаблоном, что и для кодов
    const { sendCodeEmail } = require('../mailer');
    const delivery = await sendCodeEmail(email, temporary, 'reset');

    return res.json({
      ok: true,
      demo: !delivery.delivered,
      temporaryPassword: delivery.delivered ? undefined : temporary,
      message: delivery.delivered
        ? 'Новый пароль отправлен на ' + email
        : 'Демо-режим: пароль показан на экране'
    });
  } catch (error) {
    return next(error);
  }
});

/** PUT /api/auth/password { oldPassword, newPassword } */
router.put('/password', requireAuth, async (req, res, next) => {
  try {
    const oldPassword = String(req.body.oldPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (newPassword.length < 8) {
      return fail(res, 400, 'Новый пароль должен быть не короче 8 символов');
    }

    const matches = await bcrypt.compare(oldPassword, req.user.password_hash);
    if (!matches) {
      return fail(res, 401, 'Текущий пароль указан неверно');
    }

    const hash = await bcrypt.hash(newPassword, 10);
    db.db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hash, db.nowIso(), req.user.id);

    return res.json({ ok: true, changed: true });
  } catch (error) {
    return next(error);
  }
});

/* ---------- Ник и почта ---------- */

/** PUT /api/auth/nickname { username } */
router.put('/nickname', requireAuth, (req, res) => {
  const username = String(req.body.username || '').trim();

  if (!NICK_RE.test(username)) {
    return fail(res, 400, 'Ник: 3–20 символов, буквы, цифры, _ или -');
  }

  const busy = db.findUserByUsername(username);
  if (busy && busy.id !== req.user.id) {
    return fail(res, 409, 'Этот ник уже занят');
  }

  db.db.prepare('UPDATE users SET username = ?, username_key = ?, updated_at = ? WHERE id = ?')
    .run(username, db.normalizeKey(username), db.nowIso(), req.user.id);

  const updated = db.findUserById(req.user.id);
  return res.json({ ok: true, user: publicUser(updated), token: signToken(updated) });
});

/** POST /api/auth/email/request { email } — код на новую почту. */
router.post('/email/request', requireAuth, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return fail(res, 400, 'Введите корректный адрес почты');
    }

    const busy = db.findUserByEmail(email);
    if (busy && busy.id !== req.user.id) {
      return fail(res, 409, 'Эта почта уже используется');
    }

    const code = generateCode();
    db.issueCode(email, code, 'change-email');

    const delivery = await sendCodeEmail(email, code, 'change-email');

    return res.json({
      ok: true,
      demo: !delivery.delivered,
      code: delivery.delivered ? undefined : delivery.demoCode,
      message: delivery.delivered ? 'Код отправлен на ' + email : 'Демо-режим: код показан на экране'
    });
  } catch (error) {
    return next(error);
  }
});

/** POST /api/auth/email/confirm { email, code } */
router.post('/email/confirm', requireAuth, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim().toUpperCase();

  const result = db.checkCode(email, code, 'change-email');
  if (!result.ok) {
    return fail(res, 400, result.message);
  }

  db.db.prepare('UPDATE users SET email = ?, email_key = ?, updated_at = ? WHERE id = ?')
    .run(email, db.normalizeKey(email), db.nowIso(), req.user.id);
  db.markCodeUsed(result.record);

  return res.json({ ok: true, email: email });
});

/* ---------- Удаление аккаунта ---------- */

/** DELETE /api/auth/account { password } */
router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const password = String(req.body.password || '');

    if (password) {
      const matches = await bcrypt.compare(password, req.user.password_hash);
      if (!matches) {
        return fail(res, 401, 'Неверный пароль');
      }
    }

    db.wipeUserData(req.user.id);
    db.deleteUser(req.user.id);

    return res.json({ ok: true, deleted: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
