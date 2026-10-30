/* ============================================================
   consent.js — cookies простыми словами
   Один раз при первом заходе показываем карточку: что такое
   cookies, что мы сохраняем, а что — нет. Выбор лежит в
   localStorage под ключом nihongo_consent, отозвать можно
   кнопкой в подвале.
   ============================================================ */

'use strict';

const CONSENT_KEY = 'nihongo_consent';

/** Читает сохранённое согласие. */
function getConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

/** Записывает согласие. */
function saveConsent(data) {
  const payload = Object.assign({
    necessary: true,
    functional: true,
    analytics: false,
    date: new Date().toISOString()
  }, data);

  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
  } catch (error) {
    /* приватный режим — молча продолжаем */
  }

  applyConsent(payload);
  return payload;
}

/**
 * Применяет согласие: выключает необязательные функции.
 * Сейчас единственная необязательная вещь — запоминание
 * настроек между визитами (функциональные).
 */
function applyConsent(consent) {
  document.documentElement.dataset.consent = consent ? 'given' : 'none';
  if (!consent) return;

  // Если функциональные выключены — не подгружаем сохранённую тему
  if (consent.functional === false) {
    document.body.classList.add('no-functional-storage');
  } else {
    document.body.classList.remove('no-functional-storage');
  }
}

/* ---------- Карточка при первом заходе ---------- */

function mountConsentBanner() {
  if (document.getElementById('cookieBanner')) return;

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.id = 'cookieBanner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Про cookies');

  banner.innerHTML = `
    <div class="cookie-card">
      <div class="cookie-head">
        <span class="cookie-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 9 9 3.6 3.6 0 0 1-4.4-4.1A3.6 3.6 0 0 1 12 3Z" stroke-linejoin="round"/>
            <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none"/>
            <circle cx="9.6" cy="15" r="1.1" fill="currentColor" stroke="none"/>
            <circle cx="14.4" cy="13.4" r="1.1" fill="currentColor" stroke="none"/>
          </svg>
        </span>
        <div>
          <b>Пара слов про cookies</b>
          <span class="cookie-sub">Прежде чем начнём — это займёт 10 секунд</span>
        </div>
      </div>

      <p class="cookie-text">
        Cookies — маленькие записи, которые сайт оставляет в браузере, чтобы
        помнить тебя. У AniLingo нет сервера: всё (уровень, опыт, слова, тема)
        лежит в <b>localStorage</b> прямо на твоём устройстве.
      </p>

      <ul class="cookie-list">
        <li><span class="ck ck-yes">${icon('check')}</span><span><b>Сохраняем:</b> прогресс, аккаунт, настройки, выбранную тему.</span></li>
        <li><span class="ck ck-no">${icon('close')}</span><span><b>Не сохраняем:</b> рекламу, трекеры, историю по сайтам.</span></li>
        <li><span class="ck ck-no">${icon('close')}</span><span><b>Не передаём:</b> данные третьим лицам — их просто нет.</span></li>
      </ul>

      <div class="cookie-actions">
        <button class="btn btn-primary" onclick="acceptCookies()">Понятно, продолжить</button>
        <button class="btn btn-outline" onclick="openCookiesSettings()">Настроить</button>
        <a class="cookie-link" href="privacy.html">Политика конфиденциальности</a>
      </div>
    </div>
  `;

  document.body.appendChild(banner);
}

/** Показывает карточку (с задержкой, чтобы не спорить с загрузчиком). */
function showConsentBanner() {
  mountConsentBanner();
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;

  // Даём странице дорисоваться, потом мягко выезжаем
  requestAnimationFrame(() => {
    setTimeout(() => banner.classList.add('is-visible'), 420);
  });
}

/** Скрывает карточку. */
function hideConsentBanner() {
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;

  banner.classList.remove('is-visible');
  setTimeout(() => banner.classList.add('is-hidden'), 400);
}

/** «Понятно, продолжить». */
function acceptCookies() {
  saveConsent({ necessary: true, functional: true, analytics: false });
  hideConsentBanner();

  if (typeof showToast === 'function') {
    showToast('Cookies настроены', 'Прогресс будет сохраняться в этом браузере.', 'success');
  }
}

