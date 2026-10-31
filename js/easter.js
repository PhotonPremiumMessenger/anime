/* ============================================================
   easter.js — пасхалки
   14 секретов по всему сайту. Каждая находка даёт XP и счётчик
   для достижений. Список найденного — anilingo_easter.
   ============================================================ */

'use strict';

const EASTER_KEY = 'anilingo_easter';

/* ---------- Список пасхалок ---------- */

// hint показываем в подсказке по клавише «?»
const EASTER_EGGS = [
  { id: 'konami',      title: 'Код Konami',        hint: '↑ ↑ ↓ ↓ ← → ← → B A на клавиатуре' },
  { id: 'logo7',       title: 'Терпеливый клик',   hint: 'Нажми на логотип 7 раз' },
  { id: 'type-anime',  title: 'Аниме-слово',       hint: 'Набери на клавиатуре: anime' },
  { id: 'type-kawaii', title: 'Кавайи',            hint: 'Набери на клавиатуре: kawaii' },
  { id: 'type-sakura', title: 'Сакура',            hint: 'Набери: sakura — лепестки полетят' },
  { id: 'type-sensei', title: 'Сэнсэй',            hint: 'Набери: sensei' },
  { id: 'type-gakkou', title: 'Школа',             hint: 'Набери: gakkou' },
  { id: 'type-neko',   title: 'Ня',                hint: 'Набери: neko' },
  { id: 'title-dbl',   title: 'Тайный заголовок',  hint: 'Дважды кликни по главному заголовку' },
  { id: 'heart-3s',    title: 'Сердце',            hint: 'Задержи курсор на сердечке в подвале' },
  { id: 'night-owl',   title: 'Полуночник',        hint: 'Загляни на сайт между 00:00 и 04:00' },
  { id: 'friday',      title: 'Пятница',           hint: 'Открой сайт в пятницу' },
  { id: 'scroll-bottom', title: 'До конца',        hint: 'Прокрути страницу до самого низа' },
  { id: 'footer-torii', title: 'Врата',            hint: 'Нажми «⛩» в подвале 10 раз' },
  { id: 'help',        title: 'Список секретов',   hint: 'Нажми «?» — увидишь все подсказки' }
];

/* ---------- Состояние ---------- */

/** Уже найденные пасхалки. */
function getFoundEggs() {
  const list = readJSON(EASTER_KEY, []);
  return Array.isArray(list) ? list : [];
}

/** Найдена ли пасхалка. */
function hasEgg(id) {
  return getFoundEggs().includes(id);
}

/**
 * Фиксирует находку: XP, тост и счётчик.
 * Повторно XP не начисляется.
 */
function triggerEaster(id, message) {
  const egg = EASTER_EGGS.find(item => item.id === id);
  if (!egg) return false;
  if (hasEgg(id)) return false;

  const found = getFoundEggs();
  found.push(id);
  writeJSON(EASTER_KEY, found);

  if (typeof notifyAction === 'function') {
    notifyAction('easter', 1, { reason: 'Пасхалка: ' + egg.title });
  }

  if (typeof showToast === 'function') {
    // Опыт — только аккаунту, гостю просто показываем находку
    const reward = typeof accountIsActive === 'function' && accountIsActive() ? ' · +20 XP' : '';
    showToast(
      '🕵️ Пасхалка: ' + egg.title,
      (message || egg.hint) + reward + ' · найдено ' + found.length + ' из ' + EASTER_EGGS.length,
      'success'
    );
  }

  return true;
}

/* ---------- Слушатели ---------- */

// Буфер набранных латинских букв
let typedBuffer = '';
let logoClicks = 0;
let footerToriiClicks = 0;
let logoClickTimer = null;

/** Код Konami. */
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

