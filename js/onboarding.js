/* ============================================================
   onboarding.js — пошаговый тур по сайту
   При первом заходе подсвечиваем реальные элементы интерфейса
   и объясняем, что где лежит. Прошли — запомнили во флаге,
   второй раз не мешаем (повторно можно из настроек/кнопкой).
   ============================================================ */

'use strict';

const TOUR_KEY = 'nihongo_tour_done';

// Шаги тура: селектор, заголовок, текст и куда ставить подсказку
const TOUR_STEPS = [
  {
    selector: '.logo',
    title: 'Это главная',
    text: 'Логотип всегда возвращает на стартовую страницу — с неё удобно начинать день.',
    place: 'bottom'
  },
  {
    selector: '.nav-more-btn',
    title: 'Всё меню — в «Ещё»',
    text: 'Четыре группы: учёба, практика, прогресс и разное. Внутри — все страницы сайта без длинной строки ссылок.',
    place: 'bottom'
  },
  {
    selector: '#designToggle',
    title: 'Настрой дизайн под себя',
    text: 'Тема, акцентный цвет и включение анимаций. Всё применяется сразу и сохраняется в браузере.',
    place: 'bottom'
  },
  {
    selector: '.nav-link[href="anime.html"]',
    title: 'Аниме-каталог',
    text: 'Постеры, описание и японские слова из тайтла. Удобно учить лексику по любимым историям.',
    place: 'bottom',
    fallbackSelector: '.footer'
  },
  {
    selector: '.footer',
    title: 'Подвал: донат и политика',
    text: 'Тут можно поддержать проект, открыть политику конфиденциальности и настроить cookies.',
    place: 'top'
  }
];

let tourIndex = 0;
let tourSteps = [];
let tourEls = null;

/** Проверяет, проходил ли уже тур. */
function isTourDone() {
  try {
    return localStorage.getItem(TOUR_KEY) === '1';
  } catch (error) {
    return true;
  }
}

/** Отмечает тур пройденным. */
function markTourDone() {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch (error) {
    /* приватный режим — ничего страшного */
  }
}

/** Создаёт разметку тура один раз. */
function mountTour() {
  if (tourEls) return;

  const layer = document.createElement('div');
  layer.className = 'tour-layer';
  layer.id = 'tourLayer';

  const spot = document.createElement('div');
  spot.className = 'tour-spot';
  spot.id = 'tourSpot';

  const card = document.createElement('div');
  card.className = 'tour-card';
  card.id = 'tourCard';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.innerHTML = `
    <button class="tour-skip" onclick="endTour()">Пропустить</button>
    <div class="tour-step-count" id="tourCount"></div>
    <h4 id="tourTitle"></h4>
    <p id="tourText"></p>
    <div class="tour-foot">
      <div class="tour-dots" id="tourDots"></div>
      <div class="tour-btns">
        <button class="btn btn-outline btn-sm" id="tourPrev" onclick="prevTourStep()">Назад</button>
        <button class="btn btn-primary btn-sm" id="tourNext" onclick="nextTourStep()">Дальше</button>
      </div>
    </div>
  `;

  document.body.appendChild(layer);
  document.body.appendChild(spot);
  document.body.appendChild(card);

  tourEls = { layer, spot, card };

  // Реакция на прокрутку и ресайз — подсветка не уезжает
  window.addEventListener('resize', updateTourSpot, { passive: true });
  window.addEventListener('scroll', updateTourSpot, { passive: true });

  // Клавиатура: стрелки и Esc
  document.addEventListener('keydown', tourKeys);
}

/** Стартует тур с начала. */
function startTour(force = false) {
  if (!force && isTourDone()) return;

  // Собираем только те шаги, чьи элементы есть на странице
  tourSteps = TOUR_STEPS
    .map(step => {
      const el = document.querySelector(step.selector) ||
        (step.fallbackSelector ? document.querySelector(step.fallbackSelector) : null);
      return el ? Object.assign({}, step, { el }) : null;
    })
    .filter(Boolean);

  if (!tourSteps.length) return;

  mountTour();
  tourIndex = 0;

  document.body.classList.add('tour-on');
  tourEls.layer.classList.add('is-visible');
  tourEls.spot.classList.add('is-visible');
  tourEls.card.classList.add('is-visible');

  renderTourStep();
}

