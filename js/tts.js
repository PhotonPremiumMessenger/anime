/* ============================================================
   tts.js — озвучка слов и фраз (Microsoft Edge TTS)

   Как работает:
   • клиент отправляет текст на POST /api/tts вместе с языком;
   • сервер отвечает готовым MP3, браузер играет его через Audio;
   • готовый звук складываем в IndexedDB по ключу «язык:текст» —
     второй раз одно и то же слово слышно мгновенно, без запроса.

   Язык:
   • японский текст (кана, кандзи) → голос ja-JP-NanamiNeural;
   • русский текст → голос ru-RU-SvetlanaNeural.

   Функции speakJapanese() и speakRussian() вызывают нужный голос
   принудительно, speakText() определяет язык сам. Это важно там,
   где на экране может оказаться и слово, и перевод.

   Никакого Web Speech API здесь больше нет: голос не зависит от
   того, какие языки установлены в системе.
   ============================================================ */

'use strict';

// Адрес озвучки на сервере (см. js/config.js: apiBase)
const TTS_PATH = '/api/tts';

// Кэш звука в браузере
const TTS_DB_NAME = 'anilingo_tts';
const TTS_DB_STORE = 'audio';
const TTS_CACHE_LIMIT = 600;

// Пределы: сервер не примет длиннее, поэтому обрезаем заранее
const TTS_MAX_TEXT = 300;

// Сколько ждём ответ сервера, миллисекунды
const TTS_TIMEOUT = 20000;

/* ---------- Состояние ---------- */

let ttsAudio = null;                 // текущий проигрыватель
let ttsObjectUrl = '';               // адрес последнего Blob
let ttsRequestId = 0;                // защита от «опоздавших» ответов
let ttsAvailable = true;             // станет false после сетевого сбоя
let ttsWarnedAt = 0;                 // когда последний раз жаловались
let ttsPendingBlob = null;           // звук, который браузер не дал включить

// Быстрый кэш в памяти: ключ → Blob. Живёт до перезагрузки страницы
const ttsMemory = new Map();

let ttsDbPromise = null;

/* ---------- Язык текста ---------- */

/** Есть ли в тексте японские символы (кана или кандзи). */
function ttsHasJapanese(text) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(String(text || ''));
}

/**
 * Язык для озвучки по самому тексту.
 * @returns {'ja'|'ru'}
 */
function detectSpeechLang(text) {
  return ttsHasJapanese(text) ? 'ja' : 'ru';
}

/** Приводит язык к 'ja' или 'ru'. */
function normalizeSpeechLang(lang, text) {
  const value = String(lang || '').trim().toLowerCase();
  if (value.startsWith('ja')) return 'ja';
  if (value.startsWith('ru')) return 'ru';
  return detectSpeechLang(text);
}

/** Ключ кэша: ровно «язык:текст», как договаривались. */
function ttsCacheKey(lang, text) {
  return normalizeSpeechLang(lang, text) + ':' + String(text || '').trim();
}

/**
 * Готовит текст: тот же вид, что и на сервере.
 * Длинную фразу подрезаем по последнему пробелу, чтобы не
 * обрывать слово на середине.
 */
function ttsPrepareText(text) {
  const clean = String(text || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= TTS_MAX_TEXT) return clean;

  const cut = clean.slice(0, TTS_MAX_TEXT);
  const space = cut.lastIndexOf(' ');

  return (space > TTS_MAX_TEXT * 0.6 ? cut.slice(0, space) : cut).trim();
}

/* ---------- Кэш в IndexedDB ---------- */

/** Открывает базу кэша озвучки. */
function ttsDbOpen() {
  if (ttsDbPromise) return ttsDbPromise;

  ttsDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Браузер не умеет хранить звук'));
      return;
    }

    const request = indexedDB.open(TTS_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TTS_DB_STORE)) {
        db.createObjectStore(TTS_DB_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Не открылась память браузера'));
  }).catch(error => {
    // Не смогли открыть — работаем без кэша, но сайт не ломаем
    ttsDbPromise = null;
    throw error;
  });

  return ttsDbPromise;
}

