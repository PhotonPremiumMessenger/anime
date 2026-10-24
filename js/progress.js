/* ============================================================
   progress.js — прогресс уроков и озвучка слов
   Всё хранится в localStorage под ключами nihongo_progress
   и nihongo_achievements. Достижения — в js/achievements.js,
   опыт, уровни и стрик — в js/xp.js.
   ============================================================ */

'use strict';

/* ---------- Достижения ---------- */

// Раньше здесь был список из шести достижений.
// Теперь все 100 достижений живут в js/achievements.js,
// а прогресс только сообщает о событиях (урок, слова, стрик).

/* ---------- Базовые функции прогресса ---------- */

/** Пустой прогресс для нового игрока. */
function emptyProgress() {
  return {
    lessons: {},        // { '1': { percent, best, completed, updatedAt } }
    words: [],          // выученные слова (jp-строки)
    streak: {           // серия дней подряд
      count: 0,
      last: ''
    },
    startedAt: new Date().toISOString()
  };
}

/** Читает прогресс из localStorage. */
function getProgress() {
  const saved = readJSON(STORAGE_KEYS.progress, null);

  if (!saved || typeof saved !== 'object') return emptyProgress();

  // Приводим структуру к ожидаемому виду (на случай старых данных)
  return {
    lessons: saved.lessons && typeof saved.lessons === 'object' ? saved.lessons : {},
    words: Array.isArray(saved.words) ? saved.words : [],
    streak: saved.streak && typeof saved.streak === 'object'
      ? { count: Number(saved.streak.count) || 0, last: saved.streak.last || '' }
      : { count: 0, last: '' },
    startedAt: saved.startedAt || new Date().toISOString()
  };
}

/** Сохраняет прогресс. */
function saveProgress(progress) {
  writeJSON(STORAGE_KEYS.progress, progress);
}

/** Прогресс конкретного урока. */
function getLessonProgress(lessonId) {
  const progress = getProgress();
  return progress.lessons[String(lessonId)] || null;
}

/* ---------- Даты и серия дней ---------- */

/** Дата в формате YYYY-MM-DD (локальная). */
function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + month + '-' + day;
}

/** Дата вчера в том же формате. */
function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

/** Обновляет серию дней: сегодня, вчера или сброс. */
function touchStreak(progress) {
  const today = todayKey();
  const last = progress.streak.last;

  if (last === today) return progress.streak;

  if (last === yesterdayKey()) {
    progress.streak.count += 1;
  } else {
    progress.streak.count = 1;
  }

  progress.streak.last = today;

  // Дублируем серию в новый ключ nihongo_streak (если модуль XP подключён)
  if (typeof saveStreak === 'function') {
    saveStreak({
      count: progress.streak.count,
      best: Math.max(progress.streak.count, progress.streak.best || 0),
      last: today
    });
  }

  return progress.streak;
}

/* ---------- Достижения: совместимость ---------- */

// Основная логика — в js/achievements.js.
// Обёртки оставлены, чтобы старый код продолжал работать.

/** Массив id открытых достижений. */
function getUnlockedAchievements() {
  const list = readJSON(STORAGE_KEYS.achievements, []);
  return Array.isArray(list) ? list : [];
}

/** Открыто ли достижение. */
function hasAchievement(id) {
  return getUnlockedAchievements().includes(id);
}

/** Проверка достижений: передаём управление модулю achievements.js. */
function checkAchievements(silent) {
  if (typeof window.checkAchievements === 'function' && window.checkAchievements !== checkAchievements) {
    return window.checkAchievements(silent);
  }
  return [];
}

/** Старые всплывашки больше не нужны: toast показывает achievements.js. */
function announceAchievements() {
  return [];
}

/* ---------- Подсчёт статистики ---------- */

/** Сколько уроков пройдено. */
function countCompletedLessons(progress) {
  const data = progress || getProgress();
  return Object.keys(data.lessons).filter(id => data.lessons[id].completed).length;
}

/**
 * Сводная статистика для профиля и карточек.
 * Уровень растёт каждые 500 XP.
 */
function getStats() {
  const progress = getProgress();
  const lessons = countCompletedLessons(progress);
  const words = progress.words.length;

  // Опыт теперь единый: из системы XP (js/xp.js)
  const xp = typeof getXP === 'function' ? getXP() : lessons * 120 + words * 5;
  const info = typeof getLevelInfo === 'function'
    ? getLevelInfo(xp)
    : { level: Math.floor(xp / 500) + 1, nextAt: (Math.floor(xp / 500) + 1) * 500 };

  const streak = typeof getStreak === 'function' ? getStreak().count : progress.streak.count;

  return {
    lessons: lessons,
    words: words,
    days: streak,
    xp: xp,
    xpMax: info.nextAt,
    level: info.level,
    achievements: getUnlockedAchievements()
  };
}