/** Показывает текущий шаг. */
function renderTourStep() {
  const step = tourSteps[tourIndex];
  if (!step) return endTour();

  const { card, spot } = tourEls;

  // Прокручиваем так, чтобы элемент был виден целиком
  const rect = step.el.getBoundingClientRect();
  if (rect.top < 90 || rect.bottom > window.innerHeight - 140) {
    if (typeof step.el.scrollIntoView === 'function') {
      step.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  document.getElementById('tourCount').textContent = `Шаг ${tourIndex + 1} из ${tourSteps.length}`;
  document.getElementById('tourTitle').textContent = step.title;
  document.getElementById('tourText').textContent = step.text;

  // Точки-индикаторы
  document.getElementById('tourDots').innerHTML = tourSteps
    .map((item, index) => `<span class="tour-dot${index === tourIndex ? ' is-active' : ''}"></span>`)
    .join('');

  document.getElementById('tourPrev').disabled = tourIndex === 0;
  document.getElementById('tourNext').textContent = tourIndex === tourSteps.length - 1 ? 'Готово' : 'Дальше';

  // Подсветка плавно переезжает к новому элементу
  spot.classList.add('is-moving');
  setTimeout(() => spot.classList.remove('is-moving'), 320);

  updateTourSpot();
  placeTourCard();
}

/** Ставит «прожектор» на текущий элемент. */
function updateTourSpot() {
  if (!tourEls || !tourEls.spot.classList.contains('is-visible')) return;

  const step = tourSteps[tourIndex];
  if (!step) return;

  const rect = step.el.getBoundingClientRect();
  const pad = 8;

  tourEls.spot.style.top = (rect.top - pad) + 'px';
  tourEls.spot.style.left = (rect.left - pad) + 'px';
  tourEls.spot.style.width = (rect.width + pad * 2) + 'px';
  tourEls.spot.style.height = (rect.height + pad * 2) + 'px';

  placeTourCard();
}

/** Размещает подсказку рядом с подсветкой, не вылезая за экран. */
function placeTourCard() {
  const step = tourSteps[tourIndex];
  if (!step || !tourEls) return;

  const { card } = tourEls;
  const rect = step.el.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const gap = 16;
  const margin = 12;

  const width = Math.min(360, window.innerWidth - margin * 2);

  // По умолчанию — снизу от элемента
  let top = rect.bottom + gap;
  let left = rect.left + rect.width / 2 - width / 2;

  // Если снизу не влезает — ставим сверху
  if (top + cardRect.height > window.innerHeight - margin) {
    const above = rect.top - cardRect.height - gap;
    top = above > margin ? above : window.innerHeight - cardRect.height - margin;
  }

  // Прижимаем по горизонтали
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

  card.style.width = width + 'px';
  card.style.top = Math.max(margin, top) + 'px';
  card.style.left = left + 'px';
}

/** Следующий шаг. */
function nextTourStep() {
  if (tourIndex >= tourSteps.length - 1) return endTour();
  tourIndex += 1;
  renderTourStep();
}

/** Предыдущий шаг. */
function prevTourStep() {
  if (tourIndex === 0) return;
  tourIndex -= 1;
  renderTourStep();
}

/** Завершает тур. */
function endTour() {
  markTourDone();

  if (tourEls) {
    tourEls.layer.classList.remove('is-visible');
    tourEls.spot.classList.remove('is-visible');
    tourEls.card.classList.remove('is-visible');
  }

  document.body.classList.remove('tour-on');
  document.removeEventListener('keydown', tourKeys);
}

/** Клавиши: → дальше, ← назад, Esc — выйти. */
function tourKeys(event) {
  if (event.key === 'ArrowRight') nextTourStep();
  if (event.key === 'ArrowLeft') prevTourStep();
  if (event.key === 'Escape') endTour();
}

/** Перезапуск тура из настроек — по кнопке. */
function restartTour() {
  try {
    localStorage.removeItem(TOUR_KEY);
  } catch (error) {
    /* пусто */
  }

  tourEls = null;
  document.getElementById('tourLayer')?.remove();
  document.getElementById('tourSpot')?.remove();
  document.getElementById('tourCard')?.remove();

  startTour(true);
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (isTourDone()) return;

  // Не спорим с карточкой cookies: сначала cookies, потом тур
  const hasConsent = typeof getConsent === 'function' && getConsent();
  const delay = hasConsent ? 900 : 0;

  if (hasConsent) {
    setTimeout(() => startTour(), delay);
    return;
  }

  // Ждём, пока пользователь ответит на cookies (или 30 секунд)
  const waitConsent = setInterval(() => {
    if (typeof getConsent === 'function' && getConsent()) {
      clearInterval(waitConsent);
      setTimeout(() => startTour(), 700);
    }
  }, 500);

  setTimeout(() => clearInterval(waitConsent), 30000);
});

window.startTour = startTour;
window.nextTourStep = nextTourStep;
window.prevTourStep = prevTourStep;
window.endTour = endTour;
window.restartTour = restartTour;