/** Проверяет текстовые секреты. */
function checkTypedWord(word) {
  const words = {
    anime: ['type-anime', 'Аниме-слово найдено. Наслаждайся кото-фразой: アニメが大好き！'],
    kawaii: ['type-kawaii', 'Кавайи! かわいい〜'],
    sakura: ['type-sakura', 'Лепестки сакуры включены на 10 секунд'],
    sensei: ['type-sensei', 'Сэнсэй одобряет: よくできました！'],
    gakkou: ['type-gakkou', 'Школа найдена: 学校に行こう！'],
    neko: ['type-neko', 'Ня! にゃーん 🐱']
  };

  const entry = words[word];
  if (!entry) return;

  const isNew = triggerEaster(entry[0], entry[1]);
  if (!isNew) return;

  // Сакура — ещё и включает лепестки
  if (word === 'sakura' && typeof toggleSakura === 'function') {
    const input = document.getElementById('sakuraSwitch');
    if (input && !input.checked) {
      input.checked = true;
      toggleSakura(input);
    }
  }
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
  /* 1. Клавиатура: Konami, «?» и текстовые слова */
  document.addEventListener('keydown', event => {
    const key = event.key;

    // Код Konami
    if (key === KONAMI[konamiIndex] || key.toLowerCase() === KONAMI[konamiIndex]) {
      konamiIndex += 1;
      if (konamiIndex === KONAMI.length) {
        konamiIndex = 0;
        triggerEaster('konami', 'Секретный код принят. Ты знаешь толк в старых играх');
      }
    } else {
      konamiIndex = key === KONAMI[0] ? 1 : 0;
    }

    // Подсказка по всем секретам
    if (key === '?') {
      triggerEaster('help', 'Открыт список подсказок');
      showEasterHelp();
      return;
    }

    // Текстовые слова (только латиница, без модификаторов)
    if (!event.ctrlKey && !event.metaKey && !event.altKey && /^[a-zA-Z]$/.test(key)) {
      typedBuffer = (typedBuffer + key.toLowerCase()).slice(-8);

      ['anime', 'kawaii', 'sakura', 'sensei', 'gakkou', 'neko'].forEach(word => {
        if (typedBuffer.endsWith(word)) checkTypedWord(word);
      });
    }
  });

  /* 2. Семь кликов по логотипу */
  const logo = document.querySelector('.logo');
  if (logo) {
    logo.addEventListener('click', () => {
      logoClicks += 1;

      clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(() => { logoClicks = 0; }, 1500);

      if (logoClicks >= 7) {
        logoClicks = 0;
        triggerEaster('logo7', 'Логотип выдержал. Тории открываются');
      }
    });
  }

  /* 3. Двойной клик по главному заголовку */
  const heading = document.querySelector('.hero h1') || document.querySelector('h1');
  if (heading) {
    heading.addEventListener('dblclick', () => {
      triggerEaster('title-dbl', '«Учи японский через аниме» — а теперь дважды по-японски');
    });
  }

  /* 4. Три секунды на сердечке в подвале */
  const heart = document.querySelector('.footer .accent');
  if (heart) {
    let heartTimer = null;

    heart.addEventListener('mouseenter', () => {
      heartTimer = setTimeout(() => triggerEaster('heart-3s', 'Сделано с ♥ — и это взаимно'), 3000);
    });

    heart.addEventListener('mouseleave', () => clearTimeout(heartTimer));
  }

  /* 5. Скролл до самого низа */
  let bottomDone = false;
  window.addEventListener('scroll', () => {
    if (bottomDone) return;

    const bottom = window.innerHeight + window.scrollY;
    if (bottom >= document.body.scrollHeight - 4) {
      bottomDone = true;
      triggerEaster('scroll-bottom', 'Ты дочитал страницу до конца');
    }
  }, { passive: true });

  /* 6. Десять кликов по «⛩» в подвале */
  const footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom) {
    footerBottom.addEventListener('click', event => {
      if (!event.target.textContent.includes('⛩') && !event.target.textContent.includes('©')) return;

      footerToriiClicks += 1;
      if (footerToriiClicks >= 10) {
        footerToriiClicks = 0;
        triggerEaster('footer-torii', 'Десять поклонов вратам — принимается');
      }
    });
  }

  /* 7. Время: ночь и пятница */
  const hour = new Date().getHours();
  const day = new Date().getDay();

  if (hour >= 0 && hour < 4) {
    triggerEaster('night-owl', 'Сейчас глубокая ночь — учиться в тишине приятнее');
  }

  if (day === 5) {
    triggerEaster('friday', 'Пятница — время аниме-марафона');
  }
});

/* ---------- Подсказки ---------- */

/** Показывает список всех пасхалок (найденные отмечаются). */
function showEasterHelp() {
  const existing = document.getElementById('easterHelp');
  if (existing) existing.remove();

  const found = getFoundEggs();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'easterHelp';
  overlay.innerHTML = `
    <div class="modal modal-wide">
      <div class="modal-head">
        <h3>Пасхалки</h3>
        <button class="modal-close" onclick="document.getElementById('easterHelp').remove()" aria-label="Закрыть">×</button>
      </div>
      <p class="modal-sub">Найдено ${found.length} из ${EASTER_EGGS.length}. Каждая даёт +20 XP.</p>

      <div class="easter-list">
        ${EASTER_EGGS.map(egg => `
          <div class="easter-item ${found.includes(egg.id) ? 'is-found' : ''}">
            <span class="easter-check">${found.includes(egg.id) ? '✓' : '?'}</span>
            <div>
              <b>${found.includes(egg.id) ? egg.title : 'Секрет'}</b>
              <span>${egg.hint}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  overlay.addEventListener('click', event => {
    if (event.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

/* Экспорт в глобальную область */
window.EASTER_EGGS = EASTER_EGGS;
window.getFoundEggs = getFoundEggs;
window.hasEgg = hasEgg;
window.triggerEaster = triggerEaster;
window.showEasterHelp = showEasterHelp;