/* ---------- Завершение урока ---------- */

/**
 * Записывает прохождение урока: процент, лучший результат,
 * выученные слова, серию дней и достижения.
 *
 * @param {number} lessonId
 * @param {number} correct — верных ответов в тесте
 * @param {number} total   — всего вопросов
 * @returns {{percent:number, newWords:number, achievements:Array}}
 */
function completeLesson(lessonId, correct, total) {
  const progress = getProgress();
  const id = String(lessonId);
  const percent = total > 0 ? Math.round((correct / total) * 100) : 100;
  const lesson = (window.nihongo_lessons || []).find(item => String(item.id) === id);

  // Обновляем запись урока
  const previous = progress.lessons[id] || { best: 0 };
  progress.lessons[id] = {
    percent: percent,
    best: Math.max(previous.best || 0, percent),
    completed: true,
    updatedAt: new Date().toISOString()
  };

  // Добавляем слова урока в копилку (без повторов)
  let newWords = 0;
  if (lesson && Array.isArray(lesson.words)) {
    lesson.words.forEach(word => {
      if (!progress.words.includes(word.jp)) {
        progress.words.push(word.jp);
        newWords += 1;
      }
    });
  }

  touchStreak(progress);
  saveProgress(progress);

  // Новые слова — в счётчики, XP и ежедневные задания
  if (typeof notifyAction === 'function') {
    notifyAction('lesson', 1, { lessonId: id, percent: percent });
    if (newWords > 0) notifyAction('word', newWords, { reason: 'Новые слова' });
  }

  // Достижения проверяет модуль achievements.js
  const fresh = typeof window.checkAchievements === 'function' ? window.checkAchievements() : [];

  return { percent: percent, newWords: newWords, achievements: fresh };
}

/** Полный сброс прогресса (для настроек). */
function resetProgress() {
  localStorage.removeItem(STORAGE_KEYS.progress);
  localStorage.removeItem(STORAGE_KEYS.achievements);
}

/* ---------- Озвучка слов (Web Speech API) ---------- */

// Голос японского выбираем один раз и запоминаем
let japaneseVoice = null;

/** Есть ли в браузере синтез речи. */
function isSpeechSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Ищет японский голос среди установленных. */
function pickJapaneseVoice() {
  if (!isSpeechSupported()) return null;

  const voices = window.speechSynthesis.getVoices();
  return voices.find(voice => /^ja([-_]JP)?$/i.test(voice.lang)) ||
         voices.find(voice => /ja/i.test(voice.lang)) ||
         null;
}

// Голоса подгружаются асинхронно — обновляем ссылку, когда они готовы
if (isSpeechSupported()) {
  japaneseVoice = pickJapaneseVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    japaneseVoice = pickJapaneseVoice();
  };
}

/**
 * Озвучивает японский текст.
 * @param {string} text
 */
function speakJapanese(text) {
  const clean = String(text || '').trim();
  if (!clean) return;

  if (!isSpeechSupported()) {
    if (typeof showToast === 'function') {
      showToast('Озвучка недоступна', 'Браузер не поддерживает Web Speech API', 'warning');
    }
    return;
  }

  // Останавливаем предыдущую озвучку, чтобы не наслаивалась
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.9;
  utterance.pitch = 1;

  if (!japaneseVoice) japaneseVoice = pickJapaneseVoice();
  if (japaneseVoice) utterance.voice = japaneseVoice;

  window.speechSynthesis.speak(utterance);

  // Если японского голоса нет, браузер прочитает текст своим — предупреждаем один раз
  if (!japaneseVoice && !window.__nihongoVoiceWarned) {
    window.__nihongoVoiceWarned = true;
    if (typeof showToast === 'function') {
      showToast('Японский голос не найден', 'Установите японский язык в системе — озвучка станет точнее', 'info');
    }
  }
}

/* Экспорт в глобальную область */
window.getProgress = getProgress;
window.saveProgress = saveProgress;
window.getLessonProgress = getLessonProgress;
window.getUnlockedAchievements = getUnlockedAchievements;
window.hasAchievement = hasAchievement;
window.checkAchievements = checkAchievements;
window.getStats = getStats;
window.completeLesson = completeLesson;
window.countCompletedLessons = countCompletedLessons;
window.resetProgress = resetProgress;
window.speakJapanese = speakJapanese;
window.isSpeechSupported = isSpeechSupported;
