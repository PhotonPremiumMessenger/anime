/* ============================================================
   icons.js — единый набор SVG-иконок
   Вместо эмодзи по всему сайту используются аккуратные иконки.
   Работает в двух режимах:
   1) icon('trophy') — вернуть разметку иконки в своём коде;
   2) авто-замена: скрипт находит эмодзи в тексте и подменяет
      их на SVG (в том числе в блоках, которые рисует JS).
   ============================================================ */

'use strict';

// Общие атрибуты: тонкая линия, скругления, текущий цвет
const ICON_BASE = 'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
  'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

/**
 * Набор иконок: имя → внутренняя разметка.
 * Контуры нарисованы вручную, чтобы набор был однородным.
 */
const ICONS = {
  trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 5H5v2a3 3 0 0 0 3 3"/><path d="M16 5h3v2a3 3 0 0 1-3 3"/><path d="M12 12v4"/><path d="M9 20h6"/><path d="M10 16h4l.5 4h-5l.5-4Z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H19v5H6.5A2.5 2.5 0 0 1 4 18.5Z"/>',
  bookOpen: '<path d="M12 6.5C10.5 5 8 4 4.5 4v13c3.5 0 6 1 7.5 2.5 1.5-1.5 4-2.5 7.5-2.5V4c-3.5 0-6 1-7.5 2.5Z"/><path d="M12 6.5v13"/>',
  sparkles: '<path d="m12 3 1.7 4.6L18 9.5l-4.3 1.9L12 16l-1.7-4.6L6 9.5l4.3-1.9L12 3Z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  speaker: '<path d="M4 10v4h3l4 3.5v-11L7 10H4Z"/><path d="M15 9.5a3.5 3.5 0 0 1 0 5"/><path d="M17.5 7a7 7 0 0 1 0 10"/>',
  flame: '<path d="M12 21c3.3 0 6-2.4 6-5.5 0-4-4-5.5-3.5-9.5C12 7 9 9 9 11.5c0 1 .3 1.8.8 2.5-.9-.2-1.6-.8-2-1.5-.5.9-.8 1.9-.8 3 0 3.1 2.7 5.5 5 5.5Z"/>',
  torii: '<path d="M3 6h18"/><path d="M5 9h14"/><path d="M7 9v11M17 9v11"/><path d="M9.5 13h5"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14"/><path d="M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>',
  bolt: '<path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z"/>',
  star: '<path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8L12 4Z"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M17.5 14.5A5.5 5.5 0 0 1 20.5 20"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4h.2A1.7 1.7 0 0 0 4.4 8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6V4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-3 7-3 7h18s-3-1-3-7Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
  pen: '<path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  cards: '<rect x="3" y="6" width="12" height="14" rx="2"/><path d="M8 3h9a2 2 0 0 1 2 2v11"/>',
  headphones: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="13" width="4" height="7" rx="2"/><rect x="17.5" y="13" width="4" height="7" rx="2"/>',
  puzzle: '<path d="M10 4h4v3a1.7 1.7 0 1 0 3 0V4h3v6h-3a1.7 1.7 0 1 0 0 3h3v7h-6v-3a1.7 1.7 0 1 0-3 0v3H4v-7h3a1.7 1.7 0 1 0 0-3H4V4h6Z"/>',
  palette: '<path d="M12 21a9 9 0 1 1 9-9c0 2.2-1.8 3-3.5 3H16a2 2 0 0 0-1.4 3.4A1.8 1.8 0 0 1 12 21Z"/><circle cx="7.5" cy="12" r="1"/><circle cx="9.5" cy="8" r="1"/><circle cx="14" cy="7" r="1"/>',
  bag: '<path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 1 3.5 10.9V16h-7v-2.1A6 6 0 0 1 12 3Z"/>',
  printer: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 14h10v7H7v-7Z"/>',
  sakura: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8c0-2.2 1-4.8 3-4.8s2 3.2 0 4.4"/><path d="M12 9.8c2 .9 4 2.8 3 4.6s-3.6.3-4-2"/><path d="M12 14.2c-.6 2.2-2.6 4-4.3 2.8s.6-3.6 2.3-4"/><path d="M10 12.8C8 13.8 5.6 14 5.2 12s2.6-2.6 4.4-1.8"/>',
  cookie: '<path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 4 4 0 0 0-4-4Z"/><circle cx="9" cy="10" r="1"/><circle cx="10" cy="15" r="1"/><circle cx="15" cy="13.5" r="1"/>',
  rocket: '<path d="M12 3c3.5 1.8 5 5 5 8l-3 3H10l-3-3c0-3 1.5-6.2 5-8Z"/><circle cx="12" cy="10" r="1.5"/><path d="M10 17c-.6 1.5-2 2.5-4 3 .5-2 1.5-3.4 3-4"/><path d="M14 17c.6 1.5 2 2.5 4 3-.5-2-1.5-3.4-3-4"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  gift: '<rect x="3" y="9" width="18" height="4" rx="1"/><path d="M4.5 13v8h15v-8"/><path d="M12 9v12"/><path d="M12 9C9 9 6.5 8.2 6.5 6.2S10 3.6 12 9Z"/><path d="M12 9c3 0 5.5-.8 5.5-2.8S14 3.6 12 9Z"/>',
  sword: '<path d="m14 4 6 6-8.5 8.5L9 16"/><path d="m9 16-4 4"/><path d="m6 13 5 5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  cap: '<path d="m2 9 10-4 10 4-10 4L2 9Z"/><path d="M6 11v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4"/>',
  message: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
  download: '<path d="M12 4v10"/><path d="m8 11 4 4 4-4"/><path d="M4 18v2h16v-2"/>',
  upload: '<path d="M12 20V10"/><path d="m8 13 4-4 4 4"/><path d="M4 6V4h16v2"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
  gamepad: '<rect x="2.5" y="7" width="19" height="10" rx="4"/><path d="M8 10v4M6 12h4"/><circle cx="16" cy="11" r="1"/><circle cx="18.5" cy="13.5" r="1"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  folders: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-1.5 4L16 12H5"/>',
  crown: '<path d="m3 8 3.5 9h11L21 8l-5 3-4-6-4 6-5-3Z"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="m8 4 4 6 4-6"/><path d="M12 13v4"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  play: '<path d="M8 5.5 18.5 12 8 18.5v-13Z"/>',
  pause: '<rect x="7.5" y="5.5" width="3.5" height="13" rx="1.2"/><rect x="13" y="5.5" width="3.5" height="13" rx="1.2"/>',
  skipBack: '<path d="M18.5 5.5v13L9 12l9.5-6.5Z"/><path d="M6 5v14"/>',
  skipForward: '<path d="M5.5 5.5v13L15 12 5.5 5.5Z"/><path d="M18 5v14"/>',
  speakerOff: '<path d="M4 10v4h3l4 3.5v-11L7 10H4Z"/><path d="m15.5 10 4 4M19.5 10l-4 4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>'
};

