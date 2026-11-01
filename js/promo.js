/* ============================================================
   promo.js — промокоды на странице promo

   Как работает:
   • Открытые коды показаны внизу страницы — их можно копировать.
   • Два кода спрятаны по сайту: подсказки есть в пасхалках
     и в офлайн-странице. На странице промокодов их нет.
   • Код TENNO — один на весь сайт: 100 000 XP получает первый
     активировавший. Проверка живёт на сервере, поэтому очистка
     браузера его не «оживит».
   • Остальные коды каждый аккаунт может активировать один раз.

   Награда выдаётся здесь: опыт, рамка, значок или тема.
   ============================================================ */

'use strict';

// Какие коды уже активировал этот аккаунт (для локального режима)
const PROMO_KEY = 'anilingo_promo_used';

// Тот же список, что на сервере (server/promo.js): открытые коды
const PROMO_PUBLIC = [
  { code: 'ANILINGO', title: 'Стартовый набор', desc: 'Первый код для всех: немного опыта на разгон', reward: { xp: 500 } },
  { code: 'SAKURA', title: 'Ветка сакуры', desc: 'Значок «Сакура» и запас опыта', reward: { xp: 200, badge: 'badge-sakura' } },
  { code: 'KITSUNE', title: 'Хитрый лис', desc: 'Опыт за внимательность', reward: { xp: 750 } },
  { code: 'ONIGIRI', title: 'Онигири на удачу', desc: 'Значок «Первые шаги» и опыт', reward: { xp: 300, badge: 'badge-first-steps' } },
  { code: 'SENSEI', title: 'Сэнсэй одобряет', desc: 'За опыт и упорство — целая тысяча', reward: { xp: 1000 } }
];

/* ---------- Локальные активации ---------- */

/** Коды, активированные на этом аккаунте (локальный режим). */
function promoUsedList() {
  const saved = readJSON(PROMO_KEY, {});
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const owner = user ? user.username : 'guest';

  const list = saved && Array.isArray(saved[owner]) ? saved[owner] : [];
  return list.map(code => String(code).toUpperCase());
}

/** Запоминает активацию в браузере. */
function promoMarkUsed(code) {
  const saved = readJSON(PROMO_KEY, {});
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const owner = user ? user.username : 'guest';

  const all = saved && typeof saved === 'object' ? saved : {};
  const list = Array.isArray(all[owner]) ? all[owner] : [];

  if (!list.includes(code)) list.push(code);
  all[owner] = list;

  writeJSON(PROMO_KEY, all);
}

/** Активирован ли код этим аккаунтом (по локальной памяти). */
function promoIsUsed(code) {
  return promoUsedList().includes(String(code).toUpperCase());
}

/* ---------- Выдача награды ---------- */

/**
 * Применяет награду промокода: опыт, рамка, значок или тема.
 * Возвращает человеческое описание того, что выдали.
 */
function applyPromoReward(reward) {
  const parts = [];
  const prize = reward || {};

  if (prize.xp) {
    if (typeof addXP === 'function') {
      addXP(Number(prize.xp) || 0, 'Промокод');
      parts.push('+' + Number(prize.xp).toLocaleString('ru-RU') + ' XP');
    }
  }

  // Рамки и предметы магазина: выдаём без списания опыта
  ['frame', 'item', 'badge', 'theme'].forEach(kind => {
    const id = prize[kind];
    if (!id || typeof unlockShopItem !== 'function') return;

    const item = typeof getShopItem === 'function' ? getShopItem(id) : null;
    if (!item) return;

    const fresh = unlockShopItem(id, 'event', true);
    if (fresh) parts.push('«' + item.name + '»');

    // Рамку сразу надеваем, чтобы награда была видна.
    // equipShopItem при повторном вызове снимает предмет — поэтому
    // сначала проверяем, не надета ли она уже.
    if (kind === 'frame' && typeof equipShopItem === 'function') {
      const state = typeof getShopState === 'function' ? getShopState() : null;
      const worn = state && state.equipped && state.equipped.frame;
      if (worn !== id) equipShopItem(id, true);
    }
  });

  return parts.join(' · ');
}

