/* ============================================================
   study.js — общее состояние учёбы на всех страницах
   Здесь живут:
   • активный урок (кнопка «Продолжить» на главной);
   • отметка «сегодня уже занимался» (точка у логотипа);
   • темп учёбы (5–30 минут в день);
   • кнопка «Случайный урок»;
   • напоминание о перерыве после часа занятий.

   Ключи localStorage:
   anilingo_active_lesson      — { lessonId, currentStep, totalSteps }
   anilingo_completed_lessons  — массив id пройденных уроков
   anilingo_last_study         — дата последнего занятия (YYYY-MM-DD)
   anilingo_study_pace         — темп в минутах
   anilingo_words_log          — когда какое слово учили
   ============================================================ */

'use strict';

const STUDY_KEYS = {
  active: 'anilingo_active_lesson',
  completed: 'anilingo_completed_lessons',
  lastStudy: 'anilingo_last_study',
  pace: 'anilingo_study_pace',
  wordsLog: 'anilingo_words_log'
};

// Темп по умолчанию — 15 минут в день
const STUDY_DEFAULT_PACE = 15;

// Шагов в уроке: слова, грамматика, примеры, тест
const STUDY_TOTAL_STEPS = 4;

// Через сколько минут занятий напомнить о перерыве
const STUDY_BREAK_AFTER_MIN = 60;

/* ---------- Мелкие помощники ---------- */

