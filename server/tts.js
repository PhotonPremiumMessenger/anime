/* ============================================================
   tts.js — озвучка через Microsoft Edge TTS

   Раньше слова читал браузер (Web Speech API): качество зависело
   от того, какие голоса установлены в системе. Здесь всё иначе —
   звук делает сервис Microsoft, поэтому голос одинаковый на любом
   устройстве и не требует установки японского языка.

   Как устроено:
   • два нейроголоса: ru-RU-SvetlanaNeural и ja-JP-NanamiNeural;
   • текст проверяем и чистим, длину ограничиваем — сервис не для
     озвучки книг, а для слов и коротких фраз;
   • готовый MP3 кладём в память сервера: повторные запросы одного
     и того же слова звук не генерируют;
   • если Microsoft не ответил за TIMEOUT_MS — отдаём ошибку, а
     клиент честно говорит об этом пользователю.

   У библиотеки @travisvn/edge-tts нет обратного вызова отмены,
   поэтому таймаут сделан гонкой промисов: зависший запрос больше
   не держит пользователя.
   ============================================================ */

'use strict';

const { EdgeTTS } = require('@travisvn/edge-tts');

/* ---------- Голоса ---------- */

// Ключ — то, что присылает клиент, значение — голос Microsoft
const VOICES = {
  ru: 'ru-RU-SvetlanaNeural',
  ja: 'ja-JP-NanamiNeural'
};

// Понятные подписи: пригодятся в ответе и в логах
const VOICE_LABELS = {
  ru: 'Светлана · ru-RU',
  ja: 'Нанами · ja-JP'
};

/* ---------- Пределы ---------- */

// Сколько символов принимаем за раз. Слова и фразы — до 300,
// длинные тексты озвучивать не нужно: это дорого и медленно
const MAX_TEXT = 300;

// Сколько озвучек держим в памяти сервера
const CACHE_LIMIT = 150;

// Максимум на один синтез: дальше отвечаем ошибкой.
// Рабочий синтез укладывается в 1–2 секунды, 9 — уже с запасом
const TIMEOUT_MS = 9000;

// Если сервис только что не ответил, следующие запросы 20 секунд
// падают сразу: иначе каждое слово висело бы по девять секунд
const FAILURE_COOLDOWN_MS = 20000;

// Скорость: 0.5–1.5 из настроек сайта → проценты для голоса
const RATE_MIN = -50;
const RATE_MAX = 50;

/* ---------- Кэш ---------- */

// ключ «язык:текст:скорость» → Buffer с MP3.
// Map помнит порядок вставки, поэтому старые записи удаляем первыми
const cache = new Map();

// Когда последний раз сервис не ответил (0 — всё хорошо)
let lastFailureAt = 0;

