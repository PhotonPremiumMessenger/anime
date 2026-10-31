/* ============================================================
   game.js — мини-игра «Собери слово»
   Из перемешанных слогов нужно собрать японское слово.
   Раунд — 30 секунд. Верное слово +10, ошибка −5.
   Лучший счёт хранится в localStorage: anilingo_game_best.
   ============================================================ */

'use strict';

const GAME_KEY = 'anilingo_game_best';
const GAME_SECONDS = 30;

// Слова: слово целиком, слоги и перевод-подсказка
const GAME_WORDS = [
  { word: 'ひらがな', syllables: ['ひ', 'ら', 'が', 'な'], ru: 'хирагана' },
  { word: 'かたかな', syllables: ['か', 'た', 'か', 'な'], ru: 'катакана' },
  { word: 'にほんご', syllables: ['に', 'ほ', 'ん', 'ご'], ru: 'японский язык' },
  { word: 'ともだち', syllables: ['と', 'も', 'だ', 'ち'], ru: 'друг' },
  { word: 'せんせい', syllables: ['せ', 'ん', 'せ', 'い'], ru: 'учитель' },
  { word: 'がっこう', syllables: ['がっ', 'こ', 'う'], ru: 'школа' },
  { word: 'さくら', syllables: ['さ', 'く', 'ら'], ru: 'сакура' },
  { word: 'やま', syllables: ['や', 'ま'], ru: 'гора' },
  { word: 'かわ', syllables: ['か', 'わ'], ru: 'река' },
  { word: 'うみ', syllables: ['う', 'み'], ru: 'море' },
  { word: 'そら', syllables: ['そ', 'ら'], ru: 'небо' },
  { word: 'あめ', syllables: ['あ', 'め'], ru: 'дождь' },
  { word: 'ゆき', syllables: ['ゆ', 'き'], ru: 'снег' },
  { word: 'つき', syllables: ['つ', 'き'], ru: 'луна' },
  { word: 'ねこ', syllables: ['ね', 'こ'], ru: 'кошка' },
  { word: 'いぬ', syllables: ['い', 'ぬ'], ru: 'собака' },
  { word: 'ほん', syllables: ['ほ', 'ん'], ru: 'книга' },
  { word: 'みず', syllables: ['み', 'ず'], ru: 'вода' },
  { word: 'はな', syllables: ['は', 'な'], ru: 'цветок' },
  { word: 'でんしゃ', syllables: ['で', 'ん', 'しゃ'], ru: 'поезд' }
];

let gameState = null;
let gameTimer = null;

/* ---------- Хранилище ---------- */

/** Лучший счёт из localStorage. */
function getGameBest() {
  const saved = Number(readJSON(GAME_KEY, 0));
  return Number.isFinite(saved) ? saved : 0;
}

/** Сохраняет лучший счёт. */
function saveGameBest(score) {
  if (score > getGameBest()) writeJSON(GAME_KEY, score);
}

/* ---------- Раунд ---------- */

