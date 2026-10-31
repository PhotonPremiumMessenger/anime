/* ============================================================
   tests.js — тесты по урокам и грамматике
   5 тестов по урокам + тест по грамматике + смешанный.
   Вопросы собираются из данных уроков и правил, поэтому
   новые уроки автоматически получают свой тест.
   ============================================================ */

'use strict';

const TESTS_KEY = 'anilingo_tests';

/* ---------- Сборка тестов ---------- */

// seededRandom() объявлен в js/daily.js — он подключается раньше на всех
// страницах с тестами. Здесь не дублируем.

/** Перемешивает массив с заданным генератором. */
function shuffleWith(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Уникальные неправильные варианты. */
function pickWrong(correct, pool, count, random) {
  const wrong = pool
    .filter(value => value && value !== correct)
    .filter((value, index, array) => array.indexOf(value) === index);

  return shuffleWith(wrong, random).slice(0, count);
}

/**
 * Собирает тест по уроку: 10 вопросов из слов и примеров.
 * @param {object} lesson
 * @returns {Array}
 */
function buildLessonTest(lesson) {
  const random = seededRandom(lesson.id * 7919 + 17);
  const allWords = (window.anilingo_lessons || []).flatMap(item => item.words || []);

  const questions = [];

  // Первые шесть вопросов — «как читается»
  shuffleWith(lesson.words, random).slice(0, 6).forEach(word => {
    const romajiPool = allWords.map(item => item.romaji);

    const options = shuffleWith(
      pickWrong(word.romaji, romajiPool, 3, random).concat([word.romaji]),
      random
    );

    questions.push({
      question: 'Как читается ' + word.jp + '?',
      options: options,
      correct: options.indexOf(word.romaji),
      jp: word.jp
    });
  });

  // Ещё четыре — «что значит»
  shuffleWith(lesson.words, random).slice(0, 4).forEach(word => {
    const ruPool = allWords.map(item => item.ru);
    const options = shuffleWith(
      pickWrong(word.ru, ruPool, 3, random).concat([word.ru]),
      random
    );

    questions.push({
      question: 'Что означает ' + word.jp + ' (' + word.romaji + ')?',
      options: options,
      correct: options.indexOf(word.ru),
      jp: word.jp
    });
  });

  return shuffleWith(questions, random);
}

/** Тест по грамматике: перевод примеров из правил. */
function buildGrammarTest() {
  const rules = window.GRAMMAR_RULES || [];
  const random = seededRandom(424242);

  const allExamples = rules.flatMap(rule => rule.examples || []);
  const picked = shuffleWith(allExamples, random).slice(0, 10);
  const translations = allExamples.map(example => example.ru);

  return picked.map(example => {
    const options = shuffleWith(
      pickWrong(example.ru, translations, 3, random).concat([example.ru]),
      random
    );

    return {
      question: 'Как переводится «' + example.jp + '»?',
      options: options,
      correct: options.indexOf(example.ru),
      jp: example.jp
    };
  });
}

/** Смешанный тест: 15 вопросов из всех уроков. */
function buildMixedTest() {
  const lessons = window.anilingo_lessons || [];
  const random = seededRandom(987654321);

  const questions = [];
  lessons.forEach(lesson => {
    const test = buildLessonTest(lesson);
    questions.push(...shuffleWith(test, random).slice(0, 3));
  });

  return shuffleWith(questions, random).slice(0, 15);
}

/** Список всех доступных тестов. */
function getAllTests() {
  const lessons = window.anilingo_lessons || [];

  const tests = lessons.map(lesson => ({
    id: 'lesson-' + lesson.id,
    title: 'Тест: ' + lesson.title,
    subtitle: lesson.words.length + ' слов · ' + lesson.level,
    level: lesson.level,
    icon: '本',
    questions: buildLessonTest(lesson)
  }));

  if ((window.GRAMMAR_RULES || []).length) {
    tests.push({
      id: 'grammar',
      title: 'Тест по грамматике',
      subtitle: 'Частицы, формы, сравнение',
      level: 'N5–N4',
      icon: '文',
      questions: buildGrammarTest()
    });
  }

  tests.push({
    id: 'mixed',
    title: 'Смешанный тест',
    subtitle: 'Вопросы из всех уроков',
    level: 'всё',
    icon: '乱',
    questions: buildMixedTest()
  });

  return tests;
}

/* ---------- Результаты ---------- */

/** Все сохранённые результаты. */
function getTestResults() {
  const saved = readJSON(TESTS_KEY, {});
  return saved && typeof saved === 'object' ? saved : {};
}

/** Лучший результат теста. */
function getBestTestScore(id) {
  const results = getTestResults();
  return results[id] ? Number(results[id].best) || 0 : 0;
}

/** Сохраняет результат и возвращает true, если это новый рекорд. */
function saveTestResult(id, percent) {
  const results = getTestResults();
  const previous = results[id] || { best: 0, attempts: 0 };
  const isRecord = percent > Number(previous.best || 0);

  results[id] = {
    best: isRecord ? percent : previous.best,
    attempts: Number(previous.attempts || 0) + 1,
    last: percent,
    updatedAt: new Date().toISOString()
  };

  writeJSON(TESTS_KEY, results);
  return isRecord;
}

/* ---------- Состояние прохождения ---------- */

const testState = {
  test: null,
  index: 0,
  answers: [],
  correct: 0,
  locked: false
};

/* ---------- Список тестов ---------- */

let testsLevel = 'all';

/** Фильтр тестов по уровню JLPT. */
function filterTestsLevel(level) {
  testsLevel = level || 'all';
  renderTestsList();
}

/** Рисует карточки тестов. */
function renderTestsList() {
  const grid = document.getElementById('testsGrid');
  if (!grid) return;

  const all = getAllTests();
  const tests = testsLevel === 'all'
    ? all
    : all.filter(test => String(test.level).includes(testsLevel));

  grid.innerHTML = '';

  if (!tests.length) {
    grid.innerHTML = '<div class="empty-state">Тестов этого уровня пока нет. Переключи уровень или выбери «Все».</div>';
  }

  tests.forEach(test => {
    const best = getBestTestScore(test.id);

    const card = document.createElement('article');
    card.className = 'test-card';
    card.innerHTML = `
      <div class="test-card-icon">${test.icon}</div>
      <div class="test-card-body">
        <h3></h3>
        <p></p>
        <div class="test-card-meta">
          <span>${test.questions.length} вопросов</span>
          <span class="test-level">${test.level}</span>
        </div>
        <div class="test-card-foot">
          <span class="test-best">${best ? 'Лучший: ' + best + '%' : 'Ещё не проходил'}</span>
          <button class="btn btn-primary btn-small">Начать</button>
        </div>
      </div>
    `;

    card.querySelector('h3').textContent = test.title;
    card.querySelector('p').textContent = test.subtitle;
    card.querySelector('.test-best').classList.toggle('is-good', best >= 80);
    card.querySelector('button').addEventListener('click', () => startTest(test.id));

    grid.appendChild(card);
  });
}

/* ---------- Прохождение ---------- */

/** Запускает тест по id. */
function startTest(id) {
  const test = getAllTests().find(item => item.id === id);
  if (!test) return;

  testState.test = test;
  testState.index = 0;
  testState.answers = [];
  testState.correct = 0;
  testState.locked = false;

  const list = document.getElementById('testsListSection');
  const runner = document.getElementById('testRunner');
  const result = document.getElementById('testResultScreen');

  if (list) list.classList.add('hidden');
  if (result) result.classList.add('hidden');
  if (runner) runner.classList.remove('hidden');

  renderTestQuestion();

  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', 'tests?test=' + id);
  }
}

