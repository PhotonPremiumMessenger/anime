/* ============================================================
   grammar.js — справочник грамматики
   16 правил с объяснением, структурой и примерами.
   Прочитанное правило даёт XP один раз (счётчик anilingo_grammar).
   ============================================================ */

'use strict';

/* ---------- Правила ---------- */

const GRAMMAR_RULES = [
  {
    id: 'wa',
    title: 'Частица は — тема',
    jp: 'は',
    level: 'N5',
    tag: 'Частицы',
    short: 'Помечает то, о чём идёт речь в предложении.',
    explanation: [
      'は читается «ва» и ставит слово перед собой в позицию темы: «что касается этого…».',
      'Тема не всегда подлежащее: «Я — студент» → 私は学生です, где は показывает, что речь обо мне.',
      'Если тема уже понятна из контекста, её опускают: 学生です — «(я) студент».'
    ],
    structure: 'A は B です — «A — это B»',
    examples: [
      { jp: '私は学生です。', ru: 'Я студент.' },
      { jp: 'これは何ですか。', ru: 'Что это?' },
      { jp: '田中さんは先生です。', ru: 'Господин Танака — учитель.' }
    ],
    tip: 'Частица は пишется знаком は, но всегда читается «ва».',
    mistake: 'Не путай は (тема) и が (подлежащее). は выделяет тему, が — того, кто действует.'
  },
  {
    id: 'ga',
    title: 'Частица が — подлежащее',
    jp: 'が',
    level: 'N5',
    tag: 'Частицы',
    short: 'Указывает на того, кто выполняет действие, или на новое важное.',
    explanation: [
      'が отвечает на вопрос «кто именно?» и часто вводит новую информацию.',
      'С глаголами существования あります / います используется が: 猫がいます — «есть кошка».',
      'С прилагательными ощущений тоже が: 水が冷たい — «вода холодная».'
    ],
    structure: 'A が + глагол/прилагательное',
    examples: [
      { jp: '猫がいます。', ru: 'Есть кошка.' },
      { jp: '誰が来ましたか。', ru: 'Кто пришёл?' },
      { jp: '私はアニメが好きです。', ru: 'Я люблю аниме.' }
    ],
    tip: 'В конструкции «нравится» (好き) объект симпатии ставится с が.',
    mistake: 'Не говори 私はアニメを好き — с 好き нужна が.'
  },
  {
    id: 'wo',
    title: 'Частица を — прямой объект',
    jp: 'を',
    level: 'N5',
    tag: 'Частицы',
    short: 'Показывает, на что направлено действие.',
    explanation: [
      'を ставится после объекта, с которым что-то делают: читать книгу, смотреть аниме, есть суши.',
      'Читается «о». С глаголами движения может означать место, через которое проходят: 公園を歩く.',
      'Если действие не переходит на объект (идти, спать), を не нужна.'
    ],
    structure: 'A を + переходный глагол',
    examples: [
      { jp: 'アニメを見ます。', ru: 'Смотрю аниме.' },
      { jp: '本を読みます。', ru: 'Читаю книгу.' },
      { jp: 'ご飯を食べました。', ru: 'Поел риса.' }
    ],
    tip: 'Порядок в японском: кто — что — где — делает. Глагол всегда в конце.',
    mistake: 'を читается «о», но пишется знаком を — не путай с お.'
  },
  {
    id: 'ni',
    title: 'Частица に — точка во времени и месте',
    jp: 'に',
    level: 'N5',
    tag: 'Частицы',
    short: 'Когда, куда и для кого происходит действие.',
    explanation: [
      'に ставится перед конкретным временем: 七時に — в семь часов, 月曜日に — в понедельник.',
      'С глаголами движения указывает пункт назначения: 学校に行きます — иду в школу.',
      'Также обозначает получателя: 友達にあげます — даю другу.'
    ],
    structure: 'время / место に + глагол',
    examples: [
      { jp: '七時に起きます。', ru: 'Встаю в семь часов.' },
      { jp: '日本に行きたいです。', ru: 'Хочу поехать в Японию.' },
      { jp: '友達にプレゼントをあげました。', ru: 'Подарил другу подарок.' }
    ],
    tip: 'С относительными словами вроде 今日 или 明日 частица に не нужна.',
    mistake: 'に — точка назначения, で — место, где уже происходит действие.'
  },
  {
    id: 'de',
    title: 'Частица で — место действия и инструмент',
    jp: 'で',
    level: 'N5',
    tag: 'Частицы',
    short: 'Где происходит действие или чем его делают.',
    explanation: [
      'で отвечает на вопрос «где?», когда действие реально происходит: 学校で勉強します.',
      'А также «чем?»: 電車で行きます — ехать на поезде, ペンで書きます — писать ручкой.',
      'С глаголами движения で — средство передвижения, а に — направление.'
    ],
    structure: 'место / средство で + глагол',
    examples: [
      { jp: '図書館で勉強します。', ru: 'Занимаюсь в библиотеке.' },
      { jp: '電車で行きます。', ru: 'Поеду на поезде.' },
      { jp: '日本語で話してください。', ru: 'Говорите, пожалуйста, по-японски.' }
    ],
    tip: 'で ещё означает причину: 風邪で休みました — не пришёл из-за простуды.',
    mistake: 'Не ставь に вместо で, если действие происходит внутри места: 教室で歌う, а не に.'
  },
  {
    id: 'mo',
    title: 'Частица も — «тоже»',
    jp: 'も',
    level: 'N5',
    tag: 'Частицы',
    short: 'Заменяет は или が, когда добавляешь «тоже» и «также».',
    explanation: [
      'も ставится вместо は/が: 私も学生です — «я тоже студент».',
      'В отрицании может значить «ни…»: 何もありません — ничего нет.',
      'Можно удваивать в перечислении: 犬も猫も好き — люблю и собак, и кошек.'
    ],
    structure: 'A も + B — «A тоже B»',
    examples: [
      { jp: '私も行きます。', ru: 'Я тоже пойду.' },
      { jp: 'これも安いです。', ru: 'И это тоже дешёвое.' },
      { jp: '犬も猫も好きです。', ru: 'Люблю и собак, и кошек.' }
    ],
    tip: 'も не сочетается с は и が в одной позиции — они не уживаются.',
    mistake: '私もは学生 — ошибка. Либо は, либо も.'
  },
  {
    id: 'to',
    title: 'Частица と — «и» и «с кем»',
    jp: 'と',
    level: 'N5',
    tag: 'Частицы',
    short: 'Соединяет только существительные и показывает партнёра.',
    explanation: [
      'と связывает существительные: パンと牛乳 — хлеб и молоко.',
      'С глаголами общения и действий означает «вместе с»: 友達と話します — разговариваю с другом.',
      'В цитатах と оформляет прямую речь: 「行く」と言いました.'
    ],
    structure: 'A と B — «A и B» / «с B»',
    examples: [
      { jp: 'パンと牛乳を買いました。', ru: 'Купил хлеб и молоко.' },
      { jp: '友達と映画を見ました。', ru: 'Смотрел фильм с другом.' },
      { jp: '「頑張れ」と言いました。', ru: 'Сказал: «Держись».' }
    ],
    tip: 'Для «или» в вопросах используется か, а не と.',
    mistake: 'と не соединяет глаголы. Для «делаю и то, и это» нужна て-форма.'
  },
  {
    id: 'no',
    title: 'Частица の — принадлежность',
    jp: 'の',
    level: 'N5',
    tag: 'Частицы',
    short: '«Чей-то», «из», «о» — связывает два существительных.',
    explanation: [
      'の ставит второе слово в зависимость от первого: 私の本 — моя книга.',
      'Работает как «из»: 日本のアニメ — аниме из Японии.',
      'Может объяснять: 日本語の先生 — учитель японского.'
    ],
    structure: 'A の B — «B, принадлежащий A»',
    examples: [
      { jp: 'これは私の本です。', ru: 'Это моя книга.' },
      { jp: '日本のアニメが好きです。', ru: 'Люблю японское аниме.' },
      { jp: '日本語の先生です。', ru: 'Учитель японского.' }
    ],
    tip: 'Порядок как в русском «мамина сумка»: 母のかばん.',
    mistake: 'Не путай の-принадлежность с の из んです (объяснение).'
  },
  {
    id: 'desu',
    title: 'です / だ — «быть»',
    jp: 'です',
    level: 'N5',
    tag: 'Основы',
    short: 'Вежливая связка «является» в конце предложения.',
    explanation: [
      'です делает предложение вежливым: 学生です — «(я) студент».',
      'В прошедшем времени: でした; в отрицании: ではありません.',
      'В разговорной речи используют だ и じゃない, но с незнакомыми лучше です.'
    ],
    structure: 'существительное / な-прилагательное + です',
    examples: [
      { jp: '私は学生です。', ru: 'Я студент.' },
      { jp: 'これは本ではありません。', ru: 'Это не книга.' },
      { jp: '昨日は休みでした。', ru: 'Вчера был выходной.' }
    ],
    tip: 'С い-прилагательным です ставится без изменений: 高いです.',
    mistake: 'Не путай です (вежливо) и でございます (очень формально) — в аниме второе редкость.'
  },
  {
    id: 'masu',
    title: 'ます-форма глаголов',
    jp: 'ます',
    level: 'N5',
    tag: 'Глаголы',
    short: 'Вежливое настоящее и будущее время глагола.',
    explanation: [
      'Вежливая форма: 食べます — ем / буду есть, 行きます — иду / пойду.',
      'Отрицание: 食べません. Прошедшее: 食べました. Прошедшее отрицание: 食べませんでした.',
      'Словарная форма (食べる, 行く) — для друзей и внутри предложений.'
    ],
    structure: 'основа глагола + ます / ません / ました',
    examples: [
      { jp: '毎日日本語を勉強します。', ru: 'Каждый день занимаюсь японским.' },
      { jp: '今日は行きません。', ru: 'Сегодня не пойду.' },
      { jp: '昨日アニメを見ました。', ru: 'Вчера смотрел аниме.' }
    ],
    tip: 'В аниме герои часто говорят в словарной форме — это не грубость, а стиль.',
    mistake: 'Не смешивай です и ます: 学生ます — ошибка, 学生です — верно.'
  },
  {
    id: 'te-form',
    title: 'て-форма',
    jp: 'て',
    level: 'N4',
    tag: 'Глаголы',
    short: 'Просьбы, последовательность действий и «сейчас делаю».',
    explanation: [
      'て-форма соединяет действия: 起きて、食べて、行きます — встаю, ем, иду.',
      'Просьба: 待ってください — подождите, пожалуйста.',
      '〜ています — действие длится сейчас: アニメを見ています — смотрю аниме.'
    ],
    structure: 'глагол в て-форме + ください / います',
    examples: [
      { jp: 'ちょっと待ってください。', ru: 'Подождите немного.' },
      { jp: '今、本を読んでいます。', ru: 'Сейчас читаю книгу.' },
      { jp: '窓を開けて、写真を撮りました。', ru: 'Открыл окно и сделал фото.' }
    ],
    tip: 'Правило зависит от группы глагола: 書く→書いて, 食べる→食べて, する→して.',
    mistake: 'Не путай て-форму (последовательность) с た-формой (прошедшее).'
  },
  {
    id: 'past',
    title: 'Прошедшее время',
    jp: 'ました / た',
    level: 'N5',
    tag: 'Глаголы',
    short: 'Как сказать «сделал»: ました вежливо, た-форма по-простому.',
    explanation: [
      'Вежливо: 行きました — ходил, 見ました — смотрел.',
      'Просто: 行った, 見た. Отрицание: 行きませんでした / 行かなかった.',
      'У い-прилагательных прошедшее — かった: 楽しかった — было весело.'
    ],
    structure: 'глагол + ました / た; い-прил. + かった',
    examples: [
      { jp: '昨日、映画を見ました。', ru: 'Вчера смотрел фильм.' },
      { jp: 'とても楽しかったです。', ru: 'Было очень весело.' },
      { jp: '宿題をしませんでした。', ru: 'Не сделал домашку.' }
    ],
    tip: 'Время в японском часто ясно из контекста — тогда глагол может стоять в настоящем.',
    mistake: 'Не добавляй でした к глаголу: 行きましたでした — ошибка.'
  },
  {
    id: 'questions',
    title: 'Вопросы: か и слова-вопросы',
    jp: 'か',
    level: 'N5',
    tag: 'Основы',
    short: 'Вопрос строится добавлением か в конец предложения.',
    explanation: [
      'か в конце превращает утверждение в вопрос: 学生ですか — вы студент?',
      'Слова-вопросы стоят на месте ответа: 何 (что), 誰 (кто), どこ (где), いつ (когда).',
      'В разговорной речи か часто опускают, а вопрос делают интонацией.'
    ],
    structure: 'предложение + か (?)',
    examples: [
      { jp: '元気ですか。', ru: 'Как дела?' },
      { jp: 'これは何ですか。', ru: 'Что это?' },
      { jp: 'どこに住んでいますか。', ru: 'Где живёшь?' }
    ],
    tip: 'Порядок слов в вопросе не меняется — только добавляется か.',
    mistake: 'Внутри придаточных か не ставится как знак вопроса: 何か食べますか — здесь か это «что-то».'
  },
  {
    id: 'adjectives',
    title: 'い- и な-прилагательные',
    jp: '形容詞',
    level: 'N5',
    tag: 'Основы',
    short: 'Два типа прилагательных — разные правила изменения.',
    explanation: [
      'い-прилагательные заканчиваются на い: 高い, かわいい. Отрицание: 高くない.',
      'な-прилагательные требуют な перед существительным: 静かな部屋. Отрицание: 静かじゃない.',
      'Перед です な-прилагательное идёт без な: 静かです.'
    ],
    structure: 'い-прил. + сущ. / な-прил. + な + сущ.',
    examples: [
      { jp: 'かわいい猫ですね。', ru: 'Милая кошка, правда?' },
      { jp: '静かな場所が好きです。', ru: 'Люблю тихие места.' },
      { jp: 'この本は高くないです。', ru: 'Эта книга недорогая.' }
    ],
    tip: 'Хорошо / плохо — исключения: いい → よくない.',
    mistake: 'Не ставь な после い-прилагательного: 高いな部屋 — неверно.'
  },
  {
    id: 'counters',
    title: 'Счётные суффиксы',
    jp: '助数詞',
    level: 'N5',
    tag: 'Основы',
    short: 'Число + специальное слово для типа предмета.',
    explanation: [
      'Люди — 人 (にん): 三人. Предметы — つ: 三つ. Длинные вещи — 本 (ほん): 三本.',
      'Животные — 匹 (ひき), машины — 台 (だい), этажи — 階 (かい).',
      'Первые десять предметов часто считают универсальным счётом ひとつ, ふたつ, みっつ…'
    ],
    structure: 'число + счётный суффикс',
    examples: [
      { jp: '友達が三人います。', ru: 'У меня три друга.' },
      { jp: 'ビールを二本ください。', ru: 'Две бутылки пива, пожалуйста.' },
      { jp: '猫が二匹います。', ru: 'Есть две кошки.' }
    ],
    tip: 'Произношение чисел меняется: 一人 — ひとり, 二人 — ふたり.',
    mistake: 'Не считай людей через つ, если хочешь звучать естественно.'
  },
  {
    id: 'kara-made',
    title: 'から / まで — «от» и «до»',
    jp: 'から・まで',
    level: 'N5',
    tag: 'Частицы',
    short: 'Границы времени и места.',
    explanation: [
      'から — «с, от», まで — «до»: 九時から五時まで — с девяти до пяти.',
      'Могут работать и с местами: 駅から家まで — от станции до дома.',
      'から также означает причину: 寒いから、コートを着ます.'
    ],
    structure: 'A から B まで — «от A до B»',
    examples: [
      { jp: '九時から五時まで働きます。', ru: 'Работаю с девяти до пяти.' },
      { jp: '駅から歩いて五分です。', ru: 'Пять минут пешком от станции.' },
      { jp: '好きだから、毎日見ます。', ru: 'Потому что нравится — смотрю каждый день.' }
    ],
    tip: 'から в значении «потому что» звучит мягче, чем ので, но в аниме очень часто.',
    mistake: 'Порядок фиксирован: сначала から, потом まで.'
  },
  {
    id: 'yori-hodo',
    title: 'より / ほど — сравнение',
    jp: 'より・ほど',
    level: 'N4',
    tag: 'Сравнение',
    short: '«Более, чем» и «настолько, насколько».',
    explanation: [
      'A は B より + прилагательное — A более …, чем B.',
      'A は B ほど + отрицание — A не настолько …, как B.',
      'Самый — 一番: 一番好き — любимый.'
    ],
    structure: 'A は B より … / A は B ほど …ない',
    examples: [
      { jp: 'アニメはドラマより面白いです。', ru: 'Аниме интереснее драм.' },
      { jp: '東京は大阪ほど暑くないです。', ru: 'В Токио не так жарко, как в Осаке.' },
      { jp: 'これが一番好きです。', ru: 'Это люблю больше всего.' }
    ],
    tip: 'ほど всегда требует отрицания в конце.',
    mistake: 'Не ставь より и ほど в одно сравнение одновременно.'
  }
];

