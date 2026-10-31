/* ============================================================
   romaji.js — ромадзи (латинская транскрипция) по всему сайту
   Умеет переводить кану в ромадзи и включать/выключать показ
   ромадзи поверх страниц. Настройка — settings['interface.romaji'].
   ============================================================ */

'use strict';

/* ---------- Таблица каны ---------- */

// Хирагана → ромадзи
const ROMAJI_HIRA = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'ゐ': 'wi', 'ゑ': 'we', 'を': 'wo', 'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o',
  'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo', 'ゎ': 'wa',
  // Диграфы
  'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
  'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
  'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
  'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
  'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
  'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
  'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
  'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
  'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
  'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
  'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo'
};

// Катакана → ромадзи (те же звуки + заимствования)
const ROMAJI_KATA = {
  'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
  'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
  'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
  'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
  'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
  'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
  'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
  'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
  'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
  'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
  'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
  'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
  'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
  'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
  'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
  'ヴ': 'vu', 'ァ': 'a', 'ィ': 'i', 'ゥ': 'u', 'ェ': 'e', 'ォ': 'o',
  'ャ': 'ya', 'ュ': 'yu', 'ョ': 'yo', 'ヮ': 'wa',
  // Диграфы
  'キャ': 'kya', 'キュ': 'kyu', 'キョ': 'kyo',
  'シャ': 'sha', 'シュ': 'shu', 'ショ': 'sho',
  'チャ': 'cha', 'チュ': 'chu', 'チョ': 'cho',
  'ニャ': 'nya', 'ニュ': 'nyu', 'ニョ': 'nyo',
  'ヒャ': 'hya', 'ヒュ': 'hyu', 'ヒョ': 'hyo',
  'ミャ': 'mya', 'ミュ': 'myu', 'ミョ': 'myo',
  'リャ': 'rya', 'リュ': 'ryu', 'リョ': 'ryo',
  'ギャ': 'gya', 'ギュ': 'gyu', 'ギョ': 'gyo',
  'ジャ': 'ja', 'ジュ': 'ju', 'ジョ': 'jo',
  'ビャ': 'bya', 'ビュ': 'byu', 'ビョ': 'byo',
  'ピャ': 'pya', 'ピュ': 'pyu', 'ピョ': 'pyo',
  // Заимствования
  'ファ': 'fa', 'フィ': 'fi', 'フェ': 'fe', 'フォ': 'fo',
  'ティ': 'ti', 'ディ': 'di', 'トゥ': 'tu', 'ドゥ': 'du',
  'ウィ': 'wi', 'ウェ': 'we', 'ウォ': 'wo',
  'シェ': 'she', 'ジェ': 'je', 'チェ': 'che', 'ツァ': 'tsa'
};

const ROMAJI_VOWELS = 'aeiou';

/* ---------- Перевод ---------- */

/**
 * Переводит японский текст в ромадзи.
 * Кандзи и латиница остаются как есть — их так и читают по-разному.
 * @param {string} text
 * @returns {string}
 */
function toRomaji(text) {
  const source = String(text || '');
  let result = '';
  let i = 0;

  while (i < source.length) {
    const two = source.slice(i, i + 2);
    const one = source[i];

    // っ / ッ удваивает следующую согласную
    if (one === 'っ' || one === 'ッ') {
      const nextTwo = source.slice(i + 1, i + 3);
      const nextOne = source[i + 1];
      const nextRomaji = ROMAJI_HIRA[nextTwo] || ROMAJI_KATA[nextTwo] ||
        ROMAJI_HIRA[nextOne] || ROMAJI_KATA[nextOne] || '';

      if (nextRomaji) result += nextRomaji[0];
      i += 1;
      continue;
    }

    // Долгая гласная ー повторяет предыдущую
    if (one === 'ー') {
      const last = result.slice(-1);
      if (ROMAJI_VOWELS.includes(last)) result += last;
      i += 1;
      continue;
    }

    const digraph = ROMAJI_HIRA[two] || ROMAJI_KATA[two];
    if (digraph) {
      result += digraph;
      i += 2;
      continue;
    }

    const single = ROMAJI_HIRA[one] || ROMAJI_KATA[one];
    if (single) {
      result += single;
      i += 1;
      continue;
    }

    // Знаки препинания и латиница — без изменений
    result += one;
    i += 1;
  }

  return result;
}

/** Есть ли в тексте японские символы. */
function hasKana(text) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(String(text || ''));
}

/** Ромадзи для слова: если кандзи — оставляем как есть. */
function romajiOf(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  return toRomaji(value);
}

/* ---------- Настройка показа ---------- */

/** Включён ли показ ромадзи. */
function isRomajiOn() {
  if (typeof getSettingValue === 'function') {
    const value = getSettingValue('interface.romaji', true);
    return value !== false;
  }

  const saved = readJSON('anilingo_romaji', true);
  return saved !== false;
}

/** Сохраняет настройку показа ромадзи. */
function setRomajiOn(value) {
  const on = Boolean(value);

  if (typeof setSettingValue === 'function') {
    setSettingValue('interface.romaji', on);
  } else {
    writeJSON('anilingo_romaji', on);
  }

  applyRomajiVisibility();
  document.querySelectorAll('[data-romaji-toggle]').forEach(el => {
    el.classList.toggle('is-off', !on);
    el.textContent = on ? 'あ→a вкл' : 'あ→a выкл';
  });

  return on;
}

/** Переключает показ ромадзи и показывает всплывашку. */
function toggleRomaji() {
  const on = setRomajiOn(!isRomajiOn());

  if (typeof showToast === 'function') {
    showToast(
      on ? 'Ромадзи включено' : 'Ромадзи скрыто',
      on ? 'Под японским текстом появится латинская запись' : 'Остаётся только японский текст',
      'info'
    );
  }

  return on;
}

/**
 * Прячет или показывает все ромадзи-подписи на странице.
 * Работает через класс body: перерисовывать блоки не нужно.
 */
function applyRomajiVisibility() {
  const on = isRomajiOn();
  document.body.classList.toggle('hide-romaji', !on);
}

/**
 * Добавляет ромадзи под элементы с data-ja, если его там ещё нет.
 * Используется на страницах, где японский текст приходит без транскрипции.
 * @param {Element|Document} root
 */
function decorateRomaji(root) {
  const scope = root && root.querySelectorAll ? root : document;
  if (!isRomajiOn()) return;

  scope.querySelectorAll('[data-ja]').forEach(el => {
    if (el.dataset.romajiDone === 'true') return;

    const text = el.dataset.ja || el.textContent;
    const romaji = romajiOf(text);
    if (!romaji || romaji === text) return;

    const span = document.createElement('span');
    span.className = 'romaji';
    span.textContent = romaji;

    el.insertAdjacentElement('afterend', span);
    el.dataset.romajiDone = 'true';
  });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  applyRomajiVisibility();

  // Кнопки-переключатели «あ→a»
  document.querySelectorAll('[data-romaji-toggle]').forEach(button => {
    button.classList.toggle('is-off', !isRomajiOn());
    button.textContent = isRomajiOn() ? 'あ→a вкл' : 'あ→a выкл';
    button.addEventListener('click', toggleRomaji);
  });

  decorateRomaji(document);
});

/* Экспорт в глобальную область */
window.toRomaji = toRomaji;
window.hasKana = hasKana;
window.romajiOf = romajiOf;
window.isRomajiOn = isRomajiOn;
window.setRomajiOn = setRomajiOn;
window.toggleRomaji = toggleRomaji;
window.applyRomajiVisibility = applyRomajiVisibility;
window.decorateRomaji = decorateRomaji;