/** Безопасное чтение JSON: readJSON есть не на всех страницах. */
function studyRead(key, fallback) {
  if (typeof readJSON === 'function') return readJSON(key, fallback);

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

/** Безопасная запись JSON. */
function studyWrite(key, value) {
  if (typeof writeJSON === 'function') return writeJSON(key, value);

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

/** Сегодняшняя дата в формате YYYY-MM-DD. */
function studyTodayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + month + '-' + day;
}

/** Вчерашняя дата в том же формате. */
function studyYesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

/* ---------- Пройденные уроки ---------- */

/** Массив id пройденных уроков (из прогресса и из своего списка). */
function getCompletedLessonIds() {
  const ids = new Set();

  // Основной источник — anilingo_progress
  const progress = studyRead('anilingo_progress', null);
  if (progress && progress.lessons && typeof progress.lessons === 'object') {
    Object.keys(progress.lessons).forEach(id => {
      if (progress.lessons[id] && progress.lessons[id].completed) ids.add(String(id));
    });
  }

  // Дополнительный — прямой список (например, после завершения теста урока)
  const saved = studyRead(STUDY_KEYS.completed, []);
  if (Array.isArray(saved)) saved.forEach(id => ids.add(String(id)));

  return Array.from(ids);
}

/** Запоминает, что урок пройден. */
function markLessonCompleted(lessonId) {
  const id = String(lessonId);
  const list = getCompletedLessonIds();

  if (!list.includes(id)) {
    list.push(id);
    studyWrite(STUDY_KEYS.completed, list);
  }

  clearActiveLesson();
}

/* ---------- Активный урок ---------- */

/** Сохраняет, на каком шаге игрок остановился. */
function saveActiveLesson(state) {
  if (!state || !state.lessonId) return;

  studyWrite(STUDY_KEYS.active, {
    lessonId: String(state.lessonId),
    currentStep: Number(state.currentStep) || 0,
    totalSteps: Number(state.totalSteps) || STUDY_TOTAL_STEPS,
    updatedAt: new Date().toISOString()
  });
}

/** Текущий незаконченный урок или null. */
function getActiveLesson() {
  const saved = studyRead(STUDY_KEYS.active, null);
  if (!saved || !saved.lessonId) return null;

  // Если урок уже пройден — продолжать нечего
  if (getCompletedLessonIds().includes(String(saved.lessonId))) return null;

  return {
    lessonId: String(saved.lessonId),
    currentStep: Number(saved.currentStep) || 0,
    totalSteps: Number(saved.totalSteps) || STUDY_TOTAL_STEPS,
    updatedAt: saved.updatedAt || ''
  };
}

/** Сбрасывает активный урок. */
function clearActiveLesson() {
  try {
    localStorage.removeItem(STUDY_KEYS.active);
  } catch (error) {
    // Приватный режим — просто ничего не делаем
  }
}

/* ---------- «Сегодня занимался» ---------- */

/** Отмечает, что сегодня было занятие. */
function markStudyDone() {
  studyWrite(STUDY_KEYS.lastStudy, studyTodayKey());

  mountStudyDot();
  document.dispatchEvent(new CustomEvent('anilingo:study'));
}

/** Занимался ли игрок сегодня. */
function hasStudiedToday() {
  return studyRead(STUDY_KEYS.lastStudy, '') === studyTodayKey();
}

/** Маленькая точка рядом с логотипом в шапке. */
function mountStudyDot() {
  const logo = document.querySelector('.header .logo');
  if (!logo) return;

  let dot = logo.querySelector('.study-dot');
  if (!dot) {
    dot = document.createElement('span');
    dot.className = 'study-dot';
    logo.appendChild(dot);
  }

  const done = hasStudiedToday();
  dot.classList.toggle('is-today', done);
  dot.title = done ? 'Сегодня уже занимался — так держать' : 'Сегодня ещё не занимался';
  dot.setAttribute('aria-label', dot.title);
}

/* ---------- Темп учёбы ---------- */

/** Темп в минутах (5–30, кратно 5). */
function getStudyPace() {
  const saved = Number(studyRead(STUDY_KEYS.pace, 0));
  if (saved) return Math.min(30, Math.max(5, saved));

  // Резерв: значение из общих настроек
  if (typeof getSettingValue === 'function') {
    const fromSettings = Number(getSettingValue('study.pace', 0));
    if (fromSettings) return Math.min(30, Math.max(5, fromSettings));
  }

  return STUDY_DEFAULT_PACE;
}

/** Сохраняет темп и обновляет подсказки на странице. */
function setStudyPace(value) {
  const pace = Math.min(30, Math.max(5, Math.round(Number(value) || STUDY_DEFAULT_PACE)));

  studyWrite(STUDY_KEYS.pace, pace);
  if (typeof setSettingValue === 'function') setSettingValue('study.pace', pace);

  renderStudyLaunch();
  if (typeof renderLessonPaceCards === 'function') renderLessonPaceCards();
  document.dispatchEvent(new CustomEvent('anilingo:pace', { detail: { pace: pace } }));

  if (typeof showToast === 'function') {
    showToast('Темп учёбы обновлён', pace + ' минут в день · карточек на урок: ' + studyCardsPerSession(), 'success');
  }
}

/** Сколько карточек приходится на одно занятие: темп / 5. */
function studyCardsPerSession() {
  return Math.max(1, Math.round(getStudyPace() / 5));
}

/* ---------- Слова: когда учили ---------- */

/**
 * Запоминает дату знакомства со словом.
 * Вместе с датой храним перевод и ромадзи — тогда «Быстрый повтор»
 * работает на главной, где словарь не загружен.
 */
function logWordsLearned(words) {
  if (!Array.isArray(words) || !words.length) return;

  const log = studyRead(STUDY_KEYS.wordsLog, {});
  const today = studyTodayKey();

  words.forEach(word => {
    if (!word || !word.jp) return;

    log[word.jp] = {
      ru: word.ru || '',
      romaji: word.romaji || '',
      date: today
    };
  });

  studyWrite(STUDY_KEYS.wordsLog, log);
}

/** Слова, которые учили в конкретный день. */
function getWordsLearnedOn(dateKey) {
  const log = studyRead(STUDY_KEYS.wordsLog, {});
  const dictionary = typeof getAllDictionaryWords === 'function' ? getAllDictionaryWords() : [];

  return Object.keys(log).map(jp => {
    const saved = log[jp];

    // Старый формат: просто дата строкой
    if (typeof saved === 'string') {
      if (saved !== dateKey) return null;
      return dictionary.find(word => word.jp === jp) || { jp: jp, ru: '', romaji: '' };
    }

    if (!saved || saved.date !== dateKey) return null;
    return { jp: jp, ru: saved.ru || '', romaji: saved.romaji || '' };
  }).filter(Boolean);
}

/** Все слова из журнала учёбы (самые свежие первыми). */
function getAllLoggedWords() {
  const log = studyRead(STUDY_KEYS.wordsLog, {});

  return Object.keys(log).map(jp => {
    const saved = log[jp];

    if (typeof saved === 'string') return { jp: jp, ru: '', romaji: '', date: saved };
    if (!saved) return null;

    return { jp: jp, ru: saved.ru || '', romaji: saved.romaji || '', date: saved.date || '' };
  }).filter(Boolean).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/* ---------- Главная: продолжить урок и случайный урок ---------- */

/** Находит урок по id среди загруженных. */
function studyFindLesson(lessonId) {
  const lessons = window.anilingo_lessons || [];
  return lessons.find(lesson => String(lesson.id) === String(lessonId)) || null;
}

/** Рисует блок запуска учёбы на главной. */
function renderStudyLaunch() {
  const box = document.getElementById('studyLaunchInner');
  if (!box) return;

  const active = getActiveLesson();
  const activeLesson = active ? studyFindLesson(active.lessonId) : null;
  const pace = getStudyPace();

  const lessons = window.anilingo_lessons || [];
  const completedIds = getCompletedLessonIds();

  // Первый непройденный урок — с него начинаем, если продолжать нечего
  const nextLesson = lessons.find(lesson => !completedIds.includes(String(lesson.id))) || lessons[0] || null;

  // Кнопка «Продолжить» — только если урок начат и не закончен
  const continueHtml = active && activeLesson
    ? `<a class="btn btn-primary btn-large study-continue" href="lesson.html?id=${active.lessonId}&resume=true">
         <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7V5z"></path></svg>
         Продолжить: ${studyEscape(activeLesson.title)}
       </a>
       <span class="study-launch-note">Остановился на шаге ${Math.min(active.currentStep + 1, active.totalSteps)} из ${active.totalSteps}</span>`
    : `<a class="btn btn-outline btn-large study-start" href="lesson.html?id=${nextLesson ? nextLesson.id : 1}">
         <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7v14H4zM13 5h7v14h-7z"></path></svg>
         ${nextLesson ? 'Начать: ' + studyEscape(nextLesson.title) : 'Начать урок'}
       </a>`;

  const completed = completedIds.length;
  const total = lessons.length;

  box.innerHTML = `
    <div class="study-launch-row">
      ${continueHtml}
      <button class="btn btn-outline btn-large study-random" type="button" onclick="openRandomLesson()">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="4"></rect>
          <circle cx="8.5" cy="8.5" r="1.2"></circle>
          <circle cx="15.5" cy="15.5" r="1.2"></circle>
          <circle cx="15.5" cy="8.5" r="1.2"></circle>
          <circle cx="8.5" cy="15.5" r="1.2"></circle>
        </svg>
        Случайный урок
      </button>
    </div>
    <p class="study-launch-hint">
      Сегодня рекомендуем <b>${pace} минут</b> — это ${studyCardsPerSession()}
      ${studyCardsWord(studyCardsPerSession())} и ${completed} из ${total} уроков позади.
    </p>
  `;
}

/** Склонение слова «карточка». */
function studyCardsWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return 'карточка';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'карточки';
  return 'карточек';
}

/** Экранирование текста. */
function studyEscape(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Выбирает случайный урок: сначала из непройденных, потом из всех.
 * @returns {object|null}
 */
function pickRandomLesson() {
  const lessons = window.anilingo_lessons || [];
  if (!lessons.length) return null;

  const completed = getCompletedLessonIds();
  const fresh = lessons.filter(lesson => !completed.includes(String(lesson.id)));
  const pool = fresh.length ? fresh : lessons;

  return pool[Math.floor(Math.random() * pool.length)];
}

/** Открывает случайный урок. */
function openRandomLesson() {
  const lesson = pickRandomLesson();
  if (!lesson) return;

  if (typeof showToast === 'function') {
    showToast('Случайный урок', lesson.title + ' — поехали', 'info');
  }

  window.location.href = 'lesson.html?id=' + lesson.id;
}

/* ---------- Напоминание о перерыве ---------- */

let studySessionStart = 0;      // когда открыли страницу
let studyLastActivity = 0;      // последнее действие игрока
let studyBreakShown = false;

/** Обновляет время последнего действия. */
function studyTouchActivity() {
  studyLastActivity = Date.now();
}

/** Проверка раз в 10 минут: не пора ли отдохнуть. */
function studyCheckBreak() {
  if (studyBreakShown) return;

  const now = Date.now();

  // Пять минут бездействия — считаем, что человек и так отдыхал
  if (now - studyLastActivity > 5 * 60 * 1000) {
    studySessionStart = now;
    studyLastActivity = now;
    return;
  }

  if (now - studySessionStart < STUDY_BREAK_AFTER_MIN * 60 * 1000) return;
  if (typeof showToast !== 'function') return;

  studyBreakShown = true;
  showToast('Ты учишься час', 'Отдохни 5 минут — глазам и голове тоже нужен перерыв', 'info', { duration: 7000 });
}

/** Запускает таймер перерыва. */
function mountBreakReminder() {
  studySessionStart = Date.now();
  studyLastActivity = Date.now();

  ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(type => {
    document.addEventListener(type, studyTouchActivity, { passive: true });
  });

  // Проверяем каждые 10 минут, как и просили
  setInterval(studyCheckBreak, 10 * 60 * 1000);
}

/* ---------- Запуск ---------- */

document.addEventListener('DOMContentLoaded', () => {
  mountStudyDot();
  renderStudyLaunch();
  if (typeof renderLessonPaceCards === 'function') renderLessonPaceCards();
  mountBreakReminder();
});

// Кнопка «Продолжить» и точка должны обновляться сразу после занятия
document.addEventListener('anilingo:study', () => {
  mountStudyDot();
  renderStudyLaunch();
});

/* Экспорт в глобальную область */
window.STUDY_KEYS = STUDY_KEYS;
window.studyTodayKey = studyTodayKey;
window.studyYesterdayKey = studyYesterdayKey;
window.getCompletedLessonIds = getCompletedLessonIds;
window.markLessonCompleted = markLessonCompleted;
window.saveActiveLesson = saveActiveLesson;
window.getActiveLesson = getActiveLesson;
window.clearActiveLesson = clearActiveLesson;
window.markStudyDone = markStudyDone;
window.hasStudiedToday = hasStudiedToday;
window.mountStudyDot = mountStudyDot;
window.getStudyPace = getStudyPace;
window.setStudyPace = setStudyPace;
window.studyCardsPerSession = studyCardsPerSession;
window.logWordsLearned = logWordsLearned;
window.getWordsLearnedOn = getWordsLearnedOn;
window.getAllLoggedWords = getAllLoggedWords;
window.renderStudyLaunch = renderStudyLaunch;
window.openRandomLesson = openRandomLesson;
window.pickRandomLesson = pickRandomLesson;
window.studyCheckBreak = studyCheckBreak;
