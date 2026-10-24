/* ============================================================
   listening.js — аудирование на слух
   Слово произносится через Web Speech API (ja-JP), нужно выбрать
   правильный перевод или вписать ромадзи. Ключ nihongo_listening.
   ============================================================ */

'use strict';

const LISTENING_KEY = 'nihongo_listening';

let listeningState = null;

/* ---------- Статистика ---------- */

/** Итоги аудирования. */
function getListeningStats() {
  const saved = readJSON(LISTENING_KEY, { right: 0, wrong: 0, best: 0, rounds: 0 });
  return {
    right: Number(saved.right) || 0,
    wrong: Number(saved.wrong) || 0,
    best: Number(saved.best) || 0,
    rounds: Number(saved.rounds) || 0
  };
}

/** Сохраняет статистику. */
function saveListeningStats(stats) {
  writeJSON(LISTENING_KEY, stats);
}

/** Точность в процентах. */
function listeningAccuracy() {
  const stats = getListeningStats();
  const total = stats.right + stats.wrong;
  return total ? Math.round((stats.right / total) * 100) : 0;
}

/* ---------- Раунд ---------- */

/** Слова выбранного уровня. */
function listeningWords() {
  const level = typeof getJLPT === 'function' ? getJLPT() : 'all';
  const all = typeof getAllDictionaryWords === 'function' ? getAllDictionaryWords() : [];
  return level === 'all' ? all : all.filter(word => word.level === level);
}

/** Новый вопрос. */
function nextListeningQuestion() {
  const words = listeningWords();

  if (words.length < 4) {
    const box = document.getElementById('listeningStage');
    if (box) {
      box.innerHTML = '<div class="empty-state">Для этого уровня пока мало слов. Выбери «Все уровни».</div>';
    }
    return;
  }

  const pool = words.slice();
  const target = pool[Math.floor(Math.random() * pool.length)];
  const others = pool.filter(word => word.ru !== target.ru).sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [target.ru].concat(others.map(word => word.ru)).sort(() => Math.random() - 0.5);

  listeningState = {
    target: target,
    options: options,
    streak: (listeningState && listeningState.streak) || 0,
    answered: false,
    mode: listeningMode
  };

  renderListeningStage();
}

/** Переключение режима: выбор перевода или ввод ромадзи. */
let listeningMode = 'choice';

/** Меняет режим. */
function setListeningMode(mode) {
  listeningMode = mode;
  document.querySelectorAll('[data-listening-mode]').forEach(chip => {
    chip.classList.toggle('chip-active', chip.dataset.listeningMode === mode);
  });
  nextListeningQuestion();
}

/** Озвучивает текущее слово. */
function playListeningWord() {
  if (!listeningState) return;
  if (typeof speakJapanese === 'function') speakJapanese(listeningState.target.jp);
}

/** Проверка ответа в режиме ввода. */
function checkListeningInput() {
  if (!listeningState) return;

  const input = document.getElementById('listeningInput');
  if (!input) return;

  const value = String(input.value || '').trim().toLowerCase();
  const answer = (listeningState.target.romaji || '').toLowerCase();

  answerListening(value === answer ? 'input' : '', value);
}

/**
 * Обрабатывает ответ.
 * @param {string} picked — выбранный вариант (в режиме выбора)
 */
function answerListening(picked, typed) {
  if (!listeningState || listeningState.answered) return;

  const target = listeningState.target;
  const right = typed !== undefined
    ? String(typed).trim().toLowerCase() === (target.romaji || '').toLowerCase()
    : picked === target.ru;

  listeningState.answered = true;
  listeningState.picked = picked;
  listeningState.lastRight = right;

  const stats = getListeningStats();
  if (right) {
    stats.right += 1;
    stats.rounds += 1;
    stats.best = Math.max(stats.best, listeningState.streak + 1);
    listeningState.streak += 1;
    if (typeof addXP === 'function') addXP(4, 'Аудирование');
  } else {
    stats.wrong += 1;
    listeningState.streak = 0;

    if (typeof recordMistake === 'function') {
      recordMistake('Аудирование', target.level, target.jp + ' — что это?', target.ru, picked || typed || '');
    }
  }
  saveListeningStats(stats);

  renderListeningStage();
  renderListeningStats();
}

/** Сводка. */
function renderListeningStats() {
  const box = document.getElementById('listeningStats');
  if (!box) return;

  const stats = getListeningStats();

  box.innerHTML = `
    <div class="fc-stat"><b>${stats.right}</b><span>верно</span></div>
    <div class="fc-stat"><b>${stats.wrong}</b><span>ошибок</span></div>
    <div class="fc-stat"><b>${listeningAccuracy()}%</b><span>точность</span></div>
    <div class="fc-stat"><b>${stats.best}</b><span>лучшая серия</span></div>
  `;
}

/** Рисует вопрос. */
function renderListeningStage() {
  const box = document.getElementById('listeningStage');
  if (!box || !listeningState) return;

  const target = listeningState.target;
  const isChoice = listeningState.mode === 'choice';
  const answered = Boolean(listeningState.answered);

  box.innerHTML = `
    <div class="listening-head">
      <span class="chip chip-active">${target.level}</span>
      <span class="listening-streak">Серия: ${listeningState.streak}</span>
    </div>

    <button class="listening-play" onclick="playListeningWord()" aria-label="Прослушать слово">
      <span class="listening-play-icon">▶</span>
      <span>Прослушать</span>
    </button>

    <p class="listening-hint">${isChoice
      ? 'Что ты услышал? Выбери перевод.'
      : 'Напиши, как слово читается (ромадзи).'}</p>

    ${isChoice ? `
      <div class="listening-options">
        ${listeningState.options.map(option => {
          const right = option === target.ru;
          const picked = option === listeningState.picked;
          const cls = answered ? (right ? ' is-right' : picked ? ' is-wrong' : '') : '';
          return `<button class="listening-option${cls}" onclick="answerListening('${option.replace(/'/g, "\\'")}')">${option}</button>`;
        }).join('')}
      </div>
    ` : `
      <div class="listening-input-row">
        <input class="input" id="listeningInput" placeholder="romaji" autocomplete="off"
               onkeydown="if(event.key==='Enter')checkListeningInput()">
        <button class="btn btn-primary btn-small" onclick="checkListeningInput()">Проверить</button>
      </div>
      ${answered ? '<p class="listening-answer">Ответ: <b>' + target.romaji + '</b></p>' : ''}
    `}

    ${answered ? `
      <div class="listening-result ${listeningState.lastRight ? 'is-right' : 'is-wrong'}">
        <b>${target.jp}</b> · ${target.romaji} · ${target.ru}
      </div>
      <button class="btn btn-primary" onclick="nextListeningQuestion()">Дальше</button>
    ` : ''}
  `;

  if (!answered) {
    // Новый вопрос — сразу озвучиваем, чтобы не искать кнопку
    setTimeout(() => playListeningWord(), 250);
  }
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('listeningStage')) return;

  if (typeof isSpeechSupported === 'function' && !isSpeechSupported()) {
    document.getElementById('listeningStage').innerHTML =
      '<div class="empty-state">Браузер не поддерживает озвучку. Попробуй Chrome, Edge или Safari.</div>';
    return;
  }

  renderListeningStats();
  nextListeningQuestion();
});

/* Экспорт в глобальную область */
window.getListeningStats = getListeningStats;
window.setListeningMode = setListeningMode;
window.nextListeningQuestion = nextListeningQuestion;
window.playListeningWord = playListeningWord;
window.answerListening = answerListening;
window.checkListeningInput = checkListeningInput;
window.renderListeningStats = renderListeningStats;
