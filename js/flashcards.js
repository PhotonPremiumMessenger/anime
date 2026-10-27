/* ============================================================
   flashcards.js — флешкарты с интервальными повторениями (SRS)
   Каждая карточка живёт в своей «коробке»: чем выше коробка,
   тем реже она попадается. Просроченные карточки собираются
   в очередь на сегодня. Всё хранится в nihongo_srs.
   ============================================================ */

'use strict';

const SRS_KEY = 'nihongo_srs';

// Через сколько карточка вернётся, если она в такой коробке
const SRS_BOXES = [
  { box: 1, delay: 10 * 60 * 1000, label: '10 минут' },
  { box: 2, delay: 24 * 60 * 60 * 1000, label: '1 день' },
  { box: 3, delay: 3 * 24 * 60 * 60 * 1000, label: '3 дня' },
  { box: 4, delay: 7 * 24 * 60 * 60 * 1000, label: '7 дней' },
  { box: 5, delay: 16 * 24 * 60 * 60 * 1000, label: '16 дней' },
  { box: 6, delay: 35 * 24 * 60 * 60 * 1000, label: '35 дней' }
];

let srsSession = null;

/* ---------- Хранилище ---------- */

/** Все карточки: { 'слово': { box, due, seen, right, wrong } }. */
function getSRSDeck() {
  const saved = readJSON(SRS_KEY, {});
  return saved && typeof saved === 'object' ? saved : {};
}

/** Сохраняет колоду. */
function saveSRSDeck(deck) {
  writeJSON(SRS_KEY, deck);
}

/** Задержка для коробки. */
function srsDelay(box) {
  const found = SRS_BOXES.find(item => item.box === box) || SRS_BOXES[0];
  return found.delay;
}

/** Слова выбранного уровня (или все). */
function getSRSWords(level) {
  const words = typeof getAllDictionaryWords === 'function' ? getAllDictionaryWords() : [];
  return level && level !== 'all' ? words.filter(word => word.level === level) : words;
}

/** Карточки, которые пора повторить. */
function getDueCards(level) {
  const deck = getSRSDeck();
  const now = Date.now();

  return getSRSWords(level).map(word => {
    const card = deck[word.jp] || { box: 0, due: 0, seen: 0, right: 0, wrong: 0 };
    return Object.assign({}, word, card, { isNew: !card.seen });
  }).filter(card => !card.due || card.due <= now)
    .sort((a, b) => (a.due || 0) - (b.due || 0));
}

/** Сводка по колоде: сколько всего, сколько выучено, сколько ждёт. */
function getSRSStats(level) {
  const deck = getSRSDeck();
  const words = getSRSWords(level);
  const now = Date.now();

  let learned = 0;
  let due = 0;
  let right = 0;
  let wrong = 0;

  words.forEach(word => {
    const card = deck[word.jp];
    if (!card || !card.seen) return;
    right += card.right || 0;
    wrong += card.wrong || 0;
    if ((card.box || 0) >= 5) learned += 1;
    if (!card.due || card.due <= now) due += 1;
  });

  return {
    total: words.length,
    studied: words.filter(word => deck[word.jp] && deck[word.jp].seen).length,
    learned: learned,
    due: due,
    accuracy: right + wrong ? Math.round((right / (right + wrong)) * 100) : 0
  };
}

/* ---------- Ответ на карточку ---------- */

/**
 * Оценка ответа.
 * @param {string} jp — японское слово
 * @param {string} grade — 'again' | 'hard' | 'good'
 */
