/* ============================================================
   routes/user.js — данные аккаунта, которые синхронизируются
   между устройствами:

     GET  /api/user/settings  — все настройки пользователя
     PUT  /api/user/settings  — частичное обновление (patch)
     GET  /api/user/profile   — XP, уровень, статистика
     PUT  /api/user/profile   — сохранить XP, уровень и данные
     GET  /api/user/export    — выгрузка всех данных (кнопка
                                «Скачать мои данные»)

   Все маршруты требуют токен: чужие настройки не отдаём.
   ============================================================ */

'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const uploads = require('../uploads');

const router = express.Router();

// Любой запрос в этот файл требует входа
router.use(requireAuth);

/* ---------- Настройки ---------- */

/**
 * GET /api/user/settings — объект вида { 'interface.theme': 'sakura' }
 * и отметки времени по каждому ключу: { 'interface.theme': '2026-10-30T...' }.
 * По ним клиент решает, чьё значение свежее — своё или чужого устройства.
 */
router.get('/settings', (req, res) => {
  res.json({
    ok: true,
    settings: db.getSettings(req.user.id),
    updated: db.getSettingsUpdated(req.user.id)
  });
});

/**
 * PUT /api/user/settings
 * { patch: { 'interface.theme': 'light', 'sound.volume': 40 } }
 *
 * Передаём именно патч, а не весь объект: два устройства
 * (телефон и компьютер) не затирают настройки друг друга.
 * Значение null удаляет ключ и возвращает значение по умолчанию.
 */
router.put('/settings', (req, res) => {
  const patch = req.body && req.body.patch;

  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return res.status(400).json({ message: 'Ожидается объект patch' });
  }

  // Ограничение, чтобы один запрос не раздувал базу
  const keys = Object.keys(patch);
  if (keys.length > 200) {
    return res.status(400).json({ message: 'Слишком много настроек за раз' });
  }

  // Значения храним как JSON — числа, строки, массивы, объекты
  const settings = db.saveSettings(req.user.id, patch);

  return res.json({
    ok: true,
    settings: settings,
    updated: db.getSettingsUpdated(req.user.id)
  });
});

/* ---------- Профиль ---------- */

/** GET /api/user/profile — XP, уровень и произвольные данные. */
router.get('/profile', (req, res) => {
  res.json({ ok: true, profile: db.getProfile(req.user.id) });
});

/** PUT /api/user/profile { xp, level, data } */
router.put('/profile', (req, res) => {
  const body = req.body || {};

  const xp = body.xp;
  const level = body.level;
  const data = body.data;

  if (xp !== undefined && (!Number.isFinite(Number(xp)) || Number(xp) < 0)) {
    return res.status(400).json({ message: 'XP должен быть неотрицательным числом' });
  }

  if (level !== undefined && (!Number.isFinite(Number(level)) || Number(level) < 1)) {
    return res.status(400).json({ message: 'Уровень должен быть числом от 1' });
  }

  if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
    return res.status(400).json({ message: 'data должен быть объектом' });
  }

  const profile = db.saveProfile(req.user.id, { xp: xp, level: level, data: data });
  return res.json({ ok: true, profile: profile });
});

/* ---------- Фон профиля ---------- */

// Ключи в user_settings: по ним фон профиля приезжает на другое
// устройство и виден всем, кто открывает визитку по ссылке.
const COVER_KEY = 'profile.cover';
const COVER_KIND_KEY = 'profile.coverKind';

/** Текущий фон профиля из настроек аккаунта. */
function readCover(userId) {
  const settings = db.getSettings(userId) || {};

  return {
    cover: String(settings[COVER_KEY] || ''),
    kind: String(settings[COVER_KIND_KEY] || '')
  };
}

/**
 * POST /api/user/cover — загрузить фон профиля файлом.
 *
 * Ждём multipart/form-data с полем file. Фото до 5 МБ,
 * видео до 10 МБ. Тип проверяем по MIME, имя файла собираем сами.
 * В ответе — адрес, который сразу можно поставить в CSS.
 */
router.post('/cover', (req, res) => {
  uploads.takeCoverFile(req, res, error => {
    if (error) {
      if (error.message === 'UNSUPPORTED_TYPE') {
        return res.status(415).json({ message: 'Нужна картинка (JPG, PNG, WebP) или видео (MP4, WebM)' });
      }

      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Файл больше 10 МБ' });
      }

      console.error('[cover]', error);
      return res.status(400).json({ message: 'Не удалось принять файл' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Файл не пришёл' });
    }

    const isVideo = Boolean(uploads.VIDEO_TYPES[req.file.mimetype]);
    const url = uploads.publicUrl('covers', req.file.filename);

    // У фото свой предел — 5 МБ. Проверяем после приёма: тип
    // становится известен только здесь
    if (!isVideo && req.file.size > uploads.IMAGE_LIMIT) {
      uploads.removeUploaded(url);
      return res.status(413).json({ message: 'Фото больше 5 МБ' });
    }

    // Старый файл больше не нужен
    const previous = readCover(req.user.id);
    if (previous.cover) uploads.removeUploaded(previous.cover);

    db.saveSettings(req.user.id, {
      [COVER_KEY]: url,
      [COVER_KIND_KEY]: isVideo ? 'video' : 'image'
    });

    return res.json({
      ok: true,
      cover: url,
      kind: isVideo ? 'video' : 'image'
    });
  });
});

/** DELETE /api/user/cover — убрать свой фон профиля. */
router.delete('/cover', (req, res) => {
  const previous = readCover(req.user.id);

  if (previous.cover) uploads.removeUploaded(previous.cover);

  db.saveSettings(req.user.id, {
    [COVER_KEY]: null,
    [COVER_KIND_KEY]: null
  });

  return res.json({ ok: true });
});

/* ---------- Выгрузка ---------- */

/** GET /api/user/export — все данные аккаунта одним JSON. */
router.get('/export', (req, res) => {
  res.json({
    ok: true,
    account: {
      username: req.user.username,
      email: req.user.email,
      avatar: req.user.avatar,
      createdAt: req.user.created_at
    },
    settings: db.getSettings(req.user.id),
    profile: db.getProfile(req.user.id),
    exportedAt: new Date().toISOString()
  });
});

module.exports = router;