/**
 * Разметка одной иконки.
 * @param {string} name — ключ из ICONS
 * @param {string} className — дополнительные классы
 */
function icon(name, className = '') {
  const body = ICONS[name] || ICONS.dot;
  return `<svg class="ico${className ? ' ' + className : ''}" ${ICON_BASE}>${body}</svg>`;
}

/** Эмодзи → имя иконки. Всё, что не описано, остаётся как есть. */
const EMOJI_ICONS = {
  '🏆': 'trophy', '🎯': 'target', '📚': 'book', '📖': 'bookOpen', '✨': 'sparkles',
  '♥': 'heart', '♡': 'heart', '💛': 'heart', '❤': 'heart', '✓': 'check', '✔': 'check',
  '✅': 'checkCircle', '🔊': 'speaker', '🔥': 'flame', '⛩': 'torii', '⛩️': 'torii',
  '🎌': 'flag', '⚡': 'bolt', '★': 'star', '☆': 'star', '⭐': 'star',
  '👥': 'users', '👤': 'user', '⚙️': 'gear', '⚙': 'gear', '🔔': 'bell',
  '📝': 'pen', '🎬': 'film', '🃏': 'cards', '🎧': 'headphones', '🧩': 'puzzle',
  '🎨': 'palette', '🛍': 'bag', '🛍️': 'bag', '💡': 'bulb', '🖨': 'printer',
  '🌸': 'sakura', '🍪': 'cookie', '🚀': 'rocket', '📊': 'chart', '🕐': 'clock',
  '⏱': 'clock', '⏱️': 'clock', '🔍': 'search', '🎁': 'gift', '⚔️': 'sword',
  '🌙': 'moon', '🎓': 'cap', '💬': 'message', '⬇': 'download', '⬆': 'upload',
  '🔄': 'refresh', '🎮': 'gamepad', '🔒': 'lock', '✉': 'mail', '✉️': 'mail',
  '📁': 'folders', '👑': 'crown', '🏅': 'medal', '🥇': 'medal', '🔖': 'star',
  '💎': 'star', '🌟': 'sparkles', '🎉': 'gift', '🧠': 'bulb', '📌': 'dot',
  // Символы из игр, видео и магазина
  '▶': 'play', '⏸': 'pause', '⏮': 'skipBack', '⏭': 'skipForward',
  '🔇': 'speakerOff', '🈴': 'checkCircle', '📘': 'bookOpen', '🔎': 'search',
  '📍': 'target', '🎲': 'gamepad', '🏁': 'flag', '🏠': 'torii', '✈': 'rocket',
  '🕵': 'search', '✎': 'pen', '🖌': 'palette', '🤝': 'users', '🥈': 'medal',
  '🥉': 'medal', '👣': 'user', '👘': 'sakura', '🎋': 'sakura', '🐉': 'flame',
  '🐱': 'heart', '🙂': 'user', '🆕': 'sparkles', '🌅': 'sparkles',
  '⏻': 'bolt', '♨': 'flame', '☕': 'gift', '🍜': 'bulb', '🇯🇵': 'flag',
  '✕': 'close'
};

