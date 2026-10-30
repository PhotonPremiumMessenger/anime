/* ============================================================
   db.js — база данных AniLingo (SQLite)

   Используем встроенный в Node модуль node:sqlite — никаких
   нативных сборок: на сервере не нужны компиляторы и заголовки
   Node. Требуется Node.js 22.5 или новее.

   Схема:
     users         — аккаунты (ник, почта, хеш пароля)
     email_codes   — коды подтверждения почты (10 минут жизни)
     user_settings — настройки интерфейса и контента, key/value
     user_profile  — XP, уровень и прочая статистика
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

// Путь к файлу базы. По умолчанию — server/data/anilingo.db
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'anilingo.db');

// Папку может не быть — создаём
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Каскадное удаление настроек и профиля вместе с аккаунтом
db.exec('PRAGMA foreign_keys = ON;');
// WAL быстрее на чтение и не блокирует запись во время чтения
db.exec('PRAGMA journal_mode = WAL;');

/* ---------- Схема ---------- */

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    username       TEXT    NOT NULL,
    username_key   TEXT    NOT NULL UNIQUE,
    email          TEXT    NOT NULL,
    email_key      TEXT    NOT NULL UNIQUE,
    password_hash  TEXT    NOT NULL,
    avatar         TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_codes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email_key  TEXT    NOT NULL,
    code       TEXT    NOT NULL,
    purpose    TEXT    NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    verified   INTEGER NOT NULL DEFAULT 0,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_codes_lookup
    ON email_codes (email_key, purpose, used);

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    key        TEXT    NOT NULL,
    value      TEXT    NOT NULL,
    updated_at TEXT    NOT NULL,
    PRIMARY KEY (user_id, key)
  );

  CREATE TABLE IF NOT EXISTS user_profile (
    user_id    INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    xp         INTEGER NOT NULL DEFAULT 0,
    level      INTEGER NOT NULL DEFAULT 1,
    data       TEXT    NOT NULL DEFAULT '{}',
    updated_at TEXT    NOT NULL
  );
`);

/* ---------- Утилиты ---------- */

/** Текущее время в ISO-формате. */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Ключ для поиска без учёта регистра.
 * SQLite COLLATE NOCASE понимает только латиницу, поэтому ники
 * и почты приводим к нижнему регистру сами — иначе «Котоно» и
 * «котоно» оказались бы разными аккаунтами.
 */
function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

/* ---------- Пользователи ---------- */

const userQueries = {
  byId: db.prepare('SELECT * FROM users WHERE id = ?'),
  byUsername: db.prepare('SELECT * FROM users WHERE username_key = ?'),
  byEmail: db.prepare('SELECT * FROM users WHERE email_key = ?'),
  insert: db.prepare(`
    INSERT INTO users (username, username_key, email, email_key, password_hash, avatar, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updatePassword: db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'),
  updateEmail: db.prepare('UPDATE users SET email = ?, email_key = ?, updated_at = ? WHERE id = ?'),
  updateUsername: db.prepare('UPDATE users SET username = ?, username_key = ?, updated_at = ? WHERE id = ?'),
  updateAvatar: db.prepare('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?'),
  remove: db.prepare('DELETE FROM users WHERE id = ?')
};

/** Пользователь по id или null. */
function findUserById(id) {
  return userQueries.byId.get(Number(id)) || null;
}

/** Пользователь по нику (без учёта регистра) или null. */
function findUserByUsername(username) {
  return userQueries.byUsername.get(normalizeKey(username)) || null;
}

/** Пользователь по почте (без учёта регистра) или null. */
function findUserByEmail(email) {
  return userQueries.byEmail.get(normalizeKey(email)) || null;
}

/** Создаёт аккаунт и возвращает его запись. */
function createUser({ username, email, passwordHash, avatar }) {
  const time = nowIso();

  const result = userQueries.insert.run(
    String(username).trim(),
    normalizeKey(username),
    String(email).trim(),
    normalizeKey(email),
    passwordHash,
    avatar || null,
    1,
    time,
    time
  );

  return findUserById(result.lastInsertRowid);
}

/** Удаляет аккаунт вместе с настройками и профилем (каскад). */
function deleteUser(id) {
  userQueries.remove.run(Number(id));
}

/* ---------- Коды подтверждения ---------- */

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;

const codeQueries = {
  insert: db.prepare(`
    INSERT INTO email_codes (email_key, code, purpose, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `),
  latest: db.prepare(`
    SELECT * FROM email_codes
    WHERE email_key = ? AND purpose = ? AND used = 0
    ORDER BY id DESC LIMIT 1
  `),
  // Любой свежий код для почты — когда интерфейс не передал назначение
  latestAny: db.prepare(`
    SELECT * FROM email_codes
    WHERE email_key = ? AND used = 0
    ORDER BY id DESC LIMIT 1
  `),
  markVerified: db.prepare('UPDATE email_codes SET verified = 1 WHERE id = ?'),
  markUsed: db.prepare('UPDATE email_codes SET used = 1 WHERE id = ?'),
  bumpAttempts: db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?')
};

/** Сколько кодов уже выпущено для почты за последние 10 минут. */
const countRecentCodes = db.prepare(`
  SELECT COUNT(*) AS count FROM email_codes
  WHERE email_key = ? AND created_at > ?
`);

/**
 * Выпускает новый код. Старые неиспользованные коды той же почты
 * и назначения гасим — действует только последний.
 */
