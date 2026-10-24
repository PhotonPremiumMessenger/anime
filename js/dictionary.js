/* ============================================================
   dictionary.js — словарь
   Собирает слова из пяти уроков и добавляет базовый набор N5/N4.
   Поиск по японскому, ромадзи и русскому + Google Translate
   для любого слова, которого нет в словаре.
   ============================================================ */

'use strict';

/* ---------- Дополнительные слова ---------- */

// Слова, которых нет в уроках: быт, природа, вежливые фразы
const DICTIONARY_EXTRA = [
  { jp: '時間', romaji: 'jikan', ru: 'время', level: 'N5', tag: 'Время' },
  { jp: '今日', romaji: 'kyou', ru: 'сегодня', level: 'N5', tag: 'Время' },
  { jp: '明日', romaji: 'ashita', ru: 'завтра', level: 'N5', tag: 'Время' },
  { jp: '昨日', romaji: 'kinou', ru: 'вчера', level: 'N5', tag: 'Время' },
  { jp: '朝', romaji: 'asa', ru: 'утро', level: 'N5', tag: 'Время' },
  { jp: '昼', romaji: 'hiru', ru: 'день, полдень', level: 'N5', tag: 'Время' },
  { jp: '夜', romaji: 'yoru', ru: 'ночь', level: 'N5', tag: 'Время' },
  { jp: '週末', romaji: 'shuumatsu', ru: 'выходные', level: 'N4', tag: 'Время' },

  { jp: '学校', romaji: 'gakkou', ru: 'школа', level: 'N5', tag: 'Места' },
  { jp: '先生', romaji: 'sensei', ru: 'учитель', level: 'N5', tag: 'Люди' },
  { jp: '友達', romaji: 'tomodachi', ru: 'друг', level: 'N5', tag: 'Люди' },
  { jp: '家族', romaji: 'kazoku', ru: 'семья', level: 'N5', tag: 'Люди' },
  { jp: '母', romaji: 'haha', ru: 'мама', level: 'N5', tag: 'Люди' },
  { jp: '父', romaji: 'chichi', ru: 'папа', level: 'N5', tag: 'Люди' },
  { jp: '兄', romaji: 'ani', ru: 'старший брат', level: 'N5', tag: 'Люди' },
  { jp: '姉', romaji: 'ane', ru: 'старшая сестра', level: 'N5', tag: 'Люди' },
  { jp: '名前', romaji: 'namae', ru: 'имя', level: 'N5', tag: 'Люди' },
  { jp: '国', romaji: 'kuni', ru: 'страна', level: 'N5', tag: 'Места' },
  { jp: '日本', romaji: 'nihon', ru: 'Япония', level: 'N5', tag: 'Места' },
  { jp: '日本語', romaji: 'nihongo', ru: 'японский язык', level: 'N5', tag: 'Язык' },
  { jp: '言葉', romaji: 'kotoba', ru: 'слово, речь', level: 'N4', tag: 'Язык' },

  { jp: '本', romaji: 'hon', ru: 'книга', level: 'N5', tag: 'Вещи' },
  { jp: '映画', romaji: 'eiga', ru: 'фильм', level: 'N5', tag: 'Досуг' },
  { jp: '音楽', romaji: 'ongaku', ru: 'музыка', level: 'N5', tag: 'Досуг' },
  { jp: '歌', romaji: 'uta', ru: 'песня', level: 'N5', tag: 'Досуг' },
  { jp: 'ゲーム', romaji: 'geemu', ru: 'игра', level: 'N5', tag: 'Досуг' },

  { jp: '猫', romaji: 'neko', ru: 'кошка', level: 'N5', tag: 'Природа' },
  { jp: '犬', romaji: 'inu', ru: 'собака', level: 'N5', tag: 'Природа' },
  { jp: '鳥', romaji: 'tori', ru: 'птица', level: 'N5', tag: 'Природа' },
  { jp: '魚', romaji: 'sakana', ru: 'рыба', level: 'N5', tag: 'Природа' },
  { jp: '花', romaji: 'hana', ru: 'цветок', level: 'N5', tag: 'Природа' },
  { jp: '桜', romaji: 'sakura', ru: 'сакура', level: 'N5', tag: 'Природа' },
  { jp: '空', romaji: 'sora', ru: 'небо', level: 'N5', tag: 'Природа' },
  { jp: '海', romaji: 'umi', ru: 'море', level: 'N5', tag: 'Природа' },
  { jp: '山', romaji: 'yama', ru: 'гора', level: 'N5', tag: 'Природа' },
  { jp: '川', romaji: 'kawa', ru: 'река', level: 'N5', tag: 'Природа' },
  { jp: '雨', romaji: 'ame', ru: 'дождь', level: 'N5', tag: 'Природа' },
  { jp: '雪', romaji: 'yuki', ru: 'снег', level: 'N5', tag: 'Природа' },
  { jp: '風', romaji: 'kaze', ru: 'ветер', level: 'N5', tag: 'Природа' },
  { jp: '月', romaji: 'tsuki', ru: 'луна', level: 'N5', tag: 'Природа' },
  { jp: '星', romaji: 'hoshi', ru: 'звезда', level: 'N5', tag: 'Природа' },
  { jp: '太陽', romaji: 'taiyou', ru: 'солнце', level: 'N4', tag: 'Природа' },
  { jp: '水', romaji: 'mizu', ru: 'вода', level: 'N5', tag: 'Природа' },
  { jp: '火', romaji: 'hi', ru: 'огонь', level: 'N5', tag: 'Природа' },

  { jp: '食べる', romaji: 'taberu', ru: 'есть, кушать', level: 'N5', tag: 'Глаголы' },
  { jp: '飲む', romaji: 'nomu', ru: 'пить', level: 'N5', tag: 'Глаголы' },
  { jp: '見る', romaji: 'miru', ru: 'смотреть', level: 'N5', tag: 'Глаголы' },
  { jp: '聞く', romaji: 'kiku', ru: 'слушать, спрашивать', level: 'N5', tag: 'Глаголы' },
  { jp: '話す', romaji: 'hanasu', ru: 'говорить', level: 'N5', tag: 'Глаголы' },
  { jp: '読む', romaji: 'yomu', ru: 'читать', level: 'N5', tag: 'Глаголы' },
  { jp: '書く', romaji: 'kaku', ru: 'писать', level: 'N5', tag: 'Глаголы' },
  { jp: '行く', romaji: 'iku', ru: 'идти', level: 'N5', tag: 'Глаголы' },
  { jp: '来る', romaji: 'kuru', ru: 'приходить', level: 'N5', tag: 'Глаголы' },
  { jp: '帰る', romaji: 'kaeru', ru: 'возвращаться', level: 'N5', tag: 'Глаголы' },
  { jp: '寝る', romaji: 'neru', ru: 'спать', level: 'N5', tag: 'Глаголы' },
  { jp: '起きる', romaji: 'okiru', ru: 'вставать', level: 'N5', tag: 'Глаголы' },

  { jp: '好き', romaji: 'suki', ru: 'любимый', level: 'N5', tag: 'Чувства' },
  { jp: '嫌い', romaji: 'kirai', ru: 'нелюбимый', level: 'N5', tag: 'Чувства' },
  { jp: '嬉しい', romaji: 'ureshii', ru: 'радостный', level: 'N5', tag: 'Чувства' },
  { jp: '悲しい', romaji: 'kanashii', ru: 'грустный', level: 'N5', tag: 'Чувства' },
  { jp: '怖い', romaji: 'kowai', ru: 'страшный', level: 'N5', tag: 'Чувства' },

  { jp: '大きい', romaji: 'ookii', ru: 'большой', level: 'N5', tag: 'Признаки' },
  { jp: '小さい', romaji: 'chiisai', ru: 'маленький', level: 'N5', tag: 'Признаки' },
  { jp: '新しい', romaji: 'atarashii', ru: 'новый', level: 'N5', tag: 'Признаки' },
  { jp: '古い', romaji: 'furui', ru: 'старый', level: 'N5', tag: 'Признаки' },
  { jp: '速い', romaji: 'hayai', ru: 'быстрый', level: 'N5', tag: 'Признаки' },
  { jp: '遅い', romaji: 'osoi', ru: 'медленный', level: 'N5', tag: 'Признаки' },
  { jp: '可愛い', romaji: 'kawaii', ru: 'милый', level: 'N5', tag: 'Признаки' },
  { jp: '綺麗', romaji: 'kirei', ru: 'красивый, чистый', level: 'N5', tag: 'Признаки' },
  { jp: 'すごい', romaji: 'sugoi', ru: 'здорово, класс', level: 'N5', tag: 'Признаки' },

  { jp: '大丈夫', romaji: 'daijoubu', ru: 'всё в порядке', level: 'N5', tag: 'Фразы' },
  { jp: '頑張って', romaji: 'ganbatte', ru: 'держись, не сдавайся', level: 'N5', tag: 'Фразы' },
  { jp: 'ありがとう', romaji: 'arigatou', ru: 'спасибо', level: 'N5', tag: 'Фразы' },
  { jp: 'ごめんなさい', romaji: 'gomennasai', ru: 'прости, пожалуйста', level: 'N5', tag: 'Фразы' },
  { jp: 'おはよう', romaji: 'ohayou', ru: 'доброе утро', level: 'N5', tag: 'Фразы' },
  { jp: 'こんばんは', romaji: 'konbanwa', ru: 'добрый вечер', level: 'N5', tag: 'Фразы' },
  { jp: 'おやすみ', romaji: 'oyasumi', ru: 'спокойной ночи', level: 'N5', tag: 'Фразы' },
  { jp: 'いただきます', romaji: 'itadakimasu', ru: 'приятного аппетита (перед едой)', level: 'N5', tag: 'Фразы' },
  { jp: 'ただいま', romaji: 'tadaima', ru: 'я дома', level: 'N5', tag: 'Фразы' },
  { jp: 'おかえり', romaji: 'okaeri', ru: 'с возвращением', level: 'N5', tag: 'Фразы' },
  { jp: 'はい', romaji: 'hai', ru: 'да', level: 'N5', tag: 'Фразы' },
  { jp: 'いいえ', romaji: 'iie', ru: 'нет', level: 'N5', tag: 'Фразы' },
  { jp: 'やばい', romaji: 'yabai', ru: 'жесть, и плохо, и круто', level: 'N4', tag: 'Сленг' },
  { jp: 'まじで', romaji: 'maji de', ru: 'серьёзно?', level: 'N4', tag: 'Сленг' },
  { jp: '大好き', romaji: 'daisuki', ru: 'очень люблю', level: 'N5', tag: 'Чувства' },

  { jp: '天気', romaji: 'tenki', ru: 'погода', level: 'N5', tag: 'Природа' },
  { jp: '電気', romaji: 'denki', ru: 'электричество', level: 'N5', tag: 'Вещи' },
  { jp: '電話', romaji: 'denwa', ru: 'телефон', level: 'N5', tag: 'Вещи' },
  { jp: '仕事', romaji: 'shigoto', ru: 'работа', level: 'N5', tag: 'Люди' },
  { jp: '病院', romaji: 'byouin', ru: 'больница', level: 'N5', tag: 'Места' },
  { jp: '駅', romaji: 'eki', ru: 'станция', level: 'N5', tag: 'Места' },
  { jp: '電車', romaji: 'densha', ru: 'поезд', level: 'N5', tag: 'Вещи' },
  { jp: '車', romaji: 'kuruma', ru: 'машина', level: 'N5', tag: 'Вещи' },
  { jp: '窓', romaji: 'mado', ru: 'окно', level: 'N5', tag: 'Вещи' },
  { jp: 'ドア', romaji: 'doa', ru: 'дверь', level: 'N5', tag: 'Вещи' },
  { jp: '机', romaji: 'tsukue', ru: 'стол', level: 'N5', tag: 'Вещи' },
  { jp: '椅子', romaji: 'isu', ru: 'стул', level: 'N5', tag: 'Вещи' },
  { jp: '鉛筆', romaji: 'enpitsu', ru: 'карандаш', level: 'N5', tag: 'Вещи' },
  { jp: '眼鏡', romaji: 'megane', ru: 'очки', level: 'N5', tag: 'Вещи' },
  { jp: '時計', romaji: 'tokei', ru: 'часы', level: 'N5', tag: 'Вещи' },
  { jp: '財布', romaji: 'saifu', ru: 'кошелёк', level: 'N5', tag: 'Вещи' },
  { jp: '傘', romaji: 'kasa', ru: 'зонт', level: 'N5', tag: 'Вещи' },
  { jp: '服', romaji: 'fuku', ru: 'одежда', level: 'N5', tag: 'Вещи' }
];

