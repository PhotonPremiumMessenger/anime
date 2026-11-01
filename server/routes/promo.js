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
const { findPromo, publicPromos } = require('../promo');

const router = express.Router();

router.use(requireAuth);

/**
 * POST /api/promo/redeem { code }
 *
 * Сервер сам решает, можно ли активировать код, и записывает факт
 * активации. Награду выдаёт браузер (опыт, рамки, значки живут
 * в аккаунте) — сервер возвращает её в ответе.
 */
router.post('/redeem', (req, res) => {
  const raw = String((req.body && req.body.code) || '');
  const promo = findPromo(raw);

  if (!promo) {
    return res.status(404).json({ message: 'Такого кода нет. Проверьте написание' });
  }

  if (db.hasRedeemedPromo(req.user.id, promo.code)) {
    return res.status(409).json({ message: 'Этот код уже активирован на вашем аккаунте' });
  }

  // Одноразовый код: смотрим, не забрал ли его кто-то раньше
  if (promo.limit === 'global-once' && db.countPromoUses(promo.code) > 0) {
    return res.status(410).json({ message: 'Код уже активирован другим игроком' });
  }

  const saved = db.redeemPromo(req.user.id, promo.code, promo.reward);
  if (!saved) {
    return res.status(409).json({ message: 'Код уже активирован' });
  }

  return res.json({
    ok: true,
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

/** GET /api/promo/list — открытые коды (без спрятанных). */
router.get('/list', (req, res) => {
  res.json({
    ok: true,
    codes: publicPromos().map(item => ({
      code: item.code,
      title: item.title,
      desc: item.desc,
      reward: item.reward
    }))
  });
});

module.exports = router;
