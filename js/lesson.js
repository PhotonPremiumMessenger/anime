/* ============================================================
   lesson.js — страница одного урока
   Озвучка слов (Web Speech API), тест, сохранение прогресса
   и выдача достижений.
   ============================================================ */

'use strict';

// Текущий урок и его тест
let currentLesson = null;
let answers = [];      // выбранные индексы ответов
let checked = false;   // проверен ли тест

/* ---------- Защита страницы ---------- */

/** Без сессии отправляем на регистрацию, запомнив адрес возврата. */
function guardLessonPage() {
  if (typeof isAuthorized === 'function' && !isAuthorized()) {
    sessionStorage.setItem('redirectAfterLogin', 'lesson.html' + window.location.search);
    window.location.href = 'register.html';
    return false;
  }
  return true;
}

/* ---------- Поиск урока ---------- */

/** Берёт id из адреса (?id=2) и находит урок. */
function resolveLesson() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id')) || 1;
  const lessons = window.anilingo_lessons || [];

  return lessons.find(lesson => Number(lesson.id) === id) || lessons[0] || null;
}

/* ---------- Отрисовка ---------- */

/** Полностью рисует страницу урока. */
function renderLesson() {
  currentLesson = resolveLesson();

  if (!currentLesson) {
    const root = document.getElementById('lessonRoot');
    if (root) root.innerHTML = '<div class="empty-state">Урок не найден. <a href="lessons.html">Вернуться к каталогу</a></div>';
    return;
  }

  document.title = currentLesson.title + ' — AniLingo';

  const lessons = window.anilingo_lessons || [];
  const index = lessons.findIndex(item => item.id === currentLesson.id);
  const previous = lessons[index - 1] || null;
  const next = lessons[index + 1] || null;
  const record = getLessonProgress(currentLesson.id);

  // Обложка и заголовок
  const cover = document.getElementById('lessonCover');
  if (cover) cover.style.backgroundImage = 'url("' + currentLesson.cover + '")';

  const titleEl = document.getElementById('lessonTitle');
  if (titleEl) titleEl.textContent = currentLesson.title;

  const descEl = document.getElementById('lessonDescription');
  if (descEl) descEl.textContent = currentLesson.description;

  const levelEl = document.getElementById('lessonLevel');
  if (levelEl) levelEl.textContent = currentLesson.level;

  const durationEl = document.getElementById('lessonDuration');
  if (durationEl) durationEl.textContent = currentLesson.duration + ' мин';

  const wordsCountEl = document.getElementById('lessonWordsCount');
  if (wordsCountEl) wordsCountEl.textContent = currentLesson.words.length + ' слов';

  const bestEl = document.getElementById('lessonBest');
  if (bestEl) {
    bestEl.textContent = record && record.completed ? 'Лучший результат: ' + record.best + '%' : 'Ещё не пройден';
    bestEl.classList.toggle('is-done', Boolean(record && record.completed));
  }

  renderWords();
  renderGrammar();
  renderExamples();
  renderTest();
  renderLessonNav(previous, next);
  fillSpeakHint();
}

/** Список слов с кнопками озвучки. */
function renderWords() {
  const list = document.getElementById('wordList');
  if (!list || !currentLesson) return;

  list.innerHTML = '';

  currentLesson.words.forEach(word => {
    const row = document.createElement('div');
    row.className = 'word-row';
    row.innerHTML = `
      <span class="word-jp"></span>
      <span class="word-romaji"></span>
      <span class="word-ru"></span>
      <button class="speak-btn" type="button" title="Прослушать" aria-label="Прослушать слово">🔊</button>
    `;

    row.querySelector('.word-jp').textContent = word.jp;
    row.querySelector('.word-romaji').textContent = word.romaji;
    row.querySelector('.word-ru').textContent = word.ru;

    // Озвучка через Web Speech API
    row.querySelector('.speak-btn').addEventListener('click', event => {
      event.stopPropagation();
      speakJapanese(word.jp);
      playSpeakPulse(event.currentTarget);
    });

    list.appendChild(row);
  });
}

/** Небольшая анимация нажатия на кнопку озвучки. */
function playSpeakPulse(button) {
  if (!button) return;
  button.classList.add('speaking');
  setTimeout(() => button.classList.remove('speaking'), 600);
}

/** Блок грамматики. */
function renderGrammar() {
  const block = document.getElementById('grammarText');
  if (block && currentLesson) block.textContent = currentLesson.grammar;
}

