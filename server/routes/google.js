/* ============================================================
   routes/google.js — адреса входа через Google

     GET /auth/google           — уводит на страницу согласия Google
     GET /auth/google/callback  — принимает ответ Google и выдаёт JWT

   Маршруты живут в корне, а не под /api: это адреса для браузера,
   по ним ходят редиректом, а не fetch-запросом.

   После успешного входа человек уезжает на /complete-profile
   с токеном и адресом возврата в хвосте после #:
       /complete-profile#token=…&next=/profile

   Хвост после # не уходит на сервер и не виден чужим сайтам,
   а страница сразу стирает его из адресной строки. Новый аккаунт
   там же получает ник и пароль, старый — просто едет дальше.
   ============================================================ */

'use strict';

const express = require('express');

const google = require('../google');
const { signToken } = require('../auth');

const router = express.Router();

/**
 * Отправляет на страницу регистрации с понятной причиной отказа.
 * Текст показывает js/auth.js — там же, где остальные уведомления.
 */
function redirectError(req, res, reason) {
  const target = google.siteUrl(req) + '/register#google_error=' + encodeURIComponent(reason);
  return res.redirect(target);
}

/** Отправляет на сайт с токеном в адресе после #. */
function redirectWithToken(res, url, token, extra) {
  const parts = ['token=' + encodeURIComponent(token)];

  Object.keys(extra || {}).forEach(key => {
    parts.push(key + '=' + encodeURIComponent(extra[key]));
  });

  return res.redirect(url + '#' + parts.join('&'));
}

/**
 * GET /auth/google
 *
 * ?next=/lesson?id=2 — куда вернуть после входа (только свой путь).
 * ?select=1         — всегда показывать выбор аккаунта Google.
 */
router.get('/google', (req, res, next) => {
  if (!google.isConfigured()) {
    return redirectError(req, res, 'not-configured');
  }

  const nextPath = google.safeNext(req.query.next);

  return google.passport.authenticate('google', {
    session: false,
    scope: google.scopes,
    callbackURL: google.callbackUrl(req),
    // Свой подписанный state: чужой ответ Google не примут
    state: google.signState(nextPath),
    prompt: String(req.query.select) === '1' ? 'select_account' : undefined
  })(req, res, next);
});

/**
 * GET /auth/google/callback
 *
 * Google присылает ?code=…&state=…
 *   state битый или просрочен — на регистрацию с ошибкой;
 *   человек нажал «Отмена»   — тоже ошибка, но своя;
 *   успех                    — JWT и редирект на сайт.
 */
router.get('/google/callback', (req, res, next) => {
  if (!google.isConfigured()) {
    return redirectError(req, res, 'not-configured');
  }

  const state = google.verifyState(req.query.state);

  if (!state) {
    return redirectError(req, res, 'state');
  }

  const authenticate = google.passport.authenticate(
    'google',
    { session: false, callbackURL: google.callbackUrl(req) },
    (error, user, info) => {
      if (error) {
        console.error('[google] Ошибка входа:', error.message || error);
        return redirectError(req, res, 'server');
      }

      // Человек отказался или Google не отдал почту
      if (!user) {
        const reason = info && info.message === 'no-email' ? 'no-email' : 'denied';
        return redirectError(req, res, reason);
      }

      // Дальше всё как при обычном входе: обычный JWT на 30 дней
      const token = signToken(user);
      const site = google.siteUrl(req);

      // Одна страница на два случая: новый аккаунт придумывает ник
      // и пароль, старый — сразу едет по адресу next и оказывается внутри
      return redirectWithToken(res, site + '/complete-profile', token, { next: state.next });
    }
  );

  return authenticate(req, res, next);
});

module.exports = router;