// Где иконки не нужны: код, поля ввода и служебные теги
const ICON_SKIP_TAGS = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'SELECT', 'OPTION'];

/** Можно ли трогать этот узел. */
function iconNodeAllowed(node) {
  let el = node.parentElement;

  while (el) {
    if (ICON_SKIP_TAGS.includes(el.tagName)) return false;
    if (el.hasAttribute && (el.hasAttribute('data-no-icons') || el.classList.contains('ico-wrap'))) return false;
    el = el.parentElement;
  }

  return true;
}

/**
 * Заменяет эмодзи в текстовом узле на SVG.
 * @param {Text} node
 * @returns {boolean} — были ли замены
 */
function iconifyTextNode(node) {
  const text = node.nodeValue;
  if (!text) return false;

  const symbols = Object.keys(EMOJI_ICONS).filter(symbol => text.includes(symbol));
  if (!symbols.length) return false;
  if (!iconNodeAllowed(node)) return false;

  // Сортируем по длине: сначала составные (⚙️), потом одиночные (⚙)
  symbols.sort((a, b) => b.length - a.length);

  const fragment = document.createDocumentFragment();
  let rest = text;

  while (rest.length) {
    let nearest = -1;
    let found = '';

    symbols.forEach(symbol => {
      const index = rest.indexOf(symbol);
      if (index !== -1 && (nearest === -1 || index < nearest)) {
        nearest = index;
        found = symbol;
      }
    });

    if (nearest === -1) break;

    if (nearest > 0) fragment.appendChild(document.createTextNode(rest.slice(0, nearest)));

    const wrap = document.createElement('span');
    wrap.className = 'ico-wrap';
    wrap.innerHTML = icon(EMOJI_ICONS[found]);
    fragment.appendChild(wrap);

    rest = rest.slice(nearest + found.length);
  }

  if (!fragment.childNodes.length) return false;
  if (rest) fragment.appendChild(document.createTextNode(rest));

  node.parentNode.replaceChild(fragment, node);
  return true;
}

/** Проходит по поддереву и заменяет эмодзи. */
function iconify(root) {
  const scope = root || document.body;
  if (!scope || scope.nodeType !== 1) return 0;

  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.nodeValue && node.nodeValue.length < 400
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  let count = 0;
  nodes.forEach(node => {
    if (iconifyTextNode(node)) count += 1;
  });

  return count;
}

/* ---------- Наблюдение за новыми блоками ---------- */

// Очередь поддеревьев, которые нужно обработать в ближайшем кадре
let iconifyQueue = [];
let iconifyScheduled = false;

/** Ставит поддерево в очередь на замену эмодзи. */
function scheduleIconify(node) {
  if (node) iconifyQueue.push(node);

  if (iconifyScheduled) return;
  iconifyScheduled = true;

  requestAnimationFrame(() => {
    iconifyScheduled = false;

    // Фоновая вкладка: не тратим кадры на разбор иконок
    if (document.hidden) {
      iconifyQueue = [];
      return;
    }

    // Собираем уникальные узлы: один и тот же блок мог прийти дважды
    const targets = iconifyQueue.filter((item, index) => iconifyQueue.indexOf(item) === index);
    iconifyQueue = [];

    targets.forEach(target => {
      if (!target || !target.isConnected) return;
      if (target.nodeType === 3) iconifyTextNode(target);
      else iconify(target);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  iconify(document.body);

  if (typeof MutationObserver !== 'function') return;

  // Следим и за новыми блоками (innerHTML), и за сменой текста (textContent),
  // потому что часть виджетов дорисовывается уже после загрузки страницы
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'characterData') {
        scheduleIconify(mutation.target);
        return;
      }

      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) scheduleIconify(node);
        else if (node.nodeType === 3) scheduleIconify(node);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  // Страховочные проходы: виджеты с задержкой и ленивые блоки
  setTimeout(() => iconify(document.body), 800);
  window.addEventListener('load', () => setTimeout(() => iconify(document.body), 300));
});

/* Экспорт в глобальную область */
window.ICONS = ICONS;
window.icon = icon;
window.iconify = iconify;
