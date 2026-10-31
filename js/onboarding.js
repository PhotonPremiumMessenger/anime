/* ============================================================
   onboarding.js — пошаговый тур по сайту
   При первом заходе подсвечиваем реальные элементы интерфейса,
   показываем крупную подсказку и стрелку «сюда». Прошли —
   запомнили во флаге, второй раз не мешаем.
   ============================================================ */

'use strict';

const TOUR_KEY = 'anilingo_tour_done';

// Шаги тура: selector, заголовок, текст, иконка и подсказка «куда нажать»
const TOUR_STEPS = [
  {
    selector: '.logo',
    mobileSelector: '.logo',
    icon: 'torii',
    title: 'Начнём с главной',
    text: 'Это логотип AniLingo. Нажми на него в любой момент — и вернёшься на главную страницу.',
    hint: 'Нажми на логотип'
  },
  {
    selector: '.nav-more-btn',
    mobileSelector: '.nav-burger',
    icon: 'folders',
    title: 'Здесь всё меню',
    text: 'Нажми «Ещё» — откроются четыре группы: учёба, практика, прогресс и разное. Внутри лежат все страницы сайта.',
    hint: 'Нажми, чтобы открыть меню'
  },
  {
    selector: '#designToggle',
    mobileSelector: '#designToggle',
    icon: 'palette',
    title: 'Настрой вид под себя',
    text: 'Кнопка «Дизайн» открывает панель: тема, акцентный цвет, сакура и анимации. Всё сохраняется в браузере.',
    hint: 'Кнопка «Дизайн»'
  },
  {
    selector: '.nav-link[href="anime"]',
    mobileSelector: '.mobile-more .nav-link[href="anime"]',
    fallbackSelector: '.nav-more-btn',
    icon: 'film',
    title: 'Каталог аниме',
    text: '24 тайтла с постерами. Нажми на любую карточку — откроется разбор фразы со словами и озвучкой.',
    hint: 'Карточка открывается кликом'
  },
  {
    selector: '.footer-donate',
    mobileSelector: '.footer-donate',
    icon: 'heart',
    title: 'Поддержка и документы',
    text: 'Внизу — кнопка «Поддержать», политика конфиденциальности и настройки cookies. Всё в одном месте.',
    hint: 'Листай вниз'
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

/** Иконка шага. */
function tourStepIcon(name) {
  if (typeof icon === 'function') return icon(name);
  return '';
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

  // Стрелка-указатель на подсвеченный элемент
  const pointer = document.createElement('div');
  pointer.className = 'tour-pointer';
  pointer.id = 'tourPointer';
  pointer.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true">' +
    '<path d="M8 6c18 2 34 14 40 32l8-9 2 24-24-3 9-8C36 26 24 12 8 6Z"/></svg>';

  const card = document.createElement('div');
  card.className = 'tour-card';
  card.id = 'tourCard';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.innerHTML = `
    <button class="tour-skip" onclick="endTour()">Пропустить</button>
    <div class="tour-step-count" id="tourCount"></div>
    <h4><span class="tour-icon" id="tourIcon"></span><span id="tourTitle"></span></h4>
    <p id="tourText"></p>
    <div class="tour-hint" id="tourHint"></div>
    <div class="tour-progress"><span id="tourProgress"></span></div>
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
  document.body.appendChild(pointer);
  document.body.appendChild(card);

  tourEls = { layer, spot, pointer, card };

  window.addEventListener('resize', updateTourSpot, { passive: true });
  window.addEventListener('scroll', updateTourSpot, { passive: true });
  document.addEventListener('keydown', tourKeys);
}

/** Выбирает элемент шага с учётом размера экрана. */
function resolveStepElement(step) {
  const narrow = window.innerWidth <= 900;

  const candidates = narrow
    ? [step.mobileSelector, step.selector, step.fallbackSelector]
    : [step.selector, step.fallbackSelector, step.mobileSelector];

  for (const selector of candidates) {
    if (!selector) continue;
    const el = document.querySelector(selector);
    if (el) return el;
  }

  return null;
}

/** Стартует тур с начала. */
function startTour(force = false) {
  if (!force && isTourDone()) return;
  if (typeof currentInterfaceLanguage === 'function' && currentInterfaceLanguage() !== 'ru') {
    // Тур написан по-русски — при другом языке не мешаем
    return;
  }

  tourSteps = TOUR_STEPS
    .map(step => {
      const el = resolveStepElement(step);
      return el ? Object.assign({}, step, { el }) : null;
    })
    .filter(Boolean);

  if (!tourSteps.length) return;

  mountTour();
  tourIndex = 0;

  document.body.classList.add('tour-on');
  document.documentElement.style.overflow = 'hidden';
  tourEls.layer.classList.add('is-visible');
  tourEls.spot.classList.add('is-visible');
  tourEls.pointer.classList.add('is-visible');
  tourEls.card.classList.add('is-visible');

  renderTourStep();
}

/** Показывает текущий шаг. */
function renderTourStep() {
  const step = tourSteps[tourIndex];
  if (!step) return endTour();

  // Элемент могли перерисовать — ищем заново
  step.el = resolveStepElement(step) || step.el;

  const { card, spot } = tourEls;

  // Прокручиваем так, чтобы элемент был виден целиком
  const rect = step.el.getBoundingClientRect();
  if (rect.top < 90 || rect.bottom > window.innerHeight - 160) {
    if (typeof step.el.scrollIntoView === 'function') {
      step.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  document.getElementById('tourCount').textContent = `Шаг ${tourIndex + 1} из ${tourSteps.length}`;
  document.getElementById('tourTitle').textContent = step.title;
  document.getElementById('tourText').textContent = step.text;
  document.getElementById('tourIcon').innerHTML = tourStepIcon(step.icon);

  const hint = document.getElementById('tourHint');
  hint.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>' +
    '<span></span>';
  hint.querySelector('span').textContent = step.hint || 'Смотри сюда';

  // Прогресс и точки
  document.getElementById('tourProgress').style.width =
    ((tourIndex + 1) / tourSteps.length * 100) + '%';

  document.getElementById('tourDots').innerHTML = tourSteps
    .map((item, index) => `<span class="tour-dot${index === tourIndex ? ' is-active' : ''}"></span>`)
    .join('');

  document.getElementById('tourPrev').disabled = tourIndex === 0;
  document.getElementById('tourNext').textContent = tourIndex === tourSteps.length - 1 ? 'Готово' : 'Дальше';

  spot.classList.add('is-moving');
  setTimeout(() => spot.classList.remove('is-moving'), 320);

  updateTourSpot();
  placeTourCard();
}

/** Ставит «прожектор» на текущий элемент. */
function updateTourSpot() {
  if (!tourEls || !tourEls.spot.classList.contains('is-visible')) return;

  const step = tourSteps[tourIndex];
  if (!step || !step.el) return;

  const rect = step.el.getBoundingClientRect();
  const pad = 10;

  tourEls.spot.style.top = (rect.top - pad) + 'px';
  tourEls.spot.style.left = (rect.left - pad) + 'px';
  tourEls.spot.style.width = (rect.width + pad * 2) + 'px';
  tourEls.spot.style.height = (rect.height + pad * 2) + 'px';

  placeTourCard();
  placeTourPointer(rect);
}

/** Ставит стрелку между подсказкой и элементом. */
function placeTourPointer(rect) {
  const pointer = tourEls && tourEls.pointer;
  if (!pointer) return;

  const cardRect = tourEls.card.getBoundingClientRect();
  const size = window.innerWidth <= 760 ? 48 : 64;

  // Подсказка ниже элемента → стрелка над подсказкой смотрит вверх
  const cardBelow = cardRect.top > rect.bottom;

  let top = cardBelow ? rect.bottom + 6 : rect.top - size - 6;
  let left = rect.left + rect.width / 2 - size / 2;

  // Не налезаем на карточку
  if (cardBelow) top = Math.min(top, cardRect.top - size - 4);
  else top = Math.max(top, cardRect.bottom + 4);

  left = Math.max(8, Math.min(left, window.innerWidth - size - 8));

  pointer.style.width = size + 'px';
  pointer.style.height = size + 'px';
  pointer.style.top = top + 'px';
  pointer.style.left = left + 'px';

  // Вверх ногами, когда стрелка под элементом
  pointer.style.transform = cardBelow ? '' : 'scaleY(-1)';
}

/** Размещает подсказку рядом с подсветкой, не вылезая за экран. */
function placeTourCard() {
  const step = tourSteps[tourIndex];
  if (!step || !tourEls) return;

  const { card } = tourEls;
  const rect = step.el.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const gap = 34;
  const margin = 12;

  const width = Math.min(window.innerWidth <= 760 ? 999 : 470, window.innerWidth - margin * 2);

  let top = rect.bottom + gap;
  let left = rect.left + rect.width / 2 - width / 2;

  if (top + cardRect.height > window.innerHeight - margin) {
    const above = rect.top - cardRect.height - gap;
    top = above > margin ? above : window.innerHeight - cardRect.height - margin;
  }

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
    tourEls.pointer.classList.remove('is-visible');
    tourEls.card.classList.remove('is-visible');
  }

  document.body.classList.remove('tour-on');
  document.documentElement.style.overflow = '';
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

  closeMobileNav();
  document.getElementById('tourLayer')?.remove();
  document.getElementById('tourSpot')?.remove();
  document.getElementById('tourPointer')?.remove();
  document.getElementById('tourCard')?.remove();

  tourEls = null;
  startTour(true);

  if (typeof showToast === 'function' && !tourEls) {
    showToast('Тур недоступен', 'На этой странице нет нужных элементов — попробуй с главной', 'warning');
  }
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  if (isTourDone()) return;

  const hasConsent = typeof getConsent === 'function' && getConsent();

  if (hasConsent) {
    setTimeout(() => startTour(), 900);
    return;
  }

  // Не спорим с карточкой cookies: сначала согласие, потом тур
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