/** Сохранение из модалки настроек. */
function saveCookieChoices() {
  const functional = document.getElementById('ckFunctional');
  const analytics = document.getElementById('ckAnalytics');

  saveConsent({
    necessary: true,
    functional: functional ? functional.checked : true,
    analytics: analytics ? analytics.checked : false
  });

  closeCookiesSettings();
  hideConsentBanner();

  if (typeof showToast === 'function') {
    showToast('Настройки cookies сохранены', 'Изменения применяются сразу.', 'success');
  }
}

/* ---------- Модалка настроек ---------- */

function mountCookieSettings() {
  if (document.getElementById('cookiesModal')) return;

  const consent = getConsent() || {};

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'cookiesModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="modal cookie-modal">
      <button class="modal-close" onclick="closeCookiesSettings()" aria-label="Закрыть">✕</button>

      <h3>Настройки cookies</h3>
      <p class="muted small">AniLingo не использует рекламные трекеры. Ниже — только то,
        что действительно влияет на работу сайта.</p>

      <div class="cookie-row">
        <div>
          <b>Необходимые</b>
          <span>Вход в аккаунт, прогресс, безопасность. Без них сайт не работает.</span>
        </div>
        <span class="cookie-always">Всегда включены</span>
      </div>

      <div class="cookie-row">
        <div>
          <b>Функциональные</b>
          <span>Тема, размер шрифта, голос озвучки, пройденная инструкция.</span>
        </div>
        <label class="switch">
          <input type="checkbox" id="ckFunctional" ${consent.functional === false ? '' : 'checked'}>
          <span class="switch-track"><span class="switch-thumb"></span></span>
        </label>
      </div>

      <div class="cookie-row">
        <div>
          <b>Аналитика</b>
          <span>Счётчиков и пикселей у нас нет — переключатель на будущее.</span>
        </div>
        <label class="switch">
          <input type="checkbox" id="ckAnalytics" ${consent.analytics ? 'checked' : ''}>
          <span class="switch-track"><span class="switch-thumb"></span></span>
        </label>
      </div>

      <div class="btn-row mt-20">
        <button class="btn btn-primary" onclick="saveCookieChoices()">Сохранить выбор</button>
        <button class="btn btn-outline" onclick="resetCookies()">Удалить данные сайта</button>
      </div>
    </div>
  `;

  modal.addEventListener('click', event => {
    if (event.target === modal) closeCookiesSettings();
  });

  document.body.appendChild(modal);
}

/** Открывает настройки cookies (используется в подвале). */
function openCookiesSettings() {
  mountCookieSettings();

  // Свежие значения перед открытием
  const consent = getConsent() || {};
  const functional = document.getElementById('ckFunctional');
  const analytics = document.getElementById('ckAnalytics');

  if (functional) functional.checked = consent.functional !== false;
  if (analytics) analytics.checked = Boolean(consent.analytics);

  const modal = document.getElementById('cookiesModal');
  if (modal) modal.classList.add('open');
  document.body.classList.add('modal-open');
  document.addEventListener('keydown', cookiesEsc);
}

/** Esc закрывает настройки cookies. */
function cookiesEsc(event) {
  if (event.key === 'Escape') closeCookiesSettings();
}

/** Закрывает настройки. */
function closeCookiesSettings() {
  const modal = document.getElementById('cookiesModal');
  if (modal) modal.classList.remove('open');
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', cookiesEsc);
}

/** Полный сброс локальных данных. */
function resetCookies() {
  const sure = confirm('Удалить все данные сайта: аккаунт, прогресс и настройки? Действие необратимо.');
  if (!sure) return;

  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith('nihongo_') || ['theme', 'settings', 'avatar'].includes(key))
      .forEach(key => localStorage.removeItem(key));
  } catch (error) {
    /* пусто */
  }

  closeCookiesSettings();
  location.reload();
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', () => {
  const consent = getConsent();
  applyConsent(consent);

  // Первый заход — объясняем; повторный — молчим
  if (!consent) showConsentBanner();
});

window.openCookiesSettings = openCookiesSettings;
window.closeCookiesSettings = closeCookiesSettings;
window.acceptCookies = acceptCookies;
window.saveCookieChoices = saveCookieChoices;
window.resetCookies = resetCookies;
window.getConsent = getConsent;
