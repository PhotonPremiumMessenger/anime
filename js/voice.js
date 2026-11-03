/* ============================================================
   voice.js — блок озвучки в настройках

   Раньше здесь был выбор голоса браузера: список приходил из
   системы, и на телефоне без установленного японского языка
   слова читались «чем попало».

   Теперь голоса фиксированные и приходят с сервера
   (Microsoft Edge TTS, маршрут POST /api/tts):
   • японский — Нанами (ja-JP-NanamiNeural);
   • русский  — Светлана (ru-RU-SvetlanaNeural).

   Настраивается только скорость чтения: она уходит на сервер
   вместе с текстом. Кнопки ниже дают послушать оба голоса.
   ============================================================ */

'use strict';

const VOICE_SETTINGS = {
  rate: 'sound.speechRate'
};

// Что читаем при проверке голоса
const VOICE_TEST_JA = 'こんにちは。日本語を勉強しています。';
const VOICE_TEST_RU = 'Привет! Это голос озвучки АниЛинго.';

/** Скорость речи (0.5–1.5). */
function getSpeechRate() {
  const value = typeof getSettingValue === 'function'
    ? Number(getSettingValue(VOICE_SETTINGS.rate, 0.9))
    : 0.9;

  return Math.min(1.5, Math.max(0.5, value || 0.9));
}

/** Сохраняет скорость чтения. */
function saveVoiceTuning(rate) {
  const value = Math.min(1.5, Math.max(0.5, Number(rate) || 0.9));

  if (typeof setSettingValue === 'function') setSettingValue(VOICE_SETTINGS.rate, value);
  else writeJSON('anilingo_voice_tuning', { rate: value });
}

/** Реакция на ползунок скорости. */
function onVoiceTuningChange() {
  const input = document.getElementById('voiceRate');
  const label = document.getElementById('voiceRateValue');

  const rate = input ? Number(input.value) : getSpeechRate();
  if (label) label.textContent = rate.toFixed(2) + '×';

  saveVoiceTuning(rate);

  // Старый звук читался в другом темпе — кэш больше не подходит
  if (typeof resetJapaneseVoice === 'function') resetJapaneseVoice();
}

/** Проверяет голос: 'ja' — японский, 'ru' — русский. */
function testVoice(lang) {
  const isJa = lang !== 'ru';

  if (typeof speakText !== 'function') {
    if (typeof showToast === 'function') {
      showToast('Озвучка не подключена', 'Обновите страницу — модуль озвучки не загрузился', 'warning');
    }
    return;
  }

  speakText(isJa ? VOICE_TEST_JA : VOICE_TEST_RU, { lang: isJa ? 'ja' : 'ru' });
}

/** Очищает скачанный звук: пригодится, если кэш разросся. */
function clearVoiceCache() {
  if (typeof clearSpeechCache === 'function') {
    clearSpeechCache(true);
    return;
  }

  if (typeof showToast === 'function') showToast('Кэш уже пуст', '', 'info');
}

/**
 * Рисует блок озвучки в настройках.
 * Если контейнера нет — молча выходим.
 */
function renderVoicePicker() {
  const box = document.getElementById('voicePicker');
  if (!box) return;

  const rate = getSpeechRate();
  const ready = typeof isSpeechSupported === 'function' ? isSpeechSupported() : true;

  box.innerHTML = `
    <div class="voice-picker">
      <div class="voice-status">
        ${ready
          ? '<span class="voice-dot is-ok"></span> Голоса Microsoft: работают на любом устройстве'
          : '<span class="voice-dot is-warn"></span> Сервер озвучки сейчас не отвечает — попробуйте позже'}
      </div>

      <div class="voice-list">
        <div class="voice-item">
          <div class="voice-item-info">
            <b>Нанами</b>
            <span>японский · ja-JP</span>
          </div>
          <button class="voice-listen" type="button" onclick="testVoice('ja')" title="Послушать японский голос">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 9.5h3.4L12 5.6v12.8l-4.6-3.9H4z"></path>
              <path d="M16 9a4 4 0 0 1 0 6"></path>
              <path d="M18.6 6.6a7.6 7.6 0 0 1 0 10.8"></path>
            </svg>
          </button>
        </div>

        <div class="voice-item">
          <div class="voice-item-info">
            <b>Светлана</b>
            <span>русский · ru-RU</span>
          </div>
          <button class="voice-listen" type="button" onclick="testVoice('ru')" title="Послушать русский голос">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 9.5h3.4L12 5.6v12.8l-4.6-3.9H4z"></path>
              <path d="M16 9a4 4 0 0 1 0 6"></path>
              <path d="M18.6 6.6a7.6 7.6 0 0 1 0 10.8"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="voice-range">
        <div class="voice-range-top"><span>Скорость</span><b id="voiceRateValue">${rate.toFixed(2)}×</b></div>
        <input class="range" type="range" min="0.5" max="1.5" step="0.05" value="${rate}"
               id="voiceRate" oninput="onVoiceTuningChange()">
      </div>

      <div class="btn-row">
        <button class="btn btn-outline btn-small" style="flex:1" onclick="testVoice('ja')">🔊 Проверить голос</button>
        <button class="btn btn-ghost btn-small" onclick="clearVoiceCache()">Очистить кэш звука</button>
      </div>

      <p class="voice-hint">
        Японские слова читает Нанами, переводы и подсказки — Светлана.
        Звук приходит с сервера и сохраняется в браузере: повторное
        слово звучит сразу, без ожидания.
      </p>
    </div>
  `;
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderVoicePicker();
});

/* Экспорт в глобальную область */
window.getSpeechRate = getSpeechRate;
window.saveVoiceTuning = saveVoiceTuning;
window.onVoiceTuningChange = onVoiceTuningChange;
window.testVoice = testVoice;
window.clearVoiceCache = clearVoiceCache;
window.renderVoicePicker = renderVoicePicker;
