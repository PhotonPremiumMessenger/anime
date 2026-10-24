/* ============================================================
   donate.js — поддержать проект
   Небольшая модалка с вариантами суммы. Платёжной системы пока
   нет, поэтому кнопки показывают честную заглушку и копируют
   реквизиты. Когда появится ссылка на донат — достаточно
   заменить DONATE_URL.
   ============================================================ */

'use strict';

// Куда вести после подключения платёжки (пока пусто — заглушка)
const DONATE_URL = '';

// Суммы-варианты
const DONATE_AMOUNTS = [99, 199, 499, 999];

let donateAmount = 199;

/** Собирает модалку один раз. */
function mountDonateModal() {
  if (document.getElementById('donateModal')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'donateModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal donate-modal">
      <button class="modal-close" onclick="closeDonate()" aria-label="Закрыть">✕</button>

      <div class="donate-head">
        <span class="donate-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 20.3 4.6 13a4.4 4.4 0 0 1 6.2-6.2l1.2 1.2 1.2-1.2A4.4 4.4 0 1 1 19.4 13L12 20.3Z"/>
          </svg>
        </span>
        <h3>Поддержать Nihongo</h3>
        <p>Сайт живёт без рекламы, подписок и платных курсов. Донат — это просто «спасибо»
           за уроки, постеры и мини-игры.</p>
      </div>

      <div class="donate-amounts" id="donateAmounts">
        ${DONATE_AMOUNTS.map(sum => `
          <button class="donate-sum${sum === donateAmount ? ' is-active' : ''}" onclick="pickDonateAmount(${sum}, this)">
            ${sum} ₽
          </button>
        `).join('')}
      </div>

      <div class="donate-note">
        <span class="donate-note-icon">i</span>
        <span>Платёжный сервис ещё подключается. Кнопка ниже скопирует реквизиты —
          перевод можно сделать вручную из любого банка.</span>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="sendDonate()">Поддержать на <span id="donateChosen">199</span> ₽</button>
        <button class="btn btn-outline" onclick="closeDonate()">Позже</button>
      </div>

      <p class="donate-fine muted small">Донат не открывает платные функции: всё на сайте
        и так доступно целиком. Спасибо, что помогаешь проекту жить.</p>
    </div>
  `;

  modal.addEventListener('click', event => {
    if (event.target === modal) closeDonate();
  });

  document.body.appendChild(modal);
}

/** Открывает модалку. */
function openDonate() {
  mountDonateModal();
  const modal = document.getElementById('donateModal');
  if (!modal) return;

  modal.classList.add('open');
  document.body.classList.add('modal-open');

  document.addEventListener('keydown', donateEsc);
}

/** Закрывает модалку. */
function closeDonate() {
  const modal = document.getElementById('donateModal');
  if (modal) modal.classList.remove('open');
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', donateEsc);
}

/** Esc закрывает. */
function donateEsc(event) {
  if (event.key === 'Escape') closeDonate();
}

/** Выбор суммы. */
function pickDonateAmount(sum, button) {
  donateAmount = sum;

  document.querySelectorAll('#donateAmounts .donate-sum').forEach(item => {
    item.classList.toggle('is-active', item === button);
  });

  const chosen = document.getElementById('donateChosen');
  if (chosen) chosen.textContent = sum;
}

/** Кнопка «Поддержать». */
function sendDonate() {
  if (DONATE_URL) {
    window.open(DONATE_URL, '_blank', 'noopener');
    return;
  }

  // Реквизиты-заглушка: показываем тост и копируем текст
  const details = 'Нерюнгри — Nihongo · сбер 0000 0000 0000 0000';

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(details).catch(() => {});
  }

  if (typeof showToast === 'function') {
    showToast('Спасибо за поддержку', 'Реквизиты скопированы. Платёжка скоро появится — пока перевод вручную.', 'success');
  }

  closeDonate();
}

/* ---------- Подписи в подвале ---------- */

document.addEventListener('DOMContentLoaded', () => {
  // Модалка создаётся заранее, чтобы открытие было мгновенным
  mountDonateModal();
});

/* Экспорт в глобальную область */
window.openDonate = openDonate;
window.closeDonate = closeDonate;
window.pickDonateAmount = pickDonateAmount;
window.sendDonate = sendDonate;
