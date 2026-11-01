/* ============================================================
   promo.js — промокоды AniLingo

   Здесь лежит единственный список кодов. Его читают и сервер
   (проверка, начисления), и страница промокодов — поэтому список
   кодов и награды не могут разойтись.

   Правила:
   • limit: 'user'        — активировать может каждый аккаунт,
                            но только один раз;
   • limit: 'global-once' — код живёт до первой активации. Кто
                            успел, тот и получил; дальше он мёртв.

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

  /* ---------- Один на весь сайт ---------- */
  {
    code: 'TENNO',
    title: 'Императорский указ',
    desc: 'Одна активация на весь сайт: 100 000 XP первому',
    reward: { xp: 100000 },
    limit: 'global-once',
    hidden: true
  }
];

/** Находит код без учёта регистра и лишних пробелов. */
function findPromo(code) {
  const needle = String(code || '').trim().toUpperCase();
  return PROMO_CODES.find(item => item.code === needle) || null;
}

/** Коды, которые можно показывать на странице. */
function publicPromos() {
  return PROMO_CODES.filter(item => !item.hidden);
}

module.exports = {
  PROMO_CODES,
  findPromo,
  publicPromos
};
