/* ============================================================
   quotes.js — цитата дня
   30 фраз из аниме: японский, ромадзи, перевод и источник.
   Цитата выбирается по номеру дня, можно листать вручную.
   ============================================================ */

'use strict';

const ANIME_QUOTES = [
  { jp: '俺は火影になる', romaji: 'Ore wa hokage ni naru', ru: 'Я стану Хокаге', source: 'Наруто' },
  { jp: '心臓を捧げよ', romaji: 'Shinzou o sasageyo', ru: 'Отдайте свои сердца', source: 'Атака титанов' },
  { jp: '逃げちゃダメだ', romaji: 'Nigecha dame da', ru: 'Нельзя убегать', source: 'Евангелион' },
  { jp: '君の名は。', romaji: 'Kimi no na wa.', ru: 'Как тебя зовут?', source: 'Твоё имя' },
  { jp: '生きろ', romaji: 'Ikiro', ru: 'Живи', source: 'Принцесса Мононоке' },
  { jp: '愛してる', romaji: 'Aishiteru', ru: 'Я тебя люблю', source: 'Вайолет Эвергарден' },
  { jp: '海賊王に俺はなる', romaji: 'Kaizoku ou ni ore wa naru', ru: 'Я стану королём пиратов', source: 'Ван-Пис' },
  { jp: '全集中の呼吸', romaji: 'Zen shuuchuu no kokyuu', ru: 'Дыхание полного сосредоточения', source: 'Клинок, рассекающий демонов' },
  { jp: '領域展開', romaji: 'Ryouiki tenkai', ru: 'Раскрытие территории', source: 'Магическая битва' },
  { jp: 'プラス・ウルトラ', romaji: 'Purasu urutora', ru: 'Плюс ультра', source: 'Моя геройская академия' },
  { jp: 'この世界は間違っている', romaji: 'Kono sekai wa machigatte iru', ru: 'Этот мир неправильный', source: 'Токийский гуль' },
  { jp: '等価交換', romaji: 'Touka koukan', ru: 'Равноценный обмен', source: 'Стальной алхимик' },
  { jp: '僕は新世界の神になる', romaji: 'Boku wa shin sekai no kami ni naru', ru: 'Я стану богом нового мира', source: 'Тетрадь смерти' },
  { jp: '未来を変える', romaji: 'Mirai o kaeru', ru: 'Изменить будущее', source: 'Врата Штейна' },
  { jp: 'また会おう', romaji: 'Mata aou', ru: 'Ещё увидимся', source: 'Провожающая в последний путь Фрирен' },
  { jp: '大丈夫だよ', romaji: 'Daijoubu da yo', ru: 'Всё хорошо', source: 'Корзинка фруктов' },
  { jp: '名前を忘れないで', romaji: 'Namae o wasurenaide', ru: 'Не забудь своё имя', source: 'Унесённые призраками' },
  { jp: '友達になりたい', romaji: 'Tomodachi ni naritai', ru: 'Хочу стать другом', source: 'Форма голоса' },
  { jp: '任務完了', romaji: 'Ninmu kanryou', ru: 'Задание выполнено', source: 'Семья шпиона' },
  { jp: '悪魔を狩る', romaji: 'Akuma o karu', ru: 'Охотиться на демонов', source: 'Человек-бензопила' },
  { jp: 'バンドやろう', romaji: 'Bando yarou', ru: 'Давай соберём группу', source: 'Одинокий рокер' },
  { jp: '君を守る', romaji: 'Kimi o mamoru', ru: 'Я тебя защищу', source: 'Мастера меча онлайн' },
  { jp: '自由に生きる', romaji: 'Jiyuu ni ikiru', ru: 'Жить свободно', source: 'Ковбой Бибоп' },
  { jp: '死に戻り', romaji: 'Shini modori', ru: 'Возвращение после смерти', source: 'Re:Zero' },
  { jp: '頑張れ', romaji: 'Ganbare', ru: 'Держись, у тебя получится', source: 'Клинок, рассекающий демонов' },
  { jp: 'おかえり', romaji: 'Okaeri', ru: 'С возвращением', source: 'Мой сосед Тоторо' },
  { jp: 'ただいま', romaji: 'Tadaima', ru: 'Я дома', source: 'Мой сосед Тоторо' },
  { jp: '好きだ', romaji: 'Suki da', ru: 'Ты мне нравишься', source: 'Форма голоса' },
  { jp: '一緒に行こう', romaji: 'Issho ni ikou', ru: 'Пойдём вместе', source: 'Унесённые призраками' },
  { jp: 'ありがとう', romaji: 'Arigatou', ru: 'Спасибо', source: 'Вайолет Эвергарден' }
];

