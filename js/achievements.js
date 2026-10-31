/* ============================================================
   achievements.js — 100 достижений
   Каждое достижение: id, название, описание, SVG-иконка и
   условие-функция. Условия проверяются по статистике игрока
   из xp.js, поэтому новым системам достаточно обновлять счётчики.
   ============================================================ */

'use strict';

/* ---------- Набор SVG-иконок (viewBox 24×24, обводка) ---------- */

const ACH_ICONS = {
  star: '<path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 18.5V21h16"/><path d="M9 7h7M9 11h7"/>',
  fire: '<path d="M12 22c4 0 6.5-2.7 6.5-6.2 0-4.6-4.3-6.6-4.3-10.3 0-1-.4-1.8-1.2-2.5.3 3-2 4-3.4 6.2-1 1.5-1.4 2.8-1.4 4.3 0 1.5.7 2.6 1.7 3.3-.2-1.6.3-2.9 1.4-3.9-.3 3 .7 4.4 2.1 5.3"/>',
  crown: '<path d="M3 8l4 3 5-6 5 6 4-3-2 11H5z"/><path d="M5 19h14"/>',
  sakura: '<circle cx="12" cy="12" r="2.4"/><path d="M12 9.6c0-3-1.4-5.1 0-6.6 1.4 1.5 0 3.6 0 6.6M12 14.4c0 3 1.4 5.1 0 6.6-1.4-1.5 0-3.6 0-6.6M9.6 12c-3 0-5.1-1.4-6.6 0 1.5 1.4 3.6 0 6.6 0M14.4 12c3 0 5.1 1.4 6.6 0-1.5-1.4-3.6 0-6.6 0"/>',
  torii: '<path d="M3 6h18M5 9h14M8 9v12M16 9v12M4 5l1-2h14l1 2"/><path d="M9 13h6"/>',
  sword: '<path d="M14.5 3H21v6.5L9 21.5 2.5 15z"/><path d="M5 13l6 6M3 21l3-3"/>',
  scroll: '<path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2z"/><path d="M6 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2"/><path d="M10 8h6M10 12h6M10 16h4"/>',
  mask: '<path d="M12 3c4.5 0 7 2.6 7 7 0 5.5-3.4 11-7 11S5 15.5 5 10c0-4.4 2.5-7 7-7z"/><path d="M9 10h2M13 10h2M10.5 15c1 .8 2 .8 3 0"/>',
  lantern: '<path d="M9 3h6M12 3v3"/><rect x="6" y="6" width="12" height="12" rx="5"/><path d="M12 6v12M9 20h6"/>',
  cat: '<path d="M5 9 4 4l4.5 2.5M19 9l1-5-4.5 2.5"/><path d="M12 6.5c4 0 7 2.8 7 6.5s-3 6.5-7 6.5S5 16.7 5 13s3-6.5 7-6.5z"/><path d="M9.5 12.5h.01M14.5 12.5h.01M12 15.5v1"/>',
  ramen: '<path d="M3 11h18c0 5-4 8-9 8s-9-3-9-8z"/><path d="M7 8c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M17 8c0-1.5 1-2 1-3.5"/><path d="M3 22h18"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  fan: '<path d="M12 21a9 9 0 1 1 9-9"/><path d="M12 12 4.6 6.6M12 12 8 3.5M12 12h11"/><circle cx="12" cy="12" r="1.6"/>',
  cloud: '<path d="M6.5 18h11a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.7 3.7 0 0 0 6.5 18z"/>',
  mountain: '<path d="M2 20l7-12 4 6 3-4 6 10z"/><path d="M7.4 9.5h3.2"/>',
  wave: '<path d="M2 8c3 0 3 3 6 3s3-3 6-3 3 3 6 3M2 14c3 0 3 3 6 3s3-3 6-3 3 3 6 3"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19"/>',
  gem: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l3 18M15 3l-3 18"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8.3-8 9.5C7.4 20.3 4 17 4 12V6z"/><path d="M9 12l2 2 4-4"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  heart: '<path d="M12 20s-8-4.8-8-10a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.2-8 10-8 10z"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13"/><path d="M12 8S9 3 6.5 4.5 8 8 12 8zM12 8s3-5 5.5-3.5S16 8 12 8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  map: '<path d="M9 4 3 6v15l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v15M15 6v15"/>',
  key: '<circle cx="8" cy="8" r="4.5"/><path d="M11.2 11.2 21 21M17 17l2-2M14 14l2-2"/>',
  brush: '<path d="M15 3 21 9 10 20l-6 1 1-6z"/><path d="M13 5l6 6"/>',
  mic: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
  camera: '<path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="3.6"/>',
  rocket: '<path d="M12 3c3 2 5 5.5 5 9l-2.5 2.5h-5L7 12c0-3.5 2-7 5-9z"/><path d="M9.5 14.5 7 17v3l3-.5M14.5 14.5 17 17v3l-3-.5"/><circle cx="12" cy="9" r="1.4"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8"/>',
  feather: '<path d="M20 4c-6 0-11 4-13 9l-3 7 7-3c5-2 9-7 9-13z"/><path d="M4 20 14 10"/>',
  leaf: '<path d="M20 4C10 4 4 9.5 4 16c0 2 .6 3.2 1.5 4C12 20 20 14 20 4z"/><path d="M4 21c3-6 7-9 12-11"/>',
  cup: '<path d="M5 7h11v7a5 5 0 0 1-11 0z"/><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16M4 21h14"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  puzzle: '<path d="M9 4h3a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H5v-4a2 2 0 1 0 0-4V4h4z"/>',
  lanterns: '<path d="M8 2v2M16 2v2"/><rect x="4" y="4" width="7" height="9" rx="3"/><rect x="13" y="8" width="7" height="9" rx="3"/><path d="M7.5 13v5M16.5 17v3"/>',
  scrollText: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  moonStar: '<path d="M17 13.5A6.5 6.5 0 1 1 9 6a5.2 5.2 0 0 0 8 7.5z"/><path d="M18 3.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1L15 6.5l2.1-.9z"/>',
  flame: '<path d="M12 21c3.6 0 6-2.4 6-5.6 0-4-3.8-6-3.8-9.2 0-1.4-1-2.5-2.2-3.2 0 2.6-2.6 3.6-2.6 7 0 1.2.4 2 .9 2.6 1.4-3.2 3-3.4 3-3.4-1.8 3.2-.6 5.2 1.2 6.4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h2M14 14h2M8 17.5h2M14 17.5h2"/>',
  bag: '<path d="M4 8h16l-1.4 12.2a1 1 0 0 1-1 .8H6.4a1 1 0 0 1-1-.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  share: '<circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="M8.3 10.7 15.7 7.3M8.3 13.3l7.4 3.4"/>'
};

