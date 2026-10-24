/* ============================================================
   lesson-steps.js — прогресс прохождения урока
   Четыре шага: слова, грамматика, примеры, тест.
   Состояние — nihongo_lesson_steps, ключ — id урока.
   ============================================================ */

'use strict';

const LESSON_STEPS_KEY = 'nihongo_lesson_steps';

// Вес шагов в общем прогрессе (в сумме 100)
const STEP_WEIGHTS = { words: 30, grammar: 15, examples: 15, test: 40 };

/* ---------- Данные ---------- */

/** id урока из адреса. */
function getLessonId() {
  const params = new URLSearchParams(window.location.search);
  return String(Number(params.get('id')) || 1);
}

/** Текущий урок из общего массива. */
function getLessonData() {
  const id = getLessonId();
  const lessons = window.nihongo_lessons || [];
  return lessons.find(lesson => String(lesson.id) === id) || lessons[0] || null;
}

/** Все сохранённые шаги. */
function getAllLessonSteps() {
  const saved = readJSON(LESSON_STEPS_KEY, {});
  return saved && typeof saved === 'object' ? saved : {};
}

/** Шаги конкретного урока. */
function getLessonSteps(id) {
  const all = getAllLessonSteps();
  const saved = all[id] || {};

  return {
    words: Array.isArray(saved.words) ? saved.words : [],
    grammar: Boolean(saved.grammar),
    examples: Array.isArray(saved.examples) ? saved.examples : [],
    test: Number(saved.test) || 0,
    checked: Boolean(saved.checked)
  };
}

/** Сохраняет шаги урока. */
function saveLessonSteps(id, steps) {
  const all = getAllLessonSteps();
  all[id] = steps;
  writeJSON(LESSON_STEPS_KEY, all);
}

/* ---------- Подсчёт ---------- */

/** Доля выполнения в процентах. */
function computeLessonPercent(steps, lesson) {
  if (!lesson) return 0;

  const wordsTotal = (lesson.words || []).length || 1;
  const examplesTotal = (lesson.examples || []).length || 1;
  const testTotal = (lesson.test || []).length || 1;

  const wordsPart = Math.min(1, steps.words.length / wordsTotal) * STEP_WEIGHTS.words;
  const grammarPart = steps.grammar ? STEP_WEIGHTS.grammar : 0;
  const examplesPart = Math.min(1, steps.examples.length / examplesTotal) * STEP_WEIGHTS.examples;

  // За тест считаем и отвеченные вопросы, и полную проверку
  const testRatio = steps.checked ? 1 : Math.min(1, steps.test / testTotal) * 0.8;
  const testPart = testRatio * STEP_WEIGHTS.test;

  return Math.min(100, Math.round(wordsPart + grammarPart + examplesPart + testPart));
}

/** Статусы шагов для отрисовки. */
function getStepStatuses(steps, lesson) {
  const wordsTotal = (lesson.words || []).length || 1;
  const examplesTotal = (lesson.examples || []).length || 1;
  const testTotal = (lesson.test || []).length || 1;

  return [
    {
      id: 'words',
      title: 'Слова',
      hint: steps.words.length + '/' + wordsTotal,
      done: steps.words.length >= wordsTotal
    },
    {
      id: 'grammar',
      title: 'Грамматика',
      hint: steps.grammar ? 'прочитано' : 'текст',
      done: steps.grammar
    },
    {
      id: 'examples',
      title: 'Примеры',
      hint: steps.examples.length + '/' + examplesTotal,
      done: steps.examples.length >= examplesTotal
    },
    {
      id: 'test',
      title: 'Тест',
      hint: steps.checked ? 'проверен' : steps.test + '/' + testTotal,
      done: steps.checked || steps.test >= testTotal
    }
  ];
}

/* ---------- Отрисовка ---------- */

/** Рисует прогресс-бар и шаги. */
function updateLessonProgress() {
  const lesson = getLessonData();
  const block = document.getElementById('lessonProgressBlock');
  if (!lesson) return;

  const steps = getLessonSteps(getLessonId());
  const percent = computeLessonPercent(steps, lesson);

  const fill = document.getElementById('lessonProgressFill');
  const label = document.getElementById('lessonProgressPercent');
  const list = document.getElementById('lessonSteps');

  if (fill) fill.style.width = percent + '%';
  if (label) label.textContent = percent + '%';

  if (list) {
    const statuses = getStepStatuses(steps, lesson);
    const firstUndone = statuses.find(step => !step.done);

    list.innerHTML = statuses.map((step, index) => `
      <div class="lesson-step ${step.done ? 'is-done' : ''} ${firstUndone && firstUndone.id === step.id ? 'is-active' : ''}">
        <span class="lesson-step-num">${step.done ? '✓' : index + 1}</span>
        <span class="lesson-step-body">
          <b>${step.title}</b>
          <span>${step.hint}</span>
        </span>
      </div>
    `).join('');
  }

  // Кнопки «отмечено» подсвечиваем
  const grammarBtn = document.getElementById('grammarDoneBtn');
  if (grammarBtn) {
    grammarBtn.textContent = steps.grammar ? 'Правило понятно ✓' : 'Правило понятно';
    grammarBtn.classList.toggle('is-done', steps.grammar);
    grammarBtn.disabled = steps.grammar;
  }
}

