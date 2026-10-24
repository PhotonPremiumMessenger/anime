/* ============================================================
   translate.js — быстрый перевод выделенного текста
   Выделили слово или фразу → над выделением появляется попап.
   ============================================================ */

'use strict';

// Публичный эндпоинт Google Translate (тот же, что использует расширение-переводчик).
// Сторонних библиотек не нужно — только fetch.
const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

// Резервный сервис на случай, если Google не отдаст ответ (CORS, лимит и т.п.)
const FALLBACK_TRANSLATE_URL = 'https://api.mymemory.translated.net/get';

// Минимальная и максимальная длина выделения
const MIN_SELECTION = 2;
const MAX_SELECTION = 280;

/* ---------- Определение языка ---------- */

/**
 * Есть ли в тексте японские символы (кана или кандзи).
 * @param {string} text
 */
function hasJapanese(text) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
}

/* ---------- Запросы перевода ---------- */

/**
 * Перевод через Google Translate.
 * @param {string} text
 * @param {string} from — исходный язык
 * @param {string} to   — целевой язык
 */
async function googleTranslate(text, from, to) {
  const url = GOOGLE_TRANSLATE_URL +
    '?client=gtx' +
    '&sl=' + encodeURIComponent(from) +
    '&tl=' + encodeURIComponent(to) +
    '&dt=t' +
    '&q=' + encodeURIComponent(text);

  const response = await fetch(url);
  if (!response.ok) throw new Error('Google Translate: ' + response.status);

  const data = await response.json();

  // Ответ приходит вложенным массивом: data[0] — куски перевода
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Неожиданный формат ответа');
  }

  return data[0]
    .map(part => (part && part[0]) || '')
    .join('')
    .trim();
}

/**
 * Резервный перевод через MyMemory (нужен, если Google недоступен).
 */
async function fallbackTranslate(text, from, to) {
  const url = FALLBACK_TRANSLATE_URL +
    '?q=' + encodeURIComponent(text) +
    '&langpair=' + encodeURIComponent(from + '|' + to);

  const response = await fetch(url);
  if (!response.ok) throw new Error('MyMemory: ' + response.status);

  const data = await response.json();
  const translated = data && data.responseData && data.responseData.translatedText;

  if (!translated) throw new Error('Пустой ответ переводчика');

  return translated.trim();
}

/**
 * Переводит текст на японский.
 * Если выделен японский текст — переводит его на русский.
 *
 * @param {string} text
 * @returns {Promise<{ok: boolean, text: string, error?: string}>}
 */
async function translateToJapanese(text) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();

  if (!clean) {
    return { ok: false, text: '', error: 'Пустой текст' };
  }

  // Японский → русский, всё остальное → японский
  const isJapanese = hasJapanese(clean);
  const from = isJapanese ? 'ja' : 'ru';
  const to = isJapanese ? 'ru' : 'ja';

  try {
    const translated = await googleTranslate(clean, from, to);
    if (translated) return { ok: true, text: translated };
    throw new Error('Пустой перевод');
  } catch (googleError) {
    // Пробуем резервный сервис
    try {
      const translated = await fallbackTranslate(clean, from, to);
      return { ok: true, text: translated };
    } catch (fallbackError) {
      return {
        ok: false,
        text: '',
        error: 'Переводчик недоступен. Проверьте соединение.'
      };
    }
  }
}

/* ---------- Попап с переводом ---------- */

/** Создаёт попап один раз и возвращает его. */
function getTranslatePopup() {
  let popup = document.getElementById('translatePopup');

  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'translatePopup';
    popup.className = 'translate-popup';
    popup.innerHTML = `
      <div class="tr-source"></div>
      <div class="tr-result"></div>
      <div class="tr-status"></div>
    `;
    document.body.appendChild(popup);
  }

  return popup;
}

/**
 * Показывает попап рядом с выделением (над ним).
 * @param {string} source — исходный текст
 * @param {DOMRect} rect  — координаты выделения
 */
