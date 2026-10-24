/* ============================================================
   speed.js — тест на скорость
   60 секунд, максимальное число верных ответов.
   За каждый верный ответ — XP. Рекорд хранится в nihongo_speed.
   ============================================================ */

'use strict';

/* ---------- Банк вопросов ---------- */

/**
 * Каждый вопрос: что показать и правильный ответ.
 * Остальные варианты подбираются из этого же банка.
 */
const SPEED_POOL = [
  // Хирагана → ромадзи
  { q: 'あ', a: 'a',     hint: 'хирагана' },
  { q: 'い', a: 'i',     hint: 'хирагана' },
  { q: 'う', a: 'u',     hint: 'хирагана' },
  { q: 'え', a: 'e',     hint: 'хирагана' },
  { q: 'お', a: 'o',     hint: 'хирагана' },
  { q: 'か', a: 'ka',    hint: 'хирагана' },
  { q: 'き', a: 'ki',    hint: 'хирагана' },
  { q: 'く', a: 'ku',    hint: 'хирагана' },
  { q: 'け', a: 'ke',    hint: 'хирагана' },
  { q: 'こ', a: 'ko',    hint: 'хирагана' },
  { q: 'さ', a: 'sa',    hint: 'хирагана' },
  { q: 'し', a: 'shi',   hint: 'хирагана' },
  { q: 'す', a: 'su',    hint: 'хирагана' },
  { q: 'せ', a: 'se',    hint: 'хирагана' },
  { q: 'そ', a: 'so',    hint: 'хирагана' },
  { q: 'た', a: 'ta',    hint: 'хирагана' },
  { q: 'ち', a: 'chi',   hint: 'хирагана' },
  { q: 'つ', a: 'tsu',   hint: 'хирагана' },
  { q: 'て', a: 'te',    hint: 'хирагана' },
  { q: 'と', a: 'to',    hint: 'хирагана' },
  { q: 'な', a: 'na',    hint: 'хирагана' },
  { q: 'に', a: 'ni',    hint: 'хирагана' },
  { q: 'ぬ', a: 'nu',    hint: 'хирагана' },
  { q: 'ね', a: 'ne',    hint: 'хирагана' },
  { q: 'の', a: 'no',    hint: 'хирагана' },
  { q: 'は', a: 'ha',    hint: 'хирагана' },
  { q: 'ひ', a: 'hi',    hint: 'хирагана' },
  { q: 'ふ', a: 'fu',    hint: 'хирагана' },
  { q: 'へ', a: 'he',    hint: 'хирагана' },
  { q: 'ほ', a: 'ho',    hint: 'хирагана' },
  { q: 'ま', a: 'ma',    hint: 'хирагана' },
  { q: 'み', a: 'mi',    hint: 'хирагана' },
  { q: 'む', a: 'mu',    hint: 'хирагана' },
  { q: 'め', a: 'me',    hint: 'хирагана' },
  { q: 'も', a: 'mo',    hint: 'хирагана' },
  { q: 'や', a: 'ya',    hint: 'хирагана' },
  { q: 'ゆ', a: 'yu',    hint: 'хирагана' },
  { q: 'よ', a: 'yo',    hint: 'хирагана' },
  { q: 'ら', a: 'ra',    hint: 'хирагана' },
  { q: 'り', a: 'ri',    hint: 'хирагана' },
  { q: 'る', a: 'ru',    hint: 'хирагана' },
  { q: 'れ', a: 're',    hint: 'хирагана' },
  { q: 'ろ', a: 'ro',    hint: 'хирагана' },
  { q: 'わ', a: 'wa',    hint: 'хирагана' },
  { q: 'を', a: 'wo',    hint: 'хирагана' },
  { q: 'ん', a: 'n',     hint: 'хирагана' },

  // Катакана → ромадзи
  { q: 'ア', a: 'a',     hint: 'катакана' },
  { q: 'カ', a: 'ka',    hint: 'катакана' },
  { q: 'サ', a: 'sa',    hint: 'катакана' },
  { q: 'タ', a: 'ta',    hint: 'катакана' },
  { q: 'ナ', a: 'na',    hint: 'катакана' },
  { q: 'ハ', a: 'ha',    hint: 'катакана' },
  { q: 'マ', a: 'ma',    hint: 'катакана' },
  { q: 'ラ', a: 'ra',    hint: 'катакана' },
  { q: 'コ', a: 'ko',    hint: 'катакана' },
  { q: 'ス', a: 'su',    hint: 'катакана' },

  // Слова → перевод
  { q: '猫 (ねこ)',    a: 'кошка',        hint: 'слово' },
  { q: '犬 (いぬ)',    a: 'собака',       hint: 'слово' },
  { q: '水 (みず)',    a: 'вода',         hint: 'слово' },
  { q: '火 (ひ)',      a: 'огонь',        hint: 'слово' },
  { q: '空 (そら)',    a: 'небо',         hint: 'слово' },
  { q: '海 (うみ)',    a: 'море',         hint: 'слово' },
  { q: '山 (やま)',    a: 'гора',         hint: 'слово' },
  { q: '川 (かわ)',    a: 'река',         hint: 'слово' },
  { q: '花 (はな)',    a: 'цветок',       hint: 'слово' },
  { q: '友 (とも)',    a: 'друг',         hint: 'слово' },
  { q: '先生 (せんせい)', a: 'учитель',   hint: 'слово' },
  { q: '学生 (がくせい)', a: 'студент',   hint: 'слово' },
  { q: '日本 (にほん)', a: 'Япония',      hint: 'слово' },
  { q: '食べる (たべる)', a: 'есть',      hint: 'слово' },
  { q: '飲む (のむ)',  a: 'пить',         hint: 'слово' },
  { q: '見る (みる)',  a: 'смотреть',     hint: 'слово' },
  { q: '行く (いく)',  a: 'идти',         hint: 'слово' },
  { q: '来る (くる)',  a: 'приходить',    hint: 'слово' },
  { q: '好き (すき)',  a: 'любить',       hint: 'слово' },
  { q: 'かわいい',     a: 'милый',        hint: 'слово' },
  { q: 'おいしい',     a: 'вкусный',      hint: 'слово' },
  { q: 'こんにちは',   a: 'здравствуйте', hint: 'фраза' },
  { q: 'ありがとう',   a: 'спасибо',      hint: 'фраза' },
  { q: 'さようなら',   a: 'до свидания',  hint: 'фраза' },
  { q: 'おはよう',     a: 'доброе утро',  hint: 'фраза' },
  { q: 'すみません',   a: 'извините',     hint: 'фраза' }
];