/**
 * Активирует код.
 * В удалённом режиме решает сервер, в локальном — браузер.
 * @returns {Promise<{ok: boolean, message: string, reward?: string}>}
 */
async function redeemPromo(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();

  if (!code) {
    return { ok: false, message: 'Введите код' };
  }

  // Гость не получает ни опыта, ни предметов
  if (typeof accountIsActive === 'function' && !accountIsActive()) {
    return { ok: false, message: 'Промокоды доступны только аккаунту. Войдите или зарегистрируйтесь' };
  }

  if (promoIsUsed(code)) {
    return { ok: false, message: 'Этот код уже активирован на вашем аккаунте' };
  }

  const mode = typeof apiModeNow === 'function' ? await apiModeNow() : 'local';

  if (mode === 'remote' && typeof apiRequest === 'function') {
    const response = await apiRequest('/api/promo/redeem', {
      method: 'POST',
      body: { code: code }
    });

    if (!response.ok) {
      const message = response.data && response.data.message
        ? response.data.message
        : 'Не удалось активировать код';
      return { ok: false, message: message };
    }

    const promo = response.data.promo || {};
    const reward = applyPromoReward(promo.reward || {});
    promoMarkUsed(code);

    return {
      ok: true,
      message: promo.title || 'Код активирован',
      reward: reward || 'Награда уже была у вас'
    };
  }

  // Локальный режим: список кодов тот же, что на сервере
  const promo = findLocalPromo(code);
  if (!promo) {
    return { ok: false, message: 'Такого кода нет. Проверьте написание' };
  }

  const reward = applyPromoReward(promo.reward || {});
  promoMarkUsed(code);

  return {
    ok: true,
    message: promo.title || 'Код активирован',
    reward: reward || 'Награда уже была у вас'
  };
}

/** Поиск кода в локальном списке (без спрятанных: их знает сервер). */
function findLocalPromo(code) {
  const all = PROMO_PUBLIC.concat(PROMO_EXTRA);
  return all.find(item => item.code === code) || null;
}

// Спрятанные коды тоже должны работать без сервера
const PROMO_EXTRA = [
  { code: 'SHINIGAMI', title: 'Тетрадь смерти', reward: { xp: 5000, frame: 'frame-hands' } },
  { code: 'YAMETE', title: 'Стоп, это секрет', reward: { xp: 7500, badge: 'badge-samurai' } },
  { code: 'TENNO', title: 'Императорский указ', reward: { xp: 100000 } }
];

/* ---------- Страница промокодов ---------- */

/** Человеческое описание награды для карточки кода. */
function promoRewardText(reward) {
  const parts = [];
  const prize = reward || {};

  if (prize.xp) parts.push('+' + Number(prize.xp).toLocaleString('ru-RU') + ' XP');

  ['frame', 'badge', 'item', 'theme'].forEach(kind => {
    const id = prize[kind];
    if (!id || typeof getShopItem !== 'function') return;

    const item = getShopItem(id);
    if (item) parts.push('«' + item.name + '»');
  });

  return parts.join(' · ') || 'Награда';
}

/** Рисует список открытых промокодов внизу страницы. */
function renderPromoList() {
  const list = document.getElementById('promoList');
  if (!list) return;

  list.innerHTML = PROMO_PUBLIC.map(item => `
    <article class="promo-card">
      <div class="promo-card-head">
        <b class="promo-card-code">${item.code}</b>
        <span class="promo-card-reward">${promoRewardText(item.reward)}</span>
      </div>
      <h3 class="promo-card-title"></h3>
      <p class="promo-card-desc"></p>
      <button class="btn btn-outline btn-small promo-card-use" type="button">Ввести код</button>
    </article>
  `).join('');

  // Текст подставляем через textContent: никакого HTML из данных
  const cards = list.querySelectorAll('.promo-card');

  PROMO_PUBLIC.forEach((item, index) => {
    const card = cards[index];
    if (!card) return;

    card.querySelector('.promo-card-title').textContent = item.title;
    card.querySelector('.promo-card-desc').textContent = item.desc;

    card.querySelector('.promo-card-use').addEventListener('click', () => {
      const input = document.getElementById('promoInput');
      if (input) input.value = item.code;
      submitPromoCode();
    });
  });
}

