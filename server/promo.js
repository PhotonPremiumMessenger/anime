/* ============================================================
   promo.js — промокоды AniLingo

   Здесь лежит единственный список кодов. Его читают и сервер
   (проверка, начисления), и страница промокодов — поэтому список
   кодов и награды не могут разойтись.

   Правила:
   • limit: 'user'   — активировать может каждый аккаунт,
                       но только один раз;
   • limit: 'global' — код живёт, пока его не активировали всего
                       uses раз. Кто успел, тот и получил; после
                       последней активации код удаляется из памяти
                       сервера и с сайта целиком.

   Награда (reward):
   • xp     — сколько опыта начислить;
   • frame  — id художественной рамки (js/frames.js);
   • theme  — id темы из магазина;
   • badge  — id значка из магазина;
   • item   — любой другой товар магазина.

   hidden: true — код нигде не показан на странице: такие спрятаны
   по сайту, их находят случайно.
   ============================================================ */

'use strict';

const PROMO_CODES = [
  /* ---------- Открытые: пять штук внизу страницы промокодов ---------- */
  {
    code: 'ANILINGO',
    title: 'Стартовый набор',
    desc: 'Первый код для всех: немного опыта на разгон',
    reward: { xp: 500 },
    limit: 'user',
    hidden: false
  },
  {
    code: 'SAKURA',
    title: 'Ветка сакуры',
    desc: 'Значок «Сакура» и запас опыта',
    reward: { xp: 200, badge: 'badge-sakura' },
    limit: 'user',
    hidden: false
  },
  {
    code: 'KITSUNE',
    title: 'Хитрый лис',
    desc: 'Опыт за внимательность',
    reward: { xp: 750 },
    limit: 'user',
    hidden: false
  },
  {
    code: 'ONIGIRI',
    title: 'Онигири на удачу',
    desc: 'Значок «Первые шаги» и опыт',
    reward: { xp: 300, badge: 'badge-first-steps' },
    limit: 'user',
    hidden: false
  },
  {
    code: 'SENSEI',
    title: 'Сэнсэй одобряет',
    desc: 'За опыт и упорство — целая тысяча',
    reward: { xp: 1000 },
    limit: 'user',
    hidden: false
  },

  /* ---------- Спрятанные: искать по сайту ---------- */
  {
    code: 'SHINIGAMI',
    title: 'Тетрадь смерти',
    desc: 'Секретный код: рамка «Руки времени» и опыт',
    reward: { xp: 5000, frame: 'frame-hands' },
    limit: 'user',
    hidden: true
  },
  {
    code: 'YAMETE',
    title: 'Стоп, это секрет',
    desc: 'Секретный код: много опыта и значок «Самурай»',
    reward: { xp: 7500, badge: 'badge-samurai' },
    limit: 'user',
    hidden: true
  },

  /* ---------- Три активации на весь сайт ---------- */
  {
    code: 'TENNO',
    title: 'Императорский указ',
    desc: 'Три активации на весь сайт: 100 000 000 XP каждому, кто успеет',
    reward: { xp: 100000000 },
    limit: 'global',
    uses: 3,
    hidden: true
  }
];

/** Находит код без учёта регистра и лишних пробелов. */
function findPromo(code) {
  const needle = String(code || '').trim().toUpperCase();
  return PROMO_CODES.find(item => item.code === needle) || null;
}

/**
 * Код израсходован полностью: удаляем его из памяти сервера.
 * После этого его нет ни в списке, ни в поиске — он исчезает
 * с сайта целиком, как и просили. Записи об активациях в базе
 * остаются: по ним видно, кто получил награду.
 */
function retirePromo(code) {
  const index = PROMO_CODES.findIndex(item => item.code === code);
  if (index === -1) return false;

  PROMO_CODES.splice(index, 1);
  return true;
}

/** Сколько активаций всего разрешено коду. */
function promoLimit(promo) {
  if (!promo) return 0;
  if (promo.limit === 'global') return Math.max(1, Number(promo.uses) || 1);
  return Infinity;
}

/** Коды, которые можно показывать на странице. */
function publicPromos() {
  return PROMO_CODES.filter(item => !item.hidden);
}

module.exports = {
  PROMO_CODES,
  findPromo,
  publicPromos,
  retirePromo,
  promoLimit
};