const SPEED_DURATION = 60; // секунд
const SPEED_XP_PER_CORRECT = 4;

/* ---------- Состояние теста ---------- */

const speedGame = {
  running: false,
  timeLeft: SPEED_DURATION,
  correct: 0,
  wrong: 0,
  combo: 0,
  bestCombo: 0,
  question: null,
  options: [],
  timer: null,
  locked: false,
  startedAt: 0
};

/* ---------- Рекорд ---------- */

/** Читает сохранённый рекорд. */
function getSpeedRecord() {
  const saved = readJSON(XP_KEYS.speed, {});
  return {
    best: Math.max(0, Number(saved.best) || 0),
    attempts: Math.max(0, Number(saved.attempts) || 0),
    bestDate: saved.bestDate || '',
    lastScore: Math.max(0, Number(saved.lastScore) || 0)
  };
}

/** Сохраняет результат попытки. */
function saveSpeedResult(score) {
  const record = getSpeedRecord();
  const isRecord = score > record.best;

  writeJSON(XP_KEYS.speed, {
    best: isRecord ? score : record.best,
    attempts: record.attempts + 1,
    lastScore: score,
    bestDate: isRecord ? xpTodayKey() : record.bestDate
  });

  return isRecord;
}

/* ---------- Игра ---------- */