/* ---------- Сборка словаря ---------- */

/**
 * Все слова: из уроков + дополнительные.
 * @returns {Array<{jp:string,romaji:string,ru:string,level:string,tag:string,lesson:number}>}
 */
function getAllDictionaryWords() {
  const lessons = window.nihongo_lessons || [];
  const words = [];

  lessons.forEach(lesson => {
    (lesson.words || []).forEach(word => {
      words.push({
        jp: word.jp,
        romaji: word.romaji || toRomaji(word.jp),
        ru: word.ru,
        level: lesson.level,
        tag: 'Урок ' + lesson.id,
        lesson: lesson.id
      });
    });
  });

  DICTIONARY_EXTRA.forEach(word => {
    words.push(Object.assign({ lesson: 0 }, word));
  });

  // Убираем дубли по японскому написанию
  const seen = new Set();
  return words.filter(word => {
    if (seen.has(word.jp)) return false;
    seen.add(word.jp);
    return true;
  });
}

/* ---------- Состояние ---------- */

let dictionaryQuery = '';
let dictionaryLevel = 'all';
let dictionaryTag = 'all';
let dictionaryOnlyMine = false;

/** Мои слова: те, что уже в копилке прогресса. */
function getMyWords() {
  if (typeof getProgress !== 'function') return [];
  const progress = getProgress();
  return Array.isArray(progress.words) ? progress.words : [];
}