/* ---------- Помощник для короткой записи достижений ---------- */

function ach(id, name, description, icon, check) {
  return { id: id, name: name, description: description, icon: icon, check: check };
}

/* ---------- Сто достижений ---------- */

const ACHIEVEMENTS = [
  /* --- Слова (12) --- */
  ach('words_1', 'Первое слово', 'Выучи первое японское слово', 'book', s => s.words >= 1),
  ach('words_5', 'Пять слов', 'Выучи 5 слов', 'book', s => s.words >= 5),
  ach('words_10', 'Десятка', 'Выучи 10 слов', 'scrollText', s => s.words >= 10),
  ach('words_25', 'Словарный запас', 'Выучи 25 слов', 'scroll', s => s.words >= 25),
  ach('words_50', 'Полсотни', 'Выучи 50 слов', 'scroll', s => s.words >= 50),
  ach('words_100', 'Сотня слов', 'Выучи 100 слов', 'gem', s => s.words >= 100),
  ach('words_200', 'Двести слов', 'Выучи 200 слов', 'crown', s => s.words >= 200),
  ach('words_300', 'Триста слов', 'Выучи 300 слов', 'trophy', s => s.words >= 300),
  ach('words_400', 'Четыреста', 'Выучи 400 слов', 'trophy', s => s.words >= 400),
  ach('words_500', 'Полтысячи', 'Выучи 500 слов', 'trophy', s => s.words >= 500),

  /* --- Уроки (10) --- */
  ach('lessons_1', 'Первый урок', 'Пройди первый урок', 'sakura', s => s.lessons >= 1),
  ach('lessons_2', 'Втянулся', 'Пройди 2 урока', 'leaf', s => s.lessons >= 2),
  ach('lessons_3', 'Третий шаг', 'Пройди 3 урока', 'leaf', s => s.lessons >= 3),
  ach('lessons_5', 'Половина курса', 'Пройди 5 уроков', 'book', s => s.lessons >= 5),
  ach('lessons_10', 'Десять уроков', 'Пройди 10 уроков', 'scroll', s => s.lessons >= 10),
  ach('lessons_15', 'Пятнадцать', 'Пройди 15 уроков', 'scroll', s => s.lessons >= 15),
  ach('lessons_20', 'Двадцать', 'Пройди 20 уроков', 'trophy', s => s.lessons >= 20),
  ach('lessons_25', 'Двадцать пять', 'Пройди 25 уроков', 'trophy', s => s.lessons >= 25),
  ach('lessons_30', 'Тридцать уроков', 'Пройди 30 уроков', 'crown', s => s.lessons >= 30),

  /* --- Стрик (11) --- */
  ach('streak_2', 'Два дня подряд', 'Заходи 2 дня подряд', 'fire', s => s.streak >= 2),
  ach('streak_3', 'Три дня', 'Заходи 3 дня подряд', 'fire', s => s.streak >= 3),
  ach('streak_5', 'Пять дней', 'Заходи 5 дней подряд', 'fire', s => s.streak >= 5),
  ach('streak_7', 'Неделя подряд', 'Заходи 7 дней подряд', 'flame', s => s.streak >= 7),
  ach('streak_10', 'Десять дней', 'Заходи 10 дней подряд', 'flame', s => s.streak >= 10),
  ach('streak_14', 'Две недели', 'Заходи 14 дней подряд', 'flame', s => s.streak >= 14),
  ach('streak_21', 'Три недели', 'Заходи 21 день подряд', 'bolt', s => s.streak >= 21),
  ach('streak_30', 'Месяц подряд', 'Заходи 30 дней подряд', 'bolt', s => s.streak >= 30),
  ach('streak_50', 'Пятьдесят дней', 'Заходи 50 дней подряд', 'trophy', s => s.streak >= 50),
  ach('streak_100', 'Сто дней', 'Заходи 100 дней подряд', 'crown', s => s.streak >= 100),

  /* --- Опыт (10) --- */
  ach('xp_10', 'Первые XP', 'Набери 10 XP', 'star', s => s.xp >= 10),
  ach('xp_50', 'Пятьдесят XP', 'Набери 50 XP', 'star', s => s.xp >= 50),
  ach('xp_100', 'Сотня XP', 'Набери 100 XP', 'star', s => s.xp >= 100),
  ach('xp_250', 'Двести пятьдесят', 'Набери 250 XP', 'gem', s => s.xp >= 250),
  ach('xp_500', 'Пятьсот XP', 'Набери 500 XP', 'gem', s => s.xp >= 500),
  ach('xp_1000', 'Тысяча', 'Набери 1000 XP', 'crown', s => s.xp >= 1000),
  ach('xp_2000', 'Две тысячи', 'Набери 2000 XP', 'crown', s => s.xp >= 2000),
  ach('xp_3500', 'Три пятьсот', 'Набери 3500 XP', 'trophy', s => s.xp >= 3500),
  ach('xp_5000', 'Пять тысяч', 'Набери 5000 XP', 'trophy', s => s.xp >= 5000),
  ach('xp_10000', 'Десять тысяч', 'Набери 10 000 XP', 'crown', s => s.xp >= 10000),

  /* --- Уровни (13) --- */
  ach('level_2', 'Уровень 2', 'Достигни 2 уровня', 'leaf', s => s.level >= 2),
  ach('level_3', 'Уровень 3', 'Достигни 3 уровня', 'leaf', s => s.level >= 3),
  ach('level_5', 'Уровень 5', 'Достигни 5 уровня', 'sakura', s => s.level >= 5),
  ach('level_10', 'Уровень 10', 'Достигни 10 уровня', 'shield', s => s.level >= 10),
  ach('level_15', 'Уровень 15', 'Достигни 15 уровня', 'shield', s => s.level >= 15),
  ach('level_20', 'Уровень 20', 'Достигни 20 уровня', 'sword', s => s.level >= 20),
  ach('level_25', 'Уровень 25', 'Достигни 25 уровня', 'sword', s => s.level >= 25),
  ach('level_30', 'Уровень 30', 'Достигни 30 уровня', 'torii', s => s.level >= 30),
  ach('level_40', 'Уровень 40', 'Достигни 40 уровня', 'torii', s => s.level >= 40),
  ach('level_50', 'Уровень 50', 'Достигни 50 уровня', 'crown', s => s.level >= 50),
  ach('level_75', 'Уровень 75', 'Достигни 75 уровня', 'crown', s => s.level >= 75),
  ach('level_100', 'Уровень 100', 'Достигни максимального уровня', 'trophy', s => s.level >= 100),

  /* --- Коллекция достижений (7) --- */
  ach('ach_1', 'Коллекционер', 'Открой первое достижение', 'puzzle', s => s.achievements >= 2),
  ach('ach_5', 'Пять значков', 'Открой 5 достижений', 'puzzle', s => s.achievements >= 6),
  ach('ach_10', 'Десятка значков', 'Открой 10 достижений', 'puzzle', s => s.achievements >= 11),
  ach('ach_25', 'Двадцать пять', 'Открой 25 достижений', 'gem', s => s.achievements >= 26),
  ach('ach_50', 'Полсотни значков', 'Открой 50 достижений', 'gem', s => s.achievements >= 51),
  ach('ach_75', 'Семьдесят пять', 'Открой 75 достижений', 'crown', s => s.achievements >= 76),
  ach('ach_100', 'Все достижения', 'Открой все 100 достижений', 'trophy', s => s.achievements >= 100),

  /* --- Викторина (6) --- */
  ach('quiz_1', 'Первая викторина', 'Пройди викторину дня', 'compass', s => s.quizzes >= 1),
  ach('quiz_10', 'Десять викторин', 'Пройди 10 викторин', 'compass', s => s.quizzes >= 10),
  ach('quiz_correct_10', 'Десять верных', 'Ответь верно 10 раз в викторинах', 'target', s => s.quizCorrect >= 10),
  ach('quiz_correct_50', 'Пятьдесят верных', 'Ответь верно 50 раз', 'target', s => s.quizCorrect >= 50),
  ach('quiz_correct_100', 'Сто верных', 'Ответь верно 100 раз', 'target', s => s.quizCorrect >= 100),
  ach('quiz_perfect', 'Без ошибок', 'Пройди викторину без ошибок', 'star', s => Boolean(s.quizPerfect)),

  /* --- Скорость (5) --- */
  ach('speed_1', 'Первый забег', 'Пройди тест на скорость', 'bolt', s => s.speedRuns >= 1),
  ach('speed_5', 'Пять забегов', 'Пройди тест на скорость 5 раз', 'bolt', s => s.speedRuns >= 5),
  ach('speed_best_10', 'Десять очков', 'Набери 10 очков в тесте на скорость', 'clock', s => s.speedBest >= 10),
  ach('speed_best_20', 'Двадцать очков', 'Набери 20 очков в тесте на скорость', 'clock', s => s.speedBest >= 20),
  ach('speed_total_100', 'Сто верных', 'Дай 100 верных ответов на скорость', 'target', s => s.speedCorrect >= 100),

  /* --- Ежедневные задания (5) --- */
  ach('daily_1', 'Первый квест', 'Выполни ежедневное задание', 'flag', s => s.dailyDone >= 1),
  ach('daily_10', 'Десять квестов', 'Выполни 10 ежедневных заданий', 'flag', s => s.dailyDone >= 10),
  ach('daily_30', 'Тридцать квестов', 'Выполни 30 ежедневных заданий', 'map', s => s.dailyDone >= 30),
  ach('daily_100', 'Сто квестов', 'Выполни 100 ежедневных заданий', 'trophy', s => s.dailyDone >= 100),
  ach('daily_all', 'Все три', 'Выполни все три задания за день', 'mask', s => Boolean(s.dailyAllDone)),

  /* --- Челленджи недели (3) --- */
  ach('weekly_1', 'Первый челлендж', 'Закрой недельный челлендж', 'calendar', s => s.weeklyDone >= 1),
  ach('weekly_5', 'Пять недель', 'Закрой 5 недельных челленджей', 'calendar', s => s.weeklyDone >= 5),
  ach('weekly_12', 'Квартал челленджей', 'Закрой 12 недельных челленджей', 'trophy', s => s.weeklyDone >= 12),

  /* --- Магазин (4) --- */
  ach('shop_1', 'Первая покупка', 'Купи что-нибудь в магазине', 'gift', s => s.purchases >= 1),
  ach('shop_3', 'Три покупки', 'Купи 3 предмета', 'gift', s => s.purchases >= 3),
  ach('shop_5', 'Коллекционер стиля', 'Купи 5 предметов', 'bag', s => s.purchases >= 5),
  ach('shop_10', 'Модник', 'Купи 10 предметов', 'bag', s => s.purchases >= 10),

  /* --- Профиль и настройки (8) --- */
  ach('avatar_1', 'Новый образ', 'Смени аватар', 'camera', s => s.avatarChanges >= 1),
  ach('avatar_3', 'Три образа', 'Смени аватар 3 раза', 'camera', s => s.avatarChanges >= 3),
  ach('bio_1', 'О себе', 'Заполни био в профиле', 'feather', s => s.hasBio),
  ach('theme_1', 'Смена обстановки', 'Смени тему оформления', 'moon', s => s.themeChanges >= 1),
  ach('sakura_1', 'Сакура', 'Включи падающие лепестки', 'sakura', s => s.sakuraOpens >= 1),
  ach('share_1', 'Поделился', 'Поделись ссылкой на профиль', 'share', s => s.shares >= 1),
  ach('friend_1', 'Первый друг', 'Добавь друга', 'heart', s => s.friends >= 1),
  ach('friend_3', 'Компания', 'Добавь 3 друзей', 'heart', s => s.friends >= 3),

  /* --- Пасхалки (4) --- */
  ach('easter_1', 'Что это было?', 'Найди первую пасхалку', 'eye', s => s.easterEggs >= 1),
  ach('easter_3', 'Внимательный', 'Найди 3 пасхалки', 'eye', s => s.easterEggs >= 3),
  ach('easter_5', 'Искатель', 'Найди 5 пасхалок', 'key', s => s.easterEggs >= 5),
  ach('easter_10', 'Все секреты', 'Найди 10 пасхалок', 'key', s => s.easterEggs >= 10),

  /* --- Грамматика (3) --- */
  ach('grammar_1', 'Первое правило', 'Прочитай правило грамматики', 'scrollText', s => s.grammarRead >= 1),
  ach('grammar_5', 'Пять правил', 'Прочитай 5 правил', 'scrollText', s => s.grammarRead >= 5),
  ach('grammar_10', 'Десять правил', 'Прочитай 10 правил', 'book', s => s.grammarRead >= 10),

  /* --- Время в AniLingo (5) --- */
  ach('days_7', 'Неделя с нами', 'Аккаунту больше недели', 'sun', s => s.joinedDays >= 7),
  ach('days_30', 'Месяц с нами', 'Аккаунту больше месяца', 'moonStar', s => s.joinedDays >= 30),
  ach('visit_50', 'Пятьдесят визитов', 'Зайди на сайт 50 раз', 'compass', s => s.visits >= 50),
  ach('early_bird', 'Ранняя пташка', 'Начни урок до 8 утра', 'sun', s => Boolean(s.earlyBird))
];

