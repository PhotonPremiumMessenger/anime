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
const { findPromo, publicPromos, retirePromo, promoLimit } = require('../promo');

const router = express.Router();

// Коды, которые уже разобрали: клиентам сообщаем, чтобы они
// стёрли их у себя — на сайте от них не должно остаться следа
const RETIRED_ON_SERVER = [];

// Запоминаем удаление кода из общего списка
const retireAndRemember = code => {
  if (!retirePromo(code)) return;

  const needle = String(code).toUpperCase();
  if (!RETIRED_ON_SERVER.includes(needle)) RETIRED_ON_SERVER.push(needle);
};

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
 * retired — коды, которые израсходованы полностью. Клиент по этому
 * списку стирает их у себя: на сайте их больше не найти.
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
    retired: RETIRED_ON_SERVER
  });
});

module.exports = router;
