/* ============================================================
   mistakes.js — дневник ошибок в профиле
   Ошибки пишут тесты, викторина, экзамен, аудирование и карточки
   через recordMistake() из js/weakspots.js. Здесь они выводятся
   таблицей: вопрос, верный ответ, твой ответ и кнопка «Повторить».
   Повтор — мини-тест: ответил верно → запись исчезает из дневника.
   Данные лежат в nihongo_weak (это и есть массив mistakes).
   ============================================================ */

'use strict';

// Сколько записей показываем в таблице и берём в повтор
const DIARY_LIMIT = 30;
const REPEAT_LIMIT = 10;

let repeatSession = null;

/* ---------- Хранилище ---------- */

/** Все ошибки (массив mistakes). */
function diaryMistakes() {
  return typeof getMistakes === 'function' ? getMistakes() : [];
}

/** Сохраняет массив ошибок. */
function diarySave(list) {
  if (typeof writeJSON === 'function') writeJSON('nihongo_weak', list.slice(0, 300));
}

/** Удаляет одну запись: совпадение по вопросу и выбранному ответу. */
function removeMistake(prompt, picked) {
  const list = diaryMistakes();
  const index = list.findIndex(item => item.prompt === prompt && item.picked === picked);

  if (index === -1) return false;

  list.splice(index, 1);
  diarySave(list);
  return true;
}

/* ---------- Таблица ---------- */

/** Экранирование текста. */
function diaryEscape(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Рисует дневник ошибок в профиле. */
function renderMistakeDiary() {
  const box = document.getElementById('mistakeDiary');
  if (!box) return;

  const list = diaryMistakes();
  const note = document.getElementById('mistakeDiaryNote');

  if (note) {
    note.textContent = list.length
      ? list.length + ' записей · можно повторить'
      : 'пока пусто';
  }

  if (!list.length) {
    box.innerHTML = `
      <div class="empty-state">
        Ошибок нет — дневник чист. Пройди тест или викторину, и сюда попадут слова,
        в которых ты ошибся.
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="diary-table-wrap">
      <table class="diary-table">
        <thead>
          <tr>
            <th>Слово / вопрос</th>
            <th>Правильный ответ</th>
            <th>Твой ответ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${list.slice(0, DIARY_LIMIT).map((item, index) => `
            <tr>
              <td>
                <b>${diaryEscape(item.prompt)}</b>
                <span class="diary-topic">${diaryEscape(item.subject)}${item.topic ? ' · ' + diaryEscape(item.topic) : ''}</span>
              </td>
              <td class="diary-right">${diaryEscape(item.right)}</td>
              <td class="diary-wrong">${diaryEscape(item.picked || '—')}</td>
              <td class="diary-action">
                <button class="btn btn-outline btn-small" type="button"
                        data-repeat-index="${index}">Повторить</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="diary-foot">
      <button class="btn btn-primary btn-small" type="button" onclick="startMistakeRepeat()">
        Повторить все (${Math.min(list.length, REPEAT_LIMIT)})
      </button>
      <button class="btn btn-ghost btn-small" type="button" onclick="clearMistakes()">Очистить дневник</button>
    </div>
  `;
}

/* ---------- Мини-тест ---------- */

/** Перемешивает массив. */
function diaryShuffle(list) {
  const copy = list.slice();

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  return copy;
}

/** Собирает вопрос мини-теста: верный ответ + три чужих. */
function buildRepeatQuestion(mistake, all) {
  const others = all
    .filter(item => item.right && item.right !== mistake.right)
    .map(item => item.right);

  const options = diaryShuffle([mistake.right].concat(diaryShuffle(others).slice(0, 3)));

  return {
    prompt: mistake.prompt,
    right: mistake.right,
    pickedInPast: mistake.picked,
    options: options,
    correct: options.indexOf(mistake.right)
  };
}

/** Открывает мини-тест по ошибкам. */
function startMistakeRepeat() {
  const all = diaryMistakes();
  if (!all.length) return;

  const selected = diaryShuffle(all).slice(0, REPEAT_LIMIT);

  repeatSession = {
    queue: selected.map(item => buildRepeatQuestion(item, all)),
    index: 0,
    correct: 0,
    answered: false
  };

  openRepeatModal();
  paintRepeatQuestion();
}

/** Повтор одной записи. */
function repeatOneMistake(prompt, picked) {
  const all = diaryMistakes();
  const found = all.find(item => item.prompt === prompt && item.picked === picked);
  if (!found) return;

  repeatSession = {
    queue: [buildRepeatQuestion(found, all)],
    index: 0,
    correct: 0,
    answered: false
  };

  openRepeatModal();
  paintRepeatQuestion();
}

/** Создаёт окно мини-теста (один раз). */
function openRepeatModal() {
  let overlay = document.getElementById('mistakeQuiz');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'mistakeQuiz';
    overlay.innerHTML = `
      <div class="modal mistake-modal" data-modal-nofoot="1">
        <button class="modal-close" type="button" onclick="closeMistakeRepeat()" aria-label="Закрыть">✕</button>
        <div class="block-head">
          <h3 id="mistakeQuizTitle">Повтор ошибок</h3>
          <span class="block-note" id="mistakeQuizStep"></span>
        </div>
        <div id="mistakeQuizBody"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeMistakeRepeat();
    });
  }

  overlay.classList.add('open');
  document.body.classList.add('modal-open');
}

