/* ============================================================
   voice.js — выбор голоса озвучки
   Показывает все голоса браузера, отдельно — японские.
   Выбор, скорость и тон сохраняются в настройках и используются
   функцией speakJapanese().
   ============================================================ */

'use strict';

const VOICE_SETTINGS = {
  name: 'sound.voiceName',
  rate: 'sound.speechRate',
  pitch: 'sound.speechPitch'
};

// Тестовая фраза для прослушивания голоса
const VOICE_TEST_TEXT = 'こんにちは。私は日本語を勉強しています。';

/** Все доступные голоса браузера. */
function getVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices() || [];
}

/** Только японские голоса. */
function getJapaneseVoices() {
  return getVoices().filter(voice => /^ja/i.test(voice.lang));
}

/** Сохранённый голос или первый японский. */
function getSelectedVoice() {
  const voices = getVoices();
  if (!voices.length) return null;

  const savedName = typeof getSettingValue === 'function'
    ? getSettingValue(VOICE_SETTINGS.name, '')
    : '';

  const saved = voices.find(voice => voice.name === savedName);
  if (saved) return saved;

  const japanese = getJapaneseVoices();
  return japanese[0] || voices[0] || null;
}

/** Скорость речи (0.5–1.5). */
function getSpeechRate() {
  const value = typeof getSettingValue === 'function'
    ? Number(getSettingValue(VOICE_SETTINGS.rate, 0.9))
    : 0.9;

  return Math.min(1.5, Math.max(0.5, value || 0.9));
}

/** Тон речи (0.5–1.5). */
function getSpeechPitch() {
  const value = typeof getSettingValue === 'function'
    ? Number(getSettingValue(VOICE_SETTINGS.pitch, 1))
    : 1;

  return Math.min(1.5, Math.max(0.5, value || 1));
}

/** Сохраняет выбранный голос по имени. */
function saveVoiceName(name) {
  if (typeof setSettingValue === 'function') setSettingValue(VOICE_SETTINGS.name, name);
  else writeJSON('anilingo_voice', String(name || ''));
}

/** Сохраняет скорость и тон. */
function saveVoiceTuning(rate, pitch) {
  if (typeof setSettingValue === 'function') {
    setSettingValue(VOICE_SETTINGS.rate, Number(rate));
    setSettingValue(VOICE_SETTINGS.pitch, Number(pitch));
  } else {
    writeJSON('anilingo_voice_tuning', { rate: Number(rate), pitch: Number(pitch) });
  }
}

