/* ============================================================
   routes/promo.js — промокоды

     POST /api/promo/redeem  — активировать код
     GET  /api/promo/mine    — какие коды уже активированы

   Почему на сервере, а не в браузере: одноразовый код на 100 000 XP
   должен умереть после первой активации на любом устройстве.
   Если бы проверка жила в localStorage, его можно было бы обойти,
   просто очистив кэш браузера.
   ============================================================ */

'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const { isAdmin } = require('../admins');
const { findPromo, publicPromos, retirePromo, burnPromo, promoLimit, PROMO_CODES } = require('../promo');

const router = express.Router();

// Коды, которые уже разобрали: клиентам сообщаем, чтобы они
// стёрли их у себя — на сайте от них не должно остаться следа
const RETIRED_ON_SERVER = [];

// Запоминаем удаление кода из общего списка
const remember = code => {
  const needle = String(code).toUpperCase();
  if (!RETIRED_ON_SERVER.includes(needle)) RETIRED_ON_SERVER.push(needle);
};

const retireAndRemember = code => {
  if (!retirePromo(code)) return;
  remember(code);
};

// Одноразовый код: стираем насовсем, без архива
const burnAndRemember = code => {
  if (!burnPromo(code)) return;
  remember(code);
};

/**
 * Коды, которых больше нет на сайте: израсходованные на этом запуске
 * плюс те, что уже активировали по базе (одноразовые коды живут в
 * коде программы, а база помнит, что награда выдана). Клиент по
 * этому списку стирает их у себя.
 */
function retiredCodes() {
  const known = new Set(PROMO_CODES.map(promo => promo.code));
  const fromDb = db.listRedeemedPromoCodes().filter(code => !known.has(code));

  return Array.from(new Set(RETIRED_ON_SERVER.concat(fromDb)));
}

router.use(requireAuth);

/**
 * POST /api/promo/redeem { code }
 *
 * Сервер сам решает, можно ли активировать код, и записывает факт
 * активации. Награду выдаёт браузер (опыт, рамки, значки живут
 * в аккаунте) — сервер возвращает её в ответе.
 *
 * Администратор (server/admins.js) играет без ограничений:
 *   • повторные активации разрешены;
 *   • израсходованные коды он тоже может активировать;
 *   • его активации не тратят общий лимит, поэтому чужие места
 *     на ограниченный код остаются чужими.
 */
router.post('/redeem', (req, res) => {
  const admin = isAdmin(req.user);
  const raw = String((req.body && req.body.code) || '');

  // Админу доступен и архив израсходованных кодов
  const promo = findPromo(raw, { includeRetired: admin });

  if (!promo) {
    return res.status(404).json({ message: 'Такого кода нет. Проверьте написание' });
  }

  if (!admin && db.hasRedeemedPromo(req.user.id, promo.code)) {
    return res.status(409).json({ message: 'Этот код уже активирован на вашем аккаунте' });
  }

  // Общий на весь сайт: смотрим, не разобрали ли его раньше
  const limit = promoLimit(promo);
  if (!admin && Number.isFinite(limit) && db.countPromoUses(promo.code) >= limit) {
    // Мест не осталось — код больше не существует
    retireAndRemember(promo.code);
    return res.status(404).json({ message: 'Такого кода нет. Проверьте написание' });
  }

  const saved = db.redeemPromo(req.user.id, promo.code, promo.reward, { admin: admin });
  if (!saved) {
    return res.status(409).json({ message: 'Код уже активирован' });
  }

  // Одноразовый код стирается сразу после активации — и у админа тоже
  if (promo.burn) {
    burnAndRemember(promo.code);

    return res.json({
      ok: true,
      admin: Boolean(admin),
      exhausted: true,
      left: 0,
      promo: {
        code: promo.code,
        title: promo.title,
        desc: promo.desc,
        reward: promo.reward
      }
    });
  }

  // Админ не тратит места: код остаётся живым для остальных
  if (admin) {
    return res.json({
      ok: true,
      admin: true,
      exhausted: false,
      left: null,
      promo: {
        code: promo.code,
        title: promo.title,
        desc: promo.desc,
        reward: promo.reward
      }
    });
  }

  // Последняя активация — код исчезает с сайта целиком
  const used = db.countPromoUses(promo.code);
  const exhausted = Number.isFinite(limit) && used >= limit;
  if (exhausted) retireAndRemember(promo.code);

  return res.json({
    ok: true,
    exhausted: exhausted,
    left: Number.isFinite(limit) ? Math.max(0, limit - used) : null,
    promo: {
      code: promo.code,
      title: promo.title,
      desc: promo.desc,
      reward: promo.reward
    }
  });
});

/** GET /api/promo/mine — активированные коды этого аккаунта. */
router.get('/mine', (req, res) => {
  res.json({ ok: true, codes: db.getUserPromos(req.user.id) });
});

/**
 * GET /api/promo/list — открытые коды и статус закрытых.
 *
 * retired — коды, которые израсходованы полностью (в том числе
 * одноразовые вроде TENNO). Клиент по этому списку стирает их у
 * себя: на сайте их больше не найти.
 */
router.get('/list', (req, res) => {
  res.json({
    ok: true,
    codes: publicPromos().map(item => ({
      code: item.code,
      title: item.title,
      desc: item.desc,
      reward: item.reward
    })),
    retired: retiredCodes()
  });
});

module.exports = router;