/** Закрывает мини-тест. */
function closeMistakeRepeat() {
  const overlay = document.getElementById('mistakeQuiz');
  if (overlay) overlay.classList.remove('open');
  document.body.classList.remove('modal-open');

  repeatSession = null;
  renderMistakeDiary();
}

/** Рисует текущий вопрос. */
function paintRepeatQuestion() {
  const body = document.getElementById('mistakeQuizBody');
  const step = document.getElementById('mistakeQuizStep');
  if (!body || !repeatSession) return;

  const session = repeatSession;
  const question = session.queue[session.index];

  if (!question) {
    body.innerHTML = `
      <div class="mistake-result">
        <b>${session.correct} из ${session.queue.length}</b>
        <p>Верные ответы убраны из дневника. Остальные остались — их можно повторить ещё раз.</p>
        <button class="btn btn-primary btn-small" type="button" onclick="closeMistakeRepeat()">Готово</button>
      </div>
    `;
    if (step) step.textContent = 'готово';

    if (typeof markStudyDone === 'function') markStudyDone();
    if (typeof renderWeakSpots === 'function') renderWeakSpots();
    renderMistakeDiary();
    return;
  }

  if (step) step.textContent = (session.index + 1) + ' из ' + session.queue.length;

  body.innerHTML = `
    <p class="mistake-question">${diaryEscape(question.prompt)}</p>
    <div class="mistake-options">
      ${question.options.map((option, index) => `
        <button class="test-option" type="button" data-option="${index}"
                onclick="answerMistakeRepeat(${index}, this)">${diaryEscape(option)}</button>
      `).join('')}
    </div>
    <p class="mistake-hint small muted">Твой прошлый ответ: ${diaryEscape(question.pickedInPast || '—')}</p>
  `;
}

/** Ответ в мини-тесте. */
function answerMistakeRepeat(optionIndex, button) {
  if (!repeatSession || repeatSession.answered) return;
  repeatSession.answered = true;

  const session = repeatSession;
  const question = session.queue[session.index];
  const buttons = document.querySelectorAll('#mistakeQuizBody .mistake-options .test-option');

  buttons.forEach((item, index) => {
    item.disabled = true;
    if (index === question.correct) item.classList.add('correct');
    if (index === optionIndex && index !== question.correct) item.classList.add('wrong');
  });

  const isCorrect = optionIndex === question.correct;

  if (isCorrect) {
    session.correct += 1;
    removeMistake(question.prompt, question.pickedInPast);

    if (typeof showToast === 'function') {
      showToast('Верно!', 'Слово убрано из дневника ошибок', 'success');
    }
  } else if (typeof showToast === 'function') {
    showToast('Пока нет', 'Правильный ответ: ' + question.right, 'warning');
  }

  // Через секунду — следующий вопрос
  setTimeout(() => {
    session.index += 1;
    session.answered = false;
    paintRepeatQuestion();
  }, 900);
}

/** Клик по кнопке «Повторить» в таблице (делегирование). */
function onDiaryClick(event) {
  const button = event.target.closest('[data-repeat-index]');
  if (!button) return;

  const list = diaryMistakes();
  const item = list[Number(button.dataset.repeatIndex)];
  if (!item) return;

  repeatOneMistake(item.prompt, item.picked);
}

/* ---------- Запуск ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderMistakeDiary();

  const box = document.getElementById('mistakeDiary');
  if (box) box.addEventListener('click', onDiaryClick);
});

// После новой ошибки (тест, викторина) дневник обновляется
document.addEventListener('nihongo:mistake', renderMistakeDiary);

/* Экспорт в глобальную область */
window.renderMistakeDiary = renderMistakeDiary;
window.startMistakeRepeat = startMistakeRepeat;
window.repeatOneMistake = repeatOneMistake;
window.answerMistakeRepeat = answerMistakeRepeat;
window.closeMistakeRepeat = closeMistakeRepeat;
window.removeMistake = removeMistake;
