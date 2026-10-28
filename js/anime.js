/* ============================================================
   anime.js — каталог аниме с разбором фраз
   24 тайтла: постер в CSS, фраза с ромадзи и переводом,
   слова из фразы и уровень JLPT.
   ============================================================ */

'use strict';

/* ---------- Каталог ---------- */

const ANIME_CATALOG = [
  {
    id: 'naruto', title: 'Наруто', jp: 'ナルト', year: 2002, level: 'N5',
    genres: ['Сёнэн', 'Приключения'], kanji: '忍', color1: '#FF8A3D', color2: '#B7410E',
    phrase: { jp: '俺は火影になる', ru: 'Я стану Хокаге' },
    context: 'Наруто повторяет это как обещание — «Хокаге» это глава деревни, сильнейший ниндзя.',
    words: [
      { jp: '火影', romaji: 'hokage', ru: 'Хокаге, глава деревни' },
      { jp: '俺', romaji: 'ore', ru: 'я (мужское, просторечное)' }
    ]
  },
  {
    id: 'aot', title: 'Атака титанов', jp: '進撃の巨人', year: 2013, level: 'N4',
    genres: ['Сёнэн', 'Драма'], kanji: '巨', color1: '#7D8CA3', color2: '#1F2933',
    phrase: { jp: '心臓を捧げよ', ru: 'Отдайте свои сердца' },
    context: 'Клятва разведкорпуса перед боем. 捧げる — «подносить, жертвовать».',
    words: [
      { jp: '心臓', romaji: 'shinzou', ru: 'сердце' },
      { jp: '捧げる', romaji: 'sasageru', ru: 'посвящать, отдавать' }
    ]
  },
  {
    id: 'deathnote', title: 'Тетрадь смерти', jp: 'デスノート', year: 2006, level: 'N4',
    genres: ['Мистика', 'Триллер'], kanji: '死', color1: '#9CA3AF', color2: '#111827',
    phrase: { jp: '僕は新世界の神になる', ru: 'Я стану богом нового мира' },
    context: 'Лайт говорит это с самого начала. 神 — «бог», 新世界 — «новый мир».',
    words: [
      { jp: '神', romaji: 'kami', ru: 'бог' },
      { jp: '新世界', romaji: 'shin sekai', ru: 'новый мир' }
    ]
  },
  {
    id: 'onepiece', title: 'Ван-Пис', jp: 'ワンピース', year: 1999, level: 'N5',
    genres: ['Сёнэн', 'Приключения'], kanji: '海', color1: '#3B82F6', color2: '#0C4A6E',
    phrase: { jp: '海賊王に俺はなる', ru: 'Я стану королём пиратов' },
    context: 'Клятва Луффи. 海賊 — «пират», 王 — «король».',
    words: [
      { jp: '海賊', romaji: 'kaizoku', ru: 'пират' },
      { jp: '王', romaji: 'ou', ru: 'король' }
    ]
  },
  {
    id: 'demonslayer', title: 'Клинок, рассекающий демонов', jp: '鬼滅の刃', year: 2019, level: 'N4',
    genres: ['Сёнэн', 'Фэнтези'], kanji: '鬼', color1: '#EF4444', color2: '#450A0A',
    phrase: { jp: '全集中の呼吸', ru: 'Дыхание полного сосредоточения' },
    context: 'Техника истребителей демонов. 呼吸 — «дыхание».',
    words: [
      { jp: '呼吸', romaji: 'kokyuu', ru: 'дыхание' },
      { jp: '集中', romaji: 'shuuchuu', ru: 'концентрация' }
    ]
  },
  {
    id: 'jjk', title: 'Магическая битва', jp: '呪術廻戦', year: 2020, level: 'N4',
    genres: ['Сёнэн', 'Мистика'], kanji: '呪', color1: '#8B5CF6', color2: '#2E1065',
    phrase: { jp: '領域展開', ru: 'Раскрытие территории' },
    context: 'Сильнейшая техника мага. 領域 — «территория».',
    words: [
      { jp: '領域', romaji: 'ryouiki', ru: 'территория, область' },
      { jp: '展開', romaji: 'tenkai', ru: 'развёртывание' }
    ]
  },
  {
    id: 'mha', title: 'Моя геройская академия', jp: '僕のヒーローアカデミア', year: 2016, level: 'N5',
    genres: ['Сёнэн', 'Школа'], kanji: '英', color1: '#10B981', color2: '#064E3B',
    phrase: { jp: 'プラス・ウルトラ', ru: 'Плюс ультра!' },
    context: 'Девиз героев. ウルトラ — «ультра», заимствование катаканой.',
    words: [
      { jp: '英雄', romaji: 'eiyuu', ru: 'герой' },
      { jp: '個性', romaji: 'kosei', ru: 'индивидуальность, суперсила' }
    ]
  },
  {
    id: 'tokyoghoul', title: 'Токийский гуль', jp: '東京喰種', year: 2014, level: 'N4',
    genres: ['Мистика', 'Драма'], kanji: '喰', color1: '#DC2626', color2: '#171717',
    phrase: { jp: 'この世界は間違っている', ru: 'Этот мир неправильный' },
    context: 'Ключевая мысль Канеки. 間違っている — «ошибается, неправильный».',
    words: [
      { jp: '世界', romaji: 'sekai', ru: 'мир' },
      { jp: '間違い', romaji: 'machigai', ru: 'ошибка' }
    ]
  },
  {
    id: 'sao', title: 'Мастера меча онлайн', jp: 'ソードアート・オンライン', year: 2012, level: 'N5',
    genres: ['Фэнтези', 'Романтика'], kanji: '剣', color1: '#38BDF8', color2: '#0F172A',
    phrase: { jp: '君を守る', ru: 'Я тебя защищу' },
    context: 'Кирито говорит это Асуне. 守る — «защищать».',
    words: [
      { jp: '守る', romaji: 'mamoru', ru: 'защищать' },
      { jp: '剣', romaji: 'ken', ru: 'меч' }
    ]
  },
  {
    id: 'rezero', title: 'Re:Zero', jp: 'リゼロ', year: 2016, level: 'N4',
    genres: ['Фэнтези', 'Драма'], kanji: '死', color1: '#A78BFA', color2: '#1E1B4B',
    phrase: { jp: '死に戻り', ru: 'Возвращение после смерти' },
    context: 'Способность Субару. 戻り (modori) — «возврат».',
    words: [
      { jp: '死', romaji: 'shi', ru: 'смерть' },
      { jp: '戻る', romaji: 'modoru', ru: 'возвращаться' }
    ]
  },
  {
    id: 'steinsgate', title: 'Врата Штейна', jp: 'シュタインズ・ゲート', year: 2011, level: 'N4',
    genres: ['Фантастика', 'Триллер'], kanji: '時', color1: '#64748B', color2: '#0F172A',
    phrase: { jp: '未来を変える', ru: 'Изменить будущее' },
    context: 'Главная цель Окабэ. 未来 — «будущее», 変える — «менять».',
    words: [
      { jp: '未来', romaji: 'mirai', ru: 'будущее' },
      { jp: '変える', romaji: 'kaeru', ru: 'менять' }
    ]
  },
  {
    id: 'fma', title: 'Стальной алхимик', jp: '鋼の錬金術師', year: 2009, level: 'N4',
    genres: ['Сёнэн', 'Фэнтези'], kanji: '鋼', color1: '#F59E0B', color2: '#451A03',
    phrase: { jp: '等価交換', ru: 'Равноценный обмен' },
    context: 'Главный закон алхимии. 交換 — «обмен».',
    words: [
      { jp: '等価', romaji: 'touka', ru: 'равная ценность' },
      { jp: '交換', romaji: 'koukan', ru: 'обмен' }
    ]
  },
  {
    id: 'eva', title: 'Евангелион', jp: 'エヴァンゲリオン', year: 1995, level: 'N4',
    genres: ['Меха', 'Драма'], kanji: '逃', color1: '#A855F7', color2: '#1E1B4B',
    phrase: { jp: '逃げちゃダメだ', ru: 'Нельзя убегать' },
    context: 'Синдзи говорит это себе. 逃げちゃ — разговорная форма от 逃げては.',
    words: [
      { jp: '逃げる', romaji: 'nigeru', ru: 'убегать' },
      { jp: 'ダメ', romaji: 'dame', ru: 'нельзя, плохо' }
    ]
  },
  {
    id: 'bebop', title: 'Ковбой Бибоп', jp: 'カウボーイビバップ', year: 1998, level: 'N3',
    genres: ['Фантастика', 'Драма'], kanji: '星', color1: '#F97316', color2: '#111827',
    phrase: { jp: '自由に生きる', ru: 'Жить свободно' },
    context: 'Философия Спайка. 自由 — «свобода», 生きる — «жить».',
    words: [
      { jp: '自由', romaji: 'jiyuu', ru: 'свобода' },
      { jp: '生きる', romaji: 'ikiru', ru: 'жить' }
    ]
  },
  {
    id: 'yourname', title: 'Твоё имя', jp: '君の名は。', year: 2016, level: 'N5',
    genres: ['Романтика', 'Фэнтези'], kanji: '名', color1: '#F472B6', color2: '#4C1D95',
    phrase: { jp: '君の名前は？', ru: 'Как тебя зовут?' },
    context: 'Название фильма — 君の名は. 名前 — «имя».',
    words: [
      { jp: '名前', romaji: 'namae', ru: 'имя' },
      { jp: '君', romaji: 'kimi', ru: 'ты (мягко, к близкому)' }
    ]
  },
  {
    id: 'spirited', title: 'Унесённые призраками', jp: '千と千尋の神隠し', year: 2001, level: 'N5',
    genres: ['Фэнтези', 'Драма'], kanji: '名', color1: '#22D3EE', color2: '#134E4A',
    phrase: { jp: '名前を忘れないで', ru: 'Не забудь своё имя' },
    context: 'Юбаба забирает имена.忘れないで — «не забывай».',
    words: [
      { jp: '忘れる', romaji: 'wasureru', ru: 'забывать' },
      { jp: '神隠し', romaji: 'kamikakushi', ru: 'похищение духами' }
    ]
  },
  {
    id: 'mononoke', title: 'Принцесса Мононоке', jp: 'もののけ姫', year: 1997, level: 'N4',
    genres: ['Фэнтези', 'Драма'], kanji: '生', color1: '#4ADE80', color2: '#14532D',
    phrase: { jp: '生きろ', ru: 'Живи' },
    context: 'Последняя фраза Аситаки. Короткая форма повелительного наклонения.',
    words: [
      { jp: '生きる', romaji: 'ikiru', ru: 'жить' },
      { jp: '姫', romaji: 'hime', ru: 'принцесса' }
    ]
  },
  {
    id: 'silentvoice', title: 'Форма голоса', jp: '聲の形', year: 2016, level: 'N4',
    genres: ['Драма', 'Школа'], kanji: '声', color1: '#60A5FA', color2: '#1E3A8A',
    phrase: { jp: '友達になりたい', ru: 'Хочу стать другом' },
    context: 'Сёя пытается исправить прошлое. 友達になる — «стать другом».',
    words: [
      { jp: '友達', romaji: 'tomodachi', ru: 'друг' },
      { jp: '声', romaji: 'koe', ru: 'голос' }
    ]
  },
  {
    id: 'violet', title: 'Вайолет Эвергарден', jp: 'ヴァイオレット・エヴァーガーデン', year: 2018, level: 'N4',
    genres: ['Драма', 'Фэнтези'], kanji: '愛', color1: '#C084FC', color2: '#312E81',
    phrase: { jp: '愛してる', ru: 'Я тебя люблю' },
    context: 'Вайолет учится понимать слово «любовь». 愛 — «любовь».',
    words: [
      { jp: '愛', romaji: 'ai', ru: 'любовь' },
      { jp: '手紙', romaji: 'tegami', ru: 'письмо' }
    ]
  },
  {
    id: 'fruitsbasket', title: 'Корзинка фруктов', jp: 'フルーツバスケット', year: 2019, level: 'N5',
    genres: ['Романтика', 'Драма'], kanji: '優', color1: '#FB923C', color2: '#7C2D12',
    phrase: { jp: '大丈夫だよ', ru: 'Всё хорошо' },
    context: 'Тору успокаивает других. 大丈夫 — «всё в порядке».',
    words: [
      { jp: '大丈夫', romaji: 'daijoubu', ru: 'всё в порядке' },
      { jp: '優しい', romaji: 'yasashii', ru: 'добрый' }
    ]
  },
  {
    id: 'spyfamily', title: 'Семья шпиона', jp: 'スパイファミリー', year: 2022, level: 'N5',
    genres: ['Комедия', 'Сёнэн'], kanji: '諜', color1: '#F43F5E', color2: '#4C0519',
    phrase: { jp: '任務完了', ru: 'Задание выполнено' },
    context: 'Луффи-шпион отчитывается. 任務 — «задание, миссия».',
    words: [
      { jp: '任務', romaji: 'ninmu', ru: 'задание' },
      { jp: '完了', romaji: 'kanryou', ru: 'выполнено' }
    ]
  },
  {
    id: 'chainsaw', title: 'Человек-бензопила', jp: 'チェンソーマン', year: 2022, level: 'N4',
    genres: ['Сёнэн', 'Мистика'], kanji: '悪', color1: '#F87171', color2: '#450A0A',
    phrase: { jp: '悪魔を狩る', ru: 'Охотиться на демонов' },
    context: 'Работа Дэнджи. 悪魔 — «демон», 狩る — «охотиться».',
    words: [
      { jp: '悪魔', romaji: 'akuma', ru: 'демон' },
      { jp: '狩る', romaji: 'karu', ru: 'охотиться' }
    ]
  },
  {
    id: 'bocchi', title: 'Одинокий рокер', jp: 'ぼっち・ざ・ろっく！', year: 2022, level: 'N5',
    genres: ['Комедия', 'Школа'], kanji: '音', color1: '#FBBF24', color2: '#78350F',
    phrase: { jp: 'バンドやろう', ru: 'Давай соберём группу' },
    context: 'Предложение играть вместе. バンド — «группа», заимствование.',
    words: [
      { jp: '音楽', romaji: 'ongaku', ru: 'музыка' },
      { jp: '一緒に', romaji: 'issho ni', ru: 'вместе' }
    ]
  },
  {
    id: 'frieren', title: 'Провожающая в последний путь Фрирен', jp: '葬送のフリーレン', year: 2023, level: 'N3',
    genres: ['Фэнтези', 'Драма'], kanji: '旅', color1: '#67E8F9', color2: '#164E63',
    phrase: { jp: 'また会おう', ru: 'Ещё увидимся' },
    context: 'Фрирен говорит это после долгого пути. また — «снова».',
    words: [
      { jp: '旅', romaji: 'tabi', ru: 'путешествие' },
      { jp: 'また', romaji: 'mata', ru: 'снова' }
    ]
  }
];

