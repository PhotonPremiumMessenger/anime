/* ============================================================
   exam.js — пробный экзамен JLPT
   Три секции: словарь, грамматика, чтение. Вопросы собираются
   из тех же данных, что и сайт, поэтому уровень берётся из jlpt.js.
   Результаты сохраняются в nihongo_exam.
   ============================================================ */

'use strict';

const EXAM_KEY = 'nihongo_exam';
const EXAM_TIMER = 10 * 60; // секунд на весь экзамен

let examState = null;
let examTicker = null;

/* ---------- Результаты ---------- */

/** Прошлые попытки. */
function getExamHistory() {
  const saved = readJSON(EXAM_KEY, { attempts: [], best: 0 });
  return {
    attempts: Array.isArray(saved.attempts) ? saved.attempts : [],
    best: Number(saved.best) || 0
  };
}

/** Сохраняет попытку. */
function saveExamResult(result) {
  const history = getExamHistory();
  history.attempts.unshift(result);
  history.attempts = history.attempts.slice(0, 20);
  history.best = Math.max(history.best, result.score);
  writeJSON(EXAM_KEY, history);
  return history;
}

/* ---------- Сборка вопросов ---------- */

/** Перемешивает массив. */
function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Случайные слова того же уровня для вариантов ответа. */
function examDistractors(words, target, key) {
  const pool = words.filter(word => word.jp !== target.jp && word[key] !== target[key]);
  return shuffle(pool).slice(0, 3).map(word => word[key]);
}

/**
 * Собирает вопросы.
 * @param {string} level — 'all' | 'N5' | 'N4' | 'N3'
 */
function buildExamQuestions(level) {
  const allWords = typeof getAllDictionaryWords === 'function' ? getAllDictionaryWords() : [];
  const words = level === 'all' ? allWords : allWords.filter(word => word.level === level);
  const grammar = (window.GRAMMAR_RULES || []).filter(rule => level === 'all' || rule.level === level);

  const questions = [];

  // 語彙 — что значит слово
  shuffle(words).slice(0, 8).forEach(word => {
    const options = shuffle([word.ru].concat(examDistractors(words, word, 'ru')));
    questions.push({
      section: '語彙',
      sectionRu: 'Словарь',
      prompt: 'Что значит ' + word.jp + '?',
      hint: word.romaji,
      options: options,
      answer: word.ru,
      jp: word.jp
    });
  });

  // 文法 — выборка по правилам
  shuffle(grammar).slice(0, 6).forEach(rule => {
    const others = shuffle(grammar.filter(item => item.id !== rule.id)).slice(0, 3).map(item => item.short);
    const options = shuffle([rule.short].concat(others));

    questions.push({
      section: '文法',
      sectionRu: 'Грамматика',
      prompt: 'Для чего нужна частица/конструкция ' + rule.jp + '?',
      hint: rule.title,
      options: options,
      answer: rule.short,
      jp: rule.jp
    });
  });

  // 読解 — перевод фразы
  const phrases = [];
  (window.ANIME_CATALOG || []).forEach(anime => {
    if (anime.phrase) phrases.push({ jp: anime.phrase.jp, ru: anime.phrase.ru, level: anime.level });
  });
  shuffle(phrases).slice(0, 6).forEach(phrase => {
    const others = shuffle(phrases.filter(item => item.ru !== phrase.ru)).slice(0, 3).map(item => item.ru);
    questions.push({
      section: '読解',
      sectionRu: 'Чтение',
      prompt: 'Как переводится «' + phrase.jp + '»?',
      hint: '',
      options: shuffle([phrase.ru].concat(others)),
      answer: phrase.ru,
      jp: phrase.jp
    });
  });

  return shuffle(questions);
}

/* ---------- Экзамен ---------- */

/** Стартует экзамен. */
function startExam() {
  const level = typeof getJLPT === 'function' ? getJLPT() : 'all';
  const questions = buildExamQuestions(level);

  if (!questions.length) {
    showToast('Мало данных', 'Для этого уровня пока нет вопросов', 'warning');
    return;
  }

  examState = {
    level: level,
    questions: questions,
    index: 0,
    answers: [],
    left: EXAM_TIMER,
    startedAt: Date.now()
  };

  renderExam();
  startExamTimer();
}

