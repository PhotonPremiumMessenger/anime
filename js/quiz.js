/* ============================================================
   quiz.js — викторина дня
   Пять вопросов выбираются по дате, поэтому у всех игроков
   в один день одна и та же викторина. Состояние — nihongo_quiz.
   ============================================================ */

'use strict';

/* ---------- Банк вопросов ---------- */

const QUIZ_POOL = [
  { q: 'Что означает こんにちは?', options: ['Здравствуйте', 'Спасибо', 'До свидания', 'Извините'], correct: 0 },
  { q: 'Как читается ありがとう?', options: ['arigatō', 'ohayō', 'sayōnara', 'sumimasen'], correct: 0 },
  { q: 'Что значит ねこ?', options: ['Кошка', 'Собака', 'Птица', 'Рыба'], correct: 0 },
  { q: 'Что означает いぬ?', options: ['Собака', 'Кошка', 'Лошадь', 'Кролик'], correct: 0 },
  { q: 'Какой символ означает слог «ка»?', options: ['か', 'き', 'く', 'け'], correct: 0 },
  { q: 'Как читается さようなら?', options: ['sayōnara', 'konnichiwa', 'konbanwa', 'arigatō'], correct: 0 },
  { q: 'Что означает すみません?', options: ['Извините', 'Здравствуйте', 'Спасибо', 'Спокойной ночи'], correct: 0 },
  { q: 'Что значит みず?', options: ['Вода', 'Огонь', 'Земля', 'Воздух'], correct: 0 },
  { q: 'Что значит ほん?', options: ['Книга', 'Ручка', 'Стол', 'Стул'], correct: 0 },
  { q: 'Как читается おはよう?', options: ['ohayō', 'oyasumi', 'okaeri', 'omae'], correct: 0 },
  { q: 'Что означает おやすみ?', options: ['Спокойной ночи', 'Доброе утро', 'Добрый день', 'До встречи'], correct: 0 },
  { q: 'Что значит ともだち?', options: ['Друг', 'Враг', 'Учитель', 'Ученик'], correct: 0 },
  { q: 'Что значит がっこう?', options: ['Школа', 'Больница', 'Магазин', 'Дом'], correct: 0 },
  { q: 'Частица を ставится перед…', options: ['прямым объектом', 'подлежащим', 'темой', 'сказуемым'], correct: 0 },
  { q: 'Как читается частица は?', options: ['ва', 'ха', 'ба', 'па'], correct: 0 },
  { q: 'Что означает たべる?', options: ['Есть, кушать', 'Пить', 'Спать', 'Идти'], correct: 0 },
  { q: 'Что значит のむ?', options: ['Пить', 'Есть', 'Смотреть', 'Слушать'], correct: 0 },
  { q: 'Что означает かわいい?', options: ['Милый', 'Страшный', 'Быстрый', 'Грустный'], correct: 0 },
  { q: 'Что значит すごい?', options: ['Здорово', 'Скучно', 'Тихо', 'Медленно'], correct: 0 },
  { q: 'Что означает やばい в аниме?', options: ['И «плохо», и «класс»', 'Только «плохо»', 'Только «спасибо»', 'Только «привет»'], correct: 0 },
  { q: 'Что значит ただいま?', options: ['Я дома', 'С возвращением', 'Доброй ночи', 'Приятного аппетита'], correct: 0 },
  { q: 'Как ответить на ただいま?', options: ['おかえり', 'おやすみ', 'いただきます', 'はじめまして'], correct: 0 },
  { q: 'Что означает がんばって?', options: ['Не сдавайся', 'Извини', 'Подожди', 'Иди сюда'], correct: 0 },
  { q: 'Что значит だいじょうぶ?', options: ['Всё в порядке', 'Опасно', 'Быстро', 'Холодно'], correct: 0 },
  { q: 'Что означает まって?', options: ['Подожди', 'Иди', 'Смотри', 'Слушай'], correct: 0 },
  { q: 'Что значит アニメ?', options: ['Аниме', 'Манга', 'Кино', 'Игра'], correct: 0 },
  { q: 'Сколько базовых знаков в хирагане?', options: ['46', '26', '52', '100'], correct: 0 },
  { q: 'Для чего используют катакану?', options: ['Для заимствований', 'Для частиц', 'Для чисел', 'Для глаголов'], correct: 0 },
  { q: 'Что значит こんばんは?', options: ['Добрый вечер', 'Доброе утро', 'Спокойной ночи', 'До свидания'], correct: 0 },
  { q: 'Какой уровень JLPT самый простой?', options: ['N5', 'N3', 'N2', 'N1'], correct: 0 },
  { q: 'Что означает せんせい?', options: ['Учитель', 'Ученик', 'Друг', 'Врач'], correct: 0 },
  { q: 'Что значит かぞく?', options: ['Семья', 'Работа', 'Улица', 'Погода'], correct: 0 },
  { q: 'Что означает さくら?', options: ['Сакура', 'Бамбук', 'Сосна', 'Клён'], correct: 0 },
  { q: 'Что значит ともだちがすきです?', options: ['Мне нравятся друзья', 'Я друг', 'Друзья ушли', 'Друг спит'], correct: 0 },
  { q: 'Частица の обозначает…', options: ['принадлежность', 'место действия', 'время', 'вопрос'], correct: 0 },
  { q: 'Что означает いただきます?', options: ['Приятного аппетита (перед едой)', 'Спасибо за еду (после)', 'Доброе утро', 'До встречи'], correct: 0 }
];

/* ---------- Состояние ---------- */