/** Перемешивает массив. */
function gameShuffle(list) {
  const copy = list.slice();

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

/** Следующее слово раунда. */
function gameNextWord() {
  const state = gameState;
  const word = GAME_WORDS[Math.floor(Math.random() * GAME_WORDS.length)];

  state.word = word;
  state.built = [];
  state.usedTiles = [];
  state.tiles = gameShuffle(word.syllables.map((text, index) => ({ text: text, id: index })));
  state.round += 1;

  paintGameWord();
}

/** Рисует слово, слоты и плитки со слогами. */
function paintGameWord() {
  const state = gameState;
  if (!state || !state.word) return;

  const task = document.getElementById('gameTask');
  const slots = document.getElementById('gameSlots');
  const syllables = document.getElementById('gameSyllables');
  const round = document.getElementById('gameWordNo');

  if (task) task.textContent = 'Собери: ' + state.word.ru;
  if (round) round.textContent = String(state.round);

  // Слоты: уже собранные слоги и пустые места
  if (slots) {
    slots.innerHTML = state.word.syllables.map((text, index) => `
      <span class="game-slot${state.built[index] ? ' is-filled' : ''}">${state.built[index] || ''}</span>
    `).join('');
  }

  if (syllables) {
    syllables.innerHTML = state.tiles.map(tile => `
      <button type="button" class="game-tile${state.usedTiles.includes(tile.id) ? ' is-used' : ''}"
              data-tile="${tile.id}" onclick="pickGameSyllable(${tile.id})">${tile.text}</button>
    `).join('');
  }
}

/** Клик по слогу. */
function pickGameSyllable(tileId) {
  const state = gameState;
  if (!state || !state.word) return;

  const tile = state.tiles.find(item => item.id === tileId);
  if (!tile || state.usedTiles.includes(tileId)) return;

  const expected = state.word.syllables[state.built.length];

  // Не тот слог — минус пять и начинаем слово заново
  if (tile.text !== expected) {
    state.score = Math.max(0, state.score - 5);
    paintGameScore();

    if (typeof showToast === 'function') {
      showToast('Мимо', 'Порядок слогов другой — попробуй ещё раз. −5 очков', 'warning');
    }

    state.built = [];
    state.usedTiles = [];
    paintGameWord();
    shakeGameBoard();
    return;
  }

  // Верный слог
  state.built.push(tile.text);
  state.usedTiles.push(tileId);
  paintGameWord();

  if (state.built.length === state.word.syllables.length) {
    state.score += 10;
    state.solved += 1;
    paintGameScore();

    if (typeof showToast === 'function') {
      showToast('Собрано!', state.word.word + ' — ' + state.word.ru + '. +10 очков', 'success');
    }

    setTimeout(() => {
      if (gameState && gameState.running) gameNextWord();
    }, 450);
  }
}

/** Покачивает поле при ошибке. */
function shakeGameBoard() {
  const board = document.getElementById('gameBoard');
  if (!board) return;

  board.classList.remove('is-shaking');
  // Перезапуск анимации: заставляем браузер пересчитать стили
  void board.offsetWidth;
  board.classList.add('is-shaking');
}

/** Обновляет очки и время. */
function paintGameScore() {
  const score = document.getElementById('gameScore');
  if (score && gameState) score.textContent = String(gameState.score);
}

/** Старт раунда. */
function startGame() {
  gameState = { score: 0, solved: 0, round: 0, left: GAME_SECONDS, running: true, word: null, built: [], usedTiles: [], tiles: [] };

  document.getElementById('gameStart').classList.add('hidden');
  document.getElementById('gameOver').classList.add('hidden');
  document.getElementById('gameBoard').classList.remove('hidden');

  paintGameScore();
  paintGameTime();
  gameNextWord();

  clearInterval(gameTimer);
  gameTimer = setInterval(gameTick, 1000);
}

/** Одна секунда раунда. */
function gameTick() {
  if (!gameState || !gameState.running) return;

  gameState.left -= 1;
  paintGameTime();

  if (gameState.left <= 0) finishGame();
}

/** Обновляет таймер. */
function paintGameTime() {
  const time = document.getElementById('gameTime');
  if (time && gameState) time.textContent = String(Math.max(0, gameState.left));
}

/** Конец раунда. */
function finishGame() {
  clearInterval(gameTimer);

  if (!gameState) return;
  gameState.running = false;

  const score = gameState.score;
  const best = Math.max(score, getGameBest());
  saveGameBest(score);

  document.getElementById('gameBoard').classList.add('hidden');
  document.getElementById('gameOver').classList.remove('hidden');

  const result = document.getElementById('gameResult');
  if (result) {
    result.innerHTML = `
      <div class="game-result-score">${score}</div>
      <p>Слов собрано: <b>${gameState.solved}</b> · лучший счёт: <b>${best}</b></p>
    `;
  }

  const bestEl = document.getElementById('gameBest');
  if (bestEl) bestEl.textContent = String(best);

  const rounds = document.getElementById('gameRounds');
  if (rounds) rounds.textContent = String(gameState.solved);

  // Занятие засчитывается — точка у логотипа станет зелёной
  if (typeof markStudyDone === 'function') markStudyDone();
  if (typeof notifyAction === 'function') notifyAction('test', 1, { reason: 'Собери слово' });
}

/* ---------- Запуск ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('gameBoard')) return;

  const best = document.getElementById('gameBest');
  if (best) best.textContent = String(getGameBest());

  const start = document.getElementById('gameStartBtn');
  if (start) start.addEventListener('click', startGame);

  const again = document.getElementById('gameAgainBtn');
  if (again) again.addEventListener('click', startGame);
});

/* Экспорт в глобальную область */
window.startGame = startGame;
window.pickGameSyllable = pickGameSyllable;
window.GAME_WORDS = GAME_WORDS;
window.getGameState = () => gameState;