/** Начинает тест: сбрасывает состояние и запускает таймер. */
function startSpeedTest() {
  speedGame.running = true;
  speedGame.timeLeft = SPEED_DURATION;
  speedGame.correct = 0;
  speedGame.wrong = 0;
  speedGame.combo = 0;
  speedGame.bestCombo = 0;
  speedGame.locked = false;
  speedGame.startedAt = Date.now();

  // Показываем игровое поле, прячем стартовый экран
  const start = document.getElementById('speedStart');
  const game = document.getElementById('speedGame');
  const result = document.getElementById('speedResult');

  if (start) start.classList.add('hidden');
  if (result) result.classList.add('hidden');
  if (game) game.classList.remove('hidden');

  updateSpeedHUD();
  nextSpeedQuestion();

  clearInterval(speedGame.timer);
  speedGame.timer = setInterval(() => {
    speedGame.timeLeft -= 1;
    updateSpeedHUD();

    if (speedGame.timeLeft <= 0) endSpeedTest();
  }, 1000);

  // Фокус на игровом поле, чтобы работала клавиатура
  const board = document.getElementById('speedBoard');
  if (board) board.focus();
}

/** Обновляет счётчики и таймер. */
function updateSpeedHUD() {
  const time = document.getElementById('speedTime');
  if (time) {
    time.textContent = speedGame.timeLeft;
    time.classList.toggle('is-low', speedGame.timeLeft <= 10);
  }

  const score = document.getElementById('speedScore');
  if (score) score.textContent = speedGame.correct;

  const combo = document.getElementById('speedCombo');
  if (combo) {
    combo.textContent = speedGame.combo >= 2 ? '×' + speedGame.combo + ' комбо' : '';
    combo.classList.toggle('is-on', speedGame.combo >= 2);
  }

  const bar = document.getElementById('speedBar');
  if (bar) bar.style.width = (speedGame.timeLeft / SPEED_DURATION) * 100 + '%';
}

/** Берёт случайный вопрос и три неверных варианта. */
function nextSpeedQuestion() {
  speedGame.locked = false;

  const question = SPEED_POOL[Math.floor(Math.random() * SPEED_POOL.length)];
  const wrong = SPEED_POOL
    .filter(item => item.a !== question.a)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(item => item.a);

  const options = wrong.concat([question.a]).sort(() => Math.random() - 0.5);

  speedGame.question = question;
  speedGame.options = options;

  const prompt = document.getElementById('speedPrompt');
  if (prompt) prompt.textContent = question.q;

  const hint = document.getElementById('speedHint');
  if (hint) hint.textContent = question.hint;

  const box = document.getElementById('speedOptions');
  if (!box) return;

  box.innerHTML = '';

  options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'speed-option';
    button.dataset.value = option;
    button.innerHTML = '<i>' + (index + 1) + '</i><span>' + option + '</span>';
    button.addEventListener('click', () => answerSpeed(option, button));
    box.appendChild(button);
  });
}

/**
 * Обрабатывает ответ. Верный — плюс комбо и XP, неверный — сброс комбо.
 */
function answerSpeed(option, button) {
  if (!speedGame.running || speedGame.locked) return;

  const isCorrect = option === speedGame.question.a;
  speedGame.locked = true;

  if (button) {
    button.classList.add(isCorrect ? 'is-right' : 'is-wrong');
  }

  if (isCorrect) {
    speedGame.correct += 1;
    speedGame.combo += 1;
    speedGame.bestCombo = Math.max(speedGame.bestCombo, speedGame.combo);

    // Бонус за комбо: каждые 5 подряд — ещё +10 XP
    if (speedGame.combo % 5 === 0) {
      addXP(SPEED_XP_PER_CORRECT + 10, 'Комбо');
    } else {
      addXP(SPEED_XP_PER_CORRECT, 'Скорость');
    }

    updateSpeedHUD();
    setTimeout(() => {
      if (speedGame.running) nextSpeedQuestion();
    }, 160);
    return;
  }

  // Ошибка: показываем правильный ответ и сбрасываем комбо
  speedGame.wrong += 1;
  speedGame.combo = 0;
  updateSpeedHUD();

  document.querySelectorAll('.speed-option').forEach(el => {
    if (el.dataset.value === speedGame.question.a) el.classList.add('is-right');
  });

  setTimeout(() => {
    if (speedGame.running) nextSpeedQuestion();
  }, 520);
}