/* ---------- Постеры ---------- */

/**
 * Локальные постеры лежат в assets/images/posters/<id>.jpg.
 * Свои файлы выбраны специально: официальные японские CDN у части
 * провайдеров в РФ не открываются, а с GitHub Pages картинка
 * прогружается при любом IP и без внешних запросов.
 * Ссылка на файл отдаётся один раз — дальше работают кеш браузера
 * и loading="lazy", поэтому 24 карточки не тянут всё сразу.
 */
// Тайтлы, у которых есть файл постера. Остальные рисуются
// градиентом с кандзи — как и раньше, только без двух пустых запросов.
const ANIME_POSTER_IDS = new Set([
  'aot', 'bebop', 'bocchi', 'deathnote', 'demonslayer', 'eva', 'fma',
  'frieren', 'fruitsbasket', 'jjk', 'mha', 'mononoke', 'naruto', 'onepiece',
  'rezero', 'sao', 'silentvoice', 'spirited', 'spyfamily', 'steinsgate',
  'tokyoghoul', 'violet', 'yourname'
]);

/** Есть ли у тайтла файл постера. */
function animeHasPoster(anime) {
  return Boolean(anime && ANIME_POSTER_IDS.has(anime.id));
}

function animePosterPath(anime) {
  // В каталоге — облегчённая копия 320×480 в WebP: втрое легче JPEG
  // и рисуется быстрее, а на карточке всё равно видно только превью.
  if (!animeHasPoster(anime)) return '';

  return 'assets/images/posters/web/' + anime.id + '.webp';
}