/* ---------- Проверка и выдача ---------- */

// Защита от повторного входа во время проверки
let achievementCheckRunning = false;

// getUnlockedAchievements() и hasAchievement() объявлены в js/progress.js —
// он подключается раньше и хранит ключ anilingo_achievements. Здесь не дублируем.

/** Сохраняет список открытых. */
function saveUnlockedAchievements(list) {
  writeJSON(XP_KEYS.achievements, list);
}

/**
 * Проверяет все условия и открывает подходящие достижения.
 * @param {boolean} silent — не показывать toast (для первичной проверки)
 * @returns {Array} только что открытые достижения
 */
function checkAchievements(silent = false) {
  if (achievementCheckRunning) return [];

  // Достижения — часть аккаунта: гостю их не открываем
  // и не показываем всплывашки с наградой
  if (typeof accountIsActive === 'function' && !accountIsActive()) return [];

  const stats = getPlayerStats();
  const unlocked = getUnlockedAchievements();
  const fresh = [];

  ACHIEVEMENTS.forEach(achievement => {
    if (unlocked.includes(achievement.id)) return;

    let passed = false;
    try {
      passed = Boolean(achievement.check(stats));
    } catch (error) {
      passed = false;
    }

    if (passed) {
      unlocked.push(achievement.id);
      fresh.push(achievement);
    }
  });

  if (!fresh.length) return [];

  achievementCheckRunning = true;
  saveUnlockedAchievements(unlocked);

  // Каждое достижение даёт XP, поэтому проверку запускаем после сохранения
  fresh.forEach((achievement, index) => {
    setTimeout(() => {
      if (!silent && typeof showToast === 'function') {
        showToast(
          'Достижение: ' + achievement.name,
          achievement.description,
          'success',
          { icon: 'medal', duration: 5200, rewards: [{ icon: 'star', text: '+25 XP' }] }
        );
      }
      addXP(25, 'Достижение');
    }, index * 450);
  });

  achievementCheckRunning = false;
  return fresh;
}

