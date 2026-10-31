/* ============================================================
   lesson-tools.js — инструменты страницы урока
   • Режим фокуса: прячет шапку, подвал и боковые панели.
   • Помодоро: таймер 25 минут в правом верхнем углу.
   • Возврат к уроку по ссылке ?resume=true.
   • Запоминание шага, на котором остановился игрок.
   • Карточки по темпу учёбы (темп / 5 штук).

   Ключи localStorage:
   anilingo_focus_mode — '1' или '0'
   anilingo_pomodoro   — { running, endsAt, left }
   ============================================================ */

'use strict';

const FOCUS_KEY = 'anilingo_focus_mode';
const POMODORO_KEY = 'anilingo_pomodoro';
const POMODORO_MINUTES = 25;

let pomodoroTimer = null;

/* ---------- Общие помощники ---------- */

/** Есть ли на странице урок. */
function lessonToolsActive() {
  return Boolean(document.getElementById('lessonRoot'));
}

/** Текущий id урока из адреса. */
function lessonToolsId() {
  const params = new URLSearchParams(window.location.search);
  return String(Number(params.get('id')) || 1);
}

/* ---------- Режим фокуса ---------- */

/** Включает или выключает режим фокуса. */
function applyFocusMode(on, silent) {
  const active = Boolean(on);

  document.body.classList.toggle('focus-mode', active);

  try {
    localStorage.setItem(FOCUS_KEY, active ? '1' : '0');
  } catch (error) {
    // Приватный режим — режим просто не запомнится
  }

  const button = document.getElementById('focusToggle');
  if (button) {
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.title = active ? 'Выйти из режима фокуса' : 'Режим фокуса: только урок';
  }

  const exit = document.getElementById('focusExit');
  if (exit) exit.hidden = !active;

  if (!silent && typeof showToast === 'function') {
    showToast(
      active ? 'Режим фокуса' : 'Обычный режим',
      active ? 'Остался только урок. Выйти — кнопка в углу или Esc' : 'Шапка и подвал вернулись',
      'info'
    );
  }
}

/** Переключает режим фокуса. */
function toggleFocusMode() {
  applyFocusMode(!document.body.classList.contains('focus-mode'));
}

/** Кнопки режима фокуса. */
function mountFocusMode() {
  if (!lessonToolsActive()) return;

  const hero = document.querySelector('.lesson-hero-inner');
  if (hero && !document.getElementById('focusToggle')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-ghost btn-small focus-toggle';
    button.id = 'focusToggle';
    button.onclick = toggleFocusMode;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
      Режим фокуса
    `;
    hero.appendChild(button);
  }

  // Плавающая кнопка выхода — видна только в режиме фокуса
  if (!document.getElementById('focusExit')) {
    const exit = document.createElement('button');
    exit.type = 'button';
    exit.className = 'focus-exit';
    exit.id = 'focusExit';
    exit.hidden = true;
    exit.onclick = () => applyFocusMode(false);
    exit.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12"></path>
      </svg>
      Выйти из фокуса
    `;
    document.body.appendChild(exit);
  }

  // Восстанавливаем сохранённое состояние без лишнего тоста
  applyFocusMode(localStorage.getItem(FOCUS_KEY) === '1', true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('focus-mode')) {
      applyFocusMode(false);
    }
  });
}

/* ---------- Помодоро ---------- */

/** Состояние таймера из localStorage. */
function getPomodoroState() {
  const saved = readJSON(POMODORO_KEY, null);

  if (!saved || typeof saved !== 'object') {
    return { running: false, endsAt: 0, left: POMODORO_MINUTES * 60 };
  }

  return {
    running: Boolean(saved.running),
    endsAt: Number(saved.endsAt) || 0,
    left: Number.isFinite(saved.left) ? saved.left : POMODORO_MINUTES * 60
  };
}

/** Сохраняет состояние таймера. */
function savePomodoroState(state) {
  writeJSON(POMODORO_KEY, state);
}

/** Сколько секунд осталось. */
function pomodoroLeft() {
  const state = getPomodoroState();

  if (state.running && state.endsAt) {
    return Math.max(0, Math.round((state.endsAt - Date.now()) / 1000));
  }

  return Math.max(0, state.left);
}

