/* ============================================================
   donate.js — поддержать проект
   Небольшая модалка с одной кнопкой. Кнопка открывает ссылку
   СБП: на телефоне — приложение банка, на компьютере — страница
   с QR-кодом. Сумму плательщик выбирает сам.
   ============================================================ */

'use strict';

// Ссылка СБП для приёма переводов (выдана банком)
const DONATE_URL = 'https://c2c.cbrpay.ru/BS1I0024P52CBIED8I4QA06DAM67E6RS';

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
        <h3>Поддержать AniLingo</h3>
        <p>Сайт живёт без рекламы, подписок и платных курсов. Донат — это просто «спасибо»
           за уроки, постеры и мини-игры.</p>
      </div>

      <div class="donate-note">
        <span class="donate-note-icon">i</span>
        <span>Перевод по СБП с карты любого банка. Откроется страница оплаты:
          на телефоне — приложение банка, на компьютере — QR-код.</span>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" onclick="sendDonate()">Поддержать</button>
        <button class="btn btn-outline" onclick="closeDonate()">Позже</button>
      </div>

      <p class="donate-fine muted small">Сумма любая — сколько не жалко. Донат не открывает платные функции:
        всё на сайте и так доступно целиком. Спасибо, что помогаешь проекту жить.</p>
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

/** Кнопка «Поддержать»: уводит на страницу оплаты СБП. */
function sendDonate() {
  // Новая вкладка, чтобы сайт остался открытым
  const win = window.open(DONATE_URL, '_blank', 'noopener');

  // Если браузер заблокировал новую вкладку — переходим в текущей
  if (!win) window.location.href = DONATE_URL;

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
window.sendDonate = sendDonate;