function gradeCard(jp, grade) {
  const deck = getSRSDeck();
  const card = deck[jp] || { box: 0, due: 0, seen: 0, right: 0, wrong: 0 };

  card.seen = (card.seen || 0) + 1;

  if (grade === 'again') {
    card.box = 1;
    card.wrong = (card.wrong || 0) + 1;

    if (typeof recordMistake === 'function') {
      const word = (typeof getAllDictionaryWords === 'function' ? getAllDictionaryWords() : [])
        .find(item => item.jp === jp) || {};
      recordMistake('Словарь', word.level || 'Слова', jp + ' — что значит?', word.ru || '', 'не вспомнил');
    }
  } else if (grade === 'hard') {
    card.box = Math.max(1, card.box || 1);
    card.right = (card.right || 0) + 1;
  } else {
    card.box = Math.min(6, (card.box || 0) + 1);
    card.right = (card.right || 0) + 1;
  }

  card.due = Date.now() + srsDelay(card.box);
  card.lastAt = new Date().toISOString();

  deck[jp] = card;
  saveSRSDeck(deck);

  // Немного опыта за повторение: за «Знаю» больше, чем за «Не помню»
  if (typeof addXP === 'function') addXP(grade === 'good' ? 3 : 1, 'Флешкарта');
  if (typeof logActivity === 'function' && grade === 'good') {
    logActivity('study', 'Повторено слово ' + jp, 3);
  }

  return card;
}

/* ---------- Сессия ---------- */

/** Запускает сессию из карточек, которые пора повторить. */
function startFlashcards(level) {
  const lvl = level || (typeof getJLPT === 'function' ? getJLPT() : 'all');
  const cards = getDueCards(lvl).slice(0, 20);

  if (!cards.length) {
    showToast('На сегодня всё', 'Все карточки повторены. Заходи завтра или смени уровень.', 'info');
    renderFlashcards();
    return;
  }

  srsSession = {
    cards: cards,
    index: 0,
    level: lvl,
    mode: srsMode,
    flipped: false,
    right: 0,
    wrong: 0,
    startedAt: Date.now()
  };

  renderFlashcardStage();
}

/** Текущая карточка. */
function currentFlashcard() {
  if (!srsSession) return null;
  return srsSession.cards[srsSession.index] || null;
}

/** Переворачивает карточку. */
function flipFlashcard() {
  if (!srsSession) return;
  srsSession.flipped = !srsSession.flipped;
  renderFlashcardStage();
}

/** Ответ: again / hard / good. */
function answerFlashcard(grade) {
  const card = currentFlashcard();
  if (!card || !srsSession) return;

  gradeCard(card.jp, grade);
  if (grade === 'again') srsSession.wrong += 1;
  else srsSession.right += 1;

  srsSession.index += 1;
  srsSession.flipped = false;

  if (srsSession.index >= srsSession.cards.length) {
    finishFlashcards();
    return;
  }

  renderFlashcardStage();
}

/** Завершает сессию и показывает итог. */
function finishFlashcards() {
  if (!srsSession) return;

  const done = srsSession.index;
  const total = srsSession.cards.length;
  const bonus = done >= 10 ? 10 : 0;

  if (bonus && typeof addXP === 'function') addXP(bonus, 'Сессия флешкарт');

  srsSession.finished = true;
  srsSession.bonus = bonus;

  if (typeof markStudyDone === 'function') markStudyDone();

  const stage = document.getElementById('fcStage');
  if (stage) {
    stage.innerHTML = `
      <div class="fc-done">
        <span class="fc-done-icon">🌸</span>
        <h3>Сессия закрыта</h3>
        <p>Повторено ${done} из ${total} карточек${bonus ? ' · +' + bonus + ' XP за серию' : ''}</p>
        <div class="btn-row">
          <button class="btn btn-primary" onclick="startFlashcards()">Ещё сессия</button>
          <a class="btn btn-outline" href="dictionary.html">В словарь</a>
        </div>
      </div>
    `;
  }

  renderFlashcards();
}

/* ---------- Отрисовка ---------- */

let srsMode = 'jp-ru';

/** Переключение режима карточек. */
function setFlashcardMode(mode, button) {
  srsMode = mode;
  document.querySelectorAll('[data-fc-mode]').forEach(chip => {
    chip.classList.toggle('chip-active', chip.dataset.fcMode === mode);
  });
  if (button) button.classList.add('chip-active');
  renderFlashcards();
}

/** Подпись обратной стороны карточки. */
function flashcardBack(card) {
  if (srsMode === 'ru-jp') return card.jp;
  return (card.romaji || '') + ' · ' + card.ru;
}

/** Лицо карточки. */
function flashcardFront(card) {
  if (srsMode === 'ru-jp') return card.ru;
  return card.jp;
}