/** Формат mm:ss. */
function pomodoroFormat(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

/** Перерисовывает циферблат и кнопки. */
function paintPomodoro() {
  const panel = document.getElementById('pomodoro');
  if (!panel) return;

  const state = getPomodoroState();
  const left = pomodoroLeft();

  const time = panel.querySelector('.pomodoro-time');
  if (time) time.textContent = pomodoroFormat(left);

  const bar = panel.querySelector('.pomodoro-bar span');
  if (bar) {
    const percent = Math.min(100, Math.max(0, (left / (POMODORO_MINUTES * 60)) * 100));
    bar.style.width = percent + '%';
  }

  panel.classList.toggle('is-running', state.running);

  const start = panel.querySelector('.pomodoro-start');
  if (start) start.textContent = state.running ? 'Пауза' : 'Старт';
}

/** Старт / пауза. */
function pomodoroToggle() {
  const state = getPomodoroState();

  if (state.running) {
    // Пауза: запоминаем, сколько осталось
    savePomodoroState({ running: false, endsAt: 0, left: pomodoroLeft() });
    paintPomodoro();
    return;
  }

  const left = state.left > 0 ? state.left : POMODORO_MINUTES * 60;
  savePomodoroState({ running: true, endsAt: Date.now() + left * 1000, left: left });

  paintPomodoro();

  if (typeof showToast === 'function') {
    showToast('Таймер запущен', POMODORO_MINUTES + ' минут работы — и отдых', 'info');
  }
}

/** Сброс на 25 минут. */
function pomodoroReset() {
  savePomodoroState({ running: false, endsAt: 0, left: POMODORO_MINUTES * 60 });
  paintPomodoro();

  if (typeof showToast === 'function') {
    showToast('Таймер сброшен', 'Снова 25 минут', 'info');
  }
}

/** Одна секунда таймера. */
function pomodoroTick() {
  const state = getPomodoroState();
  if (!state.running) return;

  const left = pomodoroLeft();

  if (left <= 0) {
    savePomodoroState({ running: false, endsAt: 0, left: POMODORO_MINUTES * 60 });
    paintPomodoro();

    if (typeof showToast === 'function') {
      showToast('Пора отдохнуть 5 минут', 'Помодоро закончился — встань, разомнись, попей воды', 'success', { duration: 8000 });
    }
    return;
  }

  paintPomodoro();
}

/** Собирает панель таймера в правом верхнем углу. */
function mountPomodoro() {
  if (!lessonToolsActive() || document.getElementById('pomodoro')) return;

  const panel = document.createElement('div');
  panel.className = 'pomodoro';
  panel.id = 'pomodoro';
  panel.innerHTML = `
    <div class="pomodoro-head">
      <span class="pomodoro-label">Помодоро</span>
      <span class="pomodoro-time">${pomodoroFormat(pomodoroLeft())}</span>
    </div>
    <div class="pomodoro-bar"><span></span></div>
    <div class="pomodoro-actions">
      <button type="button" class="btn btn-ghost btn-small pomodoro-start" onclick="pomodoroToggle()">Старт</button>
      <button type="button" class="btn btn-ghost btn-small" onclick="pomodoroReset()">Сброс</button>
    </div>
  `;

  document.body.appendChild(panel);

  paintPomodoro();
  pomodoroTimer = setInterval(pomodoroTick, 1000);
}

/* ---------- Возврат к уроку ---------- */

/** Номер первого незакрытого шага: 0 — слова, 1 — грамматика, 2 — примеры, 3 — тест. */
function getCurrentLessonStep() {
  if (typeof getLessonSteps !== 'function') return 0;

  const id = lessonToolsId();
  const steps = getLessonSteps(id);
  const lesson = (window.anilingo_lessons || []).find(item => String(item.id) === id);

  if (!lesson) return 0;

  if (steps.words.length < (lesson.words || []).length) return 0;
  if (!steps.grammar) return 1;
  if (steps.examples.length < (lesson.examples || []).length) return 2;

  return 3;
}

/** Сохраняет активный урок и текущий шаг. */
function syncActiveLesson() {
  if (!lessonToolsActive() || typeof saveActiveLesson !== 'function') return;

  saveActiveLesson({
    lessonId: lessonToolsId(),
    currentStep: getCurrentLessonStep(),
    totalSteps: 4
  });
}

/** Прокручивает к незакрытому шагу, если пришли по ссылке ?resume=true. */
function resumeLessonIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('resume') !== 'true') return;

  const step = getCurrentLessonStep();
  const lessons = window.anilingo_lessons || [];
  const lesson = lessons.find(item => String(item.id) === lessonToolsId());

  const targets = ['#wordList', '#grammarText', '#exampleList', '#testBox'];
  const target = document.querySelector(targets[step]);

  if (target) {
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
  }

  if (typeof showToast === 'function' && lesson) {
    showToast('Продолжаем урок', lesson.title + ' · шаг ' + (step + 1) + ' из 4', 'info');
  }
}

/* ---------- Карточки по темпу ---------- */

/** Сколько карточек показать: темп / 5. */
function renderLessonPaceCards() {
  const box = document.getElementById('paceCards');
  if (!box) return;
  if (typeof getStudyPace !== 'function') return;

  const id = lessonToolsId();
  const lesson = (window.anilingo_lessons || []).find(item => String(item.id) === id);
  if (!lesson) return;

  const count = Math.max(1, Math.round(getStudyPace() / 5));
  const words = (lesson.words || []).slice(0, count);

  const note = document.getElementById('paceCardsNote');
  if (note) note.textContent = 'темп ' + getStudyPace() + ' мин → ' + count + ' карточек';

  box.innerHTML = words.map(word => `
    <button type="button" class="pace-card" onclick="this.classList.toggle('is-open')">
      <span class="pace-card-front">${word.jp}</span>
      <span class="pace-card-back">${word.ru}${word.romaji ? ' · ' + word.romaji : ''}</span>
    </button>
  `).join('');
}

/* ---------- Запуск ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!lessonToolsActive()) return;

  mountFocusMode();
  mountPomodoro();

  // Запоминаем, что урок начат: кнопка «Продолжить» появится на главной
  syncActiveLesson();

  // Шаг меняется по кликам в уроке — обновляем запись
  let syncTimer = null;
  document.addEventListener('click', () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncActiveLesson, 600);
  });

  window.addEventListener('beforeunload', syncActiveLesson);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') syncActiveLesson();
  });

  resumeLessonIfNeeded();
  renderLessonPaceCards();
});

// Темп поменяли в настройках — перерисовываем карточки
document.addEventListener('anilingo:pace', renderLessonPaceCards);

/* Экспорт в глобальную область */
window.toggleFocusMode = toggleFocusMode;
window.applyFocusMode = applyFocusMode;
window.pomodoroToggle = pomodoroToggle;
window.pomodoroReset = pomodoroReset;
window.renderLessonPaceCards = renderLessonPaceCards;
window.getCurrentLessonStep = getCurrentLessonStep;
window.syncActiveLesson = syncActiveLesson;