/** Примеры с озвучкой. */
function renderExamples() {
  const list = document.getElementById('exampleList');
  if (!list || !currentLesson) return;

  list.innerHTML = '';

  currentLesson.examples.forEach(example => {
    const row = document.createElement('div');
    row.className = 'example-row';
    row.innerHTML = `
      <div class="example-text">
        <div class="example-jp"></div>
        <div class="example-romaji"></div>
        <div class="example-ru"></div>
      </div>
      <button class="speak-btn" type="button" title="Прослушать" aria-label="Прослушать пример">🔊</button>
    `;

    row.querySelector('.example-jp').textContent = example.jp;
    row.querySelector('.example-romaji').textContent = example.romaji;
    row.querySelector('.example-ru').textContent = example.ru;

    row.querySelector('.speak-btn').addEventListener('click', event => {
      event.stopPropagation();
      speakJapanese(example.jp);
      playSpeakPulse(event.currentTarget);
    });

    list.appendChild(row);
  });
}

/** Тест: вопросы и варианты ответов. */
function renderTest() {
  const box = document.getElementById('testBox');
  if (!box || !currentLesson) return;

  answers = new Array(currentLesson.test.length).fill(-1);
  checked = false;
  box.innerHTML = '';

  currentLesson.test.forEach((question, questionIndex) => {
    const item = document.createElement('div');
    item.className = 'test-question';
    item.dataset.question = String(questionIndex);

    const title = document.createElement('div');
    title.className = 'test-question-title';
    title.textContent = (questionIndex + 1) + '. ' + question.question;

    const options = document.createElement('div');
    options.className = 'test-options';

    question.options.forEach((option, optionIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'test-option';
      button.textContent = option;
      button.dataset.option = String(optionIndex);

      button.addEventListener('click', () => selectAnswer(questionIndex, optionIndex, options));
      options.appendChild(button);
    });

    item.appendChild(title);
    item.appendChild(options);
    box.appendChild(item);
  });

  // Сброс кнопок результата
  const result = document.getElementById('testResult');
  if (result) {
    result.textContent = '';
    result.className = 'test-result';
  }

  const finishBtn = document.getElementById('finishBtn');
  if (finishBtn) finishBtn.classList.add('hidden');

  const checkBtn = document.getElementById('checkBtn');
  if (checkBtn) {
    checkBtn.classList.remove('hidden');
    checkBtn.disabled = false;
    checkBtn.textContent = 'Проверить ответы';
  }
}

/** Выбор варианта ответа. */
function selectAnswer(questionIndex, optionIndex, optionsEl) {
  if (checked) return;

  answers[questionIndex] = optionIndex;

  optionsEl.querySelectorAll('.test-option').forEach((button, index) => {
    button.classList.toggle('selected', index === optionIndex);
  });

  // Прогресс урока: сколько вопросов уже отвечено
  if (typeof markTestAnswer === 'function') {
    markTestAnswer(answers.filter(answer => answer !== -1).length);
  }
}

/* ---------- Проверка теста ---------- */