/** Меняет фильтр по уровню. */
function filterDictionaryLevel(level, button) {
  dictionaryLevel = level;
  document.querySelectorAll('.dict-levels .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');
  renderDictionary();
}

/** Меняет фильтр по теме. */
function filterDictionaryTag(tag, button) {
  dictionaryTag = tag;
  document.querySelectorAll('.dict-tags .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');
  renderDictionary();
}

/** Переключает «только мои слова». */
function toggleOnlyMine(button) {
  dictionaryOnlyMine = !dictionaryOnlyMine;
  if (button) button.classList.toggle('chip-active', dictionaryOnlyMine);
  renderDictionary();
}

/** Поиск. */
function onDictionarySearch(value) {
  dictionaryQuery = String(value || '').trim().toLowerCase();
  renderDictionary();
}

/* ---------- Отрисовка ---------- */

/** Рисует список слов. */
function renderDictionary() {
  const grid = document.getElementById('dictGrid');
  if (!grid) return;

  const all = getAllDictionaryWords();
  const mine = getMyWords();

  // Полный список тем для фильтра (собираем один раз)
  renderDictionaryTags(all);

  const list = all.filter(word => {
    if (dictionaryLevel !== 'all' && word.level !== dictionaryLevel) return false;
    if (dictionaryTag !== 'all' && word.tag !== dictionaryTag) return false;
    if (dictionaryOnlyMine && !mine.includes(word.jp)) return false;

    if (!dictionaryQuery) return true;

    return word.jp.toLowerCase().includes(dictionaryQuery) ||
      word.romaji.toLowerCase().includes(dictionaryQuery) ||
      word.ru.toLowerCase().includes(dictionaryQuery);
  });

  grid.innerHTML = '';

  if (!list.length) {
    // Фильтр по уровню объясняем отдельно: это не «слово не найдено»
    const levelEmpty = dictionaryLevel !== 'all' && !dictionaryQuery;

    grid.innerHTML = levelEmpty
      ? `<div class="empty-state dict-empty">
          На уровне ${dictionaryLevel} слов пока нет.
          <button class="btn btn-outline btn-small" onclick="filterDictionaryLevel('all', document.querySelector('.dict-levels .chip'))">Показать все уровни</button>
        </div>`
      : `<div class="empty-state dict-empty">
          Такого слова нет в словаре.
          <button class="btn btn-outline btn-small" onclick="translateUnknown()">Перевести через Google</button>
        </div>`;
  }

  // Ограничиваем вывод, чтобы не рисовать 150 карточек разом
  const limit = dictionaryQuery ? list.length : 60;
  list.slice(0, limit).forEach(word => {
    const card = document.createElement('article');
    card.className = 'dict-card';
    card.innerHTML = `
      <div class="dict-card-top">
        <span class="dict-jp" data-ja></span>
        <span class="dict-level">${word.level}</span>
      </div>
      <div class="dict-romaji"></div>
      <div class="dict-ru"></div>
      <div class="dict-card-foot">
        <span class="dict-tag"></span>
        <button class="speak-btn" type="button" title="Прослушать">🔊</button>
      </div>
    `;

    card.querySelector('.dict-jp').textContent = word.jp;
    card.querySelector('.dict-romaji').textContent = word.romaji;
    card.querySelector('.dict-ru').textContent = word.ru;
    card.querySelector('.dict-tag').textContent = mine.includes(word.jp) ? 'в копилке ✓' : word.tag;

    if (mine.includes(word.jp)) card.classList.add('is-mine');

    // Звёздочка избранного (пункт 43)
    if (typeof favoriteButtonMarkup === 'function') {
      card.insertAdjacentHTML('beforeend',
        favoriteButtonMarkup('word', word.jp, word.jp + ' — ' + word.ru, 'dictionary.html?q=' + encodeURIComponent(word.jp)));
    }

    card.querySelector('.speak-btn').addEventListener('click', event => {
      event.stopPropagation();
      speakJapanese(word.jp);
    });

    grid.appendChild(card);
  });

  const counter = document.getElementById('dictCounter');
  if (counter) {
    counter.textContent = list.length + ' из ' + all.length + ' слов' +
      (dictionaryOnlyMine ? ' · только мои' : '');
  }

  decorateRomaji(grid);
}