/** Запускает таймер. */
function startExamTimer() {
  stopExamTimer();

  examTicker = setInterval(() => {
    if (!examState) return stopExamTimer();

    examState.left -= 1;
    updateExamClock();

    if (examState.left <= 0) {
      stopExamTimer();
      finishExam(true);
    }
  }, 1000);
}

/** Останавливает таймер. */
function stopExamTimer() {
  if (examTicker) clearInterval(examTicker);
  examTicker = null;
}

/** Обновляет часы в шапке экзамена. */
function updateExamClock() {
  const clock = document.getElementById('examClock');
  if (!clock || !examState) return;

  const minutes = Math.floor(Math.max(0, examState.left) / 60);
  const seconds = Math.max(0, examState.left) % 60;
  clock.textContent = minutes + ':' + String(seconds).padStart(2, '0');
  clock.classList.toggle('is-low', examState.left <= 60);
}

/** Отвечает на вопрос. */
function answerExam(option) {
  if (!examState) return;

  const question = examState.questions[examState.index];
  const right = option === question.answer;

  examState.answers.push({ question: question, picked: option, right: right });
  examState.index += 1;

  if (examState.index >= examState.questions.length) {
    finishExam(false);
    return;
  }

  renderExam();
}

/** Пропускает вопрос без ответа. */
function skipExamQuestion() {
  if (!examState) return;

  const question = examState.questions[examState.index];
  examState.answers.push({ question: question, picked: '', right: false });
  examState.index += 1;

  if (examState.index >= examState.questions.length) {
    finishExam(false);
    return;
  }

  renderExam();
}

/** Завершает экзамен. */
function finishExam(timeUp) {
  if (!examState) return;

  stopExamTimer();

  const total = examState.questions.length;
  const right = examState.answers.filter(item => item.right).length;
  const percent = Math.round((right / total) * 100);

  const result = {
    score: right,
    total: total,
    percent: percent,
    level: examState.level,
    seconds: Math.round((Date.now() - examState.startedAt) / 1000),
    at: new Date().toISOString(),
    // Секции считаются по этим ответам, без них итог был бы немым
    answers: examState.answers
  };

  const history = saveExamResult(result);

  // Награда за попытку и бонус за хороший результат
  if (typeof addXP === 'function') {
    addXP(right * 2, 'Пробный экзамен');
    if (percent >= 80) addXP(30, 'Экзамен сдан на отлично');
  }
  if (typeof logActivity === 'function') {
    logActivity('study', 'Пробный экзамен JLPT: ' + right + '/' + total, right * 2);
  }
  if (percent >= 80 && typeof pushNotification === 'function') {
    pushNotification('exam', 'Экзамен сдан на ' + percent + '%', 'Можно двигаться к следующему уровню');
  }

  renderExamResult(result, history.best, timeUp);
  examState = null;
  renderExamHistory();
}

/* ---------- Отрисовка ---------- */

/** Рисует экран экзамена. */
function renderExam() {
  const box = document.getElementById('examStage');
  if (!box || !examState) return;

  const question = examState.questions[examState.index];
  const total = examState.questions.length;
  const percent = Math.round((examState.index / total) * 100);

  box.innerHTML = `
    <div class="exam-top">
      <span class="exam-section">${question.section} · ${question.sectionRu}</span>
      <span class="exam-counter">${examState.index + 1} / ${total}</span>
      <span class="exam-clock" id="examClock">10:00</span>
    </div>

    <div class="progress-bar"><span style="width:${percent}%"></span></div>

    <h3 class="exam-question">${question.prompt}</h3>
    ${question.hint ? `<p class="exam-hint">${question.hint}</p>` : ''}

    <div class="exam-options">
      ${question.options.map((option, index) => `
        <button class="exam-option" onclick="answerExam('${String(option).replace(/'/g, "\\'")}')">
          <span class="exam-option-num">${index + 1}</span>
          <span>${option}</span>
        </button>
      `).join('')}
    </div>

    <button class="btn btn-ghost btn-small" onclick="skipExamQuestion()">Пропустить</button>
  `;

  updateExamClock();

  // Клавиши 1–4 выбирают ответ
  document.onkeydown = event => {
    if (!examState) return;
    const num = Number(event.key);
    if (num >= 1 && num <= 4) answerExam(examState.questions[examState.index].options[num - 1]);
  };
}