/** Считает результат, подсвечивает верные и неверные ответы. */
function checkTest() {
  if (!currentLesson || checked) return;

  const unanswered = answers.filter(answer => answer === -1).length;

  if (unanswered > 0) {
    if (typeof showToast === 'function') {
      showToast('Не все ответы', 'Осталось вопросов: ' + unanswered, 'warning');
    }
    return;
  }

  checked = true;

  // Прогресс урока: тест проверен — шаг закрыт
  if (typeof markTestChecked === 'function') markTestChecked();

  let correctCount = 0;

  currentLesson.test.forEach((question, questionIndex) => {
    const item = document.querySelector('.test-question[data-question="' + questionIndex + '"]');
    if (!item) return;

    const options = item.querySelectorAll('.test-option');
    const chosen = answers[questionIndex];

    options.forEach((button, optionIndex) => {
      button.classList.remove('selected');

      if (optionIndex === question.correct) {
        button.classList.add('correct');
      } else if (optionIndex === chosen) {
        button.classList.add('wrong');
      }

      button.disabled = true;
    });

    if (chosen === question.correct) {
      correctCount += 1;
    } else if (typeof recordMistake === 'function') {
      // Ошибка попадает в дневник ошибок (js/mistakes.js, профиль)
      recordMistake(
        'Урок',
        currentLesson.title,
        question.question,
        question.options[question.correct],
        chosen >= 0 ? question.options[chosen] : ''
      );
    }
  });

  const percent = Math.round((correctCount / currentLesson.test.length) * 100);
  const result = document.getElementById('testResult');

  if (result) {
    result.className = 'test-result ' + (percent >= 70 ? 'is-good' : 'is-bad');
    result.textContent = 'Верных ответов: ' + correctCount + ' из ' + currentLesson.test.length + ' (' + percent + '%)';
  }

  // Показываем кнопку завершения
  const checkBtn = document.getElementById('checkBtn');
  if (checkBtn) checkBtn.classList.add('hidden');

  const finishBtn = document.getElementById('finishBtn');
  if (finishBtn) {
    finishBtn.classList.remove('hidden');
    finishBtn.disabled = false;
    finishBtn.textContent = percent >= 70 ? 'Завершить урок' : 'Всё равно завершить';
  }

  if (typeof showToast === 'function') {
    showToast(
      percent >= 70 ? 'Отличный результат!' : 'Почти получилось',
      'Верно ' + correctCount + ' из ' + currentLesson.test.length + '. Нажми «Завершить урок».',
      percent >= 70 ? 'success' : 'warning'
    );
  }
}

/* ---------- Завершение урока ---------- */

/** Сохраняет прогресс, открывает достижения и обновляет страницу. */
function finishLesson() {
  if (!currentLesson || !checked) return;

  const correctCount = currentLesson.test.reduce((sum, question, index) => {
    return sum + (answers[index] === question.correct ? 1 : 0);
  }, 0);

  const result = completeLesson(currentLesson.id, correctCount, currentLesson.test.length);

  const finishBtn = document.getElementById('finishBtn');
  if (finishBtn) {
    finishBtn.disabled = true;
    finishBtn.textContent = 'Урок пройден ✓';
  }

  const bestEl = document.getElementById('lessonBest');
  if (bestEl) {
    bestEl.textContent = 'Лучший результат: ' + Math.max(result.percent, getLessonProgress(currentLesson.id).best) + '%';
    bestEl.classList.add('is-done');
  }

  const wordsEl = document.getElementById('learnedWords');
  if (wordsEl) {
    wordsEl.textContent = result.newWords > 0
      ? 'Новых слов в копилке: +' + result.newWords
      : 'Все слова этого урока уже были в копилке';
  }

  // Урок закрыт: обновляем карту прогресса, копилку слов и точку у логотипа
  if (typeof markLessonCompleted === 'function') markLessonCompleted(currentLesson.id);
  if (typeof logWordsLearned === 'function') logWordsLearned(currentLesson.words);
  if (typeof markStudyDone === 'function') markStudyDone();

  if (typeof showToast === 'function') {
    showToast('Урок пройден', 'Результат: ' + result.percent + '%. Прогресс сохранён.', 'success');
  }
}

/* ---------- Навигация между уроками ---------- */

/** Ссылки «назад / следующий урок». */
function renderLessonNav(previous, next) {
  const nav = document.getElementById('lessonNav');
  if (!nav) return;

  nav.innerHTML = `
    <a class="btn btn-ghost" href="lessons.html">← Все уроки</a>
    <div class="lesson-nav-right"></div>
  `;

  const right = nav.querySelector('.lesson-nav-right');

  if (previous) {
    const link = document.createElement('a');
    link.className = 'btn btn-outline';
    link.href = 'lesson.html?id=' + previous.id;
    link.textContent = '← ' + previous.title;
    right.appendChild(link);
  }

  if (next) {
    const link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = 'lesson.html?id=' + next.id;
    link.textContent = next.title + ' →';
    right.appendChild(link);
  }
}

/** Подпись под словами о поддержке озвучки. */
function fillSpeakHint() {
  const hint = document.getElementById('speakHint');
  if (!hint) return;

  hint.textContent = isSpeechSupported()
    ? 'Нажми 🔊 рядом со словом, чтобы услышать произношение.'
    : 'Браузер не поддерживает озвучку — попробуй Chrome или Edge.';
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!guardLessonPage()) return;

  updateHeaderAuth();
  renderLesson();
});

/* Экспорт в глобальную область */
window.checkTest = checkTest;
window.finishLesson = finishLesson;
window.renderLesson = renderLesson;
