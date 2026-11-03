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
   • если Microsoft не ответил за TIMEOUT_MS, пробуем второй путь —
     Google Translate (обычный HTTPS). На части хостингов провайдер
     блокирует WebSocket к speech.platform.bing.com, хотя обычный
     HTTPS к нему же работает: без второго пути озвучка там мертва;
   • если не вышло ни там, ни там — отдаём ошибку, а клиент честно
     говорит об этом пользователю.

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

// Подписи запасного пути: голос другой, и лучше это не скрывать
const FALLBACK_LABELS = {
  ru: 'Запасной голос · ru',
  ja: 'Запасной голос · ja'
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

// Что именно сломалось в последний раз: пригодится в /api/tts/health
// и в логах, чтобы не гадать «502 и 502»
let lastError = null;

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

/* ---------- Запасной голос: Google Translate ---------- */

// Тот же текст, но по обычному HTTPS — без WebSocket.
// Голоса: ja и ru. Ключей не нужно.
const GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts';

// Google не принимает «+10%»: у него своя шкала 0.24–1,
// где 1 — обычный темп. Медленнее сделать можно, быстрее — нет.
function googleSpeed(rate) {
  const value = Number(rate);
  if (!Number.isFinite(value) || value <= 0) return '1';
  return String(Math.min(1, Math.max(0.24, value)));
}

/**
 * Синтез через Google Translate.
 * Отдаёт MP3 так же, как Microsoft, поэтому клиенту всё равно,
 * кто именно прочитал слово.
 */
async function googleSynthesize(text, lang, rate) {
  const query = [
    'ie=UTF-8',
    'client=tw-ob',
    'tl=' + (lang === 'ja' ? 'ja' : 'ru'),
    'ttsspeed=' + googleSpeed(rate),
    'q=' + encodeURIComponent(text)
  ].join('&');

  const response = await fetch(GOOGLE_TTS_URL + '?' + query, {
    headers: {
      // Без браузерного User-Agent сервис отвечает 403
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/'
    },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error('Запасной сервис ответил ' + response.status);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (!buffer.length) {
    throw new Error('Запасной сервис вернул пустой звук');
  }

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
 * Пробует два пути по очереди: сначала Microsoft (WebSocket),
 * потом Google (обычный HTTPS).
 *
 * Зачем второй: на части хостингов провайдер пропускает HTTPS к
 * speech.platform.bing.com, но режет WebSocket к нему же — озвучка
 * висит девять секунд и падает. Подменённый синтезатор в тестах
 * работает сам по себе, без запасного пути и без сети.
 *
 * @returns {Promise<{buffer: Buffer, provider: string, voice: string, label: string}>}
 */
async function renderAudio(text, lang, prosody, rate, edgeWork, fallbackWork) {
  const primary = typeof edgeWork === 'function' ? edgeWork : edgeSynthesize;
  const fallback = typeof fallbackWork === 'function' ? fallbackWork : googleSynthesize;

  if (typeof edgeWork !== 'function' && synthesizeImpl !== edgeSynthesize) {
    const buffer = await withTimeout(synthesizeImpl(text, lang, prosody), TIMEOUT_MS);
    return { buffer, provider: 'custom', voice: VOICES[lang], label: VOICE_LABELS[lang] };
  }

  let edgeError = null;

  try {
    const buffer = await withTimeout(primary(text, lang, prosody), TIMEOUT_MS);
    return { buffer, provider: 'edge', voice: VOICES[lang], label: VOICE_LABELS[lang] };
  } catch (error) {
    edgeError = error;
  }

  try {
    const buffer = await withTimeout(fallback(text, lang, rate), TIMEOUT_MS);
    return { buffer, provider: 'google', voice: 'google-' + lang, label: FALLBACK_LABELS[lang] };
  } catch (fallbackError) {
    const message = 'Microsoft: ' + String(edgeError && (edgeError.message || edgeError)) +
      '; Google: ' + String(fallbackError && (fallbackError.message || fallbackError));

    const combined = new Error(message);
    combined.code = 'TTS_UNAVAILABLE';
    throw combined;
  }
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
      buffer: saved.buffer,
      lang: lang,
      voice: saved.voice,
      label: saved.label,
      provider: saved.provider,
      cached: true
    };
  }

  // Сервис только что не отвечал — не заставляем ждать снова
  if (lastFailureAt && Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS) {
    throw new Error('Сервис озвучки временно недоступен');
  }

  let rendered;

  try {
    rendered = await renderAudio(text, lang, prosody, request.rate);
  } catch (error) {
    lastFailureAt = Date.now();
    lastError = {
      message: String(error && (error.message || error)),
      code: error && error.code ? String(error.code) : '',
      at: new Date().toISOString()
    };
    throw error;
  }

  if (!rendered.buffer || !rendered.buffer.length) {
    lastFailureAt = Date.now();
    throw new Error('Синтезатор вернул пустой звук');
  }

  lastFailureAt = 0;
  cachePut(key, rendered);

  return {
    buffer: rendered.buffer,
    lang: lang,
    voice: rendered.voice,
    label: rendered.label,
    provider: rendered.provider,
    cached: false
  };
}

/* ---------- Диагностика ---------- */

/**
 * Проверка связи с сервисом озвучки: делает один настоящий синтез
 * короткого слова и рассказывает, какой путь сработал, а какой нет.
 *
 * В отличие от synthesize() не смотрит в кэш и не соблюдает паузу
 * после сбоя — иначе проверка врала бы «недоступно» ещё 20 секунд.
 *
 * @returns {Promise<{ok: boolean, provider: string, ms: number, voice?: string,
 *                    error?: string, providers: Object}>}
 */
async function probe(text, lang) {
  const started = Date.now();
  const phrase = cleanText(text) || 'こんにちは';
  const language = pickLang(lang) || detectLang(phrase);
  const providers = {};

  /** Один провайдер: замеряет время и запоминает ошибку. */
  const run = async (name, work) => {
    const at = Date.now();

    try {
      const buffer = await work();
      providers[name] = {
        ok: Boolean(buffer && buffer.length),
        ms: Date.now() - at,
        bytes: buffer ? buffer.length : 0
      };
    } catch (error) {
      providers[name] = {
        ok: false,
        ms: Date.now() - at,
        error: String(error && (error.message || error))
      };
    }

    return providers[name].ok;
  };

  const edgeOk = await run('edge', () => withTimeout(edgeSynthesize(phrase, language, '+0%'), TIMEOUT_MS));

  // Второй путь проверяем только если первый не сложился:
  // так проверка не висит вдвое дольше без нужды
  if (!edgeOk) {
    await run('google', () => withTimeout(googleSynthesize(phrase, language, 1), TIMEOUT_MS));
  }

  const provider = edgeOk ? 'edge' : (providers.google && providers.google.ok ? 'google' : '');
  const ok = Boolean(provider);

  lastError = ok
    ? null
    : {
        message: String((providers.edge && providers.edge.error) || '') +
          (providers.google ? '; Google: ' + providers.google.error : ''),
        code: 'TTS_UNAVAILABLE',
        at: new Date().toISOString()
      };

  return {
    ok: ok,
    provider: provider,
    ms: Date.now() - started,
    voice: provider === 'google' ? 'google-' + language : VOICES[language],
    error: ok ? '' : lastError.message,
    providers: providers
  };
}

/** Последняя ошибка синтеза или null. Для диагностики. */
function getLastError() {
  return lastError;
}

module.exports = {
  probe,
  renderAudio,
  googleSynthesize,
  getLastError,
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