/* ---------- Выбор цитаты ---------- */

// Ручной сдвиг: кнопка «другая цитата» не меняет цитату дня
let quoteOffset = 0;

/** Индекс цитаты дня по номеру дня. */
function getQuoteOfDayIndex() {
  const dayNumber = typeof xpDayNumber === 'function' ? xpDayNumber() : Math.floor(Date.now() / 86400000);

  // Добавляем ручной сдвиг, чтобы можно было листать
  return (dayNumber + quoteOffset) % ANIME_QUOTES.length;
}

/** Текущая цитата. */
function getCurrentQuote() {
  return ANIME_QUOTES[getQuoteOfDayIndex()];
}

/* ---------- Отрисовка ---------- */

/** Рисует блок «Цитата дня» на главной. */
function renderQuoteBlock() {
  const box = document.getElementById('quoteBlock');
  if (!box) return;

  const quote = getCurrentQuote();
  const isToday = quoteOffset === 0;

  box.innerHTML = `
    <div class="quote-head">
      <span class="badge badge-muted">${isToday ? 'Цитата дня' : 'Случайная цитата'}</span>
      <span class="quote-source"></span>
    </div>

    <div class="quote-body">
      <div class="quote-mark">「</div>
      <div class="quote-jp" data-ja></div>
      <div class="quote-romaji"></div>
      <div class="quote-ru"></div>
    </div>

    <div class="quote-actions">
      <button class="btn btn-ghost btn-small" onclick="speakJapanese(document.querySelector('.quote-jp').textContent)">🔊 Прослушать</button>
      <button class="btn btn-ghost btn-small" onclick="nextQuote()">Другая цитата</button>
      <button class="btn btn-ghost btn-small" onclick="copyQuote()">Скопировать</button>
      <a class="btn btn-ghost btn-small" href="anime">Все тайтлы →</a>
    </div>
  `;

  box.querySelector('.quote-source').textContent = quote.source;
  box.querySelector('.quote-jp').textContent = quote.jp;
  box.querySelector('.quote-romaji').textContent = quote.romaji;
  box.querySelector('.quote-ru').textContent = '«' + quote.ru + '»';

  decorateRomaji(box);
}

/** Следующая цитата из списка. */
function nextQuote() {
  quoteOffset = (quoteOffset + 1) % ANIME_QUOTES.length;
  renderQuoteBlock();
}

/** Копирует цитату в буфер обмена. */
async function copyQuote() {
  const quote = getCurrentQuote();
  const text = quote.jp + ' (' + quote.romaji + ') — «' + quote.ru + '». ' + quote.source;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      if (typeof showToast === 'function') showToast('Скопировано', 'Цитата в буфере обмена', 'success');
      return;
    }
  } catch (error) {
    // Ниже — запасной вариант
  }

  if (typeof showToast === 'function') showToast('Цитата', text, 'info');
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderQuoteBlock();
});

/* Экспорт в глобальную область */
window.ANIME_QUOTES = ANIME_QUOTES;
window.getCurrentQuote = getCurrentQuote;
window.renderQuoteBlock = renderQuoteBlock;
window.nextQuote = nextQuote;
window.copyQuote = copyQuote;
