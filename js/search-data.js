/* ============================================================
   search-data.js — данные для подсказок поиска
   Один массив на весь сайт: уроки, ряды каны, слова, аниме и
   грамматика. Каждая запись знает, куда ведёт клик, и набор
   ключевых слов (keys) для поиска по-русски, ромадзи и каной.
   Используется функцией searchSuggestions() из js/suggest.js.
   ============================================================ */

'use strict';

const SEARCH_SUGGESTIONS = [
  /* ---------- Уроки ---------- */
  { title: 'Хирагана', subtitle: 'урок 1 · N5', type: 'Урок', url: 'lesson.html?id=1', keys: 'хирагана hiragana ひらがな азбука' },
  { title: 'Катакана', subtitle: 'урок 2 · N5', type: 'Урок', url: 'lesson.html?id=2', keys: 'катакана katakana カタカナ азбука' },
  { title: 'Приветствия', subtitle: 'урок 3 · N5', type: 'Урок', url: 'lesson.html?id=3', keys: 'приветствия айсацу 挨拶 konnichiwa здравствуйте' },
  { title: 'Фразы из аниме', subtitle: 'урок 4 · N4', type: 'Урок', url: 'lesson.html?id=4', keys: 'фразы аниме реплики omae wa' },
  { title: 'Частицы', subtitle: 'урок 5 · N5', type: 'Урок', url: 'lesson.html?id=5', keys: 'частицы は が を に で частица' },

  /* ---------- Ряды каны ---------- */
  { title: 'Хирагана: ряд А', subtitle: 'あ い う え お', type: 'Кана', url: 'lesson.html?id=1', keys: 'ряд а a i u e o あいうえお' },
  { title: 'Хирагана: ряд К', subtitle: 'か き く け こ', type: 'Кана', url: 'lesson.html?id=1', keys: 'ряд к ka ki ku ke ko かきくけこ' },
  { title: 'Хирагана: ряд С', subtitle: 'さ し す せ そ', type: 'Кана', url: 'lesson.html?id=1', keys: 'ряд с sa shi su se so さしすせそ' },
  { title: 'Хирагана: ряд Т', subtitle: 'た ち つ て と', type: 'Кана', url: 'lesson.html?id=1', keys: 'ряд т ta chi tsu te to たちつてと' },
  { title: 'Хирагана: ряд Н', subtitle: 'な に ぬ ね の', type: 'Кана', url: 'lesson.html?id=1', keys: 'ряд н na ni nu ne no なにぬねの' },
  { title: 'Катакана: ряд А', subtitle: 'ア イ ウ エ オ', type: 'Кана', url: 'lesson.html?id=2', keys: 'катакана ряд а アイウエオ' },
  { title: 'Катакана: ряд К', subtitle: 'カ キ ク ケ コ', type: 'Кана', url: 'lesson.html?id=2', keys: 'катакана ряд к カキクケコ' },

  /* ---------- Слова ---------- */
  { title: '時間 — время', subtitle: 'jikan · N5', type: 'Слово', url: 'dictionary.html?q=時間', keys: 'время jikan 時間' },
  { title: '今日 — сегодня', subtitle: 'kyou · N5', type: 'Слово', url: 'dictionary.html?q=今日', keys: 'сегодня kyou 今日' },
  { title: '明日 — завтра', subtitle: 'ashita · N5', type: 'Слово', url: 'dictionary.html?q=明日', keys: 'завтра ashita 明日' },
  { title: '昨日 — вчера', subtitle: 'kinou · N5', type: 'Слово', url: 'dictionary.html?q=昨日', keys: 'вчера kinou 昨日' },
  { title: '朝 — утро', subtitle: 'asa · N5', type: 'Слово', url: 'dictionary.html?q=朝', keys: 'утро asa 朝' },
  { title: '夜 — ночь', subtitle: 'yoru · N5', type: 'Слово', url: 'dictionary.html?q=夜', keys: 'ночь yoru 夜' },
  { title: '学校 — школа', subtitle: 'gakkou · N5', type: 'Слово', url: 'dictionary.html?q=学校', keys: 'школа gakkou 学校' },
  { title: '先生 — учитель', subtitle: 'sensei · N5', type: 'Слово', url: 'dictionary.html?q=先生', keys: 'учитель sensei 先生' },
  { title: '友達 — друг', subtitle: 'tomodachi · N5', type: 'Слово', url: 'dictionary.html?q=友達', keys: 'друг tomodachi 友達' },
  { title: '家族 — семья', subtitle: 'kazoku · N5', type: 'Слово', url: 'dictionary.html?q=家族', keys: 'семья kazoku 家族' },
  { title: '名前 — имя', subtitle: 'namae · N5', type: 'Слово', url: 'dictionary.html?q=名前', keys: 'имя namae 名前' },
  { title: '日本 — Япония', subtitle: 'nihon · N5', type: 'Слово', url: 'dictionary.html?q=日本', keys: 'япония nihon 日本' },
  { title: '日本語 — японский язык', subtitle: 'nihongo · N5', type: 'Слово', url: 'dictionary.html?q=日本語', keys: 'японский язык nihongo 日本語' },
  { title: '本 — книга', subtitle: 'hon · N5', type: 'Слово', url: 'dictionary.html?q=本', keys: 'книга hon 本' },
  { title: '映画 — фильм', subtitle: 'eiga · N5', type: 'Слово', url: 'dictionary.html?q=映画', keys: 'фильм кино eiga 映画' },
  { title: '音楽 — музыка', subtitle: 'ongaku · N5', type: 'Слово', url: 'dictionary.html?q=音楽', keys: 'музыка ongaku 音楽' },
  { title: '歌 — песня', subtitle: 'uta · N5', type: 'Слово', url: 'dictionary.html?q=歌', keys: 'песня uta 歌' },
  { title: '猫 — кошка', subtitle: 'neko · N5', type: 'Слово', url: 'dictionary.html?q=猫', keys: 'кошка кот neko 猫' },
  { title: '犬 — собака', subtitle: 'inu · N5', type: 'Слово', url: 'dictionary.html?q=犬', keys: 'собака пёс inu 犬' },
  { title: '桜 — сакура', subtitle: 'sakura · N5', type: 'Слово', url: 'dictionary.html?q=桜', keys: 'сакура sakura 桜' },
  { title: '空 — небо', subtitle: 'sora · N5', type: 'Слово', url: 'dictionary.html?q=空', keys: 'небо sora 空' },
  { title: '海 — море', subtitle: 'umi · N5', type: 'Слово', url: 'dictionary.html?q=海', keys: 'море umi 海' },
  { title: '山 — гора', subtitle: 'yama · N5', type: 'Слово', url: 'dictionary.html?q=山', keys: 'гора yama 山' },
  { title: '雨 — дождь', subtitle: 'ame · N5', type: 'Слово', url: 'dictionary.html?q=雨', keys: 'дождь ame 雨' },
  { title: '雪 — снег', subtitle: 'yuki · N5', type: 'Слово', url: 'dictionary.html?q=雪', keys: 'снег yuki 雪' },
  { title: '月 — луна', subtitle: 'tsuki · N5', type: 'Слово', url: 'dictionary.html?q=月', keys: 'луна месяц tsuki 月' },

  /* ---------- Аниме ---------- */
  { title: 'Наруто', subtitle: 'аниме · N5', type: 'Аниме', url: 'anime.html?title=naruto', keys: 'наруто naruto ナルト' },
  { title: 'Атака титанов', subtitle: 'аниме · N4', type: 'Аниме', url: 'anime.html?title=attack-on-titan', keys: 'атака титанов shingeki 進撃の巨人' },
  { title: 'Тетрадь смерти', subtitle: 'аниме · N4', type: 'Аниме', url: 'anime.html?title=death-note', keys: 'тетрадь смерти death note デスノート' },
  { title: 'Клинок, рассекающий демонов', subtitle: 'аниме · N4', type: 'Аниме', url: 'anime.html?title=demon-slayer', keys: 'клинок демонов kimetsu 鬼滅の刃' },
  { title: 'Магическая битва', subtitle: 'аниме · N3', type: 'Аниме', url: 'anime.html?title=jujutsu-kaisen', keys: 'магическая битва jujutsu 呪術廻戦' },
  { title: 'Моя геройская академия', subtitle: 'аниме · N4', type: 'Аниме', url: 'anime.html?title=my-hero-academia', keys: 'геройская академия boku no hero 僕のヒーローアカデミア' },
  { title: 'Врата Штейна', subtitle: 'аниме · N3', type: 'Аниме', url: 'anime.html?title=steins-gate', keys: 'врата штейна steins gate' },
  { title: 'Стальной алхимик', subtitle: 'аниме · N3', type: 'Аниме', url: 'anime.html?title=fullmetal-alchemist', keys: 'стальной алхимик hagane 鋼の錬金術師' },
  { title: 'Твоё имя', subtitle: 'аниме · N4', type: 'Аниме', url: 'anime.html?title=your-name', keys: 'твоё имя kimi no na wa 君の名は' },
  { title: 'Унесённые призраками', subtitle: 'аниме · N4', type: 'Аниме', url: 'anime.html?title=spirited-away', keys: 'унесённые призраками spirited away 千と千尋' },
  { title: 'Семья шпиона', subtitle: 'аниме · N4', type: 'Аниме', url: 'anime.html?title=spy-family', keys: 'семья шпиона spy family スパイファミリー' },
  { title: 'Человек-бензопила', subtitle: 'аниме · N3', type: 'Аниме', url: 'anime.html?title=chainsaw-man', keys: 'человек бензопила chainsaw man チェンソーマン' },

  /* ---------- Грамматика ---------- */
  { title: 'Частица は — тема', subtitle: 'грамматика · N5', type: 'Грамматика', url: 'grammar.html?rule=wa', keys: 'частица は тема wa' },
  { title: 'Частица が — подлежащее', subtitle: 'грамматика · N5', type: 'Грамматика', url: 'grammar.html?rule=ga', keys: 'частица が подлежащее ga' },
  { title: 'Частица を — прямой объект', subtitle: 'грамматика · N5', type: 'Грамматика', url: 'grammar.html?rule=wo', keys: 'частица を объект wo' },
  { title: 'Частица に — время и место', subtitle: 'грамматика · N5', type: 'Грамматика', url: 'grammar.html?rule=ni', keys: 'частица に место время ni' },
  { title: 'です / だ — «быть»', subtitle: 'грамматика · N5', type: 'Грамматика', url: 'grammar.html?rule=desu', keys: 'です だ быть связка desu' },
  { title: 'ます-форма глаголов', subtitle: 'грамматика · N5', type: 'Грамматика', url: 'grammar.html?rule=masu', keys: 'масу форма глагол masu' },
  { title: 'て-форма', subtitle: 'грамматика · N4', type: 'Грамматика', url: 'grammar.html?rule=te', keys: 'тэ форма te' },
  { title: 'Прошедшее время', subtitle: 'грамматика · N5', type: 'Грамматика', url: 'grammar.html?rule=past', keys: 'прошедшее время ました' },

  /* ---------- Страницы ---------- */
  { title: 'Флешкарты', subtitle: 'повторение слов', type: 'Страница', url: 'flashcards.html', keys: 'флешкарты карточки повторение flashcards' },
  { title: 'Словарь', subtitle: '140 слов', type: 'Страница', url: 'dictionary.html', keys: 'словарь слова перевод dictionary' },
  { title: 'Тесты', subtitle: 'проверка знаний', type: 'Страница', url: 'tests.html', keys: 'тесты проверка' },
  { title: 'Пробный JLPT', subtitle: '20 вопросов', type: 'Страница', url: 'exam.html', keys: 'jlpt экзамен пробный' },
  { title: 'Собери слово', subtitle: 'мини-игра', type: 'Страница', url: 'game.html', keys: 'игра собери слово слоги' },
  { title: 'Карта прогресса', subtitle: 'все уроки', type: 'Страница', url: 'lessons.html#progressMap', keys: 'карта прогресса уроки' }
];

// Экспорт в глобальную область
window.SEARCH_SUGGESTIONS = SEARCH_SUGGESTIONS;
