/* ============================================================
   quick-review.js — «Быстрый повтор» на главной
   Пять карточек из слов, которые учили вчера (даты лежат в
   anilingo_words_log, их пишет js/study.js). Если вчера занятий
   не было — берём слова из копилки, чтобы блок не пустовал.
   Клик по карточке переворачивает её: слово → перевод.
   ============================================================ */

'use strict';

// Сколько карточек показываем
const QUICK_REVIEW_COUNT = 5;

/** Все слова из уроков: удобно искать перевод по японскому слову. */
function quickReviewWordIndex() {
  const index = {};

  (window.anilingo_lessons || []).forEach(lesson => {
    (lesson.words || []).forEach(word => {
      if (word && word.jp && !index[word.jp]) index[word.jp] = word;
    });
  });

  return index;
}

/** Перемешивает массив (копию). */
function quickReviewShuffle(list) {
  const copy = list.slice();

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

/**
 * Слова для повтора.
 * @returns {{ words: Array, source: 'yesterday'|'stock' }}
 */
function getQuickReviewWords() {
  const index = quickReviewWordIndex();

  // 1. Слова, которые учили вчера
  if (typeof getWordsLearnedOn === 'function') {
    const yesterday = getWordsLearnedOn(studyYesterdayKey())
      .map(word => index[word.jp] || word)
      .filter(word => word && word.ru);

    if (yesterday.length) {
      return { words: quickReviewShuffle(yesterday).slice(0, QUICK_REVIEW_COUNT), source: 'yesterday' };
    }
  }

  // 2. Резерв: слова из журнала учёбы (любая дата)
  if (typeof getAllLoggedWords === 'function') {
    const logged = getAllLoggedWords().filter(word => word.ru);
    if (logged.length) {
      return { words: quickReviewShuffle(logged).slice(0, QUICK_REVIEW_COUNT), source: 'stock' };
    }
  }

  // 3. Резерв: слова из копилки, которые есть в уроках
  const progress = typeof readJSON === 'function' ? readJSON('anilingo_progress', null) : null;
  const learned = progress && Array.isArray(progress.words) ? progress.words : [];

  const stock = learned
    .map(jp => index[jp])
    .filter(word => word && word.ru);

  return { words: quickReviewShuffle(stock).slice(0, QUICK_REVIEW_COUNT), source: 'stock' };
}

/** Рисует блок быстрого повтора. */
function renderQuickReview() {
  const box = document.getElementById('quickReview');
  if (!box) return;

  const result = getQuickReviewWords();
  const words = result.words;

  if (!words.length) {
    box.innerHTML = `
      <div class="quick-review-empty">
        <p>Пока нечего повторять. Пройди первый урок — и здесь появятся слова.</p>
        <a class="btn btn-outline btn-small" href="lesson.html?id=1">Открыть урок</a>
      </div>
    `;
    return;
  }

  const note = document.getElementById('quickReviewNote');
  if (note) {
    note.textContent = result.source === 'yesterday'
      ? 'слова за вчера'
      : 'слова из копилки';
  }

  box.innerHTML = words.map(word => `
    <button type="button" class="review-card" onclick="flipReviewCard(this)" aria-label="Перевернуть карточку">
      <span class="review-card-inner">
        <span class="review-card-face review-card-front">
          <b>${word.jp}</b>
          <small>${word.romaji || ''}</small>
        </span>
        <span class="review-card-face review-card-back">
          <b>${word.ru || '—'}</b>
          <small>${word.jp}</small>
        </span>
      </span>
    </button>
  `).join('');
}

/** Переворачивает карточку. */
function flipReviewCard(card) {
  if (!card) return;
  card.classList.toggle('is-flipped');
}

document.addEventListener('DOMContentLoaded', renderQuickReview);

/* Экспорт в глобальную область */
window.renderQuickReview = renderQuickReview;
window.getQuickReviewWords = getQuickReviewWords;
window.flipReviewCard = flipReviewCard;