/* ---------- Отрисовка значка ---------- */

/**
 * Возвращает SVG-разметку значка достижения.
 * Открытые — оранжевые, закрытые — серые.
 */
function achievementIconMarkup(achievement, unlocked) {
  const path = ACH_ICONS[achievement.icon] || ACH_ICONS.star;

  return '<svg viewBox="0 0 24 24" aria-hidden="true" class="ach-svg' +
    (unlocked ? ' is-unlocked' : '') + '">' + path + '</svg>';
}

/**
 * Строит DOM-элемент достижения для сетки профиля.
 * @param {object} achievement
 * @param {boolean} unlocked
 */
function buildAchievementCard(achievement, unlocked) {
  const card = document.createElement('div');
  card.className = 'ach-card' + (unlocked ? ' is-unlocked' : ' is-locked');
  card.dataset.id = achievement.id;
  card.title = achievement.name + ' — ' + achievement.description;

  card.innerHTML =
    '<div class="ach-badge">' + achievementIconMarkup(achievement, unlocked) + '</div>' +
    '<div class="ach-title"></div>' +
    '<div class="ach-desc"></div>';

  card.querySelector('.ach-title').textContent = achievement.name;
  card.querySelector('.ach-desc').textContent = achievement.description;

  return card;
}

/* ---------- Фильтр сетки профиля ---------- */

