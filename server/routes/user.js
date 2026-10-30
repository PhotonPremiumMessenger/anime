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
