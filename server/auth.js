/* ============================================================
   auth.js — выдача и проверка токенов

   Токен — обычный JWT, его подпись проверяется на сервере.
   В базе сессии не храним: выход из аккаунта на клиенте просто
   выбрасывает токен, а серверные данные остаются на месте
   (это и нужно по заданию — при logout настройки не теряются).
   ============================================================ */

'use strict';

const jwt = require('jsonwebtoken');
const { findUserById } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || '';

// Сколько живёт токен. 30 дней — чтобы не выкидывать с телефона.
const TOKEN_TTL = process.env.JWT_TTL || '30d';

if (!JWT_SECRET) {
  // Не падаем, но громко предупреждаем: с дефолтным секретом
  // токены можно подделать.
  console.warn('[auth] JWT_SECRET не задан. Задайте его в .env — иначе токены небезопасны.');
}

/** Подписывает токен для пользователя. */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_SECRET || 'anilingo-dev-secret-change-me',
    { expiresIn: TOKEN_TTL }
  );
}

/** Проверяет токен и возвращает полезную нагрузку или null. */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET || 'anilingo-dev-secret-change-me');
  } catch (error) {
    return null;
  }
}

/**
 * Middleware: пускает дальше только с валидным токеном.
 * Кладёт пользователя из базы в req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ message: 'Нужно войти в аккаунт' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: 'Сессия истекла. Войдите снова' });
  }

  const user = findUserById(payload.sub);
  if (!user) {
    return res.status(401).json({ message: 'Аккаунт не найден' });
  }

  req.user = user;
  return next();
}

/** Публичное представление пользователя — без хеша пароля. */
function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar || '',
    createdAt: user.created_at
  };
}

module.exports = { signToken, verifyToken, requireAuth, publicUser };