let achievementFilter = 'all';

/** Переключает фильтр сетки: all | unlocked | locked. */
function filterAchievements(mode, button) {
  achievementFilter = mode;

  document.querySelectorAll('.ach-filter .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');

  if (typeof renderAchievementGrid === 'function') renderAchievementGrid();
}

/**
 * Рисует сетку достижений в профиле.
 * @param {string} containerId
 */
function renderAchievementGrid(containerId = 'achGrid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  const unlocked = getUnlockedAchievements();
  const stats = getPlayerStats();

  // Дополнительные «одноразовые» условия
  const extra = readJSON('anilingo_flags', {});
  stats.quizPerfect = Boolean(extra.quizPerfect);
  stats.dailyAllDone = Boolean(extra.dailyAllDone);
  stats.earlyBird = Boolean(extra.earlyBird);

  let list = ACHIEVEMENTS;
  if (achievementFilter === 'unlocked') list = ACHIEVEMENTS.filter(a => unlocked.includes(a.id));
  if (achievementFilter === 'locked') list = ACHIEVEMENTS.filter(a => !unlocked.includes(a.id));

  grid.innerHTML = '';
  list.forEach(achievement => {
    grid.appendChild(buildAchievementCard(achievement, unlocked.includes(achievement.id)));
  });

  // Счётчик в заголовке блока
  const note = document.getElementById('achNote');
  if (note) note.textContent = 'открыто ' + unlocked.length + ' из ' + ACHIEVEMENTS.length;
}

/** Помечает одноразовые условия (например «викторина без ошибок»). */
function setAchievementFlag(flag, value = true) {
  const flags = readJSON('anilingo_flags', {}) || {};
  flags[flag] = value;
  writeJSON('anilingo_flags', flags);
}

/* ---------- Автопроверка ---------- */

// Любое действие на сайте проверяет достижения
registerActionHook(() => checkAchievements());

document.addEventListener('DOMContentLoaded', () => {
  // Тихая проверка при загрузке: добираем «временные» достижения
  if (typeof isAuthorized === 'function' && isAuthorized()) {
    checkAchievements(true);
  }
});

/* Экспорт в глобальную область */
window.ACH_ICONS = ACH_ICONS;
window.ACHIEVEMENTS = ACHIEVEMENTS;
window.ach = ach;
window.getUnlockedAchievements = getUnlockedAchievements;
window.hasAchievement = hasAchievement;
window.checkAchievements = checkAchievements;
window.renderAchievementGrid = renderAchievementGrid;
window.filterAchievements = filterAchievements;
window.setAchievementFlag = setAchievementFlag;
window.achievementIconMarkup = achievementIconMarkup;