/** Итог экзамена. */
function renderExamResult(result, best, timeUp) {
  const box = document.getElementById('examStage');
  if (!box) return;

  const verdict = result.percent >= 80 ? 'Сдано' : result.percent >= 60 ? 'Почти' : 'Рано';
  const color = result.percent >= 80 ? 'good' : result.percent >= 60 ? 'ok' : 'bad';

  box.innerHTML = `
    <div class="exam-result is-${color}">
      ${timeUp ? '<p class="exam-timeup">Время вышло — ответы приняты как есть.</p>' : ''}
      <span class="exam-verdict">${verdict}</span>
      <h2>${result.score} из ${result.total}</h2>
      <p>${result.percent}% · уровень ${result.level === 'all' ? 'все' : result.level} · лучший результат ${Math.max(best, result.score)}</p>

      <div class="exam-sections">
        ${renderExamSections(result)}
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="startExam()">Ещё попытка</button>
        <a class="btn btn-outline" href="tests.html">К тестам</a>
      </div>
    </div>
  `;
}

/** Разбивка по секциям. */
function renderExamSections(result) {
  const bySection = {};

  (result.answers || []).forEach(item => {
    const section = item.question.sectionRu;
    if (!bySection[section]) bySection[section] = { right: 0, total: 0 };
    bySection[section].total += 1;
    if (item.right) bySection[section].right += 1;
  });

  return Object.keys(bySection).map(section => {
    const data = bySection[section];
    return `
      <div class="exam-section-row">
        <span>${section}</span>
        <div class="progress-bar"><span style="width:${Math.round((data.right / data.total) * 100)}%"></span></div>
        <b>${data.right}/${data.total}</b>
      </div>
    `;
  }).join('');
}

/** История попыток. */
function renderExamHistory() {
  const box = document.getElementById('examHistory');
  if (!box) return;

  const history = getExamHistory();

  if (!history.attempts.length) {
    box.innerHTML = '<p class="muted small">Пока ни одной попытки. Пробный экзамен бесплатный — можно сколько угодно.</p>';
    return;
  }

  box.innerHTML = `
    <div class="exam-history-list">
      ${history.attempts.slice(0, 6).map(item => `
        <div class="exam-history-row">
          <span class="exam-history-score">${item.score}/${item.total}</span>
          <span>${item.percent}%</span>
          <span class="muted small">${new Date(item.at).toLocaleDateString('ru-RU')}</span>
        </div>
      `).join('')}
    </div>
  `;
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('examStage')) return;

  const best = document.getElementById('examBest');
  if (best) best.textContent = getExamHistory().best || 0;

  renderExamHistory();

  const start = document.getElementById('examIntro');
  if (start) {
    start.innerHTML = `
      <div class="exam-intro-card">
        <h3>Как проходит экзамен</h3>
        <ul class="exam-rules">
          <li>20 вопросов: словарь, грамматика и чтение.</li>
          <li>10 минут на всё, таймер в шапке экзамена.</li>
          <li>Клавиши 1–4 выбирают ответ, «Пропустить» не отнимает попытку.</li>
          <li>80% и выше — экзамен сдан, +30 XP сверху.</li>
        </ul>
        <button class="btn btn-primary" onclick="startExam()">Начать экзамен</button>
      </div>
    `;
  }
});

/* Экспорт в глобальную область */
window.getExamHistory = getExamHistory;
window.buildExamQuestions = buildExamQuestions;
window.startExam = startExam;
window.answerExam = answerExam;
window.skipExamQuestion = skipExamQuestion;
window.finishExam = finishExam;
window.renderExamHistory = renderExamHistory;

/* Модуль делает вид, что это часть общего окна */
if (typeof window !== 'undefined') {
  window.stopExamTimer = stopExamTimer;
}