/** Рисует chips тем. */
function renderDictionaryTags(words) {
  const box = document.getElementById('dictTags');
  if (!box || box.dataset.ready === 'true') return;

  const tags = Array.from(new Set(words.map(word => word.tag))).sort();
  box.innerHTML = `<button class="chip chip-active" onclick="filterDictionaryTag('all', this)">Все темы</button>`;

  tags.forEach(tag => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = tag;
    chip.addEventListener('click', () => filterDictionaryTag(tag, chip));
    box.appendChild(chip);
  });

  box.dataset.ready = 'true';
}

/* ---------- Перевод незнакомого слова ---------- */

/** Переводит текст из поля поиска через Google Translate. */
async function translateUnknown() {
  const input = document.getElementById('dictSearch');
  const box = document.getElementById('dictTranslateResult');
  const text = input ? input.value.trim() : '';

  if (!text) {
    if (typeof showToast === 'function') showToast('Пустой запрос', 'Введи слово или фразу', 'warning');
    return;
  }

  if (!box) return;
  box.innerHTML = '<span class="muted small">Переводим…</span>';

  if (typeof translateToJapanese !== 'function') {
    box.innerHTML = '<span class="muted small">Переводчик не подключён</span>';
    return;
  }

  const result = await translateToJapanese(text);

  if (!result.ok) {
    box.innerHTML = '<span class="small">' + (result.error || 'Не получилось перевести') + '</span>';
    return;
  }

  box.innerHTML = `
    <div class="dict-translate-card">
      <span class="small muted">Google Translate</span>
      <b data-ja></b>
      <span class="dict-translate-romaji"></span>
      <div class="btn-row">
        <button class="btn btn-outline btn-small" onclick="speakJapanese(this.closest('.dict-translate-card').querySelector('b').textContent)">🔊 Прослушать</button>
        <a class="btn btn-ghost btn-small" target="_blank" rel="noopener"
           href="https://translate.google.com/?sl=auto&tl=ja&text=${encodeURIComponent(text)}">Открыть в Google</a>
      </div>
    </div>
  `;

  const resultEl = box.querySelector('.dict-translate-card b');
  if (resultEl) resultEl.textContent = result.text;

  const romajiEl = box.querySelector('.dict-translate-romaji');
  if (romajiEl) romajiEl.textContent = toRomaji(result.text);

  if (typeof notifyAction === 'function') notifyAction('translate', 1);
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('dictGrid')) return;

  // Переход из общего поиска: dictionary.html?q=слово
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q');
  if (query) {
    dictionaryQuery = query.trim().toLowerCase();
    const input = document.getElementById('dictSearch');
    if (input) input.value = query;
  }

  renderDictionary();

  // Enter в поиске запускает перевод, если слова нет
  const input = document.getElementById('dictSearch');
  if (input) {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') translateUnknown();
    });
  }
});

/* Экспорт в глобальную область */
window.DICTIONARY_EXTRA = DICTIONARY_EXTRA;
window.getAllDictionaryWords = getAllDictionaryWords;
window.renderDictionary = renderDictionary;
window.filterDictionaryLevel = filterDictionaryLevel;
window.filterDictionaryTag = filterDictionaryTag;
window.onDictionarySearch = onDictionarySearch;
window.toggleOnlyMine = toggleOnlyMine;
window.translateUnknown = translateUnknown;