/** Выбирает пять вопросов на сегодня. */
function pickDailyQuestions() {
  const seeded = seededRandom(xpDayNumber() * 104729 + 13);
  const list = QUIZ_POOL.slice();

  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(seeded() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  // Перемешиваем и варианты ответа, чтобы правильный не был всегда первым
  return list.slice(0, 5).map(question => {
    const options = question.options.map((text, index) => ({ text, correct: index === question.correct }));
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(seeded() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      q: question.q,
      options: options.map(o => o.text),
      correct: options.findIndex(o => o.correct)
    };
  });
}

/** Состояние викторины на сегодня. */
function getQuizState() {
  const today = xpTodayKey();
  const saved = readJSON(XP_KEYS.quiz, null);

  if (saved && saved.date === today) return saved;

  const fresh = {
    date: today,
    questions: pickDailyQuestions(),
    index: 0,
    correct: 0,
    answers: [],
    done: false
  };

  writeJSON(XP_KEYS.quiz, fresh);
  return fresh;
}

/** Сохраняет состояние викторины. */
function saveQuizState(state) {
  writeJSON(XP_KEYS.quiz, state);
}

/* ---------- Прохождение ---------- */

/** Ответ на текущий вопрос. */
function answerQuiz(optionIndex) {
  const state = getQuizState();
  if (state.done) return;

  const question = state.questions[state.index];
  if (!question) return;

  const isCorrect = optionIndex === question.correct;

  state.answers.push({ index: state.index, chosen: optionIndex, correct: isCorrect });
  if (isCorrect) state.correct += 1;

  // Ошибка уходит в аналитику слабых мест
  if (!isCorrect && typeof recordMistake === 'function') {
    recordMistake('Викторина', question.topic || 'Викторина дня', question.question || '',
      (question.options || [])[question.correct] || '', (question.options || [])[optionIndex] || '');
  }

  // Подсвечиваем ответ на 900 мс, затем переходим дальше
  const buttons = document.querySelectorAll('#quizBlock .quiz-option');
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === question.correct) button.classList.add('is-right');
    if (index === optionIndex && !isCorrect) button.classList.add('is-wrong');
  });

  if (isCorrect) {
    notifyAction('quiz_correct', 1, { reason: 'Верный ответ' });
  }

  saveQuizState(state);

  setTimeout(() => {
    // Берём свежее состояние: задержка не должна «терять» ответы
    const current = getQuizState();

    if (current.answers.length >= current.questions.length) {
      finishQuiz();
    } else {
      current.index = current.answers.length;
      saveQuizState(current);
      renderQuizBlock();
    }
  }, 900);
}

/** Завершение викторины: XP и флаги достижений. */
function finishQuiz() {
  const state = getQuizState();
  state.done = true;
  saveQuizState(state);

  // XP за прохождение викторины целиком
  notifyAction('quiz', 1, { reason: 'Викторина дня' });

  if (state.correct === state.questions.length) {
    if (typeof setAchievementFlag === 'function') setAchievementFlag('quizPerfect');
    addXP(30, 'Викторина без ошибок');
  }

  if (typeof checkAchievements === 'function') checkAchievements();
  renderQuizBlock();
}

/* ---------- Отрисовка блока ---------- */

/** Рисует блок «Викторина дня» на главной. */
function renderQuizBlock() {
  const box = document.getElementById('quizBlock');
  if (!box) return;

  const authorized = typeof isAuthorized === 'function' && isAuthorized();

  if (!authorized) {
    box.innerHTML = `
      <div class="block-head">
        <h3>Викторина дня</h3>
        <span class="block-note">5 вопросов</span>
      </div>
      <div class="empty-state">Войди, чтобы проходить викторину и получать XP.</div>
    `;
    return;
  }

  const state = getQuizState();

  // Итог дня
  if (state.done) {
    const percent = Math.round((state.correct / state.questions.length) * 100);
    box.innerHTML = `
      <div class="block-head">
        <h3>Викторина дня</h3>
        <span class="block-note">пройдена сегодня</span>
      </div>
      <div class="quiz-result">
        <div class="quiz-score ${percent >= 60 ? 'is-good' : 'is-bad'}">
          <b>${state.correct}</b><span>из ${state.questions.length}</span>
        </div>
        <p>${percent === 100 ? 'Идеально! Ни одной ошибки.' :
             percent >= 60 ? 'Хороший результат. Новая викторина — завтра.' :
             'Есть куда расти. Попробуй уроки и возвращайся завтра.'}</p>
        <div class="quiz-answers">
          ${state.answers.map((answer, index) =>
            '<i class="' + (answer.correct ? 'ok' : 'no') + '">' + (index + 1) + '</i>'
          ).join('')}
        </div>
      </div>
    `;
    return;
  }

  const question = state.questions[state.index];
  const number = state.index + 1;

  box.innerHTML = `
    <div class="block-head">
      <h3>Викторина дня</h3>
      <span class="block-note">${number} из ${state.questions.length} · верно ${state.correct}</span>
    </div>
    <div class="quiz-progress"><span style="width:${Math.round((state.index / state.questions.length) * 100)}%"></span></div>
    <div class="quiz-question"></div>
    <div class="quiz-options"></div>
  `;

  box.querySelector('.quiz-question').textContent = question.q;

  const optionsBox = box.querySelector('.quiz-options');
  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-option';
    button.textContent = option;
    button.addEventListener('click', () => answerQuiz(index));
    optionsBox.appendChild(button);
  });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderQuizBlock();
});

/* Экспорт в глобальную область */
window.QUIZ_POOL = QUIZ_POOL;
window.getQuizState = getQuizState;
window.answerQuiz = answerQuiz;
window.finishQuiz = finishQuiz;
window.renderQuizBlock = renderQuizBlock;