/**
 * Постер не нашёлся. Порядок: WebP → JPEG-превью → полный оригинал →
 * градиентная заглушка. Так каталог не остаётся с дырками в старых
 * браузерах, которые не знают WebP.
 * @param {HTMLImageElement} img
 */
function animePosterFallback(img) {
  if (!img) return;

  const id = img.dataset.id || '';
  const step = Number(img.dataset.step || 0);

  // Шаг 0: битый WebP → JPEG-превью
  if (step === 0) {
    img.dataset.step = '1';
    img.src = 'assets/images/posters/web/' + id + '.jpg';
    return;
  }

  // Шаг 1: нет превью → полный оригинал
  if (step === 1) {
    img.dataset.step = '2';
    img.src = 'assets/images/posters/' + id + '.jpg';
    return;
  }

  // Шаг 2: нет и оригинала → градиент с кандзи

  const poster = img.closest('.anime-poster');
  if (poster) poster.classList.add('is-empty');
  img.remove();
}

/* ---------- Ромадзи фраз ---------- */

// Кандзи нельзя автоматически перевести в ромадзи, поэтому чтения заданы вручную
const ANIME_ROMAJI = {
  '俺は火影になる': 'Ore wa hokage ni naru',
  '心臓を捧げよ': 'Shinzou o sasageyo',
  '僕は新世界の神になる': 'Boku wa shin sekai no kami ni naru',
  '海賊王に俺はなる': 'Kaizoku ou ni ore wa naru',
  '全集中の呼吸': 'Zen shuuchuu no kokyuu',
  '領域展開': 'Ryouiki tenkai',
  'プラス・ウルトラ': 'Purasu urutora',
  'この世界は間違っている': 'Kono sekai wa machigatte iru',
  '君を守る': 'Kimi o mamoru',
  '死に戻り': 'Shini modori',
  '未来を変える': 'Mirai o kaeru',
  '等価交換': 'Touka koukan',
  '逃げちゃダメだ': 'Nigecha dame da',
  '自由に生きる': 'Jiyuu ni ikiru',
  '君の名前は？': 'Kimi no namae wa?',
  '名前を忘れないで': 'Namae o wasurenaide',
  '生きろ': 'Ikiro',
  '友達になりたい': 'Tomodachi ni naritai',
  '愛してる': 'Aishiteru',
  '大丈夫だよ': 'Daijoubu da yo',
  '任務完了': 'Ninmu kanryou',
  '悪魔を狩る': 'Akuma o karu',
  'バンドやろう': 'Bando yarou',
  'また会おう': 'Mata aou'
};

