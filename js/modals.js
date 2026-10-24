/* ============================================================
   modals.js — единый каркас модальных окон
   Любое окно (.modal) превращается в три части:
   шапка (не скроллится) → тело (скроллится) → кнопки (всегда
   видны внизу). Работает и для окон из HTML, и для тех, что
   рисуют скрипты после загрузки страницы.
   ============================================================ */

'use strict';

// Что считаем рядом кнопок: его переносим в нижнюю панель
const MODAL_ACTIONS = '.btn-row, .modal-actions, .cookie-actions, .donate-actions';

// Хвостовые подписи, которые логично оставить под кнопками
const MODAL_TAIL = 'p, small, .muted, .small, .donate-fine, .modal-fine, .custom-hint';

/** Это ряд с кнопками? */
function isModalActions(el) {
  return Boolean(el && el.nodeType === 1 && el.matches(MODAL_ACTIONS));
}

/** Это мелкая подпись под кнопками? */
function isModalTail(el) {
  return Boolean(el && el.nodeType === 1 && el.matches(MODAL_TAIL));
}

/**
 * Разбирает одно окно на шапку, тело и нижнюю панель.
 * @param {HTMLElement} modal — элемент с классом .modal
 */
function enhanceModal(modal) {
  if (!modal || modal.dataset.modalReady === '1') return;
  if (modal.dataset.noModalEnhance === '1') return;

  modal.dataset.modalReady = '1';

  const head = modal.querySelector(':scope > .modal-head');

  // Тело: своё уже может быть (окно аниме) — иначе переносим содержимое
  let body = modal.querySelector(':scope > .modal-body') || modal.querySelector(':scope > #animeModalBody');

  if (!body) {
    body = document.createElement('div');
    body.className = 'modal-body';

    const movable = Array.from(modal.children).filter(child => {
      if (child === head) return false;
      if (child.classList.contains('modal-close')) return false;
      if (child.classList.contains('modal-icon')) return false;
      if (child.classList.contains('modal-foot')) return false;
      if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return false;
      return true;
    });

    movable.forEach(child => body.appendChild(child));
    modal.appendChild(body);
  } else {
    body.classList.add('modal-body');
  }

  // Нижняя панель: последний ряд кнопок и мелкие подписи после него.
  // Окна, которые перерисовывают тело целиком, помечаем data-modal-nofoot.
  if (modal.dataset.modalNofoot !== '1' && !modal.querySelector(':scope > .modal-foot')) {
    const children = Array.from(body.children);
    const index = children.map((child, i) => (isModalActions(child) ? i : -1)).filter(i => i >= 0).pop();

    if (index !== undefined) {
      const tail = children.slice(index);
      const onlyNotes = tail.slice(1).every(isModalTail);

      if (onlyNotes) {
        const foot = document.createElement('div');
        foot.className = 'modal-foot';
        tail.forEach(child => foot.appendChild(child));
        modal.appendChild(foot);
      }
    }
  }

  // Пустое тело не должно занимать пол-экрана
  if (body && !body.children.length) body.classList.add('is-empty');
}

/** Разбирает все окна в поддереве. */
function enhanceModals(root = document) {
  if (!root || root.nodeType !== 1) return;

  if (root.matches && root.matches('.modal')) enhanceModal(root);

  root.querySelectorAll('.modal').forEach(enhanceModal);
}

/* ---------- Следим за окнами, которые рисуют скрипты ---------- */

let modalObserver = null;

/** Запускает наблюдение за новыми окнами. */
function watchModals() {
  if (modalObserver || typeof MutationObserver !== 'function') return;

  modalObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;

        // Чаще всего добавляются карточки и тосты — их пропускаем сразу
        if (node.matches('.modal-overlay, .modal')) {
          enhanceModals(node);
          return;
        }

        if (node.querySelector && node.querySelector('.modal')) enhanceModals(node);
      });
    });
  });

  modalObserver.observe(document.body, { childList: true, subtree: true });
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  enhanceModals(document.body);
  watchModals();
});

/* Страховка: часть окон собирается по таймеру после загрузки */
window.addEventListener('load', () => {
  setTimeout(() => enhanceModals(document.body), 400);
});

window.enhanceModal = enhanceModal;
window.enhanceModals = enhanceModals;