function issueCode(email, code, purpose) {
  db.prepare(`
    UPDATE email_codes SET used = 1
    WHERE email_key = ? AND purpose = ? AND used = 0
  `).run(normalizeKey(email), purpose);

  codeQueries.insert.run(
    normalizeKey(email),
    String(code).toUpperCase(),
    purpose,
    Date.now() + CODE_TTL_MS,
    nowIso()
  );
}

/**
 * Последний неиспользованный код.
 * purpose = null — любой (фронтенд не всегда знает назначение).
 */
function getLatestCode(email, purpose) {
  if (!purpose) {
    return codeQueries.latestAny.get(normalizeKey(email)) || null;
  }

  return codeQueries.latest.get(normalizeKey(email), purpose) || null;
}

/** Отмечает попытку ввода и, если код верный и живой, возвращает его запись. */
function checkCode(email, code, purpose) {
  const record = getLatestCode(email, purpose);

  if (!record) {
    return { ok: false, message: 'Код не найден. Запросите новый.' };
  }

  if (Number(record.expires_at) < Date.now()) {
    return { ok: false, message: 'Код истёк. Запросите новый.' };
  }

  if (Number(record.attempts) >= CODE_MAX_ATTEMPTS) {
    return { ok: false, message: 'Слишком много попыток. Запросите новый код.' };
  }

  if (String(record.code) !== String(code).trim().toUpperCase()) {
    codeQueries.bumpAttempts.run(record.id);
    return { ok: false, message: 'Код неверный.' };
  }

  return { ok: true, record };
}

/** Помечает код подтверждённым (для шага «проверить», затем «создать аккаунт»). */
function markCodeVerified(record) {
  codeQueries.markVerified.run(record.id);
}

/** Гасит код — после успешной регистрации или смены почты. */
function markCodeUsed(record) {
  codeQueries.markUsed.run(record.id);
}

/** Не выпускали ли кодов слишком часто (защита от спама письмами). */
function countCodesLastHour(email) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const row = countRecentCodes.get(normalizeKey(email), hourAgo);
  return row ? Number(row.count) : 0;
}

/* ---------- Настройки ---------- */

const settingsQueries = {
  all: db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?'),
  upsert: db.prepare(`
    INSERT INTO user_settings (user_id, key, value, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `),
  remove: db.prepare('DELETE FROM user_settings WHERE user_id = ? AND key = ?')
};

/** Все настройки пользователя как обычный объект. */
function getSettings(userId) {
  const rows = settingsQueries.all.all(Number(userId));
  const result = {};

  rows.forEach(row => {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch (error) {
      result[row.key] = row.value;
    }
  });

  return result;
}

/** Сохраняет пачку настроек (частичное обновление). */
function saveSettings(userId, patch) {
  const time = nowIso();

  Object.keys(patch || {}).forEach(key => {
    const value = patch[key];

    // null означает «удалить настройку, вернуть значение по умолчанию»
    if (value === null || value === undefined) {
      settingsQueries.remove.run(Number(userId), String(key));
      return;
    }

    settingsQueries.upsert.run(Number(userId), String(key), JSON.stringify(value), time);
  });

  return getSettings(userId);
}

/* ---------- Профиль (XP, уровень, статистика) ---------- */

const profileQueries = {
  get: db.prepare('SELECT * FROM user_profile WHERE user_id = ?'),
  upsert: db.prepare(`
    INSERT INTO user_profile (user_id, xp, level, data, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (user_id) DO UPDATE SET
      xp = excluded.xp, level = excluded.level, data = excluded.data, updated_at = excluded.updated_at
  `)
};

/** Профиль пользователя: XP, уровень и произвольные данные. */
function getProfile(userId) {
  const row = profileQueries.get.get(Number(userId));

  if (!row) {
    return { xp: 0, level: 1, data: {} };
  }

  let data = {};
  try {
    data = JSON.parse(row.data) || {};
  } catch (error) {
    data = {};
  }

  return { xp: Number(row.xp), level: Number(row.level), data: data };
}

/** Сохраняет XP, уровень и данные профиля. */
function saveProfile(userId, { xp, level, data }) {
  const current = getProfile(userId);

  const nextXp = xp === undefined ? current.xp : Math.max(0, Math.floor(Number(xp) || 0));
  const nextLevel = level === undefined ? current.level : Math.max(1, Math.floor(Number(level) || 1));
  const nextData = data === undefined ? current.data : Object.assign({}, current.data, data);

  profileQueries.upsert.run(Number(userId), nextXp, nextLevel, JSON.stringify(nextData), nowIso());

  return getProfile(userId);
}

/** Удаляет весь профиль и настройки (используется при удалении аккаунта). */
function wipeUserData(userId) {
  db.prepare('DELETE FROM user_settings WHERE user_id = ?').run(Number(userId));
  db.prepare('DELETE FROM user_profile WHERE user_id = ?').run(Number(userId));
}

module.exports = {
  db,
  DB_PATH,
  nowIso,
  normalizeKey,
  findUserById,
  findUserByUsername,
  findUserByEmail,
  createUser,
  deleteUser,
  issueCode,
  getLatestCode,
  checkCode,
  markCodeVerified,
  markCodeUsed,
  countCodesLastHour,
  getSettings,
  saveSettings,
  getProfile,
  saveProfile,
  wipeUserData
};

/* Прямой запуск: node db.js — проверить, что база создаётся */
if (require.main === module) {
  console.log('База данных готова:', DB_PATH);
  console.log('Таблицы:', db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(r => r.name).join(', '));
}
