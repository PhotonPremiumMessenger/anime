/* ============================================================
   routes/tts.js — озвучка слов и фраз

     POST /api/tts  { text, lang: 'ja' | 'ru', rate?: 0.5–1.5 }
     GET  /api/tts/health  — проверка связи с сервисом озвучки

   Ответ — готовый MP3 (Content-Type: audio/mpeg), а не JSON.
   Браузер получает звук сразу и играет его без задержки.

   Почему на сервере, а не в браузере: голос должен звучать
   одинаково на любом устройстве. Раньше читал браузер, и на
   телефоне без японского языка вместо произношения получалась
   каша. Теперь голос даёт Microsoft Edge TTS.

   Токен не нужен: слова слушают и гости, а сервер всё равно
   ограничивает частоту запросов и длину текста.
   ============================================================ */

'use strict';

const express = require('express');
const tts = require('../tts');

const router = express.Router();

/**
 * GET /api/tts/health
 *
 * Проверка связи с сервисом озвучки: делает один короткий синтез
 * и показывает, что именно не получилось. Нужна, когда в браузере
 * видно только «502», а причина неизвестна:
 *
 *   curl -s https://www.anilingo.fun/api/tts/health
 *   {"ok":true,"provider":"google","providers":{"edge":{…},"google":{…}}}
 *
 * Поле providers показывает оба пути по отдельности: сразу видно,
 * что именно не работает — Microsoft или запасной сервис.
 *
 * Секретов здесь нет: только текст ошибки от библиотеки.
 */
router.get('/health', async (req, res) => {
  const lang = tts.pickLang(req.query.lang) || 'ja';
  const result = await tts.probe(tts.cleanText(req.query.text), lang);

  return res.json(Object.assign({
    service: 'tts',
    cache: tts.cacheSize(),
    lastError: tts.getLastError(),
    time: new Date().toISOString()
  }, result));
});

/**
 * POST /api/tts
 *
 * Ошибки:
 *   400 — пустой или слишком длинный текст;
 *   429 — слишком много запросов (лимит у маршрута в index.js);
 *   502 — сервис синтеза не ответил.
 *
 * Неизвестный lang — не ошибка: сервер определит язык по самому
 * тексту (кана и кандзи дают японский, всё остальное русский).
 */
router.post('/', async (req, res) => {
  const body = req.body || {};
  const text = tts.cleanText(body.text);

  if (!text) {
    return res.status(400).json({ message: 'Пустой текст — озвучивать нечего' });
  }

  if (text.length > tts.MAX_TEXT) {
    return res.status(400).json({
      message: 'Слишком длинный текст для озвучки: до ' + tts.MAX_TEXT + ' символов'
    });
  }

  // Язык присылает клиент; если не прислал — определяем по тексту
  const asked = String(body.lang || '').trim();
  const lang = tts.pickLang(asked) || tts.detectLang(text);

  try {
    const result = await tts.synthesize({ text: text, lang: lang, rate: body.rate });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(result.buffer.length),
      // Голос и попадание в кэш видно в инструментах разработчика.
      // X-TTS-Provider говорит, кто прочитал: edge или запасной google
      'X-TTS-Voice': result.voice,
      'X-TTS-Provider': result.provider || 'edge',
      'X-TTS-Lang': result.lang,
      'X-TTS-Cache': result.cached ? 'hit' : 'miss',
      // Запросы POST браузер не кэширует, но прокси пусть знает,
      // что звук для одного и того же текста не меняется
      'Cache-Control': 'public, max-age=86400'
    });

    return res.send(result.buffer);
  } catch (error) {
    if (error && (error.message === 'EMPTY_TEXT' || error.message === 'TEXT_TOO_LONG')) {
      return res.status(400).json({ message: 'Не удалось прочитать текст для озвучки' });
    }

    // Подробная причина в лог pm2: по одной строке «502» чинить нельзя
    console.error('[tts] синтез не удался:', error && (error.stack || error.message || error));

    return res.status(502).json({
      message: 'Озвучка сейчас недоступна. Проверьте связь и попробуйте ещё раз'
    });
  }
});

/**
 * GET /api/tts/voices — какие голоса используются.
 * Нужен настройкам: показать человеку, кто именно читает.
 */
router.get('/voices', (req, res) => {
  res.json({
    ok: true,
    maxText: tts.MAX_TEXT,
    voices: [
      { lang: 'ru', voice: tts.VOICES.ru, label: tts.VOICE_LABELS.ru },
      { lang: 'ja', voice: tts.VOICES.ja, label: tts.VOICE_LABELS.ja }
    ]
  });
});

module.exports = router;