/** Достаёт звук из кэша: Blob или null. */
async function ttsCacheGet(key) {
  const memory = ttsMemory.get(key);
  if (memory) return memory;

  try {
    const db = await ttsDbOpen();

    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction(TTS_DB_STORE, 'readonly');
      const request = tx.objectStore(TTS_DB_STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (blob && blob.size) {
      ttsMemory.set(key, blob);
      return blob;
    }
  } catch (error) {
    // Кэш недоступен (приватный режим) — просто идём на сервер
  }

  return null;
}

/** Сколько записей в кэше — для диагностики. */
async function ttsCacheCount() {
  try {
    const db = await ttsDbOpen();

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(TTS_DB_STORE, 'readonly');
      const request = tx.objectStore(TTS_DB_STORE).count();
      request.onsuccess = () => resolve(Number(request.result) || 0);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    return ttsMemory.size;
  }
}

/** Кладёт звук в кэш и следит, чтобы он не рос бесконечно. */
async function ttsCachePut(key, blob) {
  if (!blob || !blob.size) return;

  ttsMemory.set(key, blob);

  try {
    const db = await ttsDbOpen();
    const total = await ttsCacheCount();

    // Переполнились — начинаем кэш заново: озвучка восстановится
    // с сервера, зато память браузера не забьётся
    if (total > TTS_CACHE_LIMIT) {
      await ttsCacheClearStorage(db);
    }

    await new Promise((resolve, reject) => {
      const tx = db.transaction(TTS_DB_STORE, 'readwrite');
      tx.objectStore(TTS_DB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    // Без IndexedDB остаётся кэш в памяти — уже неплохо
  }
}

/** Чистит хранилище, база уже открыта. */
function ttsCacheClearStorage(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TTS_DB_STORE, 'readwrite');
    tx.objectStore(TTS_DB_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Полная очистка кэша озвучки.
 * Нужна после смены скорости: старый звук читался в другом темпе.
 */
async function clearSpeechCache(showMessage) {
  ttsMemory.clear();

  try {
    const db = await ttsDbOpen();
    await ttsCacheClearStorage(db);
  } catch (error) {
    // Кэша и не было — чистить нечего
  }

  if (showMessage !== false && typeof showToast === 'function') {
    showToast('Кэш озвучки очищен', 'Следующее слово сервер прочитает заново', 'info');
  }

  return true;
}

/* ---------- Запрос звука ---------- */

/** Полный адрес маршрута озвучки. */
function ttsEndpoint() {
  const base = String((window.ANILINGO_CONFIG && window.ANILINGO_CONFIG.apiBase) || '')
    .replace(/\/+$/, '');

  return base + TTS_PATH;
}

/** Скорость из настроек сайта (0.5–1.5) или 1. */
function ttsRateValue() {
  if (typeof getSpeechRate === 'function') return getSpeechRate();
  return 1;
}

/** Скачивает MP3 с сервера. */
async function ttsFetchAudio(text, lang) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TTS_TIMEOUT);

  try {
    const response = await fetch(ttsEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, lang: lang, rate: ttsRateValue() }),
      signal: controller.signal
    });

    if (!response.ok) {
      let message = '';

      try {
        const data = await response.json();
        message = (data && data.message) || '';
      } catch (error) {
        message = '';
      }

      throw new Error(message || 'Сервер озвучки ответил ' + response.status);
    }

    const blob = await response.blob();
    if (!blob || !blob.size) throw new Error('Сервер прислал пустой звук');

    return blob;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Возвращает звук для текста: из кэша или с сервера.
 * @returns {Promise<{blob: Blob, lang: string, cached: boolean}>}
 */
async function ttsAudioFor(text, lang) {
  const clean = ttsPrepareText(text);
  const finalLang = normalizeSpeechLang(lang, clean);
  const key = ttsCacheKey(finalLang, clean);

  const saved = await ttsCacheGet(key);
  if (saved) return { blob: saved, lang: finalLang, cached: true };

  const blob = await ttsFetchAudio(clean, finalLang);
  await ttsCachePut(key, blob);

  return { blob: blob, lang: finalLang, cached: false };
}

/* ---------- Воспроизведение ---------- */

/** Останавливает текущую озвучку. */
function stopSpeech() {
  // Новый номер запроса: ответы, которые ещё в пути, уже не заиграют
  ttsRequestId++;
  ttsPendingBlob = null;

  if (ttsAudio) {
    try {
      ttsAudio.pause();
      ttsAudio.currentTime = 0;
    } catch (error) {
      // уже остановлен — ничего страшного
    }

    ttsAudio = null;
  }

  if (ttsObjectUrl) {
    try {
      URL.revokeObjectURL(ttsObjectUrl);
    } catch (error) {
      // пусто
    }

    ttsObjectUrl = '';
  }
}

/**
 * Играет готовый звук.
 * Возвращается сразу после запуска: ждать конца озвучки незачем,
 * интерфейс не должен замирать на секунду-две.
 *
 * @param {Blob} blob
 * @returns {Promise<boolean>} — удалось ли запустить звук
 */
function playSpeechBlob(blob) {
  stopSpeech();

  const id = ttsRequestId;
  const url = URL.createObjectURL(blob);

  ttsObjectUrl = url;

  const audio = new Audio(url);
  ttsAudio = audio;

  // Освобождаем адрес Blob, когда звук доиграл или сломался
  const finish = () => {
    if (ttsObjectUrl === url) {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        // пусто
      }

      ttsObjectUrl = '';
    }

    if (ttsAudio === audio) ttsAudio = null;
  };

  audio.addEventListener('ended', finish, { once: true });
  audio.addEventListener('error', finish, { once: true });

  // Пока звук грузился, человек нажал другое слово — не мешаем новому
  if (id !== ttsRequestId) {
    finish();
    return Promise.resolve(false);
  }

  let playing = null;

  try {
    playing = audio.play();
  } catch (error) {
    playing = null;
  }

  if (playing && typeof playing.catch === 'function') {
    return playing.then(
      () => true,
      () => {
        // Браузер не разрешает звук до первого действия человека:
        // запоминаем и повторяем по первому касанию страницы
        ttsPendingBlob = blob;

        finish();
        return false;
      }
    );
  }

  return Promise.resolve(true);
}

/**
 * Повторяет задержанный звук по первому касанию страницы.
 * Слушатель один на всю страницу, поэтому повторы не копятся.
 */
function playPendingSpeech() {
  const blob = ttsPendingBlob;
  ttsPendingBlob = null;

  if (blob) playSpeechBlob(blob);
}

document.addEventListener('pointerdown', playPendingSpeech, { passive: true });

/** Показывает подсказку, но не чаще раза в 20 секунд. */
function ttsWarn(title, text) {
  if (typeof showToast !== 'function') return;

  const now = Date.now();
  if (now - ttsWarnedAt < 20000) return;

  ttsWarnedAt = now;
  showToast(title, text, 'warning', { duration: 5200 });
}

/**
 * Главная функция озвучки.
 *
 * @param {string} text — что прочитать
 * @param {object} [options]
 * @param {'ja'|'ru'} [options.lang] — язык; без него определяется по тексту
 * @param {boolean} [options.silent] — не показывать подсказки об ошибках
 * @returns {Promise<{ok: boolean, lang: string, cached: boolean, message?: string}>}
 */
async function speakText(text, options = {}) {
  const clean = ttsPrepareText(text);
  const lang = normalizeSpeechLang(options.lang, clean);

  if (!clean) return { ok: false, lang: lang, cached: false, message: 'Пустой текст' };

  // Бежим по кнопкам быстрее второго слова — новый звук отменяет старый
  stopSpeech();
  const id = ttsRequestId;

  try {
    const result = await ttsAudioFor(clean, lang);

    // Пока ждали сервер, человек нажал другое слово
    if (id !== ttsRequestId) return { ok: false, lang: result.lang, cached: result.cached };

    ttsAvailable = true;
    await playSpeechBlob(result.blob);

    return { ok: true, lang: result.lang, cached: result.cached };
  } catch (error) {
    // Сеть или сервис подвели — запоминаем, что озвучка сейчас не работает
    if (error && error.name !== 'AbortError') ttsAvailable = false;

    if (!options.silent) {
      ttsWarn('Озвучка недоступна', error && error.message ? error.message : 'Проверьте связь и попробуйте ещё раз');
    }

    return {
      ok: false,
      lang: lang,
      cached: false,
      message: error && error.message ? error.message : 'Не удалось получить звук'
    };
  }
}

/** Озвучивает японский текст голосом Нанами. */
function speakJapanese(text) {
  return speakText(text, { lang: 'ja' });
}

/** Озвучивает русский текст голосом Светланы. */
function speakRussian(text) {
  return speakText(text, { lang: 'ru' });
}

/** Озвучивает текст на языке самого текста. */
function speakSmart(text) {
  return speakText(text, { lang: detectSpeechLang(text) });
}

/**
 * Есть ли озвучка. Раньше здесь проверялся Web Speech API,
 * теперь звук приходит с сервера — браузеру достаточно Audio.
 * После сетевого сбоя возвращаем false, чтобы подсказки на
 * страницах не обещали того, чего нет.
 */
function isSpeechSupported() {
  return typeof Audio === 'function' && typeof fetch === 'function' && ttsAvailable;
}

/**
 * Старое имя функции: раньше сбрасывало выбранный голос браузера.
 * Теперь голос фиксированный, но после смены скорости кэш звука
 * надо почистить — иначе слово прочитается в прежнем темпе.
 */
function resetJapaneseVoice() {
  stopSpeech();
  ttsMemory.clear();
  clearSpeechCache(false);
}

/* ---------- Инициализация ---------- */

// Прогреваем базу кэша заранее: первое нажатие не должно ждать
if (typeof indexedDB !== 'undefined') {
  ttsDbOpen().catch(() => {});
}

/* Экспорт в глобальную область */
window.speakText = speakText;
window.speakSmart = speakSmart;
window.speakJapanese = speakJapanese;
window.speakRussian = speakRussian;
window.stopSpeech = stopSpeech;
window.isSpeechSupported = isSpeechSupported;
window.resetJapaneseVoice = resetJapaneseVoice;
window.clearSpeechCache = clearSpeechCache;
window.detectSpeechLang = detectSpeechLang;
window.ttsCacheCount = ttsCacheCount;
