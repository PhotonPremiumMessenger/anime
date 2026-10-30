/* ============================================================
   index.js — сервер AniLingo

   Поднимает API и (по желанию) раздаёт сам сайт из корня
   репозитория: index.html, css, js и assets. Так на VPS не нужно
   держать отдельно nginx для статики, хотя можно и наоборот —
   nginx раздаёт файлы, а Express работает только как API.

   Запуск:
     cp .env.example .env     — заполнить свои значения
     npm install
     npm start

   Порты и адреса — в .env. По умолчанию http://localhost:3000
   ============================================================ */

'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const { isMailConfigured } = require('./mailer');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

// Откуда разрешены запросы к API. Несколько адресов — через запятую.
//   https://photonpremiummessenger.github.io — сайт на GitHub Pages
//   http://localhost:5173 — локальная разработка
const ORIGINS = String(process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

/* ---------- Общая обвязка ---------- */

// За прокси (nginx) нужно доверять заголовкам — иначе все запросы
// выглядят как один IP и лимит срабатывает на всех сразу
app.set('trust proxy', 1);

app.use(express.json({ limit: '256kb' }));

app.use(cors({
  origin: ORIGINS.includes('*') ? true : ORIGINS,
  credentials: false
}));

// Ограничение на все запросы к API: 300 за 15 минут с одного IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много запросов. Попробуйте позже' }
});

// Отдельно жёстче — на письма и вход, чтобы не перебирали пароли
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Слишком много попыток. Подождите 15 минут' }
});

/* ---------- Маршруты ---------- */

/**
 * Проверка связи. Фронтенд спрашивает её при загрузке:
 * если сервер не ответил, сайт работает в демо-режиме на
 * localStorage, чтобы не показывать пустой экран.
 */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'anilingo',
    version: '1.0.0',
    mail: isMailConfigured(),
    time: new Date().toISOString()
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', apiLimiter, userRoutes);

// Неизвестный /api-адрес — понятный JSON, а не HTML
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Такого метода API нет' });
});

/* ---------- Статика сайта ---------- */

// SERVE_STATIC=0 — если сайт раздаёт nginx, а Express только API
if (process.env.SERVE_STATIC !== '0') {
  const siteRoot = path.join(__dirname, '..');

  app.use(express.static(siteRoot, {
    extensions: ['html'],
    setHeaders(res, filePath) {
      // HTML не кешируем надолго: правки должны доходить сразу
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // Любой другой путь — на главную страницу сайта
  app.get('*', (req, res) => {
    res.sendFile(path.join(siteRoot, 'index.html'));
  });
}

/* ---------- Ошибки ---------- */

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  console.error('[api]', error);

  // Битый JSON в теле запроса
  if (error && error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Некорректный JSON в запросе' });
  }

  return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

/* ---------- Старт ---------- */

const server = app.listen(PORT, HOST, () => {
  console.log(`AniLingo API: http://${HOST}:${PORT}`);
  console.log(`База данных: ${db.DB_PATH}`);
  console.log(`Почта: ${isMailConfigured() ? 'настроена' : 'демо-режим (код на экране)'}`);
  console.log(`CORS: ${ORIGINS.join(', ')}`);
});

// Аккуратно закрываемся, чтобы не побить базу
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log('\nОстанавливаюсь...');
    server.close(() => {
      try { db.db.close(); } catch (error) { /* уже закрыта */ }
      process.exit(0);
    });
  });
});

module.exports = app;