/** Ромадзи фразы: ручное чтение или автоматическая транскрипция каны. */
function animePhraseRomaji(anime) {
  if (!anime) return '';
  return ANIME_ROMAJI[anime.phrase.jp] || toRomaji(anime.phrase.jp);
}

/* ---------- Состояние ---------- */

let animeGenre = 'all';
let animeLevel = 'all';
let animeQuery = '';

/** Все жанры каталога. */
function getAnimeGenres() {
  const set = new Set();
  ANIME_CATALOG.forEach(anime => anime.genres.forEach(genre => set.add(genre)));
  return Array.from(set).sort();
}

/** Фильтр по жанру. */
function filterAnimeGenre(genre, button) {
  animeGenre = genre;
  document.querySelectorAll('.anime-genres .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');
  renderAnimeCatalog();
}

/** Фильтр по уровню. */
function filterAnimeLevel(level, button) {
  animeLevel = level;
  document.querySelectorAll('.anime-levels .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');
  renderAnimeCatalog();
}

/** Поиск по названию и фразе. */
function onAnimeSearch(value) {
  animeQuery = String(value || '').trim().toLowerCase();

  // Не перерисовываем сетку на каждую букву
  clearTimeout(animeSearchTimer);
  animeSearchTimer = setTimeout(renderAnimeCatalog, 140);
}