/** Рисует сцену с карточкой. */
function renderFlashcardStage() {
  const stage = document.getElementById('fcStage');
  if (!stage) return;

  const card = currentFlashcard();

  if (!srsSession || !card) {
    const stats = getSRSStats(srsMode === 'all' ? 'all' : (typeof getJLPT === 'function' ? getJLPT() : 'all'));
    stage.innerHTML = `
      <div class="fc-empty">
        <span class="fc-empty-icon">🃏</span>
        <h3>К повторению ${stats.due} ${plural(stats.due, 'карточка', 'карточки', 'карточек')}</h3>
        <p>Всего в колоде ${stats.total}. Выучено накрепко: ${stats.learned}. Точность: ${stats.accuracy}%.</p>
        <button class="btn btn-primary" onclick="startFlashcards()">Начать повторение</button>
      </div>
    `;
    return;
  }

  const total = srsSession.cards.length;
  const percent = Math.round((srsSession.index / total) * 100);
  const box = (getSRSDeck()[card.jp] || {}).box || 0;

  stage.innerHTML = `
    <div class="fc-progress">
      <span>Карточка ${srsSession.index + 1} из ${total}</span>
      <div class="progress-bar"><span style="width:${percent}%"></span></div>
      <span class="fc-box">коробка ${box || '—'}</span>
    </div>

    <button class="fc-card${srsSession.flipped ? ' is-flipped' : ''}" onclick="flipFlashcard()" aria-label="Перевернуть карточку">
      <span class="fc-face fc-front">${flashcardFront(card)}</span>
      <span class="fc-face fc-back">${flashcardBack(card)}</span>
      <span class="fc-hint">${srsSession.flipped ? 'Оцени, насколько помнишь' : 'Нажми, чтобы увидеть ответ'}</span>
    </button>

    <div class="fc-actions">
      <button class="btn btn-outline fc-again" onclick="answerFlashcard('again')" ${srsSession.flipped ? '' : 'disabled'}>Не помню</button>
      <button class="btn btn-outline fc-hard" onclick="answerFlashcard('hard')" ${srsSession.flipped ? '' : 'disabled'}>Трудно</button>
      <button class="btn btn-primary fc-good" onclick="answerFlashcard('good')" ${srsSession.flipped ? '' : 'disabled'}>Знаю</button>
    </div>
  `;
}

/** Полная отрисовка страницы. */
function renderFlashcards() {
  const box = document.getElementById('fcSummary');
  if (box) {
    const level = typeof getJLPT === 'function' ? getJLPT() : 'all';
    const stats = getSRSStats(level);

    box.innerHTML = `
      <div class="fc-stat"><b>${stats.due}</b><span>к повторению</span></div>
      <div class="fc-stat"><b>${stats.studied}</b><span>уже в колоде</span></div>
      <div class="fc-stat"><b>${stats.learned}</b><span>выучено</span></div>
      <div class="fc-stat"><b>${stats.accuracy}%</b><span>точность</span></div>
    `;
  }

  if (!srsSession || srsSession.finished) renderFlashcardStage();
}

/* ---------- Мелочи ---------- */

/** Склонение по числу. */
function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('fcStage')) return;

  renderFlashcards();

  // Enter переворачивает карточку, 1/2/3 — оценка
  document.addEventListener('keydown', event => {
    if (!srsSession || srsSession.finished) return;
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      flipFlashcard();
    }
    if (srsSession.flipped && ['1', '2', '3'].includes(event.key)) {
      answerFlashcard({ '1': 'again', '2': 'hard', '3': 'good' }[event.key]);
    }
  });
});

/* Экспорт в глобальную область */
window.getSRSDeck = getSRSDeck;
window.getDueCards = getDueCards;
window.getSRSStats = getSRSStats;
window.gradeCard = gradeCard;
window.startFlashcards = startFlashcards;
window.flipFlashcard = flipFlashcard;
window.answerFlashcard = answerFlashcard;
window.finishFlashcards = finishFlashcards;
window.setFlashcardMode = setFlashcardMode;
window.renderFlashcards = renderFlashcards;
window.renderFlashcardStage = renderFlashcardStage;
