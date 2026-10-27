/* ============================================================
   tts-select.js — озвучка выделенного текста
   Работает на всех страницах. Как только игрок выделил текст
   с японскими символами, рядом появляется кнопка «Озвучить».
   Нажатие читает выделенное через Web Speech API (ja-JP).
   Если на странице есть speakJapanese() — используем его,
   чтобы сохранить выбранный голос, скорость и тон.
   ============================================================ */

'use strict';

// Японские символы: кана, кандзи, знаки пунктуации
const TTS_JAPANESE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf\uff66-\uff9f]/;

let ttsButton = null;
let ttsText = '';

/** Создаёт плавающую кнопку (один раз). */
function getTtsButton() {
  if (ttsButton) return ttsButton;

  ttsButton = document.createElement('button');
  ttsButton.type = 'button';
  ttsButton.className = 'tts-button';
  ttsButton.id = 'ttsButton';
  ttsButton.hidden = true;
  ttsButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z"></path>
      <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"></path>
    </svg>
    Озвучить
  `;

  // mousedown, а не click: иначе выделение успеет сброситься
  ttsButton.addEventListener('mousedown', event => {
    event.preventDefault();
    event.stopPropagation();
    speakSelection();
  });

  document.body.appendChild(ttsButton);
  return ttsButton;
}

/** Читает выделенный текст. */
function speakSelection() {
  const text = ttsText || String(window.getSelection() || '').trim();
  if (!text) return;

  hideTtsButton();

  // Основной путь: общая озвучка сайта с настройками голоса
  if (typeof speakJapanese === 'function') {
    speakJapanese(text);
    return;
  }

  if (!('speechSynthesis' in window)) {
    if (typeof showToast === 'function') {
      showToast('Озвучка недоступна', 'Браузер не поддерживает Web Speech API', 'warning');
    }
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.9;

  window.speechSynthesis.speak(utterance);
}

/** Прячет кнопку. */
function hideTtsButton() {
  if (!ttsButton) return;
  ttsButton.hidden = true;
  ttsText = '';
}

/**
 * Проверяет выделение и показывает кнопку рядом с ним.
 * Вызывается после mouseup/touchend с небольшой задержкой.
 */
function updateTtsButton() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    hideTtsButton();
    return;
  }

  const text = String(selection.toString() || '').trim();
  if (!text || text.length > 300 || !TTS_JAPANESE.test(text)) {
    hideTtsButton();
    return;
  }

  const range = selection.getRangeAt(0);

  // Не во всех браузерах у Range есть этот метод — тогда просто не показываем кнопку
  let rect = null;
  try {
    rect = range.getBoundingClientRect ? range.getBoundingClientRect() : null;
  } catch (error) {
    rect = null;
  }

  if (!rect || (!rect.width && !rect.height)) {
    hideTtsButton();
    return;
  }

  const button = getTtsButton();
  ttsText = text;
  button.hidden = false;

  // По умолчанию ставим под выделением: над ним обычно висит окно перевода.
  // Если снизу места нет — поднимаем кнопку наверх.
  const width = 128;
  const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left + rect.width / 2 - width / 2));
  const below = rect.bottom + 10;
  const top = below + 34 < window.innerHeight ? below : Math.max(12, rect.top - 44);

  button.style.left = Math.round(left) + 'px';
  button.style.top = Math.round(top) + 'px';
}

/* ---------- Слушатели ---------- */

document.addEventListener('mouseup', () => {
  setTimeout(updateTtsButton, 20);
});

document.addEventListener('touchend', () => {
  setTimeout(updateTtsButton, 220);
});

// Клик мимо выделения и прокрутка прячут кнопку
document.addEventListener('mousedown', event => {
  if (event.target === ttsButton || (ttsButton && ttsButton.contains(event.target))) return;
  hideTtsButton();
});

window.addEventListener('scroll', hideTtsButton, { passive: true });
window.addEventListener('resize', hideTtsButton);

/* Экспорт в глобальную область */
window.speakSelection = speakSelection;
window.hideTtsButton = hideTtsButton;