/* ---------- Действия ---------- */

/** Отмечает слово увиденным. */
function markWordSeen(index) {
  const id = getLessonId();
  const steps = getLessonSteps(id);
  const position = Number(index);

  if (Number.isNaN(position) || steps.words.includes(position)) return;

  steps.words.push(position);
  saveLessonSteps(id, steps);
  updateLessonProgress();
}

/** Отмечает все слова изученными. */
function markWordsSeen() {
  const lesson = getLessonData();
  if (!lesson) return;

  const id = getLessonId();
  const steps = getLessonSteps(id);

  steps.words = lesson.words.map((word, index) => index);
  saveLessonSteps(id, steps);
  updateLessonProgress();

  if (typeof showToast === 'function') {
    showToast('Слова отмечены', 'Шаг «Слова» закрыт', 'success');
  }
}

/** Отмечает грамматику прочитанной. */
function markGrammarUnderstood() {
  const id = getLessonId();
  const steps = getLessonSteps(id);

  if (steps.grammar) return;

  steps.grammar = true;
  saveLessonSteps(id, steps);
  updateLessonProgress();

  if (typeof showToast === 'function') {
    showToast('Грамматика', 'Правило отмечено как прочитанное', 'success');
  }
}

/** Отмечает пример разобранным. */
function markExampleSeen(index) {
  const id = getLessonId();
  const steps = getLessonSteps(id);
  const position = Number(index);

  if (Number.isNaN(position) || steps.examples.includes(position)) return;

  steps.examples.push(position);
  saveLessonSteps(id, steps);
  updateLessonProgress();
}

/** Отмечает все примеры разобранными. */
function markExamplesSeen() {
  const lesson = getLessonData();
  if (!lesson) return;

  const id = getLessonId();
  const steps = getLessonSteps(id);

  steps.examples = lesson.examples.map((example, index) => index);
  saveLessonSteps(id, steps);
  updateLessonProgress();

  if (typeof showToast === 'function') {
    showToast('Примеры разобраны', 'Шаг «Примеры» закрыт', 'success');
  }
}

/** Обновляет счётчик ответов в тесте. */
function markTestAnswer(answeredCount) {
  const id = getLessonId();
  const steps = getLessonSteps(id);

  steps.test = Math.max(steps.test, Number(answeredCount) || 0);
  saveLessonSteps(id, steps);
  updateLessonProgress();
}

/** Отмечает тест проверенным. */
function markTestChecked() {
  const lesson = getLessonData();
  const id = getLessonId();
  const steps = getLessonSteps(id);

  steps.checked = true;
  steps.test = lesson ? (lesson.test || []).length : steps.test;
  saveLessonSteps(id, steps);
  updateLessonProgress();
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('lessonRoot')) return;

  updateLessonProgress();

  // Клик по слову (в том числе по кнопке озвучки) отмечает его
  const wordList = document.getElementById('wordList');
  if (wordList) {
    wordList.addEventListener('click', event => {
      const row = event.target.closest('.word-row');
      if (!row) return;

      const rows = Array.from(wordList.querySelectorAll('.word-row'));
      markWordSeen(rows.indexOf(row));
    });
  }

  // Клик по примеру отмечает пример
  const exampleList = document.getElementById('exampleList');
  if (exampleList) {
    exampleList.addEventListener('click', event => {
      const row = event.target.closest('.example-row');
      if (!row) return;

      const rows = Array.from(exampleList.querySelectorAll('.example-row'));
      markExampleSeen(rows.indexOf(row));
    });
  }
});

/* Экспорт в глобальную область */
window.getLessonSteps = getLessonSteps;
window.updateLessonProgress = updateLessonProgress;
window.markWordSeen = markWordSeen;
window.markWordsSeen = markWordsSeen;
window.markGrammarUnderstood = markGrammarUnderstood;
window.markExampleSeen = markExampleSeen;
window.markExamplesSeen = markExamplesSeen;
window.markTestAnswer = markTestAnswer;
window.markTestChecked = markTestChecked;