/** Рисует текущий вопрос. */
function renderTestQuestion() {
  const runner = document.getElementById('testRunner');
  const test = testState.test;
  if (!runner || !test) return;

  const question = test.questions[testState.index];
  const total = test.questions.length;
  const percent = Math.round((testState.index / total) * 100);

  runner.innerHTML = `
    <div class="test-runner-head">
      <button class="btn btn-ghost btn-small" onclick="closeTest()">← К тестам</button>
      <span class="test-progress-text">${testState.index + 1} / ${total}</span>
    </div>

    <div class="progress-bar"><span style="width:${percent}%"></span></div>

    <h2 class="test-question-lg"></h2>
    <div class="test-options-lg"></div>

    <div class="test-runner-foot">
      <span class="test-correct-count">Верно: ${testState.correct}</span>
      <span class="small muted">Клавиши 1–4 или клик</span>
    </div>
  `;

  runner.querySelector('.test-question-lg').textContent = question.question;

  const optionsBox = runner.querySelector('.test-options-lg');
  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'test-option-lg';
    button.innerHTML = '<i>' + (index + 1) + '</i><span></span>';
    button.querySelector('span').textContent = option;
    button.addEventListener('click', () => answerTest(index, button));
    optionsBox.appendChild(button);
  });

  testState.locked = false;
}