// Таймер дебаунса поиска
let animeSearchTimer = 0;

/* ---------- Отрисовка ---------- */

/** Рисует сетку карточек. */
function renderAnimeCatalog() {
  const grid = document.getElementById('animeGrid');
  if (!grid) return;

  renderAnimeGenres();

  const list = ANIME_CATALOG.filter(anime => {
    const genreOk = animeGenre === 'all' || anime.genres.includes(animeGenre);
    const levelOk = animeLevel === 'all' || anime.level === animeLevel;

    const haystack = (anime.title + ' ' + anime.jp + ' ' + anime.phrase.jp + ' ' + anime.phrase.ru).toLowerCase();
    const queryOk = !animeQuery || haystack.includes(animeQuery);

    return genreOk && levelOk && queryOk;
  });

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">Ничего не нашли. Попробуй другой жанр или уровень.</div>';
  } else {
    // Собираем одну строку: браузер делает один пересчёт вместо 24
    grid.innerHTML = list.map(anime => `
      <article class="anime-card" data-id="${anime.id}"
               style="--poster-1:${anime.color1};--poster-2:${anime.color2}">
        <div class="anime-poster${animeHasPoster(anime) ? '' : ' is-empty'}">
          ${animeHasPoster(anime) ? `<img class="anime-img" src="${animePosterPath(anime)}" alt="${anime.title} — постер"
               data-id="${anime.id}" loading="lazy" decoding="async" fetchpriority="low"
               width="440" height="660"
               onerror="animePosterFallback(this)">` : ''}
          <span class="anime-poster-jp">${anime.jp}</span>
          <span class="anime-kanji">${anime.kanji}</span>
          <span class="anime-year">${anime.year}</span>
          <span class="anime-badge">${anime.level}</span>
        </div>
        <div class="anime-body">
          <h3 class="anime-title">${anime.title}</h3>
          <div class="anime-jp">${anime.jp}</div>
          <div class="anime-genres">${anime.genres.join(' · ')}</div>
          <div class="anime-phrase">
            <b class="anime-phrase-jp" data-ja>${anime.phrase.jp}</b>
            <span class="anime-phrase-romaji">${animePhraseRomaji(anime)}</span>
            <span class="anime-phrase-ru">${anime.phrase.ru}</span>
          </div>
        </div>
        ${typeof favoriteButtonMarkup === 'function'
          ? favoriteButtonMarkup('anime', anime.id, anime.title, 'anime.html?title=' + anime.id)
          : ''}
      </article>
    `).join('');
  }

  const counter = document.getElementById('animeCounter');
  if (counter) counter.textContent = list.length + ' из ' + ANIME_CATALOG.length + ' тайтлов';

  decorateRomaji(grid);

  // Сообщаем декору, что карточки новые — можно навесить наклон
  document.dispatchEvent(new CustomEvent('anime-grid-rendered'));
}

