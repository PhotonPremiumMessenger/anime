/* ============================================================
   progress.js — прогресс уроков, достижения и озвучка слов
   Всё хранится в localStorage под ключами nihongo_progress
   и nihongo_achievements.
   ============================================================ */

'use strict';

/* ---------- Достижения ---------- */

// Шесть достижений. Проверка условий — в checkAchievements().
const ACHIEVEMENTS = [
  {
    id: 'first_step',
    name: 'Первый шаг',
    icon: '👣',
    description: 'Выучи первое слово',
    color: '#7DB7FF'
  },
  {
    id: 'first_lesson',
    name: 'Первый урок',
    icon: '🌸',
    description: 'Пройди первый урок до конца',
    color: '#FFB347'
  },
  {
    id: 'words_10',
    name: '10 слов',
    icon: '📚',
    description: 'В копилке 10 японских слов',
    color: '#4ADE80'
  },
  {
    id: 'words_100',
    name: '100 слов',
    icon: '🗣',
    description: 'В копилке 100 японских слов',
    color: '#C084FC'
  },
  {
    id: 'week_streak',
    name: 'Неделя подряд',
    icon: '🔥',
    description: 'Занимайся 7 дней подряд',
    color: '#FB7185'
  },
  {
    id: 'anime_master',
    name: 'Мастер аниме',
    icon: '🎌',
    description: 'Пройди все уроки курса',
    color: '#FFD166'
  }
];

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
  return progress.streak;
}

/* ---------- Достижения: чтение и выдача ---------- */

/** Массив id открытых достижений. */
function getUnlockedAchievements() {
  const list = readJSON(STORAGE_KEYS.achievements, []);
  return Array.isArray(list) ? list : [];
}

/** Открыто ли достижение. */
function hasAchievement(id) {
  return getUnlockedAchievements().includes(id);
}

/**
 * Проверяет все условия и открывает новые достижения.
 * @returns {Array} список только что открытых достижений
 */
function checkAchievements() {
  const progress = getProgress();
  const completed = countCompletedLessons(progress);
  const words = progress.words.length;
  const totalLessons = Array.isArray(window.nihongo_lessons) ? window.nihongo_lessons.length : 5;

  const conditions = {
    first_step: words >= 1,
    first_lesson: completed >= 1,
    words_10: words >= 10,
    words_100: words >= 100,
    week_streak: progress.streak.count >= 7,
    anime_master: completed >= totalLessons && totalLessons > 0
  };

  const unlocked = getUnlockedAchievements();
  const fresh = [];

  ACHIEVEMENTS.forEach(achievement => {
    if (conditions[achievement.id] && !unlocked.includes(achievement.id)) {
      unlocked.push(achievement.id);
      fresh.push(achievement);
    }
  });

  if (fresh.length) writeJSON(STORAGE_KEYS.achievements, unlocked);

  return fresh;
}

/** Показывает toast о новых достижениях (если есть showToast). */
function announceAchievements(list) {
  if (!list || !list.length) return;

  list.forEach((achievement, index) => {
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast(achievement.icon + ' Достижение: ' + achievement.name, achievement.description, 'success');
      }
    }, index * 700);
  });
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
  const xp = lessons * 120 + words * 5;
  const level = Math.floor(xp / 500) + 1;

  return {
    lessons: lessons,
    words: words,
    days: progress.streak.count,
    xp: xp,
    xpMax: level * 500,
    level: level,
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

  const fresh = checkAchievements();
  announceAchievements(fresh);

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
window.ACHIEVEMENTS = ACHIEVEMENTS;
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