function showTranslatePopup(source, rect) {
  const popup = getTranslatePopup();
  const sourceEl = popup.querySelector('.tr-source');
  const resultEl = popup.querySelector('.tr-result');
  const statusEl = popup.querySelector('.tr-status');

  sourceEl.textContent = source.length > 60 ? source.slice(0, 60) + '…' : source;
  resultEl.textContent = 'Переводим…';
  statusEl.textContent = '';
  statusEl.classList.remove('tr-error');

  // Сначала показываем, чтобы узнать высоту, потом ставим позицию
  popup.classList.add('show');
  popup.style.visibility = 'hidden';

  const popupRect = popup.getBoundingClientRect();
  const scrollY = window.scrollY;
  const scrollX = window.scrollX;

  // По умолчанию — над выделением
  let top = rect.top + scrollY - popupRect.height - 10;
  // Если сверху места нет — показываем снизу
  if (rect.top - popupRect.height - 10 < 0) {
    top = rect.bottom + scrollY + 10;
  }

  // Центрируем по выделению, но не выпускаем за края экрана
  let left = rect.left + scrollX + rect.width / 2 - popupRect.width / 2;
  left = Math.max(12 + scrollX, Math.min(left, scrollX + window.innerWidth - popupRect.width - 12));

  popup.style.top = top + 'px';
  popup.style.left = left + 'px';
  popup.style.visibility = 'visible';

  return { sourceEl, resultEl, statusEl };
}

/** Прячет попап. */
function hideTranslatePopup() {
  const popup = document.getElementById('translatePopup');
  if (popup) popup.classList.remove('show');
}

/* ---------- Обработка выделения ---------- */

// Последний переведённый текст — чтобы не дёргать API повторно
let lastTranslated = '';
let translateRequestId = 0;

/** Главный обработчик: срабатывает после отпускания кнопки мыши. */
async function handleTextSelection() {
  // Не трогаем выделение внутри полей ввода и самого попапа
  const activeTag = document.activeElement ? document.activeElement.tagName : '';
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const text = selection.toString().trim();

  if (text.length < MIN_SELECTION || text.length > MAX_SELECTION) {
    hideTranslatePopup();
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Выделение внутри попапа игнорируем
  const container = range.commonAncestorContainer;
  const containerEl = container.nodeType === 1 ? container : container.parentElement;
  if (containerEl && containerEl.closest('#translatePopup')) return;

  // Если выделен тот же текст — просто перепозиционируем попап
  if (text === lastTranslated) {
    showTranslatePopup(text, rect);
    return;
  }

  lastTranslated = text;

  const elements = showTranslatePopup(text, rect);
  const requestId = ++translateRequestId;

  const result = await translateToJapanese(text);

  // Пока ждали ответ, пользователь мог выделить другое слово
  if (requestId !== translateRequestId) return;

  if (result.ok) {
    elements.resultEl.textContent = result.text;
    elements.statusEl.textContent = 'Google Translate';
  } else {
    elements.resultEl.textContent = '—';
    elements.statusEl.textContent = result.error || 'Ошибка перевода';
    elements.statusEl.classList.add('tr-error');
  }
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // Переводим только после выделения мышью
  document.addEventListener('mouseup', event => {
    // Клик по самому попапу не должен его закрывать
    if (event.target.closest && event.target.closest('#translatePopup')) return;

    // Небольшая задержка: браузер успевает обновить window.getSelection()
    setTimeout(handleTextSelection, 10);
  });

  // Клик мимо выделения — прячем попап
  document.addEventListener('mousedown', event => {
    if (event.target.closest && event.target.closest('#translatePopup')) return;
    lastTranslated = '';
    hideTranslatePopup();
  });

  // Esc — закрыть
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hideTranslatePopup();
  });

  // Прокрутка — попап привязан к тексту, поэтому скрываем
  window.addEventListener('scroll', hideTranslatePopup, { passive: true });
});

/* Экспорт в глобальную область */
window.translateToJapanese = translateToJapanese;
window.handleTextSelection = handleTextSelection;
window.hideTranslatePopup = hideTranslatePopup;
