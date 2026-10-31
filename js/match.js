/* ============================================================
   match.js — мини-игра «Кандзи-пары»
   На поле 4×4 лежат 8 слов и 8 переводов. Нужно открыть пару
   «слово + перевод». Ходы и время считаются, рекорд живёт
   в anilingo_match.
   ============================================================ */

'use strict';

const MATCH_KEY = 'anilingo_match';
const MATCH_PAIRS = 8;

let matchState = null;
let matchTimer = null;

/* ---------- Рекорд ---------- */

/** Лучший результат: меньше ходов и меньше времени — лучше. */
function getMatchRecord() {
  const saved = readJSON(MATCH_KEY, { moves: 0, seconds: 0, games: 0 });
  return {
    moves: Number(saved.moves) || 0,
    seconds: Number(saved.seconds) || 0,
    games: Number(saved.games) || 0
  };
}

/** Сохраняет результат, если он лучше. */
function saveMatchResult(moves, seconds) {
  const record = getMatchRecord();
  record.games += 1;

  const better = !record.moves || moves < record.moves ||
    (moves === record.moves && seconds < record.seconds);

  if (better) {
    record.moves = moves;
    record.seconds = seconds;
  }

  writeJSON(MATCH_KEY, record);
  return { record: record, better: better };
}

/* ---------- Сборка поля ---------- */

/** Слова выбранного уровня. */
function matchWords() {
  const level = typeof getJLPT === 'function' ? getJLPT() : 'all';
  const all = typeof getAllDictionaryWords === 'function' ? getAllDictionaryWords() : [];
  return level === 'all' ? all : all.filter(word => word.level === level);
}

/** Перемешивает массив. */
function shuffleMatch(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Стартует новую игру. */
function startMatchGame() {
  const words = matchWords();

  if (words.length < MATCH_PAIRS) {
    showToast('Мало слов', 'Для этого уровня не хватает слов — выбери «Все уровни»', 'warning');
    return;
  }

  const picked = shuffleMatch(words).slice(0, MATCH_PAIRS);

  // Каждая пара даёт две карточки с общим pairId
  const cards = [];
  picked.forEach((word, index) => {
    cards.push({ pairId: index, face: 'jp', text: word.jp, sub: word.romaji || '' });
    cards.push({ pairId: index, face: 'ru', text: word.ru, sub: '' });
  });

  matchState = {
    cards: shuffleMatch(cards),
    open: [],
    matched: [],
    moves: 0,
    seconds: 0,
    locked: false,
    done: false
  };

  startMatchTimer();
  renderMatchBoard();
}

/** Таймер игры. */
function startMatchTimer() {
  stopMatchTimer();
  matchTimer = setInterval(() => {
    if (!matchState || matchState.done) return stopMatchTimer();
    matchState.seconds += 1;
    const clock = document.getElementById('matchClock');
    if (clock) clock.textContent = formatMatchTime(matchState.seconds);
  }, 1000);
}

/** Останавливает таймер. */
function stopMatchTimer() {
  if (matchTimer) clearInterval(matchTimer);
  matchTimer = null;
}

/** Время в формате м:сс. */
function formatMatchTime(seconds) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
}

/* ---------- Ход ---------- */

/** Открывает карточку. */
function openMatchCard(index) {
  if (!matchState || matchState.done || matchState.locked) return;

  const card = matchState.cards[index];
  if (!card || matchState.open.includes(index) || matchState.matched.includes(index)) return;

  matchState.open.push(index);
  renderMatchBoard();

  if (matchState.open.length < 2) return;

  matchState.moves += 1;
  const [first, second] = matchState.open;
  const a = matchState.cards[first];
  const b = matchState.cards[second];

  if (a.pairId === b.pairId && a.face !== b.face) {
    // Пара найдена
    matchState.matched.push(first, second);
    matchState.open = [];
    if (typeof addXP === 'function') addXP(4, 'Кандзи-пара');

    if (matchState.matched.length === matchState.cards.length) {
      matchState.done = true;
      stopMatchTimer();
      finishMatchGame();
      return;
    }

    renderMatchBoard();
    renderMatchStats();
    return;
  }

  // Не совпало: подсвечиваем и закрываем через полсекунды
  matchState.locked = true;
  renderMatchBoard(true);

  setTimeout(() => {
    if (!matchState) return;
    matchState.open = [];
    matchState.locked = false;
    renderMatchBoard();
  }, 620);

  renderMatchStats();
}

/** Итог игры. */
function finishMatchGame() {
  const { moves, seconds } = matchState;
  const result = saveMatchResult(moves, seconds);

  if (typeof addXP === 'function') {
    const bonus = moves <= MATCH_PAIRS + 3 ? 30 : 12;
    addXP(bonus, 'Кандзи-пары');
  }
  if (typeof logActivity === 'function') {
    logActivity('study', 'Собраны все кандзи-пары за ' + moves + ' ходов', 30);
  }

  renderMatchBoard();

  const box = document.getElementById('matchResult');
  if (box) {
    box.innerHTML = `
      <div class="match-result-card">
        <span class="match-badge">${moves <= MATCH_PAIRS + 3 ? 'Идеально' : 'Готово'}</span>
        <h3>Все пары собраны</h3>
        <p>${moves} ходов · ${formatMatchTime(seconds)}${result.better ? ' · новый рекорд!' : ''}</p>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="startMatchGame()">Ещё партия</button>
          <a class="btn btn-outline" href="dictionary.html">В словарь</a>
        </div>
      </div>
    `;
  }

  renderMatchStats();
}

/* ---------- Отрисовка ---------- */

/** Поле 4×4. */
function renderMatchBoard(revealWrong) {
  const board = document.getElementById('matchBoard');
  if (!board || !matchState) return;

  board.innerHTML = matchState.cards.map((card, index) => {
    const isOpen = matchState.open.includes(index) || matchState.matched.includes(index);
    const isMatched = matchState.matched.includes(index);
    const wrong = revealWrong && matchState.open.includes(index);

    return `
      <button class="match-card${isOpen ? ' is-open' : ''}${isMatched ? ' is-matched' : ''}${wrong ? ' is-wrong' : ''}"
              onclick="openMatchCard(${index})" aria-label="${isOpen ? card.text : 'Закрытая карточка'}">
        <span class="match-face">${isOpen ? card.text : '?'}</span>
        <span class="match-sub">${isOpen ? card.sub || '' : ''}</span>
      </button>
    `;
  }).join('');
}

/** Счётчики игры. */
function renderMatchStats() {
  const box = document.getElementById('matchStats');
  if (!box) return;

  const record = getMatchRecord();

  box.innerHTML = `
    <div class="fc-stat"><b>${matchState ? matchState.moves : 0}</b><span>ходов</span></div>
    <div class="fc-stat"><b>${matchState ? matchState.matched.length / 2 : 0}</b><span>пар найдено</span></div>
    <div class="fc-stat"><b>${record.moves || '—'}</b><span>рекорд ходов</span></div>
    <div class="fc-stat"><b>${record.seconds ? formatMatchTime(record.seconds) : '—'}</b><span>лучшее время</span></div>
  `;
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('matchBoard')) return;

  const result = document.getElementById('matchResult');
  if (result) result.innerHTML = '';

  renderMatchStats();
  startMatchGame();
});

/* Экспорт в глобальную область */
window.getMatchRecord = getMatchRecord;
window.startMatchGame = startMatchGame;
window.openMatchCard = openMatchCard;
window.renderMatchStats = renderMatchStats;
window.formatMatchTime = formatMatchTime;