/* ---------- Состояние ---------- */

const GRAMMAR_KEY = 'anilingo_grammar_read';

/** Какие правила отмечены как изученные. */
function getReadRules() {
  const list = readJSON(GRAMMAR_KEY, []);
  return Array.isArray(list) ? list : [];
}

/** Считается ли правило изученным. */
function isRuleRead(id) {
  return getReadRules().includes(id);
}

/* ---------- Список правил ---------- */

let grammarLevelFilter = 'all';
let grammarQuery = '';

/** Фильтр по уровню. */
function filterGrammar(level, button) {
  grammarLevelFilter = level;
  document.querySelectorAll('.grammar-filters .chip').forEach(chip => chip.classList.remove('chip-active'));
  if (button) button.classList.add('chip-active');
  renderGrammarList();
}

/** Поиск по правилам. */
function onGrammarSearch(value) {
  grammarQuery = String(value || '').trim().toLowerCase();
  renderGrammarList();
}

/** Рисует карточки правил. */
function renderGrammarList() {
  const grid = document.getElementById('grammarGrid');
  if (!grid) return;

  const read = getReadRules();

  const list = GRAMMAR_RULES.filter(rule => {
    const levelOk = grammarLevelFilter === 'all' || rule.level === grammarLevelFilter;
    const queryOk = !grammarQuery ||
      (rule.title + ' ' + rule.jp + ' ' + rule.short + ' ' + rule.tag).toLowerCase().includes(grammarQuery);
    return levelOk && queryOk;
  });

  grid.innerHTML = '';

  if (!list.length) {
    grid.innerHTML = grammarLevelFilter !== 'all'
      ? `<div class="empty-state">Правил уровня ${grammarLevelFilter} пока нет.
          <button class="btn btn-outline btn-small" onclick="filterGrammar('all', document.querySelector('.grammar-filters .chip'))">Показать все</button>
        </div>`
      : '<div class="empty-state">Правил не нашли. Попробуй другой запрос.</div>';
  }

  list.forEach(rule => {
    const card = document.createElement('article');
    card.className = 'grammar-card' + (read.includes(rule.id) ? ' is-read' : '');
    card.innerHTML = `
      <div class="grammar-card-top">
        <span class="grammar-jp"></span>
        <span class="grammar-level">${rule.level}</span>
      </div>
      <h3 class="grammar-card-title"></h3>
      <p class="grammar-card-short"></p>
      <div class="grammar-card-foot">
        <span class="grammar-tag"></span>
        <span class="grammar-read">${read.includes(rule.id) ? 'изучено ✓' : 'открыть →'}</span>
      </div>
    `;

    card.querySelector('.grammar-jp').textContent = rule.jp;
    card.querySelector('.grammar-card-title').textContent = rule.title;
    card.querySelector('.grammar-card-short').textContent = rule.short;
    card.querySelector('.grammar-tag').textContent = rule.tag;

    // Звёздочка избранного (пункт 43)
    if (typeof favoriteButtonMarkup === 'function') {
      card.insertAdjacentHTML('beforeend',
        favoriteButtonMarkup('grammar', rule.id, rule.title, 'grammar.html?rule=' + rule.id));
    }

    card.addEventListener('click', () => openGrammarRule(rule.id));
    grid.appendChild(card);
  });

  const counter = document.getElementById('grammarCounter');
  if (counter) counter.textContent = read.length + ' из ' + GRAMMAR_RULES.length + ' изучено';
}