/** Произносит тестовую фразу текущими настройками. */
function testVoice() {
  if (!('speechSynthesis' in window)) {
    if (typeof showToast === 'function') {
      showToast('Озвучка недоступна', 'Браузер не поддерживает синтез речи', 'warning');
    }
    return;
  }

  // Если модуль прогресса подключён — говорим через него, чтобы настройки совпадали
  if (typeof speakJapanese === 'function') {
    speakJapanese(VOICE_TEST_TEXT);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(VOICE_TEST_TEXT);
  utterance.lang = 'ja-JP';
  utterance.rate = getSpeechRate();
  utterance.pitch = getSpeechPitch();

  const voice = getSelectedVoice();
  if (voice) utterance.voice = voice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/**
 * Рисует блок выбора голоса в настройках.
 * Если контейнера нет — молча выходим.
 */
function renderVoicePicker() {
  const box = document.getElementById('voicePicker');
  if (!box) return;

  if (!('speechSynthesis' in window)) {
    box.innerHTML = '<div class="empty-state">Этот браузер не поддерживает синтез речи. Озвучка слов работать не будет.</div>';
    return;
  }

  const voices = getVoices();
  const japanese = getJapaneseVoices();
  const selected = getSelectedVoice();
  const rate = getSpeechRate();
  const pitch = getSpeechPitch();

  if (!voices.length) {
    box.innerHTML = '<div class="empty-state">Голоса ещё загружаются… Открой блок чуть позже или нажми «Обновить».</div>';
  }

  const options = voices.map(voice => {
    const isJa = /^ja/i.test(voice.lang);
    const label = (isJa ? '🇯🇵 ' : '') + voice.name + ' (' + voice.lang + ')';

    return '<option value="' + escapeVoiceText(voice.name) + '"' +
      (selected && selected.name === voice.name ? ' selected' : '') + '>' +
      escapeVoiceText(label) + '</option>';
  }).join('');

  box.innerHTML = `
    <div class="voice-picker">
      <div class="voice-status">
        ${japanese.length
          ? '<span class="voice-dot is-ok"></span> Найдено японских голосов: ' + japanese.length
          : '<span class="voice-dot is-warn"></span> Японский голос не найден — браузер прочитает своим'}
      </div>

      <label class="voice-field">
        <span>Голос</span>
        <select id="voiceSelect" onchange="saveVoiceName(this.value)">
          ${options || '<option value="">— нет голосов —</option>'}
        </select>
      </label>

      <div class="voice-range">
        <div class="voice-range-top"><span>Скорость</span><b id="voiceRateValue">${rate.toFixed(2)}×</b></div>
        <input class="range" type="range" min="0.5" max="1.5" step="0.05" value="${rate}"
               id="voiceRate" oninput="onVoiceTuningChange()">
      </div>

      <div class="voice-range">
        <div class="voice-range-top"><span>Тон</span><b id="voicePitchValue">${pitch.toFixed(2)}</b></div>
        <input class="range" type="range" min="0.5" max="1.5" step="0.05" value="${pitch}"
               id="voicePitch" oninput="onVoiceTuningChange()">
      </div>

      <div class="btn-row">
        <button class="btn btn-outline btn-small" style="flex:1" onclick="testVoice()">🔊 Проверить голос</button>
        <button class="btn btn-ghost btn-small" onclick="refreshVoices()">Обновить список</button>
      </div>

      <p class="voice-hint">
        Голоса берутся из системы. Если японского нет — установи японский язык
        в настройках ОС или в браузере, тогда появится точное произношение.
      </p>
    </div>
  `;
}

/** Экранирование текста для вставки в HTML. */
function escapeVoiceText(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Реакция на ползунки скорости и тона. */
function onVoiceTuningChange() {
  const rateInput = document.getElementById('voiceRate');
  const pitchInput = document.getElementById('voicePitch');
  const rateValue = document.getElementById('voiceRateValue');
  const pitchValue = document.getElementById('voicePitchValue');

  const rate = rateInput ? Number(rateInput.value) : 0.9;
  const pitch = pitchInput ? Number(pitchInput.value) : 1;

  if (rateValue) rateValue.textContent = rate.toFixed(2) + '×';
  if (pitchValue) pitchValue.textContent = pitch.toFixed(2);

  saveVoiceTuning(rate, pitch);

  // Сбрасываем кэш голоса, чтобы применились новые параметры
  if (typeof resetJapaneseVoice === 'function') resetJapaneseVoice();
}

/** Перерисовка списка голосов. */
function refreshVoices() {
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  renderVoicePicker();
  if (typeof showToast === 'function') showToast('Список обновлён', 'Доступно голосов: ' + getVoices().length, 'info');
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderVoicePicker();

  if ('speechSynthesis' in window && typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', renderVoicePicker);
  }

  // Обратная совместимость: некоторые браузеры дают только onvoiceschanged
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = renderVoicePicker;
  }
});

/* Экспорт в глобальную область */
window.getVoices = getVoices;
window.getJapaneseVoices = getJapaneseVoices;
window.getSelectedVoice = getSelectedVoice;
window.getSpeechRate = getSpeechRate;
window.getSpeechPitch = getSpeechPitch;
window.saveVoiceName = saveVoiceName;
window.saveVoiceTuning = saveVoiceTuning;
window.testVoice = testVoice;
window.renderVoicePicker = renderVoicePicker;
window.onVoiceTuningChange = onVoiceTuningChange;
window.refreshVoices = refreshVoices;