/** Один обработчик на всю сетку вместо 24 своих. */
function initAnimeGridDelegation() {
  const grid = document.getElementById('animeGrid');
  if (!grid || grid.dataset.delegated) return;

  grid.dataset.delegated = '1';

  grid.addEventListener('click', event => {
    const card = event.target.closest('.anime-card');
    if (!card) return;

    // Кнопка избранного обрабатывает клик сама
    if (event.target.closest('.favorite-btn, .fav-btn, button[data-favorite]')) return;

    openAnimeCard(card.dataset.id);
  });
}

/** Рисует жанры один раз. */
function renderAnimeGenres() {
  const box = document.getElementById('animeGenres');
  if (!box || box.dataset.ready === 'true') return;

  box.innerHTML = `<button class="chip chip-active" onclick="filterAnimeGenre('all', this)">Все жанры</button>`;

  getAnimeGenres().forEach(genre => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = genre;
    chip.addEventListener('click', () => filterAnimeGenre(genre, chip));
    box.appendChild(chip);
  });

  box.dataset.ready = 'true';
}

/* ---------- Карточка тайтла ---------- */

/** Открывает модалку с разбором фразы. */
function openAnimeCard(id) {
  const anime = ANIME_CATALOG.find(item => item.id === id);
  const modal = document.getElementById('animeModal');
  const body = document.getElementById('animeModalBody');
  if (!anime || !modal || !body) return;

  body.innerHTML = `
    <div class="anime-modal-head" style="--poster-1:${anime.color1};--poster-2:${anime.color2}">
      ${animeHasPoster(anime) ? `<img class="anime-modal-poster" src="${animePosterPath(anime)}"
           alt="${anime.title} — постер" onerror="this.remove();">` : ''}
      <span class="anime-modal-kanji">${anime.kanji}</span>
      <div>
        <h2>${anime.title}</h2>
        <p>${anime.jp} · ${anime.year} · ${anime.level}</p>
      </div>
    </div>

    <div class="anime-modal-phrase">
      <b data-ja>${anime.phrase.jp}</b>
      <span class="anime-modal-romaji">${animePhraseRomaji(anime)}</span>
      <span class="anime-modal-ru">«${anime.phrase.ru}»</span>
      <button class="btn btn-outline btn-small" onclick="speakJapanese('${anime.phrase.jp}')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10v4h3l4 3.5v-11L7 10H4Z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5"/>
          <path d="M17.5 7a7 7 0 0 1 0 10"/>
        </svg>
        Прослушать
      </button>
    </div>

    <p class="anime-modal-context">${anime.context}</p>

    <h4 class="anime-modal-sub">Слова из фразы</h4>
    <div class="anime-words">
      ${anime.words.map(word => `
        <div class="anime-word">
          <div>
            <b>${word.jp}</b>
            <span>${word.romaji}</span>
          </div>
          <span>${word.ru}</span>
          <button class="speak-btn" type="button" onclick="speakJapanese('${word.jp}')">🔊</button>
        </div>
      `).join('')}
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" style="flex:1" onclick="shareAnimePhrase('${anime.id}')">Поделиться фразой · +15 XP</button>
      <a class="btn btn-outline" href="lessons.html">К урокам</a>
    </div>
  `;

  modal.classList.add('open');
  document.body.classList.add('modal-open');
  decorateRomaji(body);
}