/** Завершает тест и показывает результат. */
function endSpeedTest() {
  if (!speedGame.running) return;

  speedGame.running = false;
  clearInterval(speedGame.timer);

  const total = speedGame.correct + speedGame.wrong;
  const accuracy = total ? Math.round((speedGame.correct / total) * 100) : 0;

  // Бонус за результат
  if (speedGame.correct >= 20) addXP(30, 'Бонус скорости');
  else if (speedGame.correct >= 10) addXP(15, 'Бонус скорости');

  const isRecord = saveSpeedResult(speedGame.correct);
  bumpCounter('speed', 1);
  bumpCounter('speed_correct', speedGame.correct);

  if (typeof checkAchievements === 'function') checkAchievements();

  const game = document.getElementById('speedGame');
  const result = document.getElementById('speedResult');
  if (game) game.classList.add('hidden');
  if (result) result.classList.remove('hidden');

  const scoreEl = document.getElementById('resultScore');
  if (scoreEl) scoreEl.textContent = speedGame.correct;

  const accEl = document.getElementById('resultAccuracy');
  if (accEl) accEl.textContent = accuracy + '%';

  const comboEl = document.getElementById('resultCombo');
  if (comboEl) comboEl.textContent = speedGame.bestCombo;

  const xpEl = document.getElementById('resultXP');
  if (xpEl) xpEl.textContent = speedGame.correct * SPEED_XP_PER_CORRECT + ' XP';

  const recordEl = document.getElementById('resultRecord');
  if (recordEl) {
    recordEl.textContent = isRecord ? '🏆 Новый рекорд!' : 'Рекорд: ' + getSpeedRecord().best;
    recordEl.classList.toggle('is-record', isRecord);
  }

  const bestEl = document.getElementById('speedBest');
  if (bestEl) bestEl.textContent = getSpeedRecord().best;

  const attemptsEl = document.getElementById('speedAttempts');
  if (attemptsEl) attemptsEl.textContent = getSpeedRecord().attempts;

  if (isRecord && typeof showToast === 'function') {
    showToast('Новый рекорд!', speedGame.correct + ' верных ответов за 60 секунд', 'success');
  }
}

/** Сбрасывает поле и возвращает стартовый экран. */
function resetSpeedTest() {
  clearInterval(speedGame.timer);
  speedGame.running = false;

  const start = document.getElementById('speedStart');
  const game = document.getElementById('speedGame');
  const result = document.getElementById('speedResult');

  if (start) start.classList.remove('hidden');
  if (game) game.classList.add('hidden');
  if (result) result.classList.add('hidden');

  const record = getSpeedRecord();
  const bestEl = document.getElementById('speedBest');
  if (bestEl) bestEl.textContent = record.best;

  const attemptsEl = document.getElementById('speedAttempts');
  if (attemptsEl) attemptsEl.textContent = record.attempts;
}

/* ---------- Клавиатура ---------- */

document.addEventListener('keydown', event => {
  if (!speedGame.running) return;

  // 1–4 выбирают вариант ответа
  const number = Number(event.key);
  if (number >= 1 && number <= 4) {
    const button = document.querySelectorAll('.speed-option')[number - 1];
    if (button) answerSpeed(button.dataset.value, button);
  }
});

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('speedBoard')) return;

  resetSpeedTest();

  const startBtn = document.getElementById('speedStartBtn');
  if (startBtn) startBtn.addEventListener('click', startSpeedTest);

  const againBtn = document.getElementById('speedAgainBtn');
  if (againBtn) againBtn.addEventListener('click', resetSpeedTest);

  const retryBtn = document.getElementById('speedRetryBtn');
  if (retryBtn) retryBtn.addEventListener('click', startSpeedTest);
});

/* Экспорт в глобальную область */
window.SPEED_POOL = SPEED_POOL;
window.getSpeedRecord = getSpeedRecord;
window.startSpeedTest = startSpeedTest;
window.endSpeedTest = endSpeedTest;
window.resetSpeedTest = resetSpeedTest;
window.answerSpeed = answerSpeed;