/* ---------- Карточка правила ---------- */

/** Открывает правило: показывает детали и прячет список. */
function openGrammarRule(id) {
  const rule = GRAMMAR_RULES.find(item => item.id === id);
  if (!rule) return;

  const list = document.getElementById('grammarListSection');
  const detail = document.getElementById('grammarDetail');
  if (!detail) return;

  if (list) list.classList.add('hidden');
  detail.classList.remove('hidden');

  const read = isRuleRead(rule.id);

  detail.innerHTML = `
    <button class="btn btn-ghost btn-small grammar-back" onclick="closeGrammarRule()">← Все правила</button>

    <div class="grammar-detail-head">
      <span class="grammar-detail-jp" data-ja>${rule.jp}</span>
      <div>
        <h2>${rule.title}</h2>
        <p>${rule.level} · ${rule.tag} · ${read ? 'изучено ✓' : 'ещё не изучено'}</p>
      </div>
    </div>

    <div class="grammar-block">
      <h4>Как это работает</h4>
      ${rule.explanation.map(text => '<p>' + text + '</p>').join('')}
    </div>

    <div class="grammar-structure">
      <span>Структура</span>
      <b>${rule.structure}</b>
    </div>

    <div class="grammar-block">
      <h4>Примеры</h4>
      <div class="grammar-examples">
        ${rule.examples.map(example => `
          <div class="grammar-example">
            <div class="grammar-example-text">
              <b class="grammar-example-jp">${example.jp}</b>
              <span class="grammar-example-romaji">${toRomaji(example.jp)}</span>
              <span class="grammar-example-ru">${example.ru}</span>
            </div>
            <button class="speak-btn" type="button" title="Прослушать">🔊</button>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="grammar-tip"><b>Подсказка</b><p>${rule.tip}</p></div>
    <div class="grammar-mistake"><b>Частая ошибка</b><p>${rule.mistake}</p></div>

    <div class="btn-row">
      <button class="btn btn-primary" style="flex:1" id="grammarReadBtn" onclick="markGrammarRead('${rule.id}')">
        ${read ? 'Уже изучено ✓' : 'Отметить как изученное · +15 XP'}
      </button>
      <a class="btn btn-outline" href="tests.html?type=grammar">Проверить себя</a>
    </div>
  `;

  // Озвучка примеров
  detail.querySelectorAll('.speak-btn').forEach((button, index) => {
    button.addEventListener('click', () => speakJapanese(rule.examples[index].jp));
  });

  const readBtn = document.getElementById('grammarReadBtn');
  if (readBtn && read) readBtn.disabled = true;

  // Красим ромадзи
  decorateRomaji(detail);

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Сохраняем открытое правило в адресе, чтобы ссылкой можно было поделиться
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', 'grammar.html?rule=' + rule.id);
  }
}

/** Возвращает список правил. */
function closeGrammarRule() {
  const list = document.getElementById('grammarListSection');
  const detail = document.getElementById('grammarDetail');

  if (detail) detail.classList.add('hidden');
  if (list) list.classList.remove('hidden');

  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', 'grammar.html');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Отмечает правило изученным и начисляет XP один раз. */
function markGrammarRead(id) {
  const read = getReadRules();
  if (read.includes(id)) return;

  read.push(id);
  writeJSON(GRAMMAR_KEY, read);

  if (typeof notifyAction === 'function') {
    notifyAction('grammar', 1, { reason: 'Правило грамматики' });
  }

  const rule = GRAMMAR_RULES.find(item => item.id === id);
  if (typeof showToast === 'function') {
    showToast('Правило изучено', (rule ? rule.title : 'Грамматика') + ' · +15 XP', 'success');
  }

  const button = document.getElementById('grammarReadBtn');
  if (button) {
    button.textContent = 'Уже изучено ✓';
    button.disabled = true;
  }

  renderGrammarList();
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('grammarGrid')) return;

  renderGrammarList();

  const params = new URLSearchParams(window.location.search);
  const ruleId = params.get('rule');
  if (ruleId) openGrammarRule(ruleId);
});

/* Экспорт в глобальную область */
window.GRAMMAR_RULES = GRAMMAR_RULES;
window.getReadRules = getReadRules;
window.renderGrammarList = renderGrammarList;
window.openGrammarRule = openGrammarRule;
window.closeGrammarRule = closeGrammarRule;
window.markGrammarRead = markGrammarRead;
window.filterGrammar = filterGrammar;
window.onGrammarSearch = onGrammarSearch;