/** Закрывает модалку. */
function closeAnimeCard() {
  const modal = document.getElementById('animeModal');
  if (modal) modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

/** Копирует фразу в буфер и начисляет XP за первый шаринг. */
async function shareAnimePhrase(id) {
  const anime = ANIME_CATALOG.find(item => item.id === id);
  if (!anime) return;

  const text = anime.phrase.jp + ' — ' + anime.phrase.ru + ' (из «' + anime.title + '»)';

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch (error) {
    // В приватном режиме буфер может быть запрещён — просто показываем текст
  }

  // XP за шаринг — только в первый раз для каждого тайтла
  const shared = readJSON('nihongo_anime_shared', []);
  const list = Array.isArray(shared) ? shared : [];

  if (!list.includes(id)) {
    list.push(id);
    writeJSON('nihongo_anime_shared', list);

    if (typeof notifyAction === 'function') {
      notifyAction('share', 1, { reason: 'Фраза из аниме' });
    }
  }

  if (typeof showToast === 'function') {
    showToast('Фраза скопирована', text, 'success');
  }
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('animeGrid')) return;

  initAnimeGridDelegation();
  renderAnimeCatalog();

  // Переход из общего поиска: anime.html?title=id
  const params = new URLSearchParams(window.location.search);
  const wanted = params.get('title');
  if (wanted && ANIME_CATALOG.some(item => item.id === wanted)) openAnimeCard(wanted);

  const modal = document.getElementById('animeModal');
  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeAnimeCard();
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAnimeCard();
  });
});

/* Экспорт в глобальную область */
window.ANIME_CATALOG = ANIME_CATALOG;
window.ANIME_ROMAJI = ANIME_ROMAJI;
window.animePhraseRomaji = animePhraseRomaji;
window.renderAnimeCatalog = renderAnimeCatalog;
window.animePosterPath = animePosterPath;
window.animePosterFallback = animePosterFallback;
window.filterAnimeGenre = filterAnimeGenre;
window.filterAnimeLevel = filterAnimeLevel;
window.onAnimeSearch = onAnimeSearch;
window.openAnimeCard = openAnimeCard;
window.closeAnimeCard = closeAnimeCard;
window.shareAnimePhrase = shareAnimePhrase;