/** Ответ на вопрос. */
function answerTest(optionIndex, button) {
  if (testState.locked || !testState.test) return;

  testState.locked = true;
  const question = testState.test.questions[testState.index];
  const isCorrect = optionIndex === question.correct;

  testState.answers.push({ question: question.question, correct: isCorrect });
  if (isCorrect) testState.correct += 1;

  // Ошибка уходит в аналитику слабых мест
  if (!isCorrect && typeof recordMistake === 'function') {
    recordMistake('Тесты', testState.test.level || 'Тест', question.question,
      question.options[question.correct], question.options[optionIndex]);
  }

  document.querySelectorAll('.test-option-lg').forEach((element, index) => {
    element.disabled = true;
    if (index === question.correct) element.classList.add('is-right');
    if (index === optionIndex && !isCorrect) element.classList.add('is-wrong');
  });

  const counter = document.querySelector('.test-correct-count');
  if (counter) counter.textContent = 'Верно: ' + testState.correct;

  setTimeout(() => {
    testState.index += 1;

    if (testState.index >= testState.test.questions.length) {
      finishTest();
    } else {
      renderTestQuestion();
    }
  }, isCorrect ? 420 : 900);
}

/** Итоги теста. */
function finishTest() {
  const test = testState.test;
  if (!test) return;

  const total = test.questions.length;
  const percent = Math.round((testState.correct / total) * 100);
  const isRecord = saveTestResult(test.id, percent);
  const xp = testState.correct * 5 + (percent >= 80 ? 20 : 0);

  if (typeof addXP === 'function') addXP(xp, 'Тест: ' + test.title);
  if (typeof bumpCounter === 'function') bumpCounter('test', 1);
  if (typeof checkAchievements === 'function') checkAchievements();

  const runner = document.getElementById('testRunner');
  const result = document.getElementById('testResultScreen');

  if (runner) runner.classList.add('hidden');
  if (result) {
    result.classList.remove('hidden');
    result.innerHTML = `
      <div class="test-result-icon">${percent >= 80 ? '🏆' : percent >= 50 ? '🌸' : '📚'}</div>
      <h2>${percent >= 80 ? 'Отлично!' : percent >= 50 ? 'Неплохо!' : 'Есть над чем поработать'}</h2>
      <p class="test-result-sub">${test.title}</p>

      <div class="test-result-score">
        <b>${percent}%</b>
        <span>${testState.correct} из ${total} верно</span>
      </div>

      <div class="test-result-meta">
        <div><span>Опыт</span><b>+${xp} XP</b></div>
        <div><span>Рекорд</span><b>${getBestTestScore(test.id)}%</b></div>
        <div><span>Попытка</span><b>${getTestResults()[test.id].attempts}</b></div>
      </div>

      ${isRecord ? '<div class="test-record">Новый личный рекорд!</div>' : ''}

      <div class="test-answers-review">
        ${testState.answers.map((answer, index) =>
          '<i class="' + (answer.correct ? 'ok' : 'no') + '">' + (index + 1) + '</i>'
        ).join('')}
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" style="flex:1" onclick="startTest('${test.id}')">Пройти заново</button>
        <button class="btn btn-outline" style="flex:1" onclick="closeTest()">К списку тестов</button>
      </div>
    `;
  }

  if (isRecord && typeof showToast === 'function') {
    showToast('Новый рекорд', test.title + ': ' + percent + '%', 'success');
  }

  renderTestsList();
}

/** Возвращает к списку тестов. */
function closeTest() {
  testState.test = null;

  const list = document.getElementById('testsListSection');
  const runner = document.getElementById('testRunner');
  const result = document.getElementById('testResultScreen');

  if (list) list.classList.remove('hidden');
  if (runner) runner.classList.add('hidden');
  if (result) result.classList.add('hidden');

  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', 'tests');
  }

  renderTestsList();
}

/* ---------- Клавиатура ---------- */

document.addEventListener('keydown', event => {
  if (!testState.test || testState.locked) return;

  const number = Number(event.key);
  if (number >= 1 && number <= 4) {
    const button = document.querySelectorAll('.test-option-lg')[number - 1];
    if (button) answerTest(number - 1, button);
  }
});

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('testsGrid')) return;

  renderTestsList();

  const params = new URLSearchParams(window.location.search);

  // Переход со страницы грамматики: tests.html?type=grammar
  if (params.get('type') === 'grammar') startTest('grammar');

  // Прямая ссылка на тест: tests.html?test=lesson-2
  if (params.get('test')) startTest(params.get('test'));
});

/* Экспорт в глобальную область */
window.getAllTests = getAllTests;
window.getTestResults = getTestResults;
window.getBestTestScore = getBestTestScore;
window.renderTestsList = renderTestsList;
window.filterTestsLevel = filterTestsLevel;
window.startTest = startTest;
window.answerTest = answerTest;
window.closeTest = closeTest;