/** Отправляет код из поля и показывает результат. */
async function submitPromoCode() {
  const input = document.getElementById('promoInput');
  const button = document.getElementById('promoSubmit');
  if (!input) return;

  const code = input.value.trim();
  if (!code) {
    if (typeof showToast === 'function') showToast('Пустой код', 'Введите промокод из списка ниже', 'warning');
    input.focus();
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'Проверяем...';
  }

  const result = await redeemPromo(code);

  if (button) {
    button.disabled = false;
    button.textContent = 'Активировать';
  }

  if (!result.ok) {
    if (typeof showToast === 'function') showToast('Код не подошёл', result.message, 'error', { duration: 5200 });

    // Поле подсвечиваем, чтобы было видно, где ошибка
    input.classList.add('is-invalid');
    window.setTimeout(() => input.classList.remove('is-invalid'), 1600);
    return;
  }

  input.value = '';
  renderPromoHistory();

  if (typeof showToast === 'function') {
    showToast('Код активирован: ' + result.message, result.reward, 'success', { duration: 6200, icon: 'gift' });
  }

  // Опыт и покупки могли измениться — обновляем верх страницы
  if (typeof refreshAniLingoUI === 'function') refreshAniLingoUI();
  if (typeof renderShop === 'function' && document.getElementById('shopGrid')) renderShop();
}

/** Активированные коды: список «уже использовано». */
function renderPromoHistory() {
  const box = document.getElementById('promoHistory');
  if (!box) return;

  const used = promoUsedList();

  if (!used.length) {
    box.innerHTML = '<p class="promo-empty">Пока ни один код не активирован. Начните с ANILINGO — он для всех.</p>';
    return;
  }

  box.innerHTML = used.map(code => {
    const item = findLocalPromo(code);
    const title = item ? item.title : 'Активирован';
    return '<span class="promo-used-chip"><b>' + code + '</b>' + title + '</span>';
  }).join('');
}

/** Подтягивает активированные коды с сервера на странице промокодов. */
async function promoHydrate() {
  const box = document.getElementById('promoHistory');
  if (!box) return;

  if (typeof apiModeNow !== 'function' || typeof apiRequest !== 'function') return;

  const mode = await apiModeNow();
  if (mode !== 'remote') return;

  const response = await apiRequest('/api/promo/mine');
  if (!response.ok || !response.data || !Array.isArray(response.data.codes)) return;

  // Запоминаем у себя, чтобы история и проверки совпадали с сервером
  response.data.codes.forEach(item => promoMarkUsed(item.code));
  renderPromoHistory();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('promoForm')) return;

  renderPromoList();
  renderPromoHistory();
  promoHydrate();

  const form = document.getElementById('promoForm');
  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      submitPromoCode();
    });
  }

  // Код всегда в верхнем регистре: так проще сравнивать
  const input = document.getElementById('promoInput');
  if (input) {
    input.addEventListener('input', () => {
      const clean = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
      if (input.value !== clean) input.value = clean;
    });
  }
});

/* Экспорт */
window.PROMO_PUBLIC = PROMO_PUBLIC;
window.redeemPromo = redeemPromo;
window.submitPromoCode = submitPromoCode;
window.promoIsUsed = promoIsUsed;
window.renderPromoList = renderPromoList;
window.renderPromoHistory = renderPromoHistory;
window.applyPromoReward = applyPromoReward;
window.promoRewardText = promoRewardText;