/** Кладёт звук в кэш и следит за размером. */
function cachePut(key, buffer) {
  if (cache.has(key)) cache.delete(key);

  cache.set(key, buffer);

  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

/** Сколько озвучек сейчас в памяти — для тестов и диагностики. */
function cacheSize() {
  return cache.size;
}

/** Полная очистка кэша (используется в тестах). */
function cacheClear() {
  cache.clear();
  lastFailureAt = 0;
}

/* ---------- Текст ---------- */

/**
 * Чистит текст перед отправкой в сервис.
 * Убираем управляющие символы и невидимые маркеры, схлопываем
 * пробелы: так одинаковые слова дают одинаковый ключ кэша.
 */
function cleanText(text) {
  return String(text || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Язык из запроса: 'ja', 'ru' или пустая строка.
 * Понимаем и короткие коды, и полные: ja, ja-JP, ru, ru-RU.
 */
function pickLang(lang) {
  const value = String(lang || '').trim().toLowerCase();
  if (!value) return '';
  if (value.startsWith('ja')) return 'ja';
  if (value.startsWith('ru')) return 'ru';
  return '';
}

/**
 * Язык по самому тексту — страховка, если клиент его не прислал.
 * Кана и кандзи → японский, всё остальное → русский.
 */
function detectLang(text) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(String(text || '')) ? 'ja' : 'ru';
}

/**
 * Скорость из настроек (0.5–1.5) → строка для голоса ('+10%').
 * Единица — обычный темп, меньше — медленнее.
 */
function rateProsody(rate) {
  const value = Number(rate);

  // Настройку не прислали — читаем в обычном темпе
  if (!Number.isFinite(value) || value <= 0) return '+0%';

  const percent = Math.round((value - 1) * 100);
  const clamped = Math.min(RATE_MAX, Math.max(RATE_MIN, percent));

  return (clamped >= 0 ? '+' : '') + clamped + '%';
}

/* ---------- Синтез ---------- */

/**
 * Настоящий синтез через Microsoft.
 * Вынесен отдельной функцией, чтобы тесты могли её подменить:
 * в закрытых сетях сервис недоступен, а проверить маршрут нужно.
 */
async function edgeSynthesize(text, lang, prosody) {
  const tts = new EdgeTTS(text, VOICES[lang], { rate: prosody });
  const result = await tts.synthesize();
  const buffer = Buffer.from(await result.audio.arrayBuffer());

  if (!buffer.length) throw new Error('Синтезатор вернул пустой звук');
  return buffer;
}

// Точка подмены: setSynthesizer(fn) — только для тестов
let synthesizeImpl = edgeSynthesize;

/** Подменяет синтезатор. Без аргумента возвращает настоящий. */
function setSynthesizer(fn) {
  synthesizeImpl = typeof fn === 'function' ? fn : edgeSynthesize;
}

/** Гонка с таймаутом: медленный ответ не должен висеть вечно. */
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Синтез занял слишком много времени'));
    }, ms);

    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Готовит озвучку: сначала смотрит в кэш, потом идёт в Microsoft.
 *
 * @param {{text: string, lang?: string, rate?: number}} request
 * @returns {Promise<{buffer: Buffer, lang: string, voice: string, label: string, cached: boolean}>}
 * @throws {Error} — текст пустой или синтез не удался
 */
async function synthesize(request = {}) {
  const text = cleanText(request.text);
  if (!text) throw new Error('EMPTY_TEXT');
  if (text.length > MAX_TEXT) throw new Error('TEXT_TOO_LONG');

  const lang = pickLang(request.lang) || detectLang(text);
  const prosody = rateProsody(request.rate);
  const key = lang + ':' + text + ':' + prosody;

  const saved = cache.get(key);

  if (saved) {
    return {
      buffer: saved,
      lang: lang,
      voice: VOICES[lang],
      label: VOICE_LABELS[lang],
      cached: true
    };
  }

  // Сервис только что не отвечал — не заставляем ждать снова
  if (lastFailureAt && Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS) {
    throw new Error('Сервис озвучки временно недоступен');
  }

  let buffer;

  try {
    buffer = await withTimeout(synthesizeImpl(text, lang, prosody), TIMEOUT_MS);
  } catch (error) {
    lastFailureAt = Date.now();
    throw error;
  }

  if (!buffer || !buffer.length) {
    lastFailureAt = Date.now();
    throw new Error('Синтезатор вернул пустой звук');
  }

  lastFailureAt = 0;
  cachePut(key, buffer);

  return {
    buffer: buffer,
    lang: lang,
    voice: VOICES[lang],
    label: VOICE_LABELS[lang],
    cached: false
  };
}

module.exports = {
  VOICES,
  VOICE_LABELS,
  MAX_TEXT,
  CACHE_LIMIT,
  TIMEOUT_MS,
  FAILURE_COOLDOWN_MS,
  cleanText,
  pickLang,
  detectLang,
  rateProsody,
  synthesize,
  cacheSize,
  cacheClear,
  setSynthesizer,
  edgeSynthesize
};
